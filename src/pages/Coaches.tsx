import { useState } from "react";
import { ProductShell } from "../components/ProductShell";
import { CoachCard, FeaturedCoach } from "../components/cards";
import { Icon } from "../components/icons";
import { useRevealOnScroll, delay } from "../components/ui";
import { IMG, coaches } from "../lib/data";

const featureList = [
  { icon: "dumbbell" as const, label: "برنامه تمرینی اختصاصی" },
  { icon: "apple" as const, label: "مشاوره تغذیه" },
  { icon: "mic" as const, label: "پشتیبانی مداوم" },
  { icon: "chart" as const, label: "پیگیری پیشرفت" },
];

const tabs = ["همه مربیان", "زنان", "مردان"];

export default function Coaches() {
  const [tab, setTab] = useState(0);
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState("");
  const featured = coaches.find((c) => c.id === "amir-kazemi")!;
  const women = new Set(["sara-mohammadi", "negar-hosseini", "maryam-hosseini", "mahsa-karimi", "sahra-ladari", "sara-karimi"]);
  const list = coaches.filter((c) => {
    if (c.id === "amir-kazemi") return false;
    if (tab === 1 && !women.has(c.id)) return false;
    if (tab === 2 && women.has(c.id)) return false;
    const q = query.trim();
    if (!q) return true;
    return c.name.includes(q) || c.title.includes(q) || c.specialties.some((s) => s.includes(q));
  });
  useRevealOnScroll(tab + page);

  return (
    <ProductShell active="coaches" search="جستجوی مربی...">
      {/* ============ HERO BANNER ============ */}
      <section className="panel noise relative mb-5 overflow-hidden">
        <div className="relative flex flex-col lg:h-[300px] lg:flex-row lg:items-center">
          {/* features — right in RTL */}
          <ul className="order-1 grid grid-cols-2 gap-3 p-5 lg:grid-cols-1 lg:w-[230px] lg:shrink-0 lg:gap-5 lg:p-7">
            {featureList.map((f) => (
              <li key={f.label} className="flex items-center justify-between gap-2 lg:flex-row-reverse">
                <span className="text-[0.76rem] font-semibold text-white/80 lg:text-[0.8rem]">{f.label}</span>
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-neon/35 bg-neon/8 text-neon">
                  <Icon name={f.icon} size={15} />
                </span>
              </li>
            ))}
          </ul>

          {/* image */}
          <div className="relative order-2 min-h-[190px] flex-1">
            <img
              src={IMG.hero}
              alt="مربی حرفه‌ای کایار"
              width={1000}
              height={600}
              loading="lazy"
              className="absolute inset-0 h-full w-full object-cover object-[60%_25%]"
            />
            <div className="absolute inset-0 bg-gradient-to-l from-[#101317]/10 via-[#101317]/45 to-[#101317]" />
            <div className="shards opacity-70" />
          </div>

          {/* copy — left in RTL */}
          <div className="relative order-3 flex flex-col items-start gap-4 p-6 lg:w-[420px] lg:shrink-0 lg:p-8">
            <span className="tag border-neon/35 bg-neon/10 text-neon">
              <Icon name="dumbbell" size={13} />
              مربیان حرفه‌ای
            </span>
            <h1 className="text-[1.5rem] font-extrabold leading-[1.35] sm:text-[1.9rem]">
              مربی مناسب خود <span className="text-neon">را پیدا کن</span>
            </h1>
            <p className="text-[0.86rem] leading-[1.95] text-muted">
              مربیان متخصص و تاییدشده کایار را بیابید؛ برنامه‌های تمرینی شخصی‌سازی‌شده، تحت نظر مربیان
              حرفه‌ای، برای رسیدن به بهترین نسخه‌ی خودت.
            </p>
            <a href="#/coach/ali-rezaei" className="btn btn-neon relative overflow-hidden px-5">
              <span className="sweep" />
              مشاهده همه مربیان
              <Icon name="arrowLeft" size={16} />
            </a>
          </div>
        </div>
      </section>

      <div className="flex flex-col gap-5 xl:flex-row-reverse xl:items-start">
        {/* ============ FEATURED COACH (right rail on desktop) ============ */}
        <div className="reveal xl:w-[320px] xl:shrink-0">
          <FeaturedCoach coach={featured} />
        </div>

        {/* ============ LIST ============ */}
        <div className="min-w-0 flex-1">
          {/* filters */}
          <div className="panel mb-5 flex flex-col gap-3 p-3 lg:flex-row lg:items-center">
            <label className="field order-1 flex-1 lg:order-none">
              <Icon name="search" size={16} className="text-muted" />
              <input
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setPage(1);
                }}
                className="w-full bg-transparent text-[0.85rem] placeholder:text-muted focus:outline-none"
                placeholder="جستجوی نام مربی..."
                aria-label="جستجوی نام مربی"
              />
            </label>
            <div className="order-2 flex items-center gap-2 lg:order-none">
              <button className="chip min-w-0 flex-1 justify-between whitespace-nowrap lg:flex-none lg:min-w-[150px]">
                <span className="truncate">همه تخصص‌ها</span>
                <Icon name="chevronDown" size={14} />
              </button>
              <div className="flex flex-1 flex-wrap items-center gap-1.5">
                {tabs.map((t, i) => (
                  <button
                    key={t}
                    onClick={() => setTab(i)}
                    aria-pressed={tab === i}
                    className={`chip min-w-0 flex-1 justify-center whitespace-nowrap lg:flex-none ${tab === i ? "chip-active" : ""}`}
                  >
                    {t}
                  </button>
                ))}
              </div>
              <button className="chip !min-h-9 !px-2.5" aria-label="مرتب‌سازی">
                <Icon name="sliders" size={15} />
                <span className="hidden sm:inline">مرتب‌سازی</span>
                <Icon name="chevronDown" size={13} />
              </button>
            </div>
          </div>

          {/* cards */}
          {list.length === 0 && (
            <div className="panel flex flex-col items-center gap-3 p-10 text-center">
              <Icon name="search" size={26} className="text-muted" />
              <p className="t-h3">مربی‌ای با این فیلتر پیدا نشد</p>
              <p className="t-body-sm text-muted">نام یا تخصص دیگری را امتحان کنید.</p>
              <button type="button" className="btn btn-ghost !min-h-9 !text-[0.78rem]" onClick={() => { setQuery(""); setTab(0); }}>
                پاک کردن فیلترها
              </button>
            </div>
          )}

          {list.length > 0 && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {list.map((c, i) => (
              <div key={c.id} style={delay(i % 6)} className="reveal">
                <CoachCard coach={c} />
              </div>
            ))}
          </div>
          )}

          {/* pagination */}
          <nav aria-label="صفحه‌بندی" className="mt-6 flex items-center justify-center gap-1.5">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="grid h-9 w-9 place-items-center rounded-lg border border-line text-muted transition hover:border-neon/40 hover:text-neon"
              aria-label="قبلی"
            >
              <Icon name="chevronRight" size={15} />
            </button>
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                onClick={() => setPage(n)}
                aria-current={page === n ? "page" : undefined}
                className={`num grid h-9 w-9 place-items-center rounded-lg border text-[0.82rem] font-bold transition ${
                  page === n
                    ? "border-transparent bg-neon text-black"
                    : "border-line text-muted hover:border-neon/40 hover:text-neon"
                }`}
              >
                {n.toLocaleString("fa-IR")}
              </button>
            ))}
            <button
              onClick={() => setPage((p) => Math.min(5, p + 1))}
              className="grid h-9 w-9 place-items-center rounded-lg border border-line text-muted transition hover:border-neon/40 hover:text-neon"
              aria-label="بعدی"
            >
              <Icon name="chevronLeft" size={15} />
            </button>
          </nav>
        </div>
      </div>
    </ProductShell>
  );
}
