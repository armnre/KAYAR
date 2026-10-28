import { ZiteError } from 'zitejs/backend';

/**
 * Nara Router (OpenAI-compatible). Verified 2026-10-24: base https://router.bynara.id/v1,
 * Bearer auth, POST /chat/completions, GET /models. Key is server-only.
 */
export type AiMessage = { role: 'system' | 'user' | 'assistant'; content: string };

const BASE = 'https://router.bynara.id/v1';
// Strongest first; credit/availability errors fall through to the next one.
const MODELS = ['claude-sonnet-5.5', 'gpt-6.1-sol', 'deepseek-v4-pro', 'qwen3.8-max', 'agnes-2.5-flash', 'laguna-s-2.1'];
const skipUntil = new Map<string, number>();
const live = () => { const l = MODELS.filter((m) => (skipUntil.get(m) ?? 0) < Date.now()); return l.length ? l : MODELS; };
const park = (m: string) => skipUntil.set(m, Date.now() + 10 * 60_000);
const FRIENDLY = 'دستیار هوشمند الان در دسترس نیست؛ کمی بعد دوباره امتحان کن.';

async function callModel(model: string, messages: AiMessage[], json: boolean): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 75_000);
  try {
    const res = await fetch(`${BASE}/chat/completions`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${process.env.ZITE_NARAROUTER_API_KEY}` },
      body: JSON.stringify({ model, messages, temperature: 0.4, ...(json ? { response_format: { type: 'json_object' } } : {}) }),
      signal: controller.signal,
    });
    if (res.status === 402) throw new Error('AI_NO_CREDIT');
    if (res.status === 429) { const b = await res.text(); if (/credit/i.test(b)) throw new Error('AI_NO_CREDIT'); throw new ZiteError({ code: 'RATE_LIMITED', message: 'AI rate limited', userFacingMessage: 'تعداد درخواست‌ها زیاد است؛ یک دقیقه دیگر امتحان کن.' }); }
    if (!res.ok) throw new Error(`AI_HTTP_${res.status}: ${(await res.text()).slice(0, 200)}`);
    const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    return (data.choices?.[0]?.message?.content ?? '').trim();
  } finally {
    clearTimeout(timer);
  }
}

/** Tries each model once; for JSON, `validate` must pass or the next model is tried. Never fabricates output. */
export async function aiChat<T = string>(messages: AiMessage[], validate?: (text: string) => T | null): Promise<T> {
  if (!process.env.ZITE_NARAROUTER_API_KEY) {
    throw new ZiteError({ code: 'INTERNAL_ERROR', message: 'NARAROUTER key missing', userFacingMessage: 'دستیار هوشمند هنوز پیکربندی نشده است.' });
  }
  let lastErr: unknown;
  for (const model of live()) {
    try {
      const text = await callModel(model, messages, Boolean(validate));
      if (!validate) { if (text) return text as T; continue; }
      const parsed = validate(text);
      if (parsed) return parsed;
      lastErr = new Error(`invalid output from ${model}`);
    } catch (e) {
      if (e instanceof ZiteError && e.code === 'RATE_LIMITED') throw e;
      if ((e as Error).message === 'AI_NO_CREDIT') park(model);
      lastErr = e;
      console.error(JSON.stringify({ msg: 'ai call failed', model, error: (e as Error).message }));
    }
  }
  console.error('all AI models failed', (lastErr as Error)?.message);
  throw new ZiteError({ code: 'INTERNAL_ERROR', message: 'AI unavailable', userFacingMessage: FRIENDLY });
}

export function extractJson(text: string): unknown {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start < 0 || end <= start) return null;
  try { return JSON.parse(text.slice(start, end + 1)); } catch { return null; }
}

/** Streams a chat reply token-by-token; falls through models until one starts streaming. */
export async function* aiStream(messages: AiMessage[]): AsyncGenerator<string> {
  if (!process.env.ZITE_NARAROUTER_API_KEY) throw new ZiteError({ code: 'INTERNAL_ERROR', message: 'NARAROUTER key missing', userFacingMessage: 'دستیار هوشمند هنوز پیکربندی نشده است.' });
  let res: Response | null = null;
  for (const model of live()) {
    try {
      const r = await fetch(`${BASE}/chat/completions`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${process.env.ZITE_NARAROUTER_API_KEY}` },
        body: JSON.stringify({ model, messages, temperature: 0.5, stream: true }),
        signal: AbortSignal.timeout(Number(process.env.AI_TIMEOUT_MS || 120_000)),
      });
      if (r.ok && r.body) { res = r; break; }
      if (r.status === 402 || r.status === 429) park(model);
      console.error(JSON.stringify({ msg: 'ai stream failed', model, status: r.status }));
    } catch (e) { console.error('ai stream error', model, (e as Error).message); }
  }
  if (!res?.body) throw new ZiteError({ code: 'INTERNAL_ERROR', message: 'AI unavailable', userFacingMessage: FRIENDLY });
  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let buf = '';
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
      try { const j = JSON.parse(d) as { choices?: { delta?: { content?: string } }[] }; const c = j.choices?.[0]?.delta?.content; if (c) yield c; } catch { /* partial */ }
    }
  }
}
