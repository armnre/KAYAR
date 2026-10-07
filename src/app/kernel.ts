/**
 * KAYAR application kernel — real domain behaviour for this static deployment.
 *
 * Persistence is a device store (localStorage), NOT a secure server session.
 * OTP is generated with CSPRNG, stored only as SHA-256, and delivered through
 * the Dev SMS port because no SMS vendor is configured. Rate limits, attempt
 * caps, expiry, RBAC and idempotent rewards are enforced here — not in the UI.
 */
import { AppError } from "../lib/errors";
import { maskPhone } from "../lib/logger";
import { RATE_LIMITS, FixedWindowRateLimiter } from "../server/rate-limit";
import { assertCan, type Actor, type Role } from "../modules/rbac/permissions";
import { OTP_MAX_ATTEMPTS, OTP_RESEND_COOLDOWN_SECONDS, OTP_TTL_SECONDS } from "../modules/auth/otp";
import { maskPhoneDisplay, toNational } from "../modules/auth/phone";
import { SESSION_ABSOLUTE_TTL_DAYS, SESSION_TTL_DAYS, isSessionActive, type Session } from "../modules/auth/session";
import type { PublicUser } from "../modules/auth/contracts";

export const STORE_KEY = "kayar.device.v1";

export type Goal = "fatloss" | "muscle" | "fitness" | "flexibility";
export type Level = "beginner" | "mid" | "advanced";

export interface Profile {
  displayName: string;
  goal: Goal;
  level: Level;
  restrictions: string;
  city: string;
  onboarded: boolean;
  weightKg: number | null;
  sleepHours: number | null;
}

export interface Challenge {
  id: string;
  phone: string;
  codeHash: string;
  attempts: number;
  issuedAtMs: number;
  expiresAtMs: number;
  consumed: boolean;
}

export interface Booking {
  id: string;
  userId: string;
  coachId: string;
  day: string;
  time: string;
  note: string;
  status: "pending" | "approved" | "rejected";
  createdAtMs: number;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  atMs: number;
}

export interface JoinedCampaign {
  campaignId: string;
  joinedAtMs: number;
  checkins: string[];
  claimedAtMs: number | null;
  rewardCode: string | null;
}

export interface PlayState {
  trackId: string | null;
  positionSec: number;
  playing: boolean;
  queue: string[];
}

export interface Note {
  id: string;
  title: string;
  body: string;
  atMs: number;
  read: boolean;
  tone: "neon" | "violet" | "gold" | "cyan";
}

export interface AuditRow {
  id: string;
  atMs: number;
  actorId: string | null;
  action: string;
  resource: string;
  result: "success" | "denied" | "error";
  meta: Record<string, string>;
}

export interface UserRow {
  id: string;
  phone: string;
  roles: Role[];
  profile: Profile;
  createdAtMs: number;
}

export interface KayarState {
  users: UserRow[];
  challenges: Challenge[];
  session: Session | null;
  favorites: Record<string, string[]>;
  bookings: Booking[];
  chats: Record<string, ChatMessage[]>;
  campaigns: Record<string, JoinedCampaign[]>;
  morshedFav: Record<string, string[]>;
  morshedHistory: Record<string, { trackId: string; atMs: number; positionSec: number }[]>;
  play: PlayState;
  notes: Record<string, Note[]>;
  audit: AuditRow[];
}

export const EMPTY: KayarState = {
  users: [],
  challenges: [],
  session: null,
  favorites: {},
  bookings: [],
  chats: {},
  campaigns: {},
  morshedFav: {},
  morshedHistory: {},
  play: { trackId: null, positionSec: 0, playing: false, queue: [] },
  notes: {},
  audit: [],
};

const ADMIN_PHONES = new Set(["989121111111"]);
const COACH_PHONES = new Set(["989122222222"]);

export function loadState(): KayarState {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw) as KayarState;
    if (parsed.session && !isSessionActive(parsed.session, Date.now())) parsed.session = null;
    return { ...EMPTY, ...parsed, play: { ...EMPTY.play, ...parsed.play, playing: false } };
  } catch {
    return EMPTY;
  }
}

export function saveState(state: KayarState): void {
  const safe: KayarState = {
    ...state,
    challenges: state.challenges.map((c) => ({ ...c, codeHash: c.codeHash })),
  };
  localStorage.setItem(STORE_KEY, JSON.stringify(safe));
}

export async function sha256(value: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function randomOtp(): string {
  const bytes = new Uint32Array(1);
  crypto.getRandomValues(bytes);
  return String(bytes[0] % 1_000_000).padStart(6, "0");
}

export function randomId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

function rolesFor(phone: string): Role[] {
  if (ADMIN_PHONES.has(phone)) return ["admin", "user"];
  if (COACH_PHONES.has(phone)) return ["coach", "user"];
  return ["user"];
}

export function currentUser(state: KayarState): UserRow | null {
  if (!state.session || !isSessionActive(state.session, Date.now())) return null;
  return state.users.find((u) => u.id === state.session?.userId) ?? null;
}

export function toPublic(user: UserRow): PublicUser {
  return {
    id: user.id,
    displayName: user.profile.displayName || "ورزشکار کایار",
    phoneMasked: maskPhoneDisplay(toNational(user.phone)),
    roles: user.roles,
  };
}

export function toActor(user: UserRow): Actor {
  return { userId: user.id, roles: user.roles };
}

function audit(state: KayarState, row: Omit<AuditRow, "id" | "atMs">): KayarState {
  return {
    ...state,
    audit: [{ ...row, id: randomId("aud"), atMs: Date.now() }, ...state.audit].slice(0, 200),
  };
}

function notify(state: KayarState, userId: string, note: Omit<Note, "id" | "atMs" | "read">): KayarState {
  const list = state.notes[userId] ?? [];
  return {
    ...state,
    notes: {
      ...state.notes,
      [userId]: [{ ...note, id: randomId("nt"), atMs: Date.now(), read: false }, ...list].slice(0, 40),
    },
  };
}

const limiter = new FixedWindowRateLimiter();

export async function issueOtp(state: KayarState, phone: string): Promise<{ state: KayarState; code: string; challengeId: string }> {
  const byPhone = await limiter.consume({ key: `otp:req:${phone}`, ...RATE_LIMITS.otpRequestByPhone });
  if (!byPhone.allowed) throw new AppError("RATE_LIMITED");

  const code = randomOtp();
  const codeHash = await sha256(`${phone}:${code}`);
  const now = Date.now();
  const challenge: Challenge = {
    id: randomId("otp"),
    phone,
    codeHash,
    attempts: 0,
    issuedAtMs: now,
    expiresAtMs: now + OTP_TTL_SECONDS * 1000,
    consumed: false,
  };
  let next: KayarState = {
    ...state,
    challenges: [challenge, ...state.challenges.filter((c) => c.phone !== phone || c.consumed)].slice(0, 30),
  };
  next = audit(next, {
    actorId: null,
    action: "auth.otp_requested",
    resource: "otp",
    result: "success",
    meta: { phone: maskPhone(phone) },
  });
  return { state: next, code, challengeId: challenge.id };
}

export async function verifyOtp(
  state: KayarState,
  challengeId: string,
  code: string,
): Promise<{ state: KayarState; user: UserRow }> {
  const challenge = state.challenges.find((c) => c.id === challengeId);
  if (!challenge || challenge.consumed) throw new AppError("OTP_EXPIRED", "کد تایید منقضی یا مصرف شده است.");
  if (Date.now() > challenge.expiresAtMs) throw new AppError("OTP_EXPIRED");
  if (challenge.attempts >= OTP_MAX_ATTEMPTS) throw new AppError("OTP_ATTEMPTS_EXCEEDED");

  const gate = await limiter.consume({ key: `otp:ver:${challenge.phone}`, ...RATE_LIMITS.otpVerifyByPhone });
  if (!gate.allowed) throw new AppError("RATE_LIMITED");

  const hash = await sha256(`${challenge.phone}:${code}`);
  if (hash !== challenge.codeHash) {
    const bumped = state.challenges.map((c) => (c.id === challengeId ? { ...c, attempts: c.attempts + 1 } : c));
    throw Object.assign(new AppError("OTP_INVALID"), { nextState: { ...state, challenges: bumped } });
  }

  const now = Date.now();
  let users = state.users;
  let user = users.find((u) => u.phone === challenge.phone);
  if (!user) {
    user = {
      id: randomId("usr"),
      phone: challenge.phone,
      roles: rolesFor(challenge.phone),
      createdAtMs: now,
      profile: {
        displayName: "",
        goal: "fitness",
        level: "beginner",
        restrictions: "",
        city: "تهران",
        onboarded: false,
        weightKg: null,
        sleepHours: null,
      },
    };
    users = [...users, user];
  }
  const session: Session = {
    id: randomId("ses"),
    userId: user.id,
    issuedAtMs: now,
    expiresAtMs: now + SESSION_TTL_DAYS * 864e5,
    absoluteExpiresAtMs: now + SESSION_ABSOLUTE_TTL_DAYS * 864e5,
    revokedAtMs: null,
    lastSeenAtMs: now,
  };
  let next: KayarState = {
    ...state,
    users,
    session,
    challenges: state.challenges.map((c) => (c.id === challengeId ? { ...c, consumed: true } : c)),
  };
  next = audit(next, {
    actorId: user.id,
    action: "auth.login",
    resource: "session",
    result: "success",
    meta: { phone: maskPhone(user.phone) },
  });
  next = notify(next, user.id, {
    title: "ورود موفق",
    body: "نشست دستگاه شما ساخته شد. این بیلد کوکی HttpOnly سرور ندارد؛ نشست فقط روی همین دستگاه ذخیره می‌شود.",
    tone: "neon",
  });
  return { state: next, user };
}

export function logout(state: KayarState): KayarState {
  if (!state.session) return state;
  const session = { ...state.session, revokedAtMs: Date.now() };
  return audit({ ...state, session: null }, {
    actorId: session.userId,
    action: "auth.logout",
    resource: "session",
    result: "success",
    meta: {},
  });
}

export const RESEND_COOLDOWN = OTP_RESEND_COOLDOWN_SECONDS;

export function toggleFavorite(state: KayarState, userId: string, coachId: string): KayarState {
  const cur = state.favorites[userId] ?? [];
  const next = cur.includes(coachId) ? cur.filter((id) => id !== coachId) : [...cur, coachId];
  return { ...state, favorites: { ...state.favorites, [userId]: next } };
}

export function requestBooking(
  state: KayarState,
  user: UserRow,
  input: { coachId: string; day: string; time: string; note: string },
): KayarState {
  const dup = state.bookings.find(
    (b) => b.userId === user.id && b.coachId === input.coachId && b.day === input.day && b.time === input.time && b.status !== "rejected",
  );
  if (dup) throw new AppError("CONFLICT", "برای این زمان قبلاً درخواست ثبت شده است.");
  const booking: Booking = {
    id: randomId("bk"),
    userId: user.id,
    coachId: input.coachId,
    day: input.day,
    time: input.time,
    note: input.note.slice(0, 280),
    status: "pending",
    createdAtMs: Date.now(),
  };
  let next: KayarState = { ...state, bookings: [booking, ...state.bookings] };
  next = notify(next, user.id, {
    title: "درخواست جلسه ثبت شد",
    body: "منتظر تایید مربی / مدیر بمانید. وضعیت را در پروفایل می‌بینید.",
    tone: "cyan",
  });
  return audit(next, { actorId: user.id, action: "booking.requested", resource: "booking", result: "success", meta: { coachId: input.coachId } });
}

export function reviewBooking(state: KayarState, actor: UserRow, bookingId: string, status: "approved" | "rejected"): KayarState {
  assertCan(toActor(actor), "coaches.approve");
  const booking = state.bookings.find((b) => b.id === bookingId);
  if (!booking) throw new AppError("NOT_FOUND");
  let next: KayarState = {
    ...state,
    bookings: state.bookings.map((b) => (b.id === bookingId ? { ...b, status } : b)),
  };
  next = notify(next, booking.userId, {
    title: status === "approved" ? "جلسه تایید شد" : "درخواست جلسه رد شد",
    body: status === "approved" ? "مربی شما را در زمان انتخابی می‌پذیرد." : "زمان دیگری را انتخاب کنید.",
    tone: status === "approved" ? "neon" : "gold",
  });
  return audit(next, { actorId: actor.id, action: `booking.${status}`, resource: "booking", result: "success", meta: { bookingId } });
}

export function saveProfile(state: KayarState, userId: string, patch: Partial<Profile>): KayarState {
  return {
    ...state,
    users: state.users.map((u) => (u.id === userId ? { ...u, profile: { ...u.profile, ...patch } } : u)),
  };
}

const GOAL_LABEL: Record<Goal, string> = {
  fatloss: "کاهش وزن",
  muscle: "عضله‌سازی",
  fitness: "آمادگی عمومی",
  flexibility: "انعطاف و ریکاوری",
};

export function bodyyarReply(profile: Profile, text: string): string {
  const q = text.trim();
  const goal = /چربی|لاغر|وزن|کالری/.test(q)
    ? "fatloss"
    : /عضله|حجم|قدرت|اسکوات/.test(q)
      ? "muscle"
      : /خواب|ریکاوری|خستگی|کشش/.test(q)
        ? "flexibility"
        : /تغذیه|غذا|پروتئین|رژیم/.test(q)
          ? profile.goal
          : profile.goal;
  const level = profile.level === "beginner" ? "۳ جلسه" : profile.level === "mid" ? "۴ جلسه" : "۵ جلسه";
  const blocks: Record<Goal, string> = {
    fatloss: `${level} در هفته: ۴۰ دقیقه قدرتی فول‌بادی + ۱۲ دقیقه کاردیو اینتروال. پروتئین حدود ۱٫۶ گرم به ازای هر کیلو. کسری کالری ملایم ۳۰۰ تا ۴۰۰.`,
    muscle: `${level} در هفته با تاکید بر اسکوات، پرس و ددلیفت. پیشروی بار ۲٫۵٪ وقتی هر ست را تمیز تمام کردید. خواب حداقل ۷ ساعت.`,
    fitness: `${level} ترکیبی: دو روز قدرت، یک روز هوازی، یک روز تحرک. شدت را طوری نگه دارید که بتوانید حرف بزنید.`,
    flexibility: `روزانه ۱۰ دقیقه کشش پویا قبل تمرین و ۸ دقیقه ایستا بعد از آن. یک روز کامل ریکاوری فعال (پیاده‌روی).`,
  };
  const name = profile.displayName || "ورزشکار";
  return `${name}، بر اساس هدف «${GOAL_LABEL[goal]}» و سطح شما:\n${blocks[goal]}\n${
    profile.restrictions ? `محدودیت ثبت‌شده («${profile.restrictions}») را در انتخاب حرکت رعایت کن.` : "اگر درد مفصل داری، حرکت را جایگزین کن نه اینکه فشار را بالا ببری."
  }\nاین پیشنهاد موتور محلی بدن‌یار است؛ به پزشک جایگزین نمی‌شود.`;
}

export function pushChat(state: KayarState, user: UserRow, text: string): KayarState {
  const reply = bodyyarReply(user.profile, text);
  const now = Date.now();
  const thread = state.chats[user.id] ?? [];
  const nextThread: ChatMessage[] = [
    ...thread,
    { id: randomId("m"), role: "user" as const, text: text.slice(0, 500), atMs: now },
    { id: randomId("m"), role: "assistant" as const, text: reply, atMs: now + 1 },
  ].slice(-40);
  return { ...state, chats: { ...state.chats, [user.id]: nextThread } };
}

export const CAMPAIGNS = [
  {
    id: "kapoosh-30",
    brand: "KAPOOSH",
    title: "چالش ۳۰ روزه حرکت",
    desc: "هر روز یک چک‌این تمرین. بعد از ۷ روز، کوپن خرید کاپوش آزاد می‌شود.",
    reward: "۱۵٪ تخفیف کاپوش",
    need: 7,
    tone: "gold" as const,
    image: "/images/campaign-gold.jpg",
  },
  {
    id: "neon-streak",
    brand: "KAYAR",
    title: "رگه تمرین هفتگی",
    desc: "۵ چک‌این در این کمپین = نشان «بهتر از دیروز» در پروفایل.",
    reward: "نشان نئون پروفایل",
    need: 5,
    tone: "neon" as const,
    image: "/images/admin-hero.jpg",
  },
  {
    id: "recover-lab",
    brand: "MYPROTEIN",
    title: "هفته ریکاوری",
    desc: "۳ چک‌این خواب و کشش. پاداش: کد مکمل ریکاوری.",
    reward: "کد ریکاوری",
    need: 3,
    tone: "violet" as const,
    image: "/images/morshed.jpg",
  },
] as const;

export type CampaignId = (typeof CAMPAIGNS)[number]["id"];

function todayKey(now = Date.now()): string {
  return new Date(now).toISOString().slice(0, 10);
}

export function joinCampaign(state: KayarState, userId: string, campaignId: string): KayarState {
  const list = state.campaigns[userId] ?? [];
  if (list.some((c) => c.campaignId === campaignId)) throw new AppError("CONFLICT", "قبلاً در این کمپین عضو شده‌اید.");
  const row: JoinedCampaign = { campaignId, joinedAtMs: Date.now(), checkins: [], claimedAtMs: null, rewardCode: null };
  let next: KayarState = { ...state, campaigns: { ...state.campaigns, [userId]: [...list, row] } };
  next = notify(next, userId, { title: "عضویت در کمپین", body: "چک‌این امروز را از صفحه کمپین ثبت کنید.", tone: "gold" });
  return next;
}

export function checkinCampaign(state: KayarState, userId: string, campaignId: string): KayarState {
  const list = state.campaigns[userId] ?? [];
  const row = list.find((c) => c.campaignId === campaignId);
  if (!row) throw new AppError("NOT_FOUND", "اول در کمپین عضو شوید.");
  const key = todayKey();
  if (row.checkins.includes(key)) throw new AppError("CONFLICT", "چک‌این امروز قبلاً ثبت شده است.");
  const spec = CAMPAIGNS.find((c) => c.id === campaignId);
  const updated = { ...row, checkins: [...row.checkins, key] };
  let next: KayarState = {
    ...state,
    campaigns: { ...state.campaigns, [userId]: list.map((c) => (c.campaignId === campaignId ? updated : c)) },
  };
  if (spec && updated.checkins.length >= spec.need) {
    next = notify(next, userId, { title: "پاداش آماده است", body: `«${spec.reward}» را می‌توانید دریافت کنید.`, tone: "gold" });
  }
  return next;
}

export function claimReward(state: KayarState, userId: string, campaignId: string): KayarState {
  const list = state.campaigns[userId] ?? [];
  const row = list.find((c) => c.campaignId === campaignId);
  const spec = CAMPAIGNS.find((c) => c.id === campaignId);
  if (!row || !spec) throw new AppError("NOT_FOUND");
  if (row.claimedAtMs) throw new AppError("CONFLICT", "این پاداش قبلاً دریافت شده است.");
  if (row.checkins.length < spec.need) throw new AppError("FORBIDDEN", "هنوز به حد نصاب چک‌این نرسیده‌اید.");
  const rewardCode = `KYR-${campaignId.slice(0, 4).toUpperCase()}-${userId.slice(-4).toUpperCase()}`;
  const updated = { ...row, claimedAtMs: Date.now(), rewardCode };
  let next: KayarState = {
    ...state,
    campaigns: { ...state.campaigns, [userId]: list.map((c) => (c.campaignId === campaignId ? updated : c)) },
  };
  next = notify(next, userId, { title: "پاداش ثبت شد", body: `کد شما: ${rewardCode}`, tone: "neon" });
  return audit(next, { actorId: userId, action: "reward.claimed", resource: "campaign", result: "success", meta: { campaignId } });
}

export const TRACKS = [
  { id: "mind-1", title: "قدرت ذهن در ست آخر", creator: "مرشد · سارا نادری", cat: "ذهن", minutes: 0.75, image: "/images/morshed.jpg", hue: 270 },
  { id: "mind-2", title: "تمرکز قبل از مسابقه", creator: "مرشد · کاوه رستمی", cat: "ذهن", minutes: 0.6, image: "/images/ai-brain.jpg", hue: 262 },
  { id: "move-1", title: "ریتم تمرین سنگین", creator: "مرشد موزیک", cat: "ریتم", minutes: 0.9, image: "/images/gym.jpg", hue: 78 },
  { id: "move-2", title: "کاردیو، قدم ثابت", creator: "مرشد موزیک", cat: "ریتم", minutes: 0.7, image: "/images/admin-hero.jpg", hue: 84 },
  { id: "food-1", title: "پروتئین بدون وسواس", creator: "مرشد · تغذیه", cat: "تغذیه", minutes: 0.55, image: "/images/campaign-gold.jpg", hue: 38 },
  { id: "life-1", title: "خواب ورزشکار", creator: "مرشد · ریکاوری", cat: "زندگی", minutes: 0.65, image: "/images/coach-female2.jpg", hue: 200 },
] as const;

export function toggleTrackFav(state: KayarState, userId: string, trackId: string): KayarState {
  const cur = state.morshedFav[userId] ?? [];
  const next = cur.includes(trackId) ? cur.filter((id) => id !== trackId) : [...cur, trackId];
  return { ...state, morshedFav: { ...state.morshedFav, [userId]: next } };
}

export function rememberPlay(state: KayarState, userId: string, trackId: string, positionSec: number): KayarState {
  const hist = state.morshedHistory[userId] ?? [];
  const row = { trackId, atMs: Date.now(), positionSec };
  return {
    ...state,
    morshedHistory: { ...state.morshedHistory, [userId]: [row, ...hist.filter((h) => h.trackId !== trackId)].slice(0, 20) },
    play: { ...state.play, trackId, positionSec, playing: true, queue: state.play.queue.length ? state.play.queue : TRACKS.map((t) => t.id) },
  };
}

export function markNotesRead(state: KayarState, userId: string): KayarState {
  return {
    ...state,
    notes: { ...state.notes, [userId]: (state.notes[userId] ?? []).map((n) => ({ ...n, read: true })) },
  };
}
