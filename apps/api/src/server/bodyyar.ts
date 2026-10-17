import { bodyyarPlanSchema, type BodyyarProfile, type BodyyarPlan } from '@kayar/shared';
import { ApiError } from './backend.js';
import { zite } from './db.js';
import { aiChat, aiChatStream, aiConfigured, aiStatus, parseModelJson, BODYYAR_SYSTEM_PROMPT, type AiMessage } from './ai.js';

/* ---------------- quotas ---------------- */
export const planDailyLimit = () => Number(process.env.BODYYAR_PLAN_DAILY_LIMIT ?? 5);
export const chatDailyLimit = () => Number(process.env.BODYYAR_CHAT_DAILY_LIMIT ?? 40);

function startOfToday(): string {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d.toISOString();
}

export async function plansUsedToday(memberId: string) {
  const { records } = await zite.bodyyarPlans.findAll({ filters: { memberId }, limit: 500 });
  const from = startOfToday();
  return records.filter((r) => (r.createdAt ?? '') >= from).length;
}

export async function messagesUsedToday(memberId: string) {
  const { records } = await zite.bodyyarMessages.findAll({ filters: { memberId, role: 'user' }, limit: 1000 });
  const from = startOfToday();
  return records.filter((r) => (r.createdAt ?? '') >= from).length;
}

export function assertPlanQuota(used: number) {
  const limit = planDailyLimit();
  if (used >= limit) {
    throw new ApiError({ code: 'QUOTA_EXCEEDED', message: 'QUOTA_EXCEEDED', userFacingMessage: `سقف ساخت برنامه‌ی امروزت پر شده (${limit} برنامه). فردا دوباره سر بزن.`, status: 429 });
  }
}

export function assertChatQuota(used: number) {
  const limit = chatDailyLimit();
  if (used >= limit) {
    throw new ApiError({ code: 'QUOTA_EXCEEDED', message: 'QUOTA_EXCEEDED', userFacingMessage: `سقف پیام‌های امروزت پر شده (${limit} پیام). فردا دوباره سر بزن.`, status: 429 });
  }
}

/* ---------------- profile ---------------- */
/** Only these fields are ever sent to the AI — no username, phone or name. */
function aiProfile(p: BodyyarProfile) {
  return {
    goal: p.goal, gender: p.gender, level: p.level, daysPerWeek: p.daysPerWeek,
    place: p.place, diet: p.diet,
    age: p.age ?? undefined, heightCm: p.heightCm ?? undefined, weightKg: p.weightKg ?? undefined,
    limitations: p.limitations || undefined,
  };
}

const PLAN_FORMAT = `خروجی باید فقط و فقط یک JSON معتبر باشد (بدون توضیح اضافه، بدون markdown) با این ساختار:
{
  "title": "عنوان کوتاه برنامه",
  "days": [ { "name": "نام روز", "exercises": [ { "name": "نام تمرین", "sets": 3, "reps": "۱۰" } ] } ],
  "nutrition": { "calories": 2000, "proteinG": 120, "carbsG": 220, "fatG": 60, "tips": ["یک نکته‌ی کوتاه"] }
}
تعداد روزها برابر daysPerWeek کاربر باشد و هر روز حداقل یک تمرین داشته باشد.`;

const REPAIR = 'پاسخ قبلی JSON معتبر مطابق ساختار خواسته‌شده نبود. فقط و فقط JSON معتبر برگردان، بدون هیچ توضیحی. اگر عدد لازم داری عدد بنویس و اگر متن لازم داری رشته.';

export async function generatePlan(profile: BodyyarProfile): Promise<{ plan: BodyyarPlan; model: string }> {
  if (!aiConfigured()) {
    throw new ApiError({ code: 'AI_NOT_CONFIGURED', message: 'AI_NOT_CONFIGURED', userFacingMessage: 'دستیار هوشمند هنوز فعال نشده؛ به‌زودی در دسترسه.' });
  }
  const messages: AiMessage[] = [
    { role: 'system', content: `${BODYYAR_SYSTEM_PROMPT}\n${PLAN_FORMAT}` },
    { role: 'user', content: JSON.stringify(aiProfile(profile)) },
  ];
  const { text, model } = await aiChat(messages, {
    json: true,
    repair: REPAIR,
    validate: (t) => {
      try { bodyyarPlanSchema.parse(parseModelJson(t)); return true; } catch { return false; }
    },
  });
  const plan = bodyyarPlanSchema.parse(parseModelJson(text));
  return { plan, model };
}

export async function savePlan(memberId: string, profile: BodyyarProfile, plan: BodyyarPlan) {
  const { records } = await zite.bodyyarPlans.findAll({ filters: { memberId }, limit: 500 });
  const version = records.length + 1;
  const row = await zite.bodyyarPlans.create({
    record: { memberId, title: plan.title, version, plan, profileSnapshot: profile },
  });
  return row;
}

/* ---------------- chat ---------------- */
export async function chatHistory(memberId: string, limit = 12) {
  const { records } = await zite.bodyyarMessages.findAll({ filters: { memberId }, limit: 200 });
  return records
    .sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)))
    .slice(-limit)
    .map((r) => ({ role: (r.role === 'assistant' ? 'assistant' : 'user') as 'user' | 'assistant', content: r.content ?? '' }));
}

export async function chat(memberId: string, message: string): Promise<{ reply: string; model: string }> {
  if (!aiConfigured()) {
    throw new ApiError({ code: 'AI_NOT_CONFIGURED', message: 'AI_NOT_CONFIGURED', userFacingMessage: 'دستیار هوشمند هنوز فعال نشده؛ به‌زودی در دسترسه.' });
  }
  const history = await chatHistory(memberId, 12);
  const messages: AiMessage[] = [
    { role: 'system', content: BODYYAR_SYSTEM_PROMPT },
    ...history,
    { role: 'user', content: message },
  ];
  await zite.bodyyarMessages.create({ record: { memberId, role: 'user', content: message } });
  const { text, model } = await aiChat(messages, { temperature: 0.7 });
  await zite.bodyyarMessages.create({ record: { memberId, role: 'assistant', content: text } });
  return { reply: text, model };
}

export async function chatStream(memberId: string, message: string, onDelta: (c: string) => void): Promise<{ model: string; reply: string }> {
  if (!aiConfigured()) {
    throw new ApiError({ code: 'AI_NOT_CONFIGURED', message: 'AI_NOT_CONFIGURED', userFacingMessage: 'دستیار هوشمند هنوز فعال نشده؛ به‌زودی در دسترسه.' });
  }
  const history = await chatHistory(memberId, 12);
  const messages: AiMessage[] = [
    { role: 'system', content: BODYYAR_SYSTEM_PROMPT },
    ...history,
    { role: 'user', content: message },
  ];
  await zite.bodyyarMessages.create({ record: { memberId, role: 'user', content: message } });
  let reply = '';
  const { model } = await aiChatStream(messages, (c) => { reply += c; onDelta(c); });
  await zite.bodyyarMessages.create({ record: { memberId, role: 'assistant', content: reply } });
  return { model, reply };
}

export { aiStatus };
