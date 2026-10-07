import { useEffect, type ReactNode } from "react";
import { Icon, type IconName } from "./icons";

/* ------------------------------------------------------------------ */
/* Scroll reveal (single global observer, re-armed per route)          */
/* ------------------------------------------------------------------ */
export function useRevealOnScroll(key: unknown) {
  useEffect(() => {
    const els = Array.from(document.querySelectorAll<HTMLElement>(".reveal:not(.is-in)"));
    if (!("IntersectionObserver" in window)) {
      els.forEach((el) => el.classList.add("is-in"));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-in");
            io.unobserve(entry.target);
          }
        });
      },
      { rootMargin: "0px 0px -6% 0px", threshold: 0.05 }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [key]);
}

export const d = (v: string | number) => String(v);

/** tiny helper for staggered reveal delays */
export const delay = (i: number, step = 60) => ({ "--reveal-delay": `${i * step}ms` } as React.CSSProperties);

/* ------------------------------------------------------------------ */
/* Primitives                                                          */
/* ------------------------------------------------------------------ */
export function Stars({ rating, size = 13 }: { rating: number; size?: number }) {
  return (
    <span className="inline-flex items-center gap-[2px] text-neon" aria-hidden="true">
      {[0, 1, 2, 3, 4].map((i) => (
        <Icon
          key={i}
          name="star"
          size={size}
          className={i < Math.round(rating) ? "fill-neon/90" : "fill-transparent opacity-30"}
        />
      ))}
    </span>
  );
}

export function Rating({
  rating,
  reviews,
  size = "sm",
}: {
  rating: number;
  reviews?: number;
  size?: "sm" | "md";
}) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <Icon name="star" size={size === "sm" ? 13 : 15} className="fill-neon text-neon" />
      <span className={`num font-bold ${size === "sm" ? "text-[0.8rem]" : "text-base"}`}>{rating}</span>
      {reviews !== undefined && (
        <span className="num label-muted">({reviews.toLocaleString("fa-IR")})</span>
      )}
    </span>
  );
}

const tones = {
  neon: "bg-neon/12 text-neon border-neon/25",
  violet: "bg-violet/16 text-violet-2 border-violet/30",
  cyan: "bg-cyan/12 text-cyan border-cyan/25",
  gold: "bg-gold/12 text-gold border-gold/25",
  muted: "bg-white/5 text-muted border-line",
} as const;

export type Tone = keyof typeof tones;

export function ToneIcon({
  name,
  tone = "neon",
  size = 20,
  box = "h-10 w-10 rounded-xl",
}: {
  name: IconName;
  tone?: Tone;
  size?: number;
  box?: string;
}) {
  return (
    <span className={`inline-flex shrink-0 items-center justify-center border ${box} ${tones[tone]}`}>
      <Icon name={name} size={size} />
    </span>
  );
}

export function SectionHead({
  title,
  action,
  onAction,
  eyebrow,
}: {
  title: string;
  action?: string;
  onAction?: () => void;
  eyebrow?: string;
}) {
  return (
    <div className="mb-4 flex items-center justify-between gap-4">
      <div>
        {eyebrow && <p className="mb-1 text-[0.7rem] font-bold tracking-widest text-neon">{eyebrow}</p>}
        <h2 className="text-lg font-extrabold sm:text-xl">{title}</h2>
      </div>
      {action && (
        <button
          onClick={onAction}
          className="group inline-flex items-center gap-1 text-[0.82rem] font-bold text-neon transition hover:gap-2"
        >
          {action}
          <Icon name="chevronLeft" size={16} className="transition group-hover:-translate-x-0.5" />
        </button>
      )}
    </div>
  );
}

export function StatusDot({ online = true }: { online?: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[0.72rem] font-bold">
      <span
        className={`pulse-dot h-1.5 w-1.5 rounded-full ${online ? "bg-emerald-400" : "bg-muted"}`}
      />
      <span className={online ? "text-emerald-400" : "text-muted"}>{online ? "آنلاین" : "آفلاین"}</span>
    </span>
  );
}

export function Badge({ children, tone = "neon" }: { children: ReactNode; tone?: Tone }) {
  return (
    <span
      className={`rounded-lg border px-2 py-1 text-[0.68rem] font-bold backdrop-blur-sm ${tones[tone]} bg-black/45`}
    >
      {children}
    </span>
  );
}

export function Crumbs({ items }: { items: string[] }) {
  return (
    <nav aria-label="مسیر" className="flex items-center gap-2 text-[0.78rem] text-muted">
      {items.map((it, i) => (
        <span key={it} className="flex items-center gap-2">
          <span className={i === items.length - 1 ? "text-white" : ""}>{it}</span>
          {i < items.length - 1 && <span className="text-line-2">/</span>}
        </span>
      ))}
    </nav>
  );
}

/* ------------------------------------------------------------------ */
/* Charts                                                             */
/* ------------------------------------------------------------------ */
export function Sparkline({
  values,
  color = "#D7FF1F",
  className = "",
}: {
  values: number[];
  color?: string;
  className?: string;
}) {
  const max = Math.max(...values);
  const min = Math.min(...values);
  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * 100;
    const y = 30 - ((v - min) / Math.max(1, max - min)) * 26 - 2;
    return `${x},${y}`;
  });
  return (
    <svg viewBox="0 0 100 30" preserveAspectRatio="none" className={`h-9 w-full ${className}`} aria-hidden="true">
      <polyline
        points={pts.join(" ")}
        fill="none"
        stroke={color}
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
      {pts.map((p, i) => {
        const [x, y] = p.split(",");
        return <circle key={i} cx={x} cy={y} r="1.1" fill={color} vectorEffect="non-scaling-stroke" />;
      })}
    </svg>
  );
}

export function AreaChart({ values }: { values: { label: string; v: number }[] }) {
  const max = Math.max(...values.map((v) => v.v)) * 1.15;
  const W = 700;
  const H = 190;
  const pts = values.map((s, i) => [
    (i / (values.length - 1)) * W,
    H - (s.v / max) * H,
  ]);
  const line = pts.map((p) => p.join(",")).join(" ");
  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="h-44 w-full" aria-hidden="true">
        <defs>
          <linearGradient id="kayar-area" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#D7FF1F" stopOpacity="0.42" />
            <stop offset="100%" stopColor="#D7FF1F" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75].map((g) => (
          <line key={g} x1="0" x2={W} y1={H * g} y2={H * g} stroke="#242A31" strokeWidth="1" />
        ))}
        <polygon points={`0,${H} ${line} ${W},${H}`} fill="url(#kayar-area)" />
        <polyline
          points={line}
          fill="none"
          stroke="#D7FF1F"
          strokeWidth="2.4"
          strokeLinejoin="round"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
        {pts.map((p, i) => (
          <circle key={i} cx={p[0]} cy={p[1]} r="4" fill="#0A0C0E" stroke="#D7FF1F" strokeWidth="2" />
        ))}
      </svg>
      <div className="mt-2 flex justify-between text-[0.68rem] text-muted">
        {values.map((s) => (
          <span key={s.label}>{s.label}</span>
        ))}
      </div>
    </div>
  );
}

export function Donut({ data }: { data: { label: string; value: number; color: string }[] }) {
  const total = data.reduce((a, b) => a + b.value, 0);
  const R = 54;
  const C = 2 * Math.PI * R;
  let acc = 0;
  return (
    <div className="relative h-[150px] w-[150px]">
      <svg viewBox="0 0 140 140" className="h-full w-full -rotate-90">
        <circle cx="70" cy="70" r={R} fill="none" stroke="#171B21" strokeWidth="16" />
        {data.map((s) => {
          const len = (s.value / total) * C;
          const el = (
            <circle
              key={s.label}
              cx="70"
              cy="70"
              r={R}
              fill="none"
              stroke={s.color}
              strokeWidth="16"
              strokeDasharray={`${len - 3} ${C - len + 3}`}
              strokeDashoffset={-acc}
              strokeLinecap="round"
            />
          );
          acc += len;
          return el;
        })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="num text-xl font-extrabold">۱۲,۴۸۲</span>
        <span className="label-muted text-[0.68rem]">بازدید کل</span>
      </div>
    </div>
  );
}

export function Ring({ value = 78, label = "۴۸", sub = "از ۱۰۰" }: { value?: number; label?: string; sub?: string }) {
  const R = 52;
  const C = 2 * Math.PI * R;
  return (
    <div className="relative h-[140px] w-[140px]">
      <svg viewBox="0 0 130 130" className="h-full w-full -rotate-90">
        <circle cx="65" cy="65" r={R} fill="none" stroke="#1B1F25" strokeWidth="11" />
        <circle
          cx="65"
          cy="65"
          r={R}
          fill="none"
          stroke="#D7FF1F"
          strokeWidth="11"
          strokeLinecap="round"
          strokeDasharray={`${(value / 100) * C} ${C}`}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="num text-2xl font-extrabold text-neon">{label}</span>
        <span className="label-muted text-[0.7rem]">{sub}</span>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Phone frame (mobile screen showcase)                                */
/* ------------------------------------------------------------------ */
export function PhoneFrame({
  children,
  label,
  activeTab = "خانه",
  className = "",
}: {
  children: ReactNode;
  label?: string;
  activeTab?: string;
  className?: string;
}) {
  return (
    <figure className={`flex flex-col items-center gap-4 ${className}`}>
      <div className="relative w-full max-w-[268px] rounded-[2.4rem] border border-line-2 bg-[#0B0D10] p-2 shadow-[0_30px_60px_-30px_rgba(0,0,0,1)] transition duration-500 hover:-translate-y-2 hover:border-neon/40">
        <div className="relative h-[540px] overflow-hidden rounded-[1.9rem] bg-base">
          {/* status bar */}
          <div className="flex items-center justify-between px-5 pt-2.5 text-[0.62rem] text-white/80">
            <span className="num font-bold">۹:۴۱</span>
            <span className="absolute left-1/2 top-2 h-4 w-16 -translate-x-1/2 rounded-full bg-black" />
            <span className="flex items-center gap-1" aria-hidden="true">
              <span className="h-2 w-3 rounded-[2px] bg-white/70" />
              <span className="h-2 w-2 rounded-full bg-white/70" />
              <span className="h-2 w-4 rounded-[2px] bg-white/70" />
            </span>
          </div>
          <div className="h-[calc(100%-1.75rem)] overflow-hidden">{children}</div>
          {/* bottom nav */}
          <div className="absolute inset-x-0 bottom-0 flex items-center justify-around border-t border-line bg-[#0B0D10]/95 px-1 pb-3 pt-2 backdrop-blur">
            {[
              { n: "خانه", i: "home" as IconName },
              { n: "جستجو", i: "search" as IconName },
              { n: "مربیان", i: "dumbbell" as IconName },
              { n: "پروفایل", i: "user" as IconName },
            ].map((t) => (
              <span
                key={t.n}
                className={`flex flex-col items-center gap-1 text-[0.6rem] font-bold ${
                  t.n === activeTab ? "text-neon" : "text-muted"
                }`}
              >
                <Icon name={t.i} size={17} />
                {t.n}
              </span>
            ))}
          </div>
        </div>
      </div>
      {label && (
        <figcaption className="text-center text-[0.82rem] font-bold text-white/85">
          {label}
        </figcaption>
      )}
    </figure>
  );
}
