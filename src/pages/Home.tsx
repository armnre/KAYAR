import { Icon, Logo } from "../components/icons";
import { ToneIcon, delay } from "../components/ui";
import { IMG, brandLogos, homeModules } from "../lib/data";

const nav = [
  { label: "خانه", href: "#/" },
  { label: "مربیان", href: "#/coaches" },
  { label: "بدن‌یار", href: "#/bodyyar" },
  { label: "مرشد", href: "#/screens" },
  { label: "کمپین‌ها", href: "#/campaigns" },
  { label: "درباره ما", href: "#/screens" },
];

function PublicHeader() {
  return (
    <header className="glass sticky top-0 z-40 border-b border-line">
      <div className="mx-auto flex max-w-[1560px] items-center justify-between gap-6 px-4 py-3 sm:px-6 lg:px-10">
        {/* avatar / bell / search — right side in RTL */}
        <div className="flex items-center gap-1.5">
          <img
            src={IMG.coachMale}
            alt="حساب کاربری"
            width={34}
            height={34}
            className="h-[34px] w-[34px] rounded-full object-cover ring-1 ring-line-2 transition hover:ring-neon/60"
          />
          <button className="relative rounded-xl p-2 text-muted transition hover:bg-white/5 hover:text-white" aria-label="اعلان‌ها">
            <Icon name="bell" size={19} />
            <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-neon" />
          </button>
          <button className="rounded-xl p-2 text-muted transition hover:bg-white/5 hover:text-white" aria-label="جستجو">
            <Icon name="search" size={19} />
          </button>
        </div>

        <nav aria-label="ناوبری سایت" className="hidden lg:block">
          <ul className="flex items-center gap-8">
            {nav.map((n, i) => (
              <li key={n.label}>
                <a
                  href={n.href}
                  aria-current={i === 0 ? "page" : undefined}
                  className={`relative py-1 text-[0.88rem] font-semibold transition hover:text-white ${
                    i === 0 ? "text-white" : "text-muted"
                  }`}
                >
                  {n.label}
                  {i === 0 && (
                    <span className="absolute -bottom-1.5 right-0 h-[2px] w-full rounded-full bg-neon" />
                  )}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex items-center gap-3">
          <a href="#/login" className="btn btn-neon !min-h-10 !px-4 !text-[0.8rem]">
            ورود / ثبت‌نام
          </a>
          <a href="#/" aria-label="کایار — صفحه اصلی">
            <Logo size="lg" />
          </a>
        </div>
      </div>
    </header>
  );
}

function PublicFooter() {
  return (
    <footer className="border-t border-line bg-[#0A0D10]">
      <div className="mx-auto grid max-w-[1560px] gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[auto_1fr_auto] lg:items-center lg:px-10">
        <div className="flex items-center gap-5">
          <Logo size="md" tagline />
        </div>

        <ul className="flex flex-wrap items-center gap-x-6 gap-y-3 text-[0.82rem] text-muted lg:justify-center">
          {[
            ["جامعه پند", "layers"],
            ["ورزش", "dumbbell"],
            ["تکنولوژی", "bolt"],
            ["همراه با KAPOOSH", "globe"],
          ].map(([label, icon]) => (
            <li key={label}>
              <a href="#/" className="inline-flex items-center gap-2 transition hover:text-neon">
                <Icon name={icon as "layers"} size={16} />
                {label}
              </a>
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-5 lg:justify-start">
          <div className="flex items-center gap-3 text-muted">
            {(["send", "camera", "share"] as const).map((n) => (
              <a
                key={n}
                href="#/"
                aria-label={n}
                className="grid h-9 w-9 place-items-center rounded-full border border-line transition hover:border-neon/50 hover:text-neon"
              >
                <Icon name={n} size={16} />
              </a>
            ))}
          </div>
          <span className="text-[0.78rem] font-bold text-white">بهتر از دیروز</span>
        </div>
      </div>
      <div className="border-t border-line px-4 py-4 text-center text-[0.7rem] text-muted sm:px-6">
        © ۱۴۰۵ کایار — تمام حقوق محفوظ است · ساخته‌شده با عشق به ورزش
      </div>
    </footer>
  );
}

export default function Home() {
  return (
    <div className="min-h-screen bg-base">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:right-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-neon focus:px-4 focus:py-2 focus:text-black"
      >
        رفتن به محتوای اصلی
      </a>
      <PublicHeader />

      {/* ================= HERO ================= */}
      <section className="relative overflow-hidden border-b border-line">
        <div className="absolute inset-0">
          <img
            src={IMG.hero}
            alt="ورزشکار حرفه‌ای در حال تمرین"
            width={1600}
            height={900}
            className="h-full w-full object-cover object-[65%_center]"
            fetchPriority="high"
          />
          <div className="absolute inset-0 bg-[radial-gradient(120%_120%_at_75%_35%,transparent_5%,#08090B_70%)]" />
          <div className="absolute inset-0 bg-gradient-to-l from-transparent via-[#08090B]/55 to-[#08090B]" />
          <div className="shards" />
        </div>

        <div className="relative mx-auto grid max-w-[1560px] gap-10 px-4 pb-16 pt-12 sm:px-6 lg:grid-cols-[1fr_auto] lg:px-10 lg:pb-24 lg:pt-20">
          {/* copy */}
          <div className="flex flex-col items-start gap-5 lg:items-end lg:text-right">
            <p className="num text-[0.72rem] font-bold tracking-[0.3em] text-neon">KAYAR / کایار</p>
            <h1 className="text-[2rem] font-extrabold leading-[1.25] sm:text-[2.6rem] lg:text-[3.25rem]">
              فناوری، مربی، انگیزه.
              <span className="mt-1 block text-neon">همه در یک پلتفرم.</span>
            </h1>
            <p className="max-w-xl text-[0.95rem] leading-[2] text-white/75 sm:text-base">
              کایار، سوپر اپ ورزشی شماست. از مربیان حرفه‌ای تا هوش مصنوعی بدنیار از محتوای اختصاصی
              مرشد تا فرصت‌های حمایت مالی و برندها — تجربه‌ای یکپارچه برای رسیدن به بهترین نسخه‌ی خودت.
            </p>
            <div className="mt-2 flex w-full flex-wrap items-center gap-3 sm:w-auto">
              <a href="#/login" className="btn btn-neon relative w-full overflow-hidden px-6 sm:w-auto">
                <span className="sweep" />
                شروع کن
                <Icon name="arrowLeft" size={17} />
              </a>
              <a href="#/screens" className="btn btn-ghost w-full px-6 sm:w-auto">
                <Icon name="play" size={15} className="fill-current" />
                معرفی کایار
              </a>
            </div>
          </div>

          {/* progress rail */}
          <ol className="order-first hidden flex-col gap-4 lg:order-none lg:pt-4" aria-hidden="true">
            {["۰۱", "۰۲", "۰۳"].map((n, i) => (
              <li key={n} className="flex items-center gap-3 text-[0.7rem] font-bold tracking-widest">
                <span className={i === 0 ? "text-neon" : "text-white/25"}>{n}</span>
                <span className={`h-px w-10 ${i === 0 ? "bg-neon" : "bg-white/15"}`} />
              </li>
            ))}
          </ol>
        </div>

        <p className="absolute bottom-24 hidden text-[0.72rem] leading-relaxed text-white/45 lg:right-10 lg:block">
          فراتر از ورزش،
          <br />
          یک سبک زندگی
        </p>
      </section>

      {/* ================= MODULES ================= */}
      <section id="main" className="relative mx-auto max-w-[1560px] px-4 sm:px-6 lg:px-10">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {homeModules.map((m, i) => (
            <a
              key={m.id}
              href={m.id === "coaches" ? "#/coaches" : m.id === "bodyyar" ? "#/bodyyar" : "#/screens"}
              style={delay(i)}
              className="reveal panel card-hover group relative flex flex-col gap-3 overflow-hidden p-5"
            >
              <ToneIcon name={m.icon} tone={m.tone} size={22} />
              <h3 className="text-[1.05rem] font-extrabold">{m.title}</h3>
              <p className="text-[0.82rem] leading-relaxed text-muted">{m.desc}</p>
              <span className="mt-2 inline-flex items-center gap-1 text-[0.78rem] font-bold text-neon transition-all group-hover:gap-2">
                مشاهده بیشتر
                <Icon name="chevronLeft" size={15} />
              </span>
              <span className="pointer-events-none absolute -bottom-10 -left-10 h-24 w-24 rounded-full bg-neon/10 blur-2xl transition group-hover:bg-neon/20" />
            </a>
          ))}
        </div>
      </section>

      {/* ================= ABOUT / STATS ================= */}
      <section className="relative mt-16 overflow-hidden border-y border-line bg-[#0A0D10] py-14 lg:mt-24 lg:py-20">
        <div className="mx-auto grid max-w-[1560px] items-center gap-10 px-4 sm:px-6 lg:grid-cols-[1.05fr_1fr] lg:px-10">
          <div className="reveal flex flex-col gap-5">
            <p className="text-[0.72rem] font-bold tracking-[0.25em] text-neon">درباره کایار —</p>
            <h2 className="text-[1.6rem] font-extrabold leading-[1.45] sm:text-[2rem]">
              بیش از یک اپ ورزشی،
              <br />
              یک اکوسیستم کامل.
            </h2>
            <p className="max-w-lg text-[0.92rem] leading-[2] text-muted">
              کایار با فعالیت از برند کپوش، تکنولوژی، توان، نوآوری و سبک زندگی ورزشی است. اینجا جایی
              است که ورزش، تکنولوژی و جامعه‌ای از افراد باانگیزه به هم می‌رسند.
            </p>
            <div className="mt-2 grid grid-cols-2 gap-x-6 gap-y-6 sm:grid-cols-2 lg:max-w-md">
              {[
                { v: "۸۵۰+", l: "مربی حرفه‌ای" },
                { v: "۳۵۰ هزار", l: "کاربر فعال" },
                { v: "۳۰۰+", l: "محتوای اختصاصی" },
                { v: "۵", l: "برند همکار" },
              ].map((s, i) => (
                <div key={s.l} style={delay(i)} className="reveal">
                  <p className="num text-[1.5rem] font-extrabold text-neon">{s.v}</p>
                  <p className="label-muted mt-1">{s.l}</p>
                </div>
              ))}
            </div>
            <a href="#/screens" className="btn btn-neon relative mt-4 w-fit overflow-hidden px-6">
              <span className="sweep" />
              اطلاعات بیشتر
              <Icon name="arrowLeft" size={16} />
            </a>
          </div>

          <div className="reveal relative min-h-[300px] overflow-hidden rounded-[24px] border border-line">
            <img
              src={IMG.admin}
              alt="ورزشکار در حال دویدن با افکت نئون"
              width={900}
              height={700}
              loading="lazy"
              className="h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-l from-transparent to-[#0A0D10]/70" />
            <div className="absolute inset-y-0 right-0 flex flex-col justify-center gap-3 pr-6">
              {["TRAIN", "LEARN", "CONNECT", "GROW"].map((w) => (
                <span
                  key={w}
                  className="font-display text-[0.72rem] font-bold tracking-[0.35em] text-white/55"
                  dir="ltr"
                >
                  {w}
                </span>
              ))}
              <span className="mt-2 h-[2px] w-10 bg-neon" />
            </div>
            <div className="absolute bottom-6 left-6 flex flex-col items-start gap-2">
              <Logo size="lg" tagline />
            </div>
          </div>
        </div>
      </section>

      {/* ================= BRANDS + APP CTA ================= */}
      <section className="mx-auto max-w-[1560px] px-4 py-12 sm:px-6 lg:px-10">
        <div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-center">
          <div className="reveal flex flex-wrap items-center gap-x-8 gap-y-4">
            <span className="text-[0.78rem] text-muted">همراه با</span>
            {brandLogos.map((b) => (
              <span
                key={b}
                dir="ltr"
                className="font-display text-[0.82rem] font-bold tracking-[0.22em] text-white/35 transition hover:text-white/80"
              >
                {b}
              </span>
            ))}
          </div>
          <div className="reveal flex flex-wrap gap-3">
            <a href="#/coaches" className="btn btn-neon">
              ورود به مربیان
              <Icon name="arrowLeft" size={16} />
            </a>
            <a href="#/manage" className="btn btn-ghost">
              <Icon name="users" size={16} />
              مدیریت مربیان
            </a>
            <a href="#/admin" className="btn btn-ghost">
              <Icon name="shield" size={16} />
              پنل مدیریت
            </a>
          </div>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
