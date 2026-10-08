import { useState } from "react";
import { ProductShell } from "../components/ProductShell";
import { useKayar } from "../app/store";
import { ProgramCard } from "../components/cards";
import { Icon } from "../components/icons";
import { Stars, StatusDot, delay, useRevealOnScroll } from "../components/ui";
import { IMG, coaches, programs } from "../lib/data";

const tags = [
  { icon: "dumbbell" as const, label: "بدنسازی" },
  { icon: "apple" as const, label: "کاهش وزن" },
  { icon: "target" as const, label: "تقویت ورزشی" },
  { icon: "bolt" as const, label: "افزایش انفجار" },
];

const aboutFeatures = [
  { icon: "apple" as const, label: "مشاوره تغذیه" },
  { icon: "chart" as const, label: "برنامه شخصی‌سازی شده" },
  { icon: "settings" as const, label: "پیگیری پیشرفت" },
  { icon: "clipboard" as const, label: "پشتیبانی مداوم" },
];

const detailRows = [
  { icon: "calendar" as const, k: "تجربه", v: "۸+ سال" },
  { icon: "pin" as const, k: "محل فعالیت", v: "تهران" },
  { icon: "graduation" as const, k: "تحصیلات", v: "کارشناسی تربیت بدنی" },
  { icon: "globe" as const, k: "زبان‌ها", v: "فارسی، انگلیسی" },
];

const tabs = ["درباره من", "برنامه‌های تمرینی", "ویدئوها", "نظرات کاربران"];

export default function CoachProfile() {
  const [tab, setTab] = useState(0);
  const [day, setDay] = useState("دوشنبه");
  const [time, setTime] = useState("۱۸:۰۰");
  const [note, setNote] = useState("");
  const [sent, setSent] = useState(false);
  const k = useKayar();
  const id = window.location.hash.split("/coach/")[1]?.split("?")[0] || "ali-rezaei";
  const coach = coaches.find((c) => c.id === id) ?? coaches[0];
  const loved = k.user ? (k.state.favorites[k.user.id] ?? []).includes(coach.id) : false;
  useRevealOnScroll(tab);

  const playerUp = !!k.state.play.trackId;
  return (
    <ProductShell active="coaches" search="جستجو در مربیان...">
      {/* sticky mobile CTA */}
      <div
        className={`fixed inset-x-3 z-30 flex gap-2 transition-all duration-300 lg:hidden ${
          playerUp ? "bottom-[112px]" : "bottom-[76px]"
        }`}
      >
        <button
          type="button"
          className="btn btn-ghost glass flex-1 !border-line-2 !bg-surface/90"
          onClick={() => k.toggleFav(coach.id)}
        >
          <Icon name="heart" size={16} className={loved ? "fill-neon" : ""} />
          {loved ? "ذخیره شد" : "ذخیره"}
        </button>
        <button
          type="button"
          className="btn btn-neon glass flex-[1.6] overflow-hidden"
          onClick={() => document.getElementById("book")?.scrollIntoView({ behavior: "smooth", block: "center" })}
        >
          <span className="sweep" />
          درخواست جلسه
          <Icon name="calendar" size={15} />
        </button>
      </div>

      <a
        href="#/coaches"
        className="mb-4 inline-flex items-center gap-2 text-[0.82rem] font-bold text-muted transition hover:text-neon"
      >
        <Icon name="arrowRight" size={16} />
        بازگشت
      </a>

      <div className="flex flex-col gap-5 xl:flex-row xl:items-start">
        {/* ============ booking rail (right on desktop) ============ */}
        <div id="book" className="order-2 flex flex-col gap-4 xl:order-1 xl:w-[300px] xl:shrink-0">
          <div className="panel reveal flex flex-col gap-3 p-4">
            <StatusDot />
            <button
              type="button"
              className={`btn w-full ${loved ? "btn-outline-neon" : "btn-ghost"}`}
              onClick={() => k.toggleFav(coach.id)}
            >
              <Icon name="heart" size={16} className={loved ? "fill-neon" : ""} />
              {loved ? "در علاقه‌مندی‌ها" : "ذخیره مربی"}
            </button>
            <form
              className="flex flex-col gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                k.book({ coachId: coach.id, day, time, note });
                setSent(true);
              }}
            >
              <div className="grid grid-cols-2 gap-2">
                <select className="field text-[0.8rem]" value={day} onChange={(e) => setDay(e.target.value)} aria-label="روز">
                  {["شنبه", "یکشنبه", "دوشنبه", "سه‌شنبه", "چهارشنبه"].map((d) => (
                    <option key={d}>{d}</option>
                  ))}
                </select>
                <select className="field text-[0.8rem]" value={time} onChange={(e) => setTime(e.target.value)} aria-label="ساعت">
                  {["۰۸:۰۰", "۱۰:۰۰", "۱۶:۰۰", "۱۸:۰۰", "۲۰:۰۰"].map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
              </div>
              <input
                className="field text-[0.8rem]"
                placeholder="توضیح کوتاه"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                aria-label="توضیح جلسه"
              />
              <button type="submit" className="btn btn-neon relative w-full overflow-hidden">
                <span className="sweep" />
                درخواست جلسه
                <Icon name="calendar" size={16} />
              </button>
              {sent && <p className="text-center text-[0.75rem] text-neon">درخواست در پروفایل ثبت شد.</p>}
            </form>
          </div>

          <div className="panel reveal flex flex-col divide-y divide-line">
            {[
              { icon: "wallet" as const, k: "تجربه کاری", v: "۸+ سال" },
              { icon: "users" as const, k: "تعداد شاگردان", v: "۳۵۰+ نفر" },
              { icon: "star" as const, k: "امتیاز کاربران", v: "۴.۹", star: true },
            ].map((r) => (
              <div key={r.k} className="flex items-center justify-between gap-3 p-4">
                <div>
                  <p className="label-muted">{r.k}</p>
                  <p className="num mt-0.5 text-[1.05rem] font-extrabold">{r.v}</p>
                </div>
                <span className="grid h-10 w-10 place-items-center rounded-xl border border-line bg-white/[0.04] text-neon">
                  <Icon name={r.icon} size={18} />
                </span>
              </div>
            ))}
          </div>

          <div className="panel reveal flex flex-col gap-4 p-4">
            <div className="flex items-center justify-between">
              <h3 className="text-[0.95rem] font-extrabold">نظرات کاربران</h3>
              <span className="inline-flex items-center gap-1">
                <Icon name="star" size={14} className="fill-neon text-neon" />
                <span className="num text-[0.9rem] font-extrabold">۴.۹</span>
                <span className="num label-muted">(۱۲۳ نظر)</span>
              </span>
            </div>
            {[
              {
                name: "سارا محمدی",
                when: "۲ هفته پیش",
                text: "برنامه تمرینی که علی رضایی برایم نوشت واقعاً عالی بود؛ ۵ کیلو کاهش وزن داشتم و بهترین احساس را در تمرین‌ها دارم.",
                img: IMG.coachSara,
              },
              {
                name: "علی کریمی",
                when: "۱ ماه پیش",
                text: "بسیار حرفه‌ای و باتجربه؛ همیشه پاسخگو و دقیق در اصلاح فرمان حرکات.",
                img: IMG.coachAli,
              },
            ].map((r, i) => (
              <div key={r.name} style={delay(i)} className="reveal flex flex-col gap-2 border-t border-line pt-3">
                <div className="flex items-center gap-2.5">
                  <img src={r.img} alt="" width={34} height={34} loading="lazy" className="h-8 w-8 rounded-full object-cover" />
                  <div>
                    <p className="text-[0.82rem] font-bold">{r.name}</p>
                    <p className="label-muted text-[0.66rem]">{r.when}</p>
                  </div>
                </div>
                <Stars rating={5} size={12} />
                <p className="text-[0.78rem] leading-[1.9] text-muted">{r.text}</p>
              </div>
            ))}
            <button className="btn btn-outline-neon w-full">
              مشاهده همه نظرات
              <Icon name="arrowLeft" size={15} />
            </button>
          </div>
        </div>

        {/* ============ main ============ */}
        <div className="order-1 min-w-0 flex-1 xl:order-2">
          {/* hero card */}
          <section className="panel noise relative overflow-hidden">
            <div className="grid lg:grid-cols-[1fr_1.05fr]">
              <div className="reveal flex flex-col gap-4 p-6 lg:p-8">
                <h1 className="flex items-center gap-2 text-[1.7rem] font-extrabold sm:text-[2.1rem]">
                  {coach.name}
                  <Icon name="check" size={18} className="rounded-full bg-cyan p-1 text-black" />
                </h1>
                <p className="-mt-2 text-[0.9rem] font-semibold text-white/85">{coach.title}</p>
                <div className="flex items-center gap-2">
                  <Stars rating={5} size={16} />
                  <span className="num text-lg font-extrabold">۴.۹</span>
                  <span className="num label-muted">(۱۲۳ نظر)</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {tags.map((t) => (
                    <span key={t.label} className="tag !py-1.5">
                      <Icon name={t.icon} size={13} className="text-neon" />
                      {t.label}
                    </span>
                  ))}
                </div>
                <p className="text-[0.86rem] leading-[2.05] text-muted">
                  من علی رضایی هستم، مربی بدنسازی با بیش از ۸ سال تجربه در زمینه آموزش و برنامه‌ریزی
                  تربیتی. تخصص اصلی من در طراحی برنامه‌های تخصصی شخصی‌سازی شده، اصلاح فرم بدن و افزایش
                  عملکرد ورزشی است. به شما کمک می‌کنم تا در کوتاه‌ترین زمان به بهترین نسخه خودتان
                  برسید!
                </p>
              </div>

              <div className="relative min-h-[240px] overflow-hidden">
                <img
                  src={IMG.coachAli}
                  alt={coach.name}
                  width={900}
                  height={700}
                  className="h-full w-full object-cover object-[50%_20%]"
                />
                <div className="absolute inset-0 bg-gradient-to-l from-[#101317]/25 via-[#101317]/35 to-[#101317]" />
                <div className="shards" />
                <p
                  className="absolute right-6 top-8 rotate-[-8deg] font-display text-[1.1rem] font-semibold italic leading-tight text-neon drop-shadow-[0_2px_12px_rgba(215,255,31,0.4)]"
                  dir="ltr"
                >
                  Better
                  <br />
                  Stronger
                  <br />
                  Together
                </p>
                <span className="absolute bottom-6 left-7">
                  <span className="font-display text-lg font-extrabold tracking-[0.2em] text-white" dir="ltr">
                    KAYAR
                  </span>
                </span>
              </div>
            </div>
          </section>

          {/* tabs */}
          <div className="panel mt-5">
            <div className="flex overflow-x-auto border-b border-line" role="tablist" aria-label="بخش‌های پروفایل">
              {tabs.map((t, i) => (
                <button
                  key={t}
                  role="tab"
                  aria-selected={tab === i}
                  onClick={() => setTab(i)}
                  className={`relative min-h-12 whitespace-nowrap px-5 text-[0.85rem] font-bold transition ${
                    tab === i ? "text-white" : "text-muted hover:text-white/80"
                  }`}
                >
                  {t}
                  {tab === i && <span className="absolute inset-x-4 bottom-0 h-[2px] rounded-full bg-neon" />}
                </button>
              ))}
            </div>

            <div className="flex flex-col gap-5 p-4 sm:p-6 lg:flex-row-reverse">
              {/* mini profile card — left on desktop */}
              <aside className="reveal w-full shrink-0 lg:w-[248px]">
                <div className="panel flex flex-col gap-3 p-4">
                  <div className="flex items-center gap-3">
                    <img
                      src={coach.image}
                      alt={coach.name}
                      width={54}
                      height={54}
                      className="h-14 w-14 rounded-2xl object-cover"
                    />
                    <div>
                      <p className="flex items-center gap-1 text-[0.95rem] font-extrabold">
                        {coach.name}
                        <Icon name="check" size={12} className="rounded-full bg-cyan p-[2px] text-black" />
                      </p>
                      <p className="label-muted text-[0.7rem]">{coach.title}</p>
                    </div>
                  </div>
                  <ul className="flex flex-col divide-y divide-line">
                    {detailRows.map((r) => (
                      <li key={r.k} className="flex items-center justify-between gap-2 py-2.5">
                        <span className="label-muted">{r.k}</span>
                        <span className="inline-flex items-center gap-1.5 text-[0.78rem] font-semibold">
                          {r.v}
                          <Icon name={r.icon} size={14} className="text-neon" />
                        </span>
                      </li>
                    ))}
                  </ul>
                  <button className="btn btn-outline-neon w-full">
                    <Icon name="send" size={15} />
                    تماس با مربی
                  </button>
                </div>
              </aside>

              {/* content */}
              <div className="min-w-0 flex-1">
                <h2 className="mb-3 text-[1.05rem] font-extrabold">درباره من</h2>
                <p className="text-[0.86rem] leading-[2.1] text-muted">
                  من علی رضایی هستم، مربی بدنسازی با بیش از ۸ سال تجربه در زمینه آموزش و برنامه‌ریزی
                  تمرینی. تخصص اصلی من در طراحی برنامه‌های تخصصی شخصی‌سازی‌شده، اصلاح فرم بدن و افزایش
                  عملکرد ورزشی است. با توجه به سبک زندگی و هدفت شما برنامه‌های کاملاً متناسب با نیازتان
                  ارائه می‌دهم تا در کمترین زمان به بهترین نتیجه برسید. سلامتی، انگیزه و استمرار، به اهداف
                  مهم در مسیر موفقیت شما هستند.
                </p>

                <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {aboutFeatures.map((f, i) => (
                    <div
                      key={f.label}
                      style={delay(i)}
                      className="reveal panel-flat flex flex-col items-center gap-2 p-3 text-center transition hover:border-neon/40"
                    >
                      <Icon name={f.icon} size={19} className="text-neon" />
                      <span className="text-[0.76rem] font-semibold">{f.label}</span>
                    </div>
                  ))}
                </div>

                <div className="mt-7 flex items-center justify-between">
                  <h2 className="text-[1.05rem] font-extrabold">برنامه‌های تربینی</h2>
                  <button className="inline-flex items-center gap-1 text-[0.78rem] font-bold text-neon transition hover:gap-2">
                    مشاهده همه
                    <Icon name="chevronLeft" size={14} />
                  </button>
                </div>
                <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
                  {programs.map((p, i) => (
                    <div key={p.id} style={delay(i)} className="reveal">
                      <ProgramCard {...p} />
                    </div>
                  ))}
                </div>

                <div className="mt-7 flex items-center justify-between">
                  <h2 className="text-[1.05rem] font-extrabold">ویدئوهای آموزشی</h2>
                  <button className="inline-flex items-center gap-1 text-[0.78rem] font-bold text-neon transition hover:gap-2">
                    مشاهده همه
                    <Icon name="chevronLeft" size={14} />
                  </button>
                </div>
                <div className="rail mt-4">
                  {[IMG.gym, IMG.admin, IMG.hero].map((src, i) => (
                    <div key={i} className="panel card-hover group relative w-[220px] overflow-hidden">
                      <img
                        src={src}
                        alt=""
                        width={300}
                        height={200}
                        loading="lazy"
                        className="h-32 w-full object-cover transition duration-700 group-hover:scale-105"
                      />
                      <span className="absolute inset-0 grid place-items-center bg-black/25">
                        <span className="grid h-11 w-11 place-items-center rounded-full border border-white/40 bg-black/40 text-neon backdrop-blur transition group-hover:scale-110">
                          <Icon name="play" size={16} className="fill-current" />
                        </span>
                      </span>
                      <p className="p-3 text-[0.8rem] font-bold">
                        {["اصول حرکت اسکوات", "تمرین‌های خانگی", "گرم کردن صحیح"][i]}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ProductShell>
  );
}
