// Brand + SEO head tags, injected at startup so they work on Zite and on Liara.
const TITLE = 'کایار | KAYAR — تمرین، تغذیه و موسیقی ورزشی';
const DESC = 'کایار، همراه ورزشکاران کاپوش: برنامه تمرینی و تغذیه هوشمند بدن‌یار، موسیقی و پادکست ورزشی مرشد و پیشنهادات ویژه.';

function upsert(selector: string, tag: 'meta' | 'link', attrs: Record<string, string>) {
  let el = document.head.querySelector(selector) as HTMLElement | null;
  if (!el) { el = document.createElement(tag); document.head.appendChild(el); }
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
}

export function applyHeadTags() {
  const origin = window.location.origin;
  if (!document.title || document.title === 'Zite App') document.title = TITLE;
  upsert('meta[name="viewport"]', 'meta', { name: 'viewport', content: 'width=device-width, initial-scale=1, viewport-fit=cover' });
  upsert('meta[name="description"]', 'meta', { name: 'description', content: DESC });
  upsert('meta[name="theme-color"]', 'meta', { name: 'theme-color', content: '#0A0C0E' });
  upsert('meta[name="color-scheme"]', 'meta', { name: 'color-scheme', content: 'dark' });
  upsert('meta[name="apple-mobile-web-app-capable"]', 'meta', { name: 'apple-mobile-web-app-capable', content: 'yes' });
  upsert('meta[name="mobile-web-app-capable"]', 'meta', { name: 'mobile-web-app-capable', content: 'yes' });
  upsert('meta[name="apple-mobile-web-app-status-bar-style"]', 'meta', { name: 'apple-mobile-web-app-status-bar-style', content: 'black-translucent' });
  upsert('meta[name="apple-mobile-web-app-title"]', 'meta', { name: 'apple-mobile-web-app-title', content: 'KAYAR' });
  upsert('meta[property="og:type"]', 'meta', { property: 'og:type', content: 'website' });
  upsert('meta[property="og:site_name"]', 'meta', { property: 'og:site_name', content: 'KAYAR' });
  upsert('meta[property="og:locale"]', 'meta', { property: 'og:locale', content: 'fa_IR' });
  upsert('meta[property="og:title"]', 'meta', { property: 'og:title', content: TITLE });
  upsert('meta[property="og:description"]', 'meta', { property: 'og:description', content: DESC });
  upsert('meta[property="og:image"]', 'meta', { property: 'og:image', content: `${origin}/og.png` });
  upsert('meta[name="twitter:card"]', 'meta', { name: 'twitter:card', content: 'summary_large_image' });
  upsert('link[rel="icon"][type="image/svg+xml"]', 'link', { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' });
  upsert('link[rel="icon"][sizes="32x32"]', 'link', { rel: 'icon', type: 'image/png', sizes: '32x32', href: '/favicon-32.png' });
  upsert('link[rel="apple-touch-icon"]', 'link', { rel: 'apple-touch-icon', href: '/apple-touch-icon.png' });
  upsert('link[rel="manifest"]', 'link', { rel: 'manifest', href: '/manifest.webmanifest' });
  upsert('link[rel="canonical"]', 'link', { rel: 'canonical', href: origin + window.location.pathname });
  if (!document.getElementById('ld-org')) {
    const s = document.createElement('script');
    s.type = 'application/ld+json'; s.id = 'ld-org';
    s.textContent = JSON.stringify({
      '@context': 'https://schema.org',
      '@graph': [
        { '@type': 'Organization', name: 'KAYAR کایار', url: origin, logo: `${origin}/icon-512.png` },
        { '@type': 'WebSite', name: 'کایار', url: origin, inLanguage: 'fa-IR' },
      ],
    });
    document.head.appendChild(s);
  }
}

/** Keeps private areas (app, admin) out of search results; call on every route change. */
export function applyRobotsForPath(pathname: string) {
  const priv = pathname.startsWith('/app') || pathname.startsWith('/admin');
  if (priv) upsert('meta[name="robots"]', 'meta', { name: 'robots', content: 'noindex, nofollow' });
}
