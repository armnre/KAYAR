import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { ChevronLeft, ChevronRight, Plus, Search, Trash2, Loader2, Info } from 'lucide-react';
import { getDashboard, listFoods, listMeals, mealLog, type ListFoodsOutputType } from 'zitejs/api';
import { AiMealPlan, MacroTargets } from '../../components/bodyyar/AiMealPlan';
import { tok } from '../../lib/session';
import { Button } from '@project/components/ui/button';
import { Input } from '@project/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@project/components/ui/dialog';
import { Card, ErrorState, LoadingBlocks, PageHeader, errMsg, faNum, todayStr } from '../../components/bkit';
import { ASSETS, MEAL_LABELS } from '../../lib/assets';
import { useLoad } from '../../lib/useLoad';
import { cn } from '@project/components/lib/utils';

type Food = ListFoodsOutputType['foods'][0];
const shift = (d: string, n: number) => { const x = new Date(d + 'T12:00:00'); x.setDate(x.getDate() + n); return x.toISOString().slice(0, 10); };
const TAGS: Record<string, string> = { vegetarian: 'گیاهی', vegan: 'وگان', 'gluten-free': 'بدون گلوتن', 'high-protein': 'پرپروتئین' };

export default function Nutrition() {
  const [date, setDate] = useState(todayStr());
  const foods = useLoad(() => listFoods({}));
  const dash = useLoad(() => getDashboard({ token: tok() }));
  const meals = useLoad(() => listMeals({ token: tok(),  date }), [date]);
  const [adding, setAdding] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const totals = useMemo(() => (meals.data?.entries ?? []).reduce((a, m) => ({ c: a.c + m.calories, p: a.p + m.protein, cb: a.cb + m.carbs, f: a.f + m.fat }), { c: 0, p: 0, cb: 0, f: 0 }), [meals.data]);
  const remove = async (id: string) => {
    setDeleting(id);
    try { await mealLog({ token: tok(),  action: 'delete', id }); meals.setData((d) => d && { ...d, entries: d.entries.filter((e) => e.id !== id) }); }
    catch (e) { toast.error(errMsg(e)); } finally { setDeleting(null); }
  };

  return (
    <div className="space-y-5">
      <PageHeader title="تغذیه" subtitle="هماهنگ با برنامه تمرینی‌ات" back="/app/bodyyar" />
      <div className="relative overflow-hidden rounded-[28px] border border-border">
        <img src={ASSETS.food} alt="وعده‌های غذایی سالم" className="absolute inset-0 h-full w-full object-cover opacity-30" />
        <div className="relative p-5">
          <div className="flex items-center justify-between">
            <Button size="icon" variant="ghost" onClick={() => setDate(shift(date, -1))} aria-label="روز قبل"><ChevronRight /></Button>
            <div className="text-center font-bold">{date === todayStr() ? 'امروز' : new Date(date + 'T12:00:00').toLocaleDateString('fa-IR', { weekday: 'long', month: 'long', day: 'numeric' })}</div>
            <Button size="icon" variant="ghost" disabled={date >= todayStr()} onClick={() => setDate(shift(date, 1))} aria-label="روز بعد"><ChevronLeft /></Button>
          </div>
          <div className="mt-4 grid grid-cols-4 gap-2 text-center">
            {[['کالری', totals.c, 'kcal'], ['پروتئین', totals.p, 'g'], ['کربوهیدرات', totals.cb, 'g'], ['چربی', totals.f, 'g']].map(([l, v, u]) => (
              <div key={l as string} className="rounded-2xl bg-background/80 p-3"><div className="latin text-lg font-extrabold text-primary">{faNum(Math.round(v as number))}</div><div className="text-[11px] text-muted-foreground">{l} <span className="latin">{u}</span></div></div>
            ))}
          </div>
        </div>
      </div>

      {dash.data?.targets && date === todayStr() && <MacroTargets targets={dash.data.targets} totals={totals} />}
      {dash.data && <AiMealPlan plan={dash.data.nutritionPlan} trainedToday={dash.data.trainedToday} />}
      <h3 className="pt-2 font-black">ثبت وعده‌ها</h3>
      {meals.loading ? <LoadingBlocks count={2} /> : meals.error ? <ErrorState message={meals.error} onRetry={meals.reload} /> : (
        Object.entries(MEAL_LABELS).map(([k, label]) => {
          const list = meals.data!.entries.filter((e) => e.meal === k);
          return (
            <Card key={k} className="p-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold">{label} <span className="latin text-xs font-normal text-muted-foreground">{faNum(list.reduce((a, m) => a + m.calories, 0))} kcal</span></h3>
                <Button size="sm" variant="secondary" className="rounded-full" onClick={() => setAdding(k)}><Plus className="me-1 h-4 w-4" />افزودن</Button>
              </div>
              {list.length > 0 && (
                <ul className="mt-3 space-y-2">
                  {list.map((m) => (
                    <li key={m.id} className="flex items-center gap-3 rounded-2xl bg-secondary p-3 text-sm">
                      <span className="flex-1">{m.foodName} <span className="latin text-xs text-muted-foreground">{faNum(m.grams)}g</span></span>
                      <span className="latin text-xs">{faNum(m.calories)} kcal · P {faNum(m.protein)}</span>
                      <Button size="icon" variant="ghost" className="h-8 w-8" disabled={deleting === m.id} onClick={() => remove(m.id)} aria-label="حذف">{deleting === m.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}</Button>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          );
        })
      )}

      {meals.data && meals.data.history.length > 1 && (
        <Card><h3 className="mb-3 font-bold">۱۴ روز اخیر</h3>
          <div className="flex h-24 items-end gap-1" dir="ltr">
            {meals.data.history.map((h) => { const max = Math.max(...meals.data!.history.map((x) => x.calories), 1); return <div key={h.date} title={`${h.date}: ${h.calories}`} className="flex-1 rounded-t bg-primary/70" style={{ height: `${(h.calories / max) * 100}%` }} />; })}
          </div>
        </Card>
      )}
      <p className="flex items-start gap-2 text-xs text-muted-foreground"><Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />مقادیر تقریبی و بر اساس USDA FoodData Central است. برای بیماری، حساسیت یا رژیم درمانی با متخصص مشورت کن.</p>

      <AddFood open={!!adding} meal={adding ?? 'snack'} date={date} foods={foods.data?.foods ?? []} recent={meals.data?.recentFoodIds ?? []} onClose={() => setAdding(null)} onAdded={() => { setAdding(null); meals.reload(); }} />
    </div>
  );
}

function AddFood({ open, meal, date, foods, recent, onClose, onAdded }: { open: boolean; meal: string; date: string; foods: Food[]; recent: string[]; onClose: () => void; onAdded: () => void }) {
  const [q, setQ] = useState('');
  const [tag, setTag] = useState('');
  const [sel, setSel] = useState<Food | null>(null);
  const [grams, setGrams] = useState('');
  const [busy, setBusy] = useState(false);
  const list = foods.filter((f) => (!q || f.name.includes(q)) && (!tag || f.tags.includes(tag)));
  const recentFoods = recent.map((id) => foods.find((f) => f.id === id)).filter(Boolean) as Food[];
  const g = Number(grams);
  const valid = g >= 1 && g <= 3000;
  const pick = (f: Food) => { setSel(f); setGrams(String(f.defaultServingG)); };
  const close = () => { setSel(null); setQ(''); onClose(); };
  const add = async () => {
    if (!sel || !valid || busy) return;
    setBusy(true);
    try { await mealLog({ token: tok(),  action: 'add', foodId: sel.id, grams: g, meal: meal as 'snack', date }); toast.success(`${sel.name} ثبت شد`); setSel(null); onAdded(); }
    catch (e) { toast.error(errMsg(e)); } finally { setBusy(false); }
  };
  return (
    <Dialog open={open} onOpenChange={(o) => !o && close()}>
      <DialogContent className="max-h-[85dvh] overflow-y-auto rounded-[28px]" dir="rtl">
        <DialogHeader><DialogTitle>{sel ? sel.name : `افزودن به ${MEAL_LABELS[meal]}`}</DialogTitle></DialogHeader>
        {sel ? (
          <div className="space-y-4">
            <div className="grid grid-cols-4 gap-2 text-center text-xs">
              {[['کالری', sel.caloriesPer100g], ['پروتئین', sel.proteinPer100g], ['کربو', sel.carbsPer100g], ['چربی', sel.fatPer100g]].map(([l, v]) => (
                <div key={l as string} className="rounded-2xl bg-secondary p-2"><div className="latin font-bold">{faNum(Math.round((v as number) * (valid ? g : 0) / 10) / 10)}</div><div className="text-muted-foreground">{l}</div></div>
              ))}
            </div>
            <div>
              <label className="text-sm" htmlFor="grams">مقدار (گرم) — یک وعده: {sel.servingLabel} ≈ <span className="latin">{sel.defaultServingG}g</span></label>
              <Input id="grams" inputMode="decimal" value={grams} onChange={(e) => setGrams(e.target.value.replace(/[^\d.]/g, ''))} className="latin mt-2 h-12 rounded-2xl" aria-invalid={!valid} />
              {!valid && <p className="mt-1 text-xs text-destructive">مقدار بین ۱ تا ۳۰۰۰ گرم</p>}
              <div className="mt-2 flex gap-2">{[0.5, 1, 1.5, 2].map((m) => <button key={m} onClick={() => setGrams(String(Math.round(sel.defaultServingG * m)))} className="rounded-full bg-secondary px-3 py-1 text-xs">{faNum(m)} وعده</button>)}</div>
            </div>
            <p className="text-[11px] text-muted-foreground">منبع: {sel.source}</p>
            <div className="flex gap-2"><Button variant="outline" className="flex-1 rounded-2xl" onClick={() => setSel(null)}>بازگشت</Button><Button className="flex-1 rounded-2xl" disabled={!valid || busy} onClick={add}>{busy && <Loader2 className="me-2 h-4 w-4 animate-spin" />}ثبت</Button></div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="relative"><Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="جستجوی خوراکی…" className="h-11 rounded-2xl pr-10" /></div>
            <div className="flex flex-wrap gap-1.5">{Object.entries(TAGS).map(([k, v]) => <button key={k} onClick={() => setTag(tag === k ? '' : k)} className={cn('rounded-full px-3 py-1 text-xs', tag === k ? 'bg-primary text-primary-foreground' : 'bg-secondary')}>{v}</button>)}</div>
            {!q && !tag && recentFoods.length > 0 && <div><div className="mb-1 text-xs text-muted-foreground">اخیر</div><div className="flex flex-wrap gap-2">{recentFoods.map((f) => <button key={f.id} onClick={() => pick(f)} className="rounded-2xl border border-primary/40 px-3 py-1.5 text-sm">{f.name}</button>)}</div></div>}
            <ul className="space-y-1">
              {list.map((f) => (
                <li key={f.id}><button onClick={() => pick(f)} className="flex w-full items-center justify-between rounded-2xl p-3 text-start text-sm hover:bg-secondary"><span>{f.name}</span><span className="latin text-xs text-muted-foreground">{f.caloriesPer100g} kcal/100g</span></button></li>
              ))}
              {list.length === 0 && <li className="p-4 text-center text-sm text-muted-foreground">موردی پیدا نشد.</li>}
            </ul>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
