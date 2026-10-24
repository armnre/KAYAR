import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, Sparkles, Play, ShieldAlert, Clock, ArrowRight, Flame, Layers, ChevronLeft } from 'lucide-react';
import { getDashboard, generatePlan, listExercises } from 'zitejs/api';
import { tok } from '../../lib/session';
import { Button } from '@project/components/ui/button';
import { EmptyState, ErrorState, LoadingBlocks, errMsg, faNum } from '../../components/bkit';
import { ExerciseMotion } from '../../components/ExerciseMotion';
import { useLoad } from '../../lib/useLoad';
import { cn } from '@project/components/lib/utils';

export default function PlanPage() {
  const { data, error, loading, reload, setData } = useLoad(() => Promise.all([getDashboard({ token: tok() }), listExercises({})]));
  const [busy, setBusy] = useState(false);
  const [sel, setSel] = useState(0);
  const dash = data?.[0];
  const catalog = useMemo(() => new Map((data?.[1].exercises ?? []).map((e) => [e.slug, e])), [data]);
  useEffect(() => { if (dash) setSel(dash.nextDayIndex); }, [dash?.nextDayIndex]); // eslint-disable-line react-hooks/exhaustive-deps

  const generate = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const r = await generatePlan({ token: tok() });
      setData((d) => (d ? [{ ...d[0], plan: { id: r.id, plan: r.plan, created: new Date().toISOString() }, nutritionPlan: r.nutrition ?? d[0].nutritionPlan, nextDayIndex: 0 }, d[1]] : d));
      setSel(0);
      toast.success('برنامه جدید آماده شد');
    } catch (e) { toast.error(errMsg(e)); } finally { setBusy(false); }
  };

  if (loading) return <LoadingBlocks />;
  if (error || !dash) return <ErrorState message={error ?? 'خطا'} onRetry={reload} />;
  if (!dash.profile) return <EmptyState icon={<Sparkles />} title="اول پروفایل" text="برای ساخت برنامه، پروفایل بدن‌یار را کامل کن." action={<Button asChild><Link to="/app/bodyyar/profile">ساخت پروفایل</Link></Button>} />;

  const plan = dash.plan?.plan;
  const day = plan?.days[sel];
  const totalSets = day?.exercises.reduce((a, x) => a + x.sets, 0) ?? 0;
  const estMin = day ? Math.round(day.exercises.reduce((a, x) => a + x.sets * (45 + x.restSec), 0) / 60) : 0;

  return (
    <div className="mx-auto max-w-xl space-y-5 pb-28">
      <div className="flex items-center justify-between">
        <Link to="/app/bodyyar" className="press grid h-11 w-11 place-items-center rounded-2xl border border-border bg-card" aria-label="بازگشت"><ArrowRight className="h-5 w-5" /></Link>
        <div className="text-center"><p className="font-latin text-[10px] font-bold tracking-[.3em] text-primary">TRAINING PLAN</p><h1 className="text-lg font-black">برنامه تمرینی</h1></div>
        <button onClick={generate} disabled={busy} className="press grid h-11 w-11 place-items-center rounded-2xl border border-border bg-card text-primary disabled:opacity-50" aria-label="ساخت دوباره">
          {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Sparkles className="h-5 w-5" />}
        </button>
      </div>

      {busy && <GeneratingCard />}
      {!plan && !busy && (
        <div className="relative overflow-hidden rounded-[32px] border border-primary/30 bg-gradient-to-br from-primary/15 via-card to-card p-7 text-center">
          <Sparkles className="mx-auto h-10 w-10 text-primary" />
          <h2 className="mt-3 text-xl font-black">برنامه اختصاصی‌ات را بساز</h2>
          <p className="mt-1 text-sm text-muted-foreground">مربی هوشمند بر اساس هدف و امکاناتت، برنامه هفتگی می‌چیند.</p>
          <Button onClick={generate} className="glow mt-5 h-12 rounded-2xl px-8 font-black">ساخت برنامه</Button>
        </div>
      )}

      {plan && day && !busy && (
        <>
          {plan.title && <p className="text-center text-sm text-muted-foreground">{plan.title}</p>}
          <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
            {plan.days.map((d, i) => (
              <button key={i} onClick={() => setSel(i)} className={cn('press relative flex min-w-[72px] shrink-0 flex-col items-center rounded-2xl border px-3 py-2.5 transition',
                sel === i ? 'border-primary bg-primary text-primary-foreground shadow-[0_8px_28px_-8px_hsl(var(--primary)/.7)]' : 'border-border bg-card text-muted-foreground')}>
                <span className="text-[10px] font-bold opacity-80">روز</span>
                <span className="font-latin text-xl font-black leading-none">{i + 1}</span>
                {i === dash.nextDayIndex && <span className={cn('absolute -top-1 end-1 h-2.5 w-2.5 rounded-full ring-2 ring-background', sel === i ? 'bg-foreground' : 'bg-primary')} />}
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            <motion.div key={sel} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.22 }} className="space-y-4">
              <div className="relative overflow-hidden rounded-[32px] border border-border bg-gradient-to-br from-card via-card to-primary/10 p-5">
                <div className="pointer-events-none absolute -end-10 -top-10 h-40 w-40 rounded-full bg-primary/20 blur-3xl" />
                {sel === dash.nextDayIndex && <span className="rounded-full bg-primary/15 px-2.5 py-1 text-[11px] font-bold text-primary">جلسه بعدی تو</span>}
                <h2 className="mt-2 text-2xl font-black">{day.name}</h2>
                <p className="text-sm text-muted-foreground">{day.focus}</p>
                <div className="mt-4 grid grid-cols-3 gap-2">
                  {[[Layers, faNum(day.exercises.length), 'حرکت'], [Flame, faNum(totalSets), 'ست'], [Clock, `~${faNum(estMin)}`, 'دقیقه']].map(([I, v, l], k) => { const Icon = I as typeof Clock; return (
                    <div key={k} className="rounded-2xl bg-background/60 p-3 text-center backdrop-blur"><Icon className="mx-auto h-4 w-4 text-primary" /><div className="mt-1 text-lg font-black">{v as string}</div><div className="text-[11px] text-muted-foreground">{l as string}</div></div>); })}
                </div>
              </div>

              <ul className="space-y-3">
                {day.exercises.map((x, j) => { const info = catalog.get(x.slug); return (
                  <motion.li key={j} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: j * 0.05 }}>
                    <Link to={`/app/bodyyar/exercises/${x.slug}`} className="press flex items-center gap-3 rounded-3xl border border-border bg-card p-2.5 pe-3 transition hover:border-primary/40">
                      <ExerciseMotion frames={info?.frames} alt={x.name} badge={false} className="h-20 w-20 shrink-0 rounded-2xl" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2"><span className="font-latin text-[11px] font-bold text-primary">{String(j + 1).padStart(2, '0')}</span><span className="truncate font-bold">{x.name}</span></div>
                        {info?.muscles && <p className="truncate text-xs text-muted-foreground">{info.muscles}</p>}
                        <div className="mt-1.5 flex gap-1.5 text-[11px]">
                          <span className="latin rounded-lg bg-primary/15 px-2 py-0.5 font-bold text-primary">{x.sets} × {x.reps}</span>
                          <span className="flex items-center gap-1 rounded-lg bg-secondary px-2 py-0.5 text-muted-foreground"><Clock className="h-3 w-3" />{faNum(x.restSec)}″</span>
                        </div>
                      </div>
                      <ChevronLeft className="h-4 w-4 shrink-0 text-muted-foreground" />
                    </Link>
                  </motion.li>); })}
              </ul>
            </motion.div>
          </AnimatePresence>

          <Link to="/app/bodyyar/nutrition" className="press flex items-center gap-3 rounded-3xl border border-primary/30 bg-primary/10 p-4">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-primary text-primary-foreground"><Flame className="h-5 w-5" /></span>
            <span className="flex-1 text-sm"><b>برنامه غذایی هماهنگ با این تمرین</b><span className="block text-xs text-muted-foreground">{dash.nutritionPlan ? `روز تمرین ${faNum(dash.nutritionPlan.targets.training.calories)} · استراحت ${faNum(dash.nutritionPlan.targets.rest.calories)} کالری` : 'با ساخت دوباره برنامه، رژیم هم ساخته می‌شود'}</span></span>
            <ChevronLeft className="h-4 w-4 text-muted-foreground" />
          </Link>

          {plan.notes.length > 0 && (
            <div className="rounded-3xl border border-border bg-card p-4">
              <div className="mb-2 flex items-center gap-2 text-sm font-bold"><ShieldAlert className="h-4 w-4 text-gold" />نکات و ایمنی</div>
              <ul className="list-disc space-y-1 ps-5 text-xs leading-6 text-muted-foreground">{plan.notes.map((n, i) => <li key={i}>{n}</li>)}</ul>
            </div>
          )}
          <p className="text-center text-[11px] text-muted-foreground">ساخته‌شده با هوش مصنوعی از کتابخانه حرکات؛ جایگزین نظر پزشک نیست.</p>

          <div className="fixed inset-x-0 bottom-[calc(var(--nav-h)+var(--safe-b)+12px)] z-30 mx-auto max-w-xl px-4">
            <Button asChild className="glow h-14 w-full rounded-2xl text-base font-black">
              <Link to={`/app/bodyyar/session/${sel}`}><Play className="me-2 h-5 w-5 -scale-x-100 fill-current" />شروع تمرین روز {faNum(sel + 1)}</Link>
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

function GeneratingCard() {
  return (
    <div className="relative overflow-hidden rounded-[32px] border border-primary/30 bg-card p-6 text-center">
      <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-primary/15 animate-pulse-glow"><Sparkles className="h-7 w-7 text-primary" /></div>
      <h3 className="mt-4 font-black">مربی در حال طراحی برنامه‌ات است</h3>
      <p className="mt-1 text-sm text-muted-foreground">انتخاب حرکات، ست‌ها و استراحت… (تا یک دقیقه)</p>
      <div className="mx-auto mt-4 h-1.5 w-40 overflow-hidden rounded-full bg-secondary"><div className="skeleton h-full w-full" /></div>
    </div>
  );
}
