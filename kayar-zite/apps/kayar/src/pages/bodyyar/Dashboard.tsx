import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Play, Apple, LineChart, Bot, BookOpen, Sparkles, CheckCircle2, Target, Flame, Timer, Scale, TrendingDown, ChevronLeft, Settings2 } from 'lucide-react';
import { getDashboard } from 'zitejs/api';
import { tok } from '../../lib/session';
import { Button } from '@project/components/ui/button';
import { EmptyState, ErrorState, LoadingBlocks, faNum, faDate } from '../../components/bkit';
import { useLoad } from '../../lib/useLoad';
import { ASSETS } from '../../lib/assets';

const QUICK = [
  { to: '/app/bodyyar/coach', label: 'مربی AI', sub: 'هر سوالی داری بپرس', icon: Bot },
  { to: '/app/bodyyar/exercises', label: 'حرکات', sub: 'آموزش تصویری', icon: BookOpen },
  { to: '/app/bodyyar/nutrition', label: 'تغذیه', sub: 'رژیم و وعده‌ها', icon: Apple },
  { to: '/app/bodyyar/progress', label: 'پیشرفت', sub: 'وزن و نمودار', icon: LineChart },
];
const up = (i: number) => ({ initial: { opacity: 0, y: 14 }, animate: { opacity: 1, y: 0 }, transition: { delay: i * 0.06, duration: 0.4 } });

function Ring({ value, max }: { value: number; max: number }) {
  const r = 34, c = 2 * Math.PI * r, p = Math.min(1, value / Math.max(1, max));
  return (
    <div className="relative h-24 w-24 shrink-0">
      <svg viewBox="0 0 80 80" className="h-full w-full -rotate-90"><circle cx="40" cy="40" r={r} className="fill-none stroke-white/10" strokeWidth="7" />
        <motion.circle cx="40" cy="40" r={r} className="fill-none stroke-primary" strokeWidth="7" strokeLinecap="round" strokeDasharray={c} initial={{ strokeDashoffset: c }} animate={{ strokeDashoffset: c * (1 - p) }} transition={{ duration: 1.1, ease: 'easeOut' }} /></svg>
      <div className="absolute inset-0 grid place-items-center text-center leading-none"><div><div className="text-2xl font-black">{faNum(value)}</div><div className="mt-1 text-[10px] text-muted-foreground">از {faNum(max)}</div></div></div>
    </div>
  );
}

export default function Dashboard() {
  const { data, error, loading, reload } = useLoad(() => getDashboard({ token: tok() }));
  if (loading) return <LoadingBlocks count={4} />;
  if (error || !data) return <ErrorState message={error ?? 'خطا'} onRetry={reload} />;

  if (!data.profile) {
    return (
      <div className="mx-auto max-w-xl space-y-5">
        <motion.div {...up(0)} className="relative overflow-hidden rounded-[36px] border border-border">
          <img src={ASSETS.hero} alt="" className="absolute inset-0 h-full w-full object-cover opacity-50" />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/70 to-transparent" />
          <div className="relative flex min-h-[340px] flex-col justify-end p-7">
            <p className="font-latin text-[11px] font-bold tracking-[.3em] text-primary">BODYYAR</p>
            <h1 className="mt-2 text-3xl font-black">مربی شخصی‌ات<br />همیشه همراهته</h1>
            <p className="mt-2 max-w-sm text-sm text-muted-foreground">هدف، سطح و امکاناتت رو بگو؛ برنامه تمرینی و تغذیه مخصوص خودت ساخته می‌شه.</p>
            <Button asChild className="glow mt-6 h-13 rounded-2xl py-3.5 text-base font-black"><Link to="/app/bodyyar/profile"><Sparkles className="me-2 h-5 w-5" />شروع کن</Link></Button>
          </div>
        </motion.div>
        <QuickActions />
      </div>
    );
  }

  const day = data.plan?.plan.days[data.nextDayIndex];
  const lastW = data.weights.at(-1);
  const firstW = data.weights[0];
  const delta = lastW && firstW && data.weights.length > 1 ? Math.round((lastW.weightKg - firstW.weightKg) * 10) / 10 : null;
  const n = data.nutrition;
  const t = data.targets;
  const goalDays = data.profile.daysPerWeek;
  const hour = new Date().getHours();
  const hello = hour < 12 ? 'صبح بخیر' : hour < 18 ? 'روز بخیر' : 'عصر بخیر';
  return (
    <div className="mx-auto max-w-xl space-y-4">
      <motion.div {...up(0)} className="relative overflow-hidden rounded-[32px] border border-border bg-card p-5">
        <div className="pointer-events-none absolute -end-16 -top-16 h-48 w-48 rounded-full bg-primary/15 blur-3xl" />
        <div className="relative flex items-start justify-between">
          <div><p className="font-latin text-[10px] font-bold tracking-[.3em] text-primary">BODYYAR</p><h1 className="mt-1 text-2xl font-black">{hello} 👋</h1><p className="mt-0.5 text-sm text-muted-foreground">هدف: <b className="text-foreground">{data.profile.goal}</b></p></div>
          <Link to="/app/bodyyar/profile" className="press grid h-10 w-10 place-items-center rounded-2xl border border-border bg-background/60" aria-label="ویرایش پروفایل"><Settings2 className="h-4.5 w-4.5" /></Link>
        </div>
        <div className="relative mt-5 flex items-center gap-4">
          <Ring value={data.weekSessions} max={goalDays} />
          <div className="min-w-0 flex-1">
            <div className="text-xs font-bold text-muted-foreground">پیشرفت این هفته</div>
            <div className="mt-2 flex gap-1.5">{Array.from({ length: goalDays }).map((_, i) => <motion.span key={i} initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ delay: 0.2 + i * 0.08 }} className={`h-2 flex-1 origin-right rounded-full ${i < data.weekSessions ? 'bg-primary' : 'bg-secondary'}`} />)}</div>
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
              <span className="flex items-center gap-1.5 rounded-xl bg-secondary/70 px-2.5 py-2"><Timer className="h-3.5 w-3.5 text-primary" /><b>{faNum(data.weekMinutes)}</b> دقیقه</span>
              <span className="flex items-center gap-1.5 rounded-xl bg-secondary/70 px-2.5 py-2"><Flame className="h-3.5 w-3.5 text-primary" /><b>{faNum(data.weekSessions)}</b> جلسه</span>
            </div>
          </div>
        </div>
      </motion.div>

      {data.plan && day ? (
        <motion.div {...up(1)}>
          <div className="relative overflow-hidden rounded-[32px] bg-primary p-6 text-primary-foreground shadow-[0_20px_50px_-15px_hsl(var(--primary)/.6)]">
            <div className="pointer-events-none absolute -bottom-16 -start-10 h-48 w-48 rounded-full bg-white/30 blur-3xl" />
            <div className="pointer-events-none absolute end-5 top-4 font-latin text-7xl font-black leading-none opacity-15">{String(data.nextDayIndex + 1).padStart(2, '0')}</div>
            <div className="relative">
              <span className="rounded-full bg-black/10 px-2.5 py-1 text-[11px] font-bold">تمرین امروز · روز {faNum(data.nextDayIndex + 1)} از {faNum(data.plan.plan.days.length)}</span>
              <h2 className="mt-3 text-2xl font-black leading-tight">{day.name}</h2>
              <p className="mt-1 text-sm opacity-75">{day.focus}</p>
              <div className="mt-3 flex flex-wrap gap-1.5">{day.exercises.slice(0, 4).map((x) => <span key={x.slug} className="rounded-full bg-black/10 px-2.5 py-1 text-[11px] font-bold">{x.name}</span>)}{day.exercises.length > 4 && <span className="rounded-full bg-black/10 px-2.5 py-1 text-[11px] font-bold">+{faNum(day.exercises.length - 4)}</span>}</div>
              <div className="mt-5 flex items-center justify-between">
                <Link to={`/app/bodyyar/session/${data.nextDayIndex}`} className="press flex items-center gap-2 rounded-full bg-primary-foreground px-6 py-3.5 text-sm font-black text-primary"><Play className="h-4 w-4 -scale-x-100 fill-current" />شروع تمرین</Link>
                <Link to="/app/bodyyar/plan" className="flex items-center gap-1 text-sm font-bold opacity-80">کل برنامه<ChevronLeft className="h-4 w-4" /></Link>
              </div>
            </div>
          </div>
        </motion.div>
      ) : (
        <motion.div {...up(1)}><EmptyState icon={<Target />} title="هنوز برنامه‌ای نداری" text="مربی هوشمند در کمتر از یک دقیقه برنامه تمرین و رژیم اختصاصی‌ات را می‌سازد." action={<Button asChild className="glow rounded-2xl font-black"><Link to="/app/bodyyar/plan"><Sparkles className="me-2 h-4 w-4" />ساخت برنامه</Link></Button>} /></motion.div>
      )}

      <motion.div {...up(2)}><QuickActions /></motion.div>

      <motion.div {...up(3)}>
        <Link to="/app/bodyyar/nutrition" className="press block rounded-[28px] border border-border bg-card p-5">
          <div className="flex items-center justify-between">
            <div><h3 className="font-black">تغذیه امروز</h3>{t && <p className="text-xs text-muted-foreground">{data.trainedToday ? 'روز تمرین' : 'روز استراحت'} · هدف {faNum(t.calories)} kcal</p>}</div>
            <span className="flex items-center gap-0.5 rounded-full bg-primary/10 px-3 py-1.5 text-xs font-bold text-primary">{n.entries ? 'جزئیات' : 'ثبت وعده'}<ChevronLeft className="h-3.5 w-3.5" /></span>
          </div>
          <div className="mt-4 space-y-2.5">
            {([['کالری', n.calories, t?.calories, 'kcal'], ['پروتئین', n.protein, t?.protein, 'g'], ['کربوهیدرات', n.carbs, t?.carbs, 'g'], ['چربی', n.fat, t?.fat, 'g']] as const).map(([l, v, goal, u], k) => (
              <div key={l}>
                <div className="flex justify-between text-xs"><span className={k === 0 ? 'font-bold' : 'text-muted-foreground'}>{l}</span><span><b>{faNum(Math.round(v))}</b>{goal ? <span className="text-muted-foreground"> / {faNum(Math.round(goal))} {u}</span> : ` ${u}`}</span></div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-secondary"><motion.div initial={{ width: 0 }} animate={{ width: `${goal ? Math.min(100, (v / goal) * 100) : 0}%` }} transition={{ duration: 0.9, delay: 0.3 + k * 0.08 }} className={`h-full rounded-full ${k === 0 ? 'bg-primary' : 'bg-primary/60'}`} /></div>
              </div>
            ))}
          </div>
        </Link>
      </motion.div>

      <motion.div {...up(4)} className="grid grid-cols-2 gap-3">
        <Metric icon={Scale} label="وزن فعلی" value={lastW ? faNum(lastW.weightKg) : '—'} unit="kg" />
        <Metric icon={TrendingDown} label="تغییر وزن" value={delta !== null ? `${delta > 0 ? '+' : ''}${faNum(delta)}` : '—'} unit="kg" />
      </motion.div>

      <motion.div {...up(5)} className="rounded-[28px] border border-border bg-card p-5">
        <div className="mb-3 flex items-center justify-between"><h3 className="font-black">جلسات اخیر</h3><Link to="/app/bodyyar/progress" className="text-xs font-bold text-primary">همه</Link></div>
        {data.recentSessions.length ? (
          <ul className="space-y-2">
            {data.recentSessions.map((s) => (
              <li key={s.id} className="flex items-center gap-3 rounded-2xl bg-secondary/60 p-3 text-sm">
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary/15"><CheckCircle2 className="h-5 w-5 text-primary" /></span>
                <span className="flex-1 truncate font-semibold">{s.title}</span>
                <span className="text-xs text-muted-foreground">{s.startedAt ? faDate(s.startedAt) : ''} · {faNum(Math.round(s.durationSec / 60))}′</span>
              </li>
            ))}
          </ul>
        ) : <div className="flex items-center gap-3 rounded-2xl border border-dashed border-border p-4 text-sm text-muted-foreground"><Flame className="h-5 w-5 shrink-0 text-primary" />اولین جلسه‌ات را شروع کن؛ سابقه تمرین‌ها اینجا ساخته می‌شود.</div>}
      </motion.div>
    </div>
  );
}

function Metric({ icon: I, label, value, unit }: { icon: typeof Scale; label: string; value: string; unit: string }) {
  return (
    <div className="rounded-[24px] border border-border bg-card p-4">
      <div className="flex items-center gap-2 text-xs text-muted-foreground"><I className="h-4 w-4 text-primary" />{label}</div>
      <div className="mt-2 text-2xl font-black">{value}<span className="ms-1 text-xs font-medium text-muted-foreground">{value !== '—' ? unit : ''}</span></div>
    </div>
  );
}

function QuickActions() {
  return (
    <div className="grid grid-cols-2 gap-2.5">
      {QUICK.map((q, i) => (
        <Link key={q.to} to={q.to} className={`press flex items-center gap-3 rounded-[22px] border p-3 transition hover:border-primary/40 ${i === 0 ? 'border-primary/30 bg-primary/10' : 'border-border bg-card'}`}>
          <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl ${i === 0 ? 'bg-primary text-primary-foreground' : 'bg-primary/10 text-primary'}`}><q.icon className="h-5 w-5" /></span>
          <span className="min-w-0"><span className="block text-sm font-black">{q.label}</span><span className="block truncate text-[11px] text-muted-foreground">{q.sub}</span></span>
        </Link>
      ))}
    </div>
  );
}
