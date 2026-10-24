import { z } from 'zod';
import { memberId } from '../server/rbac';
import { tokenField } from '../server/util';
import { createEndpoint } from 'zitejs/backend';
import { zite } from 'zitejs/db';
import { aiStream } from '../server/nara';

export default createEndpoint({
  description: 'Answers a fitness or nutrition question with the BodyYar AI coach',
  stream: true,
  inputSchema: z.object({
    token: tokenField,
    messages: z.array(z.object({ role: z.enum(['user', 'assistant']), content: z.string().min(1).max(2000) })).min(1).max(20),
    useProfile: z.boolean(),
  }),
  outputSchema: z.object({ reply: z.string() }),
  execute: async ({ input, stream }) => {
    const uid = await memberId(input.token);
    let profileText = '';
    if (input.useProfile) {
      const p = await zite.bodyProfiles.findOne({ filters: { memberId: uid } });
      if (p?.goal) profileText = `\nپروفایل کاربر (با اجازه خودش): هدف ${p.goal}، سطح ${p.level ?? '-'}، ${p.daysPerWeek ?? '-'} روز در هفته، مکان ${p.place ?? '-'}، رژیم ${p.diet ?? '-'}، محدودیت‌ها: ${p.limitations || 'ندارد'}، وزن ${p.weightKg ?? '-'}kg، وزن هدف ${p.targetWeightKg ?? '-'}kg، فعالیت روزانه ${p.activityLevel ?? '-'}، خواب ${p.sleepHours ?? '-'} ساعت، آلرژی: ${p.allergies || 'ندارد'}.`;
      const { records: plans } = await zite.workoutPlans.findAll({ filters: { memberId: uid, active: true }, limit: 1 });
      const wp = plans[0];
      if (wp?.planJson) { try { const pl = JSON.parse(wp.planJson) as { days: { name: string; exercises: { name: string; sets: number; reps: string }[] }[] }; profileText += `\nبرنامه تمرینی فعلی: ${pl.days.map((d) => `${d.name}: ${d.exercises.map((x) => `${x.name} ${x.sets}×${x.reps}`).join('، ')}`).join(' | ')}`; } catch { /* ignore */ } }
      if (wp?.nutritionJson) { try { const n = JSON.parse(wp.nutritionJson) as { targets: { training: { calories: number; protein: number }; rest: { calories: number; protein: number } } }; profileText += `\nهدف تغذیه: روز تمرین ${n.targets.training.calories}kcal و ${n.targets.training.protein}g پروتئین؛ روز استراحت ${n.targets.rest.calories}kcal.`; } catch { /* ignore */ } }
      const { rows } = await zite.sql({ query: `SELECT "title", "durationSec" FROM "WorkoutSessions" WHERE "memberId" = $1 ORDER BY "startedAt" DESC NULLS LAST LIMIT 3`, params: [uid] });
      if (rows.length) profileText += `\nجلسات اخیر: ${rows.map((r) => `${r.title} (${Math.round(Number(r.durationSec) / 60)} دقیقه)`).join('، ')}`;
    }
    const system = `تو «بدن‌یار»، مربی هوشمند تناسب اندام کایار هستی. فارسی، دقیق، کاربردی و دلگرم‌کننده جواب بده.
قالب: Markdown تمیز — جمله اول جواب مستقیم، بعد بولت‌های کوتاه یا مراحل شماره‌دار، اعداد مشخص (ست، تکرار، گرم، دقیقه) و در صورت نیاز **نکته مهم** پررنگ. بدون مقدمه طولانی؛ معمولاً زیر ۱۸۰ کلمه.
تو پزشک یا متخصص تغذیه بالینی نیستی: برای درد، آسیب، بارداری، بیماری، حساسیت غذایی یا داروها کاربر را به پزشک ارجاع بده.
دستورالعمل خطرناک (روزه‌داری شدید، کاهش وزن سریع، مکمل‌های پرخطر) نده. اعداد تغذیه‌ای را تقریبی معرفی کن.${profileText}`;
    const reply = await stream.forward(aiStream([{ role: 'system', content: system }, ...input.messages.slice(-12)]));
    if (!reply.trim()) throw new Error('دستیار هوشمند الان پاسخی نداد؛ دوباره امتحان کن.');
    return { reply: reply.slice(0, 8000) };
  },
});
