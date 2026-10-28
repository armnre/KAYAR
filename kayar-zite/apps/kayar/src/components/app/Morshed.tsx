import { useEffect, useState } from 'react';
import { appLibrary, type AppLibraryOutputType } from 'zitejs/api';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Heart, SearchX, RefreshCw, Music2, Mic2, Play, Pause, Zap, Dumbbell, HeartPulse, Leaf, X, Waves, ArrowLeft, Flame, Disc3, PartyPopper, Guitar } from 'lucide-react';
import { cn } from '@project/components/lib/utils';
import { Skeleton } from '@project/components/ui/skeleton';
import { Cover, Waveform, StateView } from '../kit';
import { fmt } from './AppShell';
import { H, useMorshed } from './HomeMorshed';
import { useSession, errMsg } from '../../lib/session';
import { Podcasts } from './Podcasts';
import { usePreview } from '../../lib/preview';
import type { Track } from '../../data/sample';
import { fa } from '../../lib/config';

type Lang = 'all' | 'fa' | 'en' | 'trending';
const LANGS: { k: Lang; l: string; i: typeof Zap }[] = [{ k: 'all', l: 'همه', i: Waves }, { k: 'fa', l: 'فارسی', i: Music2 }, { k: 'en', l: 'خارجی', i: Zap }, { k: 'trending', l: 'ترند', i: Flame }];
const STYLE_G: Record<string, { g: string; i: typeof Zap }> = {
  trending: { g: 'from-[hsl(14_95%_55%)] to-[hsl(340_70%_25%)]', i: Flame },
  'fa-pop': { g: 'from-[hsl(71_100%_50%)] to-[hsl(100_60%_22%)]', i: Music2 }, 'fa-rap': { g: 'from-[hsl(0_0%_32%)] to-[hsl(0_0%_6%)]', i: Mic2 },
  'fa-classic': { g: 'from-[hsl(40_90%_55%)] to-[hsl(20_60%_20%)]', i: Disc3 }, 'fa-traditional': { g: 'from-[hsl(160_50%_40%)] to-[hsl(180_40%_12%)]', i: Leaf },
  'fa-dance': { g: 'from-[hsl(320_80%_58%)] to-[hsl(280_50%_20%)]', i: PartyPopper }, 'fa-rock': { g: 'from-[hsl(0_70%_45%)] to-[hsl(0_40%_12%)]', i: Guitar },
  'en-pop': { g: 'from-[hsl(300_70%_60%)] to-[hsl(260_50%_22%)]', i: Music2 }, 'en-hiphop': { g: 'from-[hsl(45_90%_50%)] to-[hsl(30_50%_12%)]', i: Mic2 },
  'en-edm': { g: 'from-[hsl(190_90%_50%)] to-[hsl(220_60%_16%)]', i: HeartPulse }, 'en-rock': { g: 'from-[hsl(10_80%_48%)] to-[hsl(0_0%_8%)]', i: Guitar },
  'en-rnb': { g: 'from-[hsl(270_60%_55%)] to-[hsl(240_40%_15%)]', i: Heart }, 'en-classic': { g: 'from-[hsl(200_50%_55%)] to-[hsl(210_40%_15%)]', i: Disc3 },
};
const sg = (k: string) => STYLE_G[k] ?? { g: 'from-[hsl(0_0%_30%)] to-[hsl(0_0%_8%)]', i: Dumbbell };

export function TrackRow({ t, i, list }: { t: Track; i: number; list: Track[] }) {
  const { play, toggle, track, playing, favs, toggleFav } = usePreview();
  const active = track?.id === t.id;
  return (
    <motion.li layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i, 10) * 0.03 }}
      className={cn('group flex items-center gap-3 rounded-2xl p-2 transition-colors hover:bg-white/[.04]', active && 'bg-primary/10 ring-1 ring-primary/30')}>
      <button onClick={() => (active ? toggle() : play(t, list))} className="flex min-w-0 flex-1 items-center gap-3 text-start" aria-label={`پخش ${t.title}`}>
        <Cover hue={t.hue} image={t.image} title={t.title} className="relative h-14 w-14 shrink-0 rounded-xl">
          <span className={cn('absolute inset-0 grid place-items-center rounded-xl bg-black/45 transition-opacity', active ? 'opacity-100' : 'opacity-0 group-hover:opacity-100')}>
            {active && playing ? <Waveform bars={3} playing className="h-4" color="bg-white" /> : <Play className="h-5 w-5 fill-white text-white" />}
          </span>
        </Cover>
        <span className="min-w-0"><span className={cn('block truncate font-bold', active && 'text-primary')}>{t.title}</span><span className="block truncate text-sm text-muted-foreground">{t.artist}</span></span>
      </button>
      <span className="hidden text-xs tabular-nums text-muted-foreground sm:block" dir="ltr">{t.duration ? fmt(t.duration) : ''}</span>
      <button className="tap grid place-items-center rounded-full" onClick={() => toggleFav(t.id)} aria-label="علاقه‌مندی" aria-pressed={favs.has(t.id)}><Heart className={cn('h-5 w-5 transition', favs.has(t.id) ? 'scale-110 fill-primary text-primary' : 'text-muted-foreground')} /></button>
    </motion.li>
  );
}

function Featured({ list }: { list: Track[] }) {
  const { play, track, playing, toggle } = usePreview();
  return (
    <div className="-mx-4 mt-5 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 [scrollbar-width:none]">
      {list.slice(0, 5).map((t, i) => { const active = track?.id === t.id; return (
        <motion.div key={t.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.06 }}
          className="relative h-64 w-[82%] shrink-0 snap-center overflow-hidden rounded-[30px] sm:w-[60%]">
          <Cover hue={t.hue} image={t.image} title={t.title} className="absolute inset-0 h-full w-full rounded-none" />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
          <span className="absolute start-4 top-4 rounded-full bg-black/40 px-3 py-1 text-[11px] font-black text-white backdrop-blur">{i === 0 ? 'پیشنهاد ویژه' : `#${fa(i + 1)}`}</span>
          <div className="absolute inset-x-0 bottom-0 flex items-end gap-3 p-4">
            <div className="min-w-0 flex-1 text-white"><div className="truncate text-xl font-black">{t.title}</div><div className="truncate text-sm text-white/70">{t.artist}</div>
              {active && <Waveform bars={18} playing={playing} className="mt-2 h-4" color="bg-primary" />}</div>
            <button onClick={() => (active ? toggle() : play(t, list))} className="press grid h-14 w-14 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground shadow-[0_8px_30px_hsl(var(--primary)/.5)]" aria-label="پخش">{active && playing ? <Pause className="h-6 w-6 fill-current" /> : <Play className="h-6 w-6 fill-current" />}</button>
          </div>
        </motion.div>); })}
    </div>
  );
}

function TrackTile({ t, list }: { t: Track; list: Track[] }) {
  const { play, track, playing } = usePreview();
  const on = track?.id === t.id;
  return (
    <button onClick={() => play(t, list)} className="press group w-[132px] shrink-0 snap-start text-start">
      <Cover hue={t.hue} image={t.image} title={t.title} className="relative aspect-square w-full rounded-[20px] shadow-lg">
        <span className={cn('absolute bottom-2 end-2 grid h-9 w-9 place-items-center rounded-full bg-primary text-primary-foreground shadow-lg transition', on ? 'scale-100' : 'scale-90 opacity-90 group-hover:scale-100')}>{on && playing ? <Pause className="h-4 w-4 fill-current" /> : <Play className="h-4 w-4 fill-current" />}</span>
      </Cover>
      <div className={cn('mt-2 truncate text-sm font-bold', on && 'text-primary')} dir="auto">{t.title}</div>
      <div className="truncate text-[11px] text-muted-foreground" dir="auto">{t.artist}</div>
    </button>
  );
}

function SearchBox({ q, setQ, placeholder }: { q: string; setQ: (v: string) => void; placeholder: string }) {
  return (
    <div className="relative mt-5"><Search className="absolute start-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={placeholder} aria-label="جست‌وجو" className="h-12 w-full rounded-2xl border border-border bg-card pe-11 ps-12 text-base outline-none transition focus:border-primary" />
      {q && <button onClick={() => setQ('')} className="absolute end-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full text-muted-foreground" aria-label="پاک کردن"><X className="h-4 w-4" /></button>}
    </div>
  );
}
function useDebounced(v: string) { const [d, setD] = useState(v); useEffect(() => { const t = setTimeout(() => setD(v.trim()), 450); return () => clearTimeout(t); }, [v]); return d; }
const Loading = () => <div className="space-y-2">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-[72px] rounded-2xl" />)}</div>;
const Failed = ({ err, retry }: { err: string; retry: () => void }) => <StateView icon={RefreshCw} tone="lime" title="موزیک‌ها بارگذاری نشد" text={err} action={<button onClick={retry} className="tap rounded-full bg-primary px-5 font-bold text-primary-foreground">تلاش دوباره</button>} />;
const Rows = ({ list }: { list: Track[] }) => <ul className="space-y-1">{list.map((t, i) => <TrackRow key={t.id} t={t} i={i} list={list} />)}</ul>;

function Artists({ list, onPick }: { list: { name: string; image: string; count: number }[]; onPick: (n: string) => void }) {
  return (
    <div className="-mx-4 flex gap-4 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
      {list.map((a) => (
        <button key={a.name} onClick={() => onPick(a.name)} className="press w-[84px] shrink-0 text-center">
          <Cover hue={[...a.name].reduce((x, c) => (x * 31 + c.charCodeAt(0)) % 360, 11)} image={a.image || undefined} title={a.name} className="block aspect-square rounded-full text-[11px] ring-2 ring-border transition hover:ring-primary" />
          <span className="mt-2 block truncate text-xs font-bold" dir="auto">{a.name}</span><span className="block text-[10px] text-muted-foreground">{fa(a.count)} آهنگ</span>
        </button>
      ))}
    </div>
  );
}

function Music() {
  const [lang, setLang] = useState<Lang>('all');
  const [cat, setCat] = useState('');
  const [q, setQ] = useState(''); const dq = useDebounced(q);
  const lib = useMorshed('library', dq || undefined, cat || undefined, lang);
  const browse = useMorshed('library', undefined, undefined, lang);
  const libTracks = lib.data?.tracks ?? [];
  const featured = libTracks.filter((t) => t.featured);
  const styles = browse.data?.sections ?? [];
  const catTitle = styles.find((x) => x.key === cat)?.title ?? '';
  return (
    <>
      <SearchBox q={q} setQ={setQ} placeholder="آهنگ، خواننده یا سبک…" />
      <div className="mt-4 flex gap-2 overflow-x-auto [scrollbar-width:none]">
        {LANGS.map((l) => <button key={l.k} onClick={() => { setLang(l.k); setCat(''); }} className={cn('press flex h-10 shrink-0 items-center gap-1.5 rounded-full border px-4 text-sm font-black transition', lang === l.k ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-card text-muted-foreground')}><l.i className="h-4 w-4" />{l.l}</button>)}
      </div>
      {!dq && styles.length > 0 && <div className="-mx-4 mt-3 grid grid-flow-col grid-rows-2 auto-cols-[40%] gap-2.5 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:auto-cols-[22%]">
        {styles.map((m) => { const on = cat === m.key; const st = sg(m.key); return (
          <button key={m.key} onClick={() => setCat(on ? '' : m.key)} className={cn('press relative h-[72px] overflow-hidden rounded-[20px] bg-gradient-to-br p-3 text-start text-white shadow-lg transition', st.g, on ? 'ring-2 ring-primary ring-offset-2 ring-offset-background' : cat ? 'opacity-50' : '')}>
            <st.i className="absolute -bottom-2 -end-2 h-12 w-12 rotate-12 opacity-30" /><span className="relative block text-sm font-black">{m.title}</span><span className="relative text-[10px] font-bold text-white/70">{fa(m.count)} آهنگ</span>
          </button>); })}
      </div>}
      {lib.err ? <Failed err={lib.err} retry={lib.retry} /> : !lib.data ? <div className="mt-5"><Loading /></div> : <>
        {!dq && !cat && featured.length > 0 && <Featured list={featured} />}
        {!dq && !cat && lib.data.artists.length > 0 && <><H t="خواننده‌های محبوب" /><Artists list={lib.data.artists} onPick={setQ} /></>}
        {!dq && !cat && lang === 'all' && lib.data.collections.map((c) => <div key={c.id}><H t={c.title} />{c.description && <p className="-mt-2 mb-2 text-sm text-muted-foreground">{c.description}</p>}<Rows list={c.tracks} /></div>)}
        {!dq && !cat && lib.data.sections.map((sec) => (
          <section key={sec.key}>
            <H t={sec.title} s={<button onClick={() => setCat(sec.key)} className="flex items-center gap-1 text-xs font-bold text-primary">همه {fa(sec.count)}<ArrowLeft className="h-3.5 w-3.5" /></button>} />
            <div className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">{sec.tracks.map((t) => <TrackTile key={t.id} t={t} list={sec.tracks} />)}</div>
          </section>
        ))}
        {(dq || cat) && (libTracks.length > 0 ? <><H t={dq ? `نتایج «${dq}» · ${fa(libTracks.length)}` : `${catTitle} · ${fa(libTracks.length)} آهنگ`} /><Rows list={libTracks} /></> : <StateView icon={SearchX} tone="lime" title="چیزی پیدا نشد" text="عبارت یا سبک دیگری را امتحان کن." />)}
      </>}
    </>
  );
}

function Mine() {
  const { token } = useSession('app');
  const [d, setD] = useState<{ favorites: AppLibraryOutputType['favorites']; history: AppLibraryOutputType['history'] } | null>(null);
  const [err, setErr] = useState<string>();
  const load = () => { if (!token) return; setErr(undefined); setD(null); Promise.all([appLibrary({ token, action: 'favorites' }), appLibrary({ token, action: 'history' })]).then(([f, h]) => setD({ favorites: f.favorites, history: h.history })).catch((e) => setErr(errMsg(e))); };
  useEffect(load, [token]); // eslint-disable-line react-hooks/exhaustive-deps
  if (err) return <Failed err={err} retry={load} />;
  if (!d) return <div className="mt-5"><Loading /></div>;
  const favs = d.favorites.flatMap((f) => (f.track ? [f.track] : []));
  const hist = d.history.flatMap((h) => (h.track ? [h.track] : []));
  const gone = d.favorites.length - favs.length + d.history.length - hist.length;
  return (
    <>
      <H t="آهنگ‌های محبوبت" />
      {favs.length ? <Rows list={favs} /> : <StateView icon={Heart} tone="lime" title="هنوز علاقه‌مندی نداری" text="روی قلب کنار هر آهنگ بزن تا اینجا ذخیره بشه." />}
      <H t="اخیراً شنیدی" />
      {hist.length ? <Rows list={hist} /> : <p className="text-sm text-muted-foreground">هنوز چیزی پخش نکردی.</p>}
      {gone > 0 && <p className="mt-4 text-xs text-muted-foreground">{fa(gone)} مورد دیگر دیگر در دسترس نیست (حذف یا مخفی شده).</p>}
    </>
  );
}

export function Morshed() {
  const [tab, setTab] = useState<'music' | 'podcast' | 'fav'>('music');
  const tabs = [{ k: 'music' as const, l: 'موزیک', i: Music2 }, { k: 'podcast' as const, l: 'پادکست', i: Mic2 }];
  return (
    <div className="pb-6">
      <div className="relative -mx-4 overflow-hidden px-4 pb-2 pt-1">
        <div className="pointer-events-none absolute -top-24 end-0 h-56 w-56 rounded-full bg-primary/15 blur-3xl" />
        <div className="relative flex items-center justify-between">
          <div><p className="text-xs font-bold tracking-widest text-primary">MORSHED</p><h1 className="text-3xl font-black">مرشد</h1></div>
          <button onClick={() => setTab(tab === 'fav' ? 'music' : 'fav')} aria-label="علاقه‌مندی‌ها" aria-pressed={tab === 'fav'}
            className={cn('press grid h-12 w-12 place-items-center rounded-2xl border transition', tab === 'fav' ? 'border-primary bg-primary text-primary-foreground shadow-[0_8px_24px_-6px_hsl(var(--primary)/.6)]' : 'border-border bg-card text-muted-foreground')}>
            <Heart className={cn('h-5 w-5', tab === 'fav' && 'fill-current')} />
          </button>
        </div>
        <div className="relative mt-5 grid grid-cols-2 rounded-full border border-border bg-card/80 p-1 backdrop-blur" role="tablist">
          {tabs.map((t) => (
            <button key={t.k} role="tab" aria-selected={tab === t.k} onClick={() => setTab(t.k)} className={cn('relative z-10 flex h-11 items-center justify-center gap-2 rounded-full text-sm font-black transition-colors', tab === t.k ? 'text-primary-foreground' : 'text-muted-foreground')}>
              {tab === t.k && <motion.span layoutId="mtab" className="absolute inset-0 -z-10 rounded-full bg-primary shadow-[0_6px_20px_-6px_hsl(var(--primary)/.7)]" transition={{ type: 'spring', stiffness: 400, damping: 32 }} />}
              <t.i className="h-4 w-4" />{t.l}
            </button>
          ))}
        </div>
      </div>
      <AnimatePresence mode="wait">
        <motion.div key={tab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
          {tab === 'music' ? <Music /> : tab === 'fav' ? <Mine /> : <Podcasts />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
