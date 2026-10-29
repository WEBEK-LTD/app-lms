import type { AppAreas } from "../app/areas";
import type { OwnerPushKind } from "../data/types";

/**
 * 60 Team members for clients: who may do what in a client's dashboard and
 * in the Owner API (Yallapp Business). This is the one place that decides;
 * the dashboard's pages, its server actions, the sidebar, the Owner API's
 * routes and the pushes to phones all ask `teamCan`.
 *
 * - **Owner**: the client's own user (and Yallapp's team managing the
 *   dashboard): everything.
 * - **Manager**: everything except what only the owner does (`OWNER_ONLY`):
 *   License & payments, the team, adding or deleting apps and changing an
 *   app's type or where its content comes from.
 * - **Staff**: only the areas the owner ticked (`TEAM_AREAS`); never the
 *   app's settings (setup, pages, languages, builds, publishing, sign-in).
 *
 * Any member can be limited to some of the client's apps (`appIds`); the
 * owner always has all of them.
 */

export const TEAM_ROLES = ["owner", "manager", "staff"] as const;
export type TeamRole = (typeof TEAM_ROLES)[number];
/** The roles the owner gives (the owner is the client's own user, never invited). */
export const MEMBER_ROLES = ["manager", "staff"] as const;
export type MemberRole = (typeof MEMBER_ROLES)[number];

/** What a Staff member can be given, in the order the Team page lists them. */
export const TEAM_AREAS = ["orders", "bookings", "events", "donations", "catalog", "media", "messages", "chat", "app_users", "analytics", "notifications"] as const;
export type TeamArea = (typeof TEAM_AREAS)[number];

/**
 * Only the owner: `billing` (License & plugin, Yallapp's plans, storage packs
 * and receipts, and where a shop's or charity's money goes: its own payment
 * keys and the marketplace payee), `team`, and `apps` (add or delete an app,
 * change its type or its content source).
 */
export const OWNER_ONLY = ["billing", "team", "apps"] as const;
export type OwnerOnly = (typeof OWNER_ONLY)[number];

/**
 * Something to check: an area, `settings` (the app's own settings: owner and
 * managers), an owner-only permission, or `dashboard` (anyone on the team:
 * the overview, the preview, the bell, their own phones).
 */
export type TeamPermission = TeamArea | OwnerOnly | "settings" | "dashboard";

export interface TeamAccess {
  role: TeamRole;
  /** A Staff member's areas; owners and managers have them all. */
  areas: readonly TeamArea[];
  /** The apps they work on; null for all of the client's apps (always null for the owner). */
  appIds: readonly string[] | null;
}

export const OWNER_ACCESS: TeamAccess = { role: "owner", areas: TEAM_AREAS, appIds: null };

export const isTeamArea = (value: unknown): value is TeamArea => typeof value === "string" && (TEAM_AREAS as readonly string[]).includes(value);
export const isMemberRole = (value: unknown): value is MemberRole => value === "manager" || value === "staff";
const isOwnerOnly = (permission: TeamPermission): permission is OwnerOnly => (OWNER_ONLY as readonly string[]).includes(permission);

/** Whether the app is one they work on. */
export function inScope(access: TeamAccess, appId: string): boolean {
  return access.role === "owner" || access.appIds === null || access.appIds.includes(appId);
}

/** The apps of the client they work on, in the same order. */
export function scopedApps<T extends { id: string }>(access: TeamAccess, apps: readonly T[]): T[] {
  return apps.filter((app) => inScope(access, app.id));
}

/** The areas they have (all of them for owners and managers). */
export function areasOf(access: TeamAccess): TeamArea[] {
  return access.role === "staff" ? TEAM_AREAS.filter((area) => access.areas.includes(area)) : [...TEAM_AREAS];
}

/**
 * Whether they may do `permission`, on `appId` when given (an app outside
 * their apps is refused whatever the permission). Null access: nobody.
 */
export function teamCan(access: TeamAccess | null | undefined, permission: TeamPermission, appId?: string | null): boolean {
  if (!access) return false;
  if (appId && !inScope(access, appId)) return false;
  if (permission === "dashboard" || access.role === "owner") return true;
  if (isOwnerOnly(permission)) return false;
  if (access.role === "manager") return true;
  if (permission === "settings") return false;
  return access.areas.includes(permission);
}

// What each part of the dashboard needs

/**
 * The dashboard's pages by their address, longest first wins. Every page
 * under /dashboard calls `requireClient` with the permission listed here
 * (tests/unit/team-permissions.test.ts checks every page against it).
 */
export const DASHBOARD_PATHS: readonly (readonly [string, TeamPermission])[] = [
  ["/dashboard/team", "team"],
  ["/dashboard/license", "billing"],
  ["/dashboard/invoices", "billing"],
  ["/dashboard/app-type", "apps"],
  ["/dashboard/setup", "settings"],
  ["/dashboard/pages", "settings"],
  ["/dashboard/languages", "settings"],
  ["/dashboard/protection", "settings"],
  ["/dashboard/app-sign-in", "settings"],
  ["/dashboard/builds", "settings"],
  ["/dashboard/publishing", "settings"],
  ["/dashboard/stability", "settings"],
  ["/dashboard/integrations", "settings"],
  ["/dashboard/media", "media"],
  ["/dashboard/analytics", "analytics"],
  ["/dashboard/orders", "orders"],
  ["/dashboard/catalog", "catalog"],
  ["/dashboard/courses/questions", "messages"],
  ["/dashboard/courses", "catalog"],
  ["/dashboard/articles", "catalog"],
  ["/dashboard/listings", "catalog"],
  ["/dashboard/inquiries", "messages"],
  ["/dashboard/chat", "chat"],
  ["/dashboard/services", "bookings"],
  ["/dashboard/appointments", "bookings"],
  ["/dashboard/timetable", "bookings"],
  ["/dashboard/memberships", "bookings"],
  ["/dashboard/members", "bookings"],
  ["/dashboard/events", "events"],
  ["/dashboard/check-in", "events"],
  ["/dashboard/campaigns", "donations"],
  ["/dashboard/donations", "donations"],
  // 104 A delivery company's shipments and couriers are its orders; its prices and choices are its settings.
  ["/dashboard/shipments", "orders"],
  // 105.1 A food company's orders; its restaurants and menus are its catalog.
  ["/dashboard/food-orders", "orders"],
  ["/dashboard/restaurants", "catalog"],
  ["/dashboard/couriers", "orders"],
  // 105.2 A ride company's rides, drivers and statements are its orders; its vehicle types and fares and its ride settings are its settings.
  ["/dashboard/rides", "orders"],
  ["/dashboard/drivers", "orders"],
  ["/dashboard/vehicle-types", "settings"],
  ["/dashboard/ride-settings", "settings"],
  ["/dashboard/delivery", "settings"],
  ["/dashboard/notifications", "notifications"],
  ["/dashboard/preview", "dashboard"],
  ["/dashboard/announcements", "dashboard"],
  ["/dashboard/phones", "dashboard"],
  // 66 Your account: anyone sees it; only the owner can ask to delete the account (lib/account/deletion.ts).
  ["/dashboard/account", "dashboard"],
  ["/dashboard/businesses", "dashboard"],
  ["/dashboard", "dashboard"],
];

/** What a dashboard address needs (the sidebar hides links the person can't open). */
export function pathPermission(href: string): TeamPermission {
  const path = href.split(/[?#]/)[0] ?? href;
  let best: (typeof DASHBOARD_PATHS)[number] | null = null;
  for (const entry of DASHBOARD_PATHS) {
    // The overview is only itself; every other entry covers its pages below.
    const covers = path === entry[0] || (entry[0] !== "/dashboard" && path.startsWith(`${entry[0]}/`));
    if (covers && (!best || entry[0].length > best[0].length)) best = entry;
  }
  // Anything else under /dashboard is the app's settings; addresses elsewhere (support) are for everyone.
  return best ? best[1] : path.startsWith("/dashboard") ? "settings" : "dashboard";
}

/** What each part of an app (lib/app/areas.ts, the Owner API's `features`) needs. */
export const APP_AREA_PERMISSION: Record<keyof AppAreas, TeamPermission> = {
  orders: "orders",
  kitchen: "orders",
  appointments: "bookings",
  events: "events",
  checkIn: "events",
  donations: "donations",
  products: "catalog",
  courses: "catalog",
  articles: "catalog",
  listings: "catalog",
  inquiries: "messages",
  questions: "messages",
  reviews: "catalog",
  memberCheckIn: "bookings",
  appUsers: "app_users",
  notifications: "notifications",
  media: "media",
  analytics: "analytics",
  preview: "dashboard",
  builds: "settings",
};

/** What the app has and they may use: the parts they may not are false. */
export function allowedAreas(areas: AppAreas, access: TeamAccess, appId: string): AppAreas {
  return Object.fromEntries(Object.entries(areas).map(([key, has]) => [key, has && teamCan(access, APP_AREA_PERMISSION[key as keyof AppAreas], appId)])) as unknown as AppAreas;
}

/**
 * Who gets each push on their phone (Yallapp Business). A payment to
 * Yallapp is `billing`, a donation `donations`: `pushToOwner` takes the
 * permission of the moment, these are the defaults by kind.
 */
export const PUSH_PERMISSION: Record<OwnerPushKind, TeamPermission> = {
  new_order: "orders",
  new_booking: "bookings",
  new_message: "messages",
  new_chat_message: "chat",
  new_review: "catalog",
  payment_received: "billing",
  build_finished: "settings",
  yallapp_updates: "dashboard",
  account_notices: "settings",
};

// The owner's choices on the Team page and in the Owner API

export interface AccessInput {
  role: MemberRole;
  areas: TeamArea[];
  appIds: string[] | null;
}

/**
 * Reads a role, areas and apps (from a form or JSON): Staff needs at least
 * one area; apps must be the client's own (`clientAppIds`), and "some apps"
 * at least one of them. Managers keep no areas of their own (they have all).
 */
export function readAccess(
  input: { role: unknown; areas: unknown; appIds: unknown },
  clientAppIds: readonly string[],
): { ok: true; access: AccessInput } | { ok: false; errors: Record<string, string> } {
  const errors: Record<string, string> = {};
  const role = isMemberRole(input.role) ? input.role : null;
  if (!role) errors.role = "Choose Manager or Staff.";
  const rawAreas = Array.isArray(input.areas) ? input.areas : [];
  const areas = TEAM_AREAS.filter((area) => rawAreas.includes(area));
  if (rawAreas.some((area) => !isTeamArea(area))) errors.areas = "Choose what they can work on.";
  else if (role === "staff" && areas.length === 0) errors.areas = "Choose at least one thing Staff can work on.";
  let appIds: string[] | null = null;
  if (input.appIds !== null && input.appIds !== undefined) {
    const raw = Array.isArray(input.appIds) ? input.appIds : [];
    appIds = clientAppIds.filter((id) => raw.includes(id));
    if (raw.length === 0 || appIds.length !== new Set(raw).size) errors.appIds = "Choose at least one of your apps.";
  }
  if (Object.keys(errors).length || !role) return { ok: false, errors };
  return { ok: true, access: { role, areas: role === "staff" ? areas : [], appIds } };
}

/** The English names (the admin, audit lines); the dashboard has them in its catalogs (`team.areas`). */
export const ROLE_NAMES: Record<TeamRole, string> = { owner: "Owner", manager: "Manager", staff: "Staff" };
export const AREA_NAMES: Record<TeamArea, string> = {
  orders: "Orders & kitchen",
  bookings: "Bookings & appointments",
  events: "Events & check-in",
  donations: "Donations",
  catalog: "Catalog & content",
  media: "Media",
  messages: "Messages",
  chat: "Chat",
  app_users: "App users",
  analytics: "Analytics",
  notifications: "Notifications to app users",
};
