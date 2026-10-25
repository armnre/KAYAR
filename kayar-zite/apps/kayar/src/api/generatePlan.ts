import { z } from 'zod';
import { memberId } from '../server/rbac';
import { tokenField } from '../server/util';
import { createEndpoint, ZiteError } from 'zitejs/backend';
import { zite } from 'zitejs/db';
import { aiChat, extractJson } from '../server/nara';
import { planSchema, nutritionSchema, type Plan, type Nutrition } from '../server/schemas';
import { generateNutrition } from '../server/nutrition';

export default createEndpoint({
  description: 'Generates a validated AI workout plan from the user\'s profile and the trusted exercise catalog',
  inputSchema: z.object({ token: tokenField }),
  outputSchema: z.object({ id: z.string(), plan: planSchema, nutrition: nutritionSchema.nullable() }),
  execute: async ({ input }) => {
    const uid = await memberId(input.token);
    const profile = await zite.bodyProfiles.findOne({ filters: { memberId: uid } });
    if (!profile?.goal) throw new ZiteError({ code: 'BAD_REQUEST', message: 'no profile', userFacingMessage: 'اول پروفایل بدن‌یار را کامل کن.' });

    // Daily quota: max 5 generated plans per day
    const { rows } = await zite.sql({ query: 'SELECT COUNT(*)::int AS n FROM "WorkoutPlans" WHERE "memberId" = $1 AND "created" > now() - interval \'1 day\'', params: [uid] });
    if (Number(rows[0]?.n ?? 0) >= 5) throw new ZiteError({ code: 'RATE_LIMITED', message: 'plan quota', userFacingMessage: 'امروز به سقف ساخت برنامه رسیدی؛ فردا دوباره امتحان کن.' });

    const { records: catalog } = await zite.exercises.findAll({ limit: 500 });
    if (catalog.length < 10) throw new ZiteError({ code: 'INTERNAL_ERROR', message: 'exercise catalog empty', userFacingMessage: 'کتابخانه حرکات هنوز آماده نیست؛ با پشتیبانی تماس بگیر.' });
    const bySlug = new Map(catalog.map((e) => [e.slug ?? '', e]));
    const catalogText = catalog.map((e) => `${e.slug} | ${e.name} | ${e.category} | ${e.difficulty} | ${e.location} | ${e.equipment}`).join('\n');

    const system = `تو مربی بدنسازی محتاط و حرفه‌ای هستی (نه پزشک). فقط JSON معتبر برگردان، بدون متن اضافه.
ساختار: {"title": string, "notes": string[], "days": [{"name": string, "focus": string, "exercises": [{"slug": string, "sets": number, "reps": string, "restSec": number, "note": string}]}]}
قوانین: فقط از slug های فهرست زیر استفاده کن.
تقسیم‌بندی علمی بر اساس روزهای هفته: ۱-۲ روز = تمام‌بدن، ۳ روز = تمام‌بدن یا پوش/پول/پا، ۴ روز = بالاتنه/پایین‌تنه، ۵-۶ روز = پوش/پول/پا. بین دو جلسه یک گروه عضلانی حداقل ۴۸ ساعت فاصله باشد.
ترتیب: گرم‌کردن، حرکات چندمفصلی سنگین، تک‌مفصلی، شکم/کور، کشش. ست×تکرار×استراحت را با هدف تطبیق بده (قدرت ۴-۶ تکرار/۱۲۰-۱۸۰ثانیه، عضله ۸-۱۲/۶۰-۹۰، چربی‌سوزی/استقامت ۱۲-۲۰/۳۰-۴۵). مجموع زمان با مدت جلسه بخواند.
در note هر حرکت یک نکته تکنیکی کوتاه و دقیق و نشانه پیشرفت (اضافه بار) بنویس. name و focus هر روز گویا باشد (مثلاً «پوش — سینه، سرشانه، پشت‌بازو»). تعداد روزها = روزهای تمرین در هفته. هر روز ۴ تا ۷ حرکت شامل گرم کردن در ابتدا و کشش در انتها. ست ۱ تا ۵. متن‌ها فارسی.
با توجه به محدودیت‌ها حرکات پرخطر را حذف کن و در notes توصیه ایمنی بنویس (در صورت درد یا بیماری با پزشک مشورت شود).
فهرست حرکات (slug | نام | دسته | سطح | مکان | وسیله):
${catalogText}`;
    const user = `هدف: ${profile.goal}\nسطح: ${profile.level}\nروز در هفته: ${profile.daysPerWeek}\nمکان: ${profile.place}\nتجهیزات: ${profile.equipment}\nمدت هر جلسه: ${profile.sessionMinutes} دقیقه\nمحدودیت‌ها: ${profile.limitations || 'ندارد'}\nسن: ${profile.age ?? '-'}\nجنسیت: ${profile.sex ?? '-'}\nقد/وزن: ${profile.heightCm ?? '-'}cm / ${profile.weightKg ?? '-'}kg (هدف ${profile.targetWeightKg ?? '-'}kg)\nسطح فعالیت روزانه: ${profile.activityLevel || '-'}\nخواب: ${profile.sleepHours ?? '-'} ساعت (اگر کمتر از ۶ بود حجم تمرین را کمی کمتر کن)`;

    const nutritionP: Promise<Nutrition | null> = generateNutrition({
      goal: profile.goal, level: profile.level ?? '', daysPerWeek: profile.daysPerWeek ?? 3, place: profile.place ?? '', equipment: profile.equipment ?? '',
      sessionMinutes: profile.sessionMinutes ?? 45, diet: profile.diet ?? '', limitations: profile.limitations ?? '', age: profile.age ?? null,
      heightCm: profile.heightCm ?? null, weightKg: profile.weightKg ?? null, sex: (profile.sex as 'male' | 'female' | undefined) ?? null,
      activityLevel: profile.activityLevel ?? null, targetWeightKg: profile.targetWeightKg ?? null, sleepHours: profile.sleepHours ?? null, allergies: profile.allergies ?? null, waistCm: profile.waistCm ?? null,
    }).catch((e) => { console.error('nutrition generation failed', (e as Error).message); return null; });
    const plan = await aiChat<Plan>([{ role: 'system', content: system }, { role: 'user', content: user }], (text) => {
      const raw = extractJson(text) as { title?: string; notes?: string[]; days?: { name?: string; focus?: string; exercises?: { slug?: string; sets?: number; reps?: unknown; restSec?: number; note?: string }[] }[] } | null;
      if (!raw?.days) return null;
      const candidate = {
        title: String(raw.title ?? 'برنامه تمرینی').slice(0, 140),
        notes: (raw.notes ?? []).map((n) => String(n).slice(0, 240)).slice(0, 8),
        days: raw.days.slice(0, 7).map((d, i) => ({
          name: String(d.name ?? `روز ${i + 1}`).slice(0, 60),
          focus: String(d.focus ?? '').slice(0, 80),
          // Drop any exercise the model invented — only catalog entries survive
          exercises: (d.exercises ?? []).filter((x) => x.slug && bySlug.has(x.slug)).slice(0, 10).map((x) => ({
            slug: x.slug!, name: bySlug.get(x.slug!)!.name ?? x.slug!,
            sets: Math.min(5, Math.max(1, Math.round(Number(x.sets) || 3))),
            reps: String(x.reps ?? '10').slice(0, 30),
            restSec: Math.min(300, Math.max(15, Math.round(Number(x.restSec) || 60))),
            note: x.note ? String(x.note).slice(0, 200) : undefined,
          })),
        })).filter((d) => d.exercises.length > 0),
      };
      const parsed = planSchema.safeParse(candidate);
      return parsed.success ? parsed.data : null;
    });

    const { records: old } = await zite.workoutPlans.findAll({ filters: { memberId: uid, active: true }, limit: 50 });
    await Promise.all(old.map((p) => zite.workoutPlans.update({ id: p.id, record: { active: false } })));
    const created = await zite.workoutPlans.create({ record: { memberId: uid, title: plan.title, planJson: JSON.stringify(plan), active: true } });
    const nutrition = await nutritionP;
    if (nutrition) await zite.workoutPlans.update({ id: created.id, record: { nutritionJson: JSON.stringify(nutrition) } });
    return { id: created.id, plan, nutrition };
  },
});
