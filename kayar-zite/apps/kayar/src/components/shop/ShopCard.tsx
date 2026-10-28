import { ExternalLink, Clock } from 'lucide-react';
import type { PublicShopOutputType } from 'zitejs/api';
import { cn } from '@project/components/lib/utils';
import { fa } from '../../lib/config';

export type ShopItem = PublicShopOutputType['items'][0];
const BADGE: Record<string, string> = { new: 'جدید', bestseller: 'پرفروش', sponsor: 'حامی' };
const KIND: Record<string, string> = { partner: 'همکار', sponsor: 'حامی' };

export const price = (i: ShopItem) => (i.price ? `${fa(i.price.toLocaleString('en-US'))} ${i.currency === 'IRR' ? 'ریال' : 'تومان'}` : '');

export function ShopCard({ item, compact }: { item: ShopItem; compact?: boolean }) {
  const ext = item.kind !== 'own';
  const body = (
    <>
      <div className="relative aspect-[3/4] overflow-hidden rounded-[20px] bg-[hsl(0_0%_88%)]">
        {item.image ? <img src={item.image} alt={item.title} width={225} height={300} loading="lazy" decoding="async" className="h-full w-full object-contain transition-transform duration-500 group-hover:scale-[1.03]" />
          : <div className="grid h-full place-items-center bg-bg1"><img src="/brand/logo-mark.svg" alt="" className="h-12 w-12 opacity-60" /></div>}
        <div className="absolute start-2 top-2 flex flex-wrap gap-1">
          {KIND[item.kind] && <span className="rounded-full bg-black/75 px-2 py-0.5 text-[11px] font-bold text-white">{KIND[item.kind]}</span>}
          {item.badge && item.badge !== 'sponsor' && <span className="rounded-full bg-primary px-2 py-0.5 text-[11px] font-black text-primary-foreground">{BADGE[item.badge]}</span>}
        </div>
      </div>
      <div className="mt-3 px-1">
        <div className="text-[11px] font-bold text-muted-foreground">{item.categoryLabel}{ext && ` · ${item.partnerName}`}</div>
        <div className={cn('mt-0.5 font-extrabold leading-snug', compact ? 'line-clamp-1 text-sm' : 'line-clamp-2 text-[15px]')}>{item.title}</div>
        {price(item) && <div className="mt-1 text-sm font-bold text-primary">{price(item)}</div>}
        <div className={cn('mt-2 inline-flex min-h-[40px] items-center gap-1.5 text-[13px] font-bold', item.linkable ? 'text-foreground' : 'text-muted-foreground')}>
          {item.linkable ? <>مشاهده در فروشگاه <ExternalLink className="h-3.5 w-3.5" /></> : <><Clock className="h-3.5 w-3.5" />به‌زودی</>}
        </div>
      </div>
    </>
  );
  const cls = 'group press block rounded-[24px] border border-white/5 bg-white/[.03] p-2.5 text-start transition-colors hover:border-primary/30';
  if (!item.linkable) return <div className={cls} aria-label={`${item.title} — به‌زودی`}>{body}</div>;
  return <a href={`/go/${item.id}`} target="_blank" rel={ext ? 'noopener noreferrer sponsored' : 'noopener noreferrer'} className={cls}>{body}</a>;
}
