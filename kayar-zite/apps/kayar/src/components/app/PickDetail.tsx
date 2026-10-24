import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { z } from 'zod';
import { toast } from 'sonner';
import { ArrowRight, BadgeCheck, Check, Clock, Copy, ExternalLink, Loader2, MapPin, Minus, Plus, Share2, ShieldCheck, ShoppingBag, Tag, X, PlayCircle, Ticket, Users, Gift } from 'lucide-react';
import { appCampaigns, type AppCampaignsOutputType } from 'zitejs/api';
import { cn } from '@project/components/lib/utils';
import { Skeleton } from '@project/components/ui/skeleton';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@project/components/ui/sheet';
import { THEMES, KIND, priceLabel, discountPct, daysLeft, track, type C } from './KayarSuggestions';
import { toman, fa } from '../../lib/config';
import { errMsg, useSession } from '../../lib/session';

function Gallery({ c }: { c: C }) {
  const imgs = [c.imageUrl, ...c.gallery].filter(Boolean);
  const [i, setI] = useState(0);
  return (
    <div className={cn('relative -mx-4 -mt-5 h-[52vh] max-h-[460px] overflow-hidden bg-gradient-to-br', THEMES[c.theme] ?? THEMES.lime)}>
      {imgs.map((src, k) => <motion.img key={src + k} src={src} alt="" initial={false} animate={{ opacity: k === i ? 1 : 0, scale: k === i ? 1 : 1.08 }} transition={{ duration: 0.6 }} className="absolute inset-0 h-full w-full object-cover" />)}
      <div className="absolute inset-0 bg-gradient-to-t from-background via-background/10 to-black/40" />
      {imgs.length > 1 && <>
        <button aria-label="بعدی" onClick={() => setI((i + 1) % imgs.length)} className="absolute inset-y-0 start-0 w-1/3" />
        <button aria-label="قبلی" onClick={() => setI((i - 1 + imgs.length) % imgs.length)} className="absolute inset-y-0 end-0 w-1/3" />
        <div className="absolute inset-x-0 bottom-24 flex justify-center gap-1.5">{imgs.map((_, k) => <button key={k} aria-label={`تصویر ${k + 1}`} onClick={() => setI(k)} className={cn('h-1.5 rounded-full bg-white transition-all', k === i ? 'w-6' : 'w-1.5 opacity-50')} />)}</div>
      </>}
    </div>
  );
}

function Fact({ icon: I, l, v }: { icon: typeof Clock; l: string; v: string }) {
  return <div className="rounded-2xl border border-border bg-card p-3"><I className="h-4 w-4 text-primary" /><div className="mt-1.5 text-[11px] text-muted-foreground">{l}</div><div className="truncate text-sm font-black">{v}</div></div>;
}

const buyer = z.object({ name: z.string().trim().min(2, 'نام را کامل بنویس'), phone: z.string().regex(/^(\+98|0)?9\d{9}$/, 'شماره موبایل معتبر نیست'), address: z.string() });

function BuySheet({ c, open, onOpenChange, ready }: { c: C; open: boolean; onOpenChange: (v: boolean) => void; ready: boolean }) {
  const [qty, setQty] = useState(1); const [f, setF] = useState({ name: '', phone: '', address: '' }); const [busy, setBusy] = useState(false);
  const ship = c.kind === 'product';
  const left = c.stock != null ? Math.max(0, c.stock - c.sold) : 20;
  const v = buyer.safeParse(f); const errs = v.success ? {} : v.error.flatten().fieldErrors;
  const addrErr = ship && f.address.trim().length < 10 ? 'آدرس کامل لازم است' : '';
  const ok = v.success && !addrErr;
  const pay = async () => {
    setBusy(true);
    try { const r = await appCampaigns({ action: 'checkout', id: c.id, qty, customer: { ...f, phone: f.phone.replace(/^\+98/, '0') } }); if (r.redirectUrl) window.location.href = r.redirectUrl; }
    catch (e) { toast.error(errMsg(e)); setBusy(false); }
  };
  const inp = 'mt-1 h-12 w-full rounded-2xl border border-border bg-background px-3 text-sm outline-none focus:border-primary';
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="mx-auto max-h-[92dvh] max-w-lg overflow-y-auto rounded-t-[32px]">
        <SheetHeader><SheetTitle className="text-right">تکمیل خرید</SheetTitle></SheetHeader>
        <div className="mt-4 flex items-center gap-3 rounded-2xl bg-muted/40 p-3">
          {c.imageUrl && <img src={c.imageUrl} alt="" className="h-14 w-14 rounded-xl object-cover" />}
          <div className="min-w-0 flex-1"><div className="truncate font-black" dir="auto">{c.title}</div><div className="text-sm text-primary">{toman(c.amount)}</div></div>
          <div className="flex items-center gap-2 rounded-full border border-border p-1">
            <button aria-label="افزایش" onClick={() => setQty(Math.min(left, qty + 1))} className="grid h-8 w-8 place-items-center rounded-full bg-primary text-primary-foreground"><Plus className="h-4 w-4" /></button>
            <span className="w-5 text-center font-black">{fa(qty)}</span>
            <button aria-label="کاهش" onClick={() => setQty(Math.max(1, qty - 1))} className="grid h-8 w-8 place-items-center rounded-full bg-muted"><Minus className="h-4 w-4" /></button>
          </div>
        </div>
        <div className="mt-4 space-y-3">
          <label className="block text-sm font-bold">نام و نام خانوادگی<input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} className={inp} />{f.name && errs.name && <span className="text-xs text-destructive">{errs.name[0]}</span>}</label>
          <label className="block text-sm font-bold">شماره موبایل<input value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} inputMode="tel" dir="ltr" placeholder="09…" className={inp} />{f.phone && errs.phone && <span className="text-xs text-destructive">{errs.phone[0]}</span>}</label>
          {ship && <label className="block text-sm font-bold">آدرس ارسال<textarea value={f.address} onChange={(e) => setF({ ...f, address: e.target.value })} rows={3} className={cn(inp, 'h-auto py-2')} />{f.address && addrErr && <span className="text-xs text-destructive">{addrErr}</span>}</label>}
        </div>
        <div className="mt-5 flex items-center justify-between text-sm"><span className="text-muted-foreground">مبلغ قابل پرداخت</span><span className="text-lg font-black">{toman(c.amount * qty)}</span></div>
        <button onClick={pay} disabled={!ok || busy || !ready} className="press mt-4 flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-primary font-black text-primary-foreground disabled:opacity-50">
          {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <ShieldCheck className="h-5 w-5" />}{ready ? 'پرداخت امن' : 'درگاه پرداخت به‌زودی فعال می‌شود'}</button>
        <p className="mt-2 text-center text-[11px] text-muted-foreground">پرداخت از طریق درگاه بانکی امن انجام می‌شود.</p>
      </SheetContent>
    </Sheet>
  );
}

type Mine = NonNullable<AppCampaignsOutputType['mine']>;

function RegisterSheet({ c, open, onOpenChange, onDone }: { c: C; open: boolean; onOpenChange: (v: boolean) => void; onDone: (m: Mine) => void }) {
  const { token, member } = useSession('app');
  const [f, setF] = useState({ name: member?.displayName ?? '', phone: member?.phone ?? '', address: '' }); const [busy, setBusy] = useState(false);
  const v = buyer.safeParse(f); const errs = v.success ? {} : v.error.flatten().fieldErrors;
  const go = async () => { setBusy(true); try { const r = await appCampaigns({ action: 'register', id: c.id, token: token ?? '', customer: { ...f, phone: f.phone.replace(/^\+98/, '0') } }); if (r.mine) onDone(r.mine); onOpenChange(false); toast.success(r.mine?.status === 'waitlist' ? 'در لیست انتظار ثبت شدی' : 'ثبت‌نام انجام شد'); } catch (e) { toast.error(errMsg(e)); } finally { setBusy(false); } };
  const inp = 'mt-1 h-12 w-full rounded-2xl border border-border bg-background px-3 text-sm outline-none focus:border-primary';
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="mx-auto max-h-[92dvh] max-w-lg overflow-y-auto rounded-t-[32px]">
        <SheetHeader><SheetTitle className="text-right">ثبت‌نام در «{c.title}»</SheetTitle></SheetHeader>
        <div className="mt-4 space-y-3">
          <label className="block text-sm font-bold">نام و نام خانوادگی<input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} className={inp} />{f.name && errs.name && <span className="text-xs text-destructive">{errs.name[0]}</span>}</label>
          <label className="block text-sm font-bold">شماره موبایل<input value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} inputMode="tel" dir="ltr" placeholder="09…" className={inp} />{f.phone && errs.phone && <span className="text-xs text-destructive">{errs.phone[0]}</span>}</label>
          <label className="block text-sm font-bold">توضیحات (اختیاری)<textarea value={f.address} onChange={(e) => setF({ ...f, address: e.target.value })} rows={2} placeholder="مثلاً سایز تیشرت یا همراه" className={cn(inp, 'h-auto py-2')} /></label>
        </div>
        <button onClick={go} disabled={!v.success || busy} className="press mt-5 flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-primary font-black text-primary-foreground disabled:opacity-50">{busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Ticket className="h-5 w-5" />}تأیید ثبت‌نام</button>
      </SheetContent>
    </Sheet>
  );
}

export function PickDetail() {
  const { id = '' } = useParams(); const nav = useNavigate();
  const [d, setD] = useState<AppCampaignsOutputType | null>(null); const [err, setErr] = useState(''); const [buy, setBuy] = useState(false);
  const { token } = useSession('app'); const [mine, setMine] = useState<Mine | null>(null); const [reg, setReg] = useState(false); const [claiming, setClaiming] = useState(false);
  useEffect(() => { setD(null); appCampaigns({ action: 'get', id }).then(setD).catch((e) => setErr(errMsg(e))); }, [id]);
  useEffect(() => { if (token) appCampaigns({ action: 'mine', id, token }).then((r) => setMine(r.mine)).catch(() => {}); }, [id, token]);
  if (err) return <div className="py-24 text-center"><p className="text-muted-foreground">{err}</p><Link to="/app" className="mt-4 inline-block font-black text-primary">بازگشت به خانه</Link></div>;
  if (!d) return <div className="space-y-4"><Skeleton className="-mx-4 -mt-5 h-[52vh]" /><Skeleton className="h-8 w-2/3" /><Skeleton className="h-24" /></div>;
  const c = d.items[0]; const pct = discountPct(c); const left = daysLeft(c);
  const soldOut = c.stock != null && c.stock - c.sold <= 0;
  const share = () => { const url = window.location.href; if (navigator.share) navigator.share({ title: c.title, url }).catch(() => {}); else navigator.clipboard.writeText(url).then(() => toast.success('لینک کپی شد')); };
  const copy = () => navigator.clipboard.writeText(mine?.code || c.discountCode).then(() => toast.success('کد تخفیف کپی شد'));
  const act = c.actionType;
  const claim = async () => { setClaiming(true); try { const r = await appCampaigns({ action: 'claim', id: c.id, token: token ?? '' }); setMine(r.mine); if (r.mine?.code) navigator.clipboard.writeText(r.mine.code).then(() => toast.success('کد تخفیف دریافت و کپی شد')).catch(() => {}); } catch (e) { toast.error(errMsg(e)); } finally { setClaiming(false); } };
  const btn = 'press flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl bg-primary font-black text-primary-foreground disabled:opacity-50';
  return (
    <div className="pb-28">
      <div className="relative">
        <Gallery c={c} />
        <div className="absolute inset-x-0 top-0 flex justify-between">
          <button onClick={() => (window.history.length > 1 ? nav(-1) : nav('/app'))} aria-label="بازگشت" className="grid h-11 w-11 place-items-center rounded-full bg-black/40 text-white backdrop-blur"><ArrowRight className="h-5 w-5" /></button>
          <button onClick={share} aria-label="اشتراک‌گذاری" className="grid h-11 w-11 place-items-center rounded-full bg-black/40 text-white backdrop-blur"><Share2 className="h-5 w-5" /></button>
        </div>
      </div>
      <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} className="relative -mt-20">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="rounded-full bg-primary/15 px-3 py-1 text-[11px] font-black text-primary">{KIND[c.kind] ?? 'ویژه'}</span>
          {c.badge && <span className="rounded-full bg-primary px-3 py-1 text-[11px] font-black text-primary-foreground">{c.badge}</span>}
          {pct > 0 && <span className="rounded-full bg-destructive px-3 py-1 text-[11px] font-black text-white">٪{fa(pct)} تخفیف</span>}
        </div>
        <h1 className="mt-3 text-[28px] font-black leading-tight" dir="auto">{c.title}</h1>
        {c.subtitle && <p className="mt-1 text-muted-foreground" dir="auto">{c.subtitle}</p>}
        {(c.brand || c.sponsorLogo) && <div className="mt-4 flex items-center gap-3 rounded-2xl border border-border bg-card p-3">
          {c.sponsorLogo ? <img src={c.sponsorLogo} alt="" className="h-11 w-11 rounded-xl bg-white object-contain p-1" /> : <span className="grid h-11 w-11 place-items-center rounded-xl bg-primary/15 text-primary"><BadgeCheck className="h-5 w-5" /></span>}
          <div className="min-w-0 flex-1"><div className="text-[11px] text-muted-foreground">با حمایت</div><div className="truncate font-black">{c.brand || 'اسپانسر کایار'}</div></div>
        </div>}
        <div className="mt-4 grid grid-cols-3 gap-2">
          {left !== null && <Fact icon={Clock} l="زمان باقی‌مانده" v={left === 0 ? 'آخرین روز' : `${fa(left)} روز`} />}
          {c.location && <Fact icon={MapPin} l="مکان" v={c.location} />}
          {c.stock != null && <Fact icon={ShoppingBag} l="موجودی" v={soldOut ? 'تمام شد' : `${fa(c.stock - c.sold)} عدد`} />}
        </div>
        {(mine?.code && act !== 'register' ? true : c.discountCode && act !== 'code' && act !== 'partner') && <button onClick={() => navigator.clipboard.writeText(mine?.code || c.discountCode).then(() => toast.success('کد کپی شد'))} className="press mt-4 flex w-full items-center gap-3 rounded-2xl border-2 border-dashed border-primary/60 bg-primary/5 p-4 text-start">
          <Tag className="h-6 w-6 text-primary" /><div className="flex-1"><div className="text-[11px] text-muted-foreground">{c.partnerName ? `کد تخفیف شما برای ${c.partnerName}` : 'کد تخفیف اختصاصی کایار'}</div><div className="font-latin text-xl font-black tracking-widest" dir="ltr">{mine?.code || c.discountCode}</div></div><Copy className="h-5 w-5 text-primary" /></button>}
        {c.body && <section className="mt-6"><h2 className="mb-2 font-black">درباره</h2><p className="whitespace-pre-line leading-8 text-muted-foreground" dir="auto">{c.body}</p></section>}
        {c.videoUrl && <a href={c.videoUrl} target="_blank" rel="noopener noreferrer" className="press mt-4 flex items-center gap-2 rounded-2xl bg-card p-4 font-bold"><PlayCircle className="h-6 w-6 text-primary" />تماشای ویدیو<ExternalLink className="ms-auto h-4 w-4 text-muted-foreground" /></a>}
        {c.features.length > 0 && <section className="mt-6"><h2 className="mb-3 font-black">ویژگی‌ها</h2><ul className="space-y-2">{c.features.map((x) => <li key={x} className="flex items-start gap-2 text-sm"><span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground"><Check className="h-3 w-3" /></span><span dir="auto">{x}</span></li>)}</ul></section>}
        {c.specs.length > 0 && <section className="mt-6"><h2 className="mb-3 font-black">مشخصات</h2><dl className="overflow-hidden rounded-2xl border border-border">{c.specs.map((s, k) => <div key={k} className={cn('flex justify-between gap-3 px-4 py-3 text-sm', k % 2 ? 'bg-card' : 'bg-muted/30')}><dt className="text-muted-foreground">{s.k}</dt><dd className="text-end font-bold">{s.v}</dd></div>)}</dl></section>}
        {c.terms && <section className="mt-6"><h2 className="mb-2 font-black">شرایط و قوانین</h2><p className="whitespace-pre-line text-xs leading-6 text-muted-foreground">{c.terms}</p></section>}
      </motion.div>
      <div className="fixed inset-x-0 bottom-[calc(var(--nav-h)+var(--safe-b)+8px)] z-30 px-4 lg:bottom-4">
        <div className="mx-auto flex max-w-3xl items-center gap-3 rounded-[24px] border border-border bg-background/90 p-3 shadow-2xl backdrop-blur-xl">
          {priceLabel(c) && <div className="ps-1">{c.oldPrice && <div className="text-[11px] text-muted-foreground line-through">{c.oldPrice}</div>}<div className="font-black text-primary">{priceLabel(c)}</div></div>}
          {act === 'buy' && c.purchasable && c.amount > 0 ? <button disabled={soldOut} onClick={() => { track(c.id, 'click'); setBuy(true); }} className={btn}><ShoppingBag className="h-5 w-5" />{soldOut ? 'ناموجود' : c.ctaLabel || 'خرید'}</button>
            : act === 'register' ? (mine?.registered ? <div className={cn(btn, 'bg-primary/15 text-primary')}><Check className="h-5 w-5" />{mine.status === 'waitlist' ? 'در لیست انتظار' : 'ثبت‌نام شدی'} · <span dir="ltr">{mine.code}</span></div>
              : <button onClick={() => { track(c.id, 'click'); setReg(true); }} className={btn}><Ticket className="h-5 w-5" />{c.ctaLabel || 'ثبت‌نام'}{mine && <span className="flex items-center gap-1 text-xs opacity-70"><Users className="h-3.5 w-3.5" />{fa(mine.registrations)}</span>}</button>)
            : act === 'code' || act === 'partner' ? (mine?.code ? <button onClick={copy} className={btn}><Copy className="h-4 w-4" />کپی کد: <span dir="ltr">{mine.code}</span></button>
              : <button disabled={claiming} onClick={() => { track(c.id, 'click'); claim(); }} className={btn}>{claiming ? <Loader2 className="h-5 w-5 animate-spin" /> : <Gift className="h-5 w-5" />}{c.ctaLabel || 'دریافت کد تخفیف'}</button>)
            : c.link.startsWith('/') ? <Link to={c.link} onClick={() => track(c.id, 'click')} className={btn}>{c.ctaLabel || 'ادامه'}</Link>
            : <button onClick={share} className={btn}><Share2 className="h-4 w-4" />{c.ctaLabel || 'اشتراک با دوستان'}</button>}
        </div>
      </div>
      {act === 'register' && <RegisterSheet c={c} open={reg} onOpenChange={setReg} onDone={setMine} />}
      {c.purchasable && <BuySheet c={c} open={buy} onOpenChange={setBuy} ready={d.gatewayReady} />}
    </div>
  );
}

/** Return page for the payment gateway (/shop/callback). */
export function PickCallback() {
  const [sp] = useSearchParams();
  const [r, setR] = useState<AppCampaignsOutputType | null>(null); const [err, setErr] = useState('');
  useEffect(() => { appCampaigns({ action: 'verify', orderId: sp.get('order') ?? '', authority: sp.get('Authority') ?? '', gatewayStatus: sp.get('Status') ?? '' }).then(setR).catch((e) => setErr(errMsg(e))); }, [sp]);
  return (
    <div className="grid min-h-dvh place-items-center bg-background p-6 text-center">
      <div className="w-full max-w-sm rounded-[32px] border border-border bg-card p-8">
        {!r && !err ? <Loader2 className="mx-auto h-10 w-10 animate-spin text-primary" /> : r?.paid ? <>
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-primary text-primary-foreground"><Check className="h-8 w-8" /></div>
          <h1 className="mt-4 text-xl font-black">پرداخت موفق</h1><p className="mt-2 text-sm text-muted-foreground">{r.itemTitle && <>{r.itemTitle}<br /></>}سفارش #{fa(r.orderNumber ?? 0)} ثبت شد.<br />کد پیگیری: <b dir="ltr">{r.refId}</b></p>
        </> : <>
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-destructive/15 text-destructive"><X className="h-8 w-8" /></div>
          <h1 className="mt-4 text-xl font-black">پرداخت انجام نشد</h1><p className="mt-2 text-sm text-muted-foreground">{err || 'اگر مبلغی کسر شده، ظرف ۷۲ ساعت برمی‌گردد.'}</p>
        </>}
        <Link to="/app" className="press mt-6 flex h-12 items-center justify-center rounded-2xl bg-primary font-black text-primary-foreground">بازگشت به اپ</Link>
      </div>
    </div>
  );
}
