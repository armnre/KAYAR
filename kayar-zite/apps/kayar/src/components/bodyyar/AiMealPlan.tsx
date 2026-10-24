import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Sparkles, Dumbbell, Moon, Droplets, Zap, Clock } from 'lucide-react';
import type { GetDashboardOutputType } from 'zitejs/api';
import { faNum } from '../bkit';
import { cn } from '@project/components/lib/utils';

type Dash = GetDashboardOutputType;
type Totals = { c: number; p: number; cb: number; f: number };

export function MacroTargets({ targets, totals }: { targets: NonNullable<Dash['targets']>; totals: Totals }) {
  const rows: [string, number, number, string][] = [['پروتئین', totals.p, targets.protein, 'g'], ['کربوهیدرات', totals.cb, targets.carbs, 'g'], ['چربی', totals.f, targets.fat, 'g']];
  const left = targets.calories - totals.c;
  const pct = Math.min(1, totals.c / Math.max(1, targets.calories));
  return (
    <div className="rounded-[28px] border border-border bg-card p-5">
      <div className="flex items-end justify-between">
        <div><div className="text-xs text-muted-foreground">{left >= 0 ? 'باقی‌مانده امروز' : 'بیشتر از هدف'}</div><div className="text-3xl font-black">{faNum(Math.abs(Math.round(left)))}<span className="ms-1 text-xs font-normal text-muted-foreground">kcal</span></div></div>
        <div className="text-end text-xs text-muted-foreground">هدف<div className="text-sm font-bold text-foreground">{faNum(targets.calories)}</div></div>
      </div>
      <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-secondary"><motion.div className={cn('h-full rounded-full', left < 0 ? 'bg-destructive' : 'bg-primary')} initial={{ width: 0 }} animate={{ width: `${pct * 100}%` }} transition={{ duration: 0.8 }} /></div>
      <div className="mt-4 grid grid-cols-3 gap-3">
        {rows.map(([l, v, t, u]) => (
          <div key={l}><div className="flex justify-between text-[11px] text-muted-foreground"><span>{l}</span><span>{faNum(Math.round(v))}/{faNum(t)}{u}</span></div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-secondary"><div className="h-full rounded-full bg-primary/80 transition-all" style={{ width: `${Math.min(100, (v / Math.max(1, t)) * 100)}%` }} /></div></div>
        ))}
      </div>
    </div>
  );
}

export function AiMealPlan({ plan, trainedToday }: { plan: Dash['nutritionPlan']; trainedToday: boolean }) {
  const [mode, setMode] = useState<'training' | 'rest'>(trainedToday ? 'training' : 'rest');
  if (!plan) return (
    <Link to="/app/bodyyar/plan" className="press flex items-center gap-3 rounded-[28px] border border-dashed border-primary/40 bg-primary/5 p-4">
      <span className="grid h-11 w-11 place-items-center rounded-2xl bg-primary/15"><Sparkles className="h-5 w-5 text-primary" /></span>
      <span className="flex-1 text-sm"><b>برنامه غذایی هوشمند</b><span className="block text-xs text-muted-foreground">با ساخت برنامه تمرینی، رژیم هماهنگ با تمرین‌هات هم ساخته می‌شه.</span></span>
    </Link>
  );
  const meals = mode === 'training' ? plan.trainingDay : plan.restDay;
  const t = plan.targets[mode];
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-2 font-black"><Sparkles className="h-4 w-4 text-primary" />برنامه غذایی هوشمند</h3>
        <div className="flex rounded-full border border-border bg-card p-1 text-xs font-bold">
          {([['training', 'روز تمرین', Dumbbell], ['rest', 'استراحت', Moon]] as const).map(([k, l, I]) => (
            <button key={k} onClick={() => setMode(k)} className={cn('flex items-center gap-1 rounded-full px-3 py-1.5 transition', mode === k ? 'bg-primary text-primary-foreground' : 'text-muted-foreground')}><I className="h-3.5 w-3.5" />{l}</button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-4 gap-2 text-center">
        {[['کالری', t.calories, ''], ['پروتئین', t.protein, 'g'], ['کربو', t.carbs, 'g'], ['چربی', t.fat, 'g']].map(([l, v, u]) => (
          <div key={l as string} className="rounded-2xl bg-secondary/70 p-2"><div className="text-sm font-black">{faNum(v as number)}<span className="text-[10px] font-normal text-muted-foreground">{u}</span></div><div className="text-[10px] text-muted-foreground">{l}</div></div>
        ))}
      </div>
      {mode === 'training' && (
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="rounded-2xl border border-primary/30 bg-primary/10 p-3"><div className="mb-1 flex items-center gap-1 font-bold text-primary"><Zap className="h-3.5 w-3.5" />قبل تمرین</div><p className="leading-6 text-muted-foreground">{plan.preWorkout}</p></div>
          <div className="rounded-2xl border border-primary/30 bg-primary/10 p-3"><div className="mb-1 flex items-center gap-1 font-bold text-primary"><Dumbbell className="h-3.5 w-3.5" />بعد تمرین</div><p className="leading-6 text-muted-foreground">{plan.postWorkout}</p></div>
        </div>
      )}
      <ul className="space-y-2">
        {meals.map((m, i) => (
          <motion.li key={`${mode}${i}`} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="rounded-3xl border border-border bg-card p-4">
            <div className="flex items-center justify-between"><div className="font-bold">{m.name}{m.time && <span className="ms-2 inline-flex items-center gap-1 text-[11px] font-normal text-muted-foreground"><Clock className="h-3 w-3" />{m.time}</span>}</div><span className="rounded-lg bg-primary/15 px-2 py-0.5 text-[11px] font-bold text-primary">{faNum(m.calories)} kcal</span></div>
            <ul className="mt-2 space-y-1 text-sm text-muted-foreground">{m.items.map((x, k) => <li key={k} className="flex gap-2"><span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-primary" />{x}</li>)}</ul>
            <div className="mt-2 flex gap-3 text-[11px] text-muted-foreground"><span>P {faNum(m.protein)}g</span><span>C {faNum(m.carbs)}g</span><span>F {faNum(m.fat)}g</span></div>
          </motion.li>
        ))}
      </ul>
      <div className="flex items-center gap-2 rounded-2xl bg-secondary/60 p-3 text-xs"><Droplets className="h-4 w-4 text-cyan" />آب روزانه: حدود {faNum(plan.waterL)} لیتر</div>
      {plan.tips.length > 0 && <ul className="list-disc space-y-1 ps-5 text-xs leading-6 text-muted-foreground">{plan.tips.map((x, i) => <li key={i}>{x}</li>)}</ul>}
    </div>
  );
}
