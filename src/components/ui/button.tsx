import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Icon, type IconName } from "../icons";
import { Spinner } from "./feedback";

type Variant = "primary" | "ghost" | "outline" | "outline-neon" | "text";
type Size = "sm" | "md" | "lg";

const VARIANT: Record<Variant, string> = {
  primary: "btn-neon",
  ghost: "btn-ghost",
  outline: "btn-ghost !border-line-2 !bg-transparent hover:!bg-white/5",
  "outline-neon": "btn-outline-neon",
  text: "!min-h-0 !px-0 !rounded-none text-neon hover:!bg-transparent",
};

const SIZE: Record<Size, string> = {
  sm: "!min-h-9 !px-3 !text-[0.8rem]",
  md: "",
  lg: "!min-h-12 !px-7 !text-[0.95rem]",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  /** leading icon (renders on the right in RTL) */
  icon?: IconName;
  /** trailing icon (renders on the left in RTL, e.g. arrows) */
  endIcon?: IconName;
  block?: boolean;
  children: ReactNode;
}

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  icon,
  endIcon,
  block = false,
  className = "",
  disabled,
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      type="button"
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={`btn relative ${VARIANT[variant]} ${SIZE[size]} ${block ? "w-full" : ""} ${
        disabled ? "cursor-not-allowed opacity-50" : ""
      } ${className}`}
      {...rest}
    >
      {loading && <Spinner size={16} className="-ms-1" />}
      {!loading && icon && <Icon name={icon} size={16} />}
      <span className="truncate">{children}</span>
      {!loading && endIcon && <Icon name={endIcon} size={16} />}
    </button>
  );
}

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: IconName;
  label: string;
  size?: Size;
  tone?: "default" | "neon" | "onImage";
}

export function IconButton({
  icon,
  label,
  size = "md",
  tone = "default",
  className = "",
  ...rest
}: IconButtonProps) {
  const box = size === "sm" ? "h-9 w-9" : size === "lg" ? "h-12 w-12" : "h-11 w-11";
  const tones = {
    default: "border-line bg-white/[0.04] text-muted hover:border-neon/45 hover:text-neon",
    neon: "border-neon/40 bg-neon/10 text-neon hover:bg-neon hover:text-black",
    onImage: "border-white/20 bg-black/45 text-white backdrop-blur hover:text-neon",
  }[tone];
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={`grid ${box} shrink-0 place-items-center rounded-xl border transition duration-200 active:scale-95 ${tones} ${className}`}
      {...rest}
    >
      <Icon name={icon} size={size === "lg" ? 20 : 17} />
    </button>
  );
}
