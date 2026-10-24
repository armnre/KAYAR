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
  { to: '/app/bodyyar/exercises', label: 'حرکات', icon: BookOpen },
  { to: '/app/bodyyar/nutrition', label: 'تغذیه', icon: Apple },
  { to: '/app/bodyyar/progress', label: 'پیشرفت', icon: LineChart },
  { to: '/app/bodyyar/coach', label: 'مربی AI', icon: Bot },
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
  return (
    <div className="mx-auto max-w-xl space-y-5">
      <motion.div {...up(0)} className="flex items-center justify-between">
        <div><p className="font-latin text-[11px] font-bold tracking-[.3em] text-primary">BODYYAR</p><h1 className="text-3xl font-black">بدن‌یار</h1></div>
        <Link to="/app/bodyyar/profile" className="press grid h-11 w-11 place-items-center rounded-2xl border border-border bg-card" aria-label="ویرایش پروفایل"><Settings2 className="h-5 w-5" /></Link>
      </motion.div>

      <motion.div {...up(1)} className="flex items-center gap-4 rounded-[28px] border border-border bg-card p-4">
        <Ring value={data.weekSessions} max={data.profile.daysPerWeek} />
        <div className="min-w-0 flex-1">
          <div className="text-xs text-muted-foreground">هدف هفته</div>
          <div className="truncate text-lg font-black">{data.profile.goal}</div>
          <div className="mt-2 flex gap-3 text-xs text-muted-foreground"><span className="flex items-center gap-1"><Timer className="h-3.5 w-3.5 text-primary" />{faNum(data.weekMinutes)} دقیقه</span><span className="flex items-center gap-1"><Flame className="h-3.5 w-3.5 text-primary" />{faNum(data.weekSessions)} جلسه</span></div>
        </div>
      </motion.div>

      {data.plan && day ? (
        <motion.div {...up(2)}>
          <div className="group relative block overflow-hidden rounded-[32px] bg-primary p-6 text-primary-foreground shadow-[0_20px_50px_-15px_hsl(var(--primary)/.6)]">
            <div className="pointer-events-none absolute -bottom-16 -start-10 h-48 w-48 rounded-full bg-white/30 blur-3xl" />
            <div className="pointer-events-none absolute end-5 top-5 font-latin text-7xl font-black leading-none opacity-15">{String(data.nextDayIndex + 1).padStart(2, '0')}</div>
            <div className="relative">
              <div className="text-xs font-bold opacity-70">تمرین امروز · روز {faNum(data.nextDayIndex + 1)} از {faNum(data.plan.plan.days.length)}</div>
              <h2 className="mt-1 text-2xl font-black">{day.name}</h2>
              <p className="text-sm opacity-75">{day.focus} · {faNum(day.exercises.length)} حرکت</p>
              <div className="mt-5 flex items-center justify-between">
                <Link to={`/app/bodyyar/session/${data.nextDayIndex}`} className="press flex items-center gap-2 rounded-full bg-primary-foreground px-5 py-3 text-sm font-black text-primary"><Play className="h-4 w-4 -scale-x-100 fill-current" />شروع تمرین</Link>
                <Link to="/app/bodyyar/plan" className="flex items-center gap-1 text-sm font-bold opacity-80">کل برنامه<ChevronLeft className="h-4 w-4" /></Link>
              </div>
            </div>
          </div>
        </motion.div>
      ) : (
        <motion.div {...up(2)}><EmptyState icon={<Target />} title="هنوز برنامه‌ای نداری" text="مربی هوشمند از کتابخانه حرکات معتبر برنامه می‌سازد." action={<Button asChild className="glow rounded-2xl font-black"><Link to="/app/bodyyar/plan">ساخت برنامه</Link></Button>} /></motion.div>
      )}

      <motion.div {...up(3)} className="grid grid-cols-2 gap-3">
        <Metric icon={Scale} label="وزن فعلی" value={lastW ? faNum(lastW.weightKg) : '—'} unit="kg" />
        <Metric icon={TrendingDown} label="تغییر وزن" value={delta !== null ? `${delta > 0 ? '+' : ''}${faNum(delta)}` : '—'} unit="kg" />
      </motion.div>

      <motion.div {...up(4)}><QuickActions /></motion.div>

      <motion.div {...up(5)}>
        <Link to="/app/bodyyar/nutrition" className="press block rounded-[28px] border border-border bg-card p-5">
          <div className="flex items-center justify-between"><h3 className="font-black">تغذیه امروز{data.targets && <span className="ms-2 text-xs font-normal text-muted-foreground">هدف {faNum(data.targets.calories)} kcal · {data.trainedToday ? 'روز تمرین' : 'روز استراحت'}</span>}</h3><span className="flex items-center text-xs text-primary">{data.nutritionPlan ? 'رژیم هوشمند' : 'ثبت وعده'}<ChevronLeft className="h-4 w-4" /></span></div>
          {n.entries ? (
            <div className="mt-4 grid grid-cols-4 gap-2 text-center">
              {([['کالری', n.calories, ''], ['پروتئین', n.protein, 'g'], ['کربو', n.carbs, 'g'], ['چربی', n.fat, 'g']] as const).map(([l, v, u], k) => (
                <div key={l} className={k === 0 ? 'rounded-2xl bg-primary/15 p-2.5' : 'rounded-2xl bg-secondary p-2.5'}><div className={k === 0 ? 'text-base font-black text-primary' : 'text-base font-black'}>{faNum(Math.round(v))}<span className="text-[10px] font-normal text-muted-foreground">{u}</span></div><div className="text-[11px] text-muted-foreground">{l}</div></div>
              ))}
            </div>
          ) : <p className="mt-2 text-sm text-muted-foreground">امروز هنوز وعده‌ای ثبت نکرده‌ای.</p>}
        </Link>
      </motion.div>

      <motion.div {...up(6)} className="rounded-[28px] border border-border bg-card p-5">
        <h3 className="mb-3 font-black">جلسات اخیر</h3>
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
        ) : <p className="text-sm text-muted-foreground">بعد از اولین تمرین، اینجا نمایش داده می‌شود.</p>}
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
    <div className="grid grid-cols-4 gap-2">
      {QUICK.map((q) => (
        <Link key={q.to} to={q.to} className="press flex flex-col items-center gap-2 rounded-[22px] border border-border bg-card px-1 py-3.5 text-xs font-bold transition hover:border-primary/40">
          <span className="grid h-11 w-11 place-items-center rounded-2xl bg-primary/10"><q.icon className="h-5 w-5 text-primary" /></span>{q.label}
        </Link>
      ))}
    </div>
  );
}
