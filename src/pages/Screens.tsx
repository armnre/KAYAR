import { Icon, Logo } from "../components/icons";
import { PhoneFrame, SectionHead, Stars, delay, useRevealOnScroll } from "../components/ui";
import { IMG, coaches, homeModules, notifications } from "../lib/data";

/* ---------- mini screens (mobile reference) ---------- */
function MiniHome() {
  return (
    <div className="flex h-full flex-col gap-3 p-3">
      <div className="flex items-center justify-between">
        <Logo size="sm" />
        <span className="flex items-center gap-1.5 text-muted">
          <Icon name="search" size={15} />
          <Icon name="bell" size={15} />
        </span>
      </div>
      <div className="relative h-40 overflow-hidden rounded-2xl border border-line">
        <img src={IMG.hero} alt="" width={300} height={200} className="h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0B0D10] to-transparent" />
        <p className="absolute inset-x-3 bottom-3 text-[0.8rem] font-extrabold leading-snug">
          فناوری، مربی، انگیزه.
          <br />
          <span className="text-neon">همه در یک پلتفرم.</span>
        </p>
      </div>
      <div className="grid grid-cols-4 gap-1.5">
        {homeModules.slice(0, 4).map((m) => (
          <span key={m.id} className="flex flex-col items-center gap-1 rounded-xl border border-line p-2 text-[0.58rem] font-bold text-muted">
            <Icon name={m.icon} size={15} className="text-neon" />
            {m.title}
          </span>
        ))}
      </div>
      <div className="rail">
        {coaches.slice(0, 4).map((c) => (
          <img key={c.id} src={c.image} alt="" width={70} height={90} loading="lazy" className="h-[90px] w-[70px] rounded-xl object-cover" />
        ))}
      </div>
    </div>
  );
}

function MiniCoaches() {
  return (
    <div className="flex h-full flex-col gap-3 p-3">
      <div className="flex items-center justify-between">
        <Icon name="arrowRight" size={16} className="text-muted" />
        <span className="text-[0.85rem] font-extrabold">مربیان</span>
        <span />
      </div>
      <div className="field !min-h-9">
        <Icon name="search" size={14} className="text-muted" />
        <span className="text-[0.7rem] text-muted">جستجوی مربی...</span>
      </div>
      <div className="flex gap-1.5">
        {["همه", "بدنسازی", "مردان", "زنان"].map((t, i) => (
          <span key={t} className={`chip !min-h-7 !px-2.5 !text-[0.62rem] ${i === 0 ? "chip-active" : ""}`}>
            {t}
          </span>
        ))}
      </div>
      <div className="flex flex-col gap-2">
        {coaches.slice(0, 4).map((c) => (
          <div key={c.id} className="flex items-center gap-2 rounded-xl border border-line p-2">
            <img src={c.image} alt="" width={44} height={44} loading="lazy" className="h-11 w-11 rounded-lg object-cover" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[0.72rem] font-extrabold">{c.name}</p>
              <p className="truncate text-[0.6rem] text-muted">{c.title}</p>
              <p className="num text-[0.6rem] text-neon">★ {c.rating.toLocaleString("fa-IR")}</p>
            </div>
            <Icon name="chevronLeft" size={14} className="text-muted" />
          </div>
        ))}
      </div>
    </div>
  );
}

function MiniBodyYar() {
  return (
    <div className="flex h-full flex-col gap-3 p-3">
      <div className="flex flex-col items-center gap-1.5 pt-2 text-center">
        <span className="inline-flex items-center gap-1.5">
          <span className="rounded bg-neon px-1.5 text-[0.55rem] font-black text-black">AI</span>
          <span className="text-[0.9rem] font-extrabold text-neon">BodyYar</span>
        </span>
        <p className="text-[0.85rem] font-extrabold leading-snug">دستیار هوشمند ورزشی شما</p>
        <p className="text-[0.6rem] leading-relaxed text-muted">
          با هوش مصنوعی برنامه تمرینی، تغذیه و ریکاوری شخصی‌سازی‌شده دریافت کنید
        </p>
      </div>
      <div className="relative h-32 overflow-hidden rounded-2xl border border-line bg-[#0B0E11]">
        <img src={IMG.brain} alt="" width={300} height={200} className="float-slow h-full w-full object-cover opacity-80" />
      </div>
      <div className="field !min-h-16 items-start !py-2">
        <span className="text-[0.65rem] text-muted">فقدش شما چیست؟ خلاصه‌ی اهداف، شرایط جسمانیه و...</span>
      </div>
      <div className="grid grid-cols-2 gap-1.5">
        {["کاهش وزن", "افزایش عضله", "برنامه تغذیه", "بهبود استقامت"].map((t) => (
          <span key={t} className="chip !min-h-8 !justify-center !text-[0.62rem]">
            {t}
          </span>
        ))}
      </div>
    </div>
  );
}

function MiniMorshed() {
  return (
    <div className="flex h-full flex-col gap-3 p-3">
      <div className="flex items-center justify-between">
        <Icon name="arrowRight" size={16} className="text-muted" />
        <span className="text-[0.85rem] font-extrabold">مرشد</span>
        <span />
      </div>
      <div className="flex gap-1.5">
        {["همه", "پادکست", "موزیک", "گیامت صوتی"].map((t, i) => (
          <span key={t} className={`chip !min-h-7 !px-2.5 !text-[0.62rem] ${i === 0 ? "chip-active" : ""}`}>
            {t}
          </span>
        ))}
      </div>
      <div className="relative h-36 overflow-hidden rounded-2xl border border-violet/40">
        <img src={IMG.morshed} alt="" width={300} height={200} loading="lazy" className="h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0B0D10] via-transparent to-transparent" />
        <span className="absolute right-3 top-3 rounded-md border border-violet-2/40 bg-black/50 px-1.5 text-[0.55rem] text-violet-2">
          پادکست
        </span>
        <div className="absolute inset-x-3 bottom-3 flex items-center justify-between">
          <div>
            <p className="text-[0.75rem] font-extrabold">قدرت ذهن ورزش</p>
            <p className="num text-[0.58rem] text-muted">اپیزود ۱۲ · ۳۸ دقیقه</p>
          </div>
          <span className="grid h-8 w-8 place-items-center rounded-full bg-violet text-white">
            <Icon name="play" size={13} className="fill-current" />
          </span>
        </div>
      </div>
      <p className="text-[0.72rem] font-extrabold">دسته‌بندی‌ها</p>
      <div className="grid grid-cols-2 gap-1.5">
        {[
          ["ذهن", IMG.morshed],
          ["انگیزه", IMG.admin],
          ["غصبئی", IMG.campaign],
          ["زندگی بهتر", IMG.hero],
        ].map(([t, src]) => (
          <span key={t} className="relative h-16 overflow-hidden rounded-xl border border-line">
            <img src={src} alt="" width={140} height={80} loading="lazy" className="h-full w-full object-cover opacity-70" />
            <span className="absolute inset-0 grid place-items-center text-[0.62rem] font-bold">{t}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

function MiniProfile() {
  return (
    <div className="flex h-full flex-col gap-3 p-3">
      <div className="flex items-center justify-between">
        <Icon name="arrowRight" size={16} className="text-muted" />
        <span className="text-[0.85rem] font-extrabold">پروفایل</span>
        <span />
      </div>
      <div className="flex items-center gap-2.5">
        <img src={IMG.coachMale} alt="" width={48} height={48} loading="lazy" className="h-12 w-12 rounded-full object-cover" />
        <div>
          <p className="text-[0.8rem] font-extrabold">علی محمدی</p>
          <p className="text-[0.6rem] text-muted">@ali_mohammadi</p>
        </div>
      </div>
      <div className="grid grid-cols-3 divide-x divide-x-reverse divide-line rounded-xl border border-line">
        {[
          ["فعالیت‌ها", "۲۴۶"],
          ["دنبال‌کنندگان", "۸۴"],
          ["دنبال‌کننده", "۱۹۶"],
        ].map(([k, v]) => (
          <span key={k} className="flex flex-col items-center gap-0.5 py-2">
            <span className="num text-[0.78rem] font-extrabold">{v}</span>
            <span className="text-[0.55rem] text-muted">{k}</span>
          </span>
        ))}
      </div>
      {[
        ["ویرایش پروفایل", "edit"],
        ["برنامه‌های من", "clipboard"],
        ["دستاوردها و مدال‌ها", "trophy"],
        ["تنظیمات", "settings"],
        ["پشتیبانی", "message"],
        ["خروج", "logout"],
      ].map(([l, i]) => (
        <span key={l} className="flex items-center justify-between rounded-xl border border-line px-3 py-2.5 text-[0.72rem] font-bold">
          {l}
          <Icon name={i as "edit"} size={14} className="text-muted" />
        </span>
      ))}
    </div>
  );
}

function MiniAuth() {
  return (
    <div className="relative flex h-full flex-col gap-3 p-4">
      <img src={IMG.admin} alt="" width={300} height={200} loading="lazy" className="absolute inset-0 h-1/2 w-full object-cover opacity-40" />
      <div className="relative flex flex-1 flex-col items-center gap-3">
        <div className="mt-6">
          <Logo size="lg" />
        </div>
        <p className="text-[0.95rem] font-extrabold text-white">به کایار خوش آمدید</p>
        <p className="text-center text-[0.6rem] text-muted">ورود سریع، رایگان و بدون تبلیغ</p>
        <div className="mt-4 flex w-full gap-2">
          <span className="chip chip-active flex-1 justify-center !text-[0.65rem]">ثبت‌نام</span>
          <span className="chip flex-1 justify-center !text-[0.65rem]">ورود</span>
        </div>
        <div className="field w-full">
          <Icon name="message" size={14} className="text-muted" />
          <span className="text-[0.65rem] text-muted">ایمیل یا شماره موبایل</span>
        </div>
        <div className="field w-full">
          <Icon name="shield" size={14} className="text-muted" />
          <span className="flex-1 text-[0.65rem] text-muted">رمز عبور</span>
        </div>
        <span className="btn btn-neon w-full !text-[0.7rem]">ورود</span>
        <span className="text-[0.6rem] text-muted">یا ورود با</span>
        <div className="flex w-full gap-2">
          <span className="btn btn-ghost flex-1 !min-h-9 !text-[0.65rem]">
            <Icon name="google" size={13} /> Google
          </span>
          <span className="btn btn-ghost flex-1 !min-h-9 !text-[0.65rem]">
            <Icon name="appleBrand" size={13} /> Apple
          </span>
        </div>
        <p className="mt-auto text-[0.6rem] text-muted">حساب کاربری ندارید؟ ثبت‌نام کنید</p>
      </div>
    </div>
  );
}

function MiniNotifications() {
  return (
    <div className="flex h-full flex-col gap-3 p-3">
      <div className="flex items-center justify-between">
        <Icon name="arrowRight" size={16} className="text-muted" />
        <span className="text-[0.85rem] font-extrabold">اعلان‌ها</span>
        <span />
      </div>
      <div className="flex gap-1.5">
        {["همه", "سیستم", "مربیان", "برنامه‌ها"].map((t, i) => (
          <span key={t} className={`chip !min-h-7 !px-2.5 !text-[0.62rem] ${i === 0 ? "chip-active" : ""}`}>
            {t}
          </span>
        ))}
      </div>
      <div className="flex flex-col gap-2">
        {notifications.map((n) => (
          <div key={n.id} className="flex items-start gap-2 rounded-xl border border-line p-2.5">
            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-violet/15 text-violet-2">
              <Icon name={n.icon} size={13} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[0.72rem] font-extrabold">{n.title}</p>
              <p className="truncate text-[0.6rem] text-muted">{n.desc}</p>
              <p className="text-[0.55rem] text-muted">{n.time}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function MiniCampaign() {
  return (
    <div className="flex h-full flex-col gap-3 p-3">
      <div className="flex items-center justify-between">
        <Icon name="arrowRight" size={16} className="text-muted" />
        <span className="text-[0.85rem] font-extrabold">حامیان و کمپین‌ها</span>
        <span />
      </div>
      <div className="relative h-32 overflow-hidden rounded-2xl border border-line">
        <img src={IMG.campaign} alt="" width={300} height={200} loading="lazy" className="h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0B0D10] to-transparent" />
        <div className="absolute inset-x-3 bottom-3">
          <p className="font-display text-[0.6rem] font-bold tracking-[0.2em] text-gold" dir="ltr">
            KAYAR × KAPOOSH
          </p>
          <p className="text-[0.78rem] font-extrabold">با هم برای حرکت بهتر</p>
        </div>
      </div>
      <p className="text-[0.72rem] font-extrabold">برندهای همکار</p>
      <div className="grid grid-cols-4 gap-1.5">
        {["KAPOOSH", "NIKE", "adidas", "..."].map((b) => (
          <span key={b} className="grid h-9 place-items-center rounded-lg border border-line font-display text-[0.5rem] font-bold text-white/60" dir="ltr">
            {b}
          </span>
        ))}
      </div>
      <p className="text-[0.72rem] font-extrabold">کمپین‌های فعال</p>
      <div className="rounded-xl border border-line p-2.5">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-[0.72rem] font-extrabold">چالش ۳۰ روزه سلامت</p>
            <p className="text-[0.58rem] text-muted">با ضریب گرم‌کردن و کوپن خرید</p>
          </div>
          <span className="rounded-md border border-gold/30 bg-gold/10 px-1.5 py-0.5 text-[0.55rem] font-bold text-gold">
            جایزه
          </span>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
          <span className="block h-full w-2/3 rounded-full bg-neon" />
        </div>
        <p className="mt-1.5 flex items-center gap-1 text-[0.58rem] text-neon">
          <Icon name="check" size={11} /> شدت انجام: ۶۷٪
        </p>
      </div>
      <span className="btn btn-neon w-full !min-h-9 !text-[0.68rem]">شرکت در کمپین</span>
    </div>
  );
}

/* ---------- page ---------- */
const gallery = [
  { no: "۰۲", title: "موبایل — صفحه اصلی", tab: "خانه", el: <MiniHome /> },
  { no: "۰۳", title: "مربیان", tab: "مربیان", el: <MiniCoaches /> },
  { no: "۰۵", title: "بدن‌یار", tab: "مربیان", el: <MiniBodyYar /> },
  { no: "۰۶", title: "مرشد", tab: "خانه", el: <MiniMorshed /> },
  { no: "۰۷", title: "حامیان و کمپین‌ها", tab: "جستجو", el: <MiniCampaign /> },
  { no: "۰۸", title: "پروفایل", tab: "پروفایل", el: <MiniProfile /> },
  { no: "۰۹", title: "ورود / ثبت‌نام", tab: "پروفایل", el: <MiniAuth /> },
  { no: "۱۰", title: "اعلان‌ها", tab: "خانه", el: <MiniNotifications /> },
];

export default function Screens() {
  useRevealOnScroll("screens");
  return (
    <div className="min-h-screen bg-base">
      <header className="glass sticky top-0 z-40 border-b border-line">
        <div className="mx-auto flex max-w-[1560px] items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-10">
          <a href="#/" className="btn btn-ghost !min-h-10 !text-[0.78rem]">
            <Icon name="arrowRight" size={16} />
            بازگشت
          </a>
          <Logo size="md" />
        </div>
      </header>

      <div id="main" className="mx-auto max-w-[1560px] px-4 py-10 sm:px-6 lg:px-10">
        <div className="reveal mb-10 flex flex-col items-center gap-4 text-center">
          <span className="tag border-neon/35 bg-neon/10 text-neon">KAYAR APP</span>
          <h1 className="text-[1.6rem] font-extrabold sm:text-[2.2rem]">
            صفحات اپلیکیشن <span className="text-neon">کایار</span>
          </h1>
          <p className="max-w-2xl text-[0.9rem] leading-[2] text-muted">
            مرجع بصری فاز ۰ — ساختار، ریتم و زبان طراحی نسخه موبایل. همین توکن‌ها و کامپوننت‌ها در
            فاز ۲ به عنوان کتابخانه طراحی محصول واقعی استفاده می‌شوند.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4">
          {gallery.map((g, i) => (
            <div key={g.no} style={delay(i % 4)} className="reveal">
              <PhoneFrame activeTab={g.tab} label={`${g.no} — ${g.title}`}>
                {g.el}
              </PhoneFrame>
            </div>
          ))}
        </div>

        <div className="reveal panel mt-14 flex flex-col items-center gap-4 p-8 text-center">
          <SectionHead title="آماده‌ای شروع کنی؟" />
          <div className="flex flex-wrap justify-center gap-3">
            <a href="#/coaches" className="btn btn-neon relative overflow-hidden px-6">
              <span className="sweep" />
              مشاهده مربیان
              <Icon name="arrowLeft" size={16} />
            </a>
            <a href="#/bodyyar" className="btn btn-ghost px-6">
              <Icon name="brain" size={16} />
              بدن‌یار
            </a>
          </div>
          <div className="mt-2 flex flex-col items-center gap-2">
            <Stars rating={5} size={16} />
            <p className="label-muted">امتیاز ۴.۹ از بیش از ۱۲٬۰۰۰ کاربر</p>
          </div>
        </div>
      </div>
    </div>
  );
}
