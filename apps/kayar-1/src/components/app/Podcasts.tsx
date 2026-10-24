import { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Mic2, RefreshCw, ArrowRight, Play } from 'lucide-react';
import { Skeleton } from '@project/components/ui/skeleton';
import { morshedPodcasts, type MorshedPodcastsOutputType } from 'zitejs/api';
import { Cover, StateView } from '../kit';
import { useSession, errMsg } from '../../lib/session';
import { usePreview } from '../../lib/preview';
import { fa } from '../../lib/config';
import { TrackRow } from './Morshed';
import type { Track } from '../../data/sample';

type Show = MorshedPodcastsOutputType['shows'][0];
const hue = (s: string) => [...s].reduce((a, c) => (a * 31 + c.charCodeAt(0)) % 360, 7);
const Loading = () => <div className="mt-5 space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-[72px] rounded-2xl" />)}</div>;

function ShowView({ id, onBack }: { id: string; onBack: () => void }) {
  const { token } = useSession('app');
  const { play } = usePreview();
  const [d, setD] = useState<MorshedPodcastsOutputType | null>(null); const [err, setErr] = useState<string>();
  const load = useCallback(() => { if (!token) return; setErr(undefined); setD(null); morshedPodcasts({ token, showId: id }).then(setD).catch((e) => setErr(errMsg(e))); }, [token, id]);
  useEffect(load, [load]);
  const eps = (d?.episodes ?? []) as Track[];
  return (
    <div className="mt-4">
      <button onClick={onBack} className="tap -ms-2 flex items-center gap-1 rounded-full px-2 text-sm font-bold text-muted-foreground"><ArrowRight className="h-4 w-4" />همه‌ی پادکست‌ها</button>
      {err ? <StateView icon={RefreshCw} tone="lime" title="پادکست بارگذاری نشد" text={err} action={<button onClick={load} className="tap rounded-full bg-primary px-5 font-bold text-primary-foreground">تلاش دوباره</button>} />
        : !d?.show ? <Loading /> : <>
          <div className="relative mt-3 overflow-hidden rounded-[32px] border border-border p-5">
            {d.show.artwork && <img src={d.show.artwork} alt="" className="absolute inset-0 h-full w-full scale-125 object-cover opacity-40 blur-2xl" />}
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-background/30" />
            <div className="relative flex items-end gap-4">
              <Cover hue={hue(d.show.id)} image={d.show.artwork} className="h-28 w-28 shrink-0 rounded-3xl shadow-2xl ring-1 ring-white/10" />
              <div className="min-w-0 flex-1"><span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-bold text-primary">پادکست · {fa(eps.length)} قسمت</span>
                <h2 className="mt-1.5 line-clamp-2 text-xl font-black leading-tight">{d.show.title}</h2><p className="truncate text-sm text-muted-foreground">{d.show.author}</p></div>
            </div>
            {d.show.description && <p className="relative mt-4 line-clamp-3 text-sm leading-7 text-muted-foreground">{d.show.description.replace(/<[^>]+>/g, '')}</p>}
            {eps.length > 0 && <button onClick={() => play(eps[0], eps)} className="press relative mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-primary text-sm font-black text-primary-foreground glow"><Play className="h-4 w-4 fill-current" />پخش جدیدترین قسمت</button>}
          </div>
          {d.show.syncError && <p className="mt-2 text-xs text-gold">به‌روزرسانی فید با خطا روبه‌رو شد؛ آخرین قسمت‌های ذخیره‌شده نمایش داده می‌شوند.</p>}
          {eps.length > 0 && <h3 className="mt-6 text-sm font-black text-muted-foreground">همه‌ی قسمت‌ها</h3>}
          {eps.length ? <ul className="mt-4 space-y-1">{eps.map((t, i) => <TrackRow key={t.id} t={t} i={i} list={eps} />)}</ul> : <StateView icon={Mic2} tone="lime" title="هنوز قسمتی نیست" text="به‌زودی قسمت‌های این پادکست اینجا می‌آید." />}
        </>}
    </div>
  );
}

/** Podcast shows managed from the admin panel (RSS feeds), played through the shared player. */
export function Podcasts() {
  const { token } = useSession('app');
  const [shows, setShows] = useState<Show[] | null>(null); const [err, setErr] = useState<string>(); const [open, setOpen] = useState<string | null>(null);
  const load = useCallback(() => { if (!token) return; setErr(undefined); morshedPodcasts({ token }).then((r) => setShows(r.shows)).catch((e) => setErr(errMsg(e))); }, [token]);
  useEffect(load, [load]);
  if (open) return <ShowView id={open} onBack={() => setOpen(null)} />;
  if (err) return <div className="mt-6"><StateView icon={RefreshCw} tone="lime" title="پادکست‌ها بارگذاری نشد" text={err} action={<button onClick={load} className="tap rounded-full bg-primary px-5 font-bold text-primary-foreground">تلاش دوباره</button>} /></div>;
  if (!shows) return <Loading />;
  if (!shows.length) return <div className="mt-6"><StateView icon={Mic2} tone="lime" title="هنوز پادکستی منتشر نشده" text="به‌زودی پادکست‌های ورزشی اینجا اضافه می‌شوند." /></div>;
  return (
    <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
      {shows.map((s, i) => (
        <motion.button key={s.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }} onClick={() => setOpen(s.id)} className="press group text-start">
          <div className="relative overflow-hidden rounded-3xl ring-1 ring-white/10">
            <Cover hue={hue(s.id)} image={s.artwork} className="aspect-square w-full rounded-3xl transition duration-500 group-hover:scale-105" />
            <span className="absolute bottom-2 start-2 rounded-full bg-black/70 px-2 py-0.5 text-[10px] font-bold text-primary backdrop-blur">{fa(s.episodeCount)} قسمت</span>
            <span className="absolute bottom-2 end-2 grid h-9 w-9 place-items-center rounded-full bg-primary text-primary-foreground opacity-90 shadow-lg"><Play className="h-4 w-4 fill-current" /></span>
          </div>
          <div className="mt-2 line-clamp-1 font-bold">{s.title}</div>
          <div className="truncate text-xs text-muted-foreground">{s.author || 'پادکست'}</div>
        </motion.button>
      ))}
    </div>
  );
}
