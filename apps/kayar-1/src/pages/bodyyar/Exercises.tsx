import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Dumbbell } from 'lucide-react';
import { listExercises } from 'zitejs/api';
import { Input } from '@project/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@project/components/ui/select';
import { EmptyState, ErrorState, LoadingBlocks, PageHeader } from '../../components/bkit';
import { CATEGORY_LABELS, DIFFICULTY_LABELS, categoryImage } from '../../lib/assets';
import { useLoad } from '../../lib/useLoad';
import { cn } from '@project/components/lib/utils';

export default function Exercises() {
  const { data, error, loading, reload } = useLoad(() => listExercises({}));
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('all');
  const [diff, setDiff] = useState('all');
  const [loc, setLoc] = useState('all');
  const [bw, setBw] = useState(false);

  const list = useMemo(() => (data?.exercises ?? []).filter((e) =>
    (cat === 'all' || e.category === cat) && (diff === 'all' || e.difficulty === diff) &&
    (loc === 'all' || e.location === loc || e.location === 'both') && (!bw || e.bodyweight) &&
    (!q || `${e.name} ${e.englishName} ${e.muscles} ${e.equipment}`.toLowerCase().includes(q.toLowerCase()))), [data, q, cat, diff, loc, bw]);

  return (
    <div>
      <PageHeader title="کتابخانه حرکات" subtitle="جستجو و فیلتر بر اساس عضله، سطح و مکان" back="/app/bodyyar" />
      <div className="relative mb-3"><Search className="absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="جستجوی حرکت یا عضله…" className="h-12 rounded-2xl pe-4 ps-4 pr-11" /></div>
      <div className="no-scrollbar -mx-4 mb-3 flex gap-2 overflow-x-auto px-4 pb-1">
        {['all', ...Object.keys(CATEGORY_LABELS)].map((c) => (
          <button key={c} onClick={() => setCat(c)} className={cn('shrink-0 rounded-full px-4 py-2 text-sm', cat === c ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground')}>{c === 'all' ? 'همه' : CATEGORY_LABELS[c]}</button>
        ))}
      </div>
      <div className="mb-5 flex flex-wrap gap-2">
        <Select value={diff} onValueChange={setDiff}><SelectTrigger className="w-32 rounded-2xl"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">همه سطوح</SelectItem>{Object.entries(DIFFICULTY_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent></Select>
        <Select value={loc} onValueChange={setLoc}><SelectTrigger className="w-32 rounded-2xl"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">همه مکان‌ها</SelectItem><SelectItem value="home">خانه</SelectItem><SelectItem value="gym">باشگاه</SelectItem></SelectContent></Select>
        <button onClick={() => setBw(!bw)} className={cn('rounded-2xl border px-4 text-sm', bw ? 'border-primary bg-primary/15 text-primary' : 'border-border')}>بدون وسیله</button>
      </div>
      {loading ? <LoadingBlocks /> : error ? <ErrorState message={error} onRetry={reload} /> : list.length === 0 ? (
        <EmptyState icon={<Dumbbell />} title="حرکتی پیدا نشد" text="فیلترها را تغییر بده." />
      ) : (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          {list.map((e) => {
            const img = categoryImage(e.category);
            return (
              <Link key={e.id} to={`/app/bodyyar/exercises/${e.slug}`} className="group overflow-hidden rounded-[24px] border border-border bg-card transition hover:border-primary/50">
                <div className="aspect-[4/3] overflow-hidden bg-secondary">{img ? <img src={img} alt="" loading="lazy" className="h-full w-full object-cover transition group-hover:scale-105" /> : <Dumbbell className="m-auto h-full w-8 text-muted-foreground" />}</div>
                <div className="p-3">
                  <div className="truncate text-sm font-bold">{e.name}</div>
                  <div className="latin truncate text-[11px] text-muted-foreground">{e.englishName}</div>
                  <div className="mt-2 flex gap-1 text-[10px]"><span className="rounded-full bg-secondary px-2 py-0.5">{CATEGORY_LABELS[e.category]}</span><span className="rounded-full bg-secondary px-2 py-0.5">{DIFFICULTY_LABELS[e.difficulty]}</span></div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
