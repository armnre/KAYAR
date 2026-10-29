import { useEffect, useMemo, useState } from 'react';
import { Search, Plus, RefreshCw, Mic2, Music, ExternalLink, CheckCircle2, AlertTriangle, Link2, Play, Pause, ChevronDown, Download, Terminal } from 'lucide-react';
import { toast } from 'sonner';
import { adminScout, type AdminScoutOutputType } from 'zitejs/api';
import { Switch } from '@project/components/ui/switch';
import { cn } from '@project/components/lib/utils';
import { KButton, Glass, StateView } from '../../components/kit';
import { useAdmin, errMsg } from '../../lib/session';
import { fa, faDate } from '../../lib/config';

type P = NonNullable<AdminScoutOutputType['podcasts']>[0];
type M = NonNullable<AdminScoutOutputType['music']>[0];
type Preview = NonNullable<AdminScoutOutputType['preview']>;
type Cat = 'fitness' | 'running' | 'focus' | 'recovery' | 'nutrition';
type Src = 'openverse' | 'ccmixter' | 'archive';
const inp = 'h-11 w-full rounded-2xl border border-white/10 bg-bg1 px-3 text-sm outline-none focus:border-primary';
const chip = (on: boolean) => cn('tap rounded-full px-3 py-1 text-xs font-bold transition-colors', on ? 'bg-primary text-primary-foreground' : 'bg-white/5 text-muted-foreground hover:text-foreground');
const CATS: [Cat, string][] = [['fitness', 'تناسب اندام'], ['running', 'دویدن'], ['focus', 'تمرکز و انگیزه'], ['recovery', 'ریکاوری و خواب'], ['nutrition', 'تغذیه']];
const SOURCES: [Src, string][] = [['openverse', 'Openverse'], ['ccmixter', 'ccMixter'], ['archive', 'Internet Archive']];
const STYLES: [string, string][] = [['', 'تشخیص خودکار سبک'], ['en-workout', 'تکمیلی خارجی'], ['fa-energy', 'شاد و پرانرژی'], ['fa-rap', 'رپ و هیپ‌هاپ'], ['fa-pop', 'پاپ'], ['fa-rock', 'راک'], ['fa-traditional', 'سنتی و تلفیقی'], ['fa-instrumental', 'بی‌کلام و آرام'], ['fa-classic', 'نوستالژی']];
const PRESETS_P = ['بدنسازی', 'تغذیه', 'انگیزشی', 'خواب', 'یوگا', 'fitness', 'running', 'nutrition science', 'strength training'];
const PRESETS_M = ['workout, gym', 'running, cardio', 'persian, santur', 'ambient, lofi', 'edm, energetic', 'hip hop beat', 'rock, power', 'drum and bass'];
const mmss = (s: number) => `${fa(Math.floor(s / 60))}:${fa(String(s % 60).padStart(2, '0'))}`;

function ScoreBadge({ v }: { v: number }) {
  const tone = v >= 70 ? 'bg-primary/15 text-primary' : v >= 45 ? 'bg-gold/15 text-gold' : 'bg-destructive/15 text-destructive';
  return <span className={cn('rounded-full px-2.5 py-1 font-latin text-xs font-bold', tone)} title="امتیاز کیفیت">{fa(v)}</span>;
}

function LogBox({ log }: { log: string[] }) {
  const [open, setOpen] = useState(false);
  if (!log.length) return null;
  return (
    <div className="rounded-2xl border border-white/5 bg-black/20 text-xs">
      <button onClick={() => setOpen(!open)} className="tap flex w-full items-center gap-2 px-3 py-2 text-muted-foreground"><Terminal className="h-3.5 w-3.5" />گزارش اسکرپ ({fa(log.length)})<ChevronDown className={cn('ms-auto h-3.5 w-3.5 transition-transform', open && 'rotate-180')} /></button>
      {open && <div className="space-y-1 border-t border-white/5 px-3 py-2 font-latin text-muted-foreground" dir="auto">{log.map((l, i) => <div key={i}>{l}</div>)}</div>}
    </div>
  );
}

function exportCsv(name: string, rows: (string | number)[][]) {
  const csv = '\uFEFF' + rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); a.download = name; a.click();
}

function EpisodePreview({ feedUrl }: { feedUrl: string }) {
  const { token } = useAdmin();
  const [data, setData] = useState<Preview | null>(null); const [err, setErr] = useState(''); const [play, setPlay] = useState<string | null>(null);
  useEffect(() => { adminScout({ token, action: 'podcastPreview', url: feedUrl }).then((r) => setData(r.preview ?? null)).catch((e) => setErr(errMsg(e))); }, [token, feedUrl]);
  if (err) return <div className="mt-3 text-xs text-destructive">{err}</div>;
  if (!data) return <div className="mt-3 space-y-1.5">{[0, 1, 2].map((i) => <div key={i} className="skeleton h-8 rounded-xl" />)}</div>;
  return (
    <div className="mt-3 space-y-1.5 border-t border-white/5 pt-3">
      {data.description && <p className="mb-2 line-clamp-3 text-xs leading-6 text-muted-foreground" dir="auto">{data.description}</p>}
      {data.episodes.map((e) => (
        <div key={e.audioUrl} className="flex items-center gap-2 rounded-xl bg-white/[.03] px-2 py-1.5 text-xs">
          <button onClick={() => setPlay(play === e.audioUrl ? null : e.audioUrl)} className="tap grid h-7 w-7 shrink-0 place-items-center rounded-full bg-primary/15 text-primary" aria-label="پخش">{play === e.audioUrl ? <Pause className="h-3 w-3 fill-current" /> : <Play className="h-3 w-3 fill-current" />}</button>
          <span className="min-w-0 flex-1 truncate" dir="auto">{e.title}</span>
          {e.durationSec ? <span className="shrink-0 text-muted-foreground">{mmss(e.durationSec)}</span> : null}
          {e.publishedAt && <span className="hidden shrink-0 text-muted-foreground sm:inline">{faDate(e.publishedAt)}</span>}
        </div>
      ))}
      {play && <audio src={play} autoPlay onEnded={() => setPlay(null)} className="hidden" />}
    </div>
  );
}

function PodcastCard({ h, sel, onSel, onAdd, busy }: { h: P; sel: boolean; onSel: (v: boolean) => void; onAdd: () => void; busy: string | null }) {
  const [open, setOpen] = useState(false);
  return (
    <Glass className={cn('p-4', !h.ok && 'opacity-60')}>
      <div className="flex gap-3">
        <input type="checkbox" disabled={h.known || !h.ok} checked={sel} onChange={(e) => onSel(e.target.checked)} className="mt-1 h-4 w-4 shrink-0 accent-[hsl(var(--primary))]" aria-label="انتخاب" />
        {h.artwork ? <img src={h.artwork} alt="" loading="lazy" className="h-16 w-16 shrink-0 rounded-2xl object-cover" /> : <div className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-white/5"><Mic2 className="h-6 w-6 text-muted-foreground" /></div>}
        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-2"><div className="min-w-0 flex-1"><div className="truncate font-bold" dir="auto">{h.title || h.feedUrl}</div><div className="truncate text-xs text-muted-foreground" dir="auto">{h.author}</div></div><ScoreBadge v={h.score} /></div>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span>{fa(h.episodes)} قسمت</span>
            {h.lastEpisodeAt && <span>آخرین: {faDate(h.lastEpisodeAt)}</span>}
            {h.avgMinutes && <span>میانگین {fa(h.avgMinutes)} دقیقه</span>}
            <span>{h.lang === 'fa' ? 'فارسی' : h.lang === 'en' ? 'انگلیسی' : 'نامشخص'}</span>
            <span className="font-latin">{h.sources.join(' · ')}</span>
          </div>
          {!!h.issues.length && <div className="mt-2 flex flex-wrap gap-1.5">{h.issues.map((i) => <span key={i} className="inline-flex items-center gap-1 rounded-full bg-white/5 px-2 py-0.5 text-[11px] text-muted-foreground"><AlertTriangle className="h-3 w-3" />{i}</span>)}</div>}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {h.ok && <button onClick={() => setOpen(!open)} className="tap inline-flex items-center gap-1 rounded-full bg-white/5 px-3 py-1 text-xs text-muted-foreground hover:text-foreground">قسمت‌ها<ChevronDown className={cn('h-3 w-3 transition-transform', open && 'rotate-180')} /></button>}
            <a href={h.feedUrl} target="_blank" rel="noopener noreferrer" className="tap inline-flex items-center gap-1 rounded-full bg-white/5 px-3 py-1 text-xs text-muted-foreground hover:text-foreground"><ExternalLink className="h-3 w-3" />فید</a>
            <span className="ms-auto">{h.known ? <span className="inline-flex items-center gap-1 text-xs text-primary"><CheckCircle2 className="h-4 w-4" />اضافه شده</span>
              : <KButton size="sm" disabled={!h.ok || !!busy} loading={busy === h.feedUrl} onClick={onAdd}><Plus className="h-4 w-4" />افزودن</KButton>}</span>
          </div>
          {open && <EpisodePreview feedUrl={h.feedUrl} />}
        </div>
      </div>
    </Glass>
  );
}

function PodcastScout() {
  const { token } = useAdmin();
  const [q, setQ] = useState(''); const [lang, setLang] = useState<'fa' | 'en' | 'any'>('any'); const [probe, setProbe] = useState(false);
  const [activeOnly, setActiveOnly] = useState(false); const [minEp, setMinEp] = useState(3); const [hideKnown, setHideKnown] = useState(false); const [minScore, setMinScore] = useState(0);
  const [cat, setCat] = useState<Cat>('fitness'); const [url, setUrl] = useState('');
  const [hits, setHits] = useState<P[] | null>(null); const [sel, setSel] = useState<Set<string>>(new Set()); const [busy, setBusy] = useState<string | null>(null);
  const run = async <R,>(key: string, fn: () => Promise<R>) => { setBusy(key); try { return await fn(); } catch (e) { toast.error(errMsg(e)); } finally { setBusy(null); } };
  const search = (term = q) => { if (!term.trim()) return; setQ(term); setSel(new Set()); void run('search', async () => setHits((await adminScout({ token, action: 'podcastSearch', query: term, lang, probe, activeOnly, minEpisodes: minEp })).podcasts ?? [])); };
  const markKnown = (urls: string[]) => setHits((h) => h?.map((x) => (urls.includes(x.feedUrl) ? { ...x, known: true } : x)) ?? h);
  const add = (u: string) => run(u, async () => { const r = await adminScout({ token, action: 'podcastAdd', url: u, category: cat }); toast.success(r.message); markKnown([u]); });
  const addMany = () => run('many', async () => { const urls = [...sel]; const r = await adminScout({ token, action: 'podcastAddMany', urls, category: cat }); toast.success(r.message); markKnown(urls); setSel(new Set()); });
  const shown = useMemo(() => (hits ?? []).filter((h) => (!hideKnown || !h.known) && h.score >= minScore), [hits, hideKnown, minScore]);
  return (
    <div className="space-y-4">
      <Glass className="p-5">
        <div className="mb-3 flex items-center gap-2 font-bold"><Search className="h-4 w-4 text-primary" />جست‌وجوی چند‌منبعی پادکست</div>
        <p className="mb-4 text-sm leading-7 text-muted-foreground">همزمان در fyyd، gpodder و Apple (ایران، آمریکا، انگلیس) جست‌وجو می‌شود؛ تکراری‌ها ادغام و هر فید زنده خوانده و بر اساس تازگی، تعداد قسمت، کاور، توضیحات و دسترسی فایل امتیازدهی می‌شود.</p>
        <form onSubmit={(e) => { e.preventDefault(); search(); }} className="flex flex-col gap-2 sm:flex-row">
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="مثلاً: بدنسازی، تغذیه ورزشی، marathon" className={inp} />
          <select value={lang} onChange={(e) => setLang(e.target.value as typeof lang)} className={cn(inp, 'sm:w-36')}><option value="any">همه‌ی زبان‌ها</option><option value="fa">فارسی</option><option value="en">انگلیسی</option></select>
          <KButton type="submit" loading={busy === 'search'} disabled={!q.trim() || !!busy}>جست‌وجو</KButton>
        </form>
        <div className="mt-3 flex flex-wrap gap-2">{PRESETS_P.map((p) => <button key={p} onClick={() => search(p)} disabled={!!busy} className={chip(false)}>{p}</button>)}</div>
        <div className="mt-4 grid gap-3 border-t border-white/5 pt-4 text-xs text-muted-foreground sm:grid-cols-2 lg:grid-cols-4">
          <label className="flex items-center gap-2"><Switch checked={activeOnly} onCheckedChange={setActiveOnly} />فقط فعال (۶ ماه اخیر)</label>
          <label className="flex items-center gap-2"><Switch checked={probe} onCheckedChange={setProbe} />تست فایل صوتی (کندتر)</label>
          <label className="flex items-center gap-2">حداقل قسمت<input type="number" min={0} value={minEp} onChange={(e) => setMinEp(Number(e.target.value))} className="h-9 w-16 rounded-xl border border-white/10 bg-bg1 px-2 text-center" /></label>
          <label className="flex items-center gap-2"><Switch checked={hideKnown} onCheckedChange={setHideKnown} />پنهان کردن اضافه‌شده‌ها</label>
        </div>
      </Glass>

      <Glass className="p-5">
        <div className="mb-3 flex items-center gap-2 font-bold"><Link2 className="h-4 w-4 text-primary" />افزودن با لینک</div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input dir="ltr" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="RSS / Apple Podcasts / وب‌سایت پادکست" className={inp} />
          <select value={cat} onChange={(e) => setCat(e.target.value as Cat)} className={cn(inp, 'sm:w-44')}>{CATS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
          <KButton loading={busy === url && !!url} disabled={!/^https?:\/\//.test(url) || !!busy} onClick={() => void add(url).then(() => setUrl(''))}><Plus className="h-4 w-4" />افزودن</KButton>
        </div>
        <div className="mt-4 flex items-center justify-between gap-3 border-t border-white/5 pt-4">
          <span className="text-sm text-muted-foreground">همگام‌سازی همه‌ی پادکست‌ها برای دریافت قسمت‌های جدید</span>
          <KButton variant="outline" size="sm" loading={busy === 'sync'} disabled={!!busy} onClick={() => void run('sync', async () => { const r = await adminScout({ token, action: 'syncAll' }); if (r.sync) { toast.success(`${fa(r.sync.shows)} پادکست بررسی شد · ${fa(r.sync.newEpisodes)} قسمت جدید`); r.sync.failed.slice(0, 3).forEach((f) => toast.error(f)); } })}><RefreshCw className="h-4 w-4" />همگام‌سازی همه</KButton>
        </div>
      </Glass>

      {busy === 'search' && <div className="space-y-2">{[0, 1, 2].map((i) => <div key={i} className="skeleton h-28 rounded-3xl" />)}</div>}
      {hits && busy !== 'search' && (!hits.length ? <Glass><StateView icon={Mic2} title="نتیجه‌ای پیدا نشد" text="عبارت دیگری امتحان کن یا فیلترها را کم کن." /></Glass> : (
        <>
          <div className="sticky top-2 z-10 flex flex-wrap items-center gap-3 rounded-3xl border border-white/10 bg-background/90 p-3 text-sm backdrop-blur">
            <span>{fa(shown.length)} از {fa(hits.length)} نتیجه</span>
            <label className="flex items-center gap-2 text-xs text-muted-foreground">حداقل امتیاز<input type="range" min={0} max={90} step={5} value={minScore} onChange={(e) => setMinScore(Number(e.target.value))} className="w-24 accent-[hsl(var(--primary))]" /><b className="w-6 text-foreground">{fa(minScore)}</b></label>
            <button onClick={() => setSel(new Set(shown.filter((h) => h.ok && !h.known).map((h) => h.feedUrl)))} className={chip(false)}>انتخاب همه</button>
            <button onClick={() => exportCsv('podcasts.csv', [['title', 'author', 'score', 'episodes', 'lang', 'feed'], ...shown.map((h) => [h.title, h.author, h.score, h.episodes, h.lang, h.feedUrl])])} className={chip(false)}><Download className="inline h-3 w-3" /> CSV</button>
            <KButton size="sm" className="ms-auto" disabled={!sel.size || !!busy} loading={busy === 'many'} onClick={() => void addMany()}><Plus className="h-4 w-4" />افزودن {fa(sel.size)} مورد</KButton>
          </div>
          <div className="space-y-2">
            {shown.map((h) => <PodcastCard key={h.feedUrl} h={h} busy={busy} sel={sel.has(h.feedUrl)} onSel={(v) => { const s = new Set(sel); if (v) s.add(h.feedUrl); else s.delete(h.feedUrl); setSel(s); }} onAdd={() => void add(h.feedUrl)} />)}
          </div>
        </>
      ))}
    </div>
  );
}

function TrackRow({ h, sel, onSel, playing, onPlay }: { h: M; sel: boolean; onSel: (v: boolean) => void; playing: boolean; onPlay: () => void }) {
  const can = h.status === 'ok' || h.status === 'unreachable';
  return (
    <Glass className={cn('flex items-center gap-3 p-3', !can && 'opacity-55')}>
      <input type="checkbox" disabled={!can} checked={sel} onChange={(e) => onSel(e.target.checked)} className="h-4 w-4 accent-[hsl(var(--primary))]" aria-label="انتخاب" />
      <button onClick={onPlay} className="tap relative grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-xl bg-white/5" aria-label="پیش‌نمایش">
        {h.art && <img src={h.art} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover opacity-70" />}
        <span className="relative">{playing ? <Pause className="h-4 w-4 fill-current" /> : <Play className="h-4 w-4 fill-current" />}</span>
      </button>
      <div className="min-w-0 flex-1">
        <div className="truncate font-bold" dir="auto">{h.title}</div>
        <div className="truncate text-xs text-muted-foreground" dir="auto">{h.artist} · {h.sourceName}{h.durationSec ? ` · ${mmss(h.durationSec)}` : ''}</div>
        <div className="truncate text-[11px] text-muted-foreground/70" dir="ltr">{h.license.split(' · ')[0]}</div>
      </div>
      <ScoreBadge v={h.quality} />
      {h.reason && <span className="hidden shrink-0 rounded-full bg-white/5 px-2 py-0.5 text-[11px] text-muted-foreground md:inline">{h.reason}</span>}
      <a href={h.sourceUrl} target="_blank" rel="noopener noreferrer" className="tap shrink-0 text-muted-foreground hover:text-foreground" aria-label="منبع"><ExternalLink className="h-4 w-4" /></a>
      {playing && <audio src={h.audioUrl} autoPlay className="hidden" />}
    </Glass>
  );
}

function MusicScout() {
  const { token } = useAdmin();
  const [q, setQ] = useState(''); const [probe, setProbe] = useState(true); const [minS, setMinS] = useState(90); const [maxS, setMaxS] = useState(420);
  const [sources, setSources] = useState<Set<Src>>(new Set(['openverse', 'ccmixter', 'archive'])); const [style, setStyle] = useState('');
  const [hits, setHits] = useState<M[] | null>(null); const [log, setLog] = useState<string[]>([]); const [filter, setFilter] = useState<'all' | 'ok' | 'dup' | 'rej'>('all');
  const [sel, setSel] = useState<Set<string>>(new Set()); const [busy, setBusy] = useState<string | null>(null); const [playing, setPlaying] = useState<string | null>(null);
  const search = async (term = q) => {
    if (!term.trim() || !sources.size) return; setQ(term); setBusy('search');
    try { const r = await adminScout({ token, action: 'musicSearch', query: term, probe, minSec: minS, maxSec: maxS, sources: [...sources] }); const list = r.music ?? []; setHits(list); setLog(r.log ?? []); setFilter('all'); setSel(new Set(list.filter((x) => x.status === 'ok' && x.quality >= 60).map((x) => x.id))); }
    catch (e) { toast.error(errMsg(e)); } finally { setBusy(null); }
  };
  const queue = async (publish: boolean) => {
    if (!hits) return; setBusy(publish ? 'pub' : 'queue');
    try { const r = await adminScout({ token, action: 'musicQueue', rows: hits.filter((h) => sel.has(h.id)).map((h) => h.row).slice(0, 100), publish, style: style || undefined }); toast.success(r.message); setHits(hits.map((h) => (sel.has(h.id) ? { ...h, status: 'duplicate', reason: 'اضافه شد' } : h))); setSel(new Set()); }
    catch (e) { toast.error(errMsg(e)); } finally { setBusy(null); }
  };
  const isRej = (h: M) => h.status === 'rejected' || h.status === 'unreachable';
  const counts = hits ? { ok: hits.filter((h) => h.status === 'ok').length, dup: hits.filter((h) => h.status === 'duplicate').length, rej: hits.filter(isRej).length } : null;
  const shown = (hits ?? []).filter((h) => filter === 'all' || (filter === 'ok' ? h.status === 'ok' : filter === 'dup' ? h.status === 'duplicate' : isRej(h)));
  const toggleSrc = (s: Src) => { const n = new Set(sources); if (n.has(s)) n.delete(s); else n.add(s); setSources(n); };
  return (
    <div className="space-y-4">
      <Glass className="p-5">
        <div className="mb-3 flex items-center gap-2 font-bold"><Search className="h-4 w-4 text-primary" />جست‌وجوی هدفمند موزیک آزاد</div>
        <p className="mb-4 text-sm leading-7 text-muted-foreground">فقط آثار با مجوز Creative Commons قابل استفاده‌ی تجاری یا مالکیت عمومی. نتایج چند منبع ادغام، تکراری‌ها حذف، از فیلتر محتوا و فهرست سیاه عبور داده و امتیاز کیفیت (مجوز، بیت‌ریت، مدت، کاور) می‌گیرند. چند عبارت را با کاما جدا کن.</p>
        <form onSubmit={(e) => { e.preventDefault(); void search(); }} className="flex flex-col gap-2 sm:flex-row">
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="workout, energetic, drum and bass" dir="auto" className={inp} />
          <KButton type="submit" loading={busy === 'search'} disabled={!q.trim() || !sources.size || !!busy}>جست‌وجو</KButton>
        </form>
        <div className="mt-3 flex flex-wrap gap-2">{PRESETS_M.map((p) => <button key={p} onClick={() => void search(p)} disabled={!!busy} className={cn(chip(false), 'font-latin')}>{p}</button>)}</div>
        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-white/5 pt-4 text-xs text-muted-foreground">
          <span>منابع:</span>{SOURCES.map(([k, l]) => <button key={k} onClick={() => toggleSrc(k)} className={cn(chip(sources.has(k)), 'font-latin')}>{l}</button>)}
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
          <label className="flex items-center gap-2">مدت از<input type="number" min={0} value={minS} onChange={(e) => setMinS(Number(e.target.value))} className="h-9 w-20 rounded-xl border border-white/10 bg-bg1 px-2 text-center" />تا<input type="number" min={0} value={maxS} onChange={(e) => setMaxS(Number(e.target.value))} className="h-9 w-20 rounded-xl border border-white/10 bg-bg1 px-2 text-center" />ثانیه</label>
          <label className="flex items-center gap-2"><Switch checked={probe} onCheckedChange={setProbe} />تست دسترسی فایل از سرور</label>
        </div>
      </Glass>

      {busy === 'search' && <div className="space-y-2">{[0, 1, 2, 3].map((i) => <div key={i} className="skeleton h-16 rounded-3xl" />)}</div>}
      {hits && busy !== 'search' && <LogBox log={log} />}
      {hits && busy !== 'search' && (!hits.length ? <Glass><StateView icon={Music} title="نتیجه‌ای پیدا نشد" text="عبارت انگلیسی دیگری امتحان کن یا منابع بیشتری انتخاب کن." /></Glass> : (
        <>
          <div className="sticky top-2 z-10 space-y-2 rounded-3xl border border-white/10 bg-background/90 p-3 backdrop-blur">
            <div className="flex flex-wrap items-center gap-2">
              {([['all', `همه ${fa(hits.length)}`], ['ok', `قابل افزودن ${fa(counts!.ok)}`], ['dup', `تکراری ${fa(counts!.dup)}`], ['rej', `رد ${fa(counts!.rej)}`]] as const).map(([k, l]) => <button key={k} onClick={() => setFilter(k)} className={chip(filter === k)}>{l}</button>)}
              <button onClick={() => setSel(new Set(shown.filter((h) => h.status === 'ok' || h.status === 'unreachable').map((h) => h.id)))} className={chip(false)}>انتخاب همه</button>
              <button onClick={() => setSel(new Set())} className={chip(false)}>هیچ‌کدام</button>
              <button onClick={() => exportCsv('music.csv', [['title', 'artist', 'source', 'quality', 'status', 'license', 'url'], ...shown.map((h) => [h.title, h.artist, h.sourceName, h.quality, h.status, h.license, h.sourceUrl])])} className={chip(false)}><Download className="inline h-3 w-3" /> CSV</button>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <select value={style} onChange={(e) => setStyle(e.target.value)} className="h-9 rounded-xl border border-white/10 bg-bg1 px-2 text-xs">{STYLES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
              <span className="ms-auto text-sm text-muted-foreground">{fa(sel.size)} انتخاب</span>
              <KButton size="sm" variant="outline" disabled={!sel.size || !!busy} loading={busy === 'queue'} onClick={() => void queue(false)}>به صف بررسی</KButton>
              <KButton size="sm" disabled={!sel.size || !!busy} loading={busy === 'pub'} onClick={() => void queue(true)}>انتشار مستقیم</KButton>
            </div>
          </div>
          <div className="space-y-2">
            {shown.map((h) => <TrackRow key={h.id} h={h} sel={sel.has(h.id)} playing={playing === h.id} onPlay={() => setPlaying(playing === h.id ? null : h.id)} onSel={(v) => { const s = new Set(sel); if (v) s.add(h.id); else s.delete(h.id); setSel(s); }} />)}
          </div>
        </>
      ))}
    </div>
  );
}

export function ScoutTab() {
  const [mode, setMode] = useState<'music' | 'podcast'>('music');
  return (
    <div>
      <div className="mb-4 inline-flex rounded-full bg-white/5 p-1">
        {([['music', 'موزیک', Music], ['podcast', 'پادکست', Mic2]] as const).map(([k, l, I]) => (
          <button key={k} onClick={() => setMode(k)} className={cn('tap inline-flex items-center gap-2 rounded-full px-5 text-sm font-bold', mode === k ? 'bg-primary text-primary-foreground' : 'text-muted-foreground')}><I className="h-4 w-4" />{l}</button>
        ))}
      </div>
      {mode === 'music' ? <MusicScout /> : <PodcastScout />}
    </div>
  );
}
