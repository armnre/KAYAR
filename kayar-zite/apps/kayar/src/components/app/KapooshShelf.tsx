import { useState } from 'react';
import { X } from 'lucide-react';
import { ShopCard } from '../shop/ShopCard';
import { useShop } from '../shop/useShop';

const KEY = 'kayar.shelf.hiddenUntil';

/** Low-key, dismissible "پیشنهاد کاپوش" shelf; admin can switch it off globally. Hidden for 7 days after closing. */
export function KapooshShelf() {
  const [hidden, setHidden] = useState(() => Number(localStorage.getItem(KEY) ?? 0) > Date.now());
  const { d } = useShop('app');
  if (hidden || !d?.items.length) return null;
  const close = () => { localStorage.setItem(KEY, String(Date.now() + 7 * 864e5)); setHidden(true); };
  return (
    <section className="mt-9" aria-label="پیشنهاد کاپوش">
      <div className="mb-3 flex items-center justify-between"><h2 className="flex items-center gap-2 text-lg font-black"><img src="/brand/logo-mark.svg" alt="" className="h-6 w-6" />پیشنهاد کاپوش</h2>
        <button onClick={close} aria-label="بستن پیشنهادها" className="tap grid h-12 w-12 place-items-center rounded-full text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button></div>
      <div className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2">{d.items.map((i) => <div key={i.id} className="w-40 shrink-0 snap-start"><ShopCard item={i} compact /></div>)}</div>
    </section>
  );
}
