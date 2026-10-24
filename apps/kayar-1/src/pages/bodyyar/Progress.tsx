import { useState } from 'react';
import { toast } from 'sonner';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { LineChart as LineIcon, Trash2, Plus, Loader2 } from 'lucide-react';
import { getProgress, listWeights, weightLog } from 'zitejs/api';
import { tok } from '../../lib/session';
import { Button } from '@project/components/ui/button';
import { Input } from '@project/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@project/components/ui/select';
import { Card, EmptyState, ErrorState, LoadingBlocks, PageHeader, errMsg, faDate, faNum, todayStr } from '../../components/bkit';
import { useLoad } from '../../lib/useLoad';

const tip = { contentStyle: { background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 16, direction: 'rtl' as const } };

export default function Progress() {
  const [days, setDays] = useState(30);
  const prog = useLoad(() => getProgress({ token: tok(),  days }), [days]);
  const weights = useLoad(() => listWeights({ token: tok(), }));
  const [w, setW] = useState('');
  const [busy, setBusy] = useState(false);
  const [strengthSlug, setStrengthSlug] = useState<string>('');

  const addWeight = async () => {
    const v = Number(w);
    if (!(v >= 25 && v <= 300)) return;
    setBusy(true);
    try { await weightLog({ token: tok(),  action: 'add', date: todayStr(), weightKg: v }); setW(''); toast.success('وزن ثبت شد'); weights.reload(); }
    catch (e) { toast.error(errMsg(e)); } finally { setBusy(false); }
  };
  const delWeight = async (id: string) => {
    try { await weightLog({ token: tok(),  action: 'delete', id }); weights.setData((d) => d && { entries: d.entries.filter((x) => x.id !== id) }); }
    catch (e) { toast.error(errMsg(e)); }
  };

  const cutoff = Date.now() - days * 864e5;
  const wData = (weights.data?.entries ?? []).filter((e) => new Date(e.date).getTime() >= cutoff).slice().reverse().map((e) => ({ d: faDate(e.date), v: e.weightKg }));
  const sessions = prog.data?.sessions ?? [];
  const byWeek = new Map<string, { n: number; min: number }>();
  sessions.forEach((s) => { const d = new Date(s.startedAt); d.setDate(d.getDate() - d.getDay()); const k = d.toISOString().slice(0, 10); const x = byWeek.get(k) ?? { n: 0, min: 0 }; x.n++; x.min += Math.round(s.durationSec / 60); byWeek.set(k, x); });
  const weekData = [...byWeek.entries()].sort().map(([k, v]) => ({ d: faDate(k), n: v.n, min: v.min }));
  const strength = prog.data?.strength ?? [];
  const cur = strength.find((s) => s.slug === strengthSlug) ?? strength[0];
  const wValid = Number(w) >= 25 && Number(w) <= 300;

  return (
    <div className="space-y-5">
      <PageHeader title="پیشرفت" back="/app/bodyyar" action={
        <Select value={String(days)} onValueChange={(v) => setDays(Number(v))}><SelectTrigger className="w-28 rounded-2xl"><SelectValue /></SelectTrigger><SelectContent>{[[7, '۷ روز'], [30, '۳۰ روز'], [90, '۳ ماه'], [365, 'یک سال']].map(([v, l]) => <SelectItem key={v} value={String(v)}>{l}</SelectItem>)}</SelectContent></Select>} />

      <Card>
        <h3 className="mb-3 font-bold">وزن</h3>
        <div className="mb-4 flex gap-2">
          <Input inputMode="decimal" value={w} onChange={(e) => setW(e.target.value.replace(/[^\d.]/g, ''))} placeholder="وزن امروز (kg)" className="latin h-11 rounded-2xl" aria-invalid={w !== '' && !wValid} />
          <Button className="h-11 rounded-2xl" disabled={!wValid || busy} onClick={addWeight}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}</Button>
        </div>
        {weights.loading ? <LoadingBlocks count={1} /> : wData.length > 1 ? (
          <div className="h-48" dir="ltr"><ResponsiveContainer><AreaChart data={wData}><defs><linearGradient id="wg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.4} /><stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} /></linearGradient></defs><CartesianGrid stroke="hsl(var(--border))" vertical={false} /><XAxis dataKey="d" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} /><YAxis domain={['dataMin - 1', 'dataMax + 1']} tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} width={32} /><Tooltip {...tip} /><Area type="monotone" dataKey="v" name="kg" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#wg)" /></AreaChart></ResponsiveContainer></div>
        ) : <p className="text-sm text-muted-foreground">برای نمودار حداقل دو ثبت وزن در این بازه لازم است.</p>}
        {(weights.data?.entries.length ?? 0) > 0 && (
          <ul className="mt-3 max-h-40 space-y-1 overflow-y-auto">
            {weights.data!.entries.slice(0, 20).map((e) => <li key={e.id} className="flex items-center justify-between rounded-xl px-2 py-1 text-sm hover:bg-secondary"><span>{faDate(e.date)}</span><span className="latin">{e.weightKg} kg</span><Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => delWeight(e.id)} aria-label="حذف"><Trash2 className="h-3.5 w-3.5" /></Button></li>)}
          </ul>
        )}
      </Card>

      {prog.loading ? <LoadingBlocks count={2} /> : prog.error ? <ErrorState message={prog.error} onRetry={prog.reload} /> : sessions.length === 0 ? (
        <EmptyState icon={<LineIcon />} title="هنوز جلسه‌ای ثبت نشده" text="بعد از اولین تمرین، تکرار تمرین و پیشرفت قدرت اینجا نمایش داده می‌شود." />
      ) : (
        <>
          <Card>
            <h3 className="mb-3 font-bold">تکرار هفتگی تمرین</h3>
            <div className="h-44" dir="ltr"><ResponsiveContainer><BarChart data={weekData}><CartesianGrid stroke="hsl(var(--border))" vertical={false} /><XAxis dataKey="d" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} /><YAxis allowDecimals={false} width={24} tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} /><Tooltip {...tip} cursor={{ fill: 'hsl(var(--secondary))' }} /><Bar dataKey="n" name="جلسه" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} /><Bar dataKey="min" name="دقیقه" fill="hsl(var(--accent))" radius={[8, 8, 0, 0]} /></BarChart></ResponsiveContainer></div>
          </Card>
          {cur && (
            <Card>
              <div className="mb-3 flex items-center justify-between gap-2"><h3 className="font-bold">پیشرفت قدرت</h3>
                <Select value={cur.slug} onValueChange={setStrengthSlug}><SelectTrigger className="w-44 rounded-2xl"><SelectValue /></SelectTrigger><SelectContent>{strength.map((s) => <SelectItem key={s.slug} value={s.slug}>{s.name}</SelectItem>)}</SelectContent></Select>
              </div>
              <div className="h-44" dir="ltr"><ResponsiveContainer><LineChart data={cur.points.map((p) => ({ d: faDate(p.date), v: p.maxKg }))}><CartesianGrid stroke="hsl(var(--border))" vertical={false} /><XAxis dataKey="d" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} /><YAxis width={32} tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} /><Tooltip {...tip} /><Line type="monotone" dataKey="v" name="بیشترین وزنه kg" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} /></LineChart></ResponsiveContainer></div>
            </Card>
          )}
          <Card>
            <h3 className="mb-3 font-bold">تاریخچه جلسات</h3>
            <ul className="space-y-2">{sessions.slice(0, 30).map((s) => <li key={s.id} className="flex justify-between rounded-2xl bg-secondary p-3 text-sm"><span>{s.title}</span><span className="text-xs text-muted-foreground">{faDate(s.startedAt)} · {faNum(Math.round(s.durationSec / 60))} دقیقه · {faNum(s.totalSets)} ست</span></li>)}</ul>
          </Card>
        </>
      )}
    </div>
  );
}
