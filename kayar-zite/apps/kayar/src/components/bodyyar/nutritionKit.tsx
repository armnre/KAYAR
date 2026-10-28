import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Minus } from 'lucide-react';
import { faNum, todayStr } from '../bkit';
import { cn } from '@project/components/lib/utils';
import { IconBadge, IcWater, MEAL_ICON, CAT_ICON, MEAL_TONE, IcSpark, IcProtein, IcCalorie, IcPlate, type KIcon } from '../icons/kayar';

export type Totals = { c: number; p: number; cb: number; f: number };
export type Targets = { calories: number; protein: number; carbs: number; fat: number };

export const MEAL_META: Record<string, { icon: KIcon; tone: (typeof MEAL_TONE)[string]; share: number; g: string; hint: string }> = {
  breakfast: { icon: MEAL_ICON.breakfast, tone: MEAL_TONE.breakfast, share: 0.25, g: 'from-[hsl(40_95%_60%/.35)] to-[hsl(20_90%_50%/.08)]', hint: 'انرژی شروع روز' },
  lunch: { icon: MEAL_ICON.lunch, tone: MEAL_TONE.lunch, share: 0.35, g: 'from-[hsl(71_100%_56%/.3)] to-[hsl(140_70%_40%/.06)]', hint: 'وعده اصلی' },
  dinner: { icon: MEAL_ICON.dinner, tone: MEAL_TONE.dinner, share: 0.25, g: 'from-[hsl(254_100%_62%/.32)] to-[hsl(230_60%_40%/.06)]', hint: 'سبک و پروتئینی' },
  snack: { icon: MEAL_ICON.snack, tone: MEAL_TONE.snack, share: 0.15, g: 'from-[hsl(188_86%_53%/.3)] to-[hsl(200_70%_40%/.06)]', hint: 'میان‌وعده هوشمند' },
};

export const CAT_META: Record<string, { icon: KIcon; label: string }> = {
  protein: { icon: CAT_ICON.protein, label: 'پروتئین' }, grains: { icon: CAT_ICON.grains, label: 'غلات' }, dairy: { icon: CAT_ICON.dairy, label: 'لبنیات' },
  fruit: { icon: CAT_ICON.fruit, label: 'میوه' }, vegetable: { icon: CAT_ICON.vegetable, label: 'سبزیجات' }, fats: { icon: CAT_ICON.fats, label: 'چربی سالم' },
  legumes: { icon: CAT_ICON.legumes, label: 'حبوبات' }, snack: { icon: CAT_ICON.snack, label: 'تنقلات' },
};
export const catIcon = (c?: string): KIcon => (c && CAT_META[c]?.icon) || IcPlate;

export const MACRO_COLORS = { p: 'hsl(var(--cyan))', cb: 'hsl(var(--primary))', f: 'hsl(var(--gold))' };

/** Picks one short, actionable, kind sentence. Never shames, never pushes extreme numbers (see docs: health-content safety). */
export function smartInsight(totals: Totals, t: Targets | null, entries: number) {
  const h = new Date().getHours();
  if (!t) return { icon: IcSpark, tone: 'primary', text: 'پروفایل بدن‌یارت رو کامل کن تا هدف کالری و درشت‌مغذی دقیقاً برای بدنت محاسبه بشه.' };
  if (totals.c > t.calories * 1.08) return { icon: IcPlate, tone: 'cyan', text: 'امروز کمی بیشتر از برنامه خوردی و این کاملاً طبیعیه. اگه هنوز گرسنه‌ای، سبزیجات و پروتئین سبک انتخاب خوبیه؛ فردا دوباره با ریتم خودت ادامه بده.' };
  if (!entries) return { icon: IcSpark, tone: 'primary', text: h < 11 ? 'روزت رو با یه صبحانه پروتئینی شروع کن — تخم‌مرغ یا ماست یونانی عالیه.' : 'هنوز چیزی ثبت نکردی. اولین وعده‌ات رو اضافه کن تا تحلیل هوشمند شروع بشه.' };
  const pLeft = t.protein - totals.p;
  if (pLeft > 35 && h >= 14) return { icon: IcProtein, tone: 'cyan', text: `${faNum(Math.round(pLeft))} گرم پروتئین تا هدف مونده. سینه مرغ، تن ماهی یا عدس بهترین گزینه‌ها هستن.` };
  if (totals.c >= t.calories * 0.92) return { icon: IcCalorie, tone: 'primary', text: 'عالیه! تقریباً به هدف امروزت رسیدی. همین ریتم رو نگه دار.' };
  return { icon: IcSpark, tone: 'primary', text: `${faNum(Math.round(t.calories - totals.c))} کالری باقی مونده؛ حدود ${faNum(Math.max(0, Math.round(pLeft)))}g پروتئین و ${faNum(Math.max(0, Math.round(t.carbs - totals.cb)))}g کربوهیدرات.` };
}

export function DateStrip({ date, onChange }: { date: string; onChange: (d: string) => void }) {
  const days = Array.from({ length: 7 }).map((_, i) => { const x = new Date(todayStr() + 'T12:00:00'); x.setDate(x.getDate() - (6 - i)); return x; });
  return (
    <div className="grid grid-cols-7 gap-1.5">
      {days.map((d) => {
        const iso = d.toISOString().slice(0, 10); const on = iso === date; const isToday = iso === todayStr();
        return (
          <button key={iso} onClick={() => onChange(iso)} className={cn('press relative flex flex-col items-center rounded-2xl py-2 transition', on ? 'bg-primary text-primary-foreground shadow-[0_8px_24px_-8px_hsl(var(--primary)/.8)]' : 'bg-white/[.04] text-muted-foreground hover:bg-white/[.07]')}>
            <span className="text-[10px] font-bold">{d.toLocaleDateString('fa-IR', { weekday: 'narrow' })}</span>
            <span className="text-base font-black">{d.toLocaleDateString('fa-IR', { day: 'numeric' })}</span>
            {isToday && !on && <span className="absolute bottom-1 h-1 w-1 rounded-full bg-primary" />}
          </button>
        );
      })}
    </div>
  );
}

export function MacroBar({ label, value, target, color }: { label: string; value: number; target: number; color: string }) {
  const pct = Math.min(100, (value / Math.max(1, target)) * 100);
  return (
    <div>
      <div className="flex items-baseline justify-between text-[11px]"><span className="font-bold">{label}</span><span className="text-muted-foreground"><b className="text-foreground">{faNum(Math.round(value))}</b>/{faNum(target)}g</span></div>
      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-white/[.06]"><motion.div className="h-full rounded-full" style={{ background: color, boxShadow: `0 0 10px ${color}` }} initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.9 }} /></div>
    </div>
  );
}

export function WaterTracker({ date, goalL }: { date: string; goalL: number }) {
  const key = `kayar-water-${date}`;
  const goal = Math.max(6, Math.round(goalL * 4)); // 250ml glasses
  const [n, setN] = useState(0);
  useEffect(() => { setN(Number(localStorage.getItem(key) ?? 0)); }, [key]);
  const set = (v: number) => { const x = Math.max(0, Math.min(goal + 4, v)); setN(x); localStorage.setItem(key, String(x)); };
  return (
    <div className="flex items-center gap-3 rounded-[24px] border border-white/[.07] bg-gradient-to-l from-[hsl(var(--cyan)/.12)] to-transparent p-4">
      <IconBadge icon={IcWater} tone="cyan" size="sm" label="آب" />
      <div className="min-w-0 flex-1">
        <div className="text-sm font-bold">آب <span className="text-xs font-normal text-muted-foreground">{faNum(n * 0.25)} از {faNum(goal * 0.25)} لیتر</span></div>
        <div className="mt-2 flex flex-wrap gap-1">{Array.from({ length: goal }).map((_, i) => <button key={i} onClick={() => set(i + 1 === n ? i : i + 1)} aria-label={`لیوان ${i + 1}`} className={cn('h-5 w-3.5 rounded-b-md rounded-t-sm border transition', i < n ? 'border-[hsl(var(--cyan))] bg-[hsl(var(--cyan))] shadow-[0_0_8px_hsl(var(--cyan)/.6)]' : 'border-white/15')} />)}</div>
      </div>
      <div className="flex flex-col gap-1">
        <button onClick={() => set(n + 1)} className="press grid h-11 w-11 place-items-center rounded-full bg-[hsl(var(--cyan))] text-black" aria-label="افزودن یک لیوان آب"><Plus className="h-4 w-4" /></button>
        <button onClick={() => set(n - 1)} className="press grid h-11 w-11 place-items-center rounded-full bg-white/5" aria-label="کم کردن یک لیوان آب"><Minus className="h-4 w-4" /></button>
      </div>
    </div>
  );
}
