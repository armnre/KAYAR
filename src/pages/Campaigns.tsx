import { ProductShell, RequireUser } from "../components/ProductShell";
import { useKayar } from "../app/store";
import { CAMPAIGNS } from "../app/kernel";
import { Icon } from "../components/icons";
import { toPersianDigits } from "../modules/auth/phone";

export default function Campaigns() {
  return (
    <ProductShell active="campaigns" search="کمپین‌ها">
      <RequireUser>
        <Board />
      </RequireUser>
    </ProductShell>
  );
}

function Board() {
  const k = useKayar();
  const user = k.user!;
  const joined = k.state.campaigns[user.id] ?? [];
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="flex flex-col gap-5">
      <header className="max-w-2xl">
        <p className="t-label text-gold">اسپانسر → تعامل → پاداش</p>
        <h1 className="t-h1 mt-1">کمپین‌ها</h1>
        <p className="t-body-sm text-muted">
          بازی اینجا محصول نیست؛ فقط مکانیک چالش است. عضویت، چک‌این روزانه و دریافت پاداش در دامنه اعمال می‌شود و تکرار همان روز رد می‌شود.
        </p>
      </header>
      <div className="grid gap-4 lg:grid-cols-3">
        {CAMPAIGNS.map((c) => {
          const row = joined.find((j) => j.campaignId === c.id);
          const doneToday = row?.checkins.includes(today);
          const ready = !!row && row.checkins.length >= c.need && !row.claimedAtMs;
          return (
            <article key={c.id} className="panel card-hover flex flex-col overflow-hidden">
              <div className="relative h-40">
                <img src={c.image} alt="" className="h-full w-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0B0E11] to-transparent" />
                <span className="absolute right-3 top-3 rounded-lg border border-gold/40 bg-black/50 px-2 py-1 text-[0.68rem] font-bold text-gold">
                  {c.brand}
                </span>
                <h2 className="absolute inset-x-4 bottom-3 font-extrabold">{c.title}</h2>
              </div>
              <div className="flex flex-1 flex-col gap-3 p-4">
                <p className="t-body-sm text-muted">{c.desc}</p>
                <p className="text-[0.8rem] font-bold text-gold">پاداش: {c.reward}</p>
                <div>
                  <div className="mb-1 flex justify-between text-[0.72rem] text-muted">
                    <span>پیشرفت</span>
                    <span className="num">
                      {toPersianDigits(row?.checkins.length ?? 0)} / {toPersianDigits(c.need)}
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                    <span
                      className="block h-full bg-gold"
                      style={{ width: `${Math.min(100, ((row?.checkins.length ?? 0) / c.need) * 100)}%` }}
                    />
                  </div>
                </div>
                {row && (
                  <div className="flex items-center gap-1" dir="rtl" aria-label="چک‌این‌های ۷ روز اخیر">
                    {Array.from({ length: 7 }, (_, i) => {
                      const d = new Date(Date.now() - (6 - i) * 864e5);
                      const key = d.toISOString().slice(0, 10);
                      const hit = row.checkins.includes(key);
                      const last = i === 6;
                      return (
                        <span
                          key={key}
                          title={d.toLocaleDateString("fa-IR")}
                          className={`grid h-7 flex-1 place-items-center rounded-md border text-[0.58rem] font-bold ${
                            hit ? "border-transparent bg-gold text-black" : last ? "border-dashed border-gold/40 text-gold" : "border-line text-muted/60"
                          }`}
                        >
                          {hit ? "✓" : d.toLocaleDateString("fa-IR", { weekday: "narrow" })}
                        </span>
                      );
                    })}
                  </div>
                )}
                {!row && (
                  <button type="button" className="btn btn-neon mt-auto" onClick={() => k.join(c.id)}>
                    عضویت در کمپین
                  </button>
                )}
                {row && !row.claimedAtMs && (
                  <button type="button" className="btn btn-ghost mt-auto" disabled={doneToday} onClick={() => k.checkin(c.id)}>
                    <Icon name="check" size={15} />
                    {doneToday ? "چک‌این امروز ثبت شد" : "چک‌این امروز"}
                  </button>
                )}
                {ready && (
                  <button type="button" className="btn btn-neon" onClick={() => k.claim(c.id)}>
                    دریافت پاداش
                  </button>
                )}
                {row?.rewardCode && <p className="num text-center text-sm font-extrabold text-neon">{row.rewardCode}</p>}
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
