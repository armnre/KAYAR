import { forwardRef, useEffect, useRef, useState, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, Eye, EyeOff, Check, X, Copy, type LucideIcon } from 'lucide-react';
import { cn } from '@project/components/lib/utils';
import { fa } from '../lib/config';

export function KayarLogo({ className, mark = true }: { className?: string; mark?: boolean }) {
  return (
    <span className={cn('inline-flex items-center gap-2 font-latin font-extrabold tracking-[0.12em] text-foreground', className)} dir="ltr">
      {mark && (
        <svg viewBox="0 0 32 32" className="h-[1.4em] w-[1.4em]" aria-hidden>
          <rect width="32" height="32" rx="9" fill="hsl(var(--primary))" />
          <path d="M10 8v16M10 16l9-8M13 13.5 21 24" stroke="hsl(var(--primary-foreground))" strokeWidth="3.2" strokeLinecap="round" fill="none" />
        </svg>
      )}
      KAYAR
    </span>
  );
}

type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'outline' | 'ghost' | 'danger'; size?: 'md' | 'lg' | 'sm'; loading?: boolean; to?: string };
const btnBase = 'press tap inline-flex items-center justify-center gap-2 rounded-full font-bold transition-colors disabled:opacity-50 disabled:pointer-events-none select-none';
const btnVar = {
  primary: 'shine bg-primary text-primary-foreground hover:bg-lime-hi glow',
  outline: 'border border-white/15 text-foreground hover:bg-white/5 hover:border-white/30',
  ghost: 'text-foreground hover:bg-white/5',
  danger: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
};
const btnSize = { sm: 'h-11 px-4 text-sm', md: 'h-12 px-6 text-[15px]', lg: 'h-14 px-8 text-base' };

export const KButton = forwardRef<HTMLButtonElement, BtnProps>(function KButton({ variant = 'primary', size = 'md', loading, className, children, to, ...rest }, ref) {
  const cls = cn(btnBase, btnVar[variant], btnSize[size], className);
  if (to) return <Link to={to} className={cls}>{children}</Link>;
  return (
    <button ref={ref} className={cls} disabled={loading || rest.disabled} aria-busy={loading} {...rest}>
      {loading && <Loader2 className="h-4 w-4 animate-spin" />}
      <span className="relative z-10 inline-flex items-center gap-2">{children}</span>
    </button>
  );
});

export const SampleBadge = ({ className }: { className?: string }) => (
  <span className={cn('inline-flex items-center rounded-full border border-gold/40 bg-gold/10 px-2.5 py-0.5 text-xs font-bold text-gold', className)}>نمونه</span>
);

export function Glass({ className, active, children, ...rest }: React.HTMLAttributes<HTMLDivElement> & { active?: boolean }) {
  return <div className={cn('glass rounded-[28px]', active && 'glass-active', className)} {...rest}>{children}</div>;
}

export function IconBox({ icon: Icon, tone = 'lime', className }: { icon: LucideIcon; tone?: 'lime' | 'violet' | 'cyan' | 'gold'; className?: string }) {
  const t = { lime: 'bg-primary/15 text-primary', violet: 'bg-violet/20 text-[hsl(254_100%_78%)]', cyan: 'bg-cyan/15 text-cyan', gold: 'bg-gold/15 text-gold' }[tone];
  return <span className={cn('grid h-12 w-12 shrink-0 place-items-center rounded-2xl', t, className)}><Icon className="h-6 w-6" strokeWidth={2} /></span>;
}

export function Waveform({ bars = 24, playing = true, className, color = 'bg-primary' }: { bars?: number; playing?: boolean; className?: string; color?: string }) {
  return (
    <div className={cn('flex h-8 items-center gap-[3px]', className)} aria-hidden>
      {Array.from({ length: bars }).map((_, i) => (
        <span key={i} className={cn('w-[3px] rounded-full', color)} style={{ height: '100%', transformOrigin: 'center', transform: `scaleY(${0.3 + ((i * 37) % 70) / 100})`, animation: playing ? `wave ${0.8 + (i % 5) * 0.15}s ease-in-out ${i * 0.05}s infinite` : 'none' }} />
      ))}
    </div>
  );
}

export function ProgressRing({ value, size = 72, stroke = 7, color = 'hsl(var(--primary))', children }: { value: number; size?: number; stroke?: number; color?: string; children?: ReactNode }) {
  const r = (size - stroke) / 2, c = 2 * Math.PI * r;
  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }} role="img" aria-label={`${fa(value)} درصد`}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke="hsl(0 0% 100% / .08)" strokeWidth={stroke} fill="none" />
        <circle cx={size / 2} cy={size / 2} r={r} stroke={color} strokeWidth={stroke} fill="none" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - value / 100)} style={{ transition: 'stroke-dashoffset 700ms var(--ease)' }} />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">{children}</div>
    </div>
  );
}

export function Sparkline({ data, color = 'hsl(var(--primary))' }: { data: number[]; color?: string }) {
  const max = Math.max(...data), min = Math.min(...data);
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * 100},${30 - ((v - min) / (max - min || 1)) * 26}`).join(' ');
  return <svg viewBox="0 0 100 32" className="h-10 w-full" preserveAspectRatio="none" aria-hidden><polyline points={pts} fill="none" stroke={color} strokeWidth="2" vectorEffect="non-scaling-stroke" /></svg>;
}

export function StateView({ icon: Icon, title, text, action, tone = 'lime' }: { icon: LucideIcon; title: string; text?: string; action?: ReactNode; tone?: 'lime' | 'violet' | 'cyan' | 'gold' }) {
  return (
    <div className="relative mx-auto flex max-w-sm flex-col items-center px-4 py-12 text-center">
      <div className="relative mb-5 grid h-28 w-28 place-items-center">
        <span className="absolute inset-0 rounded-full border border-dashed border-white/15 animate-spin-slow" />
        <span className="absolute inset-4 rounded-full bg-primary/10 blur-xl" />
        <IconBox icon={Icon} tone={tone} className="h-16 w-16 rounded-3xl" />
      </div>
      <h3 className="text-lg font-extrabold">{title}</h3>
      {text && <p className="mt-1 text-sm text-muted-foreground">{text}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function StatusBadge({ status }: { status: 'active' | 'pending' | 'suspended' | 'draft' | 'published' }) {
  const m = { active: ['فعال', 'bg-primary/15 text-primary'], pending: ['منتظر اولین ورود', 'bg-gold/15 text-gold'], suspended: ['تعلیق', 'bg-destructive/15 text-destructive'], draft: ['پیش‌نویس', 'bg-white/10 text-muted-foreground'], published: ['منتشرشده', 'bg-cyan/15 text-cyan'] }[status];
  return <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold', m[1])}><span className="h-1.5 w-1.5 rounded-full bg-current" />{m[0]}</span>;
}

/* PasswordField with optional strength meter + rules */
const common = ['12345678', 'password', '123456789', 'qwerty123', '11111111', '1234567890', 'kapoosh123'];
export function passwordRules(pw: string, username = '') {
  return [
    { ok: pw.length >= 8, label: 'حداقل ۸ نویسه' },
    { ok: !!pw && pw !== username && !(username && pw.includes(username)), label: 'متفاوت با نام کاربری یا شماره' },
    { ok: !!pw && !common.includes(pw.toLowerCase()), label: 'جزو رمزهای رایج نباشد' },
    { ok: /\d/.test(pw) && /[a-zA-Z\u0600-\u06FF]/.test(pw), label: 'ترکیب حرف و عدد' },
  ];
}
export function PasswordField({ label, value, onChange, autoComplete, error, meter, username, id }: { label: string; value: string; onChange: (v: string) => void; autoComplete: string; error?: string; meter?: boolean; username?: string; id: string }) {
  const [show, setShow] = useState(false);
  const rules = passwordRules(value, username);
  const score = rules.filter((r) => r.ok).length;
  return (
    <div>
      <FloatInput id={id} label={label} type={show ? 'text' : 'password'} value={value} onChange={onChange} autoComplete={autoComplete} error={error} dir="ltr"
        trailing={<button type="button" onClick={() => setShow((s) => !s)} className="tap grid place-items-center rounded-full text-muted-foreground hover:text-foreground" aria-label={show ? 'مخفی کردن رمز' : 'نمایش رمز'}>{show ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}</button>} />
      {meter && (
        <div className="mt-3 space-y-2">
          <div className="flex gap-1.5" aria-label={`قدرت رمز: ${['خیلی ضعیف', 'ضعیف', 'متوسط', 'خوب', 'قوی'][score]}`}>
            {[0, 1, 2, 3].map((i) => <span key={i} className={cn('h-1.5 flex-1 rounded-full transition-colors', i < score ? (score < 2 ? 'bg-destructive' : score < 4 ? 'bg-gold' : 'bg-primary') : 'bg-white/10')} />)}
          </div>
          <ul className="grid gap-1 sm:grid-cols-2">
            {rules.map((r) => <li key={r.label} className={cn('flex items-center gap-1.5 text-[13px]', r.ok ? 'text-primary' : 'text-muted-foreground')}>{r.ok ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}{r.label}</li>)}
          </ul>
        </div>
      )}
    </div>
  );
}

export function FloatInput({ id, label, value, onChange, type = 'text', autoComplete, error, trailing, dir, inputMode, autoFocus }: { id: string; label: string; value: string; onChange: (v: string) => void; type?: string; autoComplete?: string; error?: string; trailing?: ReactNode; dir?: string; inputMode?: React.HTMLAttributes<HTMLInputElement>['inputMode']; autoFocus?: boolean }) {
  return (
    <div>
      <div className={cn('group relative flex h-14 items-center rounded-2xl border bg-white/[0.04] transition-colors focus-within:border-primary/70 focus-within:bg-white/[0.06]', error ? 'border-destructive/70' : 'border-white/10')}>
        <input id={id} type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder=" " autoComplete={autoComplete} dir={dir} inputMode={inputMode} autoFocus={autoFocus} aria-invalid={!!error} aria-describedby={error ? `${id}-err` : undefined}
          className="peer h-full w-full min-w-0 rounded-2xl bg-transparent px-4 pt-5 text-base text-foreground outline-none [direction:inherit] text-right" />
        <label htmlFor={id} className="pointer-events-none absolute start-4 top-1/2 -translate-y-1/2 text-base text-muted-foreground transition-all peer-focus:top-3.5 peer-focus:text-xs peer-focus:text-primary peer-[:not(:placeholder-shown)]:top-3.5 peer-[:not(:placeholder-shown)]:text-xs">{label}</label>
        {trailing && <div className="pe-1.5">{trailing}</div>}
      </div>
      {error && <p id={`${id}-err`} className="mt-1.5 text-[13px] text-destructive">{error}</p>}
    </div>
  );
}

export function CopyField({ value, label }: { value: string; label: string }) {
  const [ok, setOk] = useState(false);
  return (
    <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] p-1.5 ps-4">
      <div className="min-w-0 flex-1"><div className="text-xs text-muted-foreground">{label}</div><div className="truncate font-latin font-bold" dir="ltr">{value}</div></div>
      <button className="press tap grid place-items-center rounded-xl bg-white/5 px-3 hover:bg-white/10" onClick={() => { navigator.clipboard?.writeText(value); setOk(true); setTimeout(() => setOk(false), 1500); }} aria-label={`کپی ${label}`}>
        {ok ? <Check className="h-5 w-5 text-primary" /> : <Copy className="h-5 w-5" />}
      </button>
    </div>
  );
}

export function useReveal() {
  useEffect(() => {
    const els = document.querySelectorAll('.reveal:not(.in)');
    const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { threshold: 0.12 });
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  });
}

const GEN_COVERS = [
  'https://images.fillout.com/903696/3gnpsh9aon/generated-images/qmdMK1o3vEstTkde5fT9UH/img_tdlYlUJllc671jNd.jpg',
  'https://images.fillout.com/903696/3gnpsh9aon/generated-images/pqkVBw6tnDyBpJUi9HCC8H/img_dOFrwvxRIxhSPoP2.jpg',
  'https://images.fillout.com/903696/3gnpsh9aon/generated-images/3F4URT2YpYJ1PdmWXUDjsA/img_YRw32oFok7DDtzPM.jpg',
  'https://images.fillout.com/903696/3gnpsh9aon/generated-images/x68G9FHZRs685JxKqEsWhq/img_BKDdvmayqguR-907.jpg',
  'https://images.fillout.com/903696/3gnpsh9aon/generated-images/vw6zw2z1X1vszeozSSFT8c/img_OmY9BhW7BVEnw9wg.jpg',
  'https://images.fillout.com/903696/3gnpsh9aon/generated-images/hBv9MWmzoMehVQGdzev28p/img_szairvjuFoZs1zUl.jpg',
  'https://images.fillout.com/903696/3gnpsh9aon/generated-images/wec9HYykkErmrAW9VoLKPr/img_hMF4T8_VbKI7rjrd.jpg',
  'https://images.fillout.com/903696/3gnpsh9aon/generated-images/oghJwRjHe9titUJgwNtyHm/img_peZgD-eX58v4Btxi.jpg',
];

/** Track artwork. Real cover when present; otherwise a unique generative cover per track (6 styles × hue pairs), so rows never look uniform. */
export function Cover({ hue, image, title, className, children }: { hue: number; image?: string; title?: string; className?: string; children?: ReactNode }) {
  const [broken, setBroken] = useState(false);
  const h2 = (hue + 40 + (hue % 5) * 25) % 360;
  const v = hue % 6;
  const letter = (title ?? '').trim().charAt(0);
  const bg = [
    `linear-gradient(135deg, hsl(${hue} 85% 58%), hsl(${h2} 75% 30%))`,
    `radial-gradient(110% 90% at 15% 10%, hsl(${hue} 90% 62%), hsl(${h2} 70% 24%) 60%, hsl(220 20% 7%))`,
    `conic-gradient(from ${hue}deg at 70% 30%, hsl(${hue} 85% 55%), hsl(${h2} 80% 40%), hsl(${hue} 60% 18%), hsl(${hue} 85% 55%))`,
    `linear-gradient(200deg, hsl(220 20% 8%), hsl(${hue} 70% 32%) 55%, hsl(${h2} 90% 60%))`,
    `radial-gradient(80% 80% at 80% 80%, hsl(${h2} 90% 60%), transparent 60%), linear-gradient(160deg, hsl(${hue} 70% 40%), hsl(230 25% 8%))`,
    `linear-gradient(120deg, hsl(${hue} 80% 50%) 0 50%, hsl(${h2} 70% 28%) 50% 100%)`,
  ][v];
  const art = [
    <g key="0"><circle cx="72" cy="72" r="40" fill="none" stroke="white" strokeOpacity=".35" strokeWidth=".7" /><circle cx="72" cy="72" r="27" fill="none" stroke="white" strokeOpacity=".35" strokeWidth=".7" /><circle cx="72" cy="72" r="14" fill="white" fillOpacity=".15" /></g>,
    <g key="1">{[0, 1, 2, 3, 4, 5, 6].map((i) => <rect key={i} x={14 + i * 11} y={70 - ((hue * (i + 3)) % 40)} width="6" height={20 + ((hue * (i + 3)) % 40)} rx="3" fill="white" fillOpacity=".28" />)}</g>,
    <g key="2"><path d="M0 70 Q25 50 50 70 T100 70" fill="none" stroke="white" strokeOpacity=".4" strokeWidth="1.2" /><path d="M0 80 Q25 60 50 80 T100 80" fill="none" stroke="white" strokeOpacity=".25" strokeWidth="1.2" /><path d="M0 60 Q25 40 50 60 T100 60" fill="none" stroke="white" strokeOpacity=".18" strokeWidth="1.2" /></g>,
    <g key="3"><rect x="58" y="10" width="34" height="34" rx="10" fill="white" fillOpacity=".14" transform="rotate(18 75 27)" /><circle cx="24" cy="78" r="16" fill="white" fillOpacity=".12" /></g>,
    <g key="4">{Array.from({ length: 25 }).map((_, i) => <circle key={i} cx={12 + (i % 5) * 19} cy={12 + Math.floor(i / 5) * 19} r={1.2 + ((hue + i * 7) % 5) * 0.5} fill="white" fillOpacity=".3" />)}</g>,
    <g key="5"><path d="M10 90 L50 20 L90 90 Z" fill="none" stroke="white" strokeOpacity=".35" strokeWidth=".9" /><path d="M30 90 L50 55 L70 90 Z" fill="white" fillOpacity=".12" /></g>,
  ][v];
  const showImg = image && !broken;
  const key = [...(title || String(hue))].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, hue + 7);
  const art2 = GEN_COVERS[key % GEN_COVERS.length];
  const tint = (key >> 3) % 70 - 35;
  return (
    <div className={cn('relative overflow-hidden rounded-2xl', className)} style={{ background: bg }}>
      {!showImg && (
        <>
          <img src={art2} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover" style={{ filter: `hue-rotate(${tint}deg) saturate(1.15)`, transform: `scale(${1.05 + (key % 4) * 0.08}) rotate(${(key % 3) * 90}deg)` }} />
          <svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full mix-blend-overlay opacity-60" aria-hidden>{art}</svg>
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
          {letter && <span className="absolute bottom-[7%] start-[9%] text-[2.2em] font-black leading-none text-white drop-shadow-[0_2px_12px_rgba(0,0,0,.6)]">{letter}</span>}
          <span className="absolute end-[8%] top-[8%] rounded-full bg-black/35 px-1.5 py-0.5 font-latin text-[8px] font-black tracking-[.2em] text-primary backdrop-blur">KAYAR</span>
        </>
      )}
      {showImg && <img src={image} alt="" loading="lazy" onError={() => setBroken(true)} className="absolute inset-0 h-full w-full object-cover" />}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/25 to-transparent" />
      {children}
    </div>
  );
}

export function useSlidingIndicator<T extends HTMLElement>(activeKey: string) {
  const ref = useRef<T>(null);
  const [style, setStyle] = useState<React.CSSProperties>({ opacity: 0 });
  useEffect(() => {
    const el = ref.current?.querySelector<HTMLElement>('[data-active="true"]');
    if (el && ref.current) setStyle({ width: el.offsetWidth, transform: `translateX(${el.offsetLeft}px)`, left: 0, opacity: 1 });
  }, [activeKey]);
  return { ref, style };
}
