/**
 * KAYAR identity — phone handling (pure domain functions, unit-testable).
 *
 * Requirements covered (Phase 1 §23–§24):
 *  - accepts Persian ۰۱۲۳۴۵۶۷۸۹, Arabic ٠١٢٣٤٥٦٧٨٩ and ASCII digits
 *  - never mutates the caret: callers keep the raw value and only derive canonical form
 *  - canonical output is E.164 without "+": 989123456789
 */

export const PERSIAN_DIGITS = "۰۱۲۳۴۵۶۷۸۹";
export const ARABIC_DIGITS = "٠١٢٣٤٥٦٧٨٩";
export const ASCII_DIGITS = "0123456789";

/** ۵ → 5, ٥ → 5, anything else unchanged. */
export function toLatinDigits(input: string): string {
  let out = "";
  for (const ch of input) {
    const fa = PERSIAN_DIGITS.indexOf(ch);
    const ar = ARABIC_DIGITS.indexOf(ch);
    if (fa > -1) out += ASCII_DIGITS[fa];
    else if (ar > -1) out += ASCII_DIGITS[ar];
    else out += ch;
  }
  return out;
}

export function toPersianDigits(input: string | number): string {
  return String(input).replace(/\d/g, (d) => PERSIAN_DIGITS[Number(d)]);
}

/** Strips separators/plus and converts every digit family to ASCII. */
export function digitsOnly(input: string): string {
  return toLatinDigits(input).replace(/\D/g, "");
}

/**
 * Normalises any accepted national format to canonical `989123456789`.
 * Returns null when the input cannot represent a valid Iranian mobile number.
 */
export function normalizePhone(raw: string): string | null {
  let d = digitsOnly(raw.trim());

  // international prefixes: +98 / 0098 / 98
  if (d.startsWith("0098")) d = d.slice(4);
  else if (d.startsWith("+98")) d = d.slice(3);

  if (d.startsWith("98") && d.length === 12) {
    // already canonical
  } else if (d.startsWith("0")) {
    d = d.slice(1);
  } else if (d.startsWith("9") && d.length === 10) {
    // bare national mobile 9123456789
  } else if (d.startsWith("98")) {
    d = d.slice(2);
  }

  const msisdn = `98${d}`;
  return /^989\d{9}$/.test(msisdn) ? msisdn : null;
}

export function isValidIranMobile(raw: string): boolean {
  return normalizePhone(raw) !== null;
}

/** Canonical → national display form: 989123456789 → 09123456789 */
export function toNational(canonical: string): string {
  return canonical.startsWith("98") ? `0${canonical.slice(2)}` : canonical;
}

/** Grouped Persian display: ۰۹۱۲ ۳۴۵ ۶۷۸۹ */
export function formatPhonePersian(raw: string): string {
  const d = digitsOnly(toNational(normalizePhone(raw) ?? digitsOnly(raw))).padStart(11, "0");
  const grouped = `${d.slice(0, 4)} ${d.slice(4, 7)} ${d.slice(7, 11)}`;
  return toPersianDigits(grouped);
}

/** For OTP screens / audit views: ۰۹۱۲ •••• ۷۸۹ */
export function maskPhoneDisplay(raw: string): string {
  const canon = normalizePhone(raw) ?? digitsOnly(raw);
  const d = toNational(canon);
  if (d.length < 7) return toPersianDigits(d);
  return toPersianDigits(`${d.slice(0, 4)}••••${d.slice(-3)}`);
}
