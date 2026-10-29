import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Footprints, Dumbbell, Wind, Brain, Play, Pause, Headphones, Podcast, Dumbbell as Plan, Salad, Bot, LineChart, ArrowLeft, Check, type LucideIcon } from 'lucide-react';
import { Waveform, ProgressRing } from '../kit';
import { fa } from '../../lib/config';
import { useBlock } from '../../lib/cms';

const MODE_ICONS: LucideIcon[] = [Footprints, Dumbbell, Wind, Brain];
const TRACKS = [
  { t: 'شروع قدرتی', m: 'تمرین قدرتی', bpm: 128, d: '۳:۴۲' },
  { t: 'ضربان دویدن', m: 'دویدن', bpm: 165, d: '۴:۱۰' },
  { t: 'تنفس عمیق', m: 'ریکاوری', bpm: 70, d: '۵:۰۵' },
];

function Eyebrow({ children }: { children: string }) {
  return <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-3 py-1 font-latin text-xs font-bold tracking-[.2em] text-primary">{children}</div>;
}

function MorshedPlayer() {
  const [cur, setCur] = useState(0);
  const [playing, setPlaying] = useState(true);
  return (
    <div className="relative rounded-[32px] border border-white/10 bg-gradient-to-b from-white/[.06] to-white/[.02] p-5 shadow-2xl backdrop-blur-xl sm:p-6">
      <div className="flex items-center gap-4">
        <div className="relative grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-2xl bg-primary text-primary-foreground">
          <Headphones className="h-9 w-9" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,.35),transparent_60%)]" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-xs font-bold text-primary">{TRACKS[cur].m} · {fa(TRACKS[cur].bpm)} BPM</div>
          <div className="mt-1 truncate text-xl font-black">{TRACKS[cur].t}</div>
          <div className="text-sm text-muted-foreground">مرشد کایار</div>
        </div>
        <button onClick={() => setPlaying((p) => !p)} aria-label={playing ? 'توقف' : 'پخش'} className="press tap grid h-14 w-14 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground shadow-[0_0_40px_-8px_hsl(var(--primary))]">
          {playing ? <Pause className="h-6 w-6 fill-current" /> : <Play className="h-6 w-6 fill-current" />}
        </button>
      </div>
      <Waveform bars={48} playing={playing} className="mt-5 h-10 w-full justify-between" color="bg-primary" />
      <ul className="mt-5 space-y-1.5">
        {TRACKS.map((x, i) => (
          <li key={x.t}>
            <button onClick={() => { setCur(i); setPlaying(true); }} className={`flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-start transition-colors ${i === cur ? 'bg-primary/10 text-foreground' : 'text-muted-foreground hover:bg-white/[.04]'}`}>
              <span className={`grid h-8 w-8 place-items-center rounded-lg font-latin text-xs font-bold ${i === cur ? 'bg-primary text-primary-foreground' : 'bg-white/[.06]'}`}>{fa(i + 1)}</span>
              <span className="min-w-0 flex-1 truncate font-bold">{x.t}</span>
              <span className="text-xs">{x.d}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function MorshedSection() {
  const b = useBlock('morshed');
  return (
    <section id="morshed" className="relative scroll-mt-20 overflow-hidden px-4 py-24 md:py-32">
      <div className="absolute start-[10%] top-1/4 -z-10 h-[28rem] w-[28rem] rounded-full bg-primary/[.07] blur-[140px]" aria-hidden />
      <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-[1.05fr_1fr]">
        <div className="reveal min-w-0">
          <Eyebrow>MORSHED</Eyebrow>
          <h2 className="text-[clamp(2rem,4.8vw,3.4rem)] font-black leading-[1.2]">{b.title} <span className="text-primary">{b.accent}</span></h2>
          <p className="mt-4 max-w-xl text-[17px] leading-[1.9] text-muted-foreground">{b.text}</p>
          <div className="mt-8 grid grid-cols-2 gap-3">
            {b.chips.slice(0, 4).map((c, i) => {
              const Icon = MODE_ICONS[i % MODE_ICONS.length];
              return (
                <div key={c} className="group flex items-center gap-3 rounded-2xl border border-white/[.08] bg-white/[.03] p-4 transition-all hover:-translate-y-0.5 hover:border-primary/40">
                  <span className="grid h-11 w-11 place-items-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground"><Icon className="h-5 w-5" /></span>
                  <span className="font-bold">{c}</span>
                </div>
              );
            })}
          </div>
          <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-2"><Headphones className="h-4 w-4 text-primary" />موزیک‌های دسته‌بندی‌شده بر اساس ریتم</span>
            <span className="inline-flex items-center gap-2"><Podcast className="h-4 w-4 text-primary" />پادکست‌های ورزش و سلامت</span>
          </div>
        </div>
        <div className="reveal min-w-0"><MorshedPlayer /></div>
      </div>
    </section>
  );
}

const FEATURES: { icon: LucideIcon; t: string; d: string }[] = [
  { icon: Plan, t: 'برنامه‌ی تمرینی', d: 'بر اساس سطح، هدف و روزهای آزادت' },
  { icon: Salad, t: 'تغذیه و کالری', d: 'ثبت وعده‌ها و ماکروی روزانه' },
  { icon: Bot, t: 'مربی هوشمند', d: 'هر سؤالی داشتی، همان لحظه بپرس' },
  { icon: LineChart, t: 'پیگیری پیشرفت', d: 'نمودار وزن و جلسه‌های انجام‌شده' },
];

function PhoneMock() {
  const msgs = ['سلام! هدفت چیه؟', 'می‌خوام ۵ کیلو کم کنم و قوی‌تر بشم', 'عالیه. برنامه‌ی ۴ روز در هفته برات ساختم.'];
  const [n, setN] = useState(1);
  useEffect(() => { const t = setInterval(() => setN((x) => (x >= 3 ? 1 : x + 1)), 1800); return () => clearInterval(t); }, []);
  return (
    <div className="relative mx-auto w-[min(310px,84vw)] rounded-[46px] border border-white/15 bg-bg1 p-3 shadow-[0_40px_120px_-30px_hsl(var(--primary)/.35)]" aria-hidden>
      <div className="mx-auto mb-3 h-5 w-24 rounded-full bg-black" />
      <div className="min-h-[124px] space-y-2 px-1">
        {msgs.slice(0, n).map((m, i) => <div key={i} className={`max-w-[85%] rounded-2xl px-3 py-2 text-[13px] leading-6 ${i % 2 ? 'ms-auto bg-primary text-primary-foreground' : 'bg-white/[.07]'}`}>{m}</div>)}
      </div>
      <div className="mt-3 rounded-2xl bg-white/[.05] p-3">
        <div className="mb-2 text-xs font-bold">ماکروی امروز</div>
        <div className="flex justify-between">
          {([['پروتئین', 72, 'hsl(var(--primary))'], ['کربو', 54, 'hsl(var(--primary) / .65)'], ['چربی', 40, 'hsl(var(--primary) / .4)']] as const).map(([l, v, c]) => (
            <div key={l} className="text-center"><ProgressRing value={v} size={54} stroke={5} color={c}><span className="text-xs">{fa(v)}٪</span></ProgressRing><div className="mt-1 text-xs text-muted-foreground">{l}</div></div>
          ))}
        </div>
      </div>
      <div className="mt-3 rounded-2xl bg-white/[.05] p-3">
        <div className="mb-2 flex items-center justify-between text-xs"><span className="font-bold">برنامه‌ی امروز</span><span className="text-primary">۲ از ۴</span></div>
        {['اسکوات ۴×۱۰', 'پرس سینه ۳×۱۲'].map((x, i) => <div key={x} className="flex items-center gap-2 py-1 text-[13px]"><span className={`grid h-4 w-4 place-items-center rounded-full ${i === 0 ? 'bg-primary text-primary-foreground' : 'border border-white/20'}`}>{i === 0 && <Check className="h-3 w-3" />}</span>{x}</div>)}
      </div>
    </div>
  );
}

export function BodyyarSection() {
  const b = useBlock('bodyyar');
  return (
    <section id="bodyyar" className="relative scroll-mt-20 overflow-hidden px-4 py-24 md:py-32">
      <div className="absolute end-0 top-10 -z-10 h-[28rem] w-[28rem] rounded-full bg-primary/[.08] blur-[140px]" aria-hidden />
      <div className="mx-auto grid max-w-6xl items-center gap-14 lg:grid-cols-[1fr_1.1fr]">
        <div className="reveal order-2 lg:order-1"><PhoneMock /></div>
        <div className="reveal order-1 min-w-0 lg:order-2">
          <Eyebrow>BODYYAR</Eyebrow>
          <h2 className="text-[clamp(2rem,4.8vw,3.4rem)] font-black leading-[1.2]">{b.title} <span className="text-primary">{b.accent}</span></h2>
          <p className="mt-4 max-w-xl text-[17px] leading-[1.9] text-muted-foreground">{b.text}</p>
          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            {FEATURES.map(({ icon: Icon, t, d }) => (
              <div key={t} className="rounded-2xl border border-white/[.08] bg-white/[.03] p-4 transition-all hover:-translate-y-0.5 hover:border-primary/40">
                <Icon className="h-5 w-5 text-primary" />
                <div className="mt-3 font-bold">{t}</div>
                <div className="mt-1 text-sm leading-6 text-muted-foreground">{d}</div>
              </div>
            ))}
          </div>
          <ol className="mt-6 flex flex-wrap items-center gap-2 text-sm">
            {b.steps.map((s, i) => (
              <li key={s} className="inline-flex items-center gap-2 rounded-full bg-white/[.04] px-3 py-1.5 text-muted-foreground">
                <span className="font-latin font-bold text-primary">{fa(i + 1)}</span>{s}
              </li>
            ))}
          </ol>
          <Link to="/app" className="press tap mt-8 inline-flex h-13 items-center gap-2 rounded-full bg-primary px-7 py-3.5 font-bold text-primary-foreground">شروع با بدن‌یار <ArrowLeft className="h-5 w-5" /></Link>
        </div>
      </div>
    </section>
  );
}
