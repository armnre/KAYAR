import { useEffect, useState } from 'react';
import { Dumbbell } from 'lucide-react';
import { cn } from '@project/components/lib/utils';

/** GIF-like loop: crossfades between the exercise's start/end frames. */
export function ExerciseMotion({ frames, alt, className, speed = 900, badge = true }: { frames?: string[]; alt: string; className?: string; speed?: number; badge?: boolean }) {
  const [i, setI] = useState(0);
  const list = frames ?? [];
  useEffect(() => {
    if (list.length < 2) return;
    const t = setInterval(() => setI((x) => (x + 1) % list.length), speed);
    return () => clearInterval(t);
  }, [list.length, speed]);
  if (!list.length) return (
    <div className={cn('grid place-items-center bg-gradient-to-br from-primary/20 via-secondary to-background', className)}>
      <Dumbbell className="h-1/3 w-1/3 text-primary/60" />
    </div>
  );
  return (
    <div className={cn('relative overflow-hidden bg-white', className)}>
      {list.map((src, k) => (
        <img key={src} src={src} alt={k === 0 ? alt : ''} loading="lazy" draggable={false}
          className={cn('absolute inset-0 h-full w-full object-contain transition-opacity duration-300', k === i ? 'opacity-100' : 'opacity-0')} />
      ))}
      {badge && <span className="absolute start-2 top-2 flex items-center gap-1 rounded-full bg-black/70 px-2 py-0.5 text-[10px] font-bold text-primary"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />LIVE</span>}
    </div>
  );
}
