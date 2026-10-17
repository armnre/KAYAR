import { z } from 'zod';

/** Shared bodyyar (AI coach) contracts — used by the mobile app and the API. */

export const bodyyarProfileSchema = z.object({
  goal: z.string().trim().min(1).max(60),
  gender: z.string().trim().max(20).default(''),
  level: z.string().trim().max(40).default(''),
  daysPerWeek: z.number().int().min(1).max(7),
  place: z.string().trim().max(40).default(''),
  diet: z.string().trim().max(40).default(''),
  age: z.number().int().min(10).max(100).nullable().default(null),
  heightCm: z.number().int().min(100).max(250).nullable().default(null),
  weightKg: z.number().min(25).max(300).nullable().default(null),
  limitations: z.string().trim().max(600).default(''),
});
export type BodyyarProfile = z.infer<typeof bodyyarProfileSchema>;

export const bodyyarExerciseSchema = z.object({
  name: z.string().trim().min(1).max(90),
  sets: z.number().int().min(1).max(20),
  reps: z.union([z.string().trim().min(1).max(30), z.number().int().min(0).max(999)]),
  note: z.string().trim().max(200).optional(),
});
export type BodyyarExercise = z.infer<typeof bodyyarExerciseSchema>;

export const bodyyarDaySchema = z.object({
  name: z.string().trim().min(1).max(40),
  exercises: z.array(bodyyarExerciseSchema).min(1).max(12),
});
export type BodyyarDay = z.infer<typeof bodyyarDaySchema>;

export const bodyyarNutritionSchema = z.object({
  calories: z.number().int().min(800).max(6000),
  proteinG: z.number().int().min(0).max(600),
  carbsG: z.number().int().min(0).max(1200),
  fatG: z.number().int().min(0).max(400),
  tips: z.array(z.string().trim().min(1).max(240)).max(10),
});
export type BodyyarNutrition = z.infer<typeof bodyyarNutritionSchema>;

export const bodyyarPlanSchema = z.object({
  title: z.string().trim().min(1).max(140),
  days: z.array(bodyyarDaySchema).min(1).max(7),
  nutrition: bodyyarNutritionSchema,
});
export type BodyyarPlan = z.infer<typeof bodyyarPlanSchema>;

export const bodyyarMessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string().trim().min(1).max(4000),
});
export type BodyyarMessage = z.infer<typeof bodyyarMessageSchema>;

export const bodyyarWeightSchema = z.object({
  date: z.string().trim().max(30),
  weightKg: z.number().min(25).max(300),
});
export type BodyyarWeight = z.infer<typeof bodyyarWeightSchema>;
