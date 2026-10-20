import "server-only";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { getStore } from "../data";
import type { App, Client, License, User } from "../data/types";
import { secureCookies, sessionSecret, superAdminEmails } from "../env";
import { can, type AdminPermission, type AdminRole } from "../admin/permissions";
import { adminRoleOf } from "../admin/team";
import { ipFromHeaders } from "../http";
import { appState, clientAccountState, type AccountState } from "../license/status";
import { businessesOf, businessName } from "../team/service";
import { OWNER_ACCESS, scopedApps, teamCan, type TeamAccess, type TeamPermission, type TeamRole } from "../team/permissions";
import { SESSION_TTL_SECONDS, sealSession, unsealSession } from "./session-token";
import { SIGNED_IN_COOKIE } from "./signed-in-cookie";

export const SESSION_COOKIE = "yallapp_session";
/** The client a super admin is managing from their dashboard. Only read for super admins. */
export const MANAGE_COOKIE = "yallapp_manage";
const MANAGE_TTL_SECONDS = 8 * 60 * 60;
/** The app the dashboard works on, chosen with the app switcher. Only used when it is one of the client's own apps. */
export const APP_COOKIE = "yallapp_app";
const APP_TTL_SECONDS = 365 * 24 * 60 * 60;
/** 60 The business a team member works on, when they're on more than one (their own client or a team they joined). */
export const BUSINESS_COOKIE = "yallapp_business";

export async function startSession(user: Pick<User, "id" | "sessionVersion">): Promise<void> {
  const token = await sealSession({ userId: user.id, sessionVersion: user.sessionVersion }, sessionSecret());
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: secureCookies(),
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
  // The public pages read this one to show "Dashboard" (lib/auth/signed-in-cookie.ts).
  jar.set(SIGNED_IN_COOKIE, "1", { httpOnly: false, secure: secureCookies(), sameSite: "lax", path: "/", maxAge: SESSION_TTL_SECONDS });
}

export async function endSession(): Promise<void> {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
  jar.delete(SIGNED_IN_COOKIE);
  jar.delete(MANAGE_COOKIE);
  jar.delete(APP_COOKIE);
  jar.delete(BUSINESS_COOKIE);
}

/** 60 Makes `clientId` the business the dashboard works on (on its first app). Callers check the person works on it. */
export async function chooseBusiness(clientId: string): Promise<void> {
  const jar = await cookies();
  jar.set(BUSINESS_COOKIE, clientId, { httpOnly: true, secure: secureCookies(), sameSite: "lax", path: "/", maxAge: APP_TTL_SECONDS });
  jar.delete(APP_COOKIE);
}

/**
 * Makes `appId` the app the dashboard works on. Callers check that it is one
 * of the client's apps; getClientContext checks again on every request.
 */
export async function chooseApp(appId: string | null): Promise<void> {
  const jar = await cookies();
  if (!appId) {
    jar.delete(APP_COOKIE);
    return;
  }
  jar.set(APP_COOKIE, appId, {
    httpOnly: true,
    secure: secureCookies(),
    sameSite: "lax",
    path: "/",
    maxAge: APP_TTL_SECONDS,
  });
}

/**
 * A super admin opens a client's dashboard and changes it as the client
 * would: on `appId` when given, else on the client's first app.
 */
export async function startManaging(clientId: string, appId: string | null = null): Promise<void> {
  const jar = await cookies();
  jar.set(MANAGE_COOKIE, clientId, {
    httpOnly: true,
    secure: secureCookies(),
    sameSite: "lax",
    path: "/",
    maxAge: MANAGE_TTL_SECONDS,
  });
  if (appId) {
    jar.set(APP_COOKIE, appId, { httpOnly: true, secure: secureCookies(), sameSite: "lax", path: "/", maxAge: MANAGE_TTL_SECONDS });
  } else {
    jar.delete(APP_COOKIE);
  }
}

export async function stopManaging(): Promise<void> {
  const jar = await cookies();
  jar.delete(MANAGE_COOKIE);
  jar.delete(APP_COOKIE);
}

/** In SUPER_ADMIN_EMAILS: always an owner. The rest of the team has a role in the database (getAdminRole). */
export function isSuperAdmin(user: Pick<User, "email">): boolean {
  return superAdminEmails().includes(user.email.toLowerCase());
}

/** The signed-in user, or null. Cached for the duration of one request. */
export const getCurrentUser = cache(async (): Promise<User | null> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const claims = await unsealSession(token, sessionSecret());
  if (!claims) return null;
  const store = await getStore();
  const user = await store.getUserById(claims.userId);
  if (!user || user.sessionVersion !== claims.sessionVersion) return null;
  return user;
});

/** The signed-in user's role in the admin, or null when they aren't on the team. Cached for one request. */
export const getAdminRole = cache(async (): Promise<AdminRole | null> => {
  const user = await getCurrentUser();
  return user ? adminRoleOf(await getStore(), user) : null;
});

export interface ClientContext {
  /** The client's own user, also when a super admin or a team member is working on the client. */
  user: User;
  /** The super admin managing this client's dashboard, or null for the client themselves. */
  staff: User | null;
  /** 60 The signed-in team member (Manager or Staff) working on this client, or null for the owner and our team. */
  member: User | null;
  /** 60 What the signed-in person may do here (lib/team/permissions.ts): the owner's, a member's role, areas and apps. */
  access: TeamAccess;
  /** 60 Every business the signed-in person works on (their own and the teams they joined); empty for our team. */
  businesses: BusinessChoice[];
  client: Client;
  /** Every app of the account the person works on, oldest first: the app switcher's list. */
  apps: App[];
  /** The app the dashboard works on (the switcher's choice, else the first); null before the account's first app. */
  app: App | null;
  /** The current app's license (before the first app: the one given for it, if any). */
  license: License | null;
  /** The current app's state: pending until that app is activated. */
  state: AccountState;
  /** The whole account's state: active when at least one app has an active license. */
  account: AccountState;
  /** Every license of the account's apps. */
  licenses: License[];
}

/** 60 A business in the switcher. */
export interface BusinessChoice {
  clientId: string;
  name: string;
  role: TeamRole;
  current: boolean;
}

export const getClientContext = cache(async (): Promise<ClientContext | null> => {
  const current = await getCurrentUser();
  if (!current) return null;
  const store = await getStore();
  let user = current;
  let staff: User | null = null;
  let member: User | null = null;
  let access: TeamAccess = OWNER_ACCESS;
  let businesses: BusinessChoice[] = [];
  let client: Client | null;
  const role = await getAdminRole();
  const jar = await cookies();
  if (role) {
    // The team opens a client's dashboard to change their app; viewers only look from the admin.
    if (!can(role, "clients.edit")) return null;
    const managed = jar.get(MANAGE_COOKIE)?.value;
    client = managed && /^[0-9a-f-]{36}$/i.test(managed) ? await store.getClientById(managed) : null;
    const owner = client ? await store.getUserById(client.userId) : null;
    if (!client || !owner) return null;
    user = owner;
    staff = current;
  } else {
    // 60 Their own client and the teams they joined: the one they chose, else the first that is active, else the first.
    const all = await businessesOf(store, current);
    if (!all.length) return null;
    const chosen = jar.get(BUSINESS_COOKIE)?.value;
    const business = all.find((b) => b.client.id === chosen) ?? all.find((b) => b.client.status === "active") ?? all[0]!;
    client = business.client;
    user = business.owner;
    member = business.member ? current : null;
    access = business.access;
    if (all.length > 1) {
      const appsOf = await Promise.all(all.map((b) => store.listAppsByClient(b.client.id)));
      businesses = all.map((b, i) => ({ clientId: b.client.id, name: businessName(b.owner, scopedApps(b.access, appsOf[i]!)), role: b.access.role, current: b === business }));
    }
  }
  const [allApps, licenses] = await Promise.all([store.listAppsByClient(client.id), store.listLicensesByClient(client.id)]);
  // 60 A member limited to some apps sees only those.
  const apps = scopedApps(access, allApps);
  // The switcher's choice, only when it is one of this client's apps; else their first app.
  const chosen = jar.get(APP_COOKIE)?.value;
  const app = apps.find((a) => a.id === chosen) ?? apps[0] ?? null;
  const license = licenses.find((l) => l.appId === (app?.id ?? null)) ?? null;
  const now = new Date();
  return {
    user,
    staff,
    member,
    access,
    businesses,
    client,
    apps,
    app,
    license,
    state: appState(client, license, now),
    account: clientAccountState(client, licenses, now),
    licenses,
  };
});

/** 60 Who is doing something on the dashboard: our team member managing it, the team member, else the owner. */
export function actorOf(context: Pick<ClientContext, "user" | "staff" | "member">): User {
  return context.staff ?? context.member ?? context.user;
}

/** 60 Whether the signed-in person may do `permission` on the current app (for showing or hiding controls). */
export function contextCan(context: Pick<ClientContext, "access" | "app">, permission: TeamPermission): boolean {
  return teamCan(context.access, permission, context.app?.id ?? null);
}

/**
 * Who may use the dashboard: active clients, and our team for any client
 * (so an app can be set up before activation or while suspended).
 */
export function mayUseDashboard(context: ClientContext): boolean {
  return context.client.status === "active" || context.staff !== null;
}

/**
 * 60 For server actions: the client context when the signed-in person may do
 * `permission` on the current app; null when nobody is signed in to a
 * client (the action's own redirect follows); a team member without it goes
 * to the overview, which says so. Every client action asks this.
 */
export async function clientFor(permission: TeamPermission | readonly TeamPermission[]): Promise<ClientContext | null> {
  const context = await getClientContext();
  if (!context) return null;
  // A list: any one of them (the Media picker serves the catalog's and the pages' forms too).
  const wanted = typeof permission === "string" ? [permission] : permission;
  if (!wanted.some((p) => contextCan(context, p))) redirect(`/dashboard?denied=${wanted[0]}`);
  return context;
}

/** Where a signed-in user belongs. */
export async function homeFor(user: User): Promise<string> {
  const store = await getStore();
  if (await adminRoleOf(store, user)) return "/admin";
  // 60 Their own client and the teams they joined: someone on several picks one first.
  const businesses = await businessesOf(store, user);
  if (businesses.length > 1) return "/dashboard/businesses";
  if (!businesses[0] || businesses[0].client.status !== "active") return "/pending";
  return "/dashboard";
}

/**
 * 62 Where someone without a valid session goes to sign in: through
 * /api/session/ended when their browser still has the session's cookies (the
 * session ended on the server), which clears them so the public pages stop
 * saying "Dashboard"; else straight to the sign-in page.
 */
export async function signInPath(): Promise<string> {
  const jar = await cookies();
  return jar.has(SESSION_COOKIE) || jar.has(SIGNED_IN_COOKIE) ? "/api/session/ended" : "/sign-in";
}

/**
 * For dashboard pages: active (or expired, read-only) clients only, and 60
 * only for whoever may open the page (`permission`, lib/team/permissions.ts
 * DASHBOARD_PATHS); others go to the overview, which says why.
 */
export async function requireClient(permission: TeamPermission = "dashboard"): Promise<ClientContext> {
  const context = await getClientContext();
  if (!context) {
    const user = await getCurrentUser();
    if (user && (await getAdminRole())) redirect("/admin");
    redirect(user ? "/sign-in" : await signInPath());
  }
  if (!mayUseDashboard(context)) redirect("/pending");
  if (!contextCan(context, permission)) redirect(`/dashboard?denied=${permission}`);
  return context;
}

/** A team member in the admin, with their role. */
export interface AdminUser extends User {
  adminRole: AdminRole;
}

/**
 * For every admin page and admin server action: the signed-in team member
 * whose role allows `permission` (lib/admin/permissions.ts). Others go to
 * sign in, to their own home, or to the admin overview with a notice.
 */
export async function requireAdmin(permission: AdminPermission = "view"): Promise<AdminUser> {
  const user = await getCurrentUser();
  if (!user) redirect(await signInPath());
  const role = await getAdminRole();
  if (!role) redirect(await homeFor(user));
  if (!can(role, permission)) redirect(`/admin?denied=${permission}`);
  return { ...user, adminRole: role };
}

/** Whether the signed-in team member may do something: for showing or hiding controls. */
export async function adminCan(permission: AdminPermission): Promise<boolean> {
  return can(await getAdminRole(), permission);
}

/** Client IP of the current request. */
export async function requestIp(): Promise<string> {
  return ipFromHeaders(await headers());
}
