import { z } from "zod";
import { AppError } from "./errors";

/** Zod is the single boundary validator — every input crosses here (Phase 1 §34). */
export function parseOrThrow<T>(schema: z.ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value);
  if (!result.success) {
    const first = result.error.issues[0];
    throw new AppError("VALIDATION_FAILED", first?.message, {
      issues: result.error.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
    });
  }
  return result.data;
}

/** Persian digit formatting helpers shared across modules. */
export const faNum = (v: number | string): string =>
  String(v).replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[Number(d)]);

export const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

export const nowMs = (): number => Date.now();
