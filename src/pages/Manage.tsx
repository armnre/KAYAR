import { useState } from "react";
import { AppShell } from "../components/AppShell";
import { Icon } from "../components/icons";
import { Rating, StatusDot, delay, useRevealOnScroll } from "../components/ui";
import { IMG, adminNav, coaches } from "../lib/data";

const chips = ["همه", "دو و میدانی", "بدنسازی", "کراسفیت", "یوگا", "تغذیه", "شنا"];
const tabs = ["اطلاعات", "برنامه‌ها", "مقالات", "نظرات"];
const detail = coaches[0];
const selected = coaches[1];

const days = [
  { d: "شبه", n: "۱۸" },
  { d: "یکشنبه", n: "۱۷" },
  { d: "چهارشنبه", n: "۱۶" },
  { d: "سه‌شنبه", n: "۱۵" },
  { d: "دوشنبه", n: "۱۴", active: true },
  { d: "پنجشنبه", n: "۱۳" },
  { d: "جمعه", n: "۱۲" },
];
const times = ["۰۶:۰۰", "۰۷:۰۰", "۰۸:۰۰", "۰۹:۰۰", "۱۰:۰۰", "۱۴:۰۰", "۱۶:۰۰", "۱۷:۰۰", "۱۸:۰۰"];

export default function Manage() {
  const [chip, setChip] = useState(0);
  const [tab, setTab] = useState(0);
  const [picked, setPicked] = useState(selected.id);
  useRevealOnScroll(chip + tab + picked);

  return (
    <AppShell
      active="manage"
      items={adminNav}
      search="جستجوی مربی..."
      userName="admin@paramistech.ir"
      userRole="مدیر"
    >
      <div className="flex flex-col gap-5 xl:flex-row xl:items-start">
        {/* ============ detail panel (right) ============ */}
        <aside className="order-2 w-full xl:order-1 xl:w-[420px] xl:shrink-0">
          <div className="panel reveal overflow-hidden">
            <div className="relative h-[230px]">
              <img src={detail.image} alt={detail.name} width={800} height={500} className="h-full w-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0B0E11] via-[#0B0E11]/25 to-transparent" />
              <button className="absolute right-4 top-4 inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-black/45 px-2.5 py-1.5 text-[0.72rem] font-bold text-white backdrop-blur transition hover:text-neon">
                بازگشت
                <Icon name="arrowLeft" size={14} />
              </button>
              <div className="absolute left-4 top-4 flex gap-2">
                {(["bookmark", "share"] as const).map((i) => (
                  <button
                    key={i}
                    className="grid h-8 w-8 place-items-center rounded-lg border border-white/15 bg-black/45 text-white/80 backdrop-blur transition hover:text-neon"
                    aria-label={i}
                  >
                    <Icon name={i} size={14} />
                  </button>
                ))}
              </div>
              <div className="absolute inset-x-5 bottom-4">
                <h2 className="text-[1.35rem] font-extrabold">{detail.name}</h2>
                <div className="mt-1 flex items-center gap-2">
                  <Rating rating={detail.rating} reviews={detail.reviews} />
                </div>
                <p className="mt-1 text-[0.82rem] text-muted">{detail.title}</p>
                <div className="mt-2">
                  <StatusDot online={detail.online} />
                </div>
              </div>
            </div>

            <div className="flex overflow-x-auto border-b border-line" role="tablist" aria-label="جزئیات مربی">
              {tabs.map((t, i) => (
                <button
                  key={t}
                  role="tab"
                  aria-selected={tab === i}
                  onClick={() => setTab(i)}
                  className={`relative min-h-11 flex-1 whitespace-nowrap px-4 text-[0.8rem] font-bold transition ${
                    tab === i ? "text-white" : "text-muted hover:text-white/80"
                  }`}
                >
                  {t}
                  {tab === i && <span className="absolute inset-x-3 bottom-0 h-[2px] rounded-full bg-neon" />}
                </button>
              ))}
            </div>

            <div className="flex flex-col gap-5 p-5">
              <div>
                <h3 className="mb-2 text-[0.92rem] font-extrabold">درباره مربی</h3>
                <p className="text-[0.82rem] leading-[2] text-muted">
                  {detail.name}، مربی حرفه‌ای دو و میدانی و آمادگی جسمانی با بیش از ۸ سال تجربه در
                  آموزش ورزشکاران حرفه‌ای و آماتور. تمرکز اصلی ایشان بر بهبود عملکرد، افزایش
                  استقامت و رسیدن به بهترین نسخه زندگان و ذهنی است.
                </p>
              </div>

              <div className="grid grid-cols-3 divide-x divide-x-reverse divide-line rounded-xl border border-line py-3 text-center">
                {[
                  { i: "user" as const, v: "۸+", l: "سال تجربه" },
                  { i: "users" as const, v: "۵۰۰+", l: "دانشجو" },
                  { i: "star" as const, v: "۴.۸", l: "امتیاز کاربران" },
                ].map((s) => (
                  <div key={s.l} className="flex flex-col items-center gap-1 px-1">
                    <Icon name={s.i} size={15} className="text-neon" />
                    <span className="num text-[0.95rem] font-extrabold">{s.v}</span>
                    <span className="label-muted text-[0.62rem]">{s.l}</span>
                  </div>
                ))}
              </div>

              <div>
                <h3 className="mb-2 text-[0.92rem] font-extrabold">تخصص‌ها</h3>
                <div className="flex flex-wrap gap-2">
                  {["دو و میدانی", "تمرینات سرعتی", "تکنیک دو", "دوی استقامت"].map((s) => (
                    <span key={s} className="tag !py-1.5">
                      {s}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="mb-3 text-[0.92rem] font-extrabold">برنامه‌های در دسترس</h3>
                <div className="flex items-center justify-between gap-1 overflow-x-auto pb-1">
                  {days.map((d) => (
                    <span
                      key={d.d}
                      className={`flex min-w-[42px] flex-1 flex-col items-center gap-0.5 rounded-lg border px-1.5 py-2 text-[0.62rem] transition ${
                        d.active
                          ? "border-transparent bg-neon font-extrabold text-black"
                          : "border-line text-muted"
                      }`}
                    >
                      <span>{d.d}</span>
                      <span className="num text-[0.78rem] font-extrabold">{d.n}</span>
                    </span>
                  ))}
                </div>
                <div className="mt-3 grid grid-cols-5 gap-1.5">
                  {times.map((t, i) => (
                    <span
                      key={t}
                      className={`num grid h-8 place-items-center rounded-lg border text-[0.66rem] font-bold transition ${
                        i === 4
                          ? "border-transparent bg-neon text-black"
                          : "border-line text-muted hover:border-neon/40 hover:text-neon"
                      }`}
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button className="btn btn-neon relative overflow-hidden">
                  <span className="sweep" />
                  <Icon name="calendar" size={16} />
                  درخواست جلسه
                </button>
                <button className="btn btn-ghost">
                  <Icon name="message" size={16} />
                  ارسال پیام
                </button>
              </div>
            </div>
          </div>
        </aside>

        {/* ============ list ============ */}
        <div className="order-1 min-w-0 flex-1">
          <div className="reveal mb-5 flex flex-col gap-1.5">
            <p className="label-muted">
              کایار <span className="mx-1 text-line-2">/</span> مربیان
            </p>
            <h1 className="text-[1.7rem] font-extrabold sm:text-[2.1rem]">مربیان</h1>
            <p className="label-muted">بهترین مربیان و متخصصان ورزشی در کنار شما</p>
          </div>

          <div className="reveal mb-4 flex flex-wrap items-center gap-2">
            {chips.map((c, i) => (
              <button
                key={c}
                onClick={() => setChip(i)}
                aria-pressed={chip === i}
                className={`chip ${chip === i ? "chip-active" : ""}`}
              >
                {c}
                {i > 0 && <Icon name="dumbbell" size={13} className="opacity-70" />}
              </button>
            ))}
          </div>

          <div className="panel reveal mb-4 flex flex-col gap-3 p-3 lg:flex-row lg:items-center">
            <label className="field flex-1">
              <Icon name="search" size={16} className="text-muted" />
              <input
                className="w-full bg-transparent text-[0.85rem] placeholder:text-muted focus:outline-none"
                placeholder="جستجوی مربی..."
                aria-label="جستجوی مربی"
              />
            </label>
            <div className="flex flex-wrap items-center gap-2">
              <button className="chip min-w-[130px] justify-between">
                همه سطوح
                <Icon name="chevronDown" size={14} />
              </button>
              <button className="chip min-w-[130px] justify-between">
                همه تخصص‌ها
                <Icon name="chevronDown" size={14} />
              </button>
              <button className="chip !px-2.5" aria-label="فیلترها">
                <Icon name="sliders" size={15} />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {coaches.slice(0, 6).map((c, i) => {
              const isPicked = picked === c.id;
              return (
                <article
                  key={c.id}
                  style={delay(i)}
                  className={`reveal panel card-hover group flex flex-col overflow-hidden ${
                    isPicked ? "border-neon" : ""
                  }`}
                >
                  <div className="relative h-44">
                    <img
                      src={c.image}
                      alt={c.name}
                      width={400}
                      height={300}
                      loading="lazy"
                      className="h-full w-full object-cover transition duration-700 group-hover:scale-[1.06]"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0B0E11] via-transparent to-transparent" />
                    <span className="absolute right-3 top-3">
                      <span className="rounded-lg border border-white/15 bg-black/50 px-2 py-1 text-[0.66rem] font-bold text-white/85 backdrop-blur">
                        {c.tag}
                      </span>
                    </span>
                    <button
                      onClick={() => setPicked(c.id)}
                      className={`absolute left-3 top-3 grid h-8 w-8 place-items-center rounded-lg border border-white/15 bg-black/50 backdrop-blur transition ${
                        isPicked ? "text-neon" : "text-white/80 hover:text-neon"
                      }`}
                      aria-label="ذخیره"
                    >
                      <Icon name="bookmark" size={14} className={isPicked ? "fill-neon" : ""} />
                    </button>
                    <div className="absolute inset-x-4 bottom-3 flex items-center justify-end gap-1.5">
                      <Icon name="star" size={13} className="fill-neon text-neon" />
                      <span className="num text-[0.8rem] font-extrabold">
                        {c.rating.toLocaleString("fa-IR")}
                      </span>
                      <span className="num text-[0.7rem] text-muted">
                        ({c.reviews.toLocaleString("fa-IR")})
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-1 flex-col gap-2.5 p-4">
                    <h3 className="text-[1rem] font-extrabold">{c.name}</h3>
                    <p className="label-muted">{c.title}</p>
                    <div className="flex items-center justify-between border-t border-line pt-2.5">
                      <StatusDot online={c.online} />
                      <span className="label-muted num">{c.years}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setPicked(c.id)}
                        className={`btn flex-1 !min-h-9 !text-[0.78rem] ${
                          isPicked ? "btn-outline-neon" : "btn-neon relative overflow-hidden"
                        }`}
                      >
                        {isPicked && <span className="sweep" />}
                        مشاهده پروفایل
                      </button>
                      <button className="btn btn-ghost !min-h-9 !px-2.5" aria-label="ذخیره در لیست">
                        <Icon name="bookmark" size={15} />
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>

          <nav aria-label="صفحه‌بندی" className="mt-6 flex items-center justify-center gap-1.5">
            <button className="grid h-9 w-9 place-items-center rounded-lg border border-line text-muted transition hover:border-neon/40 hover:text-neon" aria-label="قبلی">
              <Icon name="chevronRight" size={15} />
            </button>
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                className={`num grid h-9 w-9 place-items-center rounded-lg border text-[0.82rem] font-bold transition ${
                  n === 1 ? "border-transparent bg-neon text-black" : "border-line text-muted hover:border-neon/40 hover:text-neon"
                }`}
              >
                {n.toLocaleString("fa-IR")}
              </button>
            ))}
            <span className="label-muted px-1">...</span>
            <button className="grid h-9 w-9 place-items-center rounded-lg border border-line text-muted transition hover:border-neon/40 hover:text-neon" aria-label="بعدی">
              <Icon name="chevronLeft" size={15} />
            </button>
          </nav>
        </div>
      </div>

      <p className="mt-8 flex items-center justify-center gap-2 text-[0.75rem] text-muted">
        <img src={IMG.brain} alt="" width={20} height={20} loading="lazy" className="h-5 w-5 rounded-full object-cover opacity-70" />
        مربیان حرفه‌ای، تحت تایید کایار
      </p>
    </AppShell>
  );
}
