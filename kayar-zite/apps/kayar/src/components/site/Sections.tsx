import { Link } from 'react-router-dom';
import { ShoppingBag, KeyRound, QrCode, ArrowLeft } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@project/components/ui/accordion';
import { KButton, Glass, IconBox, KayarLogo } from '../kit';
import { defaultFaqs } from '../../lib/defaultFaqs';
import { usePosts, usePublicSettings, type PostCard } from '../../lib/publicData';
import { fa, faDate } from '../../lib/config';
import { useBlock } from '../../lib/cms';

const Divider = () => <div aria-hidden className="mx-auto h-px max-w-5xl bg-gradient-to-l from-transparent via-primary/40 to-transparent" />;

export function SectionHead({ eyebrow, title, accent, text, tone = 'text-primary' }: { eyebrow: string; title: string; accent: string; text?: string; tone?: string }) {
  return (
    <div className="reveal mx-auto mb-10 max-w-2xl text-center">
      <div className={`mb-2 font-latin text-sm font-bold tracking-[.2em] ${tone}`}>{eyebrow}</div>
      <h2 className="text-[clamp(1.75rem,4.5vw,3rem)] font-black">{title} <span className={tone}>{accent}</span></h2>
      {text && <p className="mt-3 text-[17px] leading-[1.8] text-muted-foreground">{text}</p>}
    </div>
  );
}

const STEP_ICONS = [ShoppingBag, KeyRound, QrCode];
export function Steps() {
  const b = useBlock('steps');
  const s = b.items.map((x, i) => ({ ...x, icon: STEP_ICONS[i % STEP_ICONS.length] }));
  return (
    <section id="how" className="relative scroll-mt-20 px-4 py-20 md:py-28">
      <SectionHead eyebrow="HOW IT WORKS" title={b.title} accent={b.accent} text={b.text} />
      <div className="mx-auto grid max-w-5xl gap-4 md:grid-cols-3">
        {s.map((x, i) => (
          <Glass key={i} className="reveal relative overflow-hidden p-6" style={{ transitionDelay: `${i * 90}ms` }}>
            <span className="absolute -top-4 end-3 font-latin text-[96px] font-black leading-none text-white/[.04]">{i + 1}</span>
            <IconBox icon={x.icon} className="h-14 w-14" />
            <div className="mt-5 text-sm font-bold text-primary">مرحله‌ی {fa(i + 1)}</div>
            <h3 className="mt-1 text-xl font-extrabold">{x.t}</h3>
            <p className="mt-2 text-muted-foreground">{x.d}</p>
          </Glass>
        ))}
      </div>
    </section>
  );
}

export { MorshedSection, BodyyarSection } from './Showcase';

export function BlogCards({ list }: { list: PostCard[] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {list.map((p, i) => (
        <Link key={p.slug} to={`/blog/${encodeURIComponent(p.slug)}`} className="glass press group overflow-hidden rounded-[28px]">
          <div className="relative aspect-[16/9] overflow-hidden" style={p.coverUrl ? undefined : { background: `radial-gradient(100% 100% at ${20 + i * 30}% 0%, hsl(${[71, 254, 188, 40][i % 4]} 80% 50% / .45), hsl(var(--bg-2)))` }}>
            {p.coverUrl && <img src={p.coverUrl} alt={p.coverAlt || p.title} loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />}
            {p.tags[0] && <span className="absolute bottom-3 start-3 rounded-full bg-black/50 px-3 py-1 text-xs font-bold backdrop-blur">{p.tags[0]}</span>}
          </div>
          <div className="p-5"><h3 className="text-lg font-extrabold leading-8 group-hover:text-primary">{p.title}</h3><p className="mt-2 line-clamp-2 text-muted-foreground">{p.excerpt}</p><div className="mt-3 text-[13px] text-muted-foreground">{faDate(p.publishedAt)}</div></div>
        </Link>
      ))}
    </div>
  );
}

/** Latest published posts for the landing page; renders nothing when there are none or on error. */
export function LatestPosts() {
  const { d, err } = usePosts({ page: 1, pageSize: 3 });
  if (err || (d && !d.posts.length)) return null;
  return (
    <section className="px-4 py-20">
      <SectionHead eyebrow="BLOG" title="تازه‌ها از" accent="وبلاگ" />
      <div className="mx-auto max-w-6xl">{d ? <BlogCards list={d.posts} /> : <div className="grid gap-4 sm:grid-cols-3">{[0, 1, 2].map((i) => <div key={i} className="skeleton aspect-[4/3] rounded-[28px]" />)}</div>}</div>
      <div className="mt-8 text-center"><KButton variant="outline" to="/blog">همه‌ی مطالب</KButton></div>
    </section>
  );
}

export function FAQ() {
  const b = useBlock('faq');
  const items = b.items.length ? b.items : defaultFaqs;
  return (
    <section className="px-4 py-20">
      <SectionHead eyebrow="FAQ" title="سؤال‌های" accent="پرتکرار" />
      <Accordion type="single" collapsible className="reveal mx-auto max-w-3xl space-y-3">
        {items.map((f, i) => (
          <AccordionItem key={i} value={`f${i}`} className="glass rounded-3xl border-0 px-5">
            <AccordionTrigger className="min-h-[56px] text-start text-[17px] font-bold hover:no-underline">{f.q}</AccordionTrigger>
            <AccordionContent className="text-base leading-8 text-muted-foreground">{f.a}</AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </section>
  );
}

export function FinalCTA() {
  const b = useBlock('cta');
  return (
    <section className="px-4 py-16">
      <div className="reveal relative mx-auto grid max-w-6xl items-end overflow-hidden rounded-[32px] bg-primary text-primary-foreground md:grid-cols-[1.2fr_1fr]">
        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'repeating-linear-gradient(-12deg, rgba(0,0,0,.3) 0 2px, transparent 2px 22px)' }} aria-hidden />
        <div className="relative p-8 md:p-14">
          <h2 className="text-[clamp(1.75rem,4.5vw,3.25rem)] font-black leading-tight">{b.title}</h2>
          <p className="mt-3 max-w-md text-[17px] font-medium leading-[1.8] opacity-80">{b.text}</p>
          <Link to="/app" className="press tap mt-6 inline-flex h-14 items-center gap-2 rounded-full bg-primary-foreground px-8 font-bold text-primary">ورود به کایار <ArrowLeft className="h-5 w-5" /></Link>
        </div>
        <img src="/media/kapoosh_cta_woman.jpg" alt="بانوی ورزشکار ایرانی با حجاب ورزشی و لباس تمرین کاپوش" width={1056} height={1408} loading="lazy" className="relative mx-auto h-80 w-auto object-cover md:h-[420px]" style={{ maskImage: 'radial-gradient(ellipse 55% 70% at 50% 45%, black 55%, transparent 100%)', WebkitMaskImage: 'radial-gradient(ellipse 55% 70% at 50% 45%, black 55%, transparent 100%)' }} />
      </div>
    </section>
  );
}

export function Footer() {
  const b = useBlock('footer');
  const st = usePublicSettings();
  return (
    <footer className="relative overflow-hidden border-t border-white/5 px-4 pb-[calc(32px+var(--safe-b))] pt-14">
      <div className="pointer-events-none absolute inset-x-0 bottom-[-4vw] select-none text-center font-latin text-[22vw] font-black leading-none text-white/[.03]" aria-hidden>KAYAR</div>
      <div className="relative mx-auto flex max-w-6xl flex-col gap-8 md:flex-row md:justify-between">
        <div><KayarLogo className="text-xl" /><p className="mt-3 max-w-xs text-muted-foreground">{b.tagline}</p></div>
        <nav className="grid grid-cols-2 gap-x-10 gap-y-1 text-[15px]" aria-label="پیوندهای فوتر">
          {([['/p/about', 'درباره'], ['/p/how', 'نحوه‌ی کار'], ['/p/faq', 'سؤالات متداول'], ['/p/contact', 'تماس با ما'], ['/p/terms', 'قوانین'], ['/p/privacy', 'حریم خصوصی'], ['/blog', 'وبلاگ'], ['/app', 'ورود به کایار'], ...(st?.instagram ? [[st.instagram, 'اینستاگرام']] : []), ...(st?.telegram ? [[st.telegram, 'تلگرام']] : [])] as string[][]).map(([h, l]) => h.startsWith('http') ? <a key={h} href={h} target="_blank" rel="noopener noreferrer" className="tap flex items-center text-muted-foreground hover:text-foreground">{l}</a> : <Link key={h} to={h} className="tap flex items-center text-muted-foreground hover:text-foreground">{l}</Link>)}
        </nav>
      </div>
      <div className="relative mx-auto mt-10 flex max-w-6xl flex-wrap justify-between gap-2 text-[13px] text-muted-foreground"><span>{b.copyright}</span>{(st?.supportPhone || st?.supportEmail) && <span dir="ltr">{[st.supportPhone, st.supportEmail].filter(Boolean).join(' · ')}</span>}</div>
    </footer>
  );
}

export { Divider };
