import * as s from '../db/schema.js';
import { db } from '../db/index.js';
import { rawSql, repo, type Repo } from '../db/adapter.js';

/**
 * The record API used by the Kayar endpoints, now backed by Drizzle/PostgreSQL.
 * `zite.tx(fn)` runs `fn` inside a real database transaction.
 */
function makeZite(executor: any = db) {
  return {
    members: repo(s.members, executor) as Repo,
    sessions: repo(s.sessions, executor) as Repo,
    loginAttempts: repo(s.loginAttempts, executor) as Repo,
    auditLogs: repo(s.auditLogs, executor) as Repo,
    siteSettings: repo(s.siteSettings, executor) as Repo,
    cmsBlocks: repo(s.cmsBlocks, executor) as Repo,
    cmsBlockVersions: repo(s.cmsBlockVersions, executor) as Repo,
    posts: repo(s.posts, executor) as Repo,
    mediaAssets: repo(s.mediaAssets, executor) as Repo,
    tracks: repo(s.tracks, executor) as Repo,
    collections: repo(s.collections, executor) as Repo,
    collectionItems: repo(s.collectionItems, executor) as Repo,
    favorites: repo(s.favorites, executor) as Repo,
    listeningHistory: repo(s.listeningHistory, executor) as Repo,
    announcements: repo(s.announcements, executor) as Repo,
    bodyyarProfiles: repo(s.bodyyarProfiles, executor) as Repo,
    bodyyarPlans: repo(s.bodyyarPlans, executor) as Repo,
    bodyyarWorkoutLogs: repo(s.bodyyarWorkoutLogs, executor) as Repo,
    bodyyarWeightLogs: repo(s.bodyyarWeightLogs, executor) as Repo,
    bodyyarMessages: repo(s.bodyyarMessages, executor) as Repo,
  };
}

export type Zite = ReturnType<typeof makeZite> & { sql: typeof rawSql; tx: <T>(fn: (t: Zite) => Promise<T>) => Promise<T> };

export const zite: Zite = Object.assign(makeZite(), {
  sql: rawSql,
  tx: async <T>(fn: (t: Zite) => Promise<T>) => db.transaction(async (trx) => fn(Object.assign(makeZite(trx), { sql: rawSql, tx: async () => { throw new Error('nested transactions are not supported'); } }))),
});

export { s as schema };

/* Record types used by the migrated endpoints. */
export type PostsRecordType = typeof s.posts.$inferSelect;
export type TracksRecordType = typeof s.tracks.$inferSelect;
export type MembersRecordType = typeof s.members.$inferSelect;
export type CollectionsRecordType = typeof s.collections.$inferSelect;
