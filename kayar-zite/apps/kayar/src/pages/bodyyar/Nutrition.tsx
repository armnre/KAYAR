import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { Plus, Trash2, Loader2, Info } from 'lucide-react';
import { getDashboard, listFoods, listMeals, mealLog } from 'zitejs/api';
import { AiMealPlan } from '../../components/bodyyar/AiMealPlan';
import { AddFoodSheet } from '../../components/bodyyar/AddFoodSheet';
import { DateStrip, MacroBar, MACRO_COLORS, MEAL_META, WaterTracker, smartInsight, type Totals } from '../../components/bodyyar/nutritionKit';
import { tok } from '../../lib/session';
import { Card, ErrorState, LoadingBlocks, PageHeader, Ring, errMsg, faNum, todayStr } from '../../components/bkit';
import { MEAL_LABELS } from '../../lib/assets';
import { useLoad } from '../../lib/useLoad';
import { cn } from '@project/components/lib/utils';

export default function Nutrition() {
  const [date, setDate] = useState(todayStr());
  const foods = useLoad(() => listFoods({}));
  const dash = useLoad(() => getDashboard({ token: tok() }));
  const meals = useLoad(() => listMeals({ token: tok(), date }), [date]);
  const [adding, setAdding] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const entries = meals.data?.entries ?? [];
  const totals: Totals = useMemo(() => entries.reduce((a, m) => ({ c: a.c + m.calories, p: a.p + m.protein, cb: a.cb + m.carbs, f: a.f + m.fat }), { c: 0, p: 0, cb: 0, f: 0 }), [entries]);
  const targets = dash.data?.targets ?? null;
  const insight = smartInsight(totals, targets, entries.length);
  const remove = async (id: string) => {
    setDeleting(id);
    try { await mealLog({ token: tok(), action: 'delete', id }); meals.setData((d) => d && { ...d, entries: d.entries.filter((e) => e.id !== id) }); }
    catch (e) { toast.error(errMsg(e)); } finally { setDeleting(null); }
  };
  const left = targets ? targets.calories - totals.c : 0;

  return (
    <div className="space-y-5">
      <PageHeader title="تغذیه" subtitle="هماهنگ با برنامه تمرینی‌ات" back="/app/bodyyar" />
      <DateStrip date={date} onChange={setDate} />

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="relative overflow-hidden rounded-[32px] border border-white/[.08] bg-[radial-gradient(120%_120%_at_100%_0%,hsl(var(--primary)/.18),transparent_50%),radial-gradient(100%_100%_at_0%_100%,hsl(var(--violet)/.18),transparent_55%)] p-5">
        <div className="flex items-center gap-5">
          <Ring value={totals.c} max={targets?.calories ?? Math.max(1, totals.c)} size={148} stroke={13} color={left < 0 ? 'hsl(var(--destructive))' : 'hsl(var(--primary))'}>
            <div><div className="text-[10px] text-muted-foreground">{targets ? (left >= 0 ? 'باقی‌مانده' : 'اضافه') : 'دریافتی'}</div>
              <div className="text-3xl font-black leading-tight">{faNum(Math.abs(Math.round(targets ? left : totals.c)))}</div><div className="font-latin text-[10px] text-muted-foreground">kcal</div></div>
          </Ring>
          <div className="min-w-0 flex-1 space-y-3">
            <div className="flex justify-between text-xs"><span className="text-muted-foreground">خورده‌شده <b className="text-sm text-foreground">{faNum(Math.round(totals.c))}</b></span>{targets && <span className="text-muted-foreground">هدف <b className="text-sm text-foreground">{faNum(targets.calories)}</b></span>}</div>
            {targets ? <>
              <MacroBar label="پروتئین" value={totals.p} target={targets.protein} color={MACRO_COLORS.p} />
              <MacroBar label="کربوهیدرات" value={totals.cb} target={targets.carbs} color={MACRO_COLORS.cb} />
              <MacroBar label="چربی" value={totals.f} target={targets.fat} color={MACRO_COLORS.f} />
            </> : <div className="grid grid-cols-3 gap-2 text-center text-xs">{([['P', totals.p], ['C', totals.cb], ['F', totals.f]] as const).map(([l, v]) => <div key={l} className="rounded-xl bg-white/5 p-2"><b>{faNum(Math.round(v))}g</b><div className="text-muted-foreground">{l}</div></div>)}</div>}
          </div>
        </div>
        {date === todayStr() && (
          <div className={cn('mt-4 flex items-start gap-2.5 rounded-2xl border p-3 text-xs leading-6', insight.tone === 'destructive' ? 'border-destructive/30 bg-destructive/10' : 'border-white/[.08] bg-black/20')}>
            <insight.icon className={cn('mt-1 h-4 w-4 shrink-0', insight.tone === 'destructive' ? 'text-destructive' : insight.tone === 'cyan' ? 'text-[hsl(var(--cyan))]' : 'text-primary')} />
            <span><b className="text-foreground">دستیار بدن‌یار: </b>{insight.text}</span>
          </div>
        )}
      </motion.div>

      <WaterTracker date={date} goalL={dash.data?.nutritionPlan?.waterL ?? 2.5} />

      <div className="flex items-center justify-between pt-1"><h3 className="text-lg font-black">وعده‌های {date === todayStr() ? 'امروز' : 'این روز'}</h3><span className="text-xs text-muted-foreground">{faNum(entries.length)} مورد ثبت‌شده</span></div>
      {meals.loading ? <LoadingBlocks count={3} /> : meals.error ? <ErrorState message={meals.error} onRetry={meals.reload} /> : (
        <div className="grid gap-3 sm:grid-cols-2">
          {Object.entries(MEAL_LABELS).map(([k, label], idx) => {
            const list = entries.filter((e) => e.meal === k);
            const kcal = list.reduce((a, m) => a + m.calories, 0);
            const meta = MEAL_META[k] ?? MEAL_META.snack;
            const goal = targets ? Math.round(targets.calories * meta.share) : 0;
            return (
              <motion.div key={k} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }} className={cn('overflow-hidden rounded-[28px] border border-white/[.07] bg-gradient-to-br p-4', meta.g)}>
                <div className="flex items-center gap-3">
                  <span className="grid h-12 w-12 place-items-center rounded-2xl bg-black/25 text-2xl backdrop-blur">{meta.emoji}</span>
                  <div className="min-w-0 flex-1"><div className="font-black">{label}</div>
                    <div className="text-xs text-muted-foreground"><b className="text-foreground">{faNum(Math.round(kcal))}</b>{goal ? ` / ${faNum(goal)}` : ''} کالری · {meta.hint}</div></div>
                  <button onClick={() => setAdding(k)} className="press grid h-11 w-11 place-items-center rounded-full bg-primary text-primary-foreground shadow-[0_8px_24px_-8px_hsl(var(--primary))]" aria-label={`افزودن به ${label}`}><Plus className="h-5 w-5" /></button>
                </div>
                {goal > 0 && <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-black/25"><div className="h-full rounded-full bg-foreground/80 transition-all duration-700" style={{ width: `${Math.min(100, (kcal / goal) * 100)}%` }} /></div>}
                {list.length > 0 ? (
                  <ul className="mt-3 space-y-1.5">
                    {list.map((m) => (
                      <li key={m.id} className="flex items-center gap-2 rounded-2xl bg-black/25 px-3 py-2 text-sm backdrop-blur">
                        <span className="min-w-0 flex-1 truncate font-bold">{m.foodName} <span className="text-xs font-normal text-muted-foreground">{faNum(m.grams)}g</span></span>
                        <span className="text-[11px] text-muted-foreground">{faNum(Math.round(m.calories))} kcal</span>
                        <button className="grid h-8 w-8 place-items-center rounded-full text-muted-foreground hover:bg-destructive/15 hover:text-destructive" disabled={deleting === m.id} onClick={() => remove(m.id)} aria-label="حذف">{deleting === m.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}</button>
                      </li>
                    ))}
                  </ul>
                ) : <button onClick={() => setAdding(k)} className="mt-3 w-full rounded-2xl border border-dashed border-white/15 py-3 text-xs text-muted-foreground transition hover:border-primary/50 hover:text-foreground">+ یه خوراکی اضافه کن</button>}
              </motion.div>
            );
          })}
        </div>
      )}

      {dash.data && <AiMealPlan plan={dash.data.nutritionPlan} trainedToday={dash.data.trainedToday} />}

      {meals.data && meals.data.history.length > 1 && (
        <Card><div className="mb-4 flex items-center justify-between"><h3 className="font-black">روند ۱۴ روز اخیر</h3>{targets && <span className="flex items-center gap-1 text-[11px] text-muted-foreground"><span className="h-0.5 w-4 bg-primary" />هدف</span>}</div>
          <div className="relative flex h-28 items-end gap-1.5" dir="ltr">
            {(() => { const max = Math.max(...meals.data.history.map((x) => x.calories), targets?.calories ?? 1, 1); return <>
              {targets && <div className="absolute inset-x-0 border-t border-dashed border-primary/60" style={{ bottom: `${(targets.calories / max) * 100}%` }} />}
              {meals.data.history.map((h) => <button key={h.date} onClick={() => setDate(h.date)} title={`${h.date}: ${h.calories}`} className={cn('flex-1 rounded-t-lg transition-all', h.date === date ? 'bg-primary shadow-[0_0_12px_hsl(var(--primary)/.6)]' : 'bg-white/15 hover:bg-white/25')} style={{ height: `${Math.max(3, (h.calories / max) * 100)}%` }} />)}
            </>; })()}
          </div>
        </Card>
      )}
      <p className="flex items-start gap-2 text-xs leading-6 text-muted-foreground"><Info className="mt-1 h-3.5 w-3.5 shrink-0" />مقادیر تقریبی و بر اساس USDA FoodData Central است. برای بیماری، حساسیت یا رژیم درمانی با متخصص مشورت کن.</p>

      <AddFoodSheet open={!!adding} meal={adding ?? 'snack'} date={date} foods={foods.data?.foods ?? []} recent={meals.data?.recentFoodIds ?? []} totals={totals} targets={date === todayStr() ? targets : null} onClose={() => setAdding(null)} onAdded={() => { setAdding(null); meals.reload(); }} />
    </div>
  );
}
