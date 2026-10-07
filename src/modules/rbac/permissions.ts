import { AppError } from "../../lib/errors";

/**
 * RBAC — explicit permission catalogue, role grants and pure evaluation.
 * Enforcement is SERVER-SIDE only; hiding UI is cosmetic (Phase 1 §27).
 */

export const PERMISSIONS = [
  "users.read",
  "users.update",
  "users.suspend",
  "coaches.read",
  "coaches.update",
  "coaches.approve",
  "bodyyar.configure",
  "morshed.read",
  "morshed.create",
  "morshed.publish",
  "campaigns.read",
  "campaigns.create",
  "campaigns.publish",
  "cms.read",
  "cms.write",
  "cms.publish",
  "settings.manage",
  "audit.read",
  "notifications.send",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

export const ROLES = ["user", "coach", "admin", "moderator", "support", "sponsor"] as const;
export type Role = (typeof ROLES)[number];

const USER: Permission[] = ["coaches.read", "morshed.read", "campaigns.read"];

const COACH: Permission[] = [
  ...USER,
  "coaches.update",
  "morshed.create",
];

/** Admin gets everything — but still never bypasses ownership rules. */
const ADMIN: Permission[] = [...PERMISSIONS];

export const ROLE_PERMISSIONS: Record<Role, readonly Permission[]> = {
  user: USER,
  coach: COACH,
  admin: ADMIN,
  moderator: [...USER, "morshed.read", "morshed.publish", "cms.read", "cms.write"],
  support: [...USER, "users.read"],
  sponsor: [...USER, "campaigns.create", "campaigns.read"],
};

export interface Actor {
  userId: string;
  roles: Role[];
}

export function permissionsForRoles(roles: Role[]): Permission[] {
  const set = new Set<Permission>();
  for (const role of roles) for (const p of ROLE_PERMISSIONS[role]) set.add(p);
  return [...set];
}

export function hasPermission(actor: Actor, permission: Permission): boolean {
  return permissionsForRoles(actor.roles).includes(permission);
}

export function can(actor: Actor | null | undefined, permission: Permission): boolean {
  if (!actor) return false;
  return hasPermission(actor, permission);
}

/** Throws FORBIDDEN with a Persian message — never relies on hidden UI. */
export function assertCan(actor: Actor | null | undefined, permission: Permission): void {
  if (!can(actor, permission)) {
    throw new AppError("FORBIDDEN", undefined, { permission });
  }
}

export const isAdmin = (actor: Actor | null | undefined): boolean =>
  !!actor && actor.roles.includes("admin");
