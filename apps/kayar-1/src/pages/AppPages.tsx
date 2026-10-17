import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Dumbbell, Salad, LineChart, Check, Send, Loader2, Bot, Sparkles, AlertTriangle } from 'lucide-react';
import { Area, AreaChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts';
import { cn } from '@project/components/lib/utils';
import { KButton, Glass, IconBox, SampleBadge, ProgressRing, StateView } from '../components/kit';
import { H } from '../components/app/HomeMorshed';
import { fa } from '../lib/config';
import { errMsg } from '../lib/session';
import { bodyyarChatStream, bodyyarPlan, bodyyarProfile, bodyyarWeightLog, bodyyarWorkoutLog, type BodyyarPlanOutputType } from 'zitejs/api';
export { AppHome } from '../components/app/HomeMorshed';
export { Morshed } from '../components/app/Morshed';
export { Notifications } from '../components/app/Notifications';
export { Profile } from '../components/app/Profile';

const wizard = [
  { q: 'هدفت چیه؟', o: ['کاهش وزن', 'افزایش عضله', 'تناسب عمومی', 'آمادگی مسابقه'] },
  { q: 'جنسیت', o: ['زن', 'مرد'] },
  { q: 'سطح فعالیتت', o: ['تازه‌کار', 'متوسط', 'حرفه‌ای'] },
  { q: 'هفته‌ای چند روز؟', o: ['۲ روز', '۳ روز', '۴ روز', '۵+ روز'] },
  { q: 'کجا تمرین می‌کنی؟', o: ['باشگاه', 'خانه', 'فضای باز'] },
  { q: 'رژیم غذایی', o: ['معمولی', 'گیاهی', 'کم‌کربوهیدرات'] },
];
const weekDays = ['شنبه', 'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه', 'جمعه'];
const sampleEx = [['اسکات با هالتر', '۴×۱۰'], ['پرس سینه', '۴×۸'], ['زیربغل سیم‌کش', '۳×۱۲'], ['پلانک', '۳×۴۵ثانیه']];

type PlanData = NonNullable<BodyyarPlanOutputType['plan']>;
type ChatMsg = { role: 'user' | 'assistant'; content: string };

const faNum2 = (v: number) => fa(String(Math.round(v)));
const daysFromAnswer = (a: string) => {
  const m = a.match(/[۰-۹0-9]+/);
  if (!m) return 3;
  const raw = m[0].replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)));
  const n = Number(raw);
  return Math.min(7, Math.max(1, n || 3));
};

export function Bodyyar() {
  const [stage, setStage] = useState<'intro' | 'wizard' | 'building' | 'plan'>('intro');
  const [step, setStep] = useState(0); const [ans, setAns] = useState<string[]>([]);
  const [day, setDay] = useState(0);
  const [plan, setPlan] = useState<PlanData | null>(null);
  const [sample, setSample] = useState(false);
  const [done, setDone] = useState<Record<string, boolean>>({});
  const [weights, setWeights] = useState<{ date: string; weightKg: number }[]>([]);
  const [weightInput, setWeightInput] = useState('');
  const [chat, setChat] = useState<ChatMsg[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [sending, setSending] = useState(false);
  const [buildError, setBuildError] = useState('');

  const loadPlan = useCallback(async () => {
    try {
      const r = await bodyyarPlan({ action: 'get' });
      if (r.plan) {
        setPlan(r.plan);
        const logs = await bodyyarWorkoutLog({ planId: r.plan.id, dayIndex: 0, exerciseIndex: 0, done: false }).catch(() => null);
        if (logs?.done) {
          const map: Record<string, boolean> = {};
          for (const d of logs.done) map[`${d.dayIndex}:${d.exerciseIndex}`] = d.done;
          setDone(map);
        }
      }
    } catch { /* no plan yet */ }
    try {
      const w = await bodyyarWeightLog({ action: 'list' });
      setWeights(w.logs ?? []);
    } catch { /* no logs yet */ }
  }, []);

  useEffect(() => { void loadPlan(); }, [loadPlan]);

  const build = useCallback(async () => {
    setBuildError('');
    setStage('building');
    const profile = {
      goal: ans[0] ?? 'تناسب عمومی',
      gender: ans[1] ?? '',
      level: ans[2] ?? '',
      daysPerWeek: daysFromAnswer(ans[3] ?? '۳ روز'),
      place: ans[4] ?? '',
      diet: ans[5] ?? '',
      age: null, heightCm: null, weightKg: null,
      limitations: '',
    };
    try {
      await bodyyarProfile({ save: profile });
      const r = await bodyyarPlan({ action: 'create', profile });
      if (!r.plan) throw new Error('برنامه‌ای ساخته نشد.');
      setPlan(r.plan);
      setSample(false);
      setDay(0);
      setDone({});
      setStage('plan');
    } catch (e) {
      setBuildError(errMsg(e));
    }
  }, [ans]);

  if (stage === 'intro') return (
    <div className="pb-6">
      <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className="relative overflow-hidden rounded-[32px] border border-primary/20 bg-card bg-[radial-gradient(90%_80%_at_100%_0%,hsl(var(--primary)/.22),transparent_60%)] p-6 pb-7">
        <div className="pointer-events-none absolute -end-12 -top-12 h-56 w-56 rounded-full border-[26px] border-primary/10" />
        <div className="pointer-events-none absolute -bottom-20 -start-10 h-48 w-48 rounded-full bg-primary/10 blur-3xl" />
        <span className="relative inline-flex items-center gap-1.5 rounded-full bg-primary/15 px-3 py-1 text-xs font-bold text-primary"><Sparkles className="h-3.5 w-3.5" />مربی شخصی تو</span>
        <h1 className="relative mt-4 text-[clamp(2rem,8vw,2.8rem)] font-black leading-tight">بدن‌یار</h1>
        <p className="relative mt-1 max-w-xs font-medium text-muted-foreground">شش سؤال ساده، یه برنامه‌ی تمرین و تغذیه که فقط مال خودته.</p>
        <div className="relative mt-6 flex items-center gap-3">
          <button onClick={() => setStage('wizard')} className="press inline-flex h-12 items-center gap-2 rounded-full bg-primary px-6 font-black text-primary-foreground shadow-[0_10px_30px_-8px_hsl(var(--primary)/.6)]">شروع کن <ArrowLeft className="h-5 w-5" /></button>
          <span className="text-xs font-bold text-muted-foreground">⏱ کمتر از ۱ دقیقه</span>
        </div>
      </motion.div>
      <H t="چی می‌گیری؟" />
      <div className="grid gap-3 sm:grid-cols-3">
        {[[Dumbbell, 'برنامه‌ی تمرین', 'متناسب با سطح و زمانت', 'bg-primary/15 text-primary'], [Salad, 'برنامه‌ی غذایی', 'با غذاهای در دسترس', 'bg-[hsl(24_100%_60%/.15)] text-[hsl(24_100%_65%)]'], [LineChart, 'پیگیری پیشرفت', 'وزن و روند هفتگی', 'bg-violet/15 text-[hsl(254_100%_78%)]']].map(([I, t, d, c], i) => {
          const Ic = I as typeof Dumbbell;
          return <motion.div key={t as string} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.07 }} className="flex items-center gap-3 rounded-3xl border border-border bg-card p-4 sm:block"><span className={cn('grid h-12 w-12 shrink-0 place-items-center rounded-2xl', c as string)}><Ic className="h-6 w-6" /></span><div className="sm:mt-3"><div className="font-black">{t as string}</div><div className="text-sm text-muted-foreground">{d as string}</div></div></motion.div>;
        })}
      </div>
      <button onClick={() => { setSample(true); setStage('plan'); }} className="tap mt-5 w-full rounded-2xl border border-dashed border-border text-sm font-bold text-muted-foreground">دیدن یه برنامه‌ی نمونه</button>
    </div>
  );
  if (stage === 'wizard') {
    const s = wizard[step];
    return (
      <div>
        <div className="flex items-center gap-2" aria-label={`مرحله‌ی ${fa(step + 1)} از ${fa(6)}`}>{wizard.map((_, i) => <span key={i} className={cn('h-1.5 flex-1 rounded-full transition-colors', i <= step ? 'bg-primary' : 'bg-white/10')} />)}</div>
        <div className="mt-2 text-sm text-muted-foreground">مرحله‌ی {fa(step + 1)} از {fa(6)}</div>
        <motion.h1 key={step} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="mt-6 text-[clamp(1.6rem,6vw,2.1rem)] font-black">{s.q}</motion.h1>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {s.o.map((o) => <button key={o} onClick={() => { const a = [...ans]; a[step] = o; setAns(a); }} className={cn('press flex min-h-[64px] items-center justify-between rounded-3xl border bg-card px-5 text-start text-lg font-bold transition', ans[step] === o ? 'border-primary bg-primary/10 text-primary' : 'border-border')}>{o}{ans[step] === o && <Check className="h-5 w-5 text-primary" />}</button>)}
        </div>
        <div className="mt-8 flex gap-3">
          <KButton variant="outline" onClick={() => (step ? setStep(step - 1) : setStage('intro'))}>قبلی</KButton>
          <KButton className="flex-1" disabled={!ans[step]} onClick={() => { if (step < 5) setStep(step + 1); else void build(); }}>{step < 5 ? 'بعدی' : 'ساخت برنامه'}</KButton>
        </div>
      </div>
    );
  }
  if (stage === 'building') return (
    <StateView
      icon={buildError ? AlertTriangle : Loader2}
      title={buildError ? 'برنامه ساخته نشد' : 'بدن‌یار داره برنامه‌ات رو می‌سازه…'}
      text={buildError || 'چند ثانیه صبر کن…'}
      action={buildError ? <KButton onClick={() => void build()}>تلاش دوباره</KButton> : undefined}
    />
  );

  const isSample = sample || !plan;
  const realDays = plan?.days ?? [];
  const days = isSample ? weekDays.map((d) => ({ name: d, exercises: [] as { name: string; sets: number; reps: string; note?: string }[] })) : realDays;
  const exList = isSample
    ? sampleEx.map(([n, r]) => ({ name: n, sets: Number(r.split('×')[0]) || 3, reps: r.split('×')[1] ?? '۱۰' }))
    : (realDays[day]?.exercises ?? []).map((e) => ({ name: e.name, sets: e.sets, reps: String(e.reps) }));
  const nutrition = plan?.nutrition;
  const macros = nutrition
    ? [
      { l: 'پروتئین', pct: Math.round((nutrition.proteinG * 4 / Math.max(1, nutrition.calories)) * 100), c: 'hsl(var(--primary))', g: `${faNum2(nutrition.proteinG)} گرم` },
      { l: 'کربوهیدرات', pct: Math.round((nutrition.carbsG * 4 / Math.max(1, nutrition.calories)) * 100), c: 'hsl(var(--violet))', g: `${faNum2(nutrition.carbsG)} گرم` },
      { l: 'چربی', pct: Math.round((nutrition.fatG * 9 / Math.max(1, nutrition.calories)) * 100), c: 'hsl(var(--gold))', g: `${faNum2(nutrition.fatG)} گرم` },
    ]
    : [['پروتئین', 72, 'hsl(var(--primary))', '۱۲۰ گرم'], ['کربوهیدرات', 54, 'hsl(var(--violet))', '۲۰۰ گرم'], ['چربی', 40, 'hsl(var(--gold))', '۶۰ گرم']].map(([l, v, c, g]) => ({ l: l as string, pct: v as number, c: c as string, g: g as string }));
  const weightData = useMemo(() => weights.map((w) => ({ w: new Intl.DateTimeFormat('fa-IR', { day: 'numeric', month: 'short' }).format(new Date(w.date)), v: w.weightKg })), [weights]);

  const toggle = async (i: number) => {
    if (isSample || !plan) { setDone((s) => { const x = { ...s }; const k = `${day}:${i}`; x[k] = !x[k]; return x; }); return; }
    const key = `${day}:${i}`;
    const next = !done[key];
    setDone((s) => ({ ...s, [key]: next }));
    try {
      await bodyyarWorkoutLog({ planId: plan.id, dayIndex: day, exerciseIndex: i, done: next });
    } catch (e) {
      setDone((s) => ({ ...s, [key]: !next }));
      setChat((c) => [...c, { role: 'assistant', content: errMsg(e) }]);
    }
  };

  const saveWeight = async () => {
    const v = Number(weightInput.replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d))).replace(',', '.'));
    if (!v || v < 25 || v > 300) return;
    try {
      const r = await bodyyarWeightLog({ action: 'add', weightKg: v });
      setWeights(r.logs ?? []);
      setWeightInput('');
    } catch (e) {
      setChat((c) => [...c, { role: 'assistant', content: errMsg(e) }]);
    }
  };

  const sendChat = async () => {
    const text = chatInput.trim();
    if (!text || sending) return;
    setChatInput('');
    setSending(true);
    setChat((c) => [...c, { role: 'user', content: text }, { role: 'assistant', content: '' }]);
    try {
      await bodyyarChatStream({ message: text }, (chunk) => {
        setChat((c) => {
          const next = [...c];
          const last = next[next.length - 1];
          if (last?.role === 'assistant') next[next.length - 1] = { ...last, content: last.content + chunk };
          return next;
        });
      });
    } catch (e) {
      setChat((c) => {
        const next = [...c];
        const last = next[next.length - 1];
        if (last?.role === 'assistant' && !last.content) next[next.length - 1] = { ...last, content: errMsg(e) };
        return next;
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between"><h1 className="text-[clamp(1.6rem,6vw,2.25rem)] font-black">برنامه‌ی من</h1>{isSample && <SampleBadge />}</div>
      <div className="-mx-4 mt-4 flex gap-2 overflow-x-auto px-4 pb-1" role="tablist">{days.map((d, i) => <button key={`${d.name}-${i}`} role="tab" aria-selected={day === i} onClick={() => setDay(i)} className={cn('tap shrink-0 rounded-2xl px-4 text-sm font-bold', day === i ? 'bg-primary text-primary-foreground' : 'bg-white/5 text-muted-foreground')}>{d.name}</button>)}</div>
      <H t="تمرین امروز" />
      <ul className="space-y-2">{exList.map((e, i) => {
        const key = `${day}:${i}`;
        const isDone = !!done[key];
        return <li key={`${e.name}-${i}`}><button onClick={() => void toggle(i)} className={cn('glass press flex w-full items-center gap-3 rounded-3xl p-4 text-start', isDone && 'border-primary/40')} aria-pressed={isDone}><span className={cn('grid h-8 w-8 shrink-0 place-items-center rounded-full border-2', isDone ? 'border-primary bg-primary text-primary-foreground' : 'border-white/20')}>{isDone && <Check className="h-4 w-4" />}</span><span className={cn('flex-1 font-bold', isDone && 'text-muted-foreground line-through')}>{e.name}</span><span className="text-sm text-muted-foreground">{fa(e.sets)}×{e.reps}</span></button></li>;
      })}</ul>
      <H t="تغذیه‌ی امروز" />
      <Glass className="flex flex-wrap justify-around gap-4 p-5">{macros.map((m) => <div key={m.l} className="text-center"><ProgressRing value={m.pct} size={84} color={m.c}><span className="font-bold">{fa(m.pct)}٪</span></ProgressRing><div className="mt-2 text-sm font-bold">{m.l}</div><div className="text-xs text-muted-foreground">{m.g}</div></div>)}</Glass>
      {nutrition?.tips?.length ? <ul className="mt-3 space-y-1 text-sm text-muted-foreground">{nutrition.tips.map((t) => <li key={t}>• {t}</li>)}</ul> : null}
      <H t="روند وزن" />
      <Glass className="h-56 p-3" dir="ltr">
        <ResponsiveContainer><AreaChart data={weightData}><defs><linearGradient id="g1" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="hsl(71 100% 56%)" stopOpacity={0.4} /><stop offset="1" stopColor="hsl(71 100% 56%)" stopOpacity={0} /></linearGradient></defs><XAxis dataKey="w" tick={{ fill: '#A7ABB6', fontSize: 12 }} axisLine={false} tickLine={false} /><YAxis domain={['dataMin - 1', 'dataMax + 1']} hide /><Tooltip contentStyle={{ background: '#12151A', border: '1px solid rgba(255,255,255,.1)', borderRadius: 16 }} /><Area dataKey="v" stroke="hsl(71 100% 56%)" strokeWidth={2.5} fill="url(#g1)" /></AreaChart></ResponsiveContainer>
      </Glass>
      <div className="mt-3 flex items-center gap-2">
        <input value={weightInput} onChange={(e) => setWeightInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') void saveWeight(); }} inputMode="decimal" placeholder="ثبت وزن امروز (کیلوگرم)" aria-label="ثبت وزن امروز" className="h-11 min-w-0 flex-1 rounded-full border border-white/10 bg-white/[.04] px-4 text-sm outline-none focus:border-primary" />
        <KButton onClick={() => void saveWeight()}>ثبت</KButton>
      </div>
      <H t="دستیار بدن‌یار" />
      <Glass className="p-4">
        <div className="space-y-2">
          {chat.length === 0 ? <div className="flex items-start gap-2"><IconBox icon={Bot} className="h-9 w-9 rounded-xl" /><div className="rounded-2xl bg-white/[.06] px-3 py-2 text-sm">سلام! سؤالی درباره‌ی برنامه‌ات داری؟</div></div> : null}
          {chat.map((m, i) => <div key={i} className={cn('flex items-start gap-2', m.role === 'user' && 'flex-row-reverse')}><IconBox icon={m.role === 'user' ? Check : Bot} className="h-9 w-9 rounded-xl" /><div className={cn('rounded-2xl px-3 py-2 text-sm', m.role === 'user' ? 'bg-primary/15' : 'bg-white/[.06]')}>{m.content || <Loader2 className="h-4 w-4 animate-spin" />}</div></div>)}
        </div>
        <form onSubmit={(e) => { e.preventDefault(); void sendChat(); }} className="mt-3 flex gap-2"><input value={chatInput} onChange={(e) => setChatInput(e.target.value)} placeholder="پیامت رو بنویس…" aria-label="پیام" className="h-12 min-w-0 flex-1 rounded-full border border-white/10 bg-white/[.04] px-4 text-base outline-none focus:border-primary" disabled={sending} /><button disabled={sending || !chatInput.trim()} className="tap grid place-items-center rounded-full bg-primary text-primary-foreground disabled:opacity-50" aria-label="ارسال"><Send className="h-5 w-5 -scale-x-100" /></button></form>
      </Glass>
      <button onClick={() => { setStage('intro'); setStep(0); setAns([]); setSample(true); }} className="tap mt-4 text-sm text-muted-foreground underline">ساخت دوباره‌ی برنامه</button>
    </div>
  );
}
