import { useCallback, useEffect, useState } from 'react';
import { Activity, Database, HardDrive, AlertTriangle, DownloadCloud, Trash2, RefreshCw, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Glass, KButton } from '../kit';
import { useAdmin } from '../../lib/session';
import { fmtDate } from './ui';

type Health = { db: string; version: string; uptimeSec: number; disk: { usedMB: number; files: number; limitMB: number; usedPct: number }; errors24h: number; lastBackupAt: string | null; recentErrors: { at: string; route: string; status: number; message: string }[] };
type Orphans = { dryRun: boolean; totalFiles: number; referenced: number; orphans: { file: string; bytes: number }[]; orphanBytes: number; deleted?: number };

async function ops<T>(token: string, path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, { ...init, headers: { ...(init?.headers ?? {}), Authorization: `Bearer ${token}`, ...(init?.body ? { 'Content-Type': 'application/json' } : {}) } });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message || 'درخواست ناموفق بود؛ دوباره تلاش کنید.');
  return res.json() as Promise<T>;
}
const fa = (n: number) => n.toLocaleString('fa-IR');

function Stat({ icon: I, label, value, tone }: { icon: typeof Activity; label: string; value: string; tone: 'ok' | 'warn' | 'bad' }) {
  const c = tone === 'ok' ? 'text-primary bg-primary/15' : tone === 'warn' ? 'text-gold bg-gold/15' : 'text-destructive bg-destructive/15';
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-white/[0.03] p-3">
      <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${c}`}><I className="h-5 w-5" /></span>
      <div className="min-w-0"><div className="text-xs text-muted-foreground">{label}</div><div className="truncate font-bold">{value}</div></div>
    </div>
  );
}

/** «سلامت سیستم»: DB, disk, recent errors, last backup + backup download and orphan-file cleanup (superadmin). */
export function SystemHealth() {
  const { token, can } = useAdmin();
  const [h, setH] = useState<Health | null>(null); const [err, setErr] = useState<string>();
  const [busy, setBusy] = useState<'backup' | 'orphans' | 'delete' | null>(null); const [orph, setOrph] = useState<Orphans | null>(null); const [armed, setArmed] = useState(false);
  const load = useCallback(() => { setErr(undefined); ops<Health>(token, '/ops/health').then(setH).catch((e) => setErr((e as Error).message)); }, [token]);
  useEffect(load, [load]);
  const manage = can('settings.manage');

  const backup = async () => {
    setBusy('backup');
    try {
      const res = await fetch('/ops/backup', { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message || 'دریافت بک‌آپ ناموفق بود.');
      const name = /filename="([^"]+)"/.exec(res.headers.get('content-disposition') ?? '')?.[1] ?? 'kayar-backup.json.gz';
      const url = URL.createObjectURL(await res.blob());
      const a = Object.assign(document.createElement('a'), { href: url, download: name }); a.click(); setTimeout(() => URL.revokeObjectURL(url), 5000);
      toast.success('بک‌آپ دانلود شد.'); load();
    } catch (e) { toast.error((e as Error).message); } finally { setBusy(null); }
  };
  const scan = async (confirm?: boolean) => {
    setBusy(confirm ? 'delete' : 'orphans'); setArmed(false);
    try { const r = await ops<Orphans>(token, '/ops/orphans', { method: 'POST', body: JSON.stringify(confirm ? { confirm: 'DELETE' } : {}) }); setOrph(r); if (confirm) { toast.success(`${fa(r.deleted ?? 0)} فایل یتیم حذف شد.`); load(); } }
    catch (e) { toast.error((e as Error).message); } finally { setBusy(null); }
  };

  return (
    <Glass className="mt-4">
      <div className="mb-3 flex items-center gap-2"><Activity className="h-5 w-5 text-primary" /><h2 className="text-lg font-black">سلامت سیستم</h2>
        <button onClick={load} aria-label="بازخوانی" className="tap ms-auto grid h-9 w-9 place-items-center rounded-full text-muted-foreground"><RefreshCw className="h-4 w-4" /></button></div>
      {err ? <p className="text-sm text-destructive">{err}</p> : !h ? <div className="grid gap-2 sm:grid-cols-4">{[0, 1, 2, 3].map((i) => <div key={i} className="h-16 animate-pulse rounded-2xl bg-white/5" />)}</div> : (
        <>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <Stat icon={Database} label="دیتابیس" value={h.db === 'ok' ? 'سالم' : 'قطع'} tone={h.db === 'ok' ? 'ok' : 'bad'} />
            <Stat icon={HardDrive} label="فضای آپلود" value={`${fa(h.disk.usedMB)} از ${fa(h.disk.limitMB)} مگابایت (${fa(h.disk.usedPct)}٪)`} tone={h.disk.usedPct >= 90 ? 'bad' : h.disk.usedPct >= 75 ? 'warn' : 'ok'} />
            <Stat icon={AlertTriangle} label="خطاهای ۲۴ ساعت اخیر" value={fa(Math.max(0, h.errors24h))} tone={h.errors24h > 20 ? 'bad' : h.errors24h > 0 ? 'warn' : 'ok'} />
            <Stat icon={DownloadCloud} label="آخرین بک‌آپ" value={h.lastBackupAt ? fmtDate(h.lastBackupAt) : 'هنوز گرفته نشده'} tone={h.lastBackupAt && Date.now() - new Date(h.lastBackupAt).getTime() < 8 * 864e5 ? 'ok' : 'warn'} />
          </div>
          {h.disk.usedPct >= 90 && <p className="mt-3 rounded-2xl bg-destructive/10 p-3 text-sm text-destructive">فضای آپلود تقریباً پر است؛ آپلود اعضا متوقف می‌شود. فایل‌های یتیم را پاک کنید یا دیسک را بزرگ‌تر کنید.</p>}
          {h.recentErrors.length > 0 && (
            <details className="mt-3 text-sm"><summary className="cursor-pointer text-muted-foreground">خطاهای اخیر</summary>
              <ul className="mt-2 space-y-1">{h.recentErrors.map((e, i) => <li key={i} className="truncate rounded-xl bg-white/[0.03] px-3 py-2 font-latin text-xs" dir="ltr">{new Date(e.at).toLocaleString('fa-IR')} · {e.status} · {e.route} · {e.message}</li>)}</ul>
            </details>
          )}
          {manage && (
            <div className="mt-4 flex flex-wrap gap-2">
              <KButton variant="outline" onClick={backup} loading={busy === 'backup'}><DownloadCloud className="h-4 w-4" />دانلود بک‌آپ</KButton>
              <KButton variant="outline" onClick={() => scan()} loading={busy === 'orphans'}><HardDrive className="h-4 w-4" />بررسی فایل‌های یتیم</KButton>
            </div>
          )}
          {orph && (
            <div className="mt-3 rounded-2xl bg-white/[0.03] p-3 text-sm">
              <p>{fa(orph.totalFiles)} فایل روی دیسک، {fa(orph.orphans.length)} فایل بدون ارجاع ({fa(Math.round(orph.orphanBytes / 1048576))} مگابایت).</p>
              {orph.orphans.length > 0 && orph.dryRun && (
                <KButton variant="outline" className="mt-2 text-destructive" onClick={() => (armed ? scan(true) : setArmed(true))} disabled={busy === 'delete'}>
                  {busy === 'delete' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}{armed ? 'مطمئنم، برای همیشه حذف کن' : `حذف ${fa(orph.orphans.length)} فایل یتیم`}
                </KButton>
              )}
            </div>
          )}
          <p className="mt-3 text-xs text-muted-foreground">نسخه‌ی <span className="font-latin" dir="ltr">{h.version}</span></p>
        </>
      )}
    </Glass>
  );
}
