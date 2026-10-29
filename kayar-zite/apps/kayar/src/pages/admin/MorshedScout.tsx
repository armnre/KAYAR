import { useState } from 'react';
import { Search, Plus, RefreshCw, Mic2, Music, ExternalLink, CheckCircle2, AlertTriangle, Link2, Play, Pause } from 'lucide-react';
import { toast } from 'sonner';
import { adminScout, type AdminScoutOutputType } from 'zitejs/api';
import { Switch } from '@project/components/ui/switch';
import { cn } from '@project/components/lib/utils';
import { KButton, Glass, StateView } from '../../components/kit';
import { useAdmin, errMsg } from '../../lib/session';
import { fa, faDate } from '../../lib/config';

type P = NonNullable<AdminScoutOutputType['podcasts']>[0];
type M = NonNullable<AdminScoutOutputType['music']>[0];
type Cat = 'fitness' | 'running' | 'focus' | 'recovery' | 'nutrition';
const inp = 'h-11 w-full rounded-2xl border border-white/10 bg-bg1 px-3 text-sm outline-none focus:border-primary';
const CATS: [Cat, string][] = [['fitness', 'تناسب اندام'], ['running', 'دویدن'], ['focus', 'تمرکز و انگیزه'], ['recovery', 'ریکاوری و خواب'], ['nutrition', 'تغذیه']];
const PRESETS_P = ['بدنسازی', 'تغذیه', 'انگیزشی', 'خواب', 'fitness', 'running', 'nutrition science'];
const PRESETS_M = ['workout, gym', 'running, cardio', 'persian, santur', 'ambient, lofi', 'edm, energetic', 'hip hop beat'];
const mmss = (s: number) => `${fa(Math.floor(s / 60))}:${fa(String(s % 60).padStart(2, '0'))}`;

function ScoreBadge({ v }: { v: number }) {
  const tone = v >= 70 ? 'bg-primary/15 text-primary' : v >= 45 ? 'bg-gold/15 text-gold' : 'bg-destructive/15 text-destructive';
  return <span className={cn('rounded-full px-2.5 py-1 font-latin text-xs font-bold', tone)}>{fa(v)}</span>;
}

function PodcastScout() {
  const { token } = useAdmin();
  const [q, setQ] = useState(''); const [lang, setLang] = useState<'fa' | 'en' | 'any'>('any'); const [probe, setProbe] = useState(false);
  const [cat, setCat] = useState<Cat>('fitness'); const [url, setUrl] = useState('');
  const [hits, setHits] = useState<P[] | null>(null); const [busy, setBusy] = useState<string | null>(null);
  const run = async <R,>(key: string, fn: () => Promise<R>) => { setBusy(key); try { return await fn(); } catch (e) { toast.error(errMsg(e)); } finally { setBusy(null); } };
  const search = (term = q) => { if (!term.trim()) return; setQ(term); void run('search', async () => setHits((await adminScout({ token, action: 'podcastSearch', query: term, lang, probe })).podcasts ?? [])); };
  const add = (u: string) => run(u, async () => { const r = await adminScout({ token, action: 'podcastAdd', url: u, category: cat }); toast.success(r.message); setHits((h) => h?.map((x) => (x.feedUrl === u ? { ...x, known: true } : x)) ?? h); });
  return (
    <div className="space-y-4">
      <Glass className="p-5">
        <div className="mb-3 flex items-center gap-2 font-bold"><Search className="h-4 w-4 text-primary" />جست‌وجوی چند‌منبعی پادکست</div>
        <p className="mb-4 text-sm leading-7 text-muted-foreground">همزمان در fyyd، Apple ایران و Apple آمریکا جست‌وجو می‌شود؛ نتایج تکراری ادغام و هر فید زنده خوانده و از نظر تازگی، تعداد قسمت، کاور، توضیحات و در دسترس بودن فایل امتیازدهی می‌شود.</p>
        <form onSubmit={(e) => { e.preventDefault(); search(); }} className="flex flex-col gap-2 sm:flex-row">
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="مثلاً: بدنسازی، تغذیه ورزشی، marathon" className={inp} />
          <select value={lang} onChange={(e) => setLang(e.target.value as typeof lang)} className={cn(inp, 'sm:w-36')}><option value="any">همه‌ی زبان‌ها</option><option value="fa">فارسی</option><option value="en">انگلیسی</option></select>
          <KButton type="submit" loading={busy === 'search'} disabled={!q.trim() || !!busy}>جست‌وجو</KButton>
        </form>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {PRESETS_P.map((p) => <button key={p} onClick={() => search(p)} disabled={!!busy} className="tap rounded-full bg-white/5 px-3 py-1 text-xs text-muted-foreground hover:text-foreground">{p}</button>)}
          <label className="ms-auto flex items-center gap-2 text-xs text-muted-foreground"><Switch checked={probe} onCheckedChange={setProbe} />تست فایل صوتی از سرور (کندتر)</label>
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
          <KButton variant="outline" size="sm" loading={busy === 'sync'} disabled={!!busy} onClick={() => void run('sync', async () => { const r = await adminScout({ token, action: 'syncAll' }); if (r.sync) toast.success(`${fa(r.sync.shows)} پادکست بررسی شد · ${fa(r.sync.newEpisodes)} قسمت جدید${r.sync.failed.length ? ` · ${fa(r.sync.failed.length)} خطا` : ''}`); })}><RefreshCw className="h-4 w-4" />همگام‌سازی همه</KButton>
        </div>
      </Glass>

      {busy === 'search' && <div className="space-y-2">{[0, 1, 2].map((i) => <div key={i} className="skeleton h-24 rounded-3xl" />)}</div>}
      {hits && busy !== 'search' && (!hits.length ? <Glass><StateView icon={Mic2} title="نتیجه‌ای پیدا نشد" text="عبارت دیگری امتحان کن." /></Glass> : (
        <div className="space-y-2">
          {hits.map((h) => (
            <Glass key={h.feedUrl} className={cn('flex gap-4 p-4', !h.ok && 'opacity-60')}>
              {h.artwork ? <img src={h.artwork} alt="" loading="lazy" className="h-16 w-16 shrink-0 rounded-2xl object-cover" /> : <div className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-white/5"><Mic2 className="h-6 w-6 text-muted-foreground" /></div>}
              <div className="min-w-0 flex-1">
                <div className="flex items-start gap-2"><div className="min-w-0 flex-1"><div className="truncate font-bold">{h.title || h.feedUrl}</div><div className="truncate text-xs text-muted-foreground">{h.author}</div></div><ScoreBadge v={h.score} /></div>
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  <span>{fa(h.episodes)} قسمت</span>
                  {h.lastEpisodeAt && <span>آخرین: {faDate(h.lastEpisodeAt)}</span>}
                  {h.avgMinutes && <span>میانگین {fa(h.avgMinutes)} دقیقه</span>}
                  <span>{h.lang === 'fa' ? 'فارسی' : h.lang === 'en' ? 'انگلیسی' : 'نامشخص'}</span>
                  <span>{h.sources.join(' · ')}</span>
                </div>
                {!!h.issues.length && <div className="mt-2 flex flex-wrap gap-1.5">{h.issues.map((i) => <span key={i} className="inline-flex items-center gap-1 rounded-full bg-white/5 px-2 py-0.5 text-[11px] text-muted-foreground"><AlertTriangle className="h-3 w-3" />{i}</span>)}</div>}
              </div>
              <div className="flex shrink-0 flex-col items-end justify-between gap-2">
                <a href={h.feedUrl} target="_blank" rel="noopener noreferrer" className="tap text-muted-foreground hover:text-foreground" aria-label="فید"><ExternalLink className="h-4 w-4" /></a>
                {h.known ? <span className="inline-flex items-center gap-1 text-xs text-primary"><CheckCircle2 className="h-4 w-4" />اضافه شده</span>
                  : <KButton size="sm" disabled={!h.ok || !!busy} loading={busy === h.feedUrl} onClick={() => void add(h.feedUrl)}><Plus className="h-4 w-4" />افزودن</KButton>}
              </div>
            </Glass>
          ))}
        </div>
      ))}
    </div>
  );
}

function MusicScout() {
  const { token } = useAdmin();
  const [q, setQ] = useState(''); const [probe, setProbe] = useState(true); const [minS, setMinS] = useState(90); const [maxS, setMaxS] = useState(420);
  const [hits, setHits] = useState<M[] | null>(null); const [sel, setSel] = useState<Set<string>>(new Set()); const [busy, setBusy] = useState<string | null>(null);
  const [playing, setPlaying] = useState<string | null>(null);
  const search = async (term = q) => {
    if (!term.trim()) return; setQ(term); setBusy('search');
    try { const r = await adminScout({ token, action: 'musicSearch', query: term, probe, minSec: minS, maxSec: maxS }); const list = r.music ?? []; setHits(list); setSel(new Set(list.filter((x) => x.status === 'ok').map((x) => x.id))); }
    catch (e) { toast.error(errMsg(e)); } finally { setBusy(null); }
  };
  const queue = async (publish: boolean) => {
    if (!hits) return; setBusy(publish ? 'pub' : 'queue');
    try { const r = await adminScout({ token, action: 'musicQueue', rows: hits.filter((h) => sel.has(h.id)).map((h) => h.row), publish }); toast.success(r.message); setHits(hits.map((h) => (sel.has(h.id) ? { ...h, status: 'duplicate', reason: 'اضافه شد' } : h))); setSel(new Set()); }
    catch (e) { toast.error(errMsg(e)); } finally { setBusy(null); }
  };
  const counts = hits ? { ok: hits.filter((h) => h.status === 'ok').length, dup: hits.filter((h) => h.status === 'duplicate').length, rej: hits.filter((h) => h.status === 'rejected' || h.status === 'unreachable').length } : null;
  return (
    <div className="space-y-4">
      <Glass className="p-5">
        <div className="mb-3 flex items-center gap-2 font-bold"><Search className="h-4 w-4 text-primary" />جست‌وجوی هدفمند موزیک آزاد</div>
        <p className="mb-4 text-sm leading-7 text-muted-foreground">فقط آثار با مجوز Creative Commons قابل استفاده‌ی تجاری. هر نتیجه از فیلتر کیفیت و محتوا، تکراری‌یابی با کتابخانه و فهرست سیاه، و در صورت انتخاب، تست دسترسی فایل از سرور عبور می‌کند. چند عبارت را با کاما جدا کن.</p>
        <form onSubmit={(e) => { e.preventDefault(); void search(); }} className="flex flex-col gap-2 sm:flex-row">
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="workout, energetic, drum and bass" dir="auto" className={inp} />
          <KButton type="submit" loading={busy === 'search'} disabled={!q.trim() || !!busy}>جست‌وجو</KButton>
        </form>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {PRESETS_M.map((p) => <button key={p} onClick={() => void search(p)} disabled={!!busy} className="tap rounded-full bg-white/5 px-3 py-1 font-latin text-xs text-muted-foreground hover:text-foreground">{p}</button>)}
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
          <label className="flex items-center gap-2">مدت از<input type="number" min={0} value={minS} onChange={(e) => setMinS(Number(e.target.value))} className="h-9 w-20 rounded-xl border border-white/10 bg-bg1 px-2 text-center" />تا<input type="number" min={0} value={maxS} onChange={(e) => setMaxS(Number(e.target.value))} className="h-9 w-20 rounded-xl border border-white/10 bg-bg1 px-2 text-center" />ثانیه</label>
          <label className="flex items-center gap-2"><Switch checked={probe} onCheckedChange={setProbe} />تست دسترسی فایل از سرور</label>
        </div>
      </Glass>

      {busy === 'search' && <div className="space-y-2">{[0, 1, 2, 3].map((i) => <div key={i} className="skeleton h-16 rounded-3xl" />)}</div>}
      {hits && busy !== 'search' && (!hits.length ? <Glass><StateView icon={Music} title="نتیجه‌ای پیدا نشد" text="عبارت انگلیسی دیگری امتحان کن." /></Glass> : (
        <>
          <div className="sticky top-2 z-10 flex flex-wrap items-center gap-3 rounded-3xl border border-white/10 bg-background/90 p-3 backdrop-blur">
            <span className="text-sm"><b className="text-primary">{fa(counts!.ok)}</b> قابل افزودن · {fa(counts!.dup)} تکراری · {fa(counts!.rej)} رد</span>
            <span className="ms-auto text-sm text-muted-foreground">{fa(sel.size)} انتخاب</span>
            <KButton size="sm" variant="outline" disabled={!sel.size || !!busy} loading={busy === 'queue'} onClick={() => void queue(false)}>به صف بررسی</KButton>
            <KButton size="sm" disabled={!sel.size || !!busy} loading={busy === 'pub'} onClick={() => void queue(true)}>انتشار مستقیم</KButton>
          </div>
          <div className="space-y-2">
            {hits.map((h) => {
              const can = h.status === 'ok' || h.status === 'unreachable';
              return (
                <Glass key={h.id} className={cn('flex items-center gap-3 p-3', !can && 'opacity-55')}>
                  <input type="checkbox" disabled={!can} checked={sel.has(h.id)} onChange={(e) => { const s = new Set(sel); if (e.target.checked) s.add(h.id); else s.delete(h.id); setSel(s); }} className="h-4 w-4 accent-[hsl(var(--primary))]" aria-label="انتخاب" />
                  <button onClick={() => setPlaying(playing === h.id ? null : h.id)} className="tap relative grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-xl bg-white/5" aria-label="پیش‌نمایش">
                    {h.art && <img src={h.art} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover opacity-70" />}
                    <span className="relative">{playing === h.id ? <Pause className="h-4 w-4 fill-current" /> : <Play className="h-4 w-4 fill-current" />}</span>
                  </button>
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-bold" dir="auto">{h.title}</div>
                    <div className="truncate text-xs text-muted-foreground" dir="auto">{h.artist} · {h.sourceName}{h.durationSec ? ` · ${mmss(h.durationSec)}` : ''}</div>
                    <div className="truncate text-[11px] text-muted-foreground/70" dir="ltr">{h.license.split(' · ')[0]}</div>
                  </div>
                  {h.reason && <span className="hidden shrink-0 rounded-full bg-white/5 px-2 py-0.5 text-[11px] text-muted-foreground sm:inline">{h.reason}</span>}
                  <a href={h.sourceUrl} target="_blank" rel="noopener noreferrer" className="tap shrink-0 text-muted-foreground hover:text-foreground" aria-label="منبع"><ExternalLink className="h-4 w-4" /></a>
                  {playing === h.id && <audio src={h.audioUrl} autoPlay onEnded={() => setPlaying(null)} className="hidden" />}
                </Glass>
              );
            })}
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
