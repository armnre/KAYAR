import { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, Sparkles, Search, Trash2, Power, Eye, MousePointerClick, Percent, Radio, Upload, RotateCcw, Pencil, Users } from 'lucide-react';
import { toast } from 'sonner';
import { useUpload } from 'zitejs/upload';
import { adminCampaigns, type AdminCampaignsOutputType, type AdminCampaignsInputType } from 'zitejs/api';
import { DateTimePicker } from '@project/components/ui/date-picker';
import { cn } from '@project/components/lib/utils';
import { KButton, Glass, StateView } from '../../components/kit';
import { PageHead, ListSkeleton, ErrorState, fmtDate, ResponsiveModal, Confirm } from '../../components/admin/ui';
import { CampaignCard, THEMES, KIND } from '../../components/app/KayarSuggestions';
import { useAdmin, errMsg } from '../../lib/session';
import { fa } from '../../lib/config';

type Item = AdminCampaignsOutputType['items'][0];
type Data = Required<NonNullable<AdminCampaignsInputType['data']>>;
const inp = 'mt-1 h-11 w-full rounded-2xl border border-white/10 bg-bg1 px-3 text-sm font-normal outline-none focus:border-primary';
const ST: Record<string, { l: string; c: string }> = { live: { l: 'در حال نمایش', c: 'bg-primary/15 text-primary' }, scheduled: { l: 'زمان‌بندی‌شده', c: 'bg-sky-500/15 text-sky-300' }, draft: { l: 'پیش‌نویس', c: 'bg-white/10 text-muted-foreground' }, paused: { l: 'متوقف', c: 'bg-amber-500/15 text-amber-300' }, ended: { l: 'پایان‌یافته', c: 'bg-white/10 text-muted-foreground' } };
const phase = (i: Item) => { const n = Date.now(); if (i.status !== 'active') return i.status; if (i.endsAt && new Date(i.endsAt).getTime() <= n) return 'ended'; if (i.startsAt && new Date(i.startsAt).getTime() > n) return 'scheduled'; return 'live'; };
const ctr = (i: { impressions: number; clicks: number }) => (i.impressions ? (i.clicks / i.impressions) * 100 : 0);
const ACTIONS: [Data['actionType'], string, string][] = [['buy', 'خرید', 'پرداخت با درگاه'], ['register', 'ثبت‌نام', 'کمپین/رویداد'], ['code', 'کد تخفیف', 'دریافت کد'], ['partner', 'همکار', 'کد از API فروشگاه'], ['info', 'اطلاع‌رسانی', 'فقط نمایش']];
const blank: Data = { title: '', subtitle: '', body: '', kind: 'campaign', brand: '', imageUrl: '', badge: '', ctaLabel: '', link: '', price: '', oldPrice: '', discountCode: '', theme: 'lime', placements: ['home'], status: 'active', priority: 0, startsAt: null, endsAt: null, gallery: '', features: '', specs: '', terms: '', amount: 0, stock: null, purchasable: false, videoUrl: '', location: '', sponsorLogo: '', sponsorWebsite: '', actionType: 'info', partnerName: '', partnerApiUrl: '', uniqueCodes: false };

function Form({ item, onSaved }: { item?: Item; onSaved: (all: Item[]) => void }) {
  const { token } = useAdmin(); const { upload, isUploading } = useUpload();
  const [f, setF] = useState<Data>(() => item ? { ...blank, ...item, kind: item.kind as Data['kind'], theme: item.theme as Data['theme'], status: item.status as Data['status'], actionType: item.actionType as Data['actionType'], placements: ['home'], gallery: item.gallery.join('\n'), features: item.features.join('\n'), specs: item.specs.map((x) => x.v ? `${x.k}: ${x.v}` : x.k).join('\n') } : blank);
  const [busy, setBusy] = useState(false);
  const set = <K extends keyof Data>(k: K, v: Data[K]) => setF((x) => ({ ...x, [k]: v }));
  const err = !f.title.trim() ? 'عنوان الزامی است.' : f.actionType === 'buy' && !f.amount ? 'برای فروش آنلاین مبلغ را وارد کن.' : f.actionType === 'code' && !f.discountCode ? 'کد تخفیف را وارد کن.' : f.actionType === 'partner' && !f.partnerApiUrl && !f.discountCode ? 'آدرس API همکار یا کد تخفیف لازم است.' : f.link && !/^(\/(?!\/)|https:\/\/)/.test(f.link) ? 'لینک باید با / یا https:// شروع شود.' : f.startsAt && f.endsAt && new Date(f.endsAt) <= new Date(f.startsAt) ? 'پایان باید بعد از شروع باشد.' : '';
  const save = async () => { if (err) return; setBusy(true); try { const r = await adminCampaigns({ token, action: 'save', id: item?.id, data: f }); onSaved(r.items); toast.success('ذخیره شد'); } catch (e) { toast.error(errMsg(e)); } finally { setBusy(false); } };
  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => { const file = e.target.files?.[0]; if (!file) return; try { set('imageUrl', (await upload(file)).url); } catch (x) { toast.error(errMsg(x)); } };
  const onGallery = async (e: React.ChangeEvent<HTMLInputElement>) => { const files = Array.from(e.target.files ?? []); try { const urls: string[] = []; for (const file of files) urls.push((await upload(file)).url); setF((x) => ({ ...x, gallery: [...x.gallery.split('\n').filter(Boolean), ...urls].join('\n') })); } catch (x) { toast.error(errMsg(x)); } };
  const onLogo = async (e: React.ChangeEvent<HTMLInputElement>) => { const file = e.target.files?.[0]; if (!file) return; try { set('sponsorLogo', (await upload(file)).url); } catch (x) { toast.error(errMsg(x)); } };
  const A = (k: 'features' | 'specs' | 'terms', l: string, ph: string) => <label className="block text-sm font-bold">{l}<textarea value={f[k]} onChange={(e) => set(k, e.target.value)} rows={3} placeholder={ph} className={cn(inp, 'h-auto py-2')} /></label>;
  const gal = f.gallery.split('\n').filter(Boolean);
  const T = (k: keyof Data, l: string, ph = '', ltr = false) => <label className="block text-sm font-bold">{l}<input value={String(f[k] ?? '')} onChange={(e) => set(k, e.target.value as never)} placeholder={ph} dir={ltr ? 'ltr' : undefined} className={inp} /></label>;
  const preview = { ...f, id: 'preview', impressions: 0, clicks: 0, created: null };
  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
      <div className="space-y-3">
        <div className="flex flex-wrap gap-1.5">{Object.entries(KIND).map(([k, l]) => <button key={k} onClick={() => set('kind', k as Data['kind'])} className={cn('h-9 rounded-full border px-3 text-xs font-black', f.kind === k ? 'border-primary bg-primary text-primary-foreground' : 'border-white/10')}>{l}</button>)}</div>
        {T('title', 'عنوان *', 'مثلاً: کمپین تابستانه کایار')}
        {T('subtitle', 'زیرعنوان')}
        <label className="block text-sm font-bold">توضیحات کامل<textarea value={f.body} onChange={(e) => set('body', e.target.value)} rows={4} className={cn(inp, 'h-auto py-2')} /></label>
        <div className="grid gap-3 sm:grid-cols-3">{T('brand', 'برند / اسپانسر')}{T('badge', 'برچسب', '۳۰٪ تخفیف')}{T('ctaLabel', 'متن دکمه', 'خرید')}</div>
        {T('link', 'مسیر داخلی دکمه برای اطلاع‌رسانی (اختیاری)', '/app/bodyyar', true)}
        <div className="grid gap-3 sm:grid-cols-3">{T('price', 'قیمت')}{T('oldPrice', 'قیمت قبل')}{T('discountCode', 'کد تخفیف', 'KAYAR30', true)}</div>
        <div className="text-sm font-bold">تصویر<div className="mt-1 flex gap-2"><input value={f.imageUrl} onChange={(e) => set('imageUrl', e.target.value)} placeholder="https://…" dir="ltr" className={cn(inp, 'mt-0 flex-1')} />
          <label className="flex h-11 cursor-pointer items-center gap-1.5 rounded-2xl border border-white/10 px-3 text-xs"><Upload className="h-4 w-4" />{isUploading ? '…' : 'آپلود'}<input type="file" accept="image/*" className="hidden" onChange={onFile} disabled={isUploading} /></label></div></div>
        <div className="text-sm font-bold">گالری تصاویر<div className="mt-1 flex flex-wrap gap-2">{gal.map((u) => <div key={u} className="relative h-16 w-16 overflow-hidden rounded-xl"><img src={u} alt="" className="h-full w-full object-cover" /><button onClick={() => set('gallery', gal.filter((x) => x !== u).join('\n'))} className="absolute end-0.5 top-0.5 grid h-5 w-5 place-items-center rounded-full bg-black/70 text-[10px] text-white" aria-label="حذف">✕</button></div>)}
          <label className="grid h-16 w-16 cursor-pointer place-items-center rounded-xl border border-dashed border-white/20 text-muted-foreground"><Plus className="h-5 w-5" /><input type="file" accept="image/*" multiple className="hidden" onChange={onGallery} disabled={isUploading} /></label></div></div>
        {A('features', 'ویژگی‌ها (هر خط یک مورد)', 'پارچه ضد تعریق\nارسال رایگان')}
        {A('specs', 'مشخصات (هر خط «عنوان: مقدار»)', 'جنس: پلی‌استر\nسایز: S تا XXL')}
        <div className="grid gap-3 sm:grid-cols-2">{T('location', 'مکان (برای رویداد/کمپین)', 'تهران، پارک چیتگر')}{T('videoUrl', 'لینک ویدیو', 'https://…', true)}</div>
        <div className="grid gap-3 sm:grid-cols-2"><div className="text-sm font-bold">لوگوی اسپانسر<div className="mt-1 flex gap-2"><input value={f.sponsorLogo} onChange={(e) => set('sponsorLogo', e.target.value)} dir="ltr" placeholder="https://…" className={cn(inp, 'mt-0 flex-1')} /><label className="flex h-11 cursor-pointer items-center rounded-2xl border border-white/10 px-3"><Upload className="h-4 w-4" /><input type="file" accept="image/*" className="hidden" onChange={onLogo} disabled={isUploading} /></label></div></div>{T('sponsorWebsite', 'وب‌سایت اسپانسر', 'https://…', true)}</div>
        <div className="rounded-3xl border border-white/10 p-4">
          <div className="text-sm font-black">اقدام کاربر داخل اپ</div>
          <p className="mt-0.5 text-xs text-muted-foreground">همه‌چیز داخل کایار انجام می‌شود؛ کاربر به سایت دیگری فرستاده نمی‌شود.</p>
          <div className="mt-3 grid grid-cols-2 gap-1.5 sm:grid-cols-5">{ACTIONS.map(([k, l, d]) => <button key={k} onClick={() => set('actionType', k)} title={d} className={cn('rounded-2xl border p-2 text-start text-xs', f.actionType === k ? 'border-primary bg-primary/10' : 'border-white/10')}><div className="font-black">{l}</div><div className="mt-0.5 text-[10px] text-muted-foreground">{d}</div></button>)}</div>
          {f.actionType === 'buy' && <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="block text-sm font-bold">مبلغ پرداخت (تومان) *<input type="number" min={0} value={f.amount || ''} onChange={(e) => set('amount', Math.max(0, Number(e.target.value) || 0))} className={inp} dir="ltr" /></label>
            <label className="block text-sm font-bold">موجودی (خالی = نامحدود)<input type="number" min={0} value={f.stock ?? ''} onChange={(e) => set('stock', e.target.value === '' ? null : Math.max(0, Number(e.target.value)))} className={inp} dir="ltr" /></label>
          </div>}
          {f.actionType === 'register' && <label className="mt-3 block text-sm font-bold">ظرفیت (خالی = نامحدود؛ بعد از پر شدن لیست انتظار)<input type="number" min={0} value={f.stock ?? ''} onChange={(e) => set('stock', e.target.value === '' ? null : Math.max(0, Number(e.target.value)))} className={inp} dir="ltr" /></label>}
          {(f.actionType === 'code' || f.actionType === 'partner') && <label className="mt-3 flex items-center justify-between text-sm font-bold">ساخت کد یکتا برای هر کاربر (پیشوند = کد تخفیف)<input type="checkbox" checked={f.uniqueCodes} onChange={(e) => set('uniqueCodes', e.target.checked)} className="h-5 w-5" /></label>}
          {f.actionType === 'partner' && <div className="mt-3 grid gap-3 sm:grid-cols-2">{T('partnerName', 'نام فروشگاه همکار', 'کاپوش')}{T('partnerApiUrl', 'API صدور کد همکار (اختیاری)', 'https://api.partner.ir/kayar/code', true)}
            <p className="text-[11px] text-muted-foreground sm:col-span-2">اگر API وارد شود، کایار برای هر کاربر درخواست POST با campaignId، memberId، phone و name می‌فرستد و پاسخ {'{ "code": "…" }'} را به کاربر نشان می‌دهد. بدون API، کد بالا (یا کد یکتا) داده می‌شود.</p></div>}
        </div>
        {A('terms', 'شرایط و قوانین', 'مهلت استفاده از کد تا پایان ماه…')}
        <div className="text-sm font-bold">تم رنگی<div className="mt-1 flex gap-2">{Object.entries(THEMES).map(([k, g]) => <button key={k} onClick={() => set('theme', k as Data['theme'])} aria-label={k} className={cn('h-9 w-9 rounded-full bg-gradient-to-br', g, f.theme === k && 'ring-2 ring-primary ring-offset-2 ring-offset-background')} />)}</div></div>
        <div className="grid gap-3 sm:grid-cols-2"><div className="text-sm font-bold">شروع<div className="mt-1"><DateTimePicker value={f.startsAt ? new Date(f.startsAt) : undefined} onChange={(d) => set('startsAt', d?.toISOString() ?? null)} /></div></div><div className="text-sm font-bold">پایان<div className="mt-1"><DateTimePicker value={f.endsAt ? new Date(f.endsAt) : undefined} onChange={(d) => set('endsAt', d?.toISOString() ?? null)} /></div></div></div>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-sm font-bold">وضعیت<select value={f.status} onChange={(e) => set('status', e.target.value as Data['status'])} className={inp}><option value="active">فعال</option><option value="draft">پیش‌نویس</option><option value="paused">متوقف</option><option value="ended">پایان‌یافته</option></select></label>
          <label className="block text-sm font-bold">اولویت (بیشتر = جلوتر)<input type="number" min={0} max={1000} value={f.priority} onChange={(e) => set('priority', Math.max(0, Math.min(1000, Number(e.target.value) || 0)))} className={inp} /></label>
        </div>
        {err && <p className="text-sm text-destructive">{err}</p>}
        <KButton className="w-full" onClick={save} loading={busy} disabled={!!err || isUploading}>ذخیره کمپین</KButton>
      </div>
      <div className="lg:sticky lg:top-4 lg:self-start"><div className="mb-2 text-xs text-muted-foreground">پیش‌نمایش زنده</div><div className="flex [&>div]:!w-full"><CampaignCard preview c={{ ...preview, title: f.title || 'عنوان کمپین', gallery: gal, features: [], specs: [], sold: 0 } as never} /></div></div>
    </div>
  );
}

function Registrations({ item }: { item: Item }) {
  const { token } = useAdmin();
  type R = AdminCampaignsOutputType['registrations'][0];
  const [rows, setRows] = useState<R[] | null>(null); const [q, setQ] = useState('');
  const run = useCallback((p: Partial<AdminCampaignsInputType> = {}) => adminCampaigns({ token, action: 'registrations', id: item.id, ...p } as AdminCampaignsInputType).then((r) => setRows(r.registrations)).catch((e) => toast.error(errMsg(e))), [token, item.id]);
  useEffect(() => { run(); }, [run]);
  const list = (rows ?? []).filter((r) => `${r.name} ${r.phone} ${r.code}`.includes(q));
  const csv = () => { const body = [['نام', 'موبایل', 'نوع', 'وضعیت', 'کد', 'توضیحات', 'تاریخ'], ...list.map((r) => [r.name, r.phone, r.kind, r.status, r.code, r.note, r.created ?? ''])].map((l) => l.map((x) => `"${String(x).replace(/"/g, '""')}"`).join(',')).join('\n');
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['\ufeff' + body], { type: 'text/csv' })); a.download = `registrations-${item.id}.csv`; a.click(); };
  const RS: Record<string, string> = { confirmed: 'تأیید', waitlist: 'انتظار', canceled: 'لغو', attended: 'حاضر شد' };
  return (
    <div>
      <div className="mb-3 grid grid-cols-3 gap-2 text-center text-xs">{(['confirmed', 'waitlist', 'attended'] as const).map((k) => <div key={k} className="rounded-2xl bg-white/5 p-3"><div className="text-lg font-black">{fa((rows ?? []).filter((r) => r.status === k).length)}</div>{RS[k]}</div>)}</div>
      <div className="mb-3 flex gap-2"><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="جست‌وجوی نام، موبایل یا کد…" className={cn(inp, 'mt-0 flex-1')} /><KButton onClick={csv} disabled={!list.length}>خروجی CSV</KButton></div>
      {!rows ? <ListSkeleton /> : !list.length ? <p className="py-10 text-center text-sm text-muted-foreground">هنوز ثبت‌نام یا درخواست کدی ثبت نشده.</p> : (
        <ul className="divide-y divide-white/5 rounded-2xl border border-white/10">{list.map((r) => (
          <li key={r.id} className="flex flex-wrap items-center gap-2 p-3 text-sm">
            <div className="min-w-0 flex-1"><div className="font-bold">{r.name || '—'}</div><div className="text-xs text-muted-foreground" dir="ltr">{r.phone} · {r.code}</div>{r.note && <div className="text-xs text-muted-foreground">{r.note}</div>}</div>
            <span className="text-[11px] text-muted-foreground">{r.created ? fmtDate(r.created, true) : ''}</span>
            <select value={r.status} onChange={(e) => run({ action: 'regStatus', regId: r.id, regStatus: e.target.value as 'confirmed' })} className="h-9 rounded-full border border-white/10 bg-bg1 px-2 text-xs">{Object.entries(RS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
          </li>))}</ul>)}
    </div>
  );
}

function Stat({ icon: I, l, v }: { icon: typeof Eye; l: string; v: string }) {
  return <Glass className="flex items-center gap-3 rounded-3xl p-4"><span className="grid h-11 w-11 place-items-center rounded-2xl bg-primary/15 text-primary"><I className="h-5 w-5" /></span><div><div className="text-xs text-muted-foreground">{l}</div><div className="text-xl font-black">{v}</div></div></Glass>;
}

export function AdminCampaigns() {
  const { token } = useAdmin();
  const [items, setItems] = useState<Item[] | null>(null); const [err, setErr] = useState<string>();
  const [edit, setEdit] = useState<Item | 'new' | null>(null); const [regs, setRegs] = useState<Item | null>(null); const [del, setDel] = useState<Item | null>(null);
  const [q, setQ] = useState(''); const [ph, setPh] = useState('');
  const load = useCallback(() => { setErr(undefined); adminCampaigns({ token, action: 'list' }).then((r) => setItems(r.items)).catch((e) => setErr(errMsg(e))); }, [token]);
  useEffect(load, [load]);
  const run = async (p: Omit<AdminCampaignsInputType, 'token'>) => { try { setItems((await adminCampaigns({ token, ...p })).items); } catch (e) { toast.error(errMsg(e)); } };
  const list = useMemo(() => (items ?? []).filter((i) => (!ph || phase(i) === ph) && `${i.title} ${i.brand} ${i.subtitle}`.toLowerCase().includes(q.toLowerCase())), [items, q, ph]);
  const tot = (items ?? []).reduce((a, i) => ({ impressions: a.impressions + i.impressions, clicks: a.clicks + i.clicks }), { impressions: 0, clicks: 0 });
  return (
    <div>
      <PageHead title="پیشنهادات کایار" sub="کمپین‌ها، تبلیغات، برندها و محصولات ویژه — با زمان‌بندی، محل نمایش و آمار" action={<KButton onClick={() => setEdit('new')}><Plus className="h-5 w-5" />کمپین جدید</KButton>} />
      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat icon={Radio} l="در حال نمایش" v={fa((items ?? []).filter((i) => phase(i) === 'live').length)} />
        <Stat icon={Eye} l="نمایش کل" v={fa(tot.impressions)} />
        <Stat icon={MousePointerClick} l="کلیک کل" v={fa(tot.clicks)} />
        <Stat icon={Percent} l="نرخ کلیک (CTR)" v={`${fa(ctr(tot).toFixed(1))}٪`} />
      </div>
      <div className="mb-4 flex flex-wrap gap-2"><div className="relative min-w-0 flex-1 basis-48"><Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="جست‌وجو…" className="h-11 w-full rounded-full border border-white/10 bg-bg1 pe-3 ps-9 text-sm outline-none focus:border-primary" /></div>
        <select value={ph} onChange={(e) => setPh(e.target.value)} aria-label="وضعیت" className="h-11 rounded-full border border-white/10 bg-bg1 px-3 text-sm"><option value="">همه</option>{Object.entries(ST).map(([k, v]) => <option key={k} value={k}>{v.l}</option>)}</select></div>
      {err ? <Glass><ErrorState text={err} onRetry={load} /></Glass> : !items ? <ListSkeleton /> : !list.length ? <Glass><StateView icon={Sparkles} title={items.length ? 'چیزی پیدا نشد' : 'هنوز کمپینی نساختی'} text="اولین کمپین را بساز تا در بخش «پیشنهادات کایار» نمایش داده شود." /></Glass> : (
        <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{list.map((i) => { const p = phase(i); return (
          <li key={i.id} className="glass overflow-hidden rounded-3xl">
            <div className={cn('relative h-28 bg-gradient-to-br', THEMES[i.theme] ?? THEMES.lime)}>{i.imageUrl && <img src={i.imageUrl} alt="" className="absolute inset-0 h-full w-full object-cover opacity-60" />}
              <span className={cn('absolute start-3 top-3 rounded-full px-2 py-0.5 text-xs font-bold backdrop-blur', ST[p]?.c)}>{ST[p]?.l}</span><span className="absolute end-3 top-3 rounded-full bg-black/40 px-2 py-0.5 text-xs font-bold text-white">{KIND[i.kind]}</span></div>
            <div className="p-4">
              <div className="truncate font-black" dir="auto">{i.title}</div><div className="truncate text-xs text-muted-foreground">{i.brand || '—'}{i.actionType === 'buy' ? ` · فروش: ${fa(i.sold)}` : ` · ${ACTIONS.find((a) => a[0] === i.actionType)?.[1] ?? ''}`}</div>
              <div className="mt-1 text-[11px] text-muted-foreground">{i.startsAt ? fmtDate(i.startsAt, true) : 'بلافاصله'} ← {i.endsAt ? fmtDate(i.endsAt, true) : 'بدون پایان'}</div>
              <div className="mt-3 grid grid-cols-3 rounded-2xl bg-white/5 py-2 text-center text-xs"><div><div className="font-black">{fa(i.impressions)}</div>نمایش</div><div><div className="font-black">{fa(i.clicks)}</div>کلیک</div><div><div className="font-black">{fa(ctr(i).toFixed(1))}٪</div>CTR</div></div>
              <div className="mt-3 flex items-center gap-1">
                <button onClick={() => setEdit(i)} className="tap flex flex-1 items-center justify-center gap-1 rounded-full bg-white/5 text-sm font-bold"><Pencil className="h-4 w-4" />ویرایش</button>
                {['register', 'code', 'partner'].includes(i.actionType) && <button onClick={() => setRegs(i)} className="tap grid place-items-center rounded-full text-muted-foreground" aria-label="ثبت‌نام‌ها"><Users className="h-5 w-5" /></button>}
                <button onClick={() => run({ action: 'setStatus', id: i.id, status: i.status === 'active' ? 'paused' : 'active' })} className={cn('tap grid place-items-center rounded-full', i.status === 'active' ? 'text-primary' : 'text-muted-foreground')} aria-label="فعال/توقف"><Power className="h-5 w-5" /></button>
                <button onClick={() => run({ action: 'resetStats', id: i.id })} className="tap grid place-items-center rounded-full text-muted-foreground" aria-label="صفر کردن آمار"><RotateCcw className="h-5 w-5" /></button>
                <button onClick={() => setDel(i)} className="tap grid place-items-center rounded-full text-muted-foreground hover:text-destructive" aria-label="حذف"><Trash2 className="h-5 w-5" /></button>
              </div>
            </div>
          </li>); })}</ul>
      )}
      <ResponsiveModal wide open={!!edit} onOpenChange={(v) => !v && setEdit(null)} title={edit === 'new' ? 'کمپین جدید' : 'ویرایش کمپین'}>{edit && <Form item={edit === 'new' ? undefined : edit} onSaved={(all) => { setItems(all); setEdit(null); }} />}</ResponsiveModal>
      <ResponsiveModal wide open={!!regs} onOpenChange={(v) => !v && setRegs(null)} title={`ثبت‌نام‌ها و کدها — ${regs?.title ?? ''}`}>{regs && <Registrations item={regs} />}</ResponsiveModal>
      <Confirm open={!!del} onOpenChange={(v) => !v && setDel(null)} danger title="حذف کمپین؟" confirmLabel="حذف" text="کمپین و آمار آن برای همیشه حذف می‌شود." onConfirm={() => del && run({ action: 'delete', id: del.id })} />
    </div>
  );
}
