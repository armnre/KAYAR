import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, AlertTriangle } from 'lucide-react';
import { Button } from '@project/components/ui/button';
import { Skeleton } from '@project/components/ui/skeleton';
import { cn } from '@project/components/lib/utils';

export function PageHeader({ title, subtitle, back, action }: { title: string; subtitle?: string; back?: string; action?: ReactNode }) {
  return (
    <div className="mb-6 flex items-end justify-between gap-4">
      <div className="min-w-0">
        {back && (
          <Link to={back} className="mb-3 inline-flex h-9 items-center gap-1 rounded-full border border-border bg-card/60 px-3 text-sm text-muted-foreground backdrop-blur transition hover:border-primary/40 hover:text-foreground">
            <ArrowRight className="h-4 w-4" /> بازگشت
          </Link>
        )}
        <h1 className="bg-gradient-to-l from-foreground to-foreground/60 bg-clip-text text-2xl font-black tracking-tight text-transparent md:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary shadow-[0_0_10px_hsl(var(--primary))]" />{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn('relative rounded-[28px] border border-white/[.07] bg-gradient-to-b from-white/[.045] to-white/[.01] p-5 shadow-[0_20px_50px_-30px_rgba(0,0,0,.8)] backdrop-blur', className)}>{children}</div>;
}

export function EmptyState({ icon, title, text, action }: { icon: ReactNode; title: string; text: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center rounded-[28px] border border-dashed border-border px-6 py-12 text-center">
      <div className="mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-primary/10 text-primary">{icon}</div>
      <h3 className="text-lg font-bold">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">{text}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex items-center gap-3 rounded-[24px] border border-destructive/40 bg-destructive/10 p-4 text-sm">
      <AlertTriangle className="h-5 w-5 shrink-0 text-destructive" />
      <span className="flex-1">{message}</span>
      {onRetry && <Button size="sm" variant="outline" onClick={onRetry}>تلاش دوباره</Button>}
    </div>
  );
}

export function LoadingBlocks({ count = 3 }: { count?: number }) {
  return <div className="space-y-4">{Array.from({ length: count }).map((_, i) => <Skeleton key={i} className="h-28 w-full rounded-[28px]" />)}</div>;
}

export function Stat({ label, value, unit, accent }: { label: string; value: string | number; unit?: string; accent?: boolean }) {
  return (
    <div className="rounded-3xl bg-secondary p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={cn('mt-1 text-2xl font-extrabold', accent && 'text-primary')}>
        <span className="latin">{value}</span>{unit && <span className="ms-1 text-xs font-medium text-muted-foreground">{unit}</span>}
      </div>
    </div>
  );
}

export const errMsg = (e: unknown) => (e as { userFacingMessage?: string })?.userFacingMessage ?? (e as Error)?.message ?? 'خطایی رخ داد.';
export const faNum = (n: number) => n.toLocaleString('fa-IR');
export const todayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
export const faDate = (iso: string) => new Date(iso.length === 10 ? iso + 'T12:00:00' : iso).toLocaleDateString('fa-IR', { month: 'short', day: 'numeric' });

/** Animated circular progress ring (SVG). */
export function Ring({ value, max, size = 120, stroke = 10, color = 'hsl(var(--primary))', track = 'hsl(var(--secondary))', children }: { value: number; max: number; size?: number; stroke?: number; color?: string; track?: string; children?: ReactNode }) {
  const r = (size - stroke) / 2, c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(1, value / Math.max(1, max)));
  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - pct)} style={{ transition: 'stroke-dashoffset 1s cubic-bezier(.2,.8,.2,1)', filter: `drop-shadow(0 0 6px ${color})` }} />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">{children}</div>
    </div>
  );
}
