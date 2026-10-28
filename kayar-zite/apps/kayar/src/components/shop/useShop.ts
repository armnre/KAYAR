import { useCallback, useEffect, useState } from 'react';
import { publicShop, type PublicShopOutputType } from 'zitejs/api';

export function useShop(placement: 'landing' | 'shop' | 'app') {
  const [d, setD] = useState<PublicShopOutputType | null>(null);
  const [err, setErr] = useState(false); const [n, setN] = useState(0);
  useEffect(() => { let on = true; setErr(false); publicShop({ placement }).then((r) => on && setD(r)).catch(() => on && setErr(true)); return () => { on = false; }; }, [placement, n]);
  const retry = useCallback(() => setN((x) => x + 1), []);
  return { d, err, retry };
}
