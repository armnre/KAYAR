import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Footprints, Dumbbell, Wind, Brain, Play, Pause, Headphones, Podcast, Salad, Bot, LineChart, ArrowLeft, ArrowUpLeft, Check, ShoppingBag, BadgePercent, Handshake, Truck, ShieldCheck, Shirt, type LucideIcon } from 'lucide-react';
import { Waveform, ProgressRing } from '../kit';
import { fa } from '../../lib/config';
import { useBlock } from '../../lib/cms';
import { usePublicSettings } from '../../lib/publicData';

const MODE_ICONS: LucideIcon[] = [Footprints, Dumbbell, Wind, Brain];
const TRACKS = [
  { t: 'شروع قدرتی', m: 'تمرین قدرتی', bpm: 128, d: '۳:۴۲' },
  { t: 'ضربان دویدن', m: 'دویدن', bpm: 165, d: '۴:۱۰' },
  { t: 'تنفس عمیق', m: 'ریکاوری', bpm: 70, d: '۵:۰۵' },
];

function Eyebrow({ children }: { children: string }) {
  return <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-3 py-1 font-latin text-[11px] font-bold tracking-[.2em] text-primary">{children}</div>;
}

const H2 = 'text-[clamp(1.6rem,3.6vw,2.6rem)] font-black leading-[1.25]';
const LEAD = 'mt-3 max-w-xl text-[15px] leading-[1.9] text-muted-foreground md:text-base';
const CARD = 'rounded-2xl border border-white/[.08] bg-white/[.03] transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/40 hover:bg-white/[.05]';

function MorshedPlayer() {
  const [cur, setCur] = useState(0);
  const [playing, setPlaying] = useState(true);
  return (
    <div className="relative mx-auto w-full max-w-md rounded-[28px] border border-white/10 bg-gradient-to-b from-white/[.07] to-white/[.02] p-4 shadow-2xl backdrop-blur-xl sm:p-5">
      <div className="flex items-center gap-3">
        <div className="relative grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-2xl bg-primary text-primary-foreground">
          <Headphones className="h-7 w-7" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[11px] font-bold text-primary">{TRACKS[cur].m} · {fa(TRACKS[cur].bpm)} BPM</div>
          <div className="truncate text-lg font-black">{TRACKS[cur].t}</div>
        </div>
        <button onClick={() => setPlaying((p) => !p)} aria-label={playing ? 'توقف' : 'پخش'} className="press tap grid h-12 w-12 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground shadow-[0_0_32px_-8px_hsl(var(--primary))]">
          {playing ? <Pause className="h-5 w-5 fill-current" /> : <Play className="h-5 w-5 fill-current" />}
        </button>
      </div>
      <Waveform bars={40} playing={playing} className="mt-4 h-8 w-full justify-between" color="bg-primary" />
      <ul className="mt-4 space-y-1">
        {TRACKS.map((x, i) => (
          <li key={x.t}>
            <button onClick={() => { setCur(i); setPlaying(true); }} className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-start text-sm transition-colors ${i === cur ? 'bg-primary/10 text-foreground' : 'text-muted-foreground hover:bg-white/[.04]'}`}>
              <span className={`grid h-7 w-7 place-items-center rounded-lg text-xs font-bold ${i === cur ? 'bg-primary text-primary-foreground' : 'bg-white/[.06]'}`}>{fa(i + 1)}</span>
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
    <section id="morshed" className="relative scroll-mt-20 overflow-hidden px-4 py-16 md:py-24">
      <div className="absolute start-[10%] top-1/4 -z-10 h-80 w-80 rounded-full bg-primary/[.07] blur-[120px]" aria-hidden />
      <div className="mx-auto grid max-w-6xl items-center gap-10 lg:grid-cols-[1.1fr_1fr] lg:gap-14">
        <div className="reveal min-w-0">
          <Eyebrow>MORSHED</Eyebrow>
          <h2 className={H2}>{b.title} <span className="text-primary">{b.accent}</span></h2>
          <p className={LEAD}>{b.text}</p>
          <div className="mt-6 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            {b.chips.slice(0, 4).map((c, i) => {
              const Icon = MODE_ICONS[i % MODE_ICONS.length];
              return (
                <div key={c} className={`group flex flex-col items-center gap-2 p-3 text-center ${CARD}`}>
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground"><Icon className="h-5 w-5" /></span>
                  <span className="text-sm font-bold">{c}</span>
                </div>
              );
            })}
          </div>
          <div className="mt-5 flex flex-wrap gap-2 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/[.04] px-3 py-1.5"><Headphones className="h-3.5 w-3.5 text-primary" />موزیک بر اساس ریتم</span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/[.04] px-3 py-1.5"><Podcast className="h-3.5 w-3.5 text-primary" />پادکست ورزش و سلامت</span>
          </div>
        </div>
        <div className="reveal min-w-0"><MorshedPlayer /></div>
      </div>
    </section>
  );
}

const FEATURES: { icon: LucideIcon; t: string; d: string }[] = [
  { icon: Dumbbell, t: 'برنامه‌ی تمرینی', d: 'متناسب با سطح و هدفت' },
  { icon: Salad, t: 'تغذیه و کالری', d: 'ثبت وعده و ماکرو' },
  { icon: Bot, t: 'مربی هوشمند', d: 'پاسخ فوری به سؤال‌ها' },
  { icon: LineChart, t: 'پیگیری پیشرفت', d: 'نمودار وزن و جلسه‌ها' },
];

function PhoneMock() {
  const msgs = ['سلام! هدفت چیه؟', 'می‌خوام ۵ کیلو کم کنم', 'برنامه‌ی ۴ روزه برات ساختم ✓'];
  const [n, setN] = useState(1);
  useEffect(() => { const t = setInterval(() => setN((x) => (x >= 3 ? 1 : x + 1)), 1800); return () => clearInterval(t); }, []);
  return (
    <div className="relative mx-auto w-[min(270px,78vw)] rounded-[40px] border border-white/15 bg-bg1 p-2.5 shadow-[0_30px_90px_-30px_hsl(var(--primary)/.35)]" aria-hidden>
      <div className="mx-auto mb-2.5 h-4 w-20 rounded-full bg-black" />
      <div className="min-h-[104px] space-y-1.5 px-1">
        {msgs.slice(0, n).map((m, i) => <div key={i} className={`max-w-[85%] rounded-2xl px-3 py-1.5 text-xs leading-6 ${i % 2 ? 'ms-auto bg-primary text-primary-foreground' : 'bg-white/[.07]'}`}>{m}</div>)}
      </div>
      <div className="mt-2.5 rounded-2xl bg-white/[.05] p-2.5">
        <div className="mb-1.5 text-[11px] font-bold">ماکروی امروز</div>
        <div className="flex justify-between">
          {([['پروتئین', 72, 'hsl(var(--primary))'], ['کربو', 54, 'hsl(var(--primary) / .65)'], ['چربی', 40, 'hsl(var(--primary) / .4)']] as const).map(([l, v, c]) => (
            <div key={l} className="text-center"><ProgressRing value={v} size={46} stroke={4} color={c}><span className="text-[10px]">{fa(v)}٪</span></ProgressRing><div className="mt-1 text-[10px] text-muted-foreground">{l}</div></div>
          ))}
        </div>
      </div>
      <div className="mt-2.5 rounded-2xl bg-white/[.05] p-2.5">
        <div className="mb-1 flex items-center justify-between text-[11px]"><span className="font-bold">برنامه‌ی امروز</span><span className="text-primary">۲ از ۴</span></div>
        {['اسکوات ۴×۱۰', 'پرس سینه ۳×۱۲'].map((x, i) => <div key={x} className="flex items-center gap-2 py-0.5 text-xs"><span className={`grid h-4 w-4 place-items-center rounded-full ${i === 0 ? 'bg-primary text-primary-foreground' : 'border border-white/20'}`}>{i === 0 && <Check className="h-3 w-3" />}</span>{x}</div>)}
      </div>
    </div>
  );
}

export function BodyyarSection() {
  const b = useBlock('bodyyar');
  return (
    <section id="bodyyar" className="relative scroll-mt-20 overflow-hidden px-4 py-16 md:py-24">
      <div className="absolute end-0 top-10 -z-10 h-80 w-80 rounded-full bg-primary/[.08] blur-[120px]" aria-hidden />
      <div className="mx-auto grid max-w-6xl items-center gap-10 lg:grid-cols-[1fr_1.15fr] lg:gap-14">
        <div className="reveal order-2 lg:order-1"><PhoneMock /></div>
        <div className="reveal order-1 min-w-0 lg:order-2">
          <Eyebrow>BODYYAR</Eyebrow>
          <h2 className={H2}>{b.title} <span className="text-primary">{b.accent}</span></h2>
          <p className={LEAD}>{b.text}</p>
          <div className="mt-6 grid grid-cols-2 gap-2.5">
            {FEATURES.map(({ icon: Icon, t, d }) => (
              <div key={t} className={`flex items-start gap-3 p-3 ${CARD}`}>
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary"><Icon className="h-4 w-4" /></span>
                <div className="min-w-0"><div className="text-sm font-bold">{t}</div><div className="mt-0.5 text-xs leading-5 text-muted-foreground">{d}</div></div>
              </div>
            ))}
          </div>
          {b.steps.length > 0 && <ol className="mt-4 flex flex-wrap gap-1.5 text-xs">
            {b.steps.map((s, i) => (
              <li key={s} className="inline-flex items-center gap-1.5 rounded-full bg-white/[.04] px-2.5 py-1 text-muted-foreground"><span className="font-bold text-primary">{fa(i + 1)}</span>{s}</li>
            ))}
          </ol>}
          <Link to="/app" className="press tap mt-6 inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-bold text-primary-foreground">شروع با بدن‌یار <ArrowLeft className="h-4 w-4" /></Link>
        </div>
      </div>
    </section>
  );
}

const PERKS: { icon: LucideIcon; t: string }[] = [
  { icon: BadgePercent, t: 'تخفیف ویژه‌ی اعضای کایار' },
  { icon: Truck, t: 'ارسال سریع به سراسر ایران' },
  { icon: ShieldCheck, t: 'ضمانت اصالت کالا' },
];

export function ShopSection() {
  const s = usePublicSettings();
  const shop = s?.shopUrl || 'https://kapoosh.ir';
  const cats = [
    { img: '/media/kapoosh_hero_man.jpg', t: 'لباس تمرین آقایان', d: 'تیشرت، شلوارک و ست ورزشی' },
    { img: '/media/kapoosh_cta_woman.jpg', t: 'لباس تمرین بانوان', d: 'ست، لگ و حجاب ورزشی' },
  ];
  return (
    <section id="shop" className="relative scroll-mt-20 px-4 py-16 md:py-24">
      <div className="mx-auto max-w-6xl">
        <div className="reveal mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <Eyebrow>KAPOOSH STORE</Eyebrow>
            <h2 className={H2}>فروشگاه و <span className="text-primary">پیشنهادهای کاپوش</span></h2>
            <p className={LEAD}>لباس و تجهیزات تمرین از کاپوش و برندهای همراه کایار — با پیشنهادهای ویژه برای اعضا.</p>
          </div>
          <a href={shop} target="_blank" rel="noopener" className="press tap inline-flex shrink-0 items-center gap-2 self-start rounded-full border border-primary/40 px-5 py-2.5 text-sm font-bold text-primary hover:bg-primary hover:text-primary-foreground md:self-auto">
            <ShoppingBag className="h-4 w-4" />ورود به فروشگاه
          </a>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          {cats.map((c) => (
            <a key={c.t} href={shop} target="_blank" rel="noopener" className="reveal group relative block h-56 overflow-hidden rounded-3xl border border-white/[.08] md:h-72">
              <img src={c.img} alt={c.t} loading="lazy" className="absolute inset-0 h-full w-full object-cover object-top transition-transform duration-700 group-hover:scale-105" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-4">
                <div><div className="font-black">{c.t}</div><div className="text-xs text-white/70">{c.d}</div></div>
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground transition-transform group-hover:-translate-x-1"><ArrowUpLeft className="h-4 w-4" /></span>
              </div>
            </a>
          ))}
          <div className="reveal flex flex-col justify-between gap-4 rounded-3xl border border-primary/25 bg-gradient-to-br from-primary/15 to-primary/[.03] p-5">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-primary px-2.5 py-1 text-[11px] font-bold text-primary-foreground"><BadgePercent className="h-3.5 w-3.5" />پیشنهاد اعضا</span>
              <div className="mt-3 text-lg font-black leading-8">با هر خرید از کاپوش، دسترسی کایار هدیه بگیر</div>
              <ul className="mt-3 space-y-2">
                {PERKS.map(({ icon: I, t }) => <li key={t} className="flex items-center gap-2 text-sm text-muted-foreground"><I className="h-4 w-4 text-primary" />{t}</li>)}
              </ul>
            </div>
            <a href={shop} target="_blank" rel="noopener" className="press tap inline-flex items-center justify-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground"><Shirt className="h-4 w-4" />مشاهده‌ی محصولات</a>
          </div>
        </div>
        <div className="reveal mt-3 flex flex-col items-start gap-3 rounded-2xl border border-white/[.08] bg-white/[.03] p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary"><Handshake className="h-5 w-5" /></span>
            <div><div className="text-sm font-bold">فروشنده یا برند ورزشی هستید؟</div><div className="text-xs text-muted-foreground">محصولاتتان را به‌عنوان همکار یا اسپانسر کنار کایار معرفی کنید.</div></div>
          </div>
          <Link to="/p/contact" className="press tap inline-flex items-center gap-1.5 rounded-full bg-white/[.06] px-4 py-2 text-sm font-bold hover:bg-white/10">همکاری با ما <ArrowLeft className="h-4 w-4" /></Link>
        </div>
      </div>
    </section>
  );
}
