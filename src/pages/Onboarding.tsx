import { useState } from "react";
import { ProductShell } from "../components/ProductShell";
import { useKayar } from "../app/store";
import { Icon } from "../components/icons";
import type { Goal, Level } from "../app/kernel";

const goals: { id: Goal; label: string; desc: string; icon: "flame" | "dumbbell" | "bolt" | "moon" }[] = [
  { id: "fatloss", label: "کاهش وزن", desc: "چربی‌سوزی پایدار، بدون رژیم افراطی", icon: "flame" },
  { id: "muscle", label: "عضله‌سازی", desc: "قدرت و حجم با پیشروی بار", icon: "dumbbell" },
  { id: "fitness", label: "آمادگی عمومی", desc: "انرژی روزانه و عادت تمرین", icon: "bolt" },
  { id: "flexibility", label: "انعطاف و ریکاوری", desc: "درد کمتر، خواب بهتر", icon: "moon" },
];

const levels: { id: Level; label: string }[] = [
  { id: "beginner", label: "تازه‌کار — کمتر از ۶ ماه" },
  { id: "mid", label: "متوسط — تمرین منظم" },
  { id: "advanced", label: "پیشرفته — برنامه دوره‌ای" },
];

export default function Onboarding() {
  const k = useKayar();
  const [step, setStep] = useState(0);
  const [name, setName] = useState(k.user?.profile.displayName ?? "");
  const [goal, setGoal] = useState<Goal>(k.user?.profile.goal ?? "fitness");
  const [level, setLevel] = useState<Level>(k.user?.profile.level ?? "beginner");
  const [restrictions, setRestrictions] = useState("");
  const [city, setCity] = useState("تهران");

  if (!k.user) {
    window.location.hash = "#/login";
    return null;
  }

  const finish = () => {
    k.saveProfile({ displayName: name.trim() || "ورزشکار کایار", goal, level, restrictions, city, onboarded: true });
    window.location.hash = "#/app";
  };

  return (
    <ProductShell active="profile" search="شخصی‌سازی">
      <div className="mx-auto flex max-w-lg flex-col gap-5">
        <div>
          <p className="t-label text-neon">قدم {["۱", "۲", "۳"][step]} از ۳</p>
          <h1 className="t-h1 mt-1">کایار را برای خودت تنظیم کن</h1>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
            <span className="block h-full bg-neon transition-all" style={{ width: `${((step + 1) / 3) * 100}%` }} />
          </div>
        </div>

        {step === 0 && (
          <div className="flex flex-col gap-3">
            <label className="flex flex-col gap-1.5">
              <span className="t-label text-muted">نام نمایشی</span>
              <input value={name} onChange={(e) => setName(e.target.value)} className="field" placeholder="مثلاً علی" />
            </label>
            <p className="t-label text-muted">هدفت چیست؟</p>
            {goals.map((g) => (
              <button
                key={g.id}
                type="button"
                onClick={() => setGoal(g.id)}
                className={`panel card-hover flex items-center gap-3 p-4 text-right ${goal === g.id ? "border-neon" : ""}`}
              >
                <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl border ${goal === g.id ? "border-neon/40 bg-neon/12 text-neon" : "border-line bg-white/[0.04] text-muted"}`}>
                  <Icon name={g.icon} size={19} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-extrabold">{g.label}</span>
                  <span className="label-muted">{g.desc}</span>
                </span>
                {goal === g.id && <Icon name="check" size={16} className="shrink-0 text-neon" />}
              </button>
            ))}
          </div>
        )}

        {step === 1 && (
          <div className="flex flex-col gap-3">
            {levels.map((l) => (
              <button
                key={l.id}
                type="button"
                onClick={() => setLevel(l.id)}
                className={`panel p-4 text-right font-bold ${level === l.id ? "border-neon text-neon" : ""}`}
              >
                {l.label}
              </button>
            ))}
            <label className="flex flex-col gap-1.5">
              <span className="t-label text-muted">شهر</span>
              <input value={city} onChange={(e) => setCity(e.target.value)} className="field" />
            </label>
          </div>
        )}

        {step === 2 && (
          <label className="flex flex-col gap-2">
            <span className="t-label text-muted">محدودیت یا آسیب (اختیاری)</span>
            <textarea
              value={restrictions}
              onChange={(e) => setRestrictions(e.target.value)}
              rows={4}
              className="field min-h-28 items-start py-3"
              placeholder="مثلاً زانوی راست، بدون پرش"
            />
            <p className="text-[0.75rem] leading-relaxed text-muted">
              این داده فقط برای شخصی‌سازی برنامه استفاده می‌شود و در همین دستگاه می‌ماند.
            </p>
          </label>
        )}

        <div className="flex gap-3">
          {step > 0 && (
            <button type="button" className="btn btn-ghost flex-1" onClick={() => setStep((s) => s - 1)}>
              قبلی
            </button>
          )}
          {step < 2 ? (
            <button type="button" className="btn btn-neon flex-1" onClick={() => setStep((s) => s + 1)}>
              ادامه
            </button>
          ) : (
            <button type="button" className="btn btn-neon flex-1" onClick={finish}>
              ورود به کایار
            </button>
          )}
        </div>
      </div>
    </ProductShell>
  );
}
