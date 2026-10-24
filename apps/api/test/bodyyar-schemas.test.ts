import { describe, it, expect } from 'vitest';
import { bodyyarPlanSchema, bodyyarProfileSchema, bodyyarWeightSchema } from '@kayar/shared';

const validPlan = {
  title: 'برنامه سه‌روزه',
  days: [{ name: 'روز ۱', exercises: [{ name: 'اسکات', sets: 3, reps: '8-10' }] }],
  nutrition: { calories: 2200, proteinG: 140, carbsG: 250, fatG: 70, tips: ['آب کافی بنوشید'] },
};

describe('bodyyar shared contracts', () => {
  it('accepts a well-formed AI plan', () => {
    expect(bodyyarPlanSchema.safeParse(validPlan).success).toBe(true);
  });
  it('rejects plans with out-of-range values (malformed model output)', () => {
    const bad = { ...validPlan, nutrition: { ...validPlan.nutrition, calories: 50 } };
    expect(bodyyarPlanSchema.safeParse(bad).success).toBe(false);
    expect(bodyyarPlanSchema.safeParse({ ...validPlan, days: [] }).success).toBe(false);
  });
  it('rejects too many sets per exercise', () => {
    const bad = { ...validPlan, days: [{ name: 'x', exercises: [{ name: 'y', sets: 99, reps: 5 }] }] };
    expect(bodyyarPlanSchema.safeParse(bad).success).toBe(false);
  });
  it('fills profile defaults and validates ranges', () => {
    const r = bodyyarProfileSchema.parse({ goal: 'کاهش وزن', daysPerWeek: 3 });
    expect(r.age).toBeNull();
    expect(bodyyarProfileSchema.safeParse({ goal: 'x', daysPerWeek: 9 }).success).toBe(false);
  });
  it('bounds weight entries', () => {
    expect(bodyyarWeightSchema.safeParse({ date: '2026-10-01', weightKg: 10 }).success).toBe(false);
    expect(bodyyarWeightSchema.safeParse({ date: '2026-10-01', weightKg: 72.5 }).success).toBe(true);
  });
});
