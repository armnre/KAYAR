import { useState } from "react";
import { ProductShell, RequireUser } from "../components/ProductShell";
import { useKayar } from "../app/store";
import { CAMPAIGNS } from "../app/kernel";
import { coaches } from "../lib/data";
import { Icon } from "../components/icons";
import { Tabs } from "../components/ui/overlay";
import { toPersianDigits } from "../modules/auth/phone";
import { can } from "../modules/rbac/permissions";
import { toActor } from "../app/kernel";

const tabs = [
  { id: "account", label: "حساب" },
  { id: "activity", label: "فعالیت" },
  { id: "rewards", label: "پاداش" },
  { id: "settings", label: "تنظیمات" },
];

export default function Profile() {
  return (
    <ProductShell active="profile" search="پروفایل">
      <RequireUser>
        <Body />
      </RequireUser>
    </ProductShell>
  );
}

function Body() {
  const k = useKayar();
  const user = k.user!;
  const [tab, setTab] = useState("account");
  const [name, setName] = useState(user.profile.displayName);
  const [weight, setWeight] = useState(user.profile.weightKg ? String(user.profile.weightKg) : "");
  const bookings = k.state.bookings.filter((b) => b.userId === user.id);
  const rewards = (k.state.campaigns[user.id] ?? []).filter((c) => c.rewardCode);
  const admin = can(toActor(user), "coaches.approve");
  const pending = k.state.bookings.filter((b) => b.status === "pending");

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      <header className="panel flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
        <img src="/images/coach-male2.jpg" alt="" width={72} height={72} className="h-[72px] w-[72px] rounded-2xl object-cover" />
        <div className="min-w-0 flex-1">
          <h1 className="t-h2">{user.profile.displayName || "ورزشکار کایار"}</h1>
          <p className="label-muted mt-1">{user.roles.join(" · ")} · نشست دستگاه</p>
        </div>
        <button type="button" className="btn btn-ghost" onClick={k.signOut}>
          <Icon name="logout" size={16} />
          خروج
        </button>
      </header>

      <div className="panel">
        <Tabs items={tabs} value={tab} onChange={setTab} ariaLabel="بخش‌های پروفایل" />
        <div className="p-5">
          {tab === "account" && (
            <form
              className="flex flex-col gap-3"
              onSubmit={(e) => {
                e.preventDefault();
                k.saveProfile({
                  displayName: name.trim() || user.profile.displayName,
                  weightKg: weight ? Number(weight) : null,
                });
              }}
            >
              <label className="flex flex-col gap-1.5">
                <span className="t-label text-muted">نام</span>
                <input className="field" value={name} onChange={(e) => setName(e.target.value)} />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="t-label text-muted">وزن (کیلوگرم)</span>
                <input className="field" inputMode="decimal" value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="مثلاً ۷۸" />
              </label>
              <p className="text-[0.75rem] text-muted">شناسه: {user.id} · نقش‌ها از شماره موبایل تعیین می‌شوند، نه از این فرم.</p>
              <button className="btn btn-neon w-fit" type="submit">
                ذخیره
              </button>
            </form>
          )}

          {tab === "activity" && (
            <ul className="flex flex-col gap-2">
              {bookings.length === 0 && <li className="text-muted">هنوز جلسه‌ای نخواسته‌اید.</li>}
              {bookings.map((b) => {
                const coach = coaches.find((c) => c.id === b.coachId);
                return (
                  <li key={b.id} className="flex items-center justify-between gap-3 rounded-xl border border-line p-3">
                    <div>
                      <p className="font-extrabold">{coach?.name ?? "مربی"}</p>
                      <p className="label-muted">
                        {b.day} · {b.time}
                      </p>
                    </div>
                    <span className={`tag ${b.status === "approved" ? "text-neon" : b.status === "rejected" ? "text-red-300" : "text-gold"}`}>
                      {b.status === "approved" ? "تایید" : b.status === "rejected" ? "رد" : "در انتظار"}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}

          {tab === "rewards" && (
            <ul className="flex flex-col gap-2">
              {rewards.length === 0 && <li className="text-muted">پاداشی دریافت نشده. از کمپین‌ها شروع کنید.</li>}
              {rewards.map((r) => {
                const spec = CAMPAIGNS.find((c) => c.id === r.campaignId);
                return (
                  <li key={r.campaignId} className="rounded-xl border border-gold/30 bg-gold/8 p-3">
                    <p className="font-extrabold">{spec?.reward}</p>
                    <p className="num mt-1 text-gold">{r.rewardCode}</p>
                  </li>
                );
              })}
            </ul>
          )}

          {tab === "settings" && (
            <div className="flex flex-col gap-3 text-[0.86rem] leading-relaxed text-muted">
              <p>اعلان درون‌برنامه فعال است. پوش و پیامک به ارائه‌دهنده واقعی وصل نیستند.</p>
              <p>نشست با خروج یا انقضای ۷ روزه باطل می‌شود. «خروج» همین دستگاه را لغو می‌کند.</p>
              <p>
                شماره مدیر آزمایشی: ۰۹۱۲۱۱۱۱۱۱۱ · شماره مربی: ۰۹۱۲۲۲۲۲۲۲۲. کد از کانال توسعه پیامک روی صفحه ورود دیده می‌شود.
              </p>
              {admin && (
                <a href="#/admin" className="btn btn-outline-neon w-fit">
                  پنل مدیریت
                </a>
              )}
            </div>
          )}
        </div>
      </div>

      {admin && (
        <section className="panel p-5">
          <h2 className="t-h3 mb-3">تایید جلسات — فقط مدیر</h2>
          {pending.length === 0 && <p className="text-muted">درخواست معلقی نیست.</p>}
          <ul className="flex flex-col gap-2">
            {pending.map((b) => (
              <li key={b.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line p-3">
                <span className="text-[0.82rem]">
                  {coaches.find((c) => c.id === b.coachId)?.name} · {b.day} {b.time}
                  <span className="label-muted block">{b.note || "بدون توضیح"}</span>
                </span>
                <span className="flex gap-2">
                  <button type="button" className="btn btn-neon !min-h-9" onClick={() => k.review(b.id, "approved")}>
                    تایید
                  </button>
                  <button type="button" className="btn btn-ghost !min-h-9" onClick={() => k.review(b.id, "rejected")}>
                    رد
                  </button>
                </span>
              </li>
            ))}
          </ul>
          <p className="label-muted mt-3">اقدامات مدیر در گزارش حسابرسی محلی ثبت می‌شود ({toPersianDigits(k.state.audit.length)} رویداد).</p>
        </section>
      )}
    </div>
  );
}
