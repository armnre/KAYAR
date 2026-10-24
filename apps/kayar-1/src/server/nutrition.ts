import { aiChat, extractJson } from './nara';
import { computeTargets } from './macros';
import { nutritionSchema, type Nutrition, type Plan, type Profile } from './schemas';

const n = (v: unknown) => Math.max(0, Math.round(Number(v) || 0));

/** AI meal plan bound to the workout plan: fixed macro targets, training vs rest day, pre/post workout timing. */
export async function generateNutrition(profile: Profile, plan: Plan): Promise<Nutrition> {
  const t = computeTargets(profile);
  const system = `تو متخصص تغذیه ورزشی دقیق و محتاط هستی (نه پزشک). فقط JSON معتبر برگردان.
ساختار: {"trainingDay": Meal[], "restDay": Meal[], "preWorkout": string, "postWorkout": string, "tips": string[]}
Meal = {"name": string, "time": string, "items": string[], "calories": number, "protein": number, "carbs": number, "fat": number}
قوانین: غذاهای رایج و در دسترس ایرانی با مقدار دقیق (گرم/عدد/قاشق) در items. ۴ تا ۵ وعده در روز.
مجموع وعده‌های روز تمرین باید با هدف روز تمرین و روز استراحت با هدف استراحت حداکثر ۵٪ اختلاف داشته باشد.
روز تمرین شامل وعده قبل و بعد از تمرین باشد. رژیم/محدودیت‌های کاربر را رعایت کن. متن‌ها فارسی و کوتاه.`;
  const user = `هدف: ${profile.goal}\nرژیم غذایی: ${profile.diet || 'معمولی'}\nمحدودیت‌ها: ${profile.limitations || 'ندارد'}\nوزن: ${profile.weightKg ?? '-'}kg\n` +
    `هدف روز تمرین: ${JSON.stringify(t.training)}\nهدف روز استراحت: ${JSON.stringify(t.rest)}\n` +
    `برنامه تمرینی (${plan.days.length} روز در هفته): ${plan.days.map((d) => `${d.name} (${d.focus})`).join('، ')}\nمدت جلسه: ${profile.sessionMinutes} دقیقه`;
  return aiChat<Nutrition>([{ role: 'system', content: system }, { role: 'user', content: user }], (text) => {
    const raw = extractJson(text) as Record<string, unknown> | null;
    if (!raw) return null;
    const meals = (v: unknown) => (Array.isArray(v) ? v : []).slice(0, 6).map((m: Record<string, unknown>) => ({
      name: String(m.name ?? 'وعده').slice(0, 40), time: String(m.time ?? '').slice(0, 40),
      items: (Array.isArray(m.items) ? m.items : []).map((x) => String(x).slice(0, 120)).slice(0, 8),
      calories: n(m.calories), protein: n(m.protein), carbs: n(m.carbs), fat: n(m.fat),
    })).filter((m) => m.items.length);
    const c = nutritionSchema.safeParse({
      targets: { training: t.training, rest: t.rest }, trainingDay: meals(raw.trainingDay), restDay: meals(raw.restDay),
      preWorkout: String(raw.preWorkout ?? '').slice(0, 240), postWorkout: String(raw.postWorkout ?? '').slice(0, 240), waterL: t.waterL,
      tips: (Array.isArray(raw.tips) ? raw.tips : []).map((x) => String(x).slice(0, 240)).slice(0, 6),
    });
    return c.success ? c.data : null;
  });
}
