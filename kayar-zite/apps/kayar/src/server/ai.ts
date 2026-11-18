import { ZiteError } from 'zitejs/backend';

/**
 * AI router over OpenAI-compatible providers. Groq is primary (fast, ~1000 req/day per model on the
 * free tier), OpenRouter free models are the fallback (50 req/day free). Keys are server-only.
 *  - Groq:       https://api.groq.com/openai/v1   env ZITE_GROQ_API_KEY
 *  - OpenRouter: https://openrouter.ai/api/v1     env ZITE_OPENROUTER_API_KEY
 * Every provider/model pair is tried in order. A pair that fails is "parked" (skipped by following
 * requests) for a time that depends on the failure, so users never wait on a pair known to be down.
 * Reasoning models never leak their hidden thinking into answers. Verified 2026-11-18.
 */
export type AiMessage = { role: 'system' | 'user' | 'assistant'; content: string };
export type AiOptions = { maxTokens?: number; temperature?: number };

type Provider = 'liara' | 'groq' | 'openrouter';
type Target = { provider: Provider; base: string; key: string; model: string; json: boolean };

const csv = (v: string | undefined, d: string[]) => (v ? v.split(',').map((x) => x.trim()).filter(Boolean) : d);

/** Groq and OpenRouter refuse requests from Iranian servers (HTTP 403), so on a host inside Iran
 * (e.g. Liara) the Liara AI gateway goes first. Base URL from the Liara console, e.g.
 * https://ai.liara.ir/api/<workspace-id>/v1 */
/** Free relay outside Iran (see standalone/ai-proxy-worker.js). When set, Groq/OpenRouter go through it. */
const PROXY = (process.env.ZITE_AI_PROXY_URL || '').trim().replace(/\/+$/, '');

const PROVIDERS = [
  {
    provider: 'liara' as const,
    base: (process.env.ZITE_LIARA_AI_BASE_URL || '').trim().replace(/\/+$/, '').replace(/\/chat\/completions$/, ''),
    env: 'ZITE_LIARA_AI_API_KEY',
    json: false,
    models: csv(process.env.ZITE_LIARA_AI_MODELS, ['openai/gpt-4o-mini', 'google/gemini-2.5-flash']),
  },
  {
    provider: 'groq' as const,
    base: PROXY ? `${PROXY}/groq/openai/v1` : 'https://api.groq.com/openai/v1',
    env: 'ZITE_GROQ_API_KEY',
    json: false, // strict JSON mode rejects long Persian outputs (json_validate_failed); prompt + extractJson is more reliable
    models: ['openai/gpt-oss-120b', 'qwen/qwen3.8-27b', 'openai/gpt-oss-20b'],
  },
  {
    provider: 'openrouter' as const,
    base: PROXY ? `${PROXY}/openrouter/api/v1` : 'https://openrouter.ai/api/v1',
    env: 'ZITE_OPENROUTER_API_KEY',
    json: false,
    models: ['nvidia/nemotron-3-ultra-550b-a55b:free', 'nvidia/nemotron-3.5-super-vl:free', 'google/gemma-4-31b-it:free'],
  },
];

const FRIENDLY = 'دستیار هوشمند الان در دسترس نیست؛ کمی بعد دوباره امتحان کن.';
const NOT_CONFIGURED = 'دستیار هوشمند هنوز پیکربندی نشده است.';
const skipUntil = new Map<string, number>();
const id = (t: Target) => `${t.provider}:${t.model}`;
const timeoutMs = () => Number(process.env.AI_TIMEOUT_MS || 120_000);

function targets(): Target[] {
  const all: Target[] = [];
  for (const p of PROVIDERS) {
    const key = (process.env as Record<string, string | undefined>)[p.env]?.trim();
    if (!key || !p.base) continue;
    for (const model of p.models) all.push({ provider: p.provider, base: p.base, key, model, json: p.json });
  }
  if (!all.length) throw new ZiteError({ code: 'INTERNAL_ERROR', message: 'No AI provider key configured', userFacingMessage: NOT_CONFIGURED });
  const live = all.filter((t) => (skipUntil.get(id(t)) ?? 0) < Date.now());
  return live.length ? live : all; // everything parked: try again rather than fail without asking
}

/** Skip a target for a while, depending on why it failed. */
function park(t: Target, status: number, retryAfter?: string | null) {
  let ms = 30_000;
  if (status === 429) ms = Math.min(Math.max(Number(retryAfter) * 1000 || 60_000, 10_000), 15 * 60_000);
  else if (status === 401 || status === 402 || status === 403) ms = 15 * 60_000; // bad key / no credit
  else if (status === 404) ms = 60 * 60_000; // model retired
  else if (status === 400 || status === 413) return; // this request's fault, not the model's
  skipUntil.set(id(t), Date.now() + ms);
}

/** Keeps the system prompt, drops the oldest turns past a character budget, and makes sure the last turn is the user's. */
function fit(messages: AiMessage[], budget = 24_000): AiMessage[] {
  const system = messages.filter((m) => m.role === 'system');
  const rest = messages.filter((m) => m.role !== 'system');
  let used = system.reduce((n, m) => n + m.content.length, 0);
  const kept: AiMessage[] = [];
  for (let i = rest.length - 1; i >= 0; i--) {
    used += rest[i].content.length;
    if (used > budget && kept.length) break;
    kept.unshift(rest[i]);
  }
  while (kept.length > 1 && kept[0].role === 'assistant') kept.shift();
  return [...system, ...kept];
}

function request(t: Target, messages: AiMessage[], o: { json?: boolean; stream?: boolean; maxTokens: number; temperature: number; signal: AbortSignal }) {
  const body: Record<string, unknown> = { model: t.model, messages, temperature: o.temperature, max_tokens: o.maxTokens };
  if (o.stream) body.stream = true;
  if (o.json && t.json) body.response_format = { type: 'json_object' };
  if (t.provider === 'groq') {
    // Groq free tier counts max_tokens against 8k tokens/min, and qwen allows ~1k output tokens/min.
    body.max_tokens = Math.min(o.maxTokens, t.model.startsWith('qwen/') ? 900 : 4500);
    if (t.model.startsWith('openai/gpt-oss')) { body.reasoning_effort = 'low'; body.include_reasoning = false; }
    else if (t.model.startsWith('qwen/')) body.reasoning_format = 'hidden';
  } else if (t.provider === 'openrouter') {
    // Keep thinking short and out of the answer so the token budget goes to the reply.
    body.reasoning = { effort: 'low', exclude: true };
    body.max_tokens = Math.max(o.maxTokens, 3000);
  }
  const headers: Record<string, string> = { 'content-type': 'application/json', authorization: `Bearer ${t.key}` };
  if (t.provider === 'openrouter') {
    headers['HTTP-Referer'] = process.env.ZITE_APP_URL || 'https://kayar.kapoosh.ir';
    headers['X-Title'] = 'KAYAR';
  }
  return fetch(`${t.base}/chat/completions`, { method: 'POST', headers, body: JSON.stringify(body), signal: o.signal });
}

/** Removes <think>…</think> blocks some reasoning models put in their visible answer. */
export function stripThinking(text: string): string {
  return text.replace(/<think>[\s\S]*?<\/think>/gi, '').replace(/^[\s\S]*?<\/think>/i, '').trim();
}

/** Streaming version of stripThinking: holds back text while inside a <think> block. */
function thinkFilter() {
  let buf = '';
  let inside = false;
  let started = false;
  return (chunk: string, flush = false): string => {
    buf += chunk;
    let out = '';
    for (;;) {
      if (inside) {
        const end = buf.indexOf('</think>');
        if (end < 0) { buf = buf.slice(-8); return out; }
        buf = buf.slice(end + 8); inside = false; continue;
      }
      const start = buf.indexOf('<think>');
      if (start >= 0) { out += buf.slice(0, start); buf = buf.slice(start + 7); inside = true; continue; }
      // Hold back a trailing partial "<think>" tag until the next chunk decides.
      let hold = 0;
      if (!flush) for (let k = Math.min(6, buf.length); k > 0; k--) if ('<think>'.startsWith(buf.slice(-k))) { hold = k; break; }
      out += buf.slice(0, buf.length - hold); buf = buf.slice(buf.length - hold);
      if (!started) { out = out.replace(/^\s+/, ''); if (out) started = true; }
      return out;
    }
  };
}

/** Tries each provider/model; with `validate`, its result must be non-null or the next one is tried. Never fabricates output. */
export async function aiChat<T = string>(messages: AiMessage[], validate?: (text: string) => T | null, opts: AiOptions = {}): Promise<T> {
  const msgs = fit(messages);
  let lastErr = '';
  const retried = new Set<string>();
  const queue = targets();
  for (let t = queue.shift(); t; t = queue.shift()) {
    const t0 = Date.now();
    try {
      const res = await request(t, msgs, {
        json: Boolean(validate), maxTokens: opts.maxTokens ?? (validate ? 6000 : 1500), temperature: opts.temperature ?? (validate ? 0.3 : 0.5),
        signal: AbortSignal.timeout(Math.min(timeoutMs(), 90_000)),
      });
      if (!res.ok) {
        const wait = Number(res.headers.get('retry-after'));
        if (res.status === 429 && wait > 0 && wait <= 8 && !retried.has(id(t))) {
          // A few seconds of waiting on the best model beats falling to a weaker one.
          retried.add(id(t)); await res.body?.cancel(); await new Promise((r) => setTimeout(r, wait * 1000 + 250));
          queue.unshift(t); continue;
        }
        park(t, res.status, res.headers.get('retry-after'));
        lastErr = `HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`;
        console.error(JSON.stringify({ msg: 'ai call failed', target: id(t), error: lastErr }));
        continue;
      }
      const data = (await res.json()) as { choices?: { message?: { content?: string }; finish_reason?: string }[] };
      const text = stripThinking(data.choices?.[0]?.message?.content ?? '');
      if (!text) { lastErr = `empty output from ${id(t)} (finish: ${data.choices?.[0]?.finish_reason ?? '?'})`; console.error(JSON.stringify({ msg: 'ai empty', target: id(t) })); continue; }
      const parsed = validate ? validate(text) : (text as T);
      if (parsed) { console.log(JSON.stringify({ msg: 'ai ok', target: id(t), ms: Date.now() - t0 })); return parsed; }
      lastErr = `invalid output from ${id(t)} (finish: ${data.choices?.[0]?.finish_reason ?? '?'})`;
      console.error(JSON.stringify({ msg: 'ai invalid output', target: id(t), sample: text.slice(0, 160) }));
    } catch (e) {
      if (e instanceof ZiteError) throw e;
      park(t, 503);
      lastErr = (e as Error).message;
      console.error(JSON.stringify({ msg: 'ai call error', target: id(t), error: lastErr }));
    }
  }
  console.error(JSON.stringify({ msg: 'all AI providers failed', error: lastErr }));
  throw new ZiteError({ code: 'INTERNAL_ERROR', message: `AI unavailable: ${lastErr}`, userFacingMessage: FRIENDLY });
}

/** Pulls the JSON object out of a model reply (tolerates code fences and leading prose). */
export function extractJson(text: string): unknown {
  const clean = stripThinking(text).replace(/```(?:json)?/gi, '');
  const start = clean.indexOf('{');
  const end = clean.lastIndexOf('}');
  if (start < 0 || end <= start) return null;
  try { return JSON.parse(clean.slice(start, end + 1)); } catch { return null; }
}

/** Streams a chat reply token-by-token; falls through targets until one produces text. */
export async function* aiStream(messages: AiMessage[], opts: AiOptions = {}): AsyncGenerator<string> {
  const msgs = fit(messages);
  for (const t of targets()) {
    let res: Response;
    try {
      res = await request(t, msgs, { stream: true, maxTokens: opts.maxTokens ?? 1500, temperature: opts.temperature ?? 0.5, signal: AbortSignal.timeout(timeoutMs()) });
    } catch (e) { park(t, 503); console.error(JSON.stringify({ msg: 'ai stream error', target: id(t), error: (e as Error).message })); continue; }
    if (!res.ok || !res.body) {
      park(t, res.status, res.headers.get('retry-after'));
      console.error(JSON.stringify({ msg: 'ai stream failed', target: id(t), status: res.status, body: (await res.text().catch(() => '')).slice(0, 200) }));
      continue;
    }
    const filter = thinkFilter();
    let produced = false;
    const reader = res.body.getReader();
    const dec = new TextDecoder();
    let buf = '';
    let done = false;
    try {
      while (!done) {
        const r = await reader.read();
        if (r.done) break;
        buf += dec.decode(r.value, { stream: true });
        const lines = buf.split('\n');
        buf = lines.pop() ?? '';
        for (const line of lines) {
          const l = line.trim();
          if (!l.startsWith('data:')) continue;
          const d = l.slice(5).trim();
          if (d === '[DONE]') { done = true; break; }
          let j: { choices?: { delta?: { content?: string } }[]; error?: { message?: string } };
          try { j = JSON.parse(d); } catch { continue; }
          if (j.error) throw new Error(j.error.message || 'stream error');
          const c = filter(j.choices?.[0]?.delta?.content ?? '');
          if (c) { produced = true; yield c; }
        }
      }
      const rest = filter('', true);
      if (rest) { produced = true; yield rest; }
    } catch (e) {
      console.error(JSON.stringify({ msg: 'ai stream broke', target: id(t), error: (e as Error).message }));
      if (produced) return; // part of the answer is already on screen; don't splice in another model
      park(t, 503);
      continue;
    } finally { reader.releaseLock?.(); }
    if (produced) return;
    console.error(JSON.stringify({ msg: 'ai stream empty', target: id(t) }));
  }
  throw new ZiteError({ code: 'INTERNAL_ERROR', message: 'AI unavailable', userFacingMessage: FRIENDLY });
}
