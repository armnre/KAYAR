/**
 * Morshed workout-phase fit — explainable, rule-based scoring.
 *
 * Uses only data we actually store for a track: workout genre and style (assigned by the
 * importer's classifier from source metadata), admin categories, and duration.
 * The library has no BPM / energy measurements, so we never invent them: every result
 * lists which signals were missing and is flagged `complete: false` until such data exists.
 */
export type Phase = 'warmup' | 'peak' | 'cooldown';
export const PHASES: { key: Phase; label: string }[] = [
  { key: 'warmup', label: 'گرم کردن' }, { key: 'peak', label: 'اوج تمرین' }, { key: 'cooldown', label: 'سرد کردن' },
];

/** Points each signal gives per phase. Edit here to tune the rules. */
export const RULES = {
  genre: {
    workout: { warmup: 20, peak: 45, cooldown: 0 }, running: { warmup: 30, peak: 35, cooldown: 5 },
    walking: { warmup: 35, peak: 10, cooldown: 25 }, focus: { warmup: 15, peak: 5, cooldown: 35 }, recovery: { warmup: 5, peak: 0, cooldown: 45 },
  } as Record<string, Record<Phase, number>>,
  category: {
    'شروع قدرتی': { warmup: 15, peak: 30, cooldown: 0 }, 'انرژی': { warmup: 10, peak: 30, cooldown: 0 }, 'کاردیو': { warmup: 20, peak: 25, cooldown: 0 },
    'ریکاوری': { warmup: 0, peak: 0, cooldown: 35 }, 'تمرکز': { warmup: 15, peak: 0, cooldown: 25 },
  } as Record<string, Record<Phase, number>>,
  style: {
    'fa-energy': { warmup: 5, peak: 15, cooldown: 0 }, 'fa-rap': { warmup: 5, peak: 15, cooldown: 0 }, 'fa-rock': { warmup: 5, peak: 15, cooldown: 0 },
    'fa-instrumental': { warmup: 5, peak: 0, cooldown: 15 }, 'fa-traditional': { warmup: 5, peak: 0, cooldown: 15 }, 'fa-classic': { warmup: 10, peak: 0, cooldown: 5 },
    'fa-pop': { warmup: 10, peak: 5, cooldown: 0 },
  } as Record<string, Record<Phase, number>>,
  /** Max points a duration can add; mid-length tracks (2.5–5 min) are the easiest to sequence. */
  duration: 10,
};
const GENRE_FA: Record<string, string> = { workout: 'تمرین', running: 'دویدن', walking: 'پیاده‌روی', focus: 'تمرکز', recovery: 'ریکاوری' };

export type PhaseFit = {
  scores: Record<Phase, number>; best: Phase | null; complete: boolean;
  reasons: string[]; missing: string[];
};

export function phaseFit(t: { genre?: string; style?: string; categories: string[]; duration: number }): PhaseFit {
  const s: Record<Phase, number> = { warmup: 0, peak: 0, cooldown: 0 };
  const reasons: string[] = []; const missing = ['BPM', 'انرژی صوتی'];
  const add = (pts: Record<Phase, number> | undefined, why: string) => { if (!pts) return false; (Object.keys(s) as Phase[]).forEach((k) => (s[k] += pts[k])); reasons.push(why); return true; };
  if (!(t.genre && add(RULES.genre[t.genre], `ژانر تمرینی: ${GENRE_FA[t.genre] ?? t.genre}`))) missing.push('ژانر تمرینی');
  const cats = t.categories.filter((c) => add(RULES.category[c], `دسته‌ی مدیر: ${c}`));
  if (!cats.length) missing.push('دسته‌بندی مدیر');
  if (!(t.style && add(RULES.style[t.style], `سبک: ${t.style}`))) missing.push('سبک');
  if (t.duration > 0) {
    const m = t.duration / 60; const pts = m >= 2.5 && m <= 5 ? RULES.duration : RULES.duration / 2;
    add({ warmup: pts, peak: pts, cooldown: pts }, `مدت ${m.toFixed(1)} دقیقه`);
  } else missing.push('مدت');
  (Object.keys(s) as Phase[]).forEach((k) => (s[k] = Math.min(100, Math.round(s[k]))));
  const max = Math.max(s.warmup, s.peak, s.cooldown);
  const best = max > 0 ? (Object.keys(s) as Phase[]).find((k) => s[k] === max)! : null;
  return { scores: s, best, complete: false, reasons, missing };
}
