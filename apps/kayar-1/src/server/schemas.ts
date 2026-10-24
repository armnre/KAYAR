import { z } from 'zod';

export const profileSchema = z.object({
  goal: z.string().trim().min(1).max(60),
  level: z.string().trim().max(40),
  daysPerWeek: z.number().int().min(1).max(7),
  place: z.string().trim().max(40),
  equipment: z.string().trim().max(300),
  sessionMinutes: z.number().int().min(10).max(180),
  diet: z.string().trim().max(60),
  limitations: z.string().trim().max(600),
  age: z.number().int().min(13).max(100).nullable(),
  heightCm: z.number().min(100).max(250).nullable(),
  weightKg: z.number().min(25).max(300).nullable(),
  sex: z.enum(['male', 'female']).nullable().optional(),
});
export type Profile = z.infer<typeof profileSchema>;

export const planExerciseSchema = z.object({
  slug: z.string(),
  name: z.string(),
  sets: z.number().int().min(1).max(10),
  reps: z.string().max(30),
  restSec: z.number().int().min(0).max(600),
  note: z.string().max(200).optional(),
});
export const planSchema = z.object({
  title: z.string().max(140),
  notes: z.array(z.string().max(240)).max(8),
  days: z.array(z.object({ name: z.string().max(60), focus: z.string().max(80), exercises: z.array(planExerciseSchema).min(1).max(10) })).min(1).max(7),
});
export type Plan = z.infer<typeof planSchema>;

const macros = z.object({ calories: z.number(), protein: z.number(), carbs: z.number(), fat: z.number() });
export const mealSchema = macros.extend({ name: z.string().max(40), time: z.string().max(40), items: z.array(z.string().max(120)).min(1).max(8) });
export const nutritionSchema = z.object({
  targets: z.object({ training: macros, rest: macros }),
  trainingDay: z.array(mealSchema).min(3).max(6),
  restDay: z.array(mealSchema).min(3).max(6),
  preWorkout: z.string().max(240),
  postWorkout: z.string().max(240),
  waterL: z.number(),
  tips: z.array(z.string().max(240)).max(6),
});
export type Nutrition = z.infer<typeof nutritionSchema>;

export const setLogSchema = z.object({
  slug: z.string().max(80),
  name: z.string().max(90),
  set: z.number().int().min(1).max(20),
  reps: z.number().int().min(0).max(200),
  weightKg: z.number().min(0).max(500).nullable(),
});

export const today = () => new Date().toISOString().slice(0, 10);
