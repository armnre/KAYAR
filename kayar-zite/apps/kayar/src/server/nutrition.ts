import { aiChat, extractJson } from './ai';
import { computeTargets } from './macros';
import { nutritionSchema, type Nutrition, type Plan, type Profile } from './schemas';

const n = (v: unknown) => Math.max(0, Math.round(Number(v) || 0));

/** AI meal plan bound to the workout plan: fixed macro targets, training vs rest day, pre/post workout timing. */
export async function generateNutrition(profile: Profile, plan?: Plan): Promise<Nutrition> {
  const t = computeTargets(profile);
  const system = `تو متخصص تغذیه ورزشی دقیق و محتاط هستی (نه پزشک). فقط JSON معتبر برگردان.
ساختار: {"trainingDay": Meal[], "restDay": Meal[], "preWorkout": string, "postWorkout": string, "tips": string[]}
Meal = {"name": string, "time": string, "items": string[], "calories": number, "protein": number, "carbs": number, "fat": number}
قوانین: غذاهای رایج و در دسترس ایرانی با مقدار دقیق (گرم/عدد/قاشق) در items. ۴ تا ۵ وعده در روز.
مجموع وعده‌های روز تمرین باید با هدف روز تمرین و روز استراحت با هدف استراحت حداکثر ۵٪ اختلاف داشته باشد.
روز تمرین شامل وعده قبل و بعد از تمرین باشد. قبل از نوشتن، کالری و پروتئین هر وعده را حساب کن و مطمئن شو مجموع روز با هدف می‌خواند. اعداد هر وعده عدد صحیح باشند. رژیم/محدودیت‌های کاربر را رعایت کن. متن‌ها فارسی و کوتاه.`;
  const user = `هدف: ${profile.goal}\nرژیم غذایی: ${profile.diet || 'معمولی'}\nمحدودیت‌ها: ${profile.limitations || 'ندارد'}\nحساسیت/آلرژی غذایی (هرگز استفاده نکن): ${profile.allergies || 'ندارد'}\nسطح فعالیت روزانه: ${profile.activityLevel || '-'}\nخواب: ${profile.sleepHours ?? '-'} ساعت\nوزن هدف: ${profile.targetWeightKg ?? '-'}kg\nوزن: ${profile.weightKg ?? '-'}kg\n` +
    `هدف روز تمرین: ${JSON.stringify(t.training)}\nهدف روز استراحت: ${JSON.stringify(t.rest)}\n` +
    `برنامه تمرینی: ${plan ? `${plan.days.length} روز — ${plan.days.map((d) => `${d.name} (${d.focus})`).join('، ')}` : `${profile.daysPerWeek} روز در هفته`}\nمدت جلسه: ${profile.sessionMinutes} دقیقه`;
  const parse = (text: string): Nutrition | null => {
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
  };
  const sum = (meals: Nutrition['trainingDay']) => ({ calories: meals.reduce((a, m) => a + m.calories, 0), protein: meals.reduce((a, m) => a + m.protein, 0) });
  // Relative error of the worse day — calories weigh fully, protein a bit less.
  const error = (x: Nutrition) => Math.max(...([[x.trainingDay, t.training], [x.restDay, t.rest]] as const).map(([meals, tgt]) => {
    const s = sum(meals);
    return Math.max(Math.abs(s.calories - tgt.calories) / tgt.calories, (Math.abs(s.protein - tgt.protein) / tgt.protein) * 0.6);
  }));
  const messages = [{ role: 'system' as const, content: system }, { role: 'user' as const, content: user }];
  let best = await aiChat<Nutrition>(messages, parse, { maxTokens: 5000 });
  // Models are weak at arithmetic: if the day totals miss the targets, ask once for corrected portions.
  if (error(best) > 0.08) {
    const tr = sum(best.trainingDay), rs = sum(best.restDay);
    const fix = `مجموع فعلی روز تمرین ${tr.calories}kcal و ${tr.protein}g پروتئین است ولی هدف ${t.training.calories}kcal و ${t.training.protein}g است. مجموع روز استراحت ${rs.calories}kcal و ${rs.protein}g پروتئین است ولی هدف ${t.rest.calories}kcal و ${t.rest.protein}g است. مقدار مواد غذایی (گرم/عدد) و اعداد هر وعده را طوری اصلاح کن که مجموع‌ها دقیقاً به هدف برسند. کل JSON اصلاح‌شده را با همان ساختار برگردان.`;
    try {
      const fixed = await aiChat<Nutrition>([...messages, { role: 'assistant', content: JSON.stringify({ trainingDay: best.trainingDay, restDay: best.restDay, preWorkout: best.preWorkout, postWorkout: best.postWorkout, tips: best.tips }) }, { role: 'user', content: fix }], parse, { maxTokens: 5000 });
      if (error(fixed) < error(best)) best = fixed;
    } catch (e) { console.error('nutrition correction failed', (e as Error).message); }
  }
  if (error(best) > 0.2) throw new Error(`nutrition totals too far from targets (${Math.round(error(best) * 100)}%)`);
  return best;
}
