import type { PublicMember } from './util.js';
import type { TrackDto } from './tracks.js';
import type { BodyyarPlan, BodyyarProfile, BodyyarWeight } from './bodyyar.js';

/**
 * Transport-agnostic contract of every RPC endpoint.
 * The frontend client (`apps/kayar-1/src/lib/api-client.ts`) and the backend
 * registry (`apps/api/src/endpoints/index.ts`) both implement exactly these shapes.
 */

/* ---------------- auth ---------------- */
export type AuthLoginInput = { username: string; password: string; scope: 'app' | 'admin'; userAgent?: string };
export type AuthLoginOutput = { token: string; expiresAt: string; member: PublicMember; permissions: string[] };
export type AuthLogoutInput = { token?: string; all?: boolean };
export type AuthLogoutOutput = { ok: boolean };
export type AuthMeInput = { token?: string };
export type AuthMeOutput = { member: PublicMember; permissions: string[] };
export type AuthSessionsInput = { token?: string; revokeId?: string };
export type AuthSessionsOutput = { sessions: { id: string; userAgent: string; createdAt: string | null; lastSeenAt: string | null; current: boolean }[] };
export type AuthChangePasswordInput = { token?: string; current: string; next: string };
export type AuthChangePasswordOutput = { ok: boolean };

/* ---------------- public ---------------- */
export type PublicSettingsOutput = {
  siteName: string; shopUrl: string; supportPhone: string; supportEmail: string; supportWhatsapp: string;
  instagram: string; telegram: string; jamendoEnabled: boolean; maintenance: boolean; maintenanceMessage: string;
  loginHelpText: string; adminReady: boolean;
};
export type PublicCmsOutput = { blocks: { key: string; content: string }[] };
export type PublicPostCard = {
  slug: string; title: string; excerpt: string; coverUrl: string; coverAlt: string; tags: string[]; publishedAt: string;
};
export type PublicPostsOutput = {
  posts: PublicPostCard[]; total: number; tags: string[];
  post: (PublicPostCard & { body: string; seoTitle: string; seoDescription: string }) | null;
};
export type KapooshProductsOutput = { products: { id: number; name: string; price: number; image: string; link: string }[]; live: boolean };

/* ---------------- app ---------------- */
export type MorshedCollection = { id: string; title: string; slug: string; description: string; coverUrl: string; type: string; tracks: TrackDto[] };
export type MorshedTracksOutput = {
  tracks: TrackDto[]; collections: MorshedCollection[]; hasMore: boolean;
  jamendo: { available: boolean; reason: 'ok' | 'disabled' | 'blocked' };
};
export type AppLibraryOutput = {
  favKeys: string[];
  favorites: { key: string; track: TrackDto | null }[];
  history: { key: string; track: TrackDto | null; positionSec: number; completed: boolean; playedAt: string | null }[];
  position: number;
};
export type AppNotificationsOutput = { items: { id: string; title: string; body: string; link: string; external: boolean; at: string | null }[] };

/* ---------------- admin: members ---------------- */
export type AdminMembersOutput = { rows: PublicMember[]; total: number; csv?: string };
export type AdminMemberCreateOutput = { member: PublicMember; tempPassword: string };
export type AdminMemberActionOutput = {
  member: PublicMember; tempPassword?: string;
  sessions?: { id: string; userAgent: string; createdAt: string | null; lastSeenAt: string | null; active: boolean }[];
};
export type AdminMemberBulkOutput = {
  results: { index: number; name: string; phone: string; username: string; status: 'ok' | 'error' | 'created' | 'skipped'; error?: string; tempPassword?: string }[];
};

/* ---------------- admin: content ---------------- */
export type AdminCmsBlock = {
  key: string; draft: string; published: string; status: 'draft' | 'published';
  version: number; updatedBy: string; updatedAt: string | null; hasUnpublished: boolean;
};
export type AdminCmsOutput = {
  blocks: AdminCmsBlock[];
  versions: { id: string; version: number; savedBy: string; createdAt: string | null; content: string }[];
};
export type AdminPost = {
  id: string; title: string; slug: string; excerpt: string; body: string; coverMediaId: string; coverUrl: string;
  tags: string[]; status: string; publishedAt: string | null; seoTitle: string; seoDescription: string;
  author: string; createdAt: string | null; updatedAt: string | null;
};
export type AdminPostsOutput = { posts: AdminPost[]; saved: AdminPost | null };
export type AdminMediaAsset = {
  id: string; url: string; alt: string; kind: string; width: number; height: number; size: number;
  fileName: string; mime: string; uploadedBy: string; createdAt: string | null;
};
export type AdminMediaOutput = {
  assets: AdminMediaAsset[];
  saved: AdminMediaAsset | null;
  usage: { type: string; id: string; title: string; live: boolean }[];
};
export type AdminAnnouncement = {
  id: string; title: string; body: string; link: string; startsAt: string | null; endsAt: string | null;
  status: string; audience: string; createdBy: string; updatedAt: string | null;
};
export type AdminAnnouncementsOutput = { items: AdminAnnouncement[] };

/* ---------------- admin: morshed ---------------- */
export type AdminTrack = {
  id: string; title: string; artist: string; album: string; source: string; sourceId: string; coverUrl: string;
  audioUrl: string; duration: number; licenseUrl: string; shareUrl: string; rights: string; categories: string[];
  tags: string[]; featured: boolean; status: string; sortOrder: number;
};
export type AdminJamendoTrack = {
  id: string; title: string; artist: string; album: string; duration: number; image: string; audio: string;
  shareUrl: string; licenseUrl: string; license: string; added: boolean;
};
export type AdminTracksOutput = {
  tracks: AdminTrack[]; jamendo: AdminJamendoTrack[]; hasMore: boolean;
  status: { available: boolean; reason: string; configured: boolean };
};
export type AdminCollection = {
  id: string; title: string; slug: string; description: string; coverUrl: string; type: string;
  placement: string; status: string; sortOrder: number; count: number;
};
export type AdminCollectionsOutput = {
  collections: AdminCollection[];
  items: { id: string; trackId: string; title: string; artist: string; coverUrl: string; status: string }[];
};

/* ---------------- admin: system ---------------- */
export type AdminSettingsOutput = {
  settings: {
    siteName: string; shopUrl: string; supportPhone: string; supportEmail: string; supportWhatsapp: string;
    instagram: string; telegram: string; jamendoEnabled: boolean; maintenance: boolean; maintenanceMessage: string;
    loginHelpText: string;
  };
  secrets: { key: string; set: boolean }[];
};
export type AdminDashboardOutput = {
  customers: { total: number; active: number; neverLoggedIn: number; mustChange: number };
  posts: number; publishedTracks: number;
  days: { date: string; logins: number; plays: number }[];
  topTracks: { title: string; artist: string; plays: number }[];
  recent: { action: string; actor: string; at: string }[];
};
export type AdminAuditOutput = {
  rows: { id: string; action: string; actor: string; targetType: string; targetId: string; meta: string; at: string }[];
  total: number; actions: string[];
};

/* ---------------- bodyyar ---------------- */
export type BodyyarAiOutput = { enabled: boolean; text?: string; plan?: unknown };
export type BodyyarProfileOutput = { profile: BodyyarProfile | null };
export type BodyyarPlanOutput = { plan: (BodyyarPlan & { id: string; createdAt: string | null; version: number }) | null; plans: { id: string; title: string; createdAt: string | null; version: number }[] };
export type BodyyarWorkoutLogOutput = { ok: boolean; done: { dayIndex: number; exerciseIndex: number; done: boolean }[] };
export type BodyyarWeightLogOutput = { ok: boolean; logs: BodyyarWeight[] };
export type BodyyarChatOutput = { ok: boolean; reply: string; history: { role: 'user' | 'assistant'; content: string }[] };

/** Map of endpoint name → input/output types, used by the typed client. */
export interface EndpointContract {
  adminMemberCreate: { input: { token?: string; displayName: string; phone?: string; username?: string; password?: string; orderRef?: string; note?: string; tags?: string[]; role: 'member' | 'support' | 'editor' | 'admin' | 'superadmin' }; output: AdminMemberCreateOutput };
  adminMembers: { input: { token?: string; kind: 'customer' | 'staff'; q?: string; status: 'all' | 'active' | 'suspended'; flag: 'none' | 'neverLoggedIn' | 'mustChange'; createdFrom?: string; sort: 'newest' | 'oldest' | 'name' | 'lastLogin'; csv?: boolean; page: number; pageSize: number }; output: AdminMembersOutput };
  adminMemberAction: { input: { token?: string; id: string; action: 'update' | 'reset' | 'suspend' | 'unsuspend' | 'logoutAll' | 'delete' | 'sessions'; patch?: Record<string, unknown> }; output: AdminMemberActionOutput };
  adminMemberBulk: { input: { token?: string; rows: { name: string; phone: string; orderRef?: string }[]; dryRun: boolean; batchId: string }; output: AdminMemberBulkOutput };
  authLogin: { input: AuthLoginInput; output: AuthLoginOutput };
  authLogout: { input: AuthLogoutInput; output: AuthLogoutOutput };
  authMe: { input: AuthMeInput; output: AuthMeOutput };
  authSessions: { input: AuthSessionsInput; output: AuthSessionsOutput };
  authChangePassword: { input: AuthChangePasswordInput; output: AuthChangePasswordOutput };
  publicSettings: { input: Record<string, never>; output: PublicSettingsOutput };
  adminSettings: { input: { token?: string; save?: Record<string, unknown> }; output: AdminSettingsOutput };
  publicCms: { input: Record<string, never>; output: PublicCmsOutput };
  adminCms: { input: { token?: string; action: 'list' | 'saveDraft' | 'publish' | 'unpublish' | 'versions' | 'restore'; key?: string; content?: string; versionId?: string }; output: AdminCmsOutput };
  publicPosts: { input: { slug?: string; tag?: string; page: number; pageSize: number }; output: PublicPostsOutput };
  adminPosts: { input: { token?: string; action: 'list' | 'save' | 'delete'; id?: string; post?: Record<string, unknown> }; output: AdminPostsOutput };
  adminMedia: { input: { token?: string; action: 'list' | 'register' | 'update' | 'delete' | 'usage'; id?: string; url?: string; alt?: string; fileName?: string; width?: number; height?: number }; output: AdminMediaOutput };
  adminCollections: { input: { token?: string; action: 'list' | 'save' | 'delete' | 'reorder' | 'items' | 'addItem' | 'removeItem' | 'reorderItems'; id?: string; trackId?: string; itemId?: string; ids?: string[]; data?: Record<string, unknown> }; output: AdminCollectionsOutput };
  adminTracks: { input: { token?: string; action: 'list' | 'jamendoSearch' | 'addJamendo' | 'update' | 'reorder' | 'delete'; q?: string; tags?: string; order?: 'popularity_month' | 'popularity_week' | 'releasedate_desc' | 'relevance'; page: number; jamendoId?: string; id?: string; ids?: string[]; patch?: Record<string, unknown> }; output: AdminTracksOutput };
  morshedTracks: { input: { token?: string; mode: 'library' | 'home' | 'jamendo'; q?: string; cat?: string; page: number }; output: MorshedTracksOutput };
  appLibrary: { input: { token?: string; action: 'favKeys' | 'favorites' | 'toggleFav' | 'history' | 'progress' | 'resume'; key?: string; position?: number; completed?: boolean }; output: AppLibraryOutput };
  appNotifications: { input: { token?: string }; output: AppNotificationsOutput };
  adminAnnouncements: { input: { token?: string; action: 'list' | 'save' | 'setStatus' | 'delete'; id?: string; data?: Record<string, unknown>; status?: 'draft' | 'published' }; output: AdminAnnouncementsOutput };
  adminAudit: { input: { token?: string; q?: string; action?: string; from?: string; to?: string; page: number; pageSize: number }; output: AdminAuditOutput };
  adminDashboard: { input: { token?: string }; output: AdminDashboardOutput };
  kapooshProducts: { input: { limit?: number }; output: KapooshProductsOutput };
  bodyyarAi: { input: { mode: 'status' | 'plan' | 'chat'; profile?: Record<string, unknown>; messages?: { role: 'user' | 'assistant'; content: string }[] }; output: BodyyarAiOutput };
  bodyyarProfile: { input: { token?: string; save?: Partial<BodyyarProfile> }; output: BodyyarProfileOutput };
  bodyyarPlan: { input: { token?: string; action?: 'get' | 'create'; profile?: BodyyarProfile }; output: BodyyarPlanOutput };
  bodyyarWorkoutLog: { input: { token?: string; planId?: string; dayIndex: number; exerciseIndex: number; done: boolean }; output: BodyyarWorkoutLogOutput };
  bodyyarWeightLog: { input: { token?: string; weightKg: number; date?: string }; output: BodyyarWeightLogOutput };
  bodyyarChat: { input: { token?: string; message: string }; output: BodyyarChatOutput };
}

export type EndpointName = keyof EndpointContract;
export type InputOf<K extends EndpointName> = EndpointContract[K]['input'];
export type OutputOf<K extends EndpointName> = EndpointContract[K]['output'];
