import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { AlertTriangle, Check, X, ShieldOff, UserX, ExternalLink, Play, Download, Radio, ListChecks, Mic2, Trash2 } from 'lucide-react';
import { adminDiscover, adminTracks, type AdminTracksOutputType, type AdminDiscoverOutputType } from 'zitejs/api';
import { Switch } from '@project/components/ui/switch';
import { Checkbox } from '@project/components/ui/checkbox';
import { cn } from '@project/components/lib/utils';
import { KButton, Glass, StateView } from '../../components/kit';
import { Confirm, ResponsiveModal } from '../../components/admin/ui';
import { useAdmin, errMsg } from '../../lib/session';
import { fa } from '../../lib/config';

type T = AdminTracksOutputType['tracks'][0];
const dur = (s: number) => (s ? `${fa(Math.floor(s / 60))}:${fa(String(Math.floor(s % 60)).padStart(2, '0'))}` : '—');

export const LegalNotice = () => (
  <div className="flex gap-3 rounded-2xl border border-gold/30 bg-gold/10 p-3 text-xs leading-6 text-foreground">
    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
    <p>موسیقی تجاری (پاپ، رپ و …) معمولاً کپی‌رایت دارد و سایت‌های دانلود ایرانی مجوز بازنشر ندارند. فقط ترک‌هایی را منتشر کن که مطمئنی اجازه‌ی پخششان وجود دارد؛ هر درخواست صاحب اثر را با «حذف فوری» همان لحظه اجرا کن.</p>
  </div>
);

/* ---------- Review queue: approve / reject / takedown ---------- */
export function ReviewTab({ tracks, setTracks }: { tracks: T[]; setTracks: (t: T[]) => void }) {
  const { token } = useAdmin();
  const pending = useMemo(() => tracks.filter((t) => t.status === 'pending'), [tracks]);
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState<string | null>(null);
  const [ask, setAsk] = useState<{ kind: 'takedown' | 'takedownArtist'; t: T } | null>(null);
  const [playing, setPlaying] = useState<string | null>(null);
  const toggle = (id: string) => setSel((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const act = async (action: 'approve' | 'reject', ids: string[]) => {
    setBusy(action);
    try { const r = await adminTracks({ token, action, ids }); setTracks(r.tracks); setSel(new Set()); toast.success(action === 'approve' ? `${fa(ids.length)} ترک منتشر شد` : `${fa(ids.length)} ترک رد شد`); }
    catch (e) { toast.error(errMsg(e)); } finally { setBusy(null); }
  };
  const takedown = async () => {
    if (!ask) return;
    try { const r = await adminTracks({ token, action: ask.kind, id: ask.t.id, artist: ask.t.artist }); setTracks(r.tracks); toast.success('حذف فوری انجام شد و در فهرست سیاه ثبت شد'); }
    catch (e) { toast.error(errMsg(e)); }
  };
  if (!pending.length) return <Glass><StateView icon={ListChecks} title="صف بررسی خالی است" text="از تب «منابع و import» ترک جدید وارد کن؛ ترک‌ها اول این‌جا برای تأیید می‌آیند." /></Glass>;
  return (
    <div className="space-y-3">
      <LegalNotice />
      <div className="sticky top-0 z-10 flex flex-wrap items-center gap-2 rounded-2xl bg-bg1/90 p-2 backdrop-blur">
        <label className="flex min-h-[44px] items-center gap-2 px-2 text-sm"><Checkbox checked={sel.size === pending.length} onCheckedChange={(v) => setSel(v ? new Set(pending.map((t) => t.id)) : new Set())} aria-label="انتخاب همه" />{fa(sel.size)} از {fa(pending.length)}</label>
        <div className="ms-auto flex gap-2">
          <KButton size="sm" loading={busy === 'approve'} disabled={!sel.size || !!busy} onClick={() => act('approve', [...sel])}><Check className="h-4 w-4" />تأیید و انتشار</KButton>
          <KButton size="sm" variant="outline" loading={busy === 'reject'} disabled={!sel.size || !!busy} onClick={() => act('reject', [...sel])}><X className="h-4 w-4" />رد</KButton>
        </div>
      </div>
      <ul className="space-y-2">{pending.map((t) => (
        <li key={t.id} className={cn('glass rounded-2xl p-3 transition-colors', sel.has(t.id) && 'ring-1 ring-primary')}>
          <div className="flex items-center gap-3">
            <Checkbox checked={sel.has(t.id)} onCheckedChange={() => toggle(t.id)} aria-label={`انتخاب ${t.title}`} />
            {t.coverUrl ? <img src={`/media/cover/${t.id}`} alt="" className="h-12 w-12 shrink-0 rounded-xl object-cover" loading="lazy" /> : <div className="h-12 w-12 shrink-0 rounded-xl bg-white/5" />}
            <div className="min-w-0 flex-1">
              <div className="truncate font-bold" dir="auto">{t.title}</div>
              <div className="truncate text-xs text-muted-foreground" dir="auto">{t.artist} · {t.sourceName} · {dur(t.duration)}{t.bitrate ? ` · ${fa(t.bitrate)}kbps` : ''}</div>
            </div>
            <button onClick={() => setPlaying(playing === t.id ? null : t.id)} className="tap grid place-items-center rounded-full text-primary" aria-label="پیش‌شنود"><Play className="h-4 w-4" /></button>
          </div>
          {playing === t.id && <audio src={`/media/stream/${t.id}`} controls autoPlay preload="none" className="mt-2 h-9 w-full" />}
          <div className="mt-2 flex flex-wrap gap-2 text-xs">
            {t.sourceUrl && <a href={t.sourceUrl} target="_blank" rel="noopener noreferrer" className="flex min-h-[36px] items-center gap-1 rounded-full bg-white/5 px-3">صفحه‌ی منبع<ExternalLink className="h-3 w-3" /></a>}
            <button onClick={() => act('approve', [t.id])} className="min-h-[36px] rounded-full bg-primary/15 px-3 font-bold text-primary">تأیید</button>
            <button onClick={() => act('reject', [t.id])} className="min-h-[36px] rounded-full bg-white/5 px-3">رد</button>
            <button onClick={() => setAsk({ kind: 'takedown', t })} className="flex min-h-[36px] items-center gap-1 rounded-full bg-destructive/15 px-3 text-destructive"><ShieldOff className="h-3 w-3" />حذف فوری</button>
            <button onClick={() => setAsk({ kind: 'takedownArtist', t })} className="flex min-h-[36px] items-center gap-1 rounded-full bg-destructive/10 px-3 text-destructive"><UserX className="h-3 w-3" />حذف همه‌ی آثار هنرمند</button>
          </div>
        </li>
      ))}</ul>
      <Confirm open={!!ask} onOpenChange={(v) => !v && setAsk(null)} danger confirmLabel="حذف فوری"
        title={ask?.kind === 'takedownArtist' ? `حذف همه‌ی آثار «${ask.t.artist}»؟` : 'حذف فوری این ترک؟'}
        text="ترک(ها) همراه با علاقه‌مندی‌ها، تاریخچه و مجموعه‌ها حذف و در فهرست سیاه ثبت می‌شوند تا import بعدی دوباره واردشان نکند." onConfirm={takedown} />
    </div>
  );
}

/* ---------- Sources + import runner with live progress ---------- */
export function SourcesTab({ onImported }: { onImported: () => void }) {
  const { token } = useAdmin();
  const [d, setD] = useState<AdminDiscoverOutputType | null>(null);
  const [accept, setAccept] = useState<{ id: string; name: string } | null>(null);
  const [agree, setAgree] = useState(false);
  const [target, setTarget] = useState(50);
  const [busy, setBusy] = useState<string | null>(null);
  const [purge, setPurge] = useState(false); const [phrase, setPhrase] = useState('');
  const call = useCallback(async (key: string, input: Parameters<typeof adminDiscover>[0]) => {
    setBusy(key);
    try { const r = await adminDiscover(input); setD(r); return r; } catch (e) { toast.error(errMsg(e)); } finally { setBusy(null); }
  }, []);
  useEffect(() => { void call('load', { token, action: 'state' }); }, [call, token]);
  const running = !!d?.job?.running;
  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => { adminDiscover({ token, action: 'state' }).then((r) => { setD(r); if (!r.job?.running) onImported(); }).catch(() => {}); }, 2500);
    return () => clearInterval(t);
  }, [running, token, onImported]);
  const enabled = d?.sources.filter((s) => s.enabled) ?? [];
  const job = d?.job;
  const pct = job ? Math.min(100, Math.round((job.added / Math.max(1, job.target)) * 100)) : 0;

  return (
    <div className="space-y-4">
      <LegalNotice />
      <Glass className="space-y-3 p-4">
        <div className="flex items-center gap-2 font-bold"><Radio className="h-4 w-4 text-primary" />۱. منابع موسیقی فارسی</div>
        {!d ? <p className="text-sm text-muted-foreground">در حال بارگذاری…</p> : d.sources.map((s) => (
          <div key={s.id} className="flex items-start gap-3 rounded-2xl bg-black/20 p-3">
            <div className="min-w-0 flex-1">
              <div className="font-bold">{s.name} <span className="text-xs font-normal text-muted-foreground" dir="ltr">{s.site}</span></div>
              <p className="mt-1 text-xs leading-6 text-muted-foreground">{s.note}</p>
              {s.enabled && s.acceptedAt && <p className="text-[11px] text-gold">مسئولیت مجوز پذیرفته شد · {new Date(s.acceptedAt).toLocaleDateString('fa-IR')}</p>}
            </div>
            <Switch checked={s.enabled} aria-label={`فعال‌سازی ${s.name}`} disabled={!!busy}
              onCheckedChange={(v) => (v && !s.openLicense ? (setAgree(false), setAccept({ id: s.id, name: s.name })) : call(s.id, { token, action: 'setSource', sourceId: s.id, enabled: v }))} />
          </div>
        ))}
        {!!d?.excluded.length && <details className="text-xs text-muted-foreground"><summary className="cursor-pointer py-2">منابع بررسی‌شده و کنار گذاشته‌شده ({fa(d.excluded.length)})</summary><ul className="space-y-1 ps-4">{d.excluded.map((x) => <li key={x.name}><b>{x.name}</b>: {x.reason}</li>)}</ul></details>}
      </Glass>

      <Glass className="space-y-3 p-4">
        <div className="flex items-center gap-2 font-bold"><Download className="h-4 w-4 text-primary" />۲. اجرای import</div>
        <p className="text-xs leading-6 text-muted-foreground">حداکثر ۱ درخواست در ثانیه به هر سایت؛ هر فایل قبل از ذخیره از همین سرور تست می‌شود. فقط متادیتا ذخیره می‌شود و پخش از طریق دامنه‌ی خود کایار است. ترک‌ها به صف بررسی می‌روند.</p>
        <label className="flex items-center gap-3 text-sm">سقف ترک
          <input type="number" inputMode="numeric" min={1} max={300} value={target} onChange={(e) => setTarget(Math.max(1, Math.min(300, Number(e.target.value) || 1)))} className="h-11 w-24 rounded-2xl border border-white/10 bg-bg1 px-3 text-center" /></label>
        <KButton disabled={!enabled.length || running || !!busy} loading={busy === 'import'} onClick={() => call('import', { token, action: 'import', sourceIds: enabled.map((s) => s.id), target })}>
          <Download className="h-4 w-4" />{enabled.length ? `شروع از ${enabled.map((s) => s.name).join('، ')}` : 'اول یک منبع را فعال کن'}</KButton>
        {job && (
          <div className="space-y-2">
            <div className="flex justify-between text-xs"><span>{job.running ? 'در حال اجرا…' : job.error ? 'با خطا تمام شد' : 'آخرین اجرا تمام شد'} · {job.source}</span><span>{fa(job.added)} / {fa(job.target)} · رد: {fa(job.rejected)}</span></div>
            <div className="h-2 overflow-hidden rounded-full bg-white/5"><div className="h-full rounded-full bg-primary transition-[width] duration-500" style={{ width: `${pct}%` }} /></div>
            <pre className="max-h-56 overflow-auto whitespace-pre-wrap rounded-2xl bg-black/30 p-3 text-[11px] leading-5 text-muted-foreground" dir="auto">{job.log.slice(-60).join('\n')}</pre>
          </div>
        )}
      </Glass>

      <Glass className="flex flex-wrap items-center gap-3 p-4">
        <Mic2 className="h-4 w-4 text-primary" /><div className="flex-1 text-sm">کشف پادکست‌های فارسی (RSS رسمی خود تولیدکننده)</div>
        <KButton variant="outline" size="sm" loading={busy === 'podcasts'} disabled={!!busy} onClick={async () => { const r = await call('podcasts', { token, action: 'podcasts' }); if (r?.podcasts) toast.success(`${fa(r.podcasts.added)} پادکست جدید`); }}>کشف پادکست</KButton>
      </Glass>

      <Glass className="flex flex-wrap items-center gap-3 border border-destructive/30 p-4">
        <Trash2 className="h-4 w-4 text-destructive" /><div className="flex-1 text-sm">حذف کامل همه‌ی ترک‌ها (پادکست‌ها دست نمی‌خورند)</div>
        <KButton variant="outline" size="sm" onClick={() => { setPhrase(''); setPurge(true); }}>حذف همه…</KButton>
      </Glass>

      <ResponsiveModal open={!!accept} onOpenChange={(v) => !v && setAccept(null)} title={`فعال‌سازی ${accept?.name ?? ''}`}>
        <div className="space-y-3">
          <LegalNotice />
          <label className="flex min-h-[48px] items-start gap-3 text-sm leading-7"><Checkbox checked={agree} onCheckedChange={(v) => setAgree(!!v)} className="mt-1.5" />من مسئولیت بررسی مجوز پخش هر ترک را می‌پذیرم و فقط ترک‌های مجاز را منتشر می‌کنم.</label>
          <KButton className="w-full" disabled={!agree} onClick={async () => { if (accept) await call(accept.id, { token, action: 'setSource', sourceId: accept.id, enabled: true, acceptLicense: true }); setAccept(null); }}>فعال کن</KButton>
        </div>
      </ResponsiveModal>
      <ResponsiveModal open={purge} onOpenChange={setPurge} title="حذف همه‌ی ترک‌ها">
        <div className="space-y-3 text-sm">
          <p>همه‌ی ترک‌ها، علاقه‌مندی‌ها و تاریخچه‌ی پخش موزیک حذف می‌شوند. برای تأیید بنویس: <b>حذف همه</b></p>
          <input value={phrase} onChange={(e) => setPhrase(e.target.value)} className="h-11 w-full rounded-2xl border border-white/10 bg-bg1 px-3" aria-label="عبارت تأیید" />
          <KButton className="w-full" disabled={phrase !== 'حذف همه'} onClick={async () => { try { await adminTracks({ token, action: 'purgeAll', confirm: phrase }); toast.success('همه‌ی ترک‌ها حذف شد'); setPurge(false); onImported(); } catch (e) { toast.error(errMsg(e)); } }}>حذف قطعی</KButton>
        </div>
      </ResponsiveModal>
    </div>
  );
}
