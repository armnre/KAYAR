import { useParams, Link } from 'react-router-dom';
import { FileQuestion, Music2, Dumbbell, Sparkles, ShieldCheck, Mail, Phone, MessageCircle, Instagram, Send, QrCode, KeyRound, ShoppingBag, ArrowLeft, Check } from 'lucide-react';
import SiteHeader, { useMeta } from '../components/site/SiteHeader';
import { FAQ, Footer } from '../components/site/Sections';
import { KButton, StateView } from '../components/kit';
import { usePublicSettings } from '../lib/publicData';

import { PAGES } from '../lib/staticPages';

function About() {
  const f = [{ i: Music2, t: 'مرشد', d: 'موسیقی کامل و پادکست‌های مفید برای هر تمرین' }, { i: Dumbbell, t: 'بدن‌یار', d: 'برنامه‌ی تمرین و تغذیه‌ی شخصی با هوش مصنوعی' }, { i: Sparkles, t: 'پیشنهادات کایار', d: 'کمپین‌ها، رویدادها و تخفیف‌های ویژه‌ی اعضا' }, { i: ShieldCheck, t: 'حریم خصوصی', d: 'بدون ردیاب تبلیغاتی و فروش داده' }];
  return <div className="mt-10 grid gap-3 sm:grid-cols-2">{f.map(({ i: I, t, d }) => <div key={t} className="glass rounded-[28px] p-5"><span className="grid h-12 w-12 place-items-center rounded-2xl bg-primary/15 text-primary"><I className="h-6 w-6" /></span><div className="mt-3 text-lg font-black">{t}</div><p className="mt-1 text-muted-foreground">{d}</p></div>)}</div>;
}

function How() {
  const s = [{ i: ShoppingBag, t: 'از کاپوش خرید کن', d: 'همراه سفارشت یک کارت کایار با نام کاربری و رمز دریافت می‌کنی.' }, { i: QrCode, t: 'QR را اسکن کن', d: 'کایار را در مرورگر باز کن و به صفحه‌ی اصلی گوشی اضافه کن.' }, { i: KeyRound, t: 'وارد شو و شروع کن', d: 'رمزت را عوض کن، پروفایل ورزشی را بساز و اولین برنامه‌ات آماده است.' }];
  return <ol className="mt-10 space-y-3">{s.map(({ i: I, t, d }, k) => <li key={t} className="glass flex gap-4 rounded-[28px] p-5"><span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-primary font-black text-primary-foreground">{(k + 1).toLocaleString('fa-IR')}</span><div><div className="flex items-center gap-2 text-lg font-black"><I className="h-5 w-5 text-primary" />{t}</div><p className="mt-1 text-muted-foreground">{d}</p></div></li>)}</ol>;
}

function Contact() {
  const st = usePublicSettings();
  const items = [
    st?.supportPhone && { i: Phone, l: 'تلفن پشتیبانی', v: st.supportPhone, h: `tel:${st.supportPhone}` },
    st?.supportWhatsapp && { i: MessageCircle, l: 'واتساپ', v: st.supportWhatsapp, h: `https://wa.me/${st.supportWhatsapp.replace(/\D/g, '')}` },
    st?.supportEmail && { i: Mail, l: 'ایمیل', v: st.supportEmail, h: `mailto:${st.supportEmail}` },
    st?.instagram && { i: Instagram, l: 'اینستاگرام', v: 'کایار در اینستاگرام', h: st.instagram },
    st?.telegram && { i: Send, l: 'تلگرام', v: 'کانال کایار', h: st.telegram },
  ].filter(Boolean) as { i: typeof Phone; l: string; v: string; h: string }[];
  if (!st) return <div className="skeleton mt-10 h-40 rounded-[28px]" />;
  if (!items.length) return <p className="glass mt-10 rounded-[28px] p-6 text-muted-foreground">راه‌های ارتباطی به‌زودی از پنل مدیریت اضافه می‌شود. اگر عضو هستی، از داخل اپ پیام بده.</p>;
  return <div className="mt-10 grid gap-3 sm:grid-cols-2">{items.map(({ i: I, l, v, h }) => <a key={l} href={h} target={h.startsWith('http') ? '_blank' : undefined} rel="noopener noreferrer" className="glass press flex items-center gap-4 rounded-[28px] p-5"><span className="grid h-12 w-12 place-items-center rounded-2xl bg-primary/15 text-primary"><I className="h-6 w-6" /></span><div className="min-w-0"><div className="text-sm text-muted-foreground">{l}</div><div className="truncate font-black" dir="ltr">{v}</div></div><ArrowLeft className="ms-auto h-5 w-5 text-muted-foreground" /></a>)}</div>;
}

export function StaticPage() {
  const { slug = '' } = useParams();
  const p = PAGES[slug];
  useMeta(p?.t ?? 'صفحه پیدا نشد', p?.lead ?? '');
  return (
    <div className="min-h-svh depth-bg">
      <SiteHeader />
      <main className="mx-auto max-w-[760px] px-4 pb-20 pt-[calc(var(--header-h)+var(--safe-t)+48px)]">
        {!p ? <StateView icon={FileQuestion} title="صفحه پیدا نشد" action={<KButton to="/">صفحه‌ی اصلی</KButton>} /> : <>
          <div className="font-latin text-sm font-bold tracking-[.25em] text-primary">{p.eyebrow}</div>
          <h1 className="mt-2 text-[clamp(2rem,5vw,3.25rem)] font-black leading-tight">{p.t}</h1>
          <p className="mt-4 text-[18px] leading-[2] text-muted-foreground">{p.lead}</p>
          {p.kind === 'about' && <About />}{p.kind === 'how' && <How />}{p.kind === 'contact' && <Contact />}
          {p.secs?.map((s) => <section key={s.h} className="mt-10"><h2 className="text-xl font-black">{s.h}</h2>{s.p && <p className="mt-3 leading-[2] text-muted-foreground">{s.p}</p>}
            {s.list && <ul className="mt-3 space-y-2">{s.list.map((x) => <li key={x} className="flex gap-2 text-muted-foreground"><Check className="mt-1 h-4 w-4 shrink-0 text-primary" />{x}</li>)}</ul>}</section>)}
          {p.kind !== 'faq' && <div className="glass mt-14 flex flex-wrap items-center justify-between gap-4 rounded-[32px] p-6"><div><div className="text-lg font-black">آماده‌ای شروع کنی؟</div><p className="text-muted-foreground">با حساب کایارت وارد شو.</p></div><KButton to="/app">ورود به کایار <ArrowLeft className="h-5 w-5" /></KButton></div>}
          <nav className="mt-10 flex flex-wrap gap-2 text-sm">{Object.entries(PAGES).filter(([k]) => k !== slug).map(([k, v]) => <Link key={k} to={`/p/${k}`} className="rounded-full border border-white/10 px-4 py-2 text-muted-foreground hover:text-foreground">{v.t}</Link>)}</nav>
        </>}
      </main>
      {p?.kind === 'faq' && <FAQ />}
      <Footer />
    </div>
  );
}
