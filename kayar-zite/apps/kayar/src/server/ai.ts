import { ZiteError } from 'zitejs/backend';

/**
 * AI router over OpenAI-compatible providers. Groq is primary (fast, ~1000 req/day per model free),
 * OpenRouter free models are the fallback (50 req/day on free tier). Keys are server-only.
 *  - Groq:       https://api.groq.com/openai/v1   env ZITE_GROQ_API_KEY
 *  - OpenRouter: https://openrouter.ai/api/v1     env ZITE_OPENROUTER_API_KEY
 * Each provider/model pair is tried in order; failing pairs are parked for a while so later
 * requests skip them. Verified 2026-11-18.
 */
export type AiMessage = { role: 'system' | 'user' | 'assistant'; content: string };

type Target = { provider: 'groq' | 'openrouter'; base: string; key: string; model: string; json: boolean };

const PROVIDERS = [
  {
    provider: 'groq' as const,
    base: 'https://api.groq.com/openai/v1',
    env: 'ZITE_GROQ_API_KEY',
    json: true,
    models: ['openai/gpt-oss-120b', 'qwen/qwen3.8-27b', 'openai/gpt-oss-20b'],
  },
  {
    provider: 'openrouter' as const,
    base: 'https://openrouter.ai/api/v1',
    env: 'ZITE_OPENROUTER_API_KEY',
    json: false,
    models: ['nvidia/nemotron-3-ultra-550b-a55b:free', 'nvidia/nemotron-3.5-super-vl:free', 'google/gemma-4-31b-it:free'],
  },
];

const FRIENDLY = 'دستیار هوشمند الان در دسترس نیست؛ کمی بعد دوباره امتحان کن.';
const NOT_CONFIGURED = 'دستیار هوشمند هنوز پیکربندی نشده است.';
const skipUntil = new Map<string, number>();
const id = (t: Target) => `${t.provider}:${t.model}`;

function targets(): Target[] {
  const all: Target[] = [];
  for (const p of PROVIDERS) {
    const key = (process.env as Record<string, string | undefined>)[p.env];
    if (!key) continue;
    for (const model of p.models) all.push({ provider: p.provider, base: p.base, key, model, json: p.json });
  }
  if (!all.length) throw new ZiteError({ code: 'INTERNAL_ERROR', message: 'No AI provider key configured', userFacingMessage: NOT_CONFIGURED });
  const live = all.filter((t) => (skipUntil.get(id(t)) ?? 0) < Date.now());
  return live.length ? live : all;
}

/** Park a target based on the HTTP status so following requests skip it. */
function park(t: Target, status: number, retryAfter?: string | null) {
  let ms = 60_000;
  if (status === 429) ms = Math.min(Math.max(Number(retryAfter) * 1000 || 60_000, 10_000), 15 * 60_000);
  else if (status === 401 || status === 402 || status === 403) ms = 15 * 60_000;
  else if (status === 400 || status === 404) ms = 60 * 60_000;
  skipUntil.set(id(t), Date.now() + ms);
}

function request(t: Target, messages: AiMessage[], opts: { json?: boolean; stream?: boolean; signal: AbortSignal }) {
  const body: Record<string, unknown> = { model: t.model, messages, temperature: opts.stream ? 0.5 : 0.4 };
  if (opts.stream) body.stream = true;
  if (opts.json && t.json) body.response_format = { type: 'json_object' };
  if (t.provider === 'groq' && t.model.startsWith('openai/gpt-oss')) body.reasoning_effort = 'low';
  const headers: Record<string, string> = { 'content-type': 'application/json', authorization: `Bearer ${t.key}` };
  if (t.provider === 'openrouter') {
    headers['HTTP-Referer'] = process.env.ZITE_APP_URL || 'https://kayar.kapoosh.ir';
    headers['X-Title'] = 'KAYAR';
  }
  return fetch(`${t.base}/chat/completions`, { method: 'POST', headers, body: JSON.stringify(body), signal: opts.signal });
}

const timeoutMs = () => Number(process.env.AI_TIMEOUT_MS || 120_000);

/** Tries each provider/model; for JSON, `validate` must pass or the next one is tried. Never fabricates output. */
export async function aiChat<T = string>(messages: AiMessage[], validate?: (text: string) => T | null): Promise<T> {
  let lastErr = '';
  for (const t of targets()) {
    try {
      const res = await request(t, messages, { json: Boolean(validate), signal: AbortSignal.timeout(Math.min(timeoutMs(), 90_000)) });
      if (!res.ok) {
        park(t, res.status, res.headers.get('retry-after'));
        lastErr = `HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`;
        console.error(JSON.stringify({ msg: 'ai call failed', target: id(t), error: lastErr }));
        continue;
      }
      const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
      const text = (data.choices?.[0]?.message?.content ?? '').trim();
      if (!text) { lastErr = `empty output from ${id(t)}`; continue; }
      if (!validate) return text as T;
      const parsed = validate(text);
      if (parsed) return parsed;
      lastErr = `invalid output from ${id(t)}`;
    } catch (e) {
      lastErr = (e as Error).message;
      console.error(JSON.stringify({ msg: 'ai call error', target: id(t), error: lastErr }));
    }
  }
  console.error('all AI providers failed', lastErr);
  throw new ZiteError({ code: 'INTERNAL_ERROR', message: `AI unavailable: ${lastErr}`, userFacingMessage: FRIENDLY });
}

export function extractJson(text: string): unknown {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start < 0 || end <= start) return null;
  try { return JSON.parse(text.slice(start, end + 1)); } catch { return null; }
}

/** Streams a chat reply token-by-token; falls through targets until one produces text. */
export async function* aiStream(messages: AiMessage[]): AsyncGenerator<string> {
  for (const t of targets()) {
    let res: Response;
    try {
      res = await request(t, messages, { stream: true, signal: AbortSignal.timeout(timeoutMs()) });
    } catch (e) { console.error(JSON.stringify({ msg: 'ai stream error', target: id(t), error: (e as Error).message })); continue; }
    if (!res.ok || !res.body) {
      park(t, res.status, res.headers.get('retry-after'));
      console.error(JSON.stringify({ msg: 'ai stream failed', target: id(t), status: res.status, body: (await res.text().catch(() => '')).slice(0, 200) }));
      continue;
    }
    let produced = false;
    const reader = res.body.getReader();
    const dec = new TextDecoder();
    let buf = '';
    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const lines = buf.split('\n');
        buf = lines.pop() ?? '';
        for (const line of lines) {
          const l = line.trim();
          if (!l.startsWith('data:')) continue;
          const d = l.slice(5).trim();
          if (d === '[DONE]') return;
          try {
            const j = JSON.parse(d) as { choices?: { delta?: { content?: string } }[]; error?: { message?: string } };
            if (j.error) throw new Error(j.error.message || 'stream error');
            const c = j.choices?.[0]?.delta?.content;
            if (c) { produced = true; yield c; }
          } catch (e) { if ((e as Error).message && !(e instanceof SyntaxError)) throw e; }
        }
      }
    } catch (e) {
      console.error(JSON.stringify({ msg: 'ai stream broke', target: id(t), error: (e as Error).message }));
      if (produced) return; // partial answer already shown; don't mix in another model's reply
      park(t, 429);
      continue;
    }
    if (produced) return;
    console.error(JSON.stringify({ msg: 'ai stream empty', target: id(t) }));
  }
  throw new ZiteError({ code: 'INTERNAL_ERROR', message: 'AI unavailable', userFacingMessage: FRIENDLY });
}
