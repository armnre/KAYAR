import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ShoppingBag, Shirt, Check, X, Loader2, ExternalLink, Minus, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { shop, kapooshProducts, type ShopOutputType } from 'zitejs/api';
import { Dialog, DialogContent, DialogTitle } from '@project/components/ui/dialog';
import { fa } from '../../lib/config';

type P = ShopOutputType['products'][0];
const toman = (n: number) => `${fa(Math.round(n).toLocaleString('en-US'))} تومان`;
const off = (p: P) => (p.compareAtPrice && p.compareAtPrice > p.price ? Math.round((1 - p.price / p.compareAtPrice) * 100) : 0);

function Checkout({ p, onDone }: { p: P; onDone: () => void }) {
  const [qty, setQty] = useState(1); const [name, setName] = useState(''); const [phone, setPhone] = useState(''); const [address, setAddress] = useState(''); const [busy, setBusy] = useState(false);
  const err = name.trim().length < 2 ? 'نام را وارد کنید' : !/^(\+98|0)?9\d{9}$/.test(phone.trim()) ? 'شماره موبایل معتبر نیست' : address.trim().length < 10 ? 'آدرس کامل را بنویسید' : '';
  const pay = async () => {
    setBusy(true);
    try { const r = await shop({ action: 'checkout', items: [{ id: p.id, qty }], customer: { name, phone, address } }); if (r.redirectUrl) window.location.href = r.redirectUrl; }
    catch (e) { toast.error((e as Error).message || 'خطا در شروع پرداخت'); setBusy(false); }
  };
  const f = 'h-11 w-full rounded-2xl border border-border bg-background px-3 text-sm outline-none focus:border-primary';
  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between rounded-2xl bg-secondary/60 p-2"><span className="ps-2 text-sm font-bold">تعداد</span><div className="flex items-center gap-3"><button onClick={() => setQty(Math.max(1, qty - 1))} className="grid h-9 w-9 place-items-center rounded-xl bg-card" aria-label="کم"><Minus className="h-4 w-4" /></button><b>{fa(qty)}</b><button onClick={() => setQty(Math.min(20, qty + 1))} className="grid h-9 w-9 place-items-center rounded-xl bg-card" aria-label="زیاد"><Plus className="h-4 w-4" /></button></div></div>
      <input value={name} onChange={(e) => setName(e.target.value)} placeholder="نام و نام خانوادگی" className={f} />
      <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="09121234567" className={f} dir="ltr" inputMode="tel" />
      <textarea value={address} onChange={(e) => setAddress(e.target.value)} placeholder="آدرس کامل پستی" rows={2} className={`${f} h-auto py-2`} />
      <button onClick={pay} disabled={!!err || busy} className="press flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-primary font-black text-primary-foreground disabled:opacity-40">{busy && <Loader2 className="h-4 w-4 animate-spin" />}پرداخت {toman(p.price * qty)}</button>
      {err && <p className="text-center text-xs text-muted-foreground">{err}</p>}
      <button onClick={onDone} className="w-full text-xs text-muted-foreground">بازگشت</button>
    </div>
  );
}

function ProductSheet({ p, gateway, onClose }: { p: P | null; gateway: boolean; onClose: () => void }) {
  const [buy, setBuy] = useState(false);
  useEffect(() => setBuy(false), [p]);
  return (
    <Dialog open={!!p} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-h-[92vh] overflow-y-auto rounded-[28px] p-0 sm:max-w-md">
        {p && <>
          <div className="relative aspect-square bg-secondary">{p.image ? <img src={p.image} alt={p.name} className="h-full w-full object-cover" /> : <Shirt className="absolute inset-0 m-auto h-20 w-20 text-primary" />}
            {p.badge && <span className="absolute start-3 top-3 rounded-full bg-primary px-3 py-1 text-xs font-black text-primary-foreground">{p.badge}</span>}</div>
          <div className="p-5">
            <DialogTitle className="text-xl font-black">{p.name}</DialogTitle>
            <div className="mt-2 flex items-baseline gap-2"><span className="text-lg font-black text-primary">{toman(p.price)}</span>{off(p) > 0 && <><s className="text-sm text-muted-foreground">{toman(p.compareAtPrice!)}</s><span className="rounded-full bg-destructive/15 px-2 text-xs font-bold text-destructive">{fa(off(p))}٪</span></>}</div>
            {p.description && <p className="mt-3 whitespace-pre-line text-sm leading-7 text-muted-foreground">{p.description}</p>}
            <div className="mt-5">{!p.inStock ? <div className="rounded-2xl bg-secondary p-3 text-center text-sm font-bold">ناموجود</div>
              : buy ? <Checkout p={p} onDone={() => setBuy(false)} />
              : gateway ? <button onClick={() => setBuy(true)} className="press flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-primary font-black text-primary-foreground"><ShoppingBag className="h-4 w-4" />خرید</button>
              : p.link ? <a href={p.link} target="_blank" rel="noreferrer" className="press flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-primary font-black text-primary-foreground">خرید از کاپوش<ExternalLink className="h-4 w-4" /></a>
              : <div className="rounded-2xl bg-secondary p-3 text-center text-sm text-muted-foreground">خرید آنلاین به‌زودی فعال می‌شود.</div>}</div>
          </div>
        </>}
      </DialogContent>
    </Dialog>
  );
}

/** Kapoosh offers: admin-managed products first; falls back to the live WooCommerce store. */
export function KapooshShop() {
  const [d, setD] = useState<ShopOutputType | null>(null); const [open, setOpen] = useState<P | null>(null);
  useEffect(() => {
    shop({ action: 'list' }).then(async (r) => {
      if (r.products.length) return setD(r);
      const k = await kapooshProducts({ limit: 6 }).catch(() => ({ products: [] }));
      setD({ ...r, products: k.products.map((x) => ({ id: String(x.id), name: x.name, description: '', price: x.price, compareAtPrice: null, image: x.image, category: '', badge: '', inStock: true, link: x.link, featured: false })) });
    }).catch(() => setD({ products: [], gatewayReady: false, redirectUrl: null, orderNumber: null, paid: null, refId: null }));
  }, []);
  if (d && !d.products.length) return null;
  return (
    <>
      <div className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2 [scrollbar-width:none]">
        {!d ? Array.from({ length: 3 }).map((_, i) => <div key={i} className="skeleton aspect-[3/4] w-[44vw] max-w-[190px] shrink-0 rounded-[24px]" />) : d.products.map((p) => (
          <button key={p.id} onClick={() => setOpen(p)} className="press group w-[44vw] max-w-[190px] shrink-0 snap-start overflow-hidden rounded-[24px] border border-border bg-card text-start">
            <div className="relative aspect-square overflow-hidden bg-secondary">
              {p.image ? <img src={p.image} alt={p.name} loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" /> : <Shirt className="absolute inset-0 m-auto h-12 w-12 text-primary" />}
              {(p.badge || off(p) > 0) && <span className="absolute start-2 top-2 rounded-full bg-primary px-2 py-0.5 text-[10px] font-black text-primary-foreground">{p.badge || `${fa(off(p))}٪ تخفیف`}</span>}
            </div>
            <div className="p-3"><div className="truncate text-sm font-bold">{p.name}</div><div className="mt-0.5 text-xs font-bold text-primary">{toman(p.price)}</div></div>
          </button>
        ))}
      </div>
      <ProductSheet p={open} gateway={!!d?.gatewayReady} onClose={() => setOpen(null)} />
    </>
  );
}

/** Return page for the payment gateway (/shop/callback). */
export function ShopCallback() {
  const [sp] = useSearchParams();
  const [r, setR] = useState<ShopOutputType | null>(null); const [err, setErr] = useState('');
  useEffect(() => { shop({ action: 'verify', orderId: sp.get('order') ?? '', authority: sp.get('Authority') ?? '', gatewayStatus: sp.get('Status') ?? '' }).then(setR).catch((e) => setErr((e as Error).message)); }, [sp]);
  return (
    <div className="grid min-h-dvh place-items-center bg-background p-6 text-center">
      <div className="w-full max-w-sm rounded-[32px] border border-border bg-card p-8">
        {!r && !err ? <Loader2 className="mx-auto h-10 w-10 animate-spin text-primary" /> : r?.paid ? <>
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-primary text-primary-foreground"><Check className="h-8 w-8" /></div>
          <h1 className="mt-4 text-xl font-black">پرداخت موفق</h1><p className="mt-2 text-sm text-muted-foreground">سفارش #{fa(r.orderNumber ?? 0)} ثبت شد.<br />کد پیگیری: <b dir="ltr">{r.refId}</b></p>
        </> : <>
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-destructive/15 text-destructive"><X className="h-8 w-8" /></div>
          <h1 className="mt-4 text-xl font-black">پرداخت انجام نشد</h1><p className="mt-2 text-sm text-muted-foreground">{err || 'اگر مبلغی کسر شده، ظرف ۷۲ ساعت برمی‌گردد.'}</p>
        </>}
        <Link to="/app" className="press mt-6 flex h-12 items-center justify-center rounded-2xl bg-primary font-black text-primary-foreground">بازگشت به اپ</Link>
      </div>
    </div>
  );
}
