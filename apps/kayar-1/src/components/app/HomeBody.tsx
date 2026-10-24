import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Dumbbell, Salad, Flame, Timer, Trophy, Droplets, Play, Sparkles, ChevronLeft, Bot } from 'lucide-react';
import { getDashboard } from 'zitejs/api';
import { Skeleton } from '@project/components/ui/skeleton';
import { tok } from '../../lib/session';
import { useLoad } from '../../lib/useLoad';
import { fa } from '../../lib/config';

const up = (i: number) => ({ initial: { opacity: 0, y: 14 }, animate: { opacity: 1, y: 0 }, transition: { delay: i * 0.06, duration: 0.45 } });

/** BodyYar summary on the app home: real weekly stats, today's session, today's nutrition target. */
export function HomeBody() {
  const { data } = useLoad(() => getDashboard({ token: tok() }));
  if (!data) return <div className="mt-4 space-y-3"><Skeleton className="h-24 rounded-[28px]" /><Skeleton className="h-40 rounded-[28px]" /></div>;
  if (!data.profile) return (
    <motion.div {...up(2)}><Link to="/app/bodyyar/profile" className="press mt-4 flex items-center gap-4 rounded-[28px] bg-primary p-5 text-primary-foreground">
      <span className="grid h-12 w-12 place-items-center rounded-2xl bg-black/10"><Sparkles className="h-6 w-6" /></span>
      <span className="flex-1"><b className="block text-lg">بدن‌یار رو فعال کن</b><span className="text-sm opacity-75">برنامه تمرین و تغذیه هوشمند در ۲ دقیقه</span></span><ChevronLeft />
    </Link></motion.div>
  );
  const day = data.plan?.plan.days[data.nextDayIndex];
  const t = data.targets;
  const eaten = data.nutrition.calories;
  const stats = [
    { i: Flame, v: `${fa(data.weekSessions)}/${fa(data.profile.daysPerWeek)}`, l: 'جلسه هفته' },
    { i: Timer, v: fa(data.weekMinutes), l: 'دقیقه تمرین' },
    { i: Trophy, v: data.trainedToday ? '✓' : fa(0), l: 'تمرین امروز' },
  ];
  return (
    <>
      <motion.div {...up(2)} className="mt-4 grid grid-cols-3 gap-3">
        {stats.map((s) => <div key={s.l} className="rounded-[22px] border border-border bg-card p-3.5 text-center"><s.i className="mx-auto h-5 w-5 text-primary" /><div className="mt-1.5 text-xl font-black">{s.v}</div><div className="text-[11px] text-muted-foreground">{s.l}</div></div>)}
      </motion.div>

      <div className="mb-3 mt-9 flex items-end justify-between"><h2 className="text-lg font-black">برای امروز</h2><Link to="/app/bodyyar" className="flex items-center gap-1 text-sm font-bold text-primary">بدن‌یار<ChevronLeft className="h-4 w-4" /></Link></div>
      <motion.div {...up(3)} className="grid grid-cols-2 gap-3">
        <Link to={day ? `/app/bodyyar/session/${data.nextDayIndex}` : '/app/bodyyar/plan'} className="press relative min-h-[164px] overflow-hidden rounded-[28px] bg-primary p-5 text-primary-foreground">
          <Dumbbell className="absolute -bottom-5 -end-5 h-28 w-28 opacity-10" />
          <span className="grid h-11 w-11 place-items-center rounded-2xl bg-black/10">{day ? <Play className="h-5 w-5 -scale-x-100 fill-current" /> : <Dumbbell className="h-5 w-5" />}</span>
          <div className="mt-5 line-clamp-1 font-black">{day ? day.name : 'ساخت برنامه'}</div>
          <div className="text-xs opacity-70">{day ? `${fa(day.exercises.length)} حرکت · شروع کن` : 'با هوش مصنوعی'}</div>
        </Link>
        <Link to="/app/bodyyar/nutrition" className="press relative min-h-[164px] overflow-hidden rounded-[28px] border border-border bg-card p-5">
          <Salad className="absolute -bottom-5 -end-5 h-28 w-28 opacity-5" />
          <span className="grid h-11 w-11 place-items-center rounded-2xl bg-primary/15 text-primary"><Salad className="h-5 w-5" /></span>
          <div className="mt-5 font-black">{t ? `${fa(Math.max(0, t.calories - eaten))} kcal` : 'رژیم غذایی'}</div>
          <div className="text-xs text-muted-foreground">{t ? `باقی‌مانده · ${data.trainedToday ? 'روز تمرین' : 'روز استراحت'}` : 'وعده‌ها را ثبت کن'}</div>
          {t && <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-secondary"><div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(100, (eaten / t.calories) * 100)}%` }} /></div>}
        </Link>
      </motion.div>
      <motion.div {...up(4)} className="mt-3 grid grid-cols-2 gap-3">
        <div className="flex items-center gap-3 rounded-[22px] border border-border bg-card p-3.5"><Droplets className="h-5 w-5 shrink-0 text-cyan" /><div className="text-xs"><b className="block text-sm">{fa(data.nutritionPlan?.waterL ?? 2.5)} لیتر آب</b><span className="text-muted-foreground">هدف امروز</span></div></div>
        <Link to="/app/bodyyar/coach" className="press flex items-center gap-3 rounded-[22px] border border-border bg-card p-3.5"><Bot className="h-5 w-5 shrink-0 text-primary" /><div className="text-xs"><b className="block text-sm">مربی هوشمند</b><span className="text-muted-foreground">سؤال بپرس</span></div></Link>
      </motion.div>
    </>
  );
}
