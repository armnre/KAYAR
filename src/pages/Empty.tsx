import { Icon, Logo, type IconName } from "../components/icons";
import { Badge } from "../components/ui/feedback";

type ModuleMeta = {
  id: string;
  title: string;
  tagline: string;
  phase: string;
  icon: IconName;
  tone: "neon" | "violet" | "gold" | "cyan";
  architecture: string[];
  entities: string[];
  routes: string[];
};

const MODULES: Record<string, ModuleMeta> = {
  morshed: {
    id: "morshed",
    title: "مرشد",
    tagline: "اکوسیستم محتوای صوتی premium برای رشد ذهن و بدن",
    phase: "فاز ۷",
    icon: "mic",
    tone: "violet",
    architecture: [
      "UI (کشف، پلیر پایدار) → Application Service → Domain (پخش، پیشرفت، علاقه‌مندی)",
      "ContentSource adapter ← پلتفرم خارجی / کراولر / آپلود مستقیم",
      "Player state یکپارچه: گذار بین صفحه‌ها بدون قطع پخش",
      "Recommendation + analytics روی رویدادهای پخش",
    ],
    entities: [
      "morshed_content",
      "morshed_categories",
      "morshed_playlists",
      "morshed_favorites",
      "morshed_history",
      "morshed_progress",
    ],
    routes: ["/morshed", "/morshed/[slug]", "/morshed/playlists", "/morshed/player"],
  },
  campaigns: {
    id: "campaigns",
    title: "کمپین‌ها و حامیان",
    tagline: "برند ← کمپین ← مکانیک تعامل ← چالش ← پاداش ← تحلیل",
    phase: "فاز ۸",
    icon: "trophy",
    tone: "gold",
    architecture: [
      "بازی فقط یک مکانیک کمپین است؛ هرگز محصول گیمینگ نیست",
      "رویدادهای تعامل سمت سرور تایید می‌شوند (ضد تقلب)",
      "پاداش به‌صورت Job صادر می‌شود: قابل تکرار، قابل حسابرسی",
      "Idempotency key روی join / claim / redeem",
    ],
    entities: [
      "sponsors",
      "campaigns",
      "campaign_mechanics",
      "challenges",
      "rewards",
      "coupons",
      "campaign_participations",
      "campaign_events",
    ],
    routes: ["/campaigns", "/campaigns/[slug]", "/campaigns/rewards", "/campaigns/mine"],
  },
  profile: {
    id: "profile",
    title: "پروفایل کاربر",
    tagline: "حساب، اهداف، فعالیت، پاداش‌ها، اعلان‌ها و تنظیمات",
    phase: "فاز ۴",
    icon: "user",
    tone: "neon",
    architecture: [
      "User identity + session (پیاده‌شده در فاز ۱) → نمایش وضعیت نشست",
      "Goal / Activity / Body metrics حساس‌اند: رمزنگاری در حالت سکون، دسترسی فقط مالک",
      "notification_preferences + RBAC در سمت سرور",
      "خروج از همه دستگاه‌ها → revokeAllSessions()",
    ],
    entities: ["users", "user_roles", "sessions", "notification_preferences", "audit_logs"],
    routes: ["/profile", "/profile/goals", "/profile/activity", "/profile/rewards", "/profile/settings"],
  },
};

const TONE = {
  neon: "border-neon/30 bg-neon/10 text-neon",
  violet: "border-violet/35 bg-violet/15 text-violet-2",
  gold: "border-gold/30 bg-gold/12 text-gold",
  cyan: "border-cyan/30 bg-cyan/12 text-cyan",
} as const;

/**
 * Honest architectural shell for modules whose implementation lands in a later phase.
 * It never pretends the feature exists — it documents the real plan and its status.
 */
export default function ModuleShell({ moduleKey }: { moduleKey: string }) {
  const m = MODULES[moduleKey] ?? MODULES.profile;

  return (
    <div className="min-h-screen bg-base">
      <header className="glass sticky top-0 z-40 border-b border-line">
        <div className="mx-auto flex max-w-[1560px] items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-10">
          <a href="#/" className="btn btn-ghost !min-h-10 !px-3 !text-[0.78rem]">
            <Icon name="arrowRight" size={16} />
            بازگشت
          </a>
          <Logo size="md" />
        </div>
      </header>

      <main id="main" className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:py-16">
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <span className={`grid h-12 w-12 place-items-center rounded-2xl border ${TONE[m.tone]}`}>
            <Icon name={m.icon} size={22} />
          </span>
          <div className="flex flex-col gap-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="t-h1">{m.title}</h1>
              <Badge tone="muted">ماژول {m.phase}</Badge>
              <Badge tone="gold">در حال برنامه‌ریزی</Badge>
            </div>
            <p className="t-body-sm text-muted">{m.tagline}</p>
          </div>
        </div>

        <div className="panel mb-5 flex items-start gap-3 border-dashed p-4">
          <Icon name="bolt" size={17} className="mt-0.5 shrink-0 text-gold" />
          <p className="t-body-sm text-muted">
            این ماژول در این بیلد <strong className="text-white">پیاده‌سازی نشده</strong> است. طبق قاعده
            «هیچ قابلیت ساختگی»، به‌جای یک صفحه‌ی نمایشی، قراردادها و معماری واقعی آن ثبت شده تا فاز
            تخصیص‌یافته بدون بازطراحی شروع شود.
          </p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <section className="panel p-5">
            <h2 className="t-h3 mb-3">مرز دامنه</h2>
            <ul className="flex flex-col gap-2.5">
              {m.entities.map((e) => (
                <li key={e} className="flex items-center gap-2">
                  <Icon name="layers" size={14} className="shrink-0 text-neon" />
                  <code className="num text-[0.78rem] text-white/85" dir="ltr">
                    {e}
                  </code>
                </li>
              ))}
            </ul>
          </section>

          <section className="panel p-5">
            <h2 className="t-h3 mb-3">مسیرهای برنامه‌ریزی‌شده</h2>
            <ul className="flex flex-col gap-2.5">
              {m.routes.map((r) => (
                <li key={r} className="flex items-center gap-2">
                  <Icon name="chevronLeft" size={14} className="shrink-0 text-muted" />
                  <code className="num text-[0.78rem] text-white/85" dir="ltr">
                    {r}
                  </code>
                </li>
              ))}
            </ul>
          </section>
        </div>

        <section className="panel mt-5 p-5">
          <h2 className="t-h3 mb-3">تصمیم‌های معماری</h2>
          <ul className="flex flex-col gap-3">
            {m.architecture.map((a, i) => (
              <li key={a} className="flex items-start gap-3">
                <span className="num mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-lg border border-line text-[0.7rem] font-bold text-neon">
                  {String(i + 1).padStart(2, "0").replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[Number(d)])}
                </span>
                <span className="t-body-sm text-muted">{a}</span>
              </li>
            ))}
          </ul>
        </section>

        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <a href="#/coaches" className="btn btn-neon relative overflow-hidden">
            <span className="sweep" />
            مشاهده مربیان
            <Icon name="arrowLeft" size={16} />
          </a>
          <a href="#/screens" className="btn btn-ghost">
            <Icon name="grid" size={16} />
            مرجع صفحات اپلیکیشن
          </a>
        </div>
      </main>
    </div>
  );
}
