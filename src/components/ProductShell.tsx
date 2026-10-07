import { useEffect, useState, type ReactNode } from "react";
import { AppShell } from "./AppShell";
import { Icon } from "./icons";
import { useKayar } from "../app/store";
import { TRACKS } from "../app/kernel";
import { Sheet } from "./ui/overlay";
import { toPersianDigits } from "../modules/auth/phone";

export function ProductShell({
  active,
  search,
  children,
}: {
  active: string;
  search: string;
  children: ReactNode;
}) {
  const k = useKayar();
  const [open, setOpen] = useState(false);
  const [offline, setOffline] = useState(false);
  const [installEvt, setInstallEvt] = useState<Event | null>(null);
  useEffect(() => {
    const down = () => setOffline(true);
    const up = () => setOffline(false);
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setInstallEvt(e);
    };
    setOffline(!navigator.onLine);
    window.addEventListener("offline", down);
    window.addEventListener("online", up);
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => {
      window.removeEventListener("offline", down);
      window.removeEventListener("online", up);
      window.removeEventListener("beforeinstallprompt", onPrompt);
    };
  }, []);
  const notes = k.user ? k.state.notes[k.user.id] ?? [] : [];
  const unread = notes.filter((n) => !n.read).length;
  const role = !k.user
    ? ""
    : k.user.roles.includes("admin")
      ? "مدیر"
      : k.user.roles.includes("coach")
        ? "مربی"
        : "ورزشکار";

  return (
    <>
      <AppShell
        active={active}
        search={search}
        guest={!k.user}
        userName={k.user?.profile.displayName || "ورزشکار کایار"}
        userRole={role}
        notifyCount={unread}
        onNotify={() => {
          setOpen(true);
          k.readNotes();
        }}
      >
        {offline && (
          <div className="mb-4 flex items-center gap-2 rounded-2xl border border-gold/30 bg-gold/10 px-4 py-3 text-[0.82rem] text-gold">
            <Icon name="globe" size={16} />
            آفلاین هستید. پوسته و تصاویر کش‌شده کار می‌کنند؛ اقدامات جدید پس از اتصال ذخیره می‌شوند.
          </div>
        )}
        {installEvt && (
          <button
            type="button"
            className="mb-4 flex w-full items-center justify-between gap-2 rounded-2xl border border-neon/30 bg-neon/10 px-4 py-3 text-[0.82rem] font-bold text-neon transition active:scale-[0.99]"
            onClick={async () => {
              const evt = installEvt as Event & { prompt?: () => Promise<void> };
              await evt.prompt?.();
              setInstallEvt(null);
            }}
          >
            <span className="inline-flex items-center gap-2">
              <Icon name="grid" size={16} />
              کایار را به عنوان اپ نصب کنید — آفلاین هم کار می‌کند.
            </span>
            <Icon name="arrowLeft" size={15} />
          </button>
        )}
        {k.error && (
          <div className="mb-4 flex items-start justify-between gap-3 rounded-2xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-[0.82rem] text-red-200">
            <span>{k.error}</span>
            <button type="button" onClick={k.clearError} className="font-bold text-white">
              بستن
            </button>
          </div>
        )}
        {children}
      </AppShell>
      <PlayerBar />
      <AudioEngine />
      <Sheet open={open} onClose={() => setOpen(false)} title="اعلان‌ها">
        {notes.length === 0 ? (
          <p className="t-body-sm text-muted">هنوز اعلانی ندارید. رزرو، کمپین یا ورود، اینجا ثبت می‌شود.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {notes.map((n) => (
              <li key={n.id} className="rounded-xl border border-line bg-white/[0.03] p-3">
                <p className="text-[0.86rem] font-extrabold">{n.title}</p>
                <p className="mt-1 text-[0.78rem] leading-relaxed text-muted">{n.body}</p>
              </li>
            ))}
          </ul>
        )}
      </Sheet>
    </>
  );
}

function PlayerBar() {
  const k = useKayar();
  const track = TRACKS.find((t) => t.id === k.state.play.trackId);
  if (!track) return null;
  const dur = Math.round(track.minutes * 60);
  const pos = Math.min(dur, k.state.play.positionSec);
  return (
    <div className="glass fixed inset-x-3 bottom-[4.6rem] z-40 flex items-center gap-3 rounded-2xl border border-violet/30 px-3 py-2 shadow-[0_18px_40px_-24px_#6A3DFF] lg:bottom-4 lg:left-auto lg:right-auto lg:mx-auto lg:w-[min(720px,calc(100%-2rem))]">
      <img src={track.image} alt="" width={44} height={44} className="h-11 w-11 rounded-xl object-cover" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[0.82rem] font-extrabold">{track.title}</p>
        <div className="mt-1 h-1 overflow-hidden rounded-full bg-white/10">
          <span className="block h-full bg-violet-2" style={{ width: `${(pos / dur) * 100}%` }} />
        </div>
        <p className="num mt-1 text-[0.65rem] text-muted">
          {toPersianDigits(Math.floor(pos))} / {toPersianDigits(dur)} ثانیه · پیش‌نمایش
        </p>
      </div>
      <button
        type="button"
        className="grid h-11 w-11 place-items-center rounded-full bg-violet text-white"
        aria-label={k.state.play.playing ? "توقف" : "پخش"}
        onClick={() => k.setPlaying(!k.state.play.playing)}
      >
        <Icon name={k.state.play.playing ? "dots" : "play"} size={16} className={k.state.play.playing ? "" : "fill-current"} />
      </button>
      <a href="#/morshed" className="hidden text-[0.75rem] font-bold text-violet-2 sm:inline">
        مرشد
      </a>
    </div>
  );
}

function AudioEngine() {
  const k = useKayar();
  const track = TRACKS.find((t) => t.id === k.state.play.trackId);
  const playing = k.state.play.playing;
  const trackId = track?.id;
  useEffect(() => {
    if (!playing || !track) return;
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "triangle";
    osc.frequency.value = 128 + (track.hue % 40);
    gain.gain.value = 0.028;
    osc.connect(gain);
    gain.connect(ctx.destination);
    void ctx.resume();
    osc.start();
    const dur = track.minutes * 60;
    const started = performance.now() - k.state.play.positionSec * 1000;
    const id = window.setInterval(() => {
      const sec = (performance.now() - started) / 1000;
      if (sec >= dur) {
        k.setPlaying(false);
        k.setPosition(0);
      } else k.setPosition(sec);
    }, 700);
    return () => {
      window.clearInterval(id);
      try {
        osc.stop();
      } catch {
        /* already stopped */
      }
      void ctx.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, trackId]);
  return null;
}

export function RequireUser({ children }: { children: ReactNode }) {
  const { user } = useKayar();
  if (!user) {
    return (
      <div className="panel mx-auto flex max-w-md flex-col items-center gap-4 px-6 py-12 text-center">
        <Icon name="shield" size={28} className="text-neon" />
        <h1 className="t-h2">ورود لازم است</h1>
        <p className="t-body-sm text-muted">این بخش به نشست دستگاه شما وصل است. با شماره موبایل وارد شوید.</p>
        <a href="#/login" className="btn btn-neon">
          ورود با کد یک‌بارمصرف
        </a>
      </div>
    );
  }
  if (!user.profile.onboarded && !window.location.hash.includes("/onboarding")) {
    return (
      <div className="panel mx-auto flex max-w-md flex-col items-center gap-4 px-6 py-12 text-center">
        <h1 className="t-h2">اول هدفت را مشخص کن</h1>
        <p className="t-body-sm text-muted">بدن‌یار و پیشنهادها بدون پروفایل ورزشی ناقص می‌مانند.</p>
        <a href="#/onboarding" className="btn btn-neon">
          شروع شخصی‌سازی
        </a>
      </div>
    );
  }
  return children;
}
