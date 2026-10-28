import { useCallback, useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, ImagePlus, Download, BarChart3, Store, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { adminShop, type AdminShopOutputType, type AdminShopInputType } from 'zitejs/api';
import { Switch } from '@project/components/ui/switch';
import { cn } from '@project/components/lib/utils';
import { KButton, Glass, StateView } from '../../components/kit';
import { PageHead, ListSkeleton, ErrorState, ResponsiveModal, Confirm } from '../../components/admin/ui';
import { SortableList } from '../../components/admin/SortableList';
import { ShopCard } from '../../components/shop/ShopCard';
import { MediaPicker } from './Media';
import { useAdmin, errMsg } from '../../lib/session';
import { fa } from '../../lib/config';

type D = AdminShopOutputType;
type Item = D['items'][0];
type Partner = D['partners'][0];
type ItemIn = NonNullable<AdminShopInputType['item']>;
type PartnerIn = NonNullable<AdminShopInputType['partner']>;
const inp = 'mt-1 h-11 w-full rounded-2xl border border-white/10 bg-bg1 px-3 text-sm font-normal outline-none focus:border-primary';
const CATS: [string, string][] = [['tshirt', 'تی‌شرت'], ['polo', 'پولوشرت'], ['set', 'ست ورزشی'], ['tracksuit', 'گرمکن'], ['equipment', 'تجهیزات'], ['supplement', 'مکمل'], ['other', 'سایر']];
const TYPE: Record<string, string> = { own: 'کاپوش', partner: 'همکار', sponsor: 'حامی' };
const toLocal = (iso: string | null) => (iso ? new Date(new Date(iso).getTime() - new Date().getTimezoneOffset() * 6e4).toISOString().slice(0, 16) : '');

function Seg<T extends string>({ value, opts, onChange }: { value: T; opts: [T, string][]; onChange: (v: T) => void }) {
  return <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${opts.length},1fr)` }}>{opts.map(([v, l]) => <button key={v || 'none'} type="button" onClick={() => onChange(v)} className={cn('h-10 rounded-2xl text-xs font-bold', value === v ? 'bg-primary text-primary-foreground' : 'bg-white/5')}>{l}</button>)}</div>;
}
const Toggle = ({ label, on, set }: { label: string; on: boolean; set: (v: boolean) => void }) => <label className="flex min-h-[44px] items-center justify-between gap-3 text-sm font-bold">{label}<Switch checked={on} onCheckedChange={set} /></label>;

function ItemForm({ item, partners, onSaved }: { item?: Item; partners: Partner[]; onSaved: (d: D) => void }) {
  const { token } = useAdmin();
  const [f, setF] = useState<ItemIn>({ title: item?.title ?? '', partnerId: item?.partnerId ?? partners[0]?.id ?? '', description: item?.description ?? '', image: item?.image ?? '', price: item?.price ?? null, currency: item?.currency ?? 'IRT', badge: item?.badge ?? '', category: item?.category ?? 'tshirt', tags: item?.tags ?? '', targetUrl: item?.targetUrl ?? '', active: item?.active ?? true, featured: item?.featured ?? false, showInLanding: item?.showInLanding ?? true, showInApp: item?.showInApp ?? false, startsAt: item?.startsAt ?? null, endsAt: item?.endsAt ?? null });
  const [pick, setPick] = useState(false); const [busy, setBusy] = useState(false);
  const urlBad = !!f.targetUrl && !/^https?:\/\//i.test(f.targetUrl);
  const p = partners.find((x) => x.id === f.partnerId);
  const save = async () => { setBusy(true); try { onSaved(await adminShop({ token, action: 'saveItem', id: item?.id, item: f })); toast.success('ذخیره شد'); } catch (e) { toast.error(errMsg(e)); } finally { setBusy(false); } };
  return (
    <div className="grid gap-5 md:grid-cols-[1fr_200px]">
      <div className="space-y-3">
        <label className="block text-sm font-bold">عنوان<input value={f.title} maxLength={160} onChange={(e) => setF({ ...f, title: e.target.value })} className={inp} /></label>
        <label className="block text-sm font-bold">فروشنده / شریک<select value={f.partnerId} onChange={(e) => setF({ ...f, partnerId: e.target.value })} className={inp}>{partners.map((x) => <option key={x.id} value={x.id}>{x.name} ({TYPE[x.type]})</option>)}</select></label>
        <div className="flex items-center gap-3">{f.image && <img src={f.image} alt="" className="h-16 w-12 rounded-xl bg-white object-contain" />}<KButton variant="outline" size="sm" onClick={() => setPick(true)}><ImagePlus className="h-4 w-4" />تصویر از رسانه</KButton></div>
        <div className="text-sm font-bold">دسته</div><select value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })} className={inp}>{CATS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
        <div className="grid grid-cols-[1fr_120px] gap-2"><label className="block text-sm font-bold">قیمت (اختیاری)<input inputMode="numeric" value={f.price ?? ''} onChange={(e) => { const n = Number(e.target.value.replace(/[^\d]/g, '')); setF({ ...f, price: e.target.value.trim() ? n : null }); }} className={inp} dir="ltr" /></label>
          <label className="block text-sm font-bold">واحد<select value={f.currency} onChange={(e) => setF({ ...f, currency: e.target.value as 'IRT' | 'IRR' })} className={inp}><option value="IRT">تومان</option><option value="IRR">ریال</option></select></label></div>
        <label className="block text-sm font-bold">لینک خرید (خالی = لینک فروشگاه شریک / به‌زودی)<input value={f.targetUrl} onChange={(e) => setF({ ...f, targetUrl: e.target.value.trim() })} className={cn(inp, urlBad && 'border-destructive')} dir="ltr" placeholder="https://" /></label>
        {urlBad && <p className="text-xs text-destructive">لینک باید با http:// یا https:// شروع شود.</p>}
        <label className="block text-sm font-bold">برچسب‌ها (با کاما)<input value={f.tags} onChange={(e) => setF({ ...f, tags: e.target.value })} className={inp} /></label>
        <div className="text-sm font-bold">نشان</div><Seg value={f.badge} onChange={(v) => setF({ ...f, badge: v })} opts={[['', 'بدون'], ['new', 'جدید'], ['bestseller', 'پرفروش'], ['sponsor', 'حامی']]} />
        <div className="grid grid-cols-2 gap-2"><label className="block text-sm font-bold">شروع نمایش<input type="datetime-local" value={toLocal(f.startsAt)} onChange={(e) => setF({ ...f, startsAt: e.target.value ? new Date(e.target.value).toISOString() : null })} className={inp} dir="ltr" /></label>
          <label className="block text-sm font-bold">پایان نمایش<input type="datetime-local" value={toLocal(f.endsAt)} onChange={(e) => setF({ ...f, endsAt: e.target.value ? new Date(e.target.value).toISOString() : null })} className={inp} dir="ltr" /></label></div>
        <Toggle label="فعال" on={f.active} set={(v) => setF({ ...f, active: v })} />
        <Toggle label="ویژه (اول لیست)" on={f.featured} set={(v) => setF({ ...f, featured: v })} />
        <Toggle label="نمایش در لندینگ" on={f.showInLanding} set={(v) => setF({ ...f, showInLanding: v })} />
        <Toggle label="نمایش در شلف داخل اپ" on={f.showInApp} set={(v) => setF({ ...f, showInApp: v })} />
        <KButton className="w-full" loading={busy} disabled={!f.title.trim() || !f.partnerId || urlBad} onClick={save}>ذخیره</KButton>
      </div>
      <div><div className="mb-2 flex items-center gap-1 text-xs font-bold text-muted-foreground"><Eye className="h-3.5 w-3.5" />پیش‌نمایش</div>
        <ShopCard item={{ id: 'preview', title: f.title || 'عنوان محصول', description: '', image: f.image, price: f.price && f.price > 0 ? f.price : null, currency: f.currency, badge: f.badge, category: f.category, categoryLabel: CATS.find((c) => c[0] === f.category)?.[1] ?? 'سایر', tags: [], kind: (p?.type ?? 'own'), partnerName: p?.name ?? '', linkable: false, featured: f.featured }} /></div>
      <MediaPicker open={pick} onOpenChange={setPick} onSelect={(a) => setF({ ...f, image: a.url })} />
    </div>
  );
}

function PartnerForm({ partner, onSaved }: { partner?: Partner; onSaved: (d: D) => void }) {
  const { token } = useAdmin();
  const [f, setF] = useState<PartnerIn>({ name: partner?.name ?? '', type: partner?.type ?? 'partner', logo: partner?.logo ?? '', url: partner?.url ?? '', description: partner?.description ?? '', active: partner?.active ?? true });
  const [pick, setPick] = useState(false); const [busy, setBusy] = useState(false);
  const urlBad = !!f.url && !/^https?:\/\//i.test(f.url);
  const save = async () => { setBusy(true); try { onSaved(await adminShop({ token, action: 'savePartner', id: partner?.id, partner: f })); toast.success('ذخیره شد'); } catch (e) { toast.error(errMsg(e)); } finally { setBusy(false); } };
  return (
    <div className="space-y-3">
      <label className="block text-sm font-bold">نام<input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} className={inp} /></label>
      <div className="text-sm font-bold">نوع</div><Seg value={f.type} onChange={(v) => setF({ ...f, type: v })} opts={[['own', 'کاپوش'], ['partner', 'همکار'], ['sponsor', 'حامی']]} />
      <label className="block text-sm font-bold">آدرس سایت{f.type === 'own' && ' (خالی = KAPOOSH_STORE_URL)'}<input value={f.url} onChange={(e) => setF({ ...f, url: e.target.value.trim() })} className={cn(inp, urlBad && 'border-destructive')} dir="ltr" placeholder="https://" /></label>
      {urlBad && <p className="text-xs text-destructive">آدرس باید با http:// یا https:// شروع شود.</p>}
      <label className="block text-sm font-bold">توضیح<textarea value={f.description} maxLength={500} rows={2} onChange={(e) => setF({ ...f, description: e.target.value })} className={cn(inp, 'h-auto py-2')} /></label>
      <div className="flex items-center gap-3">{f.logo && <img src={f.logo} alt="" className="h-12 w-12 rounded-xl object-contain" />}<KButton variant="outline" size="sm" onClick={() => setPick(true)}><ImagePlus className="h-4 w-4" />لوگو</KButton></div>
      <Toggle label="فعال" on={f.active} set={(v) => setF({ ...f, active: v })} />
      <KButton className="w-full" loading={busy} disabled={!f.name.trim() || urlBad} onClick={save}>ذخیره</KButton>
      <MediaPicker open={pick} onOpenChange={setPick} onSelect={(a) => setF({ ...f, logo: a.url })} />
    </div>
  );
}

function Stats({ d }: { d: D }) {
  const max = Math.max(1, ...d.daily.map((x) => x.n));
  const total = d.daily.reduce((s, x) => s + x.n, 0);
  return (
    <Glass className="p-4">
      <div className="mb-3 flex items-center gap-2 font-black"><BarChart3 className="h-5 w-5 text-primary" />کلیک‌های ۳۰ روز اخیر: {fa(total)}</div>
      {d.daily.length ? <div className="flex h-24 items-end gap-1" dir="ltr">{d.daily.map((x) => <div key={x.day} title={`${x.day}: ${x.n}`} className="flex-1 rounded-t bg-primary/80" style={{ height: `${(x.n / max) * 100}%` }} />)}</div> : <p className="text-sm text-muted-foreground">هنوز کلیکی ثبت نشده است.</p>}
      <div className="mt-3 space-y-1 text-sm">{[...d.items].sort((a, b) => b.clicks30 - a.clicks30).slice(0, 5).filter((i) => i.clicks30).map((i) => <div key={i.id} className="flex justify-between"><span className="truncate">{i.title}</span><b>{fa(i.clicks30)}</b></div>)}</div>
    </Glass>
  );
}

export function AdminShop() {
  const { token } = useAdmin();
  const [d, setD] = useState<D | null>(null); const [err, setErr] = useState(''); const [tab, setTab] = useState<'items' | 'partners' | 'stats'>('items');
  const [editItem, setEditItem] = useState<Item | 'new' | null>(null); const [editPartner, setEditPartner] = useState<Partner | 'new' | null>(null);
  const [del, setDel] = useState<{ kind: 'item' | 'partner'; id: string; name: string } | null>(null);
  const call = useCallback(async (inp: Omit<AdminShopInputType, 'token'>) => { try { const r = await adminShop({ token, ...inp }); setD(r); setErr(''); return r; } catch (e) { if (inp.action === 'list') setErr(errMsg(e)); else toast.error(errMsg(e)); return null; } }, [token]);
  useEffect(() => { void call({ action: 'list' }); }, [call]);
  if (err) return <ErrorState text={err} onRetry={() => void call({ action: 'list' })} />;
  const pName = (id: string) => d?.partners.find((p) => p.id === id);
  return (
    <div>
      <PageHead title="فروشگاه کاپوش" sub="محصولات کاپوش و پیشنهادهای شریک‌ها/حامیان در لندینگ، /shop و اپ" action={<KButton size="sm" onClick={() => (tab === 'partners' ? setEditPartner('new') : setEditItem('new'))} disabled={!d || (tab !== 'partners' && !d.partners.length)}><Plus className="h-4 w-4" />{tab === 'partners' ? 'شریک جدید' : 'آیتم جدید'}</KButton>} />
      {d && !d.storeConfigured && <div className="mb-4 rounded-2xl border border-primary/30 bg-primary/10 p-3 text-sm">متغیر <b dir="ltr">KAPOOSH_STORE_URL</b> تنظیم نشده؛ آیتم‌های کاپوش بدون لینک اختصاصی «به‌زودی» نمایش داده می‌شوند.</div>}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {([['items', 'آیتم‌ها'], ['partners', 'شریک‌ها'], ['stats', 'آمار کلیک']] as const).map(([k, l]) => <button key={k} onClick={() => setTab(k)} className={cn('tap rounded-full px-4 text-sm font-bold', tab === k ? 'bg-primary text-primary-foreground' : 'bg-white/5')}>{l}</button>)}
        {d && <label className="ms-auto flex items-center gap-2 text-sm font-bold">شلف داخل اپ<Switch checked={d.appShelf} onCheckedChange={(v) => void call({ action: 'setShelf', shelf: v })} /></label>}
      </div>
      {!d ? <ListSkeleton /> : tab === 'stats' ? <Stats d={d} /> : tab === 'partners' ? (
        d.partners.length ? <div className="space-y-2">{d.partners.map((p) => <Glass key={p.id} className="flex items-center gap-3 p-3">{p.logo ? <img src={p.logo} alt="" className="h-10 w-10 rounded-xl object-contain" /> : <Store className="h-10 w-10 p-2 text-muted-foreground" />}<div className="min-w-0 flex-1"><div className="truncate font-bold">{p.name}</div><div className="text-xs text-muted-foreground">{TYPE[p.type]}{!p.active && ' · غیرفعال'}</div></div>
          <button aria-label="ویرایش" onClick={() => setEditPartner(p)} className="tap grid h-11 w-11 place-items-center rounded-full hover:bg-white/5"><Pencil className="h-4 w-4" /></button><button aria-label="حذف" onClick={() => setDel({ kind: 'partner', id: p.id, name: p.name })} className="tap grid h-11 w-11 place-items-center rounded-full text-destructive hover:bg-white/5"><Trash2 className="h-4 w-4" /></button></Glass>)}</div>
          : <StateView icon={Store} title="هنوز شریکی ثبت نشده" action={<KButton onClick={() => void call({ action: 'seed' }).then((r) => r && toast.success(`${fa(r.seeded)} محصول کاپوش اضافه شد`))}><Download className="h-4 w-4" />وارد کردن داده‌ی اولیه‌ی کاپوش</KButton>} />
      ) : d.items.length ? (
        <SortableList items={d.items} onReorder={(next) => void call({ action: 'reorder', ids: next.map((x) => x.id) })} render={(i) => (
          <div className="flex items-center gap-3 p-2">
            {i.image ? <img src={i.image} alt="" className="h-14 w-11 rounded-lg bg-white object-contain" /> : <div className="h-14 w-11 rounded-lg bg-white/5" />}
            <div className="min-w-0 flex-1"><div className="truncate font-bold">{i.title}</div><div className="truncate text-xs text-muted-foreground">{pName(i.partnerId)?.name ?? '—'} · {i.active ? 'فعال' : 'غیرفعال'}{i.showInLanding && ' · لندینگ'}{i.showInApp && ' · اپ'} · {i.linkable ? `${fa(i.clicks30)} کلیک` : 'به‌زودی'}</div></div>
            <button aria-label="ویرایش" onClick={() => setEditItem(i)} className="tap grid h-11 w-11 place-items-center rounded-full hover:bg-white/5"><Pencil className="h-4 w-4" /></button>
            <button aria-label="حذف" onClick={() => setDel({ kind: 'item', id: i.id, name: i.title })} className="tap grid h-11 w-11 place-items-center rounded-full text-destructive hover:bg-white/5"><Trash2 className="h-4 w-4" /></button>
          </div>
        )} />
      ) : <StateView icon={Store} title="هنوز آیتمی ثبت نشده" text="می‌توانی ۶ محصول واقعی کاپوش را (بدون قیمت و لینک) وارد و بعد ویرایش کنی." action={<KButton onClick={() => void call({ action: 'seed' }).then((r) => r && toast.success(`${fa(r.seeded)} محصول کاپوش اضافه شد`))}><Download className="h-4 w-4" />وارد کردن محصولات کاپوش</KButton>} />}
      <ResponsiveModal open={!!editItem} onOpenChange={(v) => !v && setEditItem(null)} title={editItem === 'new' ? 'آیتم جدید' : 'ویرایش آیتم'} wide>
        {d && editItem && <ItemForm item={editItem === 'new' ? undefined : editItem} partners={d.partners} onSaved={(r) => { setD(r); setEditItem(null); }} />}
      </ResponsiveModal>
      <ResponsiveModal open={!!editPartner} onOpenChange={(v) => !v && setEditPartner(null)} title={editPartner === 'new' ? 'شریک جدید' : 'ویرایش شریک'}>
        {editPartner && <PartnerForm partner={editPartner === 'new' ? undefined : editPartner} onSaved={(r) => { setD(r); setEditPartner(null); }} />}
      </ResponsiveModal>
      <Confirm open={!!del} onOpenChange={(v) => !v && setDel(null)} title="حذف شود؟" text={`«${del?.name ?? ''}» برای همیشه حذف می‌شود.`} confirmLabel="حذف" danger onConfirm={() => { if (del) void call({ action: del.kind === 'item' ? 'deleteItem' : 'deletePartner', id: del.id }).then((r) => r && toast.success('حذف شد')); setDel(null); }} />
    </div>
  );
}
