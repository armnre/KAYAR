import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import { Download, Share, PlusSquare, X } from 'lucide-react';
import { applyRobotsForPath } from '../lib/headTags';

declare global { interface Window { __KAYAR__?: { swDisabled?: boolean; version?: string } } }
type BIPEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }> };

const DISMISS_KEY = 'kayar.install.dismissedAt';
const SNOOZE_MS = 14 * 24 * 3600_000;
const isStandalone = () => window.matchMedia?.('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true;
const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) && !/crios|fxios/i.test(navigator.userAgent);

/** Registers the service worker (production only), offers updates via a toast, honours the server kill-switch. */
function useServiceWorker() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    if (window.__KAYAR__?.swDisabled) {
      void navigator.serviceWorker.getRegistrations().then((rs) => rs.forEach((r) => void r.unregister()));
      return;
    }
    if (!import.meta.env.PROD) return;
    if (window.location.hostname.startsWith('zite-editor-') || window.self !== window.top) {
      void navigator.serviceWorker.getRegistrations().then((rs) => rs.forEach((r) => void r.unregister()));
      void caches?.keys().then((ks) => ks.forEach((k) => void caches.delete(k)));
      return;
    }
    let cancelled = false;
    void fetch('/sw.js', { method: 'HEAD', cache: 'no-store' })
      .then((r) => r.ok && /javascript/i.test(r.headers.get('content-type') ?? ''))
      .catch(() => false)
      .then((ok) => ok ? import('workbox-window') : null)
      .then((mod) => {
      if (cancelled || !mod) return;
      const { Workbox } = mod;
      const wb = new Workbox('/sw.js', { scope: '/' });
      wb.addEventListener('waiting', () => {
        toast('نسخه‌ی جدید کایار آماده است', {
          duration: Infinity, id: 'sw-update',
          description: 'هر وقت آماده بودی به‌روزرسانی کن؛ کار نیمه‌تمامت را اول ذخیره کن.',
          action: { label: 'به‌روزرسانی', onClick: () => { wb.addEventListener('controlling', () => window.location.reload()); wb.messageSkipWaiting(); } },
        });
      });
      void wb.register().then((reg) => { if (reg) setInterval(() => void reg.update().catch(() => {}), 30 * 60_000); });
    });
    return () => { cancelled = true; };
  }, []);
}

function InstallPrompt() {
  const { pathname } = useLocation();
  const [evt, setEvt] = useState<BIPEvent | null>(null);
  const [show, setShow] = useState(false);
  const snoozed = () => Date.now() - Number(localStorage.getItem(DISMISS_KEY) ?? 0) < SNOOZE_MS;
  useEffect(() => {
    const onBip = (e: Event) => { e.preventDefault(); setEvt(e as BIPEvent); };
    const onInstalled = () => { setShow(false); setEvt(null); };
    window.addEventListener('beforeinstallprompt', onBip);
    window.addEventListener('appinstalled', onInstalled);
    return () => { window.removeEventListener('beforeinstallprompt', onBip); window.removeEventListener('appinstalled', onInstalled); };
  }, []);
  // Only inside the app, never on login/auth screens, after the user has had a moment to settle in
  const eligible = pathname.startsWith('/app') && !pathname.startsWith('/app/login') && !pathname.startsWith('/app/change-password');
  useEffect(() => {
    if (!eligible || isStandalone() || snoozed() || (!evt && !isIOS())) { setShow(false); return; }
    const t = setTimeout(() => setShow(true), 25_000);
    return () => clearTimeout(t);
  }, [eligible, evt]);
  if (!show) return null;
  const dismiss = () => { localStorage.setItem(DISMISS_KEY, String(Date.now())); setShow(false); };
  const install = async () => { if (!evt) return; await evt.prompt(); const c = await evt.userChoice; if (c.outcome === 'dismissed') dismiss(); setEvt(null); setShow(false); };
  return (
    <div role="dialog" aria-label="نصب اپ کایار" className="fixed inset-x-3 bottom-[calc(84px+var(--safe-b,0px))] z-50 mx-auto max-w-md animate-in fade-in slide-in-from-bottom-4">
      <div className="glass flex items-start gap-3 rounded-[24px] p-4 shadow-2xl">
        <img src="/icon-192.png" alt="" className="h-12 w-12 shrink-0 rounded-2xl" />
        <div className="min-w-0 flex-1">
          <div className="font-black">کایار را روی گوشی نصب کن</div>
          {evt ? (
            <p className="mt-0.5 text-sm text-muted-foreground">دسترسی سریع‌تر، تمام‌صفحه و بدون نوار مرورگر.</p>
          ) : (
            <p className="mt-0.5 text-sm leading-6 text-muted-foreground">در سافاری دکمه‌ی <Share className="inline h-4 w-4 align-[-2px]" /> «اشتراک‌گذاری» را بزن و بعد <PlusSquare className="inline h-4 w-4 align-[-2px]" /> «افزودن به صفحه‌ی اصلی» را انتخاب کن.</p>
          )}
          {evt && <button onClick={install} className="tap mt-3 inline-flex items-center gap-2 rounded-2xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground"><Download className="h-4 w-4" />نصب اپ</button>}
        </div>
        <button onClick={dismiss} aria-label="بستن" className="tap grid h-8 w-8 shrink-0 place-items-center rounded-full text-muted-foreground"><X className="h-4 w-4" /></button>
      </div>
    </div>
  );
}

export default function PwaManager() {
  useServiceWorker();
  const { pathname } = useLocation();
  useEffect(() => { applyRobotsForPath(pathname); }, [pathname]);
  return <InstallPrompt />;
}
