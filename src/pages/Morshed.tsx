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
  const [expanded, setExpanded] = useState(false);
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

        <ExpandedPlayer open={expanded} onClose={() => setExpanded(false)} />

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
                    <button type="button" className="btn btn-neon flex-1 !bg-violet !text-white" onClick={() => {
                      k.playTrack(t.id);
                      setExpanded(true);
                    }}>
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

function Waveform({ playing }: { playing: boolean }) {
  const bars = useMemo(() => Array.from({ length: 28 }, (_, i) => 0.35 + 0.65 * Math.abs(Math.sin(i * 1.7))), []);
  return (
    <div className="flex h-16 items-center justify-center gap-1" dir="ltr" aria-hidden="true">
      {bars.map((h, i) => (
        <span
          key={i}
          className={`w-1.5 rounded-full bg-violet-2 ${playing ? "animate-pulse" : ""}`}
          style={{
            height: `${h * 100}%`,
            opacity: playing ? 0.9 : 0.35,
            animationDelay: `${i * 90}ms`,
            animationDuration: "1.1s",
          }}
        />
      ))}
    </div>
  );
}

function ExpandedPlayer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const k = useKayar();
  if (!open) return null;
  const track = TRACKS.find((t) => t.id === k.state.play.trackId);
  const queue = k.state.play.queue.length ? k.state.play.queue : TRACKS.map((t) => t.id);
  const idx = track ? queue.indexOf(track.id) : -1;
  const dur = track ? Math.round(track.minutes * 60) : 0;
  const pos = Math.min(dur, k.state.play.positionSec);
  const favs = k.user ? k.state.morshedFav[k.user.id] ?? [] : [];
  const loved = track ? favs.includes(track.id) : false;
  const fmt = (s: number) => {
    const m = Math.floor(s / 60);
    const r = Math.floor(s % 60);
    return `${toPersianDigits(m)}:${toPersianDigits(String(r).padStart(2, "0"))}`;
  };

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-gradient-to-b from-[#150d26] via-[#0b0d12] to-base"
      role="dialog"
      aria-modal="true"
      aria-label="پلیر مرشد"
    >
      <div className="flex items-center justify-between px-4 pt-[max(1rem,env(safe-area-inset-top))]">
        <button type="button" onClick={onClose} className="rounded-xl p-2 text-muted transition hover:text-white" aria-label="بستن پلیر">
          <Icon name="chevronDown" size={22} />
        </button>
        <span className="tag border-violet/40 bg-violet/15 text-violet-2">مرشد</span>
        <span className="w-9" aria-hidden="true" />
      </div>

      {!track ? (
        <div className="flex flex-1 items-center justify-center">
          <p className="t-body-sm text-muted">قطعی برای پخش انتخاب نشده است.</p>
        </div>
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center gap-5 px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
          <div className="relative w-[min(76vw,320px)]">
            <div className={`overflow-hidden rounded-[28px] border border-violet/30 shadow-[0_30px_80px_-40px_#6A3DFF] ${k.state.play.playing ? "" : "saturate-[0.85]"}`}>
              <img src={track.image} alt="" width={320} height={320} className="aspect-square w-full object-cover" />
            </div>
            <div className="absolute -inset-3 -z-10 rounded-[34px] bg-violet/20 blur-2xl" aria-hidden="true" />
          </div>

          <div className="flex flex-col items-center gap-1 text-center">
            <h2 className="t-h2">{track.title}</h2>
            <p className="label-muted">{track.creator} · {track.cat}</p>
          </div>

          <Waveform playing={k.state.play.playing} />

          <div className="w-full max-w-sm" dir="ltr">
            <input
              type="range"
              min={0}
              max={dur}
              value={pos}
              aria-label="پیشرفت پخش"
              onChange={(e) => k.setPosition(Number(e.target.value))}
              className="w-full accent-[#8F6BFF]"
            />
            <div className="num mt-1 flex justify-between text-[0.7rem] text-muted">
              <span>{fmt(pos)}</span>
              <span>{fmt(dur)}</span>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <button
              type="button"
              className="text-muted transition hover:text-white"
              aria-label="قطعه قبلی"
              onClick={() => {
                const prev = queue[(idx - 1 + queue.length) % queue.length];
                k.playTrack(prev);
              }}
            >
              <Icon name="chevronRight" size={26} />
            </button>
            <button
              type="button"
              className="grid h-16 w-16 place-items-center rounded-full bg-violet text-white shadow-[0_18px_50px_-18px_#6A3DFF] transition active:scale-95"
              aria-label={k.state.play.playing ? "توقف" : "پخش"}
              onClick={() => k.setPlaying(!k.state.play.playing)}
            >
              <Icon name={k.state.play.playing ? "dots" : "play"} size={22} className={k.state.play.playing ? "" : "fill-current"} />
            </button>
            <button
              type="button"
              className="text-muted transition hover:text-white"
              aria-label="قطعه بعدی"
              onClick={() => {
                const next = queue[(idx + 1) % queue.length];
                k.playTrack(next);
              }}
            >
              <Icon name="chevronLeft" size={26} />
            </button>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              className={`btn btn-ghost !min-h-11 ${loved ? "text-violet-2" : ""}`}
              aria-pressed={loved}
              onClick={() => k.favTrack(track.id)}
            >
              <Icon name="heart" size={17} className={loved ? "fill-violet-2" : ""} />
              {loved ? "در علاقه‌مندی‌ها" : "علاقه‌مندی"}
            </button>
          </div>
          <p className="text-[0.66rem] text-muted">پیش‌نمایش صوتی تولیدی — در فاز بعد با استریم واقعی جایگزین می‌شود.</p>
        </div>
      )}
    </div>
  );
}
