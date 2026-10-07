import { useEffect, useId, useRef, type ReactNode } from "react";
import { Icon, type IconName } from "../icons";
import { IconButton } from "./button";

/* ------------------------------------------------------------------ */
/* Tabs — RTL aware underline                                          */
/* ------------------------------------------------------------------ */
export interface TabItem {
  id: string;
  label: string;
  icon?: IconName;
}

export function Tabs({
  items,
  value,
  onChange,
  ariaLabel = "بخش‌ها",
}: {
  items: TabItem[];
  value: string;
  onChange: (id: string) => void;
  ariaLabel?: string;
}) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className="flex overflow-x-auto border-b border-line scrollbar-none"
    >
      {items.map((t) => {
        const active = t.id === value;
        return (
          <button
            key={t.id}
            role="tab"
            type="button"
            aria-selected={active}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(t.id)}
            className={`relative flex min-h-11 min-w-fit items-center gap-2 whitespace-nowrap px-4 text-[0.85rem] font-bold transition sm:px-5 ${
              active ? "text-white" : "text-muted hover:text-white/80"
            }`}
          >
            {t.icon && <Icon name={t.icon} size={15} className={active ? "text-neon" : ""} />}
            {t.label}
            {active && <span className="absolute inset-x-3 bottom-0 h-[2px] rounded-full bg-neon" />}
          </button>
        );
      })}
    </div>
  );
}

export function TabPanel({ id, activeId, children }: { id: string; activeId: string; children: ReactNode }) {
  if (id !== activeId) return null;
  return (
    <div role="tabpanel" tabIndex={0} className="focus:outline-none">
      {children}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Dialog (centered, desktop-first)                                    */
/* ------------------------------------------------------------------ */
export function Dialog({
  open,
  onClose,
  title,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    panelRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4" role="dialog" aria-modal="true" aria-labelledby={titleId}>
      <button type="button" className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={onClose} aria-label="بستن" />
      <div
        ref={panelRef}
        tabIndex={-1}
        className="panel relative w-full max-w-md p-5 outline-none !rounded-2xl shadow-[0_40px_80px_-40px_#000]"
      >
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2 id={titleId} className="t-h3">
            {title}
          </h2>
          <IconButton icon="dots" label="بستن" onClick={onClose} />
        </div>
        {children}
        {footer && <div className="mt-5 flex justify-start gap-3">{footer}</div>}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Sheet (bottom sheet, mobile-first)                                  */
/* ------------------------------------------------------------------ */
export function Sheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end" role="dialog" aria-modal="true" aria-labelledby={titleId}>
      <button type="button" className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={onClose} aria-label="بستن" />
      <div className="relative max-h-[88svh] w-full overflow-y-auto rounded-t-3xl border-x border-t border-line bg-surface pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-[0_-30px_60px_-40px_#000]">
        <div className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-line bg-surface/95 px-5 py-4 backdrop-blur">
          <span className="mx-auto block h-1.5 w-10 rounded-full bg-white/15" />
          <IconButton icon="dots" label="بستن" onClick={onClose} className="absolute start-4" />
        </div>
        <div className="px-5 pb-5 pt-4">
          <h2 id={titleId} className="t-h3 mb-3">
            {title}
          </h2>
          {children}
        </div>
      </div>
    </div>
  );
}
