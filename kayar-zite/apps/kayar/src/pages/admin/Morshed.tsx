import { useCallback, useEffect, useState } from 'react';
import { Music, Search, Plus, ExternalLink, Star, Pencil, Trash2, Mic2, Loader2, RefreshCw } from 'lucide-react';
import { useUpload } from 'zitejs/upload';
import { toast } from 'sonner';
import { adminTracks, adminShows, adminInspectUrl, type AdminTracksOutputType, type AdminShowsOutputType, type AdminShowsInputType, type AdminInspectUrlOutputType } from 'zitejs/api';
import { Switch } from '@project/components/ui/switch';
import { cn } from '@project/components/lib/utils';
import { KButton, Glass, StateView, Cover } from '../../components/kit';
import { PageHead, ListSkeleton, ErrorState, ResponsiveModal, Confirm } from '../../components/admin/ui';
import { SortableList } from '../../components/admin/SortableList';
import { CollectionsPanel } from './Collections';
import { Pill } from './Posts';
import { useAdmin, errMsg } from '../../lib/session';
import { ReviewTab, SourcesTab } from './MorshedReview';
import { fa } from '../../lib/config';

type T = AdminTracksOutputType['tracks'][0];
const dur = (s: number) => `${fa(Math.floor(s / 60))}:${fa(String(Math.floor(s % 60)).padStart(2, '0'))}`;
const inp = 'mt-1 h-11 w-full rounded-2xl border border-white/10 bg-bg1 px-3 text-sm font-normal outline-none focus:border-primary';
const CATS = ['شروع قدرتی', 'کاردیو', 'ریکاوری', 'تمرکز', 'انرژی'];

const PHASE_FA = { warmup: 'گرم کردن', peak: 'اوج', cooldown: 'سرد کردن' } as const;
function PhaseFitPanel({ f }: { f: T['phaseFit'] }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[.03] p-3 text-sm">
      <div className="mb-2 font-bold">تناسب با مراحل تمرین</div>
      <div className="grid grid-cols-3 gap-2">{(['warmup', 'peak', 'cooldown'] as const).map((k) => (
        <div key={k} className={cn('rounded-xl p-2 text-center', f.best === k ? 'bg-primary/15 ring-1 ring-primary/40' : 'bg-white/5')}>
          <div className="text-xs text-muted-foreground">{PHASE_FA[k]}</div><div className="font-latin text-lg font-black">{fa(f.scores[k])}</div>
          <div className="mt-1 h-1 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-primary" style={{ width: `${f.scores[k]}%` }} /></div>
        </div>))}</div>
      {f.reasons.length > 0 && <ul className="mt-2 list-inside list-disc text-xs leading-6 text-muted-foreground">{f.reasons.map((r) => <li key={r}>{r}</li>)}</ul>}
      {!f.complete && <p className="mt-2 text-xs leading-6 text-gold">امتیاز کامل نیست؛ داده‌ی ثبت‌نشده: {f.missing.join('، ')}. عددی برای این موارد حدس زده نمی‌شود.</p>}
    </div>
  );
}

function EditTrack({ t, onSaved }: { t: T; onSaved: (all: T[]) => void }) {
  const { token } = useAdmin();
  const [f, setF] = useState({ title: t.title, artist: t.artist, album: t.album, rights: t.rights, categories: t.categories, tags: t.tags.join('، '), featured: t.featured, status: (['draft', 'published', 'hidden'].includes(t.status) ? t.status : 'draft') as 'draft' | 'published' | 'hidden' });
  const [busy, setBusy] = useState(false);
  const save = async () => { setBusy(true); try { const r = await adminTracks({ token, action: 'update', id: t.id, patch: { ...f, tags: f.tags.split(/[,،]/).map((x) => x.trim()).filter(Boolean) } }); onSaved(r.tracks); toast.success('ذخیره شد'); } catch (e) { toast.error(errMsg(e)); } finally { setBusy(false); } };
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3"><Cover hue={200} image={t.coverUrl} className="h-16 w-16 rounded-xl" /><div className="min-w-0 text-sm text-muted-foreground"><div>منبع: {t.source === 'upload' ? 'آپلود' : t.sourceName || 'لینک خارجی'}</div><div>مدت: {dur(t.duration)}</div>{t.audioUrl && <audio src={t.source === 'external' ? `/media/stream/${t.id}` : t.audioUrl} controls preload="none" className="mt-1 h-8 w-full" />}</div></div>
      <PhaseFitPanel f={t.phaseFit} />
      <label className="block text-sm font-bold">عنوان<input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} className={inp} /></label>
      <div className="grid gap-3 sm:grid-cols-2"><label className="block text-sm font-bold">هنرمند<input value={f.artist} onChange={(e) => setF({ ...f, artist: e.target.value })} className={inp} /></label><label className="block text-sm font-bold">آلبوم<input value={f.album} onChange={(e) => setF({ ...f, album: e.target.value })} className={inp} /></label></div>
      <div className="text-sm font-bold">دسته‌ها<div className="mt-1 flex flex-wrap gap-2">{CATS.map((c) => <button key={c} onClick={() => setF({ ...f, categories: f.categories.includes(c) ? f.categories.filter((x) => x !== c) : [...f.categories, c] })} className={cn('rounded-full px-3 py-1.5 text-xs font-bold', f.categories.includes(c) ? 'bg-primary text-primary-foreground' : 'bg-white/5 text-muted-foreground')}>{c}</button>)}</div></div>
      <label className="block text-sm font-bold">تگ‌ها<input value={f.tags} onChange={(e) => setF({ ...f, tags: e.target.value })} className={inp} placeholder="با کاما جدا کن" /></label>
      <label className="block text-sm font-bold">اطلاعات حقوق و مجوز<textarea value={f.rights} onChange={(e) => setF({ ...f, rights: e.target.value })} rows={3} className={cn(inp, 'h-auto py-2')} /></label>
      <div className="flex flex-wrap gap-3 text-xs">{t.licenseUrl && <a href={t.licenseUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 underline">لینک مجوز<ExternalLink className="h-3 w-3" /></a>}{t.shareUrl && <a href={t.shareUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 underline">صفحه‌ی اصلی آهنگ<ExternalLink className="h-3 w-3" /></a>}</div>
      <label className="flex min-h-[44px] items-center justify-between"><span className="font-bold">پیشنهاد ویژه</span><Switch checked={f.featured} onCheckedChange={(v) => setF({ ...f, featured: v })} /></label>
      <div className="grid grid-cols-3 gap-2">{(['draft', 'published', 'hidden'] as const).map((s) => <button key={s} onClick={() => setF({ ...f, status: s })} className={cn('h-11 rounded-2xl text-sm font-bold', f.status === s ? 'bg-primary text-primary-foreground' : 'bg-white/5')}>{{ draft: 'پیش‌نویس', published: 'منتشر', hidden: 'مخفی' }[s]}</button>)}</div>
      <KButton className="w-full" loading={busy} disabled={!f.title.trim()} onClick={save}>ذخیره</KButton>
    </div>
  );
}

function LibraryTab({ tracks, setTracks }: { tracks: T[]; setTracks: (t: T[]) => void }) {
  const { token } = useAdmin();
  const [q, setQ] = useState(''); const [st, setSt] = useState(''); const [ph, setPh] = useState(''); const [edit, setEdit] = useState<T | null>(null); const [del, setDel] = useState<T | null>(null);
  const [selMode, setSelMode] = useState(false); const [sel, setSel] = useState<Set<string>>(new Set());
  const [bulk, setBulk] = useState<'selected' | 'all' | null>(null); const [phrase, setPhrase] = useState(''); const [busy, setBusy] = useState(false);
  const filtered = tracks.filter((t) => (!st || t.status === st) && (!ph || t.phaseFit.best === ph) && `${t.title} ${t.artist}`.toLowerCase().includes(q.toLowerCase()));
  const canSort = !q && !st && !ph && !selMode;
  const allSel = filtered.length > 0 && filtered.every((t) => sel.has(t.id));
  const toggle = (id: string) => setSel((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const reorder = useCallback((next: T[]) => { adminTracks({ token, action: 'reorder', ids: next.map((t) => t.id) }).then((r) => setTracks(r.tracks)).catch((e) => toast.error(errMsg(e))); }, [token, setTracks]);
  const runBulk = async () => {
    setBusy(true);
    try {
      const r = bulk === 'all' ? await adminTracks({ token, action: 'purgeAll', confirm: phrase.trim() }) : await adminTracks({ token, action: 'purgeIds', ids: [...sel] });
      setTracks(r.tracks); toast.success('حذف شد'); setSel(new Set()); setBulk(null); setPhrase(''); setSelMode(false);
    } catch (e) { toast.error(errMsg(e)); } finally { setBusy(false); }
  };
  const row = (t: T) => <button onClick={() => (selMode ? toggle(t.id) : setEdit(t))} className="flex min-w-0 flex-1 items-center gap-3 text-start"><Cover hue={200} image={t.coverUrl} className="h-11 w-11 shrink-0 rounded-xl" /><div className="min-w-0 flex-1"><div className="flex items-center gap-1 truncate font-bold">{t.featured && <Star className="h-3.5 w-3.5 shrink-0 fill-gold text-gold" />}{t.title}</div><div className="truncate text-xs text-muted-foreground">{t.artist} · {t.sourceName || t.source} · {dur(t.duration)}</div></div><Pill s={t.status === 'hidden' ? 'archived' : t.status} /></button>;
  return (
    <>
      <div className="mb-3 flex flex-wrap gap-2"><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="جست‌وجو…" className="h-11 min-w-0 flex-1 basis-40 rounded-full border border-white/10 bg-bg1 px-4 text-sm outline-none focus:border-primary" /><select value={st} onChange={(e) => setSt(e.target.value)} aria-label="وضعیت" className="h-11 rounded-full border border-white/10 bg-bg1 px-3 text-sm"><option value="">همه</option><option value="published">منتشر</option><option value="draft">پیش‌نویس</option><option value="hidden">مخفی</option><option value="pending">در انتظار بررسی</option><option value="rejected">ردشده</option></select><select value={ph} onChange={(e) => setPh(e.target.value)} aria-label="مرحله‌ی تمرین" className="h-11 rounded-full border border-white/10 bg-bg1 px-3 text-sm"><option value="">همه‌ی مراحل</option><option value="warmup">مناسب گرم کردن</option><option value="peak">مناسب اوج</option><option value="cooldown">مناسب سرد کردن</option></select></div>
      {tracks.length > 0 && <div className="mb-3 flex flex-wrap items-center gap-2">
        <KButton size="sm" variant="outline" onClick={() => { setSelMode(!selMode); setSel(new Set()); }}>{selMode ? 'لغو انتخاب' : 'انتخاب چندتایی'}</KButton>
        {selMode && <>
          <KButton size="sm" variant="outline" onClick={() => setSel(allSel ? new Set() : new Set(filtered.map((t) => t.id)))}>{allSel ? 'برداشتن همه' : `انتخاب همه (${fa(filtered.length)})`}</KButton>
          <KButton size="sm" disabled={!sel.size} onClick={() => setBulk('selected')} className="bg-destructive text-destructive-foreground"><Trash2 className="h-4 w-4" />حذف {fa(sel.size)} ترک</KButton>
        </>}
        <KButton size="sm" variant="outline" onClick={() => setBulk('all')} className="ms-auto text-destructive"><Trash2 className="h-4 w-4" />حذف همه‌ی کتابخانه ({fa(tracks.length)})</KButton>
      </div>}
      {!tracks.length ? <Glass><StateView icon={Music} title="کتابخانه خالی است" text="از تب «افزودن آهنگ» یا «ورود از لینک» آهنگ اضافه کن." /></Glass>
        : canSort ? <><p className="mb-2 text-xs text-muted-foreground">برای تغییر ترتیب نمایش، بکش یا از فلش‌ها استفاده کن.</p><SortableList items={tracks} onReorder={reorder} render={(t) => <div className="flex items-center gap-2">{row(t)}<button onClick={() => setDel(t)} className="tap grid place-items-center text-muted-foreground hover:text-destructive" aria-label="حذف"><Trash2 className="h-4 w-4" /></button></div>} /></>
        : <ul className="space-y-2">{filtered.map((t) => <li key={t.id} className={cn('glass flex items-center gap-2 rounded-2xl p-2', selMode && sel.has(t.id) && 'ring-2 ring-destructive/60')}>{selMode && <input type="checkbox" checked={sel.has(t.id)} onChange={() => toggle(t.id)} aria-label="انتخاب" className="h-5 w-5 shrink-0 accent-[hsl(var(--destructive))]" />}{row(t)}{!selMode && <button onClick={() => setDel(t)} className="tap grid place-items-center text-muted-foreground hover:text-destructive" aria-label="حذف"><Trash2 className="h-4 w-4" /></button>}</li>)}</ul>}
      <ResponsiveModal open={!!edit} onOpenChange={(v) => !v && setEdit(null)} title="ویرایش آهنگ">{edit && <EditTrack t={edit} onSaved={(all) => { setTracks(all); setEdit(null); }} />}</ResponsiveModal>
      <Confirm open={!!del} onOpenChange={(v) => !v && setDel(null)} danger title="حذف آهنگ؟" confirmLabel="حذف" text="آهنگ از کتابخانه و همه‌ی مجموعه‌ها حذف می‌شود." onConfirm={() => del && adminTracks({ token, action: 'delete', id: del.id }).then((r) => { setTracks(r.tracks); toast.success('حذف شد'); }).catch((e) => toast.error(errMsg(e)))} />
      <ResponsiveModal open={!!bulk} onOpenChange={(v) => { if (!v) { setBulk(null); setPhrase(''); } }} title={bulk === 'all' ? 'حذف کامل کتابخانه' : `حذف ${fa(sel.size)} ترک`}>
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">{bulk === 'all' ? `همه‌ی ${fa(tracks.length)} ترک، به‌همراه علاقه‌مندی‌ها، تاریخچه‌ی پخش و آیتم‌های مجموعه‌ها برای همیشه پاک می‌شوند. پادکست‌ها دست نمی‌خورند.` : 'ترک‌های انتخاب‌شده و همه‌ی ارجاع‌هایشان (مجموعه‌ها، علاقه‌مندی‌ها، تاریخچه) برای همیشه پاک می‌شوند.'}</p>
          {bulk === 'all' && <label className="block text-sm font-bold">برای تأیید بنویس «حذف همه»<input value={phrase} onChange={(e) => setPhrase(e.target.value)} className={inp} /></label>}
          <KButton className="w-full bg-destructive text-destructive-foreground" loading={busy} disabled={bulk === 'all' ? phrase.trim() !== 'حذف همه' : !sel.size} onClick={runBulk}><Trash2 className="h-4 w-4" />حذف برای همیشه</KButton>
        </div>
      </ResponsiveModal>
    </>
  );
}

type Draft = { title: string; artist: string; album: string; audioUrl: string; coverUrl: string; durationSeconds: number; source: 'upload' | 'external'; shareUrl: string; licenseUrl: string; rights: string };
const BLANK: Draft = { title: '', artist: '', album: '', audioUrl: '', coverUrl: '', durationSeconds: 0, source: 'upload', shareUrl: '', licenseUrl: '', rights: '' };

function AddTrack({ init, onAdded }: { init: Draft; onAdded: (all: T[]) => void }) {
  const { token } = useAdmin();
  const { upload, isUploading } = useUpload();
  const [f, setF] = useState<Draft>(init); const [busy, setBusy] = useState(false);
  useEffect(() => setF(init), [init]);
  const onFile = async (file: File | undefined, kind: 'audio' | 'cover') => {
    if (!file) return;
    try {
      const { url } = await upload(file);
      if (kind === 'cover') { setF((x) => ({ ...x, coverUrl: url })); return; }
      setF((x) => ({ ...x, audioUrl: url, source: 'upload', title: x.title || file.name.replace(/\.\w+$/, '') }));
      const a = new Audio(URL.createObjectURL(file));
      a.onloadedmetadata = () => Number.isFinite(a.duration) && setF((x) => ({ ...x, durationSeconds: Math.round(a.duration) }));
    } catch (e) { toast.error(errMsg(e)); }
  };
  const ok = f.title.trim() && f.audioUrl.startsWith('https://') && (f.rights.trim() || f.licenseUrl.trim());
  const save = async () => { setBusy(true); try { const r = await adminTracks({ token, action: 'create', draft: f }); onAdded(r.tracks); setF(BLANK); toast.success('به کتابخانه اضافه شد (پیش‌نویس)'); } catch (e) { toast.error(errMsg(e)); } finally { setBusy(false); } };
  return (
    <Glass className="space-y-3 p-4">
      <label className="block text-sm font-bold">فایل صوتی<input type="file" accept="audio/*" disabled={isUploading} onChange={(e) => onFile(e.target.files?.[0], 'audio')} className={cn(inp, 'pt-2')} /></label>
      <label className="block text-sm font-bold">یا لینک مستقیم پخش (https)<input value={f.audioUrl} onChange={(e) => setF({ ...f, audioUrl: e.target.value.trim(), source: 'external' })} dir="ltr" placeholder="https://…/track.mp3" className={inp} /></label>
      {f.audioUrl.startsWith('https://') && <audio src={f.audioUrl} controls preload="none" className="h-8 w-full" />}
      <label className="block text-sm font-bold">کاور (اختیاری)<input type="file" accept="image/*" disabled={isUploading} onChange={(e) => onFile(e.target.files?.[0], 'cover')} className={cn(inp, 'pt-2')} /></label>
      {isUploading && <p className="flex items-center gap-1 text-xs text-primary"><Loader2 className="h-3 w-3 animate-spin" />در حال آپلود…</p>}
      <label className="block text-sm font-bold">عنوان *<input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} className={inp} /></label>
      <div className="grid gap-3 sm:grid-cols-2"><label className="block text-sm font-bold">هنرمند<input value={f.artist} onChange={(e) => setF({ ...f, artist: e.target.value })} className={inp} /></label><label className="block text-sm font-bold">آلبوم<input value={f.album} onChange={(e) => setF({ ...f, album: e.target.value })} className={inp} /></label></div>
      <div className="grid gap-3 sm:grid-cols-2"><label className="block text-sm font-bold">لینک مجوز<input value={f.licenseUrl} onChange={(e) => setF({ ...f, licenseUrl: e.target.value.trim() })} dir="ltr" className={inp} /></label><label className="block text-sm font-bold">صفحه‌ی منبع<input value={f.shareUrl} onChange={(e) => setF({ ...f, shareUrl: e.target.value.trim() })} dir="ltr" className={inp} /></label></div>
      <label className="block text-sm font-bold">حقوق و مجوز *<textarea value={f.rights} onChange={(e) => setF({ ...f, rights: e.target.value })} rows={2} placeholder="مثلاً: CC BY 4.0 — یا: مالکیت کاپوش" className={cn(inp, 'h-auto py-2')} /></label>
      <KButton className="w-full" loading={busy} disabled={!ok || isUploading} onClick={save}><Plus className="h-4 w-4" />افزودن به کتابخانه</KButton>
      <p className="text-[11px] text-muted-foreground">فقط محتوایی اضافه کن که مجوز پخشش را داری. آهنگ ابتدا پیش‌نویس است و از تب کتابخانه منتشر می‌شود.</p>
    </Glass>
  );
}

function ImportTab({ onAdded }: { onAdded: (all: T[]) => void }) {
  const { token } = useAdmin();
  const [url, setUrl] = useState(''); const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<AdminInspectUrlOutputType | null>(null);
  const [draft, setDraft] = useState<Draft>(BLANK);
  const inspect = async () => { setBusy(true); setRes(null); try { setRes(await adminInspectUrl({ token, url })); } catch (e) { toast.error(errMsg(e)); } finally { setBusy(false); } };
  return (
    <div className="space-y-4">
      <Glass className="space-y-2 p-4">
        <div className="text-sm font-bold">پیدا کردن فایل‌های صوتی عمومی در یک صفحه یا فید</div>
        <form onSubmit={(e) => { e.preventDefault(); inspect(); }} className="flex gap-2"><input value={url} onChange={(e) => setUrl(e.target.value)} dir="ltr" placeholder="https://…" className="h-11 min-w-0 flex-1 rounded-full border border-white/10 bg-bg1 px-4 text-sm outline-none focus:border-primary" /><KButton type="submit" loading={busy} disabled={!/^https?:\/\//.test(url)}><Search className="h-4 w-4" />بررسی</KButton></form>
        <p className="text-[11px] text-muted-foreground">robots.txt بررسی می‌شود و فقط لینک‌های صوتی عمومی برگردانده می‌شوند.</p>
        {res && <div className="space-y-2 pt-2">
          <div className="text-xs text-muted-foreground">{res.title || 'بدون عنوان'} — {res.robotsNote}</div>
          {!res.candidates.length ? <p className="text-sm text-muted-foreground">فایل صوتی عمومی پیدا نشد.</p> : res.candidates.map((c) => (
            <div key={c.audioUrl} className="flex items-center gap-2 rounded-2xl bg-white/5 p-2 text-sm"><span className="min-w-0 flex-1 truncate" dir="auto">{c.title}</span>
              <KButton size="sm" variant="outline" onClick={() => setDraft({ ...BLANK, title: c.title, audioUrl: c.audioUrl, coverUrl: c.artwork ?? '', durationSeconds: c.durationSec ?? 0, source: 'external', shareUrl: url })}>انتخاب</KButton></div>
          ))}
        </div>}
      </Glass>
      <AddTrack init={draft} onAdded={onAdded} />
    </div>
  );
}

function PodcastsTab() {
  const { token } = useAdmin();
  const [d, setD] = useState<AdminShowsOutputType | null>(null); const [err, setErr] = useState<string>();
  const [url, setUrl] = useState(''); const [cat, setCat] = useState<'fitness' | 'running' | 'focus' | 'recovery' | 'nutrition'>('fitness'); const [busy, setBusy] = useState<string | null>(null);
  const run = useCallback(async (key: string, input: Omit<AdminShowsInputType, 'token'>) => {
    setBusy(key); setErr(undefined);
    try { const r = await adminShows({ token, ...input }); setD(r); if (r.message) toast(r.message); if (input.action === 'add') setUrl(''); }
    catch (e) { if (input.action === 'list') setErr(errMsg(e)); else toast.error(errMsg(e)); } finally { setBusy(null); }
  }, [token]);
  useEffect(() => { void run('list', { action: 'list' }); }, [run]);
  const CAT_L = { fitness: 'تناسب اندام', running: 'دویدن', focus: 'تمرکز', recovery: 'ریکاوری', nutrition: 'تغذیه' } as const;
  return (
    <div className="space-y-3">
      <Glass className="space-y-2 p-4">
        <div className="text-sm font-bold">افزودن پادکست با فید RSS/Atom</div>
        <div className="flex flex-wrap gap-2">
          <input value={url} onChange={(e) => setUrl(e.target.value)} dir="ltr" placeholder="https://…/feed.xml" className="h-11 min-w-0 flex-1 basis-48 rounded-full border border-white/10 bg-bg1 px-4 text-sm outline-none focus:border-primary" />
          <select value={cat} onChange={(e) => setCat(e.target.value as typeof cat)} aria-label="دسته" className="h-11 rounded-full border border-white/10 bg-bg1 px-3 text-sm">{Object.entries(CAT_L).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
          <KButton loading={busy === 'add'} disabled={!/^https?:\/\//.test(url) || !!busy} onClick={() => run('add', { action: 'add', feedUrl: url, category: cat })}><Plus className="h-4 w-4" />افزودن</KButton>
        </div>
      </Glass>
      {err ? <Glass><ErrorState text={err} onRetry={() => run('list', { action: 'list' })} /></Glass> : !d ? <ListSkeleton /> : !d.shows.length ? <Glass><StateView icon={Mic2} title="هنوز پادکستی اضافه نشده" text="آدرس فید RSS یک پادکست را وارد کن." /></Glass> : (
        <ul className="space-y-2">{d.shows.map((s) => (
          <li key={s.id} className="glass flex items-center gap-3 rounded-2xl p-3">
            <div className="min-w-0 flex-1"><div className="truncate font-bold">{s.title}</div><div className="truncate text-xs text-muted-foreground">{fa(s.episodeCount)} قسمت · {CAT_L[s.category as keyof typeof CAT_L] ?? s.category}{s.syncError ? ` · خطا: ${s.syncError}` : ''}</div></div>
            <button disabled={!!busy} onClick={() => run(s.id, { action: 'sync', id: s.id })} className="tap grid place-items-center rounded-full text-muted-foreground hover:text-foreground" aria-label="همگام‌سازی">{busy === s.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}</button>
            <button disabled={!!busy} onClick={() => run(s.id, { action: 'delete', id: s.id })} className="tap grid place-items-center rounded-full text-muted-foreground hover:text-destructive" aria-label="حذف"><Trash2 className="h-4 w-4" /></button>
          </li>
        ))}</ul>
      )}
    </div>
  );
}

export function AdminMorshed() {
  const { token } = useAdmin();
  const [tab, setTab] = useState<'review' | 'sources' | 'library' | 'add' | 'import' | 'podcasts' | 'collections'>('review');
  const [d, setD] = useState<{ tracks: T[] } | null>(null); const [err, setErr] = useState<string>();
  const load = useCallback(() => { setErr(undefined); adminTracks({ token, action: 'list' }).then((r) => setD({ tracks: r.tracks })).catch((e) => setErr(errMsg(e))); }, [token]);
  useEffect(load, [load]);
  const setTracks = useCallback((tracks: T[]) => setD({ tracks }), []);
  const added = useCallback((tracks: T[]) => { setD({ tracks }); setTab('library'); }, []);
  return (
    <div>
      <PageHead title="مرشد" sub="منبع ← import ← بررسی و تأیید ← انتشار؛ به‌علاوه‌ی آپلود دستی، پادکست‌ها و مجموعه‌ها" />
      <div className="mb-4 flex gap-2 overflow-x-auto" role="tablist">{([['review', `بررسی ترک‌ها${d ? ` (${fa(d.tracks.filter((x) => x.status === 'pending').length)})` : ''}`], ['sources', 'منابع و import'], ['library', 'کتابخانه'], ['add', 'افزودن آهنگ'], ['import', 'ورود از لینک'], ['podcasts', 'پادکست‌ها'], ['collections', 'مجموعه‌ها']] as const).map(([k, l]) => <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)} className={cn('tap shrink-0 rounded-full px-5 text-sm font-bold', tab === k ? 'bg-primary text-primary-foreground' : 'bg-white/5 text-muted-foreground')}>{l}</button>)}</div>
      {tab === 'podcasts' ? <PodcastsTab /> : tab === 'sources' ? <SourcesTab onImported={load} /> : err ? <Glass><ErrorState text={err} onRetry={load} /></Glass> : !d ? <ListSkeleton /> : tab === 'review' ? <ReviewTab tracks={d.tracks} setTracks={setTracks} /> : tab === 'library' ? <LibraryTab tracks={d.tracks} setTracks={setTracks} /> : tab === 'add' ? <AddTrack init={BLANK} onAdded={added} /> : tab === 'import' ? <ImportTab onAdded={added} /> : <CollectionsPanel tracks={d.tracks} />}
    </div>
  );
}
