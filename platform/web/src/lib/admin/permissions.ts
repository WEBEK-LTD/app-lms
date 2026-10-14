/**
 * The WEBEK team's roles in the super admin pages (roadmap 11.7) and what
 * each one may do. Everyone in SUPER_ADMIN_EMAILS is an owner; the rest of
 * the team is kept in the database (admin_members).
 */

export const ADMIN_ROLES = ["owner", "admin", "support", "viewer"] as const;
export type AdminRole = (typeof ADMIN_ROLES)[number];

export const ADMIN_PERMISSIONS = [
  /** Every admin page, read only. */
  "view",
  /** Invite people, change their roles, remove them. */
  "team.manage",
  /** Activate, extend or change a client's plan, a new license key, release a website. */
  "clients.license",
  /** Suspend and reinstate clients. */
  "clients.suspend",
  /** Add clients, edit their details and their app's settings (their dashboard), app users and notifications. */
  "clients.edit",
  /** Send a client's emails again: the license key, a password link. */
  "clients.email",
  /** Run a client's build again. */
  "builds.manage",
  /** Plans, prices and what each plan offers. */
  "plans.edit",
  /** Yallapp's iyzico account, the marketplace commission and payouts. */
  "payments.manage",
  /** Platform settings: sign-in codes, email, contact details. */
  "settings.edit",
  /** Plugin releases. */
  "releases.manage",
  /** App types, websites and features switched on or off. */
  "switches.edit",
] as const;
export type AdminPermission = (typeof ADMIN_PERMISSIONS)[number];

const SUPPORT: readonly AdminPermission[] = ["view", "clients.license", "clients.edit", "clients.email", "builds.manage"];

export const ROLE_PERMISSIONS: Record<AdminRole, readonly AdminPermission[]> = {
  owner: ADMIN_PERMISSIONS,
  admin: ADMIN_PERMISSIONS.filter((p) => p !== "team.manage"),
  support: SUPPORT,
  viewer: ["view"],
};

export const ROLE_LABELS: Record<AdminRole, string> = { owner: "Owner", admin: "Admin", support: "Support", viewer: "Viewer" };

export const ROLE_DESCRIPTIONS: Record<AdminRole, string> = {
  owner: "Everything, and manages the team.",
  admin: "Everything except the team.",
  support: "Sees everything; activates and extends licenses, changes clients' apps and sends their emails. No prices, plans, payments, settings or releases.",
  viewer: "Sees everything, changes nothing.",
};

export function isAdminRole(value: unknown): value is AdminRole {
  return typeof value === "string" && (ADMIN_ROLES as readonly string[]).includes(value);
}

/** Whether a role may do something; no role may do nothing. */
export function can(role: AdminRole | null | undefined, permission: AdminPermission): boolean {
  return role ? ROLE_PERMISSIONS[role].includes(permission) : false;
}
