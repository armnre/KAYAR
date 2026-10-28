import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { toast } from 'sonner';
import { Search, Loader2, Sparkles, ArrowRight, Check, Clock, X } from 'lucide-react';
import { mealLog, type ListFoodsOutputType } from 'zitejs/api';
import { tok } from '../../lib/session';
import { Sheet, SheetContent, SheetTitle } from '@project/components/ui/sheet';
import { Button } from '@project/components/ui/button';
import { Ring, errMsg, faNum } from '../bkit';
import { MEAL_LABELS } from '../../lib/assets';
import { CAT_META, MACRO_COLORS, MEAL_META, catIcon, type Totals, type Targets } from './nutritionKit';
import { IconBadge, DIET_ICON, IcSearchFood, type KIcon } from '../icons/kayar';
import { cn } from '@project/components/lib/utils';

type Food = ListFoodsOutputType['foods'][0];
const TAGS: Record<string, string> = { 'high-protein': 'پرپروتئین', vegetarian: 'گیاهی', vegan: 'وگان', 'gluten-free': 'بدون گلوتن' };
const TagIcon = ({ t }: { t: string }) => { const I: KIcon | undefined = DIET_ICON[t]; return I ? <I size={16} /> : null; };
const FoodIcon = ({ c, size = 20 }: { c?: string; size?: number }) => { const I = catIcon(c); return <I size={size} />; };
/** Typo-tolerant Persian search: unifies ی/ي, ک/ك, ه/ة, removes ZWNJ, diacritics and spaces. */
const nq = (s: string) => s.replace(/[يى]/g, 'ی').replace(/ك/g, 'ک').replace(/[ةۀ]/g, 'ه').replace(/[أإآ]/g, 'ا').replace(/[\u064B-\u065F\u0670\u200c\s‌]/g, '').toLowerCase();

/** Ranks foods by how well one serving fills what's still missing today. */
function smartScore(f: Food, left: Targets) {
  const s = f.defaultServingG / 100;
  const kcal = f.caloriesPer100g * s;
  if (left.calories > 0 && kcal > left.calories * 1.2) return -1;
  const need = (x: number) => Math.max(0, x);
  return (Math.min(f.proteinPer100g * s, need(left.protein)) * 3 + Math.min(f.carbsPer100g * s, need(left.carbs)) + Math.min(f.fatPer100g * s, need(left.fat)) * 1.5) / Math.max(60, kcal);
}

export function AddFoodSheet({ open, meal, date, foods, recent, totals, targets, onClose, onAdded }: { open: boolean; meal: string; date: string; foods: Food[]; recent: string[]; totals: Totals; targets: Targets | null; onClose: () => void; onAdded: () => void }) {
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('');
  const [tag, setTag] = useState('');
  const [sel, setSel] = useState<Food | null>(null);
  const close = () => { setSel(null); setQ(''); setCat(''); setTag(''); onClose(); };
  const left: Targets | null = targets && { calories: targets.calories - totals.c, protein: targets.protein - totals.p, carbs: targets.carbs - totals.cb, fat: targets.fat - totals.f };
  const list = foods.filter((f) => (!q || nq(f.name).includes(nq(q))) && (!cat || f.category === cat) && (!tag || f.tags.includes(tag)));
  const smart = useMemo(() => (left ? [...foods].map((f) => [f, smartScore(f, left)] as const).filter(([, s]) => s > 0).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([f]) => f) : []), [foods, left?.calories, left?.protein]); // eslint-disable-line react-hooks/exhaustive-deps
  const recentFoods = recent.map((id) => foods.find((f) => f.id === id)).filter(Boolean) as Food[];
  const cats = Object.keys(CAT_META).filter((c) => foods.some((f) => f.category === c));
  const browsing = !q && !cat && !tag;
  const m = MEAL_META[meal] ?? MEAL_META.snack;

  return (
    <Sheet open={open} onOpenChange={(o) => !o && close()}>
      <SheetContent side="bottom" dir="rtl" className="mx-auto flex h-[88dvh] max-w-2xl flex-col gap-0 rounded-t-[32px] border-white/10 bg-background/95 p-0 backdrop-blur-xl [&>button]:hidden">
        <div className="mx-auto mt-3 h-1.5 w-12 rounded-full bg-white/15" />
        <div className={cn('flex items-center gap-3 bg-gradient-to-b px-5 pb-4 pt-3', m.g)}>
          {sel ? <button onClick={() => setSel(null)} className="press grid h-10 w-10 place-items-center rounded-full bg-white/10" aria-label="بازگشت"><ArrowRight className="h-5 w-5" /></button> : <IconBadge icon={m.icon} tone={m.tone} />}
          <div className="min-w-0 flex-1"><SheetTitle className="truncate text-lg font-black">{sel ? sel.name : `افزودن به ${MEAL_LABELS[meal]}`}</SheetTitle>
            <p className="text-xs text-muted-foreground">{sel ? `${CAT_META[sel.category]?.label ?? ''} · ${faNum(sel.caloriesPer100g)} کالری در ۱۰۰ گرم` : left ? `${faNum(Math.max(0, Math.round(left.calories)))} کالری تا هدف امروز` : m.hint}</p></div>
          <button onClick={close} className="press grid h-10 w-10 place-items-center rounded-full bg-white/10" aria-label="بستن"><X className="h-5 w-5" /></button>
        </div>
        <AnimatePresence mode="wait" initial={false}>
          {sel ? (
            <motion.div key="d" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="flex-1 overflow-y-auto px-5 pb-6">
              <Portion food={sel} meal={meal} date={date} totals={totals} targets={targets} onDone={() => { setSel(null); onAdded(); }} />
            </motion.div>
          ) : (
            <motion.div key="l" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex flex-1 flex-col overflow-hidden">
              <div className="space-y-3 px-5 pt-1">
                <div className="relative"><Search className="absolute start-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                  <input autoFocus={false} value={q} onChange={(e) => setQ(e.target.value)} placeholder="چی خوردی؟ مثلاً مرغ، برنج، سیب…" className="h-12 w-full rounded-2xl border border-white/10 bg-white/[.05] pe-4 ps-12 text-base outline-none transition focus:border-primary focus:bg-white/[.07]" /></div>
                <div className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1 [scrollbar-width:none]">
                  {cats.map((c) => <button key={c} onClick={() => setCat(cat === c ? '' : c)} className={cn('press flex h-10 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-sm font-bold transition', cat === c ? 'border-primary bg-primary text-primary-foreground' : 'border-white/10 bg-white/[.04]')}><FoodIcon c={c} size={18} />{CAT_META[c].label}</button>)}
                </div>
                <div className="flex flex-wrap gap-1.5">{Object.entries(TAGS).map(([k, v]) => <button key={k} onClick={() => setTag(tag === k ? '' : k)} className={cn('rounded-full px-3 py-1 text-xs font-bold transition', tag === k ? 'bg-foreground text-background' : 'bg-white/[.05] text-muted-foreground')}>{v}</button>)}</div>
              </div>
              <div className="mt-3 flex-1 space-y-5 overflow-y-auto px-5 pb-8">
                {browsing && smart.length > 0 && <Section icon={<Sparkles className="h-4 w-4 text-primary" />} title="پیشنهاد هوشمند برای الان" sub="بر اساس کالری و پروتئینی که برای امروز مونده">
                  <div className="-mx-5 flex gap-2.5 overflow-x-auto px-5 pb-1 [scrollbar-width:none]">{smart.map((f) => <SmartCard key={f.id} f={f} onPick={() => setSel(f)} />)}</div></Section>}
                {browsing && recentFoods.length > 0 && <Section icon={<Clock className="h-4 w-4 text-muted-foreground" />} title="اخیراً خوردی">
                  <div className="flex flex-wrap gap-2">{recentFoods.map((f) => <button key={f.id} onClick={() => setSel(f)} className="press flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[.04] px-3 py-2 text-sm"><FoodIcon c={f.category} size={16} />{f.name}</button>)}</div></Section>}
                <Section title={browsing ? 'همه خوراکی‌ها' : `${faNum(list.length)} نتیجه`}>
                  <ul className="space-y-1.5">{list.map((f) => <FoodRow key={f.id} f={f} onPick={() => setSel(f)} />)}
                    {list.length === 0 && <li className="rounded-2xl border border-dashed border-white/10 p-8 text-center text-sm text-muted-foreground"><IcSearchFood className="mx-auto mb-2 text-muted-foreground" size={28} />چیزی پیدا نشد — یه اسم دیگه امتحان کن.</li>}</ul>
                </Section>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </SheetContent>
    </Sheet>
  );
}

const Section = ({ icon, title, sub, children }: { icon?: React.ReactNode; title: string; sub?: string; children: React.ReactNode }) => (
  <section><div className="mb-2 flex items-center gap-1.5 text-sm font-black">{icon}{title}</div>{sub && <p className="-mt-1.5 mb-2 text-[11px] text-muted-foreground">{sub}</p>}{children}</section>
);

function SmartCard({ f, onPick }: { f: Food; onPick: () => void }) {
  const s = f.defaultServingG / 100;
  return (
    <button onClick={onPick} className="press w-36 shrink-0 rounded-[22px] border border-primary/25 bg-gradient-to-b from-primary/15 to-transparent p-3 text-start">
      <div className="text-primary"><FoodIcon c={f.category} size={26} /></div>
      <div className="mt-1 truncate text-sm font-black">{f.name}</div>
      <div className="text-[10px] text-muted-foreground">{f.servingLabel}</div>
      <div className="mt-2 flex gap-2 text-[10px] font-bold"><span className="text-primary">{faNum(Math.round(f.caloriesPer100g * s))} kcal</span><span className="text-[hsl(var(--cyan))]">P {faNum(Math.round(f.proteinPer100g * s))}</span></div>
    </button>
  );
}

function FoodRow({ f, onPick }: { f: Food; onPick: () => void }) {
  const tot = f.proteinPer100g * 4 + f.carbsPer100g * 4 + f.fatPer100g * 9 || 1;
  return (
    <li><button onClick={onPick} className="press flex w-full items-center gap-3 rounded-2xl border border-transparent bg-white/[.03] p-3 text-start transition hover:border-white/10 hover:bg-white/[.06]">
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-white/[.06] text-primary"><FoodIcon c={f.category} /></span>
      <span className="min-w-0 flex-1"><span className="block truncate font-bold">{f.name}</span>
        <span className="mt-1.5 flex h-1.5 w-full max-w-[140px] overflow-hidden rounded-full bg-white/5" dir="ltr">
          <span style={{ width: `${(f.proteinPer100g * 4 / tot) * 100}%`, background: MACRO_COLORS.p }} /><span style={{ width: `${(f.carbsPer100g * 4 / tot) * 100}%`, background: MACRO_COLORS.cb }} /><span style={{ width: `${(f.fatPer100g * 9 / tot) * 100}%`, background: MACRO_COLORS.f }} />
        </span></span>
      <span className="text-end"><span className="block text-sm font-black">{faNum(f.caloriesPer100g)}</span><span className="text-[10px] text-muted-foreground">kcal/۱۰۰g</span></span>
    </button></li>
  );
}

function Portion({ food, meal, date, totals, targets, onDone }: { food: Food; meal: string; date: string; totals: Totals; targets: Targets | null; onDone: () => void }) {
  const [g, setG] = useState(food.defaultServingG);
  const [busy, setBusy] = useState(false);
  const k = g / 100;
  const v = { c: food.caloriesPer100g * k, p: food.proteinPer100g * k, cb: food.carbsPer100g * k, f: food.fatPer100g * k };
  const max = Math.max(500, food.defaultServingG * 4);
  const add = async () => {
    setBusy(true);
    try { await mealLog({ token: tok(), action: 'add', foodId: food.id, grams: g, meal: meal as 'snack', date }); toast.success(`${food.name} ثبت شد ✓`); onDone(); }
    catch (e) { toast.error(errMsg(e)); } finally { setBusy(false); }
  };
  return (
    <div className="space-y-5 pt-2">
      <div className="flex items-center gap-5">
        <Ring value={totals.c + v.c} max={targets?.calories ?? Math.max(1, v.c)} size={128} stroke={11}>
          <div><div className="text-3xl font-black">{faNum(Math.round(v.c))}</div><div className="text-[10px] text-muted-foreground">کالری</div></div>
        </Ring>
        <div className="flex-1 space-y-2.5">
          {([['پروتئین', v.p, MACRO_COLORS.p], ['کربوهیدرات', v.cb, MACRO_COLORS.cb], ['چربی', v.f, MACRO_COLORS.f]] as const).map(([l, x, c]) => (
            <div key={l} className="flex items-center gap-2 text-sm"><span className="h-2.5 w-2.5 rounded-full" style={{ background: c }} /><span className="flex-1 text-muted-foreground">{l}</span><b>{faNum(Math.round(x * 10) / 10)}g</b></div>
          ))}
          {targets && <p className="rounded-xl bg-white/[.04] p-2 text-[11px] leading-5 text-muted-foreground">بعد از ثبت: <b className="text-foreground">{faNum(Math.round(totals.c + v.c))}</b> از {faNum(targets.calories)} کالری امروز</p>}
        </div>
      </div>
      <div className="rounded-[24px] border border-white/[.07] bg-white/[.03] p-4">
        <div className="flex items-baseline justify-between"><span className="text-sm font-bold">مقدار</span><span className="text-2xl font-black text-primary">{faNum(g)}<span className="ms-1 text-xs text-muted-foreground">گرم</span></span></div>
        <input type="range" min={5} max={max} step={5} value={g} onChange={(e) => setG(Number(e.target.value))} className="mt-3 w-full accent-[hsl(var(--primary))]" aria-label="مقدار به گرم" />
        <div className="mt-3 grid grid-cols-4 gap-2">{[0.5, 1, 1.5, 2].map((m) => { const val = Math.round(food.defaultServingG * m); return (
          <button key={m} onClick={() => setG(val)} className={cn('press rounded-2xl py-2 text-xs font-bold transition', g === val ? 'bg-primary text-primary-foreground' : 'bg-white/[.06]')}>{m === 1 ? '۱ وعده' : `${faNum(m)}×`}<span className="block text-[10px] font-normal opacity-70">{faNum(val)}g</span></button>); })}</div>
        <p className="mt-3 text-[11px] text-muted-foreground">۱ وعده = {food.servingLabel} (≈{faNum(food.defaultServingG)} گرم) · منبع: {food.source}</p>
      </div>
      <Button className="h-14 w-full rounded-2xl text-base font-black shadow-[0_10px_30px_-10px_hsl(var(--primary)/.8)]" disabled={busy || g < 1} onClick={add}>{busy ? <Loader2 className="me-2 h-5 w-5 animate-spin" /> : <Check className="me-2 h-5 w-5" />}ثبت در {MEAL_LABELS[meal]}</Button>
    </div>
  );
}
