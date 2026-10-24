import type { Profile } from './schemas';

/** Deterministic targets (Mifflin-St Jeor) — the AI designs meals around these, it never invents the numbers. */
export function computeTargets(p: Pick<Profile, 'goal' | 'daysPerWeek' | 'age' | 'heightCm' | 'weightKg' | 'sex'>) {
  const w = p.weightKg ?? 75, h = p.heightCm ?? 175, a = p.age ?? 28;
  const bmr = 10 * w + 6.25 * h - 5 * a + (p.sex === 'female' ? -161 : 5);
  const restTdee = bmr * 1.3;
  const goal = p.goal || '';
  const adj = /کاهش|چربی|لاغر|وزن کم/.test(goal) ? 0.8 : /عضله|حجم|قدرت|افزایش/.test(goal) ? 1.1 : 1;
  const proteinPerKg = adj < 1 ? 2.1 : adj > 1 ? 1.9 : 1.7;
  const day = (kcalBase: number, carbShare: number) => {
    const calories = Math.round((kcalBase * adj) / 10) * 10;
    const protein = Math.round(w * proteinPerKg);
    const fat = Math.max(40, Math.round((calories * (carbShare > 0.5 ? 0.22 : 0.3)) / 9));
    const carbs = Math.max(60, Math.round((calories - protein * 4 - fat * 9) / 4));
    return { calories, protein, carbs, fat };
  };
  return { training: day(restTdee + 350, 0.55), rest: day(restTdee, 0.45), waterL: Math.round((w * 0.035 + 0.5) * 10) / 10 };
}
