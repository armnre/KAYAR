import { useMemo } from "react";
import { AppShell } from "../components/AppShell";
import { Icon } from "../components/icons";
import { Sparkline, delay, useRevealOnScroll } from "../components/ui";
import { StateBlock } from "../components/ui/feedback";
import { KayarBars, KayarDoughnut, KayarLine } from "../components/charts";
import { useKayar } from "../app/store";
import { coaches } from "../lib/data";
import { IMG, adminNav } from "../lib/data";
import { can } from "../modules/rbac/permissions";
import { toActor } from "../app/kernel";
import { maskPhoneDisplay, toNational, toPersianDigits } from "../modules/auth/phone";

const spark: Record<number, number[]> = {
  1: [420, 520, 480, 610, 560, 700, 820],
  2: [180, 260, 220, 300, 280, 340, 400],
  3: [90, 110, 130, 120, 150, 170, 190],
  4: [30, 42, 38, 50, 46, 58, 64],
};
const sparkColor: Record<string, string> = { neon: "#D7FF1F", violet: "#8F6BFF", gold: "#F6C667", cyan: "#22D3EE" };
const statusTone: Record<string, string> = {
  pending: "bg-gold/12 text-gold border-gold/25",
  approved: "bg-emerald-400/12 text-emerald-400 border-emerald-400/25",
  rejected: "bg-red-400/12 text-red-300 border-red-400/25",
};
const statusLabel: Record<string, string> = { pending: "در انتظار", approved: "تایید", rejected: "رد" };

export default function Admin() {
  const k = useKayar();
  useRevealOnScroll("admin");

  if (!k.user) {
    return (
      <AppShell active="dash" items={adminNav} search="جستجو در داشبورد..." guest>
        <StateBlock icon="shield" title="ورود لازم است" description="پنل مدیریت فقط برای نقش مدیر." action={<a href="#/login" className="btn btn-neon">ورود</a>} />
      </AppShell>
    );
  }

  if (!can(toActor(k.user), "coaches.approve")) {
    return (
      <AppShell active="dash" items={adminNav} search="جستجو در داشبورد...">
        <StateBlock
          icon="shield"
          title="دسترسی مدیر لازم است"
          description="این پنل با RBAC محافظت می‌شود؛ پنهان‌سازی رابط جایگزین مجوز نیست. شماره مدیر: ۰۹۱۲۱۱۱۱۱۱۱"
          action={<a href="#/profile" className="btn btn-ghost">پروفایل</a>}
        />
      </AppShell>
    );
  }

  return <LiveAdmin />;
}

function LiveAdmin() {
  const k = useKayar();

  const users = k.state.users;
  const bookings = k.state.bookings;
  const pending = bookings.filter((b) => b.status === "pending");
  const rewards = Object.values(k.state.campaigns)
    .flat()
    .filter((c) => c.rewardCode);

  const weekLabels = ["شنبه", "یکشنبه", "دوشنبه", "سه‌شنبه", "چهارشنبه", "پنج‌شنبه", "جمعه"];
  const auditSeries = useMemo(() => {
    const counts = new Array(7).fill(0);
    for (const a of k.state.audit) {
      const d = (new Date(a.atMs).getDay() + 1) % 7;
      counts[d] += 1;
    }
    return counts;
  }, [k.state.audit]);

  const tagDist = useMemo(() => {
    const map = new Map<string, number>();
    for (const b of bookings) {
      const tag = coaches.find((c) => c.id === b.coachId)?.tag ?? "سایر";
      map.set(tag, (map.get(tag) ?? 0) + 1);
    }
    const palette = ["#D7FF1F", "#6A3DFF", "#22D3EE", "#F6C667", "#A7ABB6", "#8F6BFF"];
    return [...map.entries()].map(([label, value], i) => ({ label, value, color: palette[i % palette.length] }));
  }, [bookings]);

  const stats = [
    { id: 1, label: "کاربران ثبت‌شده", value: users.length, tone: "neon", icon: "users" },
    { id: 2, label: "جلسات در انتظار", value: pending.length, tone: "violet", icon: "file" },
    { id: 3, label: "پاداش صادرشده", value: rewards.length, tone: "gold", icon: "wallet" },
    { id: 4, label: "رویداد حسابرسی", value: k.state.audit.length, tone: "cyan", icon: "target" },
  ] as const;

  return (
    <AppShell active="dash" items={adminNav} search="جستجو در داشبورد..." userName="مدیر کایار" userRole="مدیر">
      <section className="panel noise relative mb-5 overflow-hidden">
        <img src={IMG.admin} alt="" width={1400} height={400} className="absolute inset-y-0 left-0 h-full w-[62%] object-cover object-left opacity-40" />
        <div className="absolute inset-0 bg-gradient-to-l from-[#101317]/20 via-[#101317]/85 to-[#101317]" />
        <div className="relative flex flex-col gap-2 p-6 lg:p-8">
          <h1 className="t-h1">مدیریت زنده کایار</h1>
          <p className="label-muted">داده‌ها از نشست همین دستگاه می‌آید؛ هر اقدام کاربر اینجا ثبت می‌شود.</p>
        </div>
      </section>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        {stats.map((s, i) => (
          <div key={s.id} style={delay(i, 50)} className="reveal panel card-hover flex flex-col gap-2 p-4">
            <div className="flex items-center justify-between">
              <span className={`grid h-10 w-10 place-items-center rounded-xl border ${
                s.tone === "neon" ? "border-neon/25 bg-neon/10 text-neon" : s.tone === "violet" ? "border-violet/30 bg-violet/12 text-violet-2" : s.tone === "gold" ? "border-gold/25 bg-gold/10 text-gold" : "border-cyan/25 bg-cyan/10 text-cyan"
              }`}>
                <Icon name={s.icon} size={18} />
              </span>
              <span className="label-muted">{s.label}</span>
            </div>
            <p className="num text-[1.5rem] font-extrabold">{toPersianDigits(s.value)}</p>
            <Sparkline values={spark[s.id]} color={sparkColor[s.tone]} />
          </div>
        ))}
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <section className="panel reveal p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="t-h3">رویدادهای هفته</h2>
            <span className="tag">حسابرسی واقعی</span>
          </div>
          {k.state.audit.length === 0 ? (
            <p className="t-body-sm text-muted">هنوز رویدادی ثبت نشده؛ با ورود یا رزرو شروع کنید.</p>
          ) : (
            <KayarBars labels={weekLabels} values={auditSeries} label="رویداد" />
          )}
        </section>

        <section className="panel reveal flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
          <h2 className="t-h3 w-full sm:w-auto">توزیع تخصص رزروها</h2>
          {tagDist.length === 0 ? (
            <p className="t-body-sm flex-1 text-muted">اولین رزرو هنوز ثبت نشده است.</p>
          ) : (
            <>
              <KayarDoughnut data={tagDist} />
              <ul className="flex-1 space-y-2.5">
                {tagDist.map((t) => (
                  <li key={t.label} className="flex items-center gap-2.5">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: t.color }} />
                    <span className="flex-1 text-[0.82rem] font-semibold">{t.label}</span>
                    <span className="num text-[0.82rem] font-bold text-muted">{toPersianDigits(t.value)}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1.35fr_1fr]">
        <section className="panel reveal overflow-hidden">
          <div className="flex items-center justify-between p-5 pb-3">
            <h2 className="t-h3">درخواست‌های جلسه</h2>
            <span className="num label-muted">{toPersianDigits(bookings.length)} مورد</span>
          </div>
          {bookings.length === 0 ? (
            <p className="px-5 pb-5 text-muted">درخواستی نیست.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] text-right">
                <thead>
                  <tr className="border-y border-line text-[0.72rem] text-muted">
                    <th className="p-3 font-semibold">کاربر</th>
                    <th className="p-3 font-semibold">مربی</th>
                    <th className="p-3 font-semibold">زمان</th>
                    <th className="p-3 font-semibold">وضعیت</th>
                    <th className="p-3 font-semibold">عملیات</th>
                  </tr>
                </thead>
                <tbody>
                  {bookings.map((b) => {
                    const u = users.find((x) => x.id === b.userId);
                    return (
                      <tr key={b.id} className="border-b border-line/60 transition hover:bg-white/[0.03]">
                        <td className="p-3 text-[0.8rem] font-bold">{u ? maskPhoneDisplay(toNational(u.phone)) : "—"}</td>
                        <td className="p-3 text-[0.78rem] text-muted">{coaches.find((c) => c.id === b.coachId)?.name}</td>
                        <td className="p-3 text-[0.75rem] text-muted">{b.day} {b.time}</td>
                        <td className="p-3">
                          <span className={`rounded-md border px-2 py-1 text-[0.66rem] font-bold ${statusTone[b.status]}`}>{statusLabel[b.status]}</span>
                        </td>
                        <td className="p-3">
                          {b.status === "pending" ? (
                            <span className="flex gap-1.5">
                              <button type="button" className="btn btn-neon !min-h-8 !px-3 !text-[0.7rem]" onClick={() => k.review(b.id, "approved")}>تایید</button>
                              <button type="button" className="btn btn-ghost !min-h-8 !px-3 !text-[0.7rem]" onClick={() => k.review(b.id, "rejected")}>رد</button>
                            </span>
                          ) : (
                            <span className="text-[0.7rem] text-muted">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="panel reveal p-5">
          <h2 className="t-h3 mb-3">کاربران</h2>
          {users.length === 0 && <p className="text-muted">کاربری ثبت نشده.</p>}
          <ul className="flex flex-col divide-y divide-line">
            {users.map((u) => (
              <li key={u.id} className="flex items-center justify-between gap-2 py-2.5">
                <div>
                  <p className="text-[0.82rem] font-bold">{u.profile.displayName || maskPhoneDisplay(toNational(u.phone))}</p>
                  <p className="num label-muted text-[0.66rem]">{new Date(u.createdAtMs).toLocaleDateString("fa-IR")}</p>
                </div>
                <span className="tag">{u.roles[0]}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section className="panel mt-4 reveal p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="t-h3">گزارش حسابرسی</h2>
          <span className="num label-muted">{toPersianDigits(k.state.audit.length)} رویداد</span>
        </div>
        <ul className="flex flex-col divide-y divide-line">
          {k.state.audit.slice(0, 8).map((a) => (
            <li key={a.id} className="flex items-center gap-3 py-2.5">
              <span className={`h-2 w-2 shrink-0 rounded-full ${a.result === "success" ? "bg-emerald-400" : "bg-red-400"}`} />
              <code className="num text-[0.72rem] text-neon" dir="ltr">{a.action}</code>
              <span className="flex-1 truncate text-[0.75rem] text-muted">{a.resource}</span>
              <span className="num text-[0.68rem] text-muted">{new Date(a.atMs).toLocaleTimeString("fa-IR", { hour: "2-digit", minute: "2-digit" })}</span>
            </li>
          ))}
        </ul>
      </section>

      <KayarLine labels={weekLabels} values={auditSeries} label="رویداد" />
      <p className="label-muted mt-2 mb-6 text-center">نمای خطی همان سری حسابرسی — نمودارها با Chart.js رندر می‌شوند.</p>
    </AppShell>
  );
}
