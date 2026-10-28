import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, ChevronLeft, ChevronRight, Pause, Play, Timer, Trophy, Loader2, X } from 'lucide-react';
import { getDashboard, listExercises, saveSession } from 'zitejs/api';
import { tok } from '../../lib/session';
import { Button } from '@project/components/ui/button';
import { Input } from '@project/components/ui/input';
import { Card, EmptyState, ErrorState, LoadingBlocks, errMsg, faNum } from '../../components/bkit';
import { categoryImage } from '../../lib/assets';
import { ExerciseMotion } from '../../components/ExerciseMotion';
import { useLoad } from '../../lib/useLoad';
import { cn } from '@project/components/lib/utils';

const fmtTime = (s: number) => { const t = Math.max(0, Math.floor(s)); const h = Math.floor(t / 3600), m = Math.floor((t % 3600) / 60), x = t % 60; const p = (n: number) => String(n).padStart(2, '0'); return h ? `${h}:${p(m)}:${p(x)}` : `${m}:${p(x)}`; };

function RestOverlay({ rest, total, onAdd, onSkip }: { rest: number; total: number; onAdd: () => void; onSkip: () => void }) {
  const r = 70, c = 2 * Math.PI * r, p = Math.min(1, rest / Math.max(total, rest, 1));
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 grid place-items-center bg-background/90 p-6 backdrop-blur-xl">
      <div className="text-center">
        <p className="font-latin text-xs font-bold tracking-[.3em] text-primary">REST</p>
        <div className="relative mx-auto mt-4 h-48 w-48">
          <svg viewBox="0 0 160 160" className="h-full w-full -rotate-90"><circle cx="80" cy="80" r={r} className="fill-none stroke-secondary" strokeWidth="10" />
            <circle cx="80" cy="80" r={r} className="fill-none stroke-primary transition-[stroke-dashoffset] duration-1000 ease-linear" strokeWidth="10" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - p)} /></svg>
          <div className="absolute inset-0 grid place-items-center"><span className="latin text-5xl font-black tabular-nums">{fmtTime(rest)}</span></div>
        </div>
        <p className="mt-4 text-sm text-muted-foreground">نفس عمیق بکش، ست بعدی نزدیکه.</p>
        <div className="mt-6 flex gap-3">
          <Button variant="outline" className="h-12 flex-1 rounded-2xl" onClick={onAdd}>+۱۵ ثانیه</Button>
          <Button className="h-12 flex-1 rounded-2xl font-black" onClick={onSkip}>بزن بریم</Button>
        </div>
      </div>
    </motion.div>
  );
}

type SetRow = { reps: string; kg: string; done: boolean };

export default function Session() {
  const { day } = useParams();
  const nav = useNavigate();
  const dayIdx = Number(day ?? 0);
  const { data, error, loading, reload } = useLoad(() => Promise.all([getDashboard({ token: tok(), }), listExercises({})]));
  const plan = data?.[0].plan;
  const pday = plan?.plan.days[dayIdx];
  const catalog = useMemo(() => new Map((data?.[1].exercises ?? []).map((e) => [e.slug, e])), [data]);
  const storeKey = plan ? `kayar.session.${plan.id}.${dayIdx}` : '';

  const [idx, setIdx] = useState(0);
  const [rows, setRows] = useState<SetRow[][]>([]);
  const [elapsed, setElapsed] = useState(0);
  const [paused, setPaused] = useState(false);
  const [rest, setRest] = useState(0);
  const [phase, setPhase] = useState<'run' | 'summary'>('run');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const meta = useRef<{ key: string; startedAt: string } | null>(null);

  // init / restore in-progress session (survives reloads and network drops)
  useEffect(() => {
    if (!pday || rows.length) return;
    const saved = storeKey ? JSON.parse(localStorage.getItem(storeKey) ?? 'null') : null;
    if (saved?.rows) { setRows(saved.rows); setElapsed(saved.elapsed); setIdx(saved.idx); meta.current = saved.meta; return; }
    setRows(pday.exercises.map((x) => Array.from({ length: x.sets }, () => ({ reps: (x.reps.match(/\d+/)?.[0]) ?? '', kg: '', done: false }))));
    meta.current = { key: crypto.randomUUID(), startedAt: new Date().toISOString() };
  }, [pday, rows.length, storeKey]);

  useEffect(() => {
    if (storeKey && rows.length && phase === 'run') localStorage.setItem(storeKey, JSON.stringify({ rows, elapsed, idx, meta: meta.current }));
  }, [rows, elapsed, idx, storeKey, phase]);

  useEffect(() => {
    if (paused || phase !== 'run') return;
    const t = setInterval(() => { setElapsed((e) => e + 1); setRest((r) => (r > 0 ? r - 1 : 0)); }, 1000);
    return () => clearInterval(t);
  }, [paused, phase]);

  useEffect(() => { if (rest === 1 && 'vibrate' in navigator) navigator.vibrate?.(200); }, [rest]);

  if (loading) return <LoadingBlocks />;
  if (error) return <ErrorState message={error} onRetry={reload} />;
  if (!pday) return <EmptyState icon={<Timer />} title="جلسه پیدا نشد" text="ابتدا یک برنامه تمرینی بساز." action={<Button asChild><Link to="/app/bodyyar/plan">برنامه</Link></Button>} />;
  if (!rows.length) return <LoadingBlocks count={1} />;

  const ex = pday.exercises[idx];
  const info = catalog.get(ex.slug);
  const img = categoryImage(info?.category);
  const totalSets = rows.flat().length;
  const doneSets = rows.flat().filter((r) => r.done).length;
  const update = (s: number, patch: Partial<SetRow>) => setRows((all) => all.map((r, i) => (i === idx ? r.map((x, j) => (j === s ? { ...x, ...patch } : x)) : r)));
  const completeSet = (s: number) => {
    const done = !rows[idx][s].done;
    update(s, { done });
    if (done) setRest(ex.restSec);
  };

  const finish = async () => {
    if (saving || saved || !meta.current) return;
    setSaving(true);
    const sets = rows.flatMap((r, i) => r.map((x, j) => ({ x, i, j }))).filter(({ x }) => x.done).map(({ x, i, j }) => ({
      slug: pday.exercises[i].slug, name: pday.exercises[i].name, set: j + 1,
      reps: Math.min(200, Math.max(0, parseInt(x.reps) || 0)), weightKg: x.kg ? Math.min(500, Math.max(0, Number(x.kg) || 0)) : null,
    }));
    try {
      // same clientKey on retry → server never stores duplicates
      await saveSession({ token: tok(),  clientKey: meta.current.key, title: pday.name, startedAt: meta.current.startedAt, durationSec: elapsed, sets });
      setSaved(true);
      localStorage.removeItem(storeKey);
      toast.success('تمرین ذخیره شد. آفرین!');
    } catch (e) { toast.error(`${errMsg(e)} — اطلاعات محفوظ است، دوباره امتحان کن.`); } finally { setSaving(false); }
  };

  if (phase === 'summary') {
    const vol = rows.flatMap((r) => r).filter((r) => r.done).reduce((a, r) => a + (parseInt(r.reps) || 0) * (Number(r.kg) || 0), 0);
    return (
      <motion.div initial={{ scale: 0.96, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="mx-auto max-w-md text-center">
        <div className="mx-auto mt-6 grid h-20 w-20 place-items-center rounded-full bg-primary text-primary-foreground glow"><Trophy className="h-9 w-9" /></div>
        <h1 className="mt-5 text-2xl font-black">عالی بود!</h1>
        <p className="text-sm text-muted-foreground">{pday.name}</p>
        <div className="mt-6 grid grid-cols-3 gap-3">
          <Card className="p-4"><div className="latin text-xl font-bold">{fmtTime(elapsed)}</div><div className="text-xs text-muted-foreground">مدت</div></Card>
          <Card className="p-4"><div className="latin text-xl font-bold">{faNum(doneSets)}</div><div className="text-xs text-muted-foreground">ست</div></Card>
          <Card className="p-4"><div className="latin text-xl font-bold">{faNum(Math.round(vol))}</div><div className="text-xs text-muted-foreground">حجم kg</div></Card>
        </div>
        {saved ? (
          <Button className="mt-8 w-full rounded-2xl" onClick={() => nav('/app/bodyyar')}>بازگشت به داشبورد</Button>
        ) : (
          <div className="mt-8 space-y-3">
            <Button className="w-full rounded-2xl" onClick={finish} disabled={saving || doneSets === 0}>{saving && <Loader2 className="me-2 h-4 w-4 animate-spin" />}ذخیره جلسه</Button>
            {doneSets === 0 && <p className="text-xs text-destructive">هیچ ستی تیک نخورده است.</p>}
            <Button variant="ghost" className="w-full" onClick={() => setPhase('run')}>ادامه تمرین</Button>
          </div>
        )}
      </motion.div>
    );
  }

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <div className="flex items-center justify-between">
        <Button size="icon" variant="ghost" onClick={() => nav('/app/bodyyar')} aria-label="خروج"><X /></Button>
        <div className="text-center"><div className="latin text-2xl font-black tabular-nums">{fmtTime(elapsed)}</div><div className="text-[11px] text-muted-foreground">{faNum(doneSets)} از {faNum(totalSets)} ست</div></div>
        <Button size="icon" variant="secondary" onClick={() => setPaused((p) => !p)} aria-label={paused ? 'ادامه' : 'توقف'}>{paused ? <Play className="h-4 w-4 -scale-x-100" /> : <Pause className="h-4 w-4" />}</Button>
      </div>
      {paused && <div className="rounded-2xl bg-accent/20 p-3 text-center text-sm">جلسه متوقف شده است</div>}

      <div className="flex gap-1">
        {pday.exercises.map((_, k) => { const d = rows[k]?.every((r) => r.done); return (
          <button key={k} onClick={() => setIdx(k)} aria-label={`حرکت ${k + 1}`} className={cn('h-1.5 flex-1 rounded-full transition', k === idx ? 'bg-primary' : d ? 'bg-primary/50' : 'bg-secondary')} />); })}
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={idx} initial={{ opacity: 0, x: -24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 24 }} transition={{ duration: 0.25 }}>
          <div className="relative overflow-hidden rounded-[32px] border border-border">
            {info?.frames?.length ? <ExerciseMotion frames={info.frames} alt={ex.name} className="aspect-[4/3] w-full" />
              : img ? <img src={img} alt={ex.name} className="aspect-[4/3] w-full object-cover" /> : <div className="aspect-[4/3] w-full bg-secondary" />}
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/70 to-transparent p-5 pt-16">
              <div className="font-latin text-[11px] font-bold tracking-widest text-primary">{String(idx + 1).padStart(2, '0')} / {String(pday.exercises.length).padStart(2, '0')}</div>
              <h2 className="text-2xl font-black text-white">{ex.name}</h2>
              <div className="mt-1 flex flex-wrap gap-1.5 text-[11px]">
                <span className="latin rounded-lg bg-primary px-2 py-0.5 font-bold text-primary-foreground">{ex.sets} × {ex.reps}</span>
                <span className="rounded-lg bg-white/15 px-2 py-0.5 text-white/90 backdrop-blur">استراحت {faNum(ex.restSec)}″</span>
                {info?.muscles && <span className="rounded-lg bg-white/15 px-2 py-0.5 text-white/90 backdrop-blur">{info.muscles}</span>}
              </div>
            </div>
          </div>
          {info?.instructions && <details className="mt-3 rounded-2xl border border-border bg-card p-4 text-sm"><summary className="cursor-pointer font-bold">روش اجرا</summary><p className="mt-2 whitespace-pre-line leading-7 text-muted-foreground">{info.instructions}</p>{info.safety && <p className="mt-2 text-xs text-gold">{info.safety}</p>}</details>}
        </motion.div>
      </AnimatePresence>

      <AnimatePresence>
        {rest > 0 && <RestOverlay rest={rest} total={ex.restSec} onAdd={() => setRest((r) => r + 15)} onSkip={() => setRest(0)} />}
      </AnimatePresence>

      <Card className="space-y-2 p-4">
        <div className="grid grid-cols-[2rem_1fr_1fr_3rem] gap-2 px-1 text-xs text-muted-foreground"><span>ست</span><span>تکرار</span><span>وزنه (kg)</span><span /></div>
        {rows[idx].map((r, s) => (
          <div key={s} className={cn('grid grid-cols-[2rem_1fr_1fr_3rem] items-center gap-2 rounded-2xl p-1', r.done && 'bg-primary/10')}>
            <span className="latin text-center text-sm">{s + 1}</span>
            <Input inputMode="numeric" value={r.reps} onChange={(e) => update(s, { reps: e.target.value.replace(/\D/g, '').slice(0, 3) })} className="latin h-11 rounded-xl text-center" aria-label={`تکرار ست ${s + 1}`} />
            <Input inputMode="decimal" value={r.kg} placeholder={info?.bodyweight ? 'بدن' : '—'} onChange={(e) => update(s, { kg: e.target.value.replace(/[^\d.]/g, '').slice(0, 5) })} className="latin h-11 rounded-xl text-center" aria-label={`وزنه ست ${s + 1}`} />
            <button onClick={() => completeSet(s)} aria-label={`تکمیل ست ${s + 1}`} className={cn('grid h-11 w-11 place-items-center rounded-xl border transition', r.done ? 'border-primary bg-primary text-primary-foreground' : 'border-border')}><Check className="h-5 w-5" /></button>
          </div>
        ))}
        <Button variant="ghost" size="sm" onClick={() => setRows((all) => all.map((r, i) => (i === idx ? [...r, { reps: r.at(-1)?.reps ?? '', kg: r.at(-1)?.kg ?? '', done: false }] : r)))}>+ افزودن ست</Button>
      </Card>

      <div className="flex gap-3">
        <Button variant="outline" className="h-12 flex-1 rounded-2xl" disabled={idx === 0} onClick={() => setIdx(idx - 1)}><ChevronRight className="me-1 h-4 w-4" />قبلی</Button>
        {idx < pday.exercises.length - 1
          ? <Button className="h-12 flex-1 rounded-2xl" onClick={() => setIdx(idx + 1)}>بعدی<ChevronLeft className="ms-1 h-4 w-4" /></Button>
          : <Button className="h-12 flex-1 rounded-2xl glow" onClick={() => { setPhase('summary'); setPaused(true); }}>پایان تمرین</Button>}
      </div>
    </div>
  );
}
