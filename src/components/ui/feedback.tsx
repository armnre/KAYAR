import type { ReactNode } from "react";
import { Icon, type IconName } from "../icons";

export function Spinner({ size = 18, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      className={`animate-spin ${className}`}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export function Skeleton({
  className = "",
  rounded = "rounded-lg",
}: {
  className?: string;
  rounded?: string;
}) {
  return (
    <span
      className={`block animate-pulse bg-gradient-to-l from-white/[0.06] via-white/[0.03] to-white/[0.06] ${rounded} ${className}`}
      aria-hidden="true"
    />
  );
}

export function SkeletonCard() {
  return (
    <div className="panel overflow-hidden">
      <Skeleton className="h-40 w-full !rounded-none" />
      <div className="flex flex-col gap-2.5 p-4">
        <Skeleton className="h-3 w-2/3" />
        <Skeleton className="h-3 w-1/2" />
        <Skeleton className="h-8 w-full" />
      </div>
    </div>
  );
}

export function Divider({ className = "" }: { className?: string }) {
  return <hr className={`border-0 border-t border-line ${className}`} />;
}

export interface StateBlockProps {
  icon: IconName;
  title: string;
  description?: string;
  action?: ReactNode;
  tone?: "muted" | "danger" | "neon";
}

export function StateBlock({ icon, title, description, action, tone = "muted" }: StateBlockProps) {
  const tones = {
    muted: "border-line bg-white/[0.03] text-muted",
    danger: "border-red-400/30 bg-red-400/8 text-red-300",
    neon: "border-neon/30 bg-neon/8 text-neon",
  }[tone];
  return (
    <div
      role="status"
      className={`panel flex flex-col items-center gap-3 px-6 py-10 text-center ${tone !== "muted" ? "border-dashed" : ""}`}
    >
      <span className={`grid h-14 w-14 place-items-center rounded-2xl border ${tones}`}>
        <Icon name={icon} size={24} />
      </span>
      <div className="flex flex-col gap-1.5">
        <h3 className="t-h3">{title}</h3>
        {description && <p className="t-body-sm max-w-sm text-muted">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export const EmptyState = (p: Omit<StateBlockProps, "tone">) => (
  <StateBlock {...p} tone="muted" />
);

export const ErrorState = (p: Omit<StateBlockProps, "tone" | "icon"> & { onRetry?: () => void }) => (
  <StateBlock
    icon="shield"
    tone="danger"
    {...p}
    action={
      p.onRetry ? (
        <button type="button" onClick={p.onRetry} className="btn btn-ghost !min-h-9 !text-[0.8rem]">
          تلاش دوباره
        </button>
      ) : (
        p.action
      )
    }
  />
);

export const OfflineState = (p?: { onRetry?: () => void }) => (
  <StateBlock
    icon="globe"
    tone="danger"
    title="اتصال برقرار نیست"
    description="اینترنت خود را بررسی کنید؛ در صورت بازگشت اتصال، اطلاعات به‌روزرسانی می‌شود."
    action={
      p?.onRetry ? (
        <button type="button" onClick={p.onRetry} className="btn btn-ghost !min-h-9 !text-[0.8rem]">
          تلاش دوباره
        </button>
      ) : undefined
    }
  />
);

export function Progress({ value, max = 100, label }: { value: number; max?: number; label?: string }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <div className="flex items-center justify-between text-[0.75rem]">
          <span className="text-muted">{label}</span>
          <span className="num font-bold">{Math.round(pct)}٪</span>
        </div>
      )}
      <div
        className="h-2 w-full overflow-hidden rounded-full bg-white/8"
        role="progressbar"
        aria-valuenow={Math.round(pct)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label}
      >
        <span
          className="block h-full rounded-full bg-neon transition-[width] duration-700"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export function Badge({
  children,
  tone = "neon",
  className = "",
}: {
  children: ReactNode;
  tone?: "neon" | "violet" | "gold" | "cyan" | "muted" | "success" | "danger";
  className?: string;
}) {
  const tones = {
    neon: "border-neon/30 bg-neon/12 text-neon",
    violet: "border-violet/35 bg-violet/15 text-violet-2",
    gold: "border-gold/30 bg-gold/12 text-gold",
    cyan: "border-cyan/30 bg-cyan/12 text-cyan",
    muted: "border-line bg-white/5 text-muted",
    success: "border-emerald-400/30 bg-emerald-400/12 text-emerald-400",
    danger: "border-red-400/30 bg-red-400/12 text-red-300",
  }[tone];
  return (
    <span className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[0.7rem] font-bold ${tones} ${className}`}>
      {children}
    </span>
  );
}

export function Chip({
  children,
  active = false,
  onClick,
  icon,
  className = "",
}: {
  children: ReactNode;
  active?: boolean;
  onClick?: () => void;
  icon?: IconName;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={onClick ? active : undefined}
      className={`chip ${active ? "chip-active" : ""} ${className}`}
    >
      {icon && <Icon name={icon} size={14} />}
      {children}
    </button>
  );
}

export function Card({
  children,
  as = "div",
  interactive = false,
  className = "",
}: {
  children: ReactNode;
  as?: "div" | "article" | "section";
  interactive?: boolean;
  className?: string;
}) {
  const Tag = as as "div";
  return (
    <Tag className={`panel ${interactive ? "card-hover" : ""} ${className}`}>{children}</Tag>
  );
}

export function Avatar({
  src,
  name,
  size = 40,
  className = "",
}: {
  src?: string;
  name?: string;
  size?: number;
  className?: string;
}) {
  if (src) {
    return (
      <img
        src={src}
        alt={name ?? ""}
        width={size}
        height={size}
        loading="lazy"
        decoding="async"
        style={{ width: size, height: size }}
        className={`shrink-0 rounded-full object-cover ring-1 ring-line-2 ${className}`}
      />
    );
  }
  return (
    <span
      style={{ width: size, height: size }}
      className={`grid shrink-0 place-items-center rounded-full border border-line bg-white/5 text-[0.8rem] font-bold text-muted ${className}`}
      aria-hidden="true"
    >
      {(name ?? "ک").slice(0, 1)}
    </span>
  );
}
