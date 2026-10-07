import { useMemo, useState } from "react";
import { ProductShell } from "../components/ProductShell";
import { useKayar } from "../app/store";
import { TRACKS } from "../app/kernel";
import { Icon } from "../components/icons";
import { toPersianDigits } from "../modules/auth/phone";

const cats = ["همه", "ذهن", "ریتم", "تغذیه", "زندگی"];

export default function Morshed() {
  const k = useKayar();
  const [cat, setCat] = useState("همه");
  const [q, setQ] = useState("");
  const [onlyFav, setOnlyFav] = useState(false);
  const favs = k.user ? k.state.morshedFav[k.user.id] ?? [] : [];
  const history = k.user ? k.state.morshedHistory[k.user.id] ?? [] : [];
  const list = useMemo(
    () =>
      TRACKS.filter(
        (t) =>
          (cat === "همه" || t.cat === cat) &&
          (!onlyFav || favs.includes(t.id)) &&
          (q === "" || t.title.includes(q) || t.creator.includes(q)),
      ),
    [cat, q, onlyFav, favs],
  );

  return (
    <ProductShell active="morshed" search="جستجو در مرشد">
      <div className="flex flex-col gap-5">
        <section className="panel relative overflow-hidden">
          <img src="/images/morshed.jpg" alt="" className="absolute inset-0 h-full w-full object-cover opacity-40" />
          <div className="absolute inset-0 bg-gradient-to-l from-[#12091f]/30 via-[#12091f]/80 to-[#0c0f12]" />
          <div className="relative flex flex-col gap-3 p-6 sm:p-8">
            <span className="w-fit rounded-lg bg-violet px-2 py-0.5 text-[0.7rem] font-black text-white">AUDIO</span>
            <h1 className="t-h1">مرشد</h1>
            <p className="t-body-sm max-w-xl text-white/75">
              پادکست و ریتم تمرین. پلیر پایدار است؛ علاقه‌مندی و تاریخچه به حساب شما وصل می‌شود. فایل‌ها نسخه کوتاه تولیدی هستند تا پخش بدون سرور خارجی کار کند.
            </p>
          </div>
        </section>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <label className="field flex-1">
            <Icon name="search" size={16} className="text-muted" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="جستجوی قسمت..."
              className="w-full bg-transparent text-[0.85rem] focus:outline-none"
              aria-label="جستجوی مرشد"
            />
          </label>
          <div className="flex flex-wrap gap-2">
            {cats.map((c) => (
              <button key={c} type="button" onClick={() => setCat(c)} className={`chip ${cat === c ? "chip-active" : ""}`}>
                {c}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setOnlyFav((v) => !v)}
              aria-pressed={onlyFav}
              className={`chip ${onlyFav ? "chip-active" : ""}`}
            >
              <Icon name="heart" size={13} className={onlyFav ? "fill-current" : ""} />
              علاقه‌مندی‌ها
            </button>
          </div>
        </div>

        {history.length > 0 && (
          <section>
            <h2 className="t-h3 mb-3">ادامه گوش دادن</h2>
            <div className="rail">
              {history.map((h) => {
                const t = TRACKS.find((x) => x.id === h.trackId);
                if (!t) return null;
                return (
                  <button
                    key={h.trackId}
                    type="button"
                    onClick={() => k.playTrack(t.id)}
                    className="panel card-hover flex w-56 items-center gap-3 p-2.5 text-right"
                  >
                    <img src={t.image} alt="" width={56} height={42} className="h-10 w-14 rounded-lg object-cover" />
                    <span className="min-w-0">
                      <span className="block truncate text-[0.8rem] font-extrabold">{t.title}</span>
                      <span className="num label-muted text-[0.65rem]">
                        {toPersianDigits(Math.round(h.positionSec))} ثانیه گذشته
                      </span>
                    </span>
                    <Icon name="play" size={14} className="shrink-0 text-violet-2" />
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {list.length === 0 && <p className="panel p-6 text-center text-muted">نتیجه‌ای برای این فیلتر نیست.</p>}

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {list.map((t) => {
            const active = k.state.play.trackId === t.id;
            const loved = favs.includes(t.id);
            return (
              <article key={t.id} className={`panel card-hover overflow-hidden ${active ? "border-violet/50" : ""}`}>
                <div className="relative h-36">
                  <img src={t.image} alt="" className="h-full w-full object-cover" />
                  <span className="absolute right-3 top-3 rounded-lg border border-violet/40 bg-black/50 px-2 py-1 text-[0.68rem] font-bold text-violet-2">
                    {t.cat}
                  </span>
                </div>
                <div className="flex flex-col gap-2 p-4">
                  <h2 className="font-extrabold">{t.title}</h2>
                  <p className="label-muted">{t.creator}</p>
                  <p className="num text-[0.72rem] text-muted">{toPersianDigits(Math.round(t.minutes * 60))} ثانیه پیش‌نمایش</p>
                  <div className="mt-1 flex items-center gap-2">
                    <button type="button" className="btn btn-neon flex-1 !bg-violet !text-white" onClick={() => k.playTrack(t.id)}>
                      <Icon name="play" size={15} className="fill-current" />
                      پخش
                    </button>
                    <button
                      type="button"
                      className={`btn btn-ghost !px-3 ${loved ? "text-violet-2" : ""}`}
                      aria-label="علاقه‌مندی"
                      onClick={() => k.favTrack(t.id)}
                    >
                      <Icon name="heart" size={16} className={loved ? "fill-violet-2" : ""} />
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </ProductShell>
  );
}
