import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Activity, ChevronLeft, Moon, Ruler, Scale, Target, Sparkles } from 'lucide-react';
import { getDashboard } from 'zitejs/api';
import { Skeleton } from '@project/components/ui/skeleton';
import { useLoad } from '../../lib/useLoad';
import { fa } from '../../lib/config';

const ACT: Record<string, string> = { sedentary: 'کم‌تحرک', light: 'سبک', moderate: 'متوسط', active: 'فعال', athlete: 'ورزشکار' };

function bmiInfo(bmi: number) {
  if (bmi < 18.5) return { l: 'کمبود وزن', c: 'hsl(var(--cyan))' };
  if (bmi < 25) return { l: 'نرمال', c: 'hsl(var(--primary))' };
  if (bmi < 30) return { l: 'اضافه وزن', c: 'hsl(var(--gold))' };
  return { l: 'چاقی', c: 'hsl(var(--destructive))' };
}

/** Body snapshot + profile completeness — the data BodyYar uses to personalise plans. */
export function BodyCard({ token }: { token: string }) {
  const nav = useNavigate();
  const d = useLoad(() => getDashboard({ token }), [token]);
  if (d.loading) return <Skeleton className="mt-6 h-48 rounded-[28px]" />;
  const p = d.data?.profile;
  const fields = p ? [p.goal, p.level, p.age, p.heightCm, p.weightKg, p.sex, p.activityLevel, p.targetWeightKg, p.sleepHours, p.place] : [];
  const done = fields.filter((x) => x !== null && x !== undefined && x !== '').length;
  const pct = Math.round((done / 10) * 100);
  const latestW = d.data?.weights.at(-1)?.weightKg ?? p?.weightKg ?? null;
  const bmi = latestW && p?.heightCm ? latestW / (p.heightCm / 100) ** 2 : null;
  const bi = bmi ? bmiInfo(bmi) : null;
  const toGoal = latestW && p?.targetWeightKg ? Math.round((latestW - p.targetWeightKg) * 10) / 10 : null;

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-6 overflow-hidden rounded-[28px] border border-white/[.08] bg-gradient-to-b from-white/[.05] to-transparent">
      <button onClick={() => nav('/app/bodyyar/profile')} className="press flex w-full items-center gap-3 p-4 text-start">
        <span className="grid h-10 w-10 place-items-center rounded-2xl bg-primary/15 text-primary"><Sparkles className="h-5 w-5" /></span>
        <span className="flex-1"><span className="block font-black">پروفایل بدنی</span><span className="block text-xs text-muted-foreground">{pct < 100 ? `${fa(pct)}٪ کامل — کامل‌ترش کن تا بدن‌یار دقیق‌تر بشه` : 'کامل ✓ بدن‌یار برنامه‌ها رو دقیق برات می‌سازه'}</span></span>
        <ChevronLeft className="h-5 w-5 text-muted-foreground" />
      </button>
      <div className="mx-4 h-1.5 overflow-hidden rounded-full bg-white/5"><div className="h-full rounded-full bg-gradient-to-l from-primary to-[hsl(var(--cyan))] transition-all duration-1000" style={{ width: `${pct}%` }} /></div>
      {p ? (
        <div className="grid grid-cols-2 gap-2 p-4 sm:grid-cols-4">
          <Tile icon={Scale} l="وزن فعلی" v={latestW ? `${fa(latestW)} kg` : '—'} />
          <Tile icon={Target} l="وزن هدف" v={p.targetWeightKg ? `${fa(p.targetWeightKg)} kg` : '—'} sub={toGoal ? `${fa(Math.abs(toGoal))} kg ${toGoal > 0 ? 'تا هدف' : 'مونده تا هدف'}` : undefined} />
          <Tile icon={Ruler} l="BMI" v={bmi ? fa(Math.round(bmi * 10) / 10) : '—'} sub={bi?.l} color={bi?.c} />
          <Tile icon={Activity} l="فعالیت روزانه" v={ACT[p.activityLevel ?? ''] ?? '—'} sub={p.sleepHours ? `خواب ${fa(p.sleepHours)} ساعت` : undefined} subIcon={Moon} />
        </div>
      ) : (
        <div className="p-4 text-sm text-muted-foreground">هنوز پروفایل بدنی نساختی. با چند سؤال کوتاه، بدن‌یار برنامه تمرین و تغذیه‌ی مخصوص خودت رو می‌سازه.</div>
      )}
    </motion.div>
  );
}

function Tile({ icon: I, l, v, sub, color, subIcon: S }: { icon: typeof Scale; l: string; v: string; sub?: string; color?: string; subIcon?: typeof Scale }) {
  return (
    <div className="rounded-2xl bg-black/20 p-3">
      <div className="flex items-center gap-1 text-[11px] text-muted-foreground"><I className="h-3.5 w-3.5" />{l}</div>
      <div className="mt-1 text-lg font-black" style={color ? { color } : undefined}>{v}</div>
      {sub && <div className="flex items-center gap-1 text-[10px] text-muted-foreground">{S && <S className="h-3 w-3" />}{sub}</div>}
    </div>
  );
}
