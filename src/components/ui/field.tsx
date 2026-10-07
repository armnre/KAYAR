import {
  useId,
  useRef,
  type ChangeEvent,
  type InputHTMLAttributes,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { Icon, type IconName } from "../icons";
import { Spinner } from "./feedback";

/* ------------------------------------------------------------------ */
/* Label / wrapper                                                     */
/* ------------------------------------------------------------------ */
export function FieldLabel({ children, htmlFor }: { children: ReactNode; htmlFor?: string }) {
  return (
    <label htmlFor={htmlFor} className="t-label block text-muted">
      {children}
    </label>
  );
}

export function FieldError({ children }: { children?: ReactNode }) {
  if (!children) return null;
  return (
    <p role="alert" className="flex items-center gap-1.5 text-[0.75rem] font-semibold text-red-300">
      <Icon name="shield" size={13} />
      {children}
    </p>
  );
}

/* ------------------------------------------------------------------ */
/* Input                                                               */
/* ------------------------------------------------------------------ */
export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "size"> {
  label?: string;
  error?: string;
  hint?: string;
  icon?: IconName;
  endAdornment?: ReactNode;
}

export function Input({ label, error, hint, icon, endAdornment, id, className = "", ...rest }: InputProps) {
  const auto = useId();
  const inputId = id ?? auto;
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {label && <FieldLabel htmlFor={inputId}>{label}</FieldLabel>}
      <div className={`field ${error ? "!border-red-400/60" : ""}`}>
        {icon && <Icon name={icon} size={16} className="shrink-0 text-muted" />}
        <input
          id={inputId}
          aria-invalid={!!error || undefined}
          aria-describedby={error ? `${inputId}-err` : undefined}
          className="w-full bg-transparent text-[0.9rem] text-white placeholder:text-muted focus:outline-none"
          {...rest}
        />
        {endAdornment}
      </div>
      {error ? (
        <span id={`${inputId}-err`}>
          <FieldError>{error}</FieldError>
        </span>
      ) : hint ? (
        <span className="text-[0.72rem] text-muted">{hint}</span>
      ) : null}
    </div>
  );
}

export function SearchInput({
  value,
  onChange,
  placeholder = "جستجو...",
  onClear,
  className = "",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  onClear?: () => void;
  className?: string;
}) {
  return (
    <label className={`field ${className}`}>
      <Icon name="search" size={16} className="shrink-0 text-muted" />
      <input
        type="search"
        value={value}
        placeholder={placeholder}
        onChange={(e: ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
        className="w-full bg-transparent text-[0.875rem] text-white placeholder:text-muted focus:outline-none"
      />
      {value && (
        <button
          type="button"
          onClick={onClear ?? (() => onChange(""))}
          aria-label="پاک کردن جستجو"
          className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-muted transition hover:text-white"
        >
          <Icon name="dots" size={14} />
        </button>
      )}
    </label>
  );
}

/* ------------------------------------------------------------------ */
/* Phone input — RTL chrome, LTR digits, caret-safe                    */
/* ------------------------------------------------------------------ */
export function PhoneInput({
  value,
  onChange,
  error,
  label = "شماره موبایل",
  placeholder = "۰۹۱۲۳۴۵۶۷۸۹",
  disabled,
  loading,
}: {
  value: string;
  onChange: (v: string) => void;
  error?: string;
  label?: string;
  placeholder?: string;
  disabled?: boolean;
  loading?: boolean;
}) {
  const id = useId();
  return (
    <div className="flex flex-col gap-1.5">
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <div className={`field ${error ? "!border-red-400/60" : ""}`} dir="ltr">
        <span className="num shrink-0 border-e border-line pe-2 ps-1 text-[0.85rem] font-bold text-muted">
          +98
        </span>
        <input
          id={id}
          type="tel"
          inputMode="tel"
          autoComplete="tel-national"
          dir="ltr"
          lang="fa"
          disabled={disabled}
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          aria-invalid={!!error || undefined}
          className="num w-full bg-transparent text-start text-[0.95rem] tracking-wide text-white placeholder:text-muted/70 focus:outline-none"
        />
        {loading && <Spinner size={16} className="shrink-0 text-muted" />}
      </div>
      <div className="flex items-start justify-between gap-2">
        {error ? <FieldError>{error}</FieldError> : <span className="text-[0.72rem] text-muted">کد تایید به این شماره پیامک می‌شود.</span>}
        <span className="num shrink-0 text-[0.7rem] text-muted/70">0912 345 6789</span>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* OTP input — 6 cells, LTR row, paste + auto-advance                  */
/* ------------------------------------------------------------------ */
export function OtpInput({
  value,
  onChange,
  length = 6,
  disabled,
  error,
  autoFocus,
}: {
  value: string;
  onChange: (v: string) => void;
  length?: number;
  disabled?: boolean;
  error?: string;
  autoFocus?: boolean;
}) {
  const digits = Array.from({ length }, (_, i) => value[i] ?? "");
  const refs = useRef<HTMLInputElement[]>([]);

  const setDigit = (index: number, digit: string) => {
    const next = digits.slice();
    next[index] = digit;
    onChange(next.join("").slice(0, length));
  };

  const handleInput = (index: number) => (e: ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, "");
    if (!raw) return;
    if (raw.length > 1) {
      // paste into one cell → distribute
      onChange(raw.slice(0, length));
      const focusIndex = Math.min(raw.length, length - 1);
      refs.current[focusIndex]?.focus();
      return;
    }
    setDigit(index, raw);
    if (index < length - 1) refs.current[index + 1]?.focus();
  };

  const handleKeyDown = (index: number) => (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      e.preventDefault();
      setDigit(index - 1, "");
      refs.current[index - 1]?.focus();
    }
    if (e.key === "ArrowLeft" && index > 0) refs.current[index - 1]?.focus();
    if (e.key === "ArrowRight" && index < length - 1) refs.current[index + 1]?.focus();
  };

  return (
    <div className="flex flex-col gap-2" dir="ltr">
      <div className="flex justify-center gap-1.5 sm:gap-2.5">
        {digits.map((d, i) => (
          <input
            key={i}
            ref={(el) => {
              if (el) refs.current[i] = el;
            }}
            value={d}
            onChange={handleInput(i)}
            onKeyDown={handleKeyDown(i)}
            disabled={disabled}
            autoFocus={autoFocus && i === 0}
            inputMode="numeric"
            autoComplete={i === 0 ? "one-time-code" : "off"}
            aria-label={`رقم ${i + 1} کد تایید`}
            aria-invalid={!!error || undefined}
            maxLength={1}
            className={`num h-13 min-w-0 flex-1 rounded-xl border bg-white/[0.03] text-center text-lg font-extrabold text-white transition duration-150 focus:outline-none focus:ring-2 focus:ring-neon/40 sm:h-16 sm:max-w-13 sm:text-xl ${
              error ? "border-red-400/60" : d ? "border-neon/50 bg-neon/8" : "border-line"
            } ${disabled ? "opacity-50" : ""}`}
          />
        ))}
      </div>
      <span className="sr-only" aria-live="polite">
        {value.length} از {length} رقم وارد شده
      </span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Select / Checkbox / Radio / Switch                                  */
/* ------------------------------------------------------------------ */
export function Select({
  label,
  value,
  onChange,
  options,
  icon,
}: {
  label?: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  icon?: IconName;
}) {
  const id = useId();
  return (
    <div className="flex flex-col gap-1.5">
      {label && <FieldLabel htmlFor={id}>{label}</FieldLabel>}
      <div className="field relative">
        <select
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full appearance-none bg-transparent text-[0.875rem] font-semibold text-white focus:outline-none"
        >
          {options.map((o) => (
            <option key={o.value} value={o.value} className="bg-surface text-white">
              {o.label}
            </option>
          ))}
        </select>
        {icon && <Icon name={icon} size={15} className="pointer-events-none absolute start-3 text-muted" />}
        <Icon name="chevronDown" size={15} className="pointer-events-none absolute end-3 text-muted" />
      </div>
    </div>
  );
}

export function Checkbox({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="inline-flex min-h-11 cursor-pointer items-center gap-2.5 text-[0.85rem]">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="peer sr-only"
      />
      <span className="grid h-5 w-5 shrink-0 place-items-center rounded-md border border-line-2 bg-white/[0.04] transition peer-checked:border-neon peer-checked:bg-neon">
        {checked && <Icon name="check" size={13} className="text-black" strokeWidth={3} />}
      </span>
      <span className="text-muted peer-checked:text-white">{label}</span>
    </label>
  );
}

export function Radio({
  label,
  name,
  checked,
  onChange,
}: {
  label: string;
  name: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <label className="inline-flex min-h-11 cursor-pointer items-center gap-2.5 text-[0.85rem]">
      <input type="radio" name={name} checked={checked} onChange={onChange} className="peer sr-only" />
      <span className="grid h-5 w-5 place-items-center rounded-full border border-line-2 transition peer-checked:border-neon">
        {checked && <span className="h-2.5 w-2.5 rounded-full bg-neon" />}
      </span>
      <span className={checked ? "text-white" : "text-muted"}>{label}</span>
    </label>
  );
}

export function Switch({
  label,
  checked,
  onChange,
  hint,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  hint?: string;
}) {
  return (
    <label className="flex min-h-11 cursor-pointer items-center justify-between gap-4">
      <span className="flex flex-col">
        <span className="text-[0.875rem] font-bold">{label}</span>
        {hint && <span className="t-caption">{hint}</span>}
      </span>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="peer sr-only" />
      <span className="relative h-6 w-11 shrink-0 rounded-full border border-line-2 bg-white/8 transition peer-checked:border-neon/50 peer-checked:bg-neon/30">
        <span
          className={`absolute top-1/2 h-4 w-4 -translate-y-1/2 rounded-full transition-all ${
            checked ? "start-1/2 -translate-x-full bg-neon" : "start-1 bg-muted"
          }`}
        />
      </span>
    </label>
  );
}
