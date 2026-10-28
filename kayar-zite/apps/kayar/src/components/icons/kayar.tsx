/**
 * KAYAR icon family — one consistent, brand-specific set (24px grid, 1.75px round strokes + a soft duotone fill).
 * Colour comes from `currentColor`, so icons inherit theme colours (primary / cyan / gold). No external assets.
 */
import { forwardRef, type ReactNode, type SVGProps, type ComponentType } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { cn } from '@project/components/lib/utils';

export type KIconProps = SVGProps<SVGSVGElement> & { size?: number; title?: string };
export type KIcon = ComponentType<KIconProps>;

function make(name: string, body: ReactNode): KIcon {
  const C = forwardRef<SVGSVGElement, KIconProps>(({ size = 24, title, className, ...p }, ref) => (
    <svg ref={ref} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round"
      role={title ? 'img' : undefined} aria-hidden={title ? undefined : true} aria-label={title} className={cn('k-icon shrink-0', className)} {...p}>
      {body}
    </svg>
  ));
  C.displayName = name;
  return C;
}
/** duotone fill layer */
const F = (d: string) => <path d={d} fill="currentColor" fillOpacity={0.18} stroke="none" />;

/* ---------- meals ---------- */
export const IcBreakfast = make('IcBreakfast', <>{F('M5 15a7 7 0 0 1 14 0Z')}<path d="M5 15a7 7 0 0 1 14 0" /><path d="M3 18h18M7 21h10M12 4v2.5M5.2 7.2l1.6 1.6M18.8 7.2l-1.6 1.6" /></>);
export const IcLunch = make('IcLunch', <>{F('M3.5 12h17a8.5 8.5 0 0 1-17 0Z')}<path d="M3.5 12h17a8.5 8.5 0 0 1-17 0Z" /><path d="M8 8.5c0-1.2 1-1.5 1-2.7M12 8.5c0-1.2 1-1.5 1-2.7M16 8.5c0-1.2 1-1.5 1-2.7" /></>);
export const IcDinner = make('IcDinner', <>{F('M14.5 3.5a6 6 0 1 0 6 8 5 5 0 0 1-6-8Z')}<path d="M14.5 3.5a6 6 0 1 0 6 8 5 5 0 0 1-6-8Z" /><path d="M3 20.5h18M6 17.5h12" /></>);
export const IcSnack = make('IcSnack', <>{F('M12 7.5c-2-1.6-6.5-1.2-6.5 4 0 4 2.6 8.5 4.6 8.5 1 0 1.2-.6 1.9-.6s.9.6 1.9.6c2 0 4.6-4.5 4.6-8.5 0-5.2-4.5-5.6-6.5-4Z')}<path d="M12 7.5c-2-1.6-6.5-1.2-6.5 4 0 4 2.6 8.5 4.6 8.5 1 0 1.2-.6 1.9-.6s.9.6 1.9.6c2 0 4.6-4.5 4.6-8.5 0-5.2-4.5-5.6-6.5-4Z" /><path d="M12 7.5c0-2 1-3.5 2.5-4" /></>);

/* ---------- macros / tracking ---------- */
export const IcWater = make('IcWater', <>{F('M12 3s6 6.4 6 11a6 6 0 0 1-12 0c0-4.6 6-11 6-11Z')}<path d="M12 3s6 6.4 6 11a6 6 0 0 1-12 0c0-4.6 6-11 6-11Z" /><path d="M9 14.5a3 3 0 0 0 3 3" /></>);
export const IcCalorie = make('IcCalorie', <>{F('M12 21a6.5 6.5 0 0 0 6.5-6.5C18.5 9 12 3 12 3s-1 4-3.5 6A7 7 0 0 0 5.5 14.5 6.5 6.5 0 0 0 12 21Z')}<path d="M12 21a6.5 6.5 0 0 0 6.5-6.5C18.5 9 12 3 12 3s-1 4-3.5 6A7 7 0 0 0 5.5 14.5 6.5 6.5 0 0 0 12 21Z" /><path d="M12 21a2.8 2.8 0 0 1-2.8-2.8c0-2 2.8-4.2 2.8-4.2s2.8 2.2 2.8 4.2A2.8 2.8 0 0 1 12 21Z" /></>);
export const IcProtein = make('IcProtein', <>{F('M15.5 3.5a5 5 0 0 1 2.4 9.4l-3 1.7-4.5-4.5 1.7-3a5 5 0 0 1 3.4-3.6Z')}<path d="M15.5 3.5a5 5 0 0 1 2.4 9.4l-3 1.7-4.5-4.5 1.7-3a5 5 0 0 1 3.4-3.6Z" /><path d="m10.4 10.1-4.2 4.2M14.9 14.6l-4.2 4.2M5 13.5a2 2 0 1 0 0 4 2 2 0 1 0 1.5 3.5 2 2 0 0 0 .5-2.2l.8-.8" /></>);
export const IcCarb = make('IcCarb', <>{F('M12 21V9M12 9c-2.5 0-4-1.8-4-4 2.5 0 4 1.8 4 4ZM12 9c2.5 0 4-1.8 4-4-2.5 0-4 1.8-4 4Z')}<path d="M12 21V5M12 9c-2.5 0-4-1.8-4-4 2.5 0 4 1.8 4 4ZM12 9c2.5 0 4-1.8 4-4-2.5 0-4 1.8-4 4ZM12 14c-2.5 0-4-1.8-4-4 2.5 0 4 1.8 4 4ZM12 14c2.5 0 4-1.8 4-4-2.5 0-4 1.8-4 4ZM12 19c-2.5 0-4-1.8-4-4 2.5 0 4 1.8 4 4ZM12 19c2.5 0 4-1.8 4-4-2.5 0-4 1.8-4 4Z" /></>);
export const IcFat = make('IcFat', <>{F('M12 3c3 0 5 4 5.5 8a5.5 5.5 0 1 1-11 0C7 7 9 3 12 3Z')}<path d="M12 3c3 0 5 4 5.5 8a5.5 5.5 0 1 1-11 0C7 7 9 3 12 3Z" /><circle cx="12" cy="13.5" r="2.5" /></>);

/* ---------- food categories ---------- */
export const IcGrains = make('IcGrains', <>{F('M4 11a8 5 0 0 1 16 0v7.5A1.5 1.5 0 0 1 18.5 20h-13A1.5 1.5 0 0 1 4 18.5Z')}<path d="M4 11a8 5 0 0 1 16 0v7.5A1.5 1.5 0 0 1 18.5 20h-13A1.5 1.5 0 0 1 4 18.5Z" /><path d="M8 11.5v2M12 11v2M16 11.5v2" /></>);
export const IcDairy = make('IcDairy', <>{F('M7 9.5 9 6h6l2 3.5V20a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1Z')}<path d="M9 3h6v3H9zM7 9.5 9 6h6l2 3.5V20a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1Z" /><path d="M7 13h10" /></>);
export const IcFruit = make('IcFruit', <>{F('M12 8a6 6 0 1 1 0 12 6 6 0 0 1 0-12Z')}<circle cx="12" cy="14" r="6" /><path d="M12 8V5.5M12 6c1.2-2 3.5-2.5 5-2-0.5 2-2.5 3-5 2Z" /></>);
export const IcVeg = make('IcVeg', <>{F('M7 11.5a3 3 0 0 1 1.7-5.5 3.5 3.5 0 0 1 6.6 0 3 3 0 0 1 1.7 5.5Z')}<path d="M7 11.5a3 3 0 0 1 1.7-5.5 3.5 3.5 0 0 1 6.6 0 3 3 0 0 1 1.7 5.5Z" /><path d="M10 11.5 9 21h6l-1-9.5M12 11.5V16" /></>);
export const IcLegumes = make('IcLegumes', <>{F('M8 4c3 0 4.5 2.5 4 5s1.5 4 3.5 4.5 3 2.5 2 4.5-4 2.5-7 1S4 14 4 10s1-6 4-6Z')}<path d="M8 4c3 0 4.5 2.5 4 5s1.5 4 3.5 4.5 3 2.5 2 4.5-4 2.5-7 1S4 14 4 10s1-6 4-6Z" /><path d="M8 8.5c0 1 .5 2 1.5 2.5" /></>);
export const IcNuts = make('IcNuts', <>{F('M12 4c4 0 7 3 7 7.5S16 20 12 20s-7-4-7-8.5S8 4 12 4Z')}<path d="M12 4c4 0 7 3 7 7.5S16 20 12 20s-7-4-7-8.5S8 4 12 4Z" /><path d="M12 4v16M8.5 8.5 12 11l3.5-2.5M8.5 14 12 16.5l3.5-2.5" /></>);
export const IcPlate = make('IcPlate', <>{F('M12 6a6 6 0 1 1 0 12 6 6 0 0 1 0-12Z')}<circle cx="12" cy="12" r="8.5" /><circle cx="12" cy="12" r="5" /></>);

/* ---------- diets ---------- */
export const IcLeaf = make('IcLeaf', <>{F('M5 19C5 10 10 5 20 4c-1 10-6 15-15 15Z')}<path d="M5 19C5 10 10 5 20 4c-1 10-6 15-15 15Z" /><path d="M5 19 13 11" /></>);
export const IcSprout = make('IcSprout', <>{F('M12 13c0-4-3-6-7-6 0 4 3 6 7 6ZM12 11c0-3.5 2.5-6 7-6 0 4-2.5 6-7 6Z')}<path d="M12 21v-9M12 13c0-4-3-6-7-6 0 4 3 6 7 6ZM12 11c0-3.5 2.5-6 7-6 0 4-2.5 6-7 6Z" /></>);
export const IcGlutenFree = make('IcGlutenFree', <>{F('M12 3a9 9 0 1 1 0 18 9 9 0 0 1 0-18Z')}<circle cx="12" cy="12" r="9" /><path d="M12 17V8M12 10.5c-1.6 0-2.6-1.1-2.6-2.6 1.6 0 2.6 1.1 2.6 2.6ZM12 10.5c1.6 0 2.6-1.1 2.6-2.6-1.6 0-2.6 1.1-2.6 2.6ZM12 14c-1.6 0-2.6-1.1-2.6-2.6 1.6 0 2.6 1.1 2.6 2.6ZM12 14c1.6 0 2.6-1.1 2.6-2.6-1.6 0-2.6 1.1-2.6 2.6ZM5.6 18.4 18.4 5.6" /></>);
export const IcMuscle = make('IcMuscle', <>{F('M4 18c0-5 2-8 4-10l2-3 3 1-1 3 2 1c3-1 6 0 6 4s-4 5-8 5H5.5A1.5 1.5 0 0 1 4 18Z')}<path d="M4 18c0-5 2-8 4-10l2-3 3 1-1 3 2 1c3-1 6 0 6 4s-4 5-8 5H5.5A1.5 1.5 0 0 1 4 18Z" /><path d="M10 14c1.5-1.5 4-1.5 5.5 0" /></>);
export const IcBalanced = make('IcBalanced', <>{F('M12 3.5a8.5 8.5 0 0 1 0 17Z')}<circle cx="12" cy="12" r="8.5" /><path d="M12 3.5v17" /></>);

/* ---------- activity levels ---------- */
export const IcSedentary = make('IcSedentary', <>{F('M6 11h12v3H6Z')}<path d="M7 4v7h10M6 11h12v3H6zM7 14v6M17 14v6" /></>);
export const IcWalk = make('IcWalk', <><circle cx="13" cy="4.5" r="1.8" />{F('M11 8.5h3l1 5h-4Z')}<path d="m11 8.5 3 .2 1.5 3.3 2.5 1M11 8.5l-2.5 4M11.5 13l-1.5 7.5M13.5 13l2.5 7" /></>);
export const IcRun = make('IcRun', <><circle cx="15" cy="4.5" r="1.8" />{F('M10 8h4.5l-1.5 5H9Z')}<path d="M5 9.5 9 8h5l2 3.5 3.5.5M14 8l-2 5.5 3.5 2.5-1 4.5M12 13.5 9.5 17 5 17.5" /></>);
export const IcBolt = make('IcBolt', <>{F('M13 3 5 13.5h6L10 21l8-10.5h-6Z')}<path d="M13 3 5 13.5h6L10 21l8-10.5h-6Z" /></>);
export const IcTrophy = make('IcTrophy', <>{F('M7 4h10v5a5 5 0 0 1-10 0Z')}<path d="M7 4h10v5a5 5 0 0 1-10 0ZM7 6H4.5a3 3 0 0 0 3 4M17 6h2.5a3 3 0 0 1-3 4M12 14v3.5M8.5 20.5h7M9.5 17.5h5v3h-5z" /></>);

/* ---------- goals / level / place ---------- */
export const IcTarget = make('IcTarget', <>{F('M12 8a4 4 0 1 1 0 8 4 4 0 0 1 0-8Z')}<circle cx="12" cy="12" r="8.5" /><circle cx="12" cy="12" r="4" /><path d="M12 12 19 5M16.5 4.5 19 5l.5 2.5" /></>);
export const IcBarbell = make('IcBarbell', <>{F('M5 7h3v10H5ZM16 7h3v10h-3Z')}<path d="M5 7h3v10H5zM16 7h3v10h-3zM8 12h8M2.5 9.5v5M21.5 9.5v5" /></>);
export const IcHeartPulse = make('IcHeartPulse', <>{F('M12 20s-8-4.6-8-10.2A4.3 4.3 0 0 1 12 7.5a4.3 4.3 0 0 1 8 2.3C20 15.4 12 20 12 20Z')}<path d="M12 20s-8-4.6-8-10.2A4.3 4.3 0 0 1 12 7.5a4.3 4.3 0 0 1 8 2.3C20 15.4 12 20 12 20Z" /><path d="M6.5 12.5h3l1.2-2 2 4 1.3-2h3.5" /></>);
export const IcSeedling = make('IcSeedling', <>{F('M12 14c0-3-2.5-5-6-5 0 3 2.5 5 6 5Z')}<path d="M12 21v-7M12 14c0-3-2.5-5-6-5 0 3 2.5 5 6 5ZM12 12c0-3 2-5.5 5.5-5.5 0 3.2-2 5.5-5.5 5.5ZM7 21h10" /></>);
export const IcHome = make('IcHome', <>{F('M5 10.5 12 4.5l7 6V20H5Z')}<path d="M3.5 11.5 12 4.5l8.5 7M5.5 10v10h13V10M10 20v-5h4v5" /></>);
export const IcGym = make('IcGym', <>{F('M4 9h16v11H4Z')}<path d="M3 9h18M4 9v11h16V9M7 9V5h10v4M8 14.5h8M8 13v3M16 13v3" /></>);
export const IcOutdoor = make('IcOutdoor', <>{F('M12 3 6 12h3l-3.5 5h13L15 12h3Z')}<path d="M12 3 6 12h3l-3.5 5h13L15 12h3ZM12 17v4" /></>);

/* ---------- misc ---------- */
export const IcSearchFood = make('IcSearchFood', <>{F('M10.5 4a6.5 6.5 0 1 1 0 13 6.5 6.5 0 0 1 0-13Z')}<circle cx="10.5" cy="10.5" r="6.5" /><path d="m20 20-4.8-4.8M8 10.5h5" /></>);
export const IcSpark = make('IcSpark', <>{F('M12 3c.8 4.5 2.5 6.2 7 7-4.5.8-6.2 2.5-7 7-.8-4.5-2.5-6.2-7-7 4.5-.8 6.2-2.5 7-7Z')}<path d="M12 3c.8 4.5 2.5 6.2 7 7-4.5.8-6.2 2.5-7 7-.8-4.5-2.5-6.2-7-7 4.5-.8 6.2-2.5 7-7ZM19 17v4M17 19h4" /></>);

/* ---------- lookup maps (Persian labels used across Onboarding / Nutrition / Plan) ---------- */
export const MEAL_ICON: Record<string, KIcon> = { breakfast: IcBreakfast, lunch: IcLunch, dinner: IcDinner, snack: IcSnack };
export const CAT_ICON: Record<string, KIcon> = { protein: IcProtein, grains: IcGrains, dairy: IcDairy, fruit: IcFruit, vegetable: IcVeg, fats: IcFat, legumes: IcLegumes, snack: IcNuts };
export const DIET_ICON: Record<string, KIcon> = { 'high-protein': IcMuscle, vegetarian: IcLeaf, vegan: IcSprout, 'gluten-free': IcGlutenFree, normal: IcBalanced };
export const ACTIVITY_ICON: Record<string, KIcon> = { sedentary: IcSedentary, light: IcWalk, moderate: IcRun, active: IcBolt, athlete: IcTrophy };
export const OPTION_ICON: Record<string, KIcon> = {
  'کاهش وزن': IcCalorie, 'عضله‌سازی': IcMuscle, 'افزایش قدرت': IcBarbell, 'تناسب و سلامت عمومی': IcHeartPulse, 'آمادگی دویدن': IcRun,
  'مبتدی': IcSeedling, 'متوسط': IcBolt, 'پیشرفته': IcTrophy, 'خانه': IcHome, 'باشگاه': IcGym, 'فضای باز': IcOutdoor,
  'معمولی': IcBalanced, 'گیاهی': IcLeaf, 'وگان': IcSprout, 'بدون گلوتن': IcGlutenFree, 'پرپروتئین': IcMuscle,
};
export const foodIcon = (category?: string) => (category && CAT_ICON[category]) || IcPlate;

type Tone = 'primary' | 'cyan' | 'gold' | 'violet' | 'muted';
const TONE: Record<Tone, string> = {
  primary: 'text-primary from-primary/30 to-primary/5 shadow-[0_6px_20px_-8px_hsl(var(--primary)/.7)]',
  cyan: 'text-[hsl(var(--cyan))] from-[hsl(var(--cyan)/.3)] to-[hsl(var(--cyan)/.05)] shadow-[0_6px_20px_-8px_hsl(var(--cyan)/.7)]',
  gold: 'text-gold from-gold/30 to-gold/5 shadow-[0_6px_20px_-8px_hsl(var(--gold)/.7)]',
  violet: 'text-[hsl(254_100%_72%)] from-[hsl(254_100%_62%/.32)] to-[hsl(254_100%_62%/.05)] shadow-[0_6px_20px_-8px_hsl(254_100%_62%/.7)]',
  muted: 'text-foreground/80 from-white/10 to-white/[.02]',
};
export const MEAL_TONE: Record<string, Tone> = { breakfast: 'gold', lunch: 'primary', dinner: 'violet', snack: 'cyan' };

/** Gradient badge with soft glow; pops subtly when `active` flips on (respects reduced motion). */
export function IconBadge({ icon: I, tone = 'primary', size = 'md', active, className, label }: { icon: KIcon; tone?: Tone; size?: 'sm' | 'md' | 'lg'; active?: boolean; className?: string; label?: string }) {
  const reduce = useReducedMotion();
  const box = { sm: 'h-9 w-9 rounded-xl', md: 'h-12 w-12 rounded-2xl', lg: 'h-14 w-14 rounded-[20px]' }[size];
  const px = { sm: 18, md: 24, lg: 28 }[size];
  return (
    <motion.span key={active ? 'on' : 'off'} initial={reduce || !active ? false : { scale: 0.85 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 420, damping: 18 }}
      className={cn('relative grid shrink-0 place-items-center border border-white/10 bg-gradient-to-br', box, TONE[tone], className)} aria-label={label} role={label ? 'img' : undefined}>
      <I size={px} />
      {active && <span className="absolute -bottom-0.5 -end-0.5 h-3 w-3 rounded-full border-2 border-background bg-primary" />}
    </motion.span>
  );
}
