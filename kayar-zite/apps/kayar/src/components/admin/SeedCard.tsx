import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Database, Dumbbell, Apple } from 'lucide-react';
import { adminSeed, type AdminSeedOutputType } from 'zitejs/api';
import { KButton, Glass } from '../kit';
import { errMsg } from '../../lib/session';
import { fa } from '../../lib/config';

/** One-click loader for base content (exercise library with motion frames + food database). Safe to re-run: updates instead of duplicating. */
export function SeedCard({ token }: { token: string }) {
  const [d, setD] = useState<AdminSeedOutputType | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => { adminSeed({ token }).then(setD).catch(() => {}); }, [token]);
  const run = async () => {
    setBusy(true);
    try { const r = await adminSeed({ token, run: true }); setD(r); toast.success('داده‌های پایه بارگذاری شد'); }
    catch (e) { toast.error(errMsg(e)); } finally { setBusy(false); }
  };
  const Stat = ({ i: I, l, v, s }: { i: typeof Database; l: string; v?: number; s?: number }) => (
    <div className="flex items-center gap-3 rounded-2xl bg-black/20 p-3"><I className="h-5 w-5 text-primary" /><div className="flex-1 text-sm">{l}</div><div className="text-sm font-black">{v === undefined ? '…' : fa(v)}<span className="font-normal text-muted-foreground"> / {fa(s ?? 0)}</span></div></div>
  );
  return (
    <Glass className="space-y-3 p-5 lg:col-span-2">
      <div className="flex items-center gap-2 font-bold"><Database className="h-5 w-5 text-primary" />داده‌های پایه</div>
      <p className="text-sm text-muted-foreground">کتابخانه حرکات ورزشی (با تصاویر متحرک نحوه انجام، توضیح، اشتباهات رایج و نکات ایمنی) و بانک غذاهای ایرانی با کالری و ماکروها را با یک کلیک پر کن. اجرای دوباره چیزی را تکراری نمی‌کند، فقط به‌روزرسانی می‌کند.</p>
      <div className="grid gap-2 sm:grid-cols-2">
        <Stat i={Dumbbell} l="حرکات ورزشی" v={d?.exercises} s={d?.seed.exercises} />
        <Stat i={Apple} l="غذاها" v={d?.foods} s={d?.seed.foods} />
      </div>
      <KButton onClick={run} loading={busy}><Database className="h-5 w-5" />بارگذاری خودکار داده‌ها</KButton>
    </Glass>
  );
}
