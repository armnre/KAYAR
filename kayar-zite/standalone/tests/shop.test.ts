// Run: npx tsx standalone/tests/shop.test.ts — open-redirect / visibility rules for /go/:id
import { destination, isLive } from '../../apps/kayar/src/server/shop';
const own = { type: 'own' } as any, partner = { type: 'partner', url: 'https://shop.example.ir' } as any;
const c = (n: string, v: unknown, e: unknown) => console.log(v === e ? 'PASS' : 'FAIL', n, v);
c('javascript: scheme rejected', destination({ targetUrl: 'javascript:alert(1)' } as any, partner), '');
c('creds blocked', destination({ targetUrl: 'https://a:b@evil.com' } as any, undefined), '');
c('own without store = soon', destination({ targetUrl: '' } as any, own), '');
c('utm added', destination({ targetUrl: 'https://x.ir/p?a=1' } as any, undefined), 'https://x.ir/p?a=1&utm_source=kayar&utm_medium=referral&utm_campaign=kayar_shop');
c('inactive hidden', isLive({ active: false } as any), false);
c('expired hidden', isLive({ active: true, endsAt: '2020-01-01' } as any), false);
