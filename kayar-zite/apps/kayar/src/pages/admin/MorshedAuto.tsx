import { useEffect, useState } from 'react';
import { Clock, HardDrive } from 'lucide-react';
import type { AdminDiscoverOutputType } from 'zitejs/api';
import { Switch } from '@project/components/ui/switch';
import { KButton, Glass } from '../../components/kit';
import { fa } from '../../lib/config';

type D = AdminDiscoverOutputType;
type Auto = { enabled: boolean; hour: number; target: number; autoPublishOpen: boolean };

/** Nightly auto-import settings + permanent mirror status. */
export function MorshedAuto({ d, busy, onSave }: { d: D; busy: boolean; onSave: (a: Auto) => void }) {
  const [a, setA] = useState<Auto>(d.auto);
  useEffect(() => setA(d.auto), [d.auto]);
  const m = d.mirror;
  const pct = m.budgetMb ? Math.min(100, Math.round((m.mb / m.budgetMb) * 100)) : 0;
  const dirty = JSON.stringify(a) !== JSON.stringify({ enabled: d.auto.enabled, hour: d.auto.hour, target: d.auto.target, autoPublishOpen: d.auto.autoPublishOpen });
  return (
    <>
      <Glass className="space-y-3 p-4">
        <div className="flex items-center gap-2 font-bold"><Clock className="h-4 w-4 text-primary" />۳. import خودکار شبانه</div>
        <label className="flex min-h-[44px] items-center justify-between gap-3 text-sm">هر شب از منابع فعال ترک جدید بیاور<Switch checked={a.enabled} onCheckedChange={(v) => setA({ ...a, enabled: v })} aria-label="import خودکار" /></label>
        <div className="flex flex-wrap gap-3 text-sm">
          <label className="flex items-center gap-2">ساعت (تهران)
            <input type="number" min={0} max={23} value={a.hour} onChange={(e) => setA({ ...a, hour: Math.max(0, Math.min(23, Number(e.target.value) || 0)) })} className="h-11 w-20 rounded-2xl border border-white/10 bg-bg1 px-3 text-center" /></label>
          <label className="flex items-center gap-2">سقف هر شب
            <input type="number" min={5} max={300} value={a.target} onChange={(e) => setA({ ...a, target: Math.max(5, Math.min(300, Number(e.target.value) || 5)) })} className="h-11 w-24 rounded-2xl border border-white/10 bg-bg1 px-3 text-center" /></label>
        </div>
        <label className="flex min-h-[44px] items-center justify-between gap-3 text-sm">ترک‌های مجوز آزاد (CC) بدون بررسی منتشر شوند<Switch checked={a.autoPublishOpen} onCheckedChange={(v) => setA({ ...a, autoPublishOpen: v })} aria-label="انتشار خودکار" /></label>
        <p className="text-xs leading-6 text-muted-foreground">ترک‌های منابع بدون مجوز صریح همیشه به صف بررسی می‌روند.{d.auto.lastRun && ` آخرین اجرای خودکار: ${new Date(d.auto.lastRun).toLocaleDateString('fa-IR')}`}</p>
        <KButton size="sm" disabled={!dirty || busy} loading={busy} onClick={() => onSave(a)}>ذخیره</KButton>
      </Glass>
      <Glass className="space-y-2 p-4">
        <div className="flex items-center gap-2 font-bold"><HardDrive className="h-4 w-4 text-primary" />آرشیو روی سرور کایار</div>
        <p className="text-xs leading-6 text-muted-foreground">هر ترک منتشرشده به‌تدریج روی دیسک خود کایار ذخیره می‌شود تا پخش بدون فیلترشکن و مستقل از سایت منبع باشد.</p>
        <div className="flex justify-between text-xs"><span>{fa(m.files)} ترک ذخیره شده · {fa(m.pending)} در صف</span><span>{fa(m.mb)} / {fa(m.budgetMb)} مگابایت</span></div>
        <div className="h-2 overflow-hidden rounded-full bg-white/5"><div className="h-full rounded-full bg-primary transition-[width] duration-500" style={{ width: `${pct}%` }} /></div>
        {m.failed > 0 && <p className="text-[11px] text-gold">{fa(m.failed)} ترک فعلاً از سرور قابل دریافت نبود؛ ۶ ساعت بعد دوباره تلاش می‌شود.</p>}
      </Glass>
    </>
  );
}
