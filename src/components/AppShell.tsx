import { useEffect, useState, type ReactNode } from "react";
import { Icon, Logo } from "./icons";
import { navItems } from "../lib/data";
import type { IconName } from "./icons";

export type NavItem = { id: string; label: string; icon: IconName; href: string; badge?: string; chevron?: boolean };

export function AppShell({
  active,
  search,
  children,
  items = navItems,
  userName = "علی محمدی",
  userRole = "کاربر عادی",
  guest = false,
  notifyCount = 0,
  onNotify,
}: {
  active: string;
  search: string;
  children: ReactNode;
  items?: NavItem[];
  userName?: string;
  userRole?: string;
  /** no session → show the real sign-in entry instead of a signed-in identity */
  guest?: boolean;
  notifyCount?: number;
  onNotify?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const bottom = [items[0], items[1], items[2], items[3], items[items.length - 1]];
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <div className="min-h-screen bg-base">
      <div className="mx-auto flex min-h-screen w-full max-w-[1560px]">
        {/* main — rendered on the right in RTL */}
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="glass sticky top-0 z-40 border-b border-line">
            <div className="flex items-center gap-3 px-4 py-3 sm:px-6">
              <div className="flex items-center gap-1">
                <button className="btn btn-ghost !min-h-10 !px-2.5 lg:hidden" onClick={() => setOpen(true)} aria-label="باز کردن منو">
                  <Icon name="dots" size={18} />
                </button>
                <button
                  type="button"
                  onClick={onNotify}
                  className="relative hidden rounded-xl p-2 text-muted transition hover:bg-white/5 hover:text-white sm:block"
                  aria-label="اعلان‌ها"
                >
                  <Icon name="bell" size={20} />
                  {notifyCount > 0 && (
                    <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-neon px-1 text-[0.6rem] font-black text-black">
                      {notifyCount > 9 ? "۹+" : notifyCount.toLocaleString("fa-IR")}
                    </span>
                  )}
                </button>
                {guest ? (
                  <a href="#/login" className="btn btn-neon hidden !min-h-10 !px-4 !text-[0.78rem] sm:inline-flex">
                    ورود / ثبت‌نام
                  </a>
                ) : (
                  <div className="hidden items-center gap-2.5 sm:flex">
                    <div className="text-left leading-tight">
                      <p className="text-[0.82rem] font-bold">{userName}</p>
                      <p className="label-muted text-[0.68rem]">{userRole}</p>
                    </div>
                    <img
                      src="/images/coach-male2.jpg"
                      alt=""
                      width={38}
                      height={38}
                      loading="lazy"
                      className="h-9 w-9 rounded-xl object-cover ring-1 ring-line-2"
                    />
                  </div>
                )}
              </div>

              {guest ? (
                <a href="#/login" className="btn btn-neon !min-h-10 !px-3 !text-[0.78rem] sm:hidden">
                  ورود
                </a>
              ) : (
                <button type="button" onClick={onNotify} className="relative rounded-xl p-2 text-muted sm:hidden" aria-label="اعلان‌ها">
                  <Icon name="bell" size={19} />
                  {notifyCount > 0 && <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-neon" />}
                </button>
              )}

              <label className="field order-last w-full flex-1 !bg-surface/70 sm:order-none">
                <Icon name="search" size={17} className="text-muted" />
                <input
                  readOnly
                  aria-label="جستجو"
                  value={search}
                  className="w-full cursor-default bg-transparent text-[0.85rem] text-muted focus:outline-none"
                />
                <Icon name="chevronLeft" size={14} className="hidden text-muted lg:block" />
              </label>

              <button className="rounded-xl p-2 text-muted transition hover:bg-white/5 hover:text-white sm:hidden" aria-label="جستجو">
                <Icon name="search" size={19} />
              </button>
            </div>
          </header>

          <main id="main" className="flex-1 px-4 pb-28 pt-5 sm:px-6 sm:pb-12 lg:px-8">
            {children}
          </main>
        </div>

        {/* sidebar — rendered on the left in RTL */}
        <aside className="sticky top-0 hidden h-screen w-[248px] shrink-0 flex-col justify-between border-e border-line bg-[#0A0D10] px-4 py-6 lg:flex">
          <nav aria-label="ناوبری اصلی" className="flex flex-col gap-1">
            {items.map((it) => (
              <a
                key={it.id}
                href={it.href}
                aria-current={active === it.id ? "page" : undefined}
                className={`nav-item ${active === it.id ? "nav-item-active" : ""}`}
              >
                <Icon name={it.icon} size={19} />
                <span className="flex-1">{it.label}</span>
                {"badge" in it && it.badge && (
                  <span className="num rounded-md border border-line-2 bg-white/5 px-1.5 py-0.5 text-[0.62rem] font-bold text-muted">
                    {it.badge}
                  </span>
                )}
                {"chevron" in it && it.chevron && <Icon name="chevronLeft" size={14} className="text-muted" />}
              </a>
            ))}
          </nav>
          <div className="px-1">
            <Logo size="lg" tagline />
          </div>
        </aside>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true">
          <button className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setOpen(false)} aria-label="بستن منو" />
          <div className="absolute inset-y-0 right-0 w-[78%] max-w-xs border-s border-line bg-[#0A0D10] p-5">
            <div className="mb-6 flex items-center justify-between">
              <Logo size="md" />
              <button onClick={() => setOpen(false)} className="rounded-lg p-2 text-muted hover:text-white" aria-label="بستن">
                <Icon name="chevronRight" size={20} />
              </button>
            </div>
            <nav className="flex flex-col gap-1">
              {items.map((it) => (
                <a
                  key={it.id}
                  href={it.href}
                  onClick={() => setOpen(false)}
                  className={`nav-item ${active === it.id ? "nav-item-active" : ""}`}
                >
                  <Icon name={it.icon} size={19} />
                  {it.label}
                </a>
              ))}
            </nav>
            <div className="mt-8 border-t border-line pt-5">
              <Logo size="sm" tagline />
            </div>
          </div>
        </div>
      )}

      <nav
        aria-label="ناوبری موبایل"
        className="glass fixed inset-x-0 bottom-0 z-40 flex items-stretch justify-around border-t border-line px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-1.5 lg:hidden"
      >
        {bottom.map((it) => {
          const on = active === it.id;
          return (
            <a
              key={it.id}
              href={it.href}
              aria-current={on ? "page" : undefined}
              className={`relative flex min-h-[54px] min-w-[54px] flex-1 flex-col items-center justify-center gap-1 rounded-2xl text-[0.64rem] font-bold transition ${
                on ? "text-neon" : "text-muted active:bg-white/5"
              }`}
            >
              <span
                className={`flex h-7 w-7 items-center justify-center rounded-xl transition-all duration-200 ${
                  on ? "-translate-y-0.5 bg-neon/15 shadow-[0_8px_20px_-10px_#D7FF1F]" : ""
                }`}
              >
                <Icon name={it.icon} size={18} />
              </span>
              {it.label}
              {on && <span className="absolute -top-1.5 h-1 w-6 rounded-full bg-neon" />}
            </a>
          );
        })}
      </nav>
    </div>
  );
}
