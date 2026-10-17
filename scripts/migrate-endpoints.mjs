import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Rewrites the endpoint modules that were migrated from the old platform runtime
 * so they run on the new Fastify/Drizzle backend:
 *  - platform imports -> local server modules
 *  - `input.token`      -> the request context (httpOnly cookie session)
 *  - PascalCase SQL identifiers -> the real snake_case PostgreSQL columns
 */
const dir = 'apps/api/src/endpoints';

const tables = {
  Members: 'members', Sessions: 'sessions', LoginAttempts: 'login_attempts', AuditLogs: 'audit_logs',
  SiteSettings: 'site_settings', CmsBlocks: 'cms_blocks', CmsBlockVersions: 'cms_block_versions',
  Posts: 'posts', MediaAssets: 'media_assets', Tracks: 'tracks', Collections: 'collections',
  CollectionItems: 'collection_items', Favorites: 'favorites', ListeningHistory: 'listening_history',
  Announcements: 'announcements',
};

const columns = {
  displayName: 'display_name', mustChangePassword: 'must_change_password', lastLoginAt: 'last_login_at',
  orderRef: 'order_ref', actorId: 'actor_id', targetType: 'target_type', targetId: 'target_id',
  collectionId: 'collection_id', trackId: 'track_id', fileUrl: 'file_url', coverMediaId: 'cover_media_id',
  publishedAt: 'published_at', seoTitle: 'seo_title', seoDescription: 'seo_description', playedAt: 'played_at',
  positionSec: 'position_sec', fileName: 'file_name', mimeType: 'mime_type', durationSeconds: 'duration_seconds',
  isFeatured: 'is_featured', sortOrder: 'sort_order', licenseUrl: 'license_url', shareUrl: 'share_url',
  blockKey: 'block_key', savedBy: 'saved_by', tokenHash: 'token_hash', memberId: 'member_id',
  userAgent: 'user_agent', lastSeenAt: 'last_seen_at', expiresAt: 'expires_at', revokedAt: 'revoked_at',
  windowStart: 'window_start', lockedUntil: 'locked_until', publishedContent: 'published_content',
  updatedBy: 'updated_by', startsAt: 'starts_at', endsAt: 'ends_at', createdBy: 'created_by',
};

const sqlOnly = (text) => text.split('\n').map((line) => {
  let out = line;
  for (const [from, to] of Object.entries(tables)) out = out.split(`"${from}"`).join(`"${to}"`);
  for (const [from, to] of Object.entries(columns)) out = out.split(`"${from}"`).join(`"${to}"`);
  return out;
}).join('\n');

for (const file of readdirSync(dir).filter((f) => f.endsWith('.ts'))) {
  const path = join(dir, file);
  let src = readFileSync(path, 'utf8');
  src = src
    .replaceAll("from 'zitejs/backend'", "from '../server/backend'")
    .replaceAll("from 'zitejs/db'", "from '../server/db'")
    .replaceAll("from '../lib/cmsSchema'", "from '@kayar/shared'")
    .replaceAll("from '../server/util'", "from '../server/util'");
  // session resolution now comes from the request context (httpOnly cookie)
  src = src
    .replace(/requireStaff\(input\.token,/g, 'requireStaff(ctx,')
    .replace(/requireSession\(input\.token/g, 'requireSession(ctx')
    .replace(/requireMember\(input\.token/g, 'requireMember(ctx')
    .replace(/execute: async \(\{ input \}\) =>/g, 'execute: async ({ input, ctx }) =>')
    .replace(/execute: async \(\) =>/g, 'execute: async ({ ctx }) =>');
  src = sqlOnly(src);
  writeFileSync(path, src);
}

// appLibrary talks to favorites / listening history which are keyed by "track_key"
const lib = join(dir, 'appLibrary.ts');
writeFileSync(lib, readFileSync(lib, 'utf8').replaceAll('trackId', 'trackKey'));

console.log('endpoint modules rewritten:', readdirSync(dir).filter((f) => f.endsWith('.ts')).length);
