import { relations, sql } from 'drizzle-orm';
import {
  boolean, date, index, integer, jsonb, pgEnum, pgTable, real, text, timestamp, uniqueIndex, uuid,
} from 'drizzle-orm/pg-core';

/**
 * Kayar — real PostgreSQL schema (15 legacy Zite tables + 5 bodyyar tables).
 * All primary keys are UUIDs, all timestamps are `timestamptz` (UTC), all
 * lookups that must be unique are enforced by a database constraint.
 */

const ts = (name: string) => timestamp(name, { withTimezone: true, mode: 'string' });

export const memberRole = pgEnum('member_role', ['member', 'coach', 'support', 'editor', 'admin', 'superadmin']);
export const memberStatus = pgEnum('member_status', ['active', 'suspended', 'deleted']);
export const cmsStatus = pgEnum('cms_status', ['draft', 'published']);
export const postStatus = pgEnum('post_status', ['draft', 'published', 'archived', 'deleted']);
export const trackSource = pgEnum('track_source', ['jamendo', 'upload', 'external']);
export const trackStatus = pgEnum('track_status', ['draft', 'published', 'hidden', 'deleted']);
export const collectionType = pgEnum('collection_type', ['row', 'playlist']);
export const collectionPlacement = pgEnum('collection_placement', ['home', 'morshed']);
export const collectionStatus = pgEnum('collection_status', ['draft', 'published', 'hidden', 'deleted']);
export const announcementStatus = pgEnum('announcement_status', ['draft', 'published', 'deleted']);
export const announcementAudience = pgEnum('announcement_audience', ['all']);

export const members = pgTable('members', {
  id: uuid('id').primaryKey().defaultRandom(),
  username: text('username').notNull(),
  phone: text('phone'),
  displayName: text('display_name').notNull().default(''),
  role: memberRole('role').notNull().default('member'),
  status: memberStatus('status').notNull().default('active'),
  passwordHash: text('password_hash'),
  mustChangePassword: boolean('must_change_password').notNull().default(false),
  passwordChangedAt: ts('password_changed_at'),
  lastLoginAt: ts('last_login_at'),
  orderRef: text('order_ref').notNull().default(''),
  note: text('note').notNull().default(''),
  createdBy: text('created_by').notNull().default(''),
  tags: text('tags').array().notNull().default(sql`'{}'::text[]`),
  createdAt: ts('created_at').notNull().defaultNow(),
}, (t) => ({
  usernameUnique: uniqueIndex('members_username_unique').on(t.username),
  phoneUnique: uniqueIndex('members_phone_unique').on(t.phone).where(sql`${t.phone} is not null and ${t.status} <> 'deleted'`),
  roleIdx: index('members_role_idx').on(t.role),
  statusIdx: index('members_status_idx').on(t.status),
}));

export const sessions = pgTable('sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  tokenHash: text('token_hash').notNull(),
  memberId: uuid('member_id').notNull().references(() => members.id, { onDelete: 'cascade' }),
  userAgent: text('user_agent').notNull().default(''),
  csrfToken: text('csrf_token').notNull().default(''),
  createdAt: ts('created_at').notNull().defaultNow(),
  lastSeenAt: ts('last_seen_at'),
  expiresAt: ts('expires_at'),
  revokedAt: ts('revoked_at'),
}, (t) => ({
  tokenHashUnique: uniqueIndex('sessions_token_hash_unique').on(t.tokenHash),
  memberIdx: index('sessions_member_idx').on(t.memberId),
}));

export const loginAttempts = pgTable('login_attempts', {
  id: uuid('id').primaryKey().defaultRandom(),
  key: text('key').notNull(),
  count: integer('count').notNull().default(0),
  windowStart: ts('window_start'),
  lockedUntil: ts('locked_until'),
}, (t) => ({ keyUnique: uniqueIndex('login_attempts_key_unique').on(t.key) }));

export const auditLogs = pgTable('audit_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  action: text('action').notNull(),
  actorId: text('actor_id'),
  targetType: text('target_type').notNull().default(''),
  targetId: text('target_id').notNull().default(''),
  meta: text('meta').notNull().default('{}'),
  createdAt: ts('created_at').notNull().defaultNow(),
}, (t) => ({
  actionIdx: index('audit_logs_action_idx').on(t.action),
  createdIdx: index('audit_logs_created_idx').on(t.createdAt),
}));

export const siteSettings = pgTable('site_settings', {
  id: uuid('id').primaryKey().defaultRandom(),
  key: text('key').notNull(),
  value: text('value').notNull().default('{}'),
  updatedAt: ts('updated_at').notNull().defaultNow(),
}, (t) => ({ keyUnique: uniqueIndex('site_settings_key_unique').on(t.key) }));

export const cmsBlocks = pgTable('cms_blocks', {
  id: uuid('id').primaryKey().defaultRandom(),
  key: text('key').notNull(),
  content: text('content').notNull().default(''),
  status: cmsStatus('status').notNull().default('draft'),
  publishedContent: text('published_content').notNull().default(''),
  version: integer('version').notNull().default(0),
  updatedBy: text('updated_by').notNull().default(''),
  updatedAt: ts('updated_at').notNull().defaultNow(),
}, (t) => ({ keyUnique: uniqueIndex('cms_blocks_key_unique').on(t.key) }));

export const cmsBlockVersions = pgTable('cms_block_versions', {
  id: uuid('id').primaryKey().defaultRandom(),
  blockKey: text('block_key').notNull(),
  version: integer('version').notNull().default(0),
  content: text('content').notNull().default(''),
  savedBy: text('saved_by').notNull().default(''),
  createdAt: ts('created_at').notNull().defaultNow(),
}, (t) => ({ blockIdx: index('cms_block_versions_block_idx').on(t.blockKey) }));

export const posts = pgTable('posts', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: text('title').notNull().default(''),
  slug: text('slug').notNull(),
  excerpt: text('excerpt').notNull().default(''),
  body: text('body').notNull().default(''),
  coverMediaId: text('cover_media_id').notNull().default(''),
  tags: text('tags').notNull().default(''),
  status: postStatus('status').notNull().default('draft'),
  publishedAt: ts('published_at'),
  seoTitle: text('seo_title').notNull().default(''),
  seoDescription: text('seo_description').notNull().default(''),
  authorId: text('author_id').notNull().default(''),
  createdAt: ts('created_at').notNull().defaultNow(),
  updatedAt: ts('updated_at').notNull().defaultNow(),
}, (t) => ({
  slugUnique: uniqueIndex('posts_slug_unique').on(t.slug),
  statusIdx: index('posts_status_idx').on(t.status),
  publishedIdx: index('posts_published_at_idx').on(t.publishedAt),
}));

export const mediaAssets = pgTable('media_assets', {
  id: uuid('id').primaryKey().defaultRandom(),
  alt: text('alt').notNull().default(''),
  fileUrl: text('file_url').notNull().default(''),
  kind: text('kind').notNull().default('image'),
  width: integer('width').notNull().default(0),
  height: integer('height').notNull().default(0),
  size: integer('size').notNull().default(0),
  uploadedBy: text('uploaded_by').notNull().default(''),
  fileName: text('file_name').notNull().default(''),
  mimeType: text('mime_type').notNull().default(''),
  createdAt: ts('created_at').notNull().defaultNow(),
});

export const tracks = pgTable('tracks', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: text('title').notNull().default(''),
  source: trackSource('source').notNull().default('upload'),
  sourceId: text('source_id').notNull().default(''),
  artist: text('artist').notNull().default(''),
  album: text('album').notNull().default(''),
  coverUrl: text('cover_url').notNull().default(''),
  audioUrl: text('audio_url').notNull().default(''),
  durationSeconds: integer('duration_seconds').notNull().default(0),
  licenseUrl: text('license_url').notNull().default(''),
  shareUrl: text('share_url').notNull().default(''),
  rights: text('rights').notNull().default(''),
  categories: text('categories').notNull().default(''),
  tags: text('tags').notNull().default(''),
  isFeatured: boolean('is_featured').notNull().default(false),
  status: trackStatus('status').notNull().default('draft'),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: ts('created_at').notNull().defaultNow(),
}, (t) => ({
  sourceUnique: uniqueIndex('tracks_source_source_id_unique').on(t.source, t.sourceId).where(sql`${t.sourceId} <> ''`),
  statusIdx: index('tracks_status_idx').on(t.status),
}));

export const collections = pgTable('collections', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: text('title').notNull().default(''),
  slug: text('slug').notNull(),
  description: text('description').notNull().default(''),
  coverUrl: text('cover_url').notNull().default(''),
  type: collectionType('type').notNull().default('row'),
  placement: collectionPlacement('placement').notNull().default('morshed'),
  status: collectionStatus('status').notNull().default('draft'),
  sortOrder: integer('sort_order').notNull().default(0),
}, (t) => ({
  slugUnique: uniqueIndex('collections_slug_unique').on(t.slug),
  statusIdx: index('collections_status_idx').on(t.status),
}));

export const collectionItems = pgTable('collection_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  collectionId: uuid('collection_id').notNull().references(() => collections.id, { onDelete: 'cascade' }),
  trackId: uuid('track_id').notNull().references(() => tracks.id, { onDelete: 'cascade' }),
  sortOrder: integer('sort_order').notNull().default(0),
}, (t) => ({
  uniq: uniqueIndex('collection_items_collection_track_unique').on(t.collectionId, t.trackId),
  collectionIdx: index('collection_items_collection_idx').on(t.collectionId),
}));

export const favorites = pgTable('favorites', {
  id: uuid('id').primaryKey().defaultRandom(),
  memberId: uuid('member_id').notNull().references(() => members.id, { onDelete: 'cascade' }),
  trackKey: text('track_key').notNull(),
  createdAt: ts('created_at').notNull().defaultNow(),
}, (t) => ({
  uniq: uniqueIndex('favorites_member_track_unique').on(t.memberId, t.trackKey),
}));

export const listeningHistory = pgTable('listening_history', {
  id: uuid('id').primaryKey().defaultRandom(),
  memberId: uuid('member_id').notNull().references(() => members.id, { onDelete: 'cascade' }),
  trackKey: text('track_key').notNull(),
  positionSec: integer('position_sec').notNull().default(0),
  completed: boolean('completed').notNull().default(false),
  playedAt: ts('played_at').notNull().defaultNow(),
}, (t) => ({
  memberTrackIdx: index('listening_history_member_track_idx').on(t.memberId, t.trackKey),
  playedIdx: index('listening_history_played_at_idx').on(t.playedAt),
}));

export const announcements = pgTable('announcements', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: text('title').notNull().default(''),
  body: text('body').notNull().default(''),
  link: text('link').notNull().default(''),
  startsAt: ts('starts_at'),
  endsAt: ts('ends_at'),
  status: announcementStatus('status').notNull().default('draft'),
  audience: announcementAudience('audience').notNull().default('all'),
  updatedAt: ts('updated_at').notNull().defaultNow(),
  createdBy: text('created_by').notNull().default(''),
  createdAt: ts('created_at').notNull().defaultNow(),
}, (t) => ({ statusIdx: index('announcements_status_idx').on(t.status) }));

/* ---------------- bodyyar (AI coach) ---------------- */

export const bodyyarProfiles = pgTable('bodyyar_profiles', {
  id: uuid('id').primaryKey().defaultRandom(),
  memberId: uuid('member_id').notNull().references(() => members.id, { onDelete: 'cascade' }),
  goal: text('goal').notNull().default(''),
  gender: text('gender').notNull().default(''),
  level: text('level').notNull().default(''),
  daysPerWeek: integer('days_per_week').notNull().default(3),
  place: text('place').notNull().default(''),
  diet: text('diet').notNull().default(''),
  age: integer('age'),
  heightCm: integer('height_cm'),
  weightKg: real('weight_kg'),
  limitations: text('limitations').notNull().default(''),
  createdAt: ts('created_at').notNull().defaultNow(),
  updatedAt: ts('updated_at').notNull().defaultNow(),
}, (t) => ({ memberUnique: uniqueIndex('bodyyar_profiles_member_unique').on(t.memberId) }));

export const bodyyarPlans = pgTable('bodyyar_plans', {
  id: uuid('id').primaryKey().defaultRandom(),
  memberId: uuid('member_id').notNull().references(() => members.id, { onDelete: 'cascade' }),
  title: text('title').notNull().default(''),
  version: integer('version').notNull().default(1),
  plan: jsonb('plan').notNull(),
  profileSnapshot: jsonb('profile_snapshot'),
  createdAt: ts('created_at').notNull().defaultNow(),
}, (t) => ({
  memberIdx: index('bodyyar_plans_member_idx').on(t.memberId),
  createdIdx: index('bodyyar_plans_created_idx').on(t.createdAt),
}));

export const bodyyarWorkoutLogs = pgTable('bodyyar_workout_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  memberId: uuid('member_id').notNull().references(() => members.id, { onDelete: 'cascade' }),
  planId: uuid('plan_id').notNull().references(() => bodyyarPlans.id, { onDelete: 'cascade' }),
  dayIndex: integer('day_index').notNull().default(0),
  exerciseIndex: integer('exercise_index').notNull().default(0),
  done: boolean('done').notNull().default(false),
  createdAt: ts('created_at').notNull().defaultNow(),
  updatedAt: ts('updated_at').notNull().defaultNow(),
}, (t) => ({
  uniq: uniqueIndex('bodyyar_workout_logs_plan_day_exercise_unique').on(t.planId, t.dayIndex, t.exerciseIndex),
}));

export const bodyyarWeightLogs = pgTable('bodyyar_weight_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  memberId: uuid('member_id').notNull().references(() => members.id, { onDelete: 'cascade' }),
  date: date('date', { mode: 'string' }).notNull(),
  weightKg: real('weight_kg').notNull(),
  createdAt: ts('created_at').notNull().defaultNow(),
}, (t) => ({ uniq: uniqueIndex('bodyyar_weight_logs_member_date_unique').on(t.memberId, t.date) }));

export const bodyyarMessages = pgTable('bodyyar_messages', {
  id: uuid('id').primaryKey().defaultRandom(),
  memberId: uuid('member_id').notNull().references(() => members.id, { onDelete: 'cascade' }),
  role: text('role').notNull(),
  content: text('content').notNull().default(''),
  createdAt: ts('created_at').notNull().defaultNow(),
}, (t) => ({ memberIdx: index('bodyyar_messages_member_idx').on(t.memberId, t.createdAt) }));

export const membersRelations = relations(members, ({ many }) => ({ sessions: many(sessions) }));
export const sessionsRelations = relations(sessions, ({ one }) => ({ member: one(members, { fields: [sessions.memberId], references: [members.id] }) }));
export const collectionItemsRelations = relations(collectionItems, ({ one }) => ({
  collection: one(collections, { fields: [collectionItems.collectionId], references: [collections.id] }),
  track: one(tracks, { fields: [collectionItems.trackId], references: [tracks.id] }),
}));
export const bodyyarPlansRelations = relations(bodyyarPlans, ({ one }) => ({ member: one(members, { fields: [bodyyarPlans.memberId], references: [members.id] }) }));

export type MemberRow = typeof members.$inferSelect;
export type SessionRow = typeof sessions.$inferSelect;
export type PostRow = typeof posts.$inferSelect;
export type TrackRow = typeof tracks.$inferSelect;
export type CollectionRow = typeof collections.$inferSelect;
export type MediaAssetRow = typeof mediaAssets.$inferSelect;
export type BodyyarPlanRow = typeof bodyyarPlans.$inferSelect;
export type BodyyarProfileRow = typeof bodyyarProfiles.$inferSelect;
