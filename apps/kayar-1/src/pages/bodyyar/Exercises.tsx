import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Search, Dumbbell, X, Home, Building2, Hand, SlidersHorizontal } from 'lucide-react';
import { listExercises } from 'zitejs/api';
import { ErrorState, PageHeader, EmptyState, faNum } from '../../components/bkit';
import { Skeleton } from '@project/components/ui/skeleton';
import { CATEGORY_LABELS, DIFFICULTY_LABELS, categoryImage } from '../../lib/assets';
import { useLoad } from '../../lib/useLoad';
import { cn } from '@project/components/lib/utils';

type Ex = Awaited<ReturnType<typeof listExercises>>['exercises'][0];
const LEVEL_DOTS: Record<string, number> = { beginner: 1, intermediate: 2, advanced: 3 };
const LOCS = [['all', 'همه جا', SlidersHorizontal], ['home', 'خانه', Home], ['gym', 'باشگاه', Building2]] as const;

function Card({ e, i }: { e: Ex; i: number }) {
  const img = e.frames[0] || categoryImage(e.category);
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i, 12) * 0.03 }}>
      <Link to={`/app/bodyyar/exercises/${e.slug}`} className="press group block overflow-hidden rounded-[26px] border border-border bg-card transition hover:border-primary/50">
        <div className="relative aspect-[4/3] overflow-hidden bg-secondary">
          {img ? <img src={img} alt="" loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" /> : <Dumbbell className="m-auto h-full w-8 text-muted-foreground" />}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
          <span className="absolute start-2.5 top-2.5 rounded-full bg-black/55 px-2.5 py-1 text-[10px] font-bold text-white backdrop-blur">{CATEGORY_LABELS[e.category]}</span>
          {e.bodyweight && <span className="absolute end-2.5 top-2.5 grid h-7 w-7 place-items-center rounded-full bg-primary text-primary-foreground" title="بدون وسیله"><Hand className="h-3.5 w-3.5" /></span>}
          <div className="absolute bottom-2.5 start-2.5 flex gap-1">{[1, 2, 3].map((d) => <span key={d} className={cn('h-1.5 w-4 rounded-full', d <= (LEVEL_DOTS[e.difficulty] ?? 1) ? 'bg-primary' : 'bg-white/30')} />)}</div>
        </div>
        <div className="p-3">
          <div className="truncate text-sm font-black">{e.name}</div>
          <div className="latin truncate text-[11px] text-muted-foreground" dir="ltr">{e.englishName}</div>
          <div className="mt-1.5 truncate text-[11px] text-muted-foreground">{DIFFICULTY_LABELS[e.difficulty]} · {e.equipment || 'وزن بدن'}</div>
        </div>
      </Link>
    </motion.div>
  );
}

export default function Exercises() {
  const { data, error, loading, reload } = useLoad(() => listExercises({}));
  const [q, setQ] = useState(''); const [cat, setCat] = useState('all'); const [diff, setDiff] = useState('all'); const [loc, setLoc] = useState('all'); const [bw, setBw] = useState(false);
  const all = data?.exercises ?? [];
  const counts = useMemo(() => all.reduce<Record<string, number>>((m, e) => ({ ...m, [e.category]: (m[e.category] ?? 0) + 1 }), {}), [all]);
  const list = useMemo(() => all.filter((e) =>
    (cat === 'all' || e.category === cat) && (diff === 'all' || e.difficulty === diff) &&
    (loc === 'all' || e.location === loc || e.location === 'both') && (!bw || e.bodyweight) &&
    (!q || `${e.name} ${e.englishName} ${e.muscles} ${e.equipment}`.toLowerCase().includes(q.toLowerCase()))), [all, q, cat, diff, loc, bw]);
  const filtered = cat !== 'all' || diff !== 'all' || loc !== 'all' || bw || !!q;
  const reset = () => { setQ(''); setCat('all'); setDiff('all'); setLoc('all'); setBw(false); };

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="کتابخانه حرکات" subtitle={data ? `${faNum(all.length)} حرکت با راهنمای تصویری و نکات ایمنی` : 'در حال بارگذاری…'} back="/app/bodyyar" />
      <div className="sticky top-0 z-10 -mx-4 bg-background/85 px-4 pb-3 pt-1 backdrop-blur-xl">
        <div className="relative"><Search className="absolute start-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="جستجوی حرکت، عضله یا وسیله…" className="h-12 w-full rounded-2xl border border-border bg-card pe-11 ps-11 text-base outline-none transition focus:border-primary" />
          {q && <button onClick={() => setQ('')} className="absolute end-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full text-muted-foreground" aria-label="پاک کردن"><X className="h-4 w-4" /></button>}
        </div>
        <div className="no-scrollbar -mx-4 mt-3 flex gap-2 overflow-x-auto px-4">
          {['all', ...Object.keys(CATEGORY_LABELS).filter((c) => counts[c])].map((c) => (
            <button key={c} onClick={() => setCat(c)} className={cn('flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-2 text-xs font-bold transition', cat === c ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-card text-muted-foreground')}>
              {c === 'all' ? 'همه' : CATEGORY_LABELS[c]}<span className={cn('rounded-full px-1.5 text-[10px]', cat === c ? 'bg-black/15' : 'bg-secondary')}>{faNum(c === 'all' ? all.length : counts[c])}</span>
            </button>
          ))}
        </div>
        <div className="no-scrollbar -mx-4 mt-2 flex gap-2 overflow-x-auto px-4">
          <div className="flex shrink-0 rounded-full border border-border bg-card p-0.5">{LOCS.map(([k, l, I]) => <button key={k} onClick={() => setLoc(k)} className={cn('flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-bold', loc === k ? 'bg-secondary text-foreground' : 'text-muted-foreground')}><I className="h-3.5 w-3.5" />{l}</button>)}</div>
          <div className="flex shrink-0 rounded-full border border-border bg-card p-0.5">{[['all', 'همه سطوح'], ...Object.entries(DIFFICULTY_LABELS)].map(([k, l]) => <button key={k} onClick={() => setDiff(k)} className={cn('rounded-full px-3 py-1.5 text-xs font-bold', diff === k ? 'bg-secondary text-foreground' : 'text-muted-foreground')}>{l}</button>)}</div>
          <button onClick={() => setBw(!bw)} className={cn('flex shrink-0 items-center gap-1 rounded-full border px-3 text-xs font-bold', bw ? 'border-primary bg-primary/15 text-primary' : 'border-border bg-card text-muted-foreground')}><Hand className="h-3.5 w-3.5" />بدون وسیله</button>
        </div>
      </div>
      {filtered && data && <div className="mb-3 flex items-center justify-between text-xs text-muted-foreground"><span>{faNum(list.length)} نتیجه</span><button onClick={reset} className="font-bold text-primary">پاک کردن فیلترها</button></div>}
      {loading ? <div className="grid grid-cols-2 gap-3 md:grid-cols-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="aspect-[4/5] rounded-[26px]" />)}</div>
        : error ? <ErrorState message={error} onRetry={reload} />
        : list.length === 0 ? <EmptyState icon={<Dumbbell />} title="حرکتی پیدا نشد" text="فیلترها را تغییر بده یا پاکشان کن." />
        : <div className="grid grid-cols-2 gap-3 md:grid-cols-3">{list.map((e, i) => <Card key={e.id} e={e} i={i} />)}</div>}
    </div>
  );
}
