import { cn } from '@project/components/lib/utils';

/** KAYAR-branded avatar: initials on a seeded gradient, wrapped in the signature lime→violet orbit ring. */
export function KayarAvatar({ name, seed, size = 88, className }: { name?: string | null; seed?: string; size?: number; className?: string }) {
  const s = seed || name || 'kayar';
  const hue = [...s].reduce((a, c) => (a * 31 + c.charCodeAt(0)) % 360, 17);
  const initials = (name || 'K').trim().split(/\s+/).map((w) => w.charAt(0)).slice(0, 2).join('');
  return (
    <div className={cn('relative shrink-0', className)} style={{ width: size, height: size }}>
      <div className="absolute inset-0 animate-[spin_8s_linear_infinite] rounded-full bg-[conic-gradient(from_0deg,hsl(var(--primary)),hsl(var(--violet)),hsl(var(--cyan)),hsl(var(--primary)))] p-[3px] shadow-[0_10px_40px_-8px_hsl(var(--primary)/.7)]">
        <div className="h-full w-full rounded-full bg-background" />
      </div>
      <div className="absolute inset-[6px] overflow-hidden rounded-full" style={{ background: `radial-gradient(120% 100% at 25% 15%, hsl(${hue} 80% 55%), hsl(${(hue + 60) % 360} 70% 25%) 65%, hsl(220 20% 8%))` }}>
        <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full opacity-25" aria-hidden><path d="M30 20 L30 80 M30 50 L70 20 M42 42 L72 80" stroke="white" strokeWidth="9" strokeLinecap="round" fill="none" /></svg>
        <span className="absolute inset-0 grid place-items-center font-black text-white drop-shadow-lg" style={{ fontSize: size * 0.32 }}>{initials}</span>
      </div>
      <span className="absolute -bottom-0.5 end-0 grid place-items-center rounded-full bg-primary font-latin font-black text-primary-foreground ring-4 ring-background" style={{ width: size * 0.3, height: size * 0.3, fontSize: size * 0.13 }}>K</span>
    </div>
  );
}
