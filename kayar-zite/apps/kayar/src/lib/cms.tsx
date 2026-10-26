import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { publicCms } from 'zitejs/api';
import { withRetry } from './session';
import { DEFAULTS, parseBlock, BLOCK_KEYS, type BlockKey, type BlockContent } from './cmsSchema';

type Published = Partial<{ [K in BlockKey]: BlockContent<K> }>;
const Ctx = createContext<Published>({});

/** Loads published CMS blocks once; sections fall back to built-in defaults. */
export function CmsProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<Published>(() => { try { return JSON.parse(localStorage.getItem('kayar:cms') || '{}'); } catch { return {}; } });
  useEffect(() => {
    withRetry(() => publicCms({})).then((r) => {
      const out: Published = {};
      for (const b of r.blocks) {
        const k = b.key as BlockKey;
        if (!BLOCK_KEYS.includes(k)) continue;
        const parsed = parseBlock(k, b.content);
        if (parsed) (out as Record<string, unknown>)[k] = parsed;
      }
      setData(out);
      try { localStorage.setItem('kayar:cms', JSON.stringify(out)); } catch { /* ignore */ }
    }).catch(() => { /* keep cached/default content */ });
  }, []);
  return <Ctx.Provider value={data}>{children}</Ctx.Provider>;
}

export function useBlock<K extends BlockKey>(key: K): BlockContent<K> {
  const p = useContext(Ctx);
  return (p[key] as BlockContent<K> | undefined) ?? DEFAULTS[key];
}
