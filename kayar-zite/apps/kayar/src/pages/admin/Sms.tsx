import { useCallback, useEffect, useState } from 'react';
import { MessageSquareText, Send, Users, PlugZap, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { adminSms, type AdminSmsOutputType } from 'zitejs/api';
import { cn } from '@project/components/lib/utils';
import { KButton, Glass, StateView } from '../../components/kit';
import { PageHead, ListSkeleton, ErrorState, fmtDate, Confirm } from '../../components/admin/ui';
import { useAdmin, errMsg } from '../../lib/session';
import { fa } from '../../lib/config';

const inp = 'mt-1 w-full rounded-2xl border border-white/10 bg-bg1 px-3 text-sm outline-none focus:border-primary';
const ST: Record<string, [string, string]> = { sent: ['ارسال شد', 'bg-primary/15 text-primary'], simulated: ['آزمایشی', 'bg-white/10 text-muted-foreground'], failed: ['ناموفق', 'bg-destructive/15 text-destructive'], queued: ['در صف', 'bg-gold/15 text-gold'] };
const parts = (s: string) => Math.max(1, Math.ceil(s.length / 70));

export function AdminSms() {
  const { token } = useAdmin();
  const [d, setD] = useState<AdminSmsOutputType | null>(null); const [err, setErr] = useState('');
  const [mode, setMode] = useState<'send' | 'broadcast'>('send');
  const [to, setTo] = useState(''); const [body, setBody] = useState(''); const [busy, setBusy] = useState(false); const [confirm, setConfirm] = useState(false);
  const load = useCallback(() => { setErr(''); adminSms({ token, action: 'status' }).then(setD).catch((e) => setErr(errMsg(e))); }, [token]);
  useEffect(load, [load]);
  const valid = body.trim().length > 0 && (mode === 'broadcast' || /^(\+98|0098|0)?9\d{9}$/.test(to.replace(/\s/g, '')));
  const send = async () => {
    setBusy(true);
    try {
      const r = await adminSms({ token, action: mode, to, body });
      setD(r); setBody('');
      const x = r.result!; toast.success(`${fa(x.sent + x.simulated)} پیام ثبت شد${x.failed ? ` · ${fa(x.failed)} ناموفق` : ''}${x.simulated ? ' (حالت آزمایشی)' : ''}`);
    } catch (e) { toast.error(errMsg(e)); } finally { setBusy(false); setConfirm(false); }
  };
  if (err) return <ErrorState text={err} onRetry={load} />;
  return (
    <div>
      <PageHead title="پنل پیامک" sub="ارسال اعلان و پیام به مشتریان" />
      {!d ? <ListSkeleton /> : <>
        <Glass className={cn('mb-4 flex items-start gap-3 rounded-2xl p-4', d.configured ? 'border-primary/30' : 'border-gold/30')}>
          {d.configured ? <CheckCircle2 className="mt-0.5 h-5 w-5 text-primary" /> : <PlugZap className="mt-0.5 h-5 w-5 text-gold" />}
          <div className="text-sm leading-7">{d.configured ? <>سرویس <b>{d.provider}</b> وصل است و پیامک‌ها واقعاً ارسال می‌شوند.</> : <>هنوز سرویس پیامک وصل نشده و پیام‌ها در <b>حالت آزمایشی</b> فقط ثبت می‌شوند. برای اتصال، کلیدهای <b dir="ltr">ZITE_SMS_PROVIDER</b> (kavenegar یا smsir)، <b dir="ltr">ZITE_SMS_API_KEY</b> و <b dir="ltr">ZITE_SMS_SENDER</b> را اضافه کنید.</>}</div>
        </Glass>
        <div className="grid gap-4 lg:grid-cols-[1fr_1.2fr]">
          <Glass className="h-fit rounded-3xl p-4">
            <div className="mb-3 flex rounded-full border border-white/10 p-1 text-sm font-bold">{([['send', 'تک‌نفره', Send], ['broadcast', `همه مشتریان (${fa(d.reachable)})`, Users]] as const).map(([k, l, I]) => <button key={k} onClick={() => setMode(k)} className={cn('flex flex-1 items-center justify-center gap-1.5 rounded-full py-2', mode === k ? 'bg-primary text-primary-foreground' : 'text-muted-foreground')}><I className="h-4 w-4" />{l}</button>)}</div>
            {mode === 'send' && <label className="block text-sm font-bold">شماره موبایل<input value={to} onChange={(e) => setTo(e.target.value)} placeholder="09121234567" className={cn(inp, 'h-11')} dir="ltr" inputMode="tel" /></label>}
            <label className="mt-3 block text-sm font-bold">متن پیام<textarea value={body} onChange={(e) => setBody(e.target.value)} maxLength={600} rows={5} className={cn(inp, 'py-2')} placeholder="سلام! برنامه تمرینی جدیدت آماده است…" /></label>
            <div className="mt-1 text-xs text-muted-foreground">{fa(body.length)} کاراکتر · {fa(parts(body))} پیامک{mode === 'broadcast' && ` · مجموع ${fa(parts(body) * d.reachable)}`}</div>
            <KButton className="mt-3 w-full" loading={busy} disabled={!valid} onClick={() => (mode === 'broadcast' ? setConfirm(true) : send())}><Send className="h-4 w-4" />ارسال</KButton>
          </Glass>
          <Glass className="rounded-3xl p-2">
            <div className="p-2 text-sm font-black">آخرین پیام‌ها</div>
            {!d.messages.length ? <StateView icon={MessageSquareText} title="هنوز پیامی ارسال نشده" /> : (
              <ul className="max-h-[520px] space-y-1 overflow-y-auto">{d.messages.map((m) => (
                <li key={m.id} className="rounded-2xl p-3 hover:bg-white/5">
                  <div className="flex items-center gap-2 text-xs"><span dir="ltr" className="font-bold">{m.to}</span><span className={cn('rounded-full px-2 py-0.5 font-bold', ST[m.status]?.[1])}>{ST[m.status]?.[0] ?? m.status}</span><span className="ms-auto text-muted-foreground">{fmtDate(m.created, true)}</span></div>
                  <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{m.body}</p>{m.error && <p className="text-xs text-destructive">{m.error}</p>}
                </li>))}</ul>
            )}
          </Glass>
        </div>
        <Confirm open={confirm} onOpenChange={setConfirm} title="ارسال گروهی" text={`این پیام برای ${fa(d.reachable)} مشتری ارسال می‌شود. ادامه می‌دهید؟`} confirmLabel="ارسال برای همه" onConfirm={send} />
      </>}
    </div>
  );
}
