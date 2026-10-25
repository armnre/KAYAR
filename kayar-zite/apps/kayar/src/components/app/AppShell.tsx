import { useState } from 'react';
import { NavLink, Outlet, Navigate, useLocation, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Home, Headphones, Sparkles, User, Play, Pause, SkipForward, SkipBack, ChevronDown, Timer, Heart, Bell, X, Loader2, RotateCw, Volume2, ListMusic, ExternalLink } from 'lucide-react';
import { cn } from '@project/components/lib/utils';
import { KayarLogo, Cover, Waveform } from '../kit';
import { usePreview } from '../../lib/preview';
import { useSession } from '../../lib/session';
import { fa } from '../../lib/config';
import { KayarAvatar } from '../KayarAvatar';

function NavMe() { const { member } = useSession('app'); return <KayarAvatar name={member?.displayName} avatar={member?.avatar} size={26} />; }
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@project/components/ui/dropdown-menu';

const nav = [
  { to: '/app', label: 'خانه', icon: Home, end: true },
  { to: '/app/morshed', label: 'مرشد', icon: Headphones },
  { to: '/app/bodyyar', label: 'بدن‌یار', icon: Sparkles, center: true },
  { to: '/app/profile', label: 'پروفایل', icon: User },
];
export const fmt = (s: number) => `${fa(Math.floor(s / 60))}:${fa(String(Math.floor(s % 60)).padStart(2, '0'))}`;

function PlayBtn({ big }: { big?: boolean }) {
  const { playing, toggle, buffering, error } = usePreview();
  const sz = big ? 'h-8 w-8' : 'h-5 w-5';
  return (
    <button className={big ? 'press grid h-20 w-20 place-items-center rounded-full bg-primary text-primary-foreground shadow-[0_0_40px_hsl(var(--primary)/.55)]' : 'tap grid place-items-center rounded-full'} onClick={toggle} aria-label={error ? 'تلاش دوباره' : playing ? 'توقف' : 'پخش'}>
      {error ? <RotateCw className={sz} /> : buffering ? <Loader2 className={cn(sz, 'animate-spin')} /> : playing ? <Pause className={cn(sz, 'fill-current')} /> : <Play className={cn(sz, 'fill-current')} />}
    </button>
  );
}

function MiniPlayer() {
  const { track, next, stop, progress, duration, setFullPlayer, error } = usePreview();
  if (!track) return null;
  return (
    <div className="relative mx-3 flex items-center gap-2 overflow-hidden rounded-2xl border border-border bg-card p-2 pe-1 shadow-lg lg:mx-0">
      <button className="flex min-w-0 flex-1 items-center gap-3 text-start" onClick={() => setFullPlayer(true)} aria-label="باز کردن پلیر">
        <Cover hue={track.hue} image={track.image} title={track.title} className="h-11 w-11 shrink-0 rounded-xl" />
        <div className="min-w-0"><div className="truncate text-sm font-bold">{track.title}</div><div className={cn('truncate text-xs', error ? 'text-destructive' : 'text-muted-foreground')}>{error ? 'پخش ممکن نشد؛ دوباره تلاش کن' : track.artist}</div></div>
      </button>
      <PlayBtn />
      <button className="tap grid place-items-center rounded-full" onClick={() => next()} aria-label="بعدی"><SkipForward className="h-5 w-5 -scale-x-100 fill-current" /></button>
      <button className="tap grid place-items-center rounded-full text-muted-foreground hover:text-foreground" onClick={stop} aria-label="بستن پلیر"><X className="h-5 w-5" /></button>
      <span className="absolute inset-x-0 bottom-0 h-0.5 bg-white/10"><span className="block h-full bg-primary" style={{ width: `${duration ? (progress / duration) * 100 : 0}%` }} /></span>
    </div>
  );
}

function QueueList({ close }: { close: () => void }) {
  const { queue, track, play } = usePreview();
  return (
    <div className="mt-4 max-h-64 overflow-y-auto rounded-3xl border border-border bg-card p-2">
      <div className="flex items-center justify-between px-2 py-1 text-sm font-bold"><span>صف پخش ({fa(queue.length)})</span><button onClick={close} className="text-xs text-muted-foreground">بستن</button></div>
      <ul>{queue.map((t) => <li key={t.id}><button onClick={() => play(t)} className={cn('flex w-full items-center gap-3 rounded-2xl p-2 text-start', t.id === track?.id && 'bg-violet/15')}><Cover hue={t.hue} image={t.image} title={t.title} className="h-9 w-9 shrink-0 rounded-lg" /><span className="min-w-0 flex-1"><span className="block truncate text-sm font-bold">{t.title}</span><span className="block truncate text-xs text-muted-foreground">{t.artist}</span></span></button></li>)}</ul>
    </div>
  );
}

function UpNext() {
  const { queue, track, play } = usePreview();
  const i = queue.findIndex((t) => t.id === track?.id);
  const n = i >= 0 ? queue[i + 1] : undefined;
  if (!n) return null;
  return (
    <button onClick={() => play(n)} className="press mt-5 flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-white/[.06] p-2.5 text-start backdrop-blur-xl">
      <Cover hue={n.hue} image={n.image} title={n.title} className="h-10 w-10 shrink-0 rounded-xl" />
      <span className="min-w-0 flex-1"><span className="block text-[10px] font-bold text-primary">بعدی</span><span className="block truncate text-sm font-bold" dir="auto">{n.title}</span></span>
      <span className="truncate text-xs text-white/50" dir="auto">{n.artist}</span>
    </button>
  );
}

function FullPlayer() {
  const { track, playing, next, progress, duration, setProgress, fullPlayer, setFullPlayer, favs, toggleFav, volume, setVolume, sleepAt, setSleep, error, retry } = usePreview();
  const [showQueue, setShowQueue] = useState(false);
  const pct = duration ? (progress / duration) * 100 : 0;
  return (
    <AnimatePresence>
      {fullPlayer && track && (
        <motion.div role="dialog" aria-modal aria-label="پلیر" initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          drag="y" dragConstraints={{ top: 0, bottom: 0 }} dragElastic={{ top: 0, bottom: 0.6 }} onDragEnd={(_, i) => { if (i.offset.y > 140) setFullPlayer(false); }}
          className="fixed inset-0 z-[60] flex flex-col overflow-hidden bg-black px-6 pb-[calc(24px+var(--safe-b))] pt-[calc(12px+var(--safe-t))] text-white">
          {track.image && <img src={track.image} alt="" className="absolute inset-0 -z-20 h-full w-full scale-125 object-cover opacity-60 blur-3xl" />}
          <div className="absolute inset-0 -z-10 bg-gradient-to-b from-black/30 via-black/60 to-black" style={track.image ? undefined : { background: `radial-gradient(80% 50% at 50% 20%, hsl(${track.hue} 80% 45% / .6), #000)` }} />
          <div className="mx-auto flex w-full max-w-md items-center justify-between">
            <button className="tap grid place-items-center rounded-full bg-white/10 backdrop-blur" onClick={() => setFullPlayer(false)} aria-label="بستن پلیر"><ChevronDown className="h-6 w-6" /></button>
            <div className="text-center"><div className="font-latin text-[10px] font-black tracking-[.3em] text-primary">{track.source === 'podcast' ? 'PODCAST' : 'NOW PLAYING'}</div><div className="text-xs text-white/60">{track.source === 'podcast' ? 'پادکست' : 'مرشد کایار'}</div></div>
            <button className={cn('tap grid place-items-center rounded-full backdrop-blur', showQueue ? 'bg-primary text-primary-foreground' : 'bg-white/10')} onClick={() => setShowQueue((v) => !v)} aria-label="صف پخش" aria-pressed={showQueue}><ListMusic className="h-5 w-5" /></button>
          </div>
          <div className="mx-auto mt-4 flex w-full max-w-md flex-1 flex-col justify-center overflow-y-auto">
            {showQueue ? <QueueList close={() => setShowQueue(false)} /> : (
              <div className="relative">
                <motion.div className="absolute inset-6 rounded-[40px] bg-primary/40 blur-3xl" animate={{ opacity: playing ? [0.4, 0.8, 0.4] : 0.2, scale: playing ? [0.95, 1.05, 0.95] : 0.9 }} transition={{ duration: 3, repeat: Infinity }} />
                <motion.div key={track.id} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: playing ? 1 : 0.88 }} transition={{ type: 'spring', stiffness: 180, damping: 20 }}>
                  <Cover hue={track.hue} image={track.image} title={track.title} className="relative aspect-square w-full rounded-[36px] shadow-[0_30px_80px_-20px_rgba(0,0,0,.9)] ring-1 ring-white/10" />
                </motion.div>
              </div>
            )}
            <div className="mt-7 flex items-center gap-3">
              <motion.div key={track.id + 't'} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="min-w-0 flex-1"><h2 className="truncate text-[26px] font-black leading-tight" dir="auto">{track.title}</h2><p className="truncate text-white/60" dir="auto">{track.artist}{track.album ? ` · ${track.album}` : ''}</p></motion.div>
              <motion.button whileTap={{ scale: 1.4 }} className="tap grid place-items-center rounded-full bg-white/10" onClick={() => toggleFav(track.id)} aria-label="علاقه‌مندی" aria-pressed={favs.has(track.id)}><Heart className={cn('h-6 w-6', favs.has(track.id) && 'fill-primary text-primary')} /></motion.button>
            </div>
            {error ? <button onClick={retry} className="mt-5 flex h-11 items-center justify-center gap-2 rounded-2xl border border-destructive/40 text-sm text-destructive"><RotateCw className="h-4 w-4" />پخش ممکن نشد؛ تلاش دوباره</button>
              : <Waveform bars={48} playing={playing} className="mt-5 h-8 w-full justify-between opacity-80" color="bg-primary" />}
            <div className="relative mt-3 h-11" dir="ltr">
              <div className="absolute inset-x-0 top-1/2 h-1.5 -translate-y-1/2 overflow-hidden rounded-full bg-white/15"><div className="h-full rounded-full bg-gradient-to-r from-primary/70 to-primary shadow-[0_0_12px_hsl(var(--primary))]" style={{ width: `${pct}%` }} /></div>
              <div className="pointer-events-none absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow-lg" style={{ left: `${pct}%` }} />
              <input type="range" min={0} max={Math.max(1, Math.floor(duration))} value={Math.floor(progress)} onChange={(e) => setProgress(Number(e.target.value))} aria-label="پیشرفت" className="absolute inset-0 w-full cursor-pointer opacity-0" />
            </div>
            <div className="flex justify-between text-xs tabular-nums text-white/50" dir="ltr"><span>{fmt(progress)}</span><span>{fmt(duration)}</span></div>
            <div className="mt-4 flex items-center justify-between">
              <DropdownMenu><DropdownMenuTrigger className={cn('tap grid place-items-center rounded-full', sleepAt ? 'text-primary' : 'text-white/60')} aria-label="تایمر خواب"><Timer className="h-6 w-6" /></DropdownMenuTrigger>
                <DropdownMenuContent>{[15, 30, 45, 60].map((m) => <DropdownMenuItem key={m} onClick={() => setSleep(m)}>{fa(m)} دقیقه</DropdownMenuItem>)}{sleepAt && <DropdownMenuItem onClick={() => setSleep(null)}>لغو تایمر</DropdownMenuItem>}</DropdownMenuContent></DropdownMenu>
              <button className="tap grid h-14 w-14 place-items-center rounded-full" onClick={() => next(-1)} aria-label="قبلی"><SkipBack className="h-8 w-8 -scale-x-100 fill-current" /></button>
              <PlayBtn big />
              <button className="tap grid h-14 w-14 place-items-center rounded-full" onClick={() => next()} aria-label="بعدی"><SkipForward className="h-8 w-8 -scale-x-100 fill-current" /></button>
              {track.shareUrl ? <a href={track.shareUrl} target="_blank" rel="noopener noreferrer" className="tap grid place-items-center rounded-full text-white/60" aria-label="آهنگ کامل در منبع"><ExternalLink className="h-5 w-5" /></a> : <span className="w-11" />}
            </div>
            <label className="mt-3 flex items-center gap-3 text-white/50"><Volume2 className="h-4 w-4" /><input type="range" min={0} max={1} step={0.05} value={volume} onChange={(e) => setVolume(Number(e.target.value))} aria-label="صدا" className="h-1 w-full accent-[hsl(var(--primary))]" dir="ltr" /></label>
            {!showQueue && <UpNext />}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default function AppShell() {
  const { member, loading } = useSession('app');
  const loc = useLocation();
  if (loading) return <div className="grid min-h-svh place-items-center depth-bg"><KayarLogo className="animate-pulse text-xl" /></div>;
  if (!member) return <Navigate to={`/app/login?returnTo=${encodeURIComponent(loc.pathname)}`} replace />;
  if (member.mustChangePassword) return <Navigate to="/app/change-password" replace />;
  const activeIdx = nav.findIndex((n) => (n.end ? loc.pathname === n.to : loc.pathname.startsWith(n.to)));
  return (
    <div className="min-h-svh depth-bg">
      <div className="lg:grid lg:grid-cols-[260px_1fr]">
        <aside className="sticky top-0 hidden h-svh flex-col border-e border-white/5 p-5 lg:flex">
          <KayarLogo className="mb-8 text-lg" />
          <nav className="space-y-1">{nav.map((n) => <NavLink key={n.to} to={n.to} end={n.end} className={({ isActive }) => cn('tap flex items-center gap-3 rounded-2xl px-4 py-3 font-bold transition-colors', isActive ? 'bg-primary text-primary-foreground glow' : 'text-muted-foreground hover:bg-white/5 hover:text-foreground')}><n.icon className="h-5 w-5" />{n.label}</NavLink>)}</nav>
          <div className="mt-auto"><MiniPlayer /></div>
        </aside>
        <div className="min-w-0">
          <header className="sticky top-0 z-30 flex h-[var(--header-h)] items-center justify-between border-b border-border bg-background px-4 lg:hidden">
            <KayarLogo className="text-base" />
            <Link to="/app/notifications" className="tap grid place-items-center rounded-full" aria-label="اعلان‌ها"><Bell className="h-5 w-5" /></Link>
          </header>
          <main className="mx-auto max-w-3xl px-4 pb-[calc(var(--nav-h)+var(--safe-b)+88px)] pt-5 lg:pb-12">
            <motion.div key={loc.pathname} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.28, ease: 'easeOut' }}><Outlet /></motion.div>
          </main>
        </div>
      </div>
      <div className="fixed inset-x-0 bottom-0 z-40 lg:hidden">
        <div className="mb-2"><MiniPlayer /></div>
        <nav className="relative grid border-t border-border bg-background shadow-[0_-8px_24px_rgb(0_0_0/.35)] h-[calc(var(--nav-h)+var(--safe-b))] grid-cols-4 rounded-none border-x-0 border-b-0 pb-[var(--safe-b)]" aria-label="ناوبری اصلی">
          {activeIdx >= 0 && !nav[activeIdx].center && <span className="absolute top-0 h-0.5 w-1/4 rounded-full bg-primary glow transition-transform duration-300" style={{ insetInlineStart: 0, transform: `translateX(${-activeIdx * 100}%)` }} />}
          {nav.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.end} className={({ isActive }) => cn('flex flex-col items-center justify-center gap-0.5 text-xs font-bold', isActive ? 'text-primary' : 'text-muted-foreground')}>
              {n.center ? <span className="-mt-7 grid h-14 w-14 place-items-center rounded-2xl bg-primary text-primary-foreground animate-pulse-glow"><n.icon className="h-6 w-6" /></span> : n.to === '/app/profile' ? <NavMe /> : <n.icon className="h-6 w-6" />}
              {n.label}
            </NavLink>
          ))}
        </nav>
      </div>
      <FullPlayer />
    </div>
  );
}
