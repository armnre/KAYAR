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

const CATS: Record<string, string> = { fitness: 'ورزش و بدنسازی', nutrition: 'تغذیه و سلامت', running: 'دویدن', recovery: 'آرامش و خواب', focus: 'انگیزه و رشد فردی' };
const LANGS = [['all', 'همه'], ['fa', 'فارسی'], ['en', 'English']] as const;

function ShowCard({ s, onOpen, wide }: { s: Show; onOpen: () => void; wide?: boolean }) {
  return (
    <button onClick={onOpen} className={wide ? 'press group text-start' : 'press group w-[132px] shrink-0 snap-start text-start'}>
      <div className="relative overflow-hidden rounded-[22px] ring-1 ring-white/10">
        <Cover hue={hue(s.id)} image={s.artwork} className="aspect-square w-full rounded-[22px] transition duration-500 group-hover:scale-105" />
        <span className="absolute bottom-1.5 start-1.5 rounded-full bg-black/70 px-2 py-0.5 text-[10px] font-bold text-primary backdrop-blur">{fa(s.episodeCount)} قسمت</span>
      </div>
      <div className="mt-2 line-clamp-1 text-sm font-bold" dir="auto">{s.title}</div>
      <div className="truncate text-[11px] text-muted-foreground" dir="auto">{s.author || 'پادکست'}</div>
    </button>
  );
}

/** Podcast shows organized by language and topic; rows are short carousels instead of one long grid. */
export function Podcasts() {
  const { token } = useSession('app');
  const [shows, setShows] = useState<Show[] | null>(null); const [err, setErr] = useState<string>(); const [open, setOpen] = useState<string | null>(null);
  const [lang, setLang] = useState<'all' | 'fa' | 'en'>('all'); const [cat, setCat] = useState<string | null>(null);
  const load = useCallback(() => { if (!token) return; setErr(undefined); morshedPodcasts({ token }).then((r) => setShows(r.shows)).catch((e) => setErr(errMsg(e))); }, [token]);
  useEffect(load, [load]);
  if (open) return <ShowView id={open} onBack={() => setOpen(null)} />;
  if (err) return <div className="mt-6"><StateView icon={RefreshCw} tone="lime" title="پادکست‌ها بارگذاری نشد" text={err} action={<button onClick={load} className="tap rounded-full bg-primary px-5 font-bold text-primary-foreground">تلاش دوباره</button>} /></div>;
  if (!shows) return <Loading />;
  if (!shows.length) return <div className="mt-6"><StateView icon={Mic2} tone="lime" title="هنوز پادکستی منتشر نشده" text="به‌زودی پادکست‌های ورزشی اینجا اضافه می‌شوند." /></div>;
  const pool = shows.filter((s) => lang === 'all' || s.language === lang);
  const cats = Object.keys(CATS).filter((c) => pool.some((s) => s.category === c));
  const featured = pool[0];
  return (
    <div className="mt-5">
      <div className="flex rounded-full border border-border bg-card p-1 text-xs font-bold">
        {LANGS.map(([k, l]) => <button key={k} onClick={() => { setLang(k); setCat(null); }} className={`h-9 flex-1 rounded-full transition ${lang === k ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}>{l}</button>)}
      </div>
      <div className="-mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1">
        <button onClick={() => setCat(null)} className={`shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-bold ${!cat ? 'border-primary bg-primary/15 text-primary' : 'border-border text-muted-foreground'}`}>همه موضوع‌ها</button>
        {cats.map((c) => <button key={c} onClick={() => setCat(c)} className={`shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-bold ${cat === c ? 'border-primary bg-primary/15 text-primary' : 'border-border text-muted-foreground'}`}>{CATS[c]}</button>)}
      </div>
      {cat ? (
        <div className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-4">{pool.filter((s) => s.category === cat).map((s) => <ShowCard key={s.id} s={s} wide onOpen={() => setOpen(s.id)} />)}</div>
      ) : (<>
        {featured && (
          <motion.button initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} onClick={() => setOpen(featured.id)} className="press relative mt-4 flex w-full items-center gap-4 overflow-hidden rounded-[28px] border border-border p-4 text-start">
            {featured.artwork && <img src={featured.artwork} alt="" className="absolute inset-0 h-full w-full scale-125 object-cover opacity-30 blur-2xl" />}
            <Cover hue={hue(featured.id)} image={featured.artwork} className="relative h-20 w-20 shrink-0 rounded-2xl shadow-xl" />
            <div className="relative min-w-0 flex-1"><span className="text-[10px] font-bold text-primary">پیشنهاد ویژه</span><div className="line-clamp-1 font-black" dir="auto">{featured.title}</div><div className="line-clamp-1 text-xs text-muted-foreground" dir="auto">{featured.author}</div></div>
            <span className="relative grid h-11 w-11 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground"><Play className="h-4 w-4 fill-current" /></span>
          </motion.button>
        )}
        {cats.map((c) => {
          const list = pool.filter((s) => s.category === c);
          return (
            <section key={c} className="mt-6">
              <div className="mb-2.5 flex items-center justify-between"><h3 className="font-black">{CATS[c]}</h3>{list.length > 3 && <button onClick={() => setCat(c)} className="text-xs font-bold text-primary">همه ({fa(list.length)})</button>}</div>
              <div className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-1">{list.slice(0, 10).map((s) => <ShowCard key={s.id} s={s} onOpen={() => setOpen(s.id)} />)}</div>
            </section>
          );
        })}
      </>)}
    </div>
  );
}
