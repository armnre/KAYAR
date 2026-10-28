import { useState } from 'react';
import { ArrowLeft, ShoppingBag } from 'lucide-react';
import { cn } from '@project/components/lib/utils';
import { KButton } from '../kit';
import { SectionHead } from './Sections';
import { ShopCard } from '../shop/ShopCard';
import { useShop } from '../shop/useShop';

export function ShopSection() {
  const { d, err } = useShop('landing');
  const [tab, setTab] = useState<'own' | 'partners'>('own');
  if (err) return null;
  const own = d?.items.filter((i) => i.kind === 'own') ?? [];
  const partners = d?.items.filter((i) => i.kind !== 'own') ?? [];
  const list = tab === 'own' || !partners.length ? own : partners;
  return (
    <section id="shop" className="reveal mx-auto max-w-6xl px-4 py-20">
      <SectionHead eyebrow="فروشگاه کاپوش" title="پیشنهادهای ما برای" accent="تمرین بهتر" text="پوشاک ورزشی کاپوش و پیشنهادهای شریک‌ها و حامیان کایار." />
      {partners.length > 0 && <div className="mt-8 inline-flex rounded-full bg-white/5 p-1" role="tablist">
        {([['own', 'از کاپوش'], ['partners', 'شریک‌ها و حامیان']] as const).map(([k, l]) => <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)} className={cn('tap rounded-full px-5 text-sm font-bold transition-colors', tab === k ? 'bg-primary text-primary-foreground' : 'text-muted-foreground')}>{l}</button>)}
      </div>}
      <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {!d ? Array.from({ length: 4 }, (_, i) => <div key={i} className="skeleton aspect-[3/5] rounded-[24px]" />)
          : list.length ? list.map((i) => <ShopCard key={i.id} item={i} />)
          : <div className="col-span-full rounded-[28px] border border-dashed border-white/10 p-10 text-center text-muted-foreground"><ShoppingBag className="mx-auto mb-3 h-8 w-8 text-primary" />محصولات کاپوش به‌زودی این‌جا معرفی می‌شوند.</div>}
      </div>
      <div className="mt-8 text-center"><KButton to="/shop" variant="outline">مشاهده‌ی همه <ArrowLeft className="h-4 w-4" /></KButton></div>
    </section>
  );
}
