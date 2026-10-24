import { useCallback, useEffect, useState } from 'react';
import { Plus, ShoppingBag, Pencil, Trash2, Upload, Star, CreditCard, Package } from 'lucide-react';
import { toast } from 'sonner';
import { useUpload } from 'zitejs/upload';
import { adminShop, type AdminShopOutputType, type AdminShopInputType } from 'zitejs/api';
import { Switch } from '@project/components/ui/switch';
import { cn } from '@project/components/lib/utils';
import { KButton, Glass, StateView } from '../../components/kit';
import { PageHead, ListSkeleton, ErrorState, fmtDate, ResponsiveModal, Confirm } from '../../components/admin/ui';
import { useAdmin, errMsg } from '../../lib/session';
import { fa } from '../../lib/config';

type P = AdminShopOutputType['products'][0];
type O = AdminShopOutputType['orders'][0];
const inp = 'mt-1 h-11 w-full rounded-2xl border border-white/10 bg-bg1 px-3 text-sm font-normal outline-none focus:border-primary';
const toman = (n: number) => `${fa(n.toLocaleString('en-US'))} تومان`;
const blank: AdminShopInputType['data'] = { name: '', description: '', price: 0, compareAtPrice: null, image: '', gallery: [], category: '', badge: '', stock: null, externalLink: '', active: true, featured: false, sortOrder: 0 };
const ST: Record<string, [string, string]> = { pending: ['در انتظار پرداخت', 'bg-gold/15 text-gold'], paid: ['پرداخت‌شده', 'bg-primary/15 text-primary'], failed: ['ناموفق', 'bg-destructive/15 text-destructive'], canceled: ['لغو شده', 'bg-white/10 text-muted-foreground'], shipped: ['ارسال شد', 'bg-cyan/15 text-[hsl(188_90%_60%)]'] };

function ProductForm({ item, onSaved }: { item?: P; onSaved: (l: P[]) => void }) {
  const { token } = useAdmin();
  const { upload, isUploading } = useUpload();
  const [f, setF] = useState(() => ({ ...blank!, ...(item ?? {}) }));
  const [busy, setBusy] = useState(false);
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((x) => ({ ...x, [k]: v }));
  const err = !f.name.trim() ? 'نام محصول الزامی است.' : f.price <= 0 ? 'قیمت را وارد کنید.' : f.compareAtPrice && f.compareAtPrice <= f.price ? 'قیمت قبل از تخفیف باید بیشتر از قیمت فعلی باشد.' : '';
  const pick = async (e: React.ChangeEvent<HTMLInputElement>) => { const file = e.target.files?.[0]; if (!file) return; try { const { url } = await upload(file); set('image', url); } catch { toast.error('آپلود تصویر ناموفق بود'); } };
  const save = async () => {
    if (err) return; setBusy(true);
    try { const { id: _id, ...data } = f as P; const r = await adminShop({ token, action: 'save', id: item?.id, data: { ...data, name: f.name.trim() } }); onSaved(r.products); toast.success('محصول ذخیره شد'); }
    catch (e) { toast.error(errMsg(e)); } finally { setBusy(false); }
  };
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <div className="grid h-24 w-24 shrink-0 place-items-center overflow-hidden rounded-2xl border border-white/10 bg-bg1">{f.image ? <img src={f.image} alt="" className="h-full w-full object-cover" /> : <Package className="h-8 w-8 text-muted-foreground" />}</div>
        <label className="tap flex cursor-pointer items-center gap-2 rounded-2xl border border-white/10 px-4 py-2 text-sm font-bold"><Upload className="h-4 w-4" />{isUploading ? 'در حال آپلود…' : 'تصویر محصول'}<input type="file" accept="image/*" className="hidden" onChange={pick} disabled={isUploading} /></label>
      </div>
      <label className="block text-sm font-bold">نام محصول<input value={f.name} onChange={(e) => set('name', e.target.value)} maxLength={160} className={inp} /></label>
      <label className="block text-sm font-bold">توضیحات<textarea value={f.description} onChange={(e) => set('description', e.target.value)} rows={3} className={cn(inp, 'h-auto py-2')} /></label>
      <div className="grid grid-cols-2 gap-3">
        <label className="block text-sm font-bold">قیمت (تومان)<input type="number" min={0} value={f.price || ''} onChange={(e) => set('price', Number(e.target.value))} className={inp} dir="ltr" /></label>
        <label className="block text-sm font-bold">قیمت قبل تخفیف<input type="number" min={0} value={f.compareAtPrice ?? ''} onChange={(e) => set('compareAtPrice', e.target.value ? Number(e.target.value) : null)} className={inp} dir="ltr" /></label>
        <label className="block text-sm font-bold">دسته‌بندی<input value={f.category} onChange={(e) => set('category', e.target.value)} placeholder="تیشرت، شلوار…" className={inp} /></label>
        <label className="block text-sm font-bold">برچسب<input value={f.badge} onChange={(e) => set('badge', e.target.value)} placeholder="جدید، پرفروش…" maxLength={30} className={inp} /></label>
        <label className="block text-sm font-bold">موجودی (خالی = نامحدود)<input type="number" min={0} value={f.stock ?? ''} onChange={(e) => set('stock', e.target.value ? Number(e.target.value) : null)} className={inp} dir="ltr" /></label>
        <label className="block text-sm font-bold">لینک خارجی (اختیاری)<input value={f.externalLink} onChange={(e) => set('externalLink', e.target.value)} placeholder="https://kapoosh.ir/…" className={inp} dir="ltr" /></label>
      </div>
      <label className="flex min-h-[44px] items-center justify-between"><span className="font-bold">نمایش در فروشگاه</span><Switch checked={f.active} onCheckedChange={(v) => set('active', v)} /></label>
      <label className="flex min-h-[44px] items-center justify-between"><span className="font-bold">محصول ویژه</span><Switch checked={f.featured} onCheckedChange={(v) => set('featured', v)} /></label>
      {err && <p className="text-sm text-destructive">{err}</p>}
      <KButton className="w-full" loading={busy} disabled={!!err || isUploading} onClick={save}>ذخیره محصول</KButton>
    </div>
  );
}

function Orders() {
  const { token } = useAdmin();
  const [list, setList] = useState<O[] | null>(null); const [err, setErr] = useState('');
  const load = useCallback(() => { setErr(''); adminShop({ token, action: 'orders' }).then((r) => setList(r.orders)).catch((e) => setErr(errMsg(e))); }, [token]);
  useEffect(load, [load]);
  const setStatus = async (o: O, status: 'shipped' | 'canceled') => { try { const r = await adminShop({ token, action: 'orderStatus', id: o.id, status }); setList(r.orders); toast.success('وضعیت سفارش به‌روز شد'); } catch (e) { toast.error(errMsg(e)); } };
  if (err) return <ErrorState text={err} onRetry={load} />;
  if (!list) return <ListSkeleton />;
  if (!list.length) return <StateView icon={CreditCard} title="هنوز سفارشی ثبت نشده" text="بعد از فعال شدن درگاه، سفارش‌ها اینجا نمایش داده می‌شوند." />;
  return (
    <div className="space-y-2">{list.map((o) => { const items = JSON.parse(o.items) as { name: string; qty: number }[]; return (
      <Glass key={o.id} className="rounded-2xl p-4">
        <div className="flex flex-wrap items-center gap-2"><span className="font-black">#{fa(o.number)}</span><span className={cn('rounded-full px-2 py-0.5 text-xs font-bold', ST[o.status]?.[1])}>{ST[o.status]?.[0]}</span><span className="ms-auto font-bold text-primary">{toman(o.amount)}</span></div>
        <div className="mt-1 text-sm">{o.customerName} · <span dir="ltr">{o.phone}</span> · {fmtDate(o.created, true)}</div>
        <div className="mt-1 text-xs text-muted-foreground">{items.map((i) => `${i.name} ×${fa(i.qty)}`).join('، ')}{o.refId && ` · کد پیگیری ${o.refId}`}</div>
        {o.status === 'paid' && <div className="mt-3 flex gap-2"><KButton size="sm" onClick={() => setStatus(o, 'shipped')}>ثبت ارسال</KButton><KButton size="sm" variant="ghost" onClick={() => setStatus(o, 'canceled')}>لغو</KButton></div>}
      </Glass>); })}</div>
  );
}

export function AdminShop() {
  const { token } = useAdmin();
  const [tab, setTab] = useState<'products' | 'orders'>('products');
  const [d, setD] = useState<AdminShopOutputType | null>(null); const [err, setErr] = useState('');
  const [edit, setEdit] = useState<P | 'new' | null>(null); const [del, setDel] = useState<P | null>(null);
  const load = useCallback(() => { setErr(''); adminShop({ token, action: 'list' }).then(setD).catch((e) => setErr(errMsg(e))); }, [token]);
  useEffect(load, [load]);
  const remove = async () => { if (!del) return; try { const r = await adminShop({ token, action: 'delete', id: del.id }); setD(r); toast.success('حذف شد'); } catch (e) { toast.error(errMsg(e)); } setDel(null); };
  const toggle = async (p: P) => { const { id, ...data } = p; setD((x) => x && { ...x, products: x.products.map((q) => q.id === id ? { ...q, active: !q.active } : q) }); try { await adminShop({ token, action: 'save', id, data: { ...data, active: !p.active } }); } catch (e) { toast.error(errMsg(e)); load(); } };
  return (
    <div>
      <PageHead title="پیشنهادات کایار · محصولات" sub="محصولاتی که در اپ و سایت پیشنهاد می‌شوند" action={tab === 'products' && <KButton onClick={() => setEdit('new')}><Plus className="h-4 w-4" />محصول جدید</KButton>} />
      <Glass className={cn('mb-4 flex items-center gap-3 rounded-2xl p-4', d?.gateway ? 'border-primary/30' : 'border-gold/30')}>
        <CreditCard className={cn('h-5 w-5', d?.gateway ? 'text-primary' : 'text-gold')} />
        <div className="text-sm">{d?.gateway ? <>درگاه پرداخت <b>{d.gateway}</b> فعال است؛ مشتریان می‌توانند مستقیم خرید کنند.</> : <>درگاه پرداخت هنوز وصل نیست. با افزودن کلید <b dir="ltr">ZITE_ZARINPAL_MERCHANT_ID</b> در تنظیمات، پرداخت آنلاین فعال می‌شود. تا آن موقع دکمه‌ی خرید به لینک خارجی محصول می‌رود.</>}</div>
      </Glass>
      <div className="mb-4 flex w-fit rounded-full border border-white/10 p-1 text-sm font-bold">{([['products', 'محصولات'], ['orders', 'سفارش‌ها']] as const).map(([k, l]) => <button key={k} onClick={() => setTab(k)} className={cn('rounded-full px-5 py-2', tab === k ? 'bg-primary text-primary-foreground' : 'text-muted-foreground')}>{l}</button>)}</div>
      {tab === 'orders' ? <Orders /> : err ? <ErrorState text={err} onRetry={load} /> : !d ? <ListSkeleton /> : !d.products.length ? <StateView icon={ShoppingBag} title="هنوز محصولی اضافه نشده" text="اولین محصول کاپوش را اضافه کنید تا در اپ نمایش داده شود." action={<KButton onClick={() => setEdit('new')}><Plus className="h-4 w-4" />افزودن محصول</KButton>} /> : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{d.products.map((p) => (
          <Glass key={p.id} className={cn('flex gap-3 rounded-2xl p-3', !p.active && 'opacity-60')}>
            <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-bg1">{p.image ? <img src={p.image} alt="" className="h-full w-full object-cover" /> : <Package className="m-6 h-8 w-8 text-muted-foreground" />}</div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5"><span className="truncate font-bold">{p.name}</span>{p.featured && <Star className="h-3.5 w-3.5 shrink-0 fill-gold text-gold" />}</div>
              <div className="text-sm text-primary">{toman(p.price)}{p.compareAtPrice ? <s className="ms-2 text-xs text-muted-foreground">{fa(p.compareAtPrice.toLocaleString('en-US'))}</s> : null}</div>
              <div className="text-xs text-muted-foreground">{p.category || 'بدون دسته'}{p.stock != null && ` · موجودی ${fa(p.stock)}`}</div>
              <div className="mt-2 flex items-center gap-1"><Switch checked={p.active} onCheckedChange={() => toggle(p)} aria-label="نمایش" /><button onClick={() => setEdit(p)} className="tap ms-auto grid place-items-center rounded-full" aria-label="ویرایش"><Pencil className="h-4 w-4" /></button><button onClick={() => setDel(p)} className="tap grid place-items-center rounded-full text-destructive" aria-label="حذف"><Trash2 className="h-4 w-4" /></button></div>
            </div>
          </Glass>))}</div>
      )}
      <ResponsiveModal open={!!edit} onOpenChange={(v) => !v && setEdit(null)} title={edit === 'new' ? 'محصول جدید' : 'ویرایش محصول'}>
        {edit && <ProductForm item={edit === 'new' ? undefined : edit} onSaved={(products) => { setD((x) => x && { ...x, products }); setEdit(null); }} />}
      </ResponsiveModal>
      <Confirm open={!!del} onOpenChange={(v) => !v && setDel(null)} title="حذف محصول" text={`«${del?.name}» برای همیشه حذف شود؟`} confirmLabel="حذف" danger onConfirm={remove} />
    </div>
  );
}
