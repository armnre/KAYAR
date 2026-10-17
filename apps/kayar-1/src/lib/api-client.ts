import type { EndpointContract, EndpointName } from '@kayar/shared';

/**
 * Typed client for the Kayar API.
 * Every call is a `POST /api/rpc/<name>` with JSON, the session travels in an
 * httpOnly cookie and the CSRF token is sent as a header.
 */

const RPC_BASE = (import.meta.env.VITE_API_BASE as string | undefined) ?? '/api/rpc';

export class ApiRequestError extends Error {
  code: string;
  userFacingMessage: string;
  status: number;
  constructor(code: string, message: string, userFacingMessage: string, status: number) {
    super(message);
    this.name = 'ApiRequestError';
    this.code = code;
    this.userFacingMessage = userFacingMessage;
    this.status = status;
  }
}

export function readCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const hit = document.cookie.split('; ').find((c) => c.startsWith(`${name}=`));
  return hit ? decodeURIComponent(hit.slice(name.length + 1)) : null;
}

const csrfHeaders = (): Record<string, string> => {
  const csrf = readCookie('kayar_csrf');
  return csrf ? { 'x-csrf-token': csrf } : {};
};

export type ClientInput<K extends EndpointName> = Partial<EndpointContract[K]['input']> & Record<string, unknown>;

async function rpc<K extends EndpointName>(name: K, input: unknown): Promise<EndpointContract[K]['output']> {
  let res: Response;
  try {
    res = await fetch(`${RPC_BASE}/${name}`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'content-type': 'application/json', ...csrfHeaders() },
      body: JSON.stringify(input ?? {}),
    });
  } catch {
    throw new ApiRequestError('NETWORK', 'network error', 'ارتباط با سرور برقرار نشد؛ چند لحظه بعد دوباره امتحان کن.', 0);
  }
  const text = await res.text();
  let data: unknown = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = null; }
  if (!res.ok) {
    const e = (data as { error?: { code?: string; message?: string; userFacingMessage?: string } } | null)?.error ?? {};
    throw new ApiRequestError(e.code ?? 'ERROR', e.message ?? `HTTP ${res.status}`, e.userFacingMessage ?? 'یه مشکلی پیش اومد؛ دوباره تلاش کن.', res.status);
  }
  return data as EndpointContract[K]['output'];
}

/* ---------------- auth ---------------- */
export const authLogin = (input: ClientInput<'authLogin'>) => rpc('authLogin', input);
export const authLogout = (input: ClientInput<'authLogout'>) => rpc('authLogout', input);
export const authMe = (input: ClientInput<'authMe'>) => rpc('authMe', input);
export const authSessions = (input: ClientInput<'authSessions'>) => rpc('authSessions', input);
export const authChangePassword = (input: ClientInput<'authChangePassword'>) => rpc('authChangePassword', input);

/* ---------------- public ---------------- */
export const publicSettings = (input: ClientInput<'publicSettings'> = {}) => rpc('publicSettings', input);
export const publicCms = (input: ClientInput<'publicCms'> = {}) => rpc('publicCms', input);
export const publicPosts = (input: ClientInput<'publicPosts'>) => rpc('publicPosts', input);
export const kapooshProducts = (input: ClientInput<'kapooshProducts'> = {}) => rpc('kapooshProducts', input);

/* ---------------- app ---------------- */
export const morshedTracks = (input: ClientInput<'morshedTracks'>) => rpc('morshedTracks', input);
export const appLibrary = (input: ClientInput<'appLibrary'>) => rpc('appLibrary', input);
export const appNotifications = (input: ClientInput<'appNotifications'>) => rpc('appNotifications', input);

/* ---------------- admin ---------------- */
export const adminMembers = (input: ClientInput<'adminMembers'>) => rpc('adminMembers', input);
export const adminMemberCreate = (input: ClientInput<'adminMemberCreate'>) => rpc('adminMemberCreate', input);
export const adminMemberAction = (input: ClientInput<'adminMemberAction'>) => rpc('adminMemberAction', input);
export const adminMemberBulk = (input: ClientInput<'adminMemberBulk'>) => rpc('adminMemberBulk', input);
export const adminSettings = (input: ClientInput<'adminSettings'>) => rpc('adminSettings', input);
export const adminCms = (input: ClientInput<'adminCms'>) => rpc('adminCms', input);
export const adminPosts = (input: ClientInput<'adminPosts'>) => rpc('adminPosts', input);
export const adminMedia = (input: ClientInput<'adminMedia'>) => rpc('adminMedia', input);
export const adminCollections = (input: ClientInput<'adminCollections'>) => rpc('adminCollections', input);
export const adminTracks = (input: ClientInput<'adminTracks'>) => rpc('adminTracks', input);
export const adminAnnouncements = (input: ClientInput<'adminAnnouncements'>) => rpc('adminAnnouncements', input);
export const adminAudit = (input: ClientInput<'adminAudit'>) => rpc('adminAudit', input);
export const adminDashboard = (input: ClientInput<'adminDashboard'>) => rpc('adminDashboard', input);

/* ---------------- bodyyar ---------------- */
export const bodyyarAi = (input: ClientInput<'bodyyarAi'>) => rpc('bodyyarAi', input);
export const bodyyarProfile = (input: ClientInput<'bodyyarProfile'>) => rpc('bodyyarProfile', input);
export const bodyyarPlan = (input: ClientInput<'bodyyarPlan'>) => rpc('bodyyarPlan', input);
export const bodyyarWorkoutLog = (input: ClientInput<'bodyyarWorkoutLog'>) => rpc('bodyyarWorkoutLog', input);
export const bodyyarWeightLog = (input: ClientInput<'bodyyarWeightLog'>) => rpc('bodyyarWeightLog', input);
export const bodyyarChat = (input: ClientInput<'bodyyarChat'>) => rpc('bodyyarChat', input);

/** Streaming variant of the bodyyar chat (server sent events). */
export async function bodyyarChatStream(
  input: { message: string },
  onDelta: (chunk: string) => void,
): Promise<{ ok: boolean; error?: string }> {
  let res: Response;
  try {
    res = await fetch(`${RPC_BASE}/bodyyarChat`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'content-type': 'application/json', accept: 'text/event-stream', ...csrfHeaders() },
      body: JSON.stringify(input),
    });
  } catch {
    throw new ApiRequestError('NETWORK', 'network error', 'ارتباط با سرور برقرار نشد؛ چند لحظه بعد دوباره امتحان کن.', 0);
  }
  if (!res.ok || !res.body) {
    const text = await res.text().catch(() => '');
    let message = 'دستیار هوشمند الان در دسترس نیست؛ کمی بعد دوباره امتحان کن.';
    try { message = (JSON.parse(text).error?.userFacingMessage) ?? message; } catch { /* keep default */ }
    throw new ApiRequestError('AI_UNAVAILABLE', 'ai unavailable', message, res.status);
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split('\n\n');
    buffer = parts.pop() ?? '';
    for (const part of parts) {
      const event = /^event:\s*(.+)$/m.exec(part)?.[1]?.trim();
      const data = /^data:\s*(.+)$/m.exec(part)?.[1];
      if (!data) continue;
      let payload: { text?: string; message?: string };
      try { payload = JSON.parse(data); } catch { continue; }
      if (event === 'delta' && payload.text) onDelta(payload.text);
      if (event === 'error') return { ok: false, error: payload.message };
    }
  }
  return { ok: true };
}

/* ---------------- shared types ---------------- */
export type {
  AdminAnnouncementsOutput, AdminAuditOutput, AdminCmsOutput, AdminCollectionsOutput, AdminDashboardOutput,
  AdminMediaOutput, AdminMemberActionOutput, AdminMemberBulkOutput, AdminMemberCreateOutput, AdminMembersOutput,
  AdminPostsOutput, AdminSettingsOutput, AdminTracksOutput, AppLibraryOutput, AppNotificationsOutput,
  AuthChangePasswordOutput, AuthLoginOutput, AuthLogoutOutput, AuthMeOutput, AuthSessionsOutput,
  BodyyarAiOutput, BodyyarChatOutput, BodyyarPlanOutput, BodyyarProfileOutput, BodyyarWeightLogOutput,
  BodyyarWorkoutLogOutput, KapooshProductsOutput, MorshedTracksOutput, PublicCmsOutput, PublicPostsOutput,
  PublicSettingsOutput, PublicMember, TrackDto,
} from '@kayar/shared';

export type AdminAnnouncementsOutputType = import('@kayar/shared').AdminAnnouncementsOutput;
export type AdminAuditOutputType = import('@kayar/shared').AdminAuditOutput;
export type AdminCmsOutputType = import('@kayar/shared').AdminCmsOutput;
export type AdminCollectionsOutputType = import('@kayar/shared').AdminCollectionsOutput;
export type AdminDashboardOutputType = import('@kayar/shared').AdminDashboardOutput;
export type AdminMediaOutputType = import('@kayar/shared').AdminMediaOutput;
export type AdminMemberActionOutputType = import('@kayar/shared').AdminMemberActionOutput;
export type AdminMemberBulkOutputType = import('@kayar/shared').AdminMemberBulkOutput;
export type AdminMemberCreateOutputType = import('@kayar/shared').AdminMemberCreateOutput;
export type AdminMembersOutputType = import('@kayar/shared').AdminMembersOutput;
export type AdminPostsOutputType = import('@kayar/shared').AdminPostsOutput;
export type AdminSettingsOutputType = import('@kayar/shared').AdminSettingsOutput;
export type AdminTracksOutputType = import('@kayar/shared').AdminTracksOutput;
export type AppLibraryOutputType = import('@kayar/shared').AppLibraryOutput;
export type AppNotificationsOutputType = import('@kayar/shared').AppNotificationsOutput;
export type AuthChangePasswordOutputType = import('@kayar/shared').AuthChangePasswordOutput;
export type AuthLoginOutputType = import('@kayar/shared').AuthLoginOutput;
export type AuthLogoutOutputType = import('@kayar/shared').AuthLogoutOutput;
export type AuthMeOutputType = import('@kayar/shared').AuthMeOutput;
export type AuthSessionsOutputType = import('@kayar/shared').AuthSessionsOutput;
export type BodyyarAiOutputType = import('@kayar/shared').BodyyarAiOutput;
export type BodyyarChatOutputType = import('@kayar/shared').BodyyarChatOutput;
export type BodyyarPlanOutputType = import('@kayar/shared').BodyyarPlanOutput;
export type BodyyarProfileOutputType = import('@kayar/shared').BodyyarProfileOutput;
export type BodyyarWeightLogOutputType = import('@kayar/shared').BodyyarWeightLogOutput;
export type BodyyarWorkoutLogOutputType = import('@kayar/shared').BodyyarWorkoutLogOutput;
export type KapooshProductsOutputType = import('@kayar/shared').KapooshProductsOutput;
export type MorshedTracksOutputType = import('@kayar/shared').MorshedTracksOutput;
export type PublicCmsOutputType = import('@kayar/shared').PublicCmsOutput;
export type PublicPostsOutputType = import('@kayar/shared').PublicPostsOutput;
export type PublicSettingsOutputType = import('@kayar/shared').PublicSettingsOutput;
