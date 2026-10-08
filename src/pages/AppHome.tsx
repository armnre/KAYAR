import { useEffect, useState } from "react";
import { ProductShell, RequireUser } from "../components/ProductShell";
import { Icon } from "../components/icons";
import { useKayar } from "../app/store";
import { CAMPAIGNS, TRACKS, bodyyarReply } from "../app/kernel";
import { coaches } from "../lib/data";
import { Ring } from "../components/ui";
import { toPersianDigits } from "../modules/auth/phone";

function CountUp({ to }: { to: number }) {
  const [v, setV] = useState(0);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setV(to);
      return;
    }
    let raf = 0;
    const t0 = performance.now();
    const step = (t: number) => {
      const p = Math.min(1, (t - t0) / 800);
      setV(Math.round(to * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [to]);
  return <>{toPersianDigits(v)}</>;
}

const GOAL: Record<string, string> = {
  fatloss: "کاهش وزن",
  muscle: "عضله‌سازی",
  fitness: "آمادگی عمومی",
  flexibility: "انعطاف و ریکاوری",
};

export default function AppHome() {
  return (
    <ProductShell active="dashboard" search="جستجو در کایار">
      <RequireUser>
        <Dashboard />
      </RequireUser>
    </ProductShell>
  );
}

function Dashboard() {
  const k = useKayar();
  const user = k.user!;
  const p = user.profile;
  const favs = k.state.favorites[user.id] ?? [];
  const bookings = k.state.bookings.filter((b) => b.userId === user.id);
  const joined = k.state.campaigns[user.id] ?? [];
  const chats = k.state.chats[user.id] ?? [];
  const lastTrack = (k.state.morshedHistory[user.id] ?? [])[0];
  const score = Math.min(100, 28 + joined.reduce((a, c) => a + c.checkins.length, 0) * 6 + (p.onboarded ? 12 : 0) + Math.min(20, chats.length));
  const plan = bodyyarReply(p, "").split("\n")[1] ?? "";

  return (
    <div className="flex flex-col gap-5">
      <section className="panel noise relative overflow-hidden p-5 sm:p-7">
        <div className="shards opacity-50" />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="t-label text-neon">خانه شما</p>
            <h1 className="t-h1 mt-1">سلام {p.displayName || "ورزشکار"}، امروز یک قدم جلوتر.</h1>
            <p className="t-body-sm mt-2 max-w-xl text-muted">
              هدف فعال: {GOAL[p.goal]} · سطح {p.level === "beginner" ? "مبتدی" : p.level === "mid" ? "متوسط" : "پیشرفته"}
              {p.city ? ` · ${p.city}` : ""}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <a href="#/bodyyar" className="btn btn-neon">
                <Icon name="brain" size={16} />
                ادامه با بدن‌یار
              </a>
              <a href="#/coaches" className="btn btn-ghost">
                مربی‌ها
              </a>
              <a href="#/campaigns" className="btn btn-ghost">
                کمپین‌ها
              </a>
            </div>
          </div>
          <Ring value={score} label={toPersianDigits(score)} sub="شاخص فعالیت" />
        </div>
      </section>

      {/* quick actions */}
      <nav aria-label="دسترسی سریع" className="grid grid-cols-4 gap-2 sm:gap-3">
        {[
          { href: "#/bodyyar", icon: "brain" as const, t: "بدن‌یار", tone: "text-neon border-neon/25 bg-neon/8" },
          { href: "#/coaches", icon: "dumbbell" as const, t: "مربی‌ها", tone: "text-cyan border-cyan/25 bg-cyan/8" },
          { href: "#/morshed", icon: "mic" as const, t: "مرشد", tone: "text-violet-2 border-violet/30 bg-violet/10" },
          { href: "#/campaigns", icon: "trophy" as const, t: "کمپین", tone: "text-gold border-gold/25 bg-gold/8" },
        ].map((q) => (
          <a
            key={q.t}
            href={q.href}
            className="panel card-hover flex min-h-[74px] flex-col items-center justify-center gap-2"
          >
            <span className={`grid h-11 w-11 place-items-center rounded-2xl border ${q.tone}`}>
              <Icon name={q.icon} size={19} />
            </span>
            <span className="text-[0.72rem] font-bold">{q.t}</span>
          </a>
        ))}
      </nav>

      {/* campaign CTA */}
      {(() => {
        const spec = CAMPAIGNS[0];
        const row = joined.find((j) => j.campaignId === spec.id);
        return (
          <section className="panel relative flex flex-col gap-3 overflow-hidden p-5 sm:flex-row sm:items-center sm:justify-between">
            <img src={spec.image} alt="" width={220} height={140} loading="lazy" className="absolute inset-0 h-full w-full object-cover opacity-20" />
            <div className="relative">
              <p className="t-label text-gold">کمپین فعال · {spec.brand}</p>
              <h2 className="t-h3 mt-1">{spec.title}</h2>
              <p className="mt-1 max-w-md text-[0.8rem] text-muted">{spec.desc}</p>
            </div>
            <a href="#/campaigns" className="btn btn-neon relative w-fit overflow-hidden">
              <span className="sweep" />
              {row ? (row.claimedAtMs ? "پاداش شما" : "ادامه چک‌این") : "عضویت"}
              <Icon name="arrowLeft" size={15} />
            </a>
          </section>
        );
      })()}

      <section className="panel flex flex-col gap-2 p-5">
        <div className="flex items-center justify-between">
          <h2 className="t-h3">برنامه امروز — از پروفایل شما</h2>
          <a href="#/bodyyar" className="text-[0.78rem] font-bold text-neon">جزئیات</a>
        </div>
        <p className="t-body-sm text-muted">{plan || "هدف‌گذاری هنوز کامل نشده است."}</p>
      </section>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { href: "#/bodyyar", icon: "brain" as const, k: "گفتگو با بدن‌یار", v: chats.filter((m) => m.role === "user").length, s: "پیام" },
          { href: "#/coaches", icon: "heart" as const, k: "مربیان ذخیره‌شده", v: favs.length, s: "نفر" },
          { href: "#/profile", icon: "calendar" as const, k: "درخواست جلسه", v: bookings.length, s: "مورد" },
          { href: "#/campaigns", icon: "trophy" as const, k: "کمپین فعال", v: joined.length, s: "مورد" },
        ].map((c) => (
          <a key={c.k} href={c.href} className="panel card-hover flex items-center justify-between p-4">
            <div>
              <p className="label-muted">{c.k}</p>
              <p className="num mt-1 text-2xl font-extrabold">
                <CountUp to={c.v} /> <span className="text-sm font-bold text-muted">{c.s}</span>
              </p>
            </div>
            <span className="grid h-11 w-11 place-items-center rounded-xl border border-neon/25 bg-neon/10 text-neon">
              <Icon name={c.icon} size={18} />
            </span>
          </a>
        ))}
      </div>

      {/* coach recommendation */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="t-h3">مربی پیشنهادی</h2>
          <a href="#/coaches" className="text-[0.78rem] font-bold text-neon">همه مربیان</a>
        </div>
        <a href="#/coach/ali-rezaei" className="panel card-hover relative flex items-center gap-4 overflow-hidden p-3">
          <img src={coaches[1].image} alt="" width={84} height={84} className="h-[84px] w-[84px] shrink-0 rounded-2xl object-cover" />
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-1.5 font-extrabold">
              {coaches[1].name}
              <Icon name="check" size={13} className="rounded-full bg-cyan p-0.5 text-black" />
            </p>
            <p className="label-muted truncate">{coaches[1].title}</p>
            <p className="num mt-1 text-[0.72rem] text-neon">
              {coaches[1].rating.toLocaleString("fa-IR")} ({coaches[1].reviews.toLocaleString("fa-IR")} نظر)
            </p>
          </div>
          <span className="btn btn-outline-neon shrink-0 !min-h-9 !text-[0.75rem]">مشاهده</span>
        </a>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <article className="panel p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="t-h3">ادامه مرشد</h2>
            <a href="#/morshed" className="text-[0.78rem] font-bold text-violet-2">
              کتابخانه
            </a>
          </div>
          {(lastTrack ? TRACKS.filter((t) => t.id === lastTrack.trackId) : TRACKS.slice(0, 2)).map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => k.playTrack(t.id)}
              className="flex w-full items-center gap-3 rounded-xl border border-line p-2.5 text-right transition hover:border-violet/40"
            >
              <img src={t.image} alt="" width={64} height={48} className="h-12 w-16 rounded-lg object-cover" />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-extrabold">{t.title}</span>
                <span className="label-muted">{t.creator}</span>
              </span>
              <Icon name="play" size={16} className="text-violet-2" />
            </button>
          ))}
        </article>

        <article className="panel p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="t-h3">کمپین‌های شما</h2>
            <a href="#/campaigns" className="text-[0.78rem] font-bold text-gold">
              همه
            </a>
          </div>
          {joined.length === 0 && <p className="t-body-sm text-muted">هنوز عضو کمپینی نیستید. از اسپانسری کاپوش شروع کنید.</p>}
          {joined.map((j) => {
            const spec = CAMPAIGNS.find((c) => c.id === j.campaignId)!;
            return (
              <div key={j.campaignId} className="mb-3">
                <div className="mb-1 flex justify-between text-[0.8rem] font-bold">
                  <span>{spec.title}</span>
                  <span className="num text-muted">
                    {toPersianDigits(j.checkins.length)}/{toPersianDigits(spec.need)}
                  </span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                  <span className="block h-full bg-gold" style={{ width: `${Math.min(100, (j.checkins.length / spec.need) * 100)}%` }} />
                </div>
              </div>
            );
          })}
        </article>
      </section>

      {favs.length > 0 && (
        <section>
          <h2 className="t-h3 mb-3">مربیان ذخیره‌شده</h2>
          <div className="rail">
            {favs.map((id) => {
              const c = coaches.find((x) => x.id === id);
              if (!c) return null;
              return (
                <a key={id} href={`#/coach/${id}`} className="panel w-40 overflow-hidden">
                  <img src={c.image} alt="" className="h-24 w-full object-cover" />
                  <p className="p-3 text-[0.82rem] font-extrabold">{c.name}</p>
                </a>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
