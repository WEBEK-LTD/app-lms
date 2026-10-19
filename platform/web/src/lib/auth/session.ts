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
import { SESSION_TTL_SECONDS, sealSession, unsealSession } from "./session-token";
import { SIGNED_IN_COOKIE } from "./signed-in-cookie";

export const SESSION_COOKIE = "yallapp_session";
/** The client a super admin is managing from their dashboard. Only read for super admins. */
export const MANAGE_COOKIE = "yallapp_manage";
const MANAGE_TTL_SECONDS = 8 * 60 * 60;
/** The app the dashboard works on, chosen with the app switcher. Only used when it is one of the client's own apps. */
export const APP_COOKIE = "yallapp_app";
const APP_TTL_SECONDS = 365 * 24 * 60 * 60;

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
  /** The client's own user, also when a super admin is managing the client. */
  user: User;
  /** The super admin managing this client's dashboard, or null for the client themselves. */
  staff: User | null;
  client: Client;
  /** Every app of the account, oldest first: the app switcher's list. */
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

export const getClientContext = cache(async (): Promise<ClientContext | null> => {
  const current = await getCurrentUser();
  if (!current) return null;
  const store = await getStore();
  let user = current;
  let staff: User | null = null;
  let client: Client | null;
  const role = await getAdminRole();
  if (role) {
    // The team opens a client's dashboard to change their app; viewers only look from the admin.
    if (!can(role, "clients.edit")) return null;
    const managed = (await cookies()).get(MANAGE_COOKIE)?.value;
    client = managed && /^[0-9a-f-]{36}$/i.test(managed) ? await store.getClientById(managed) : null;
    const owner = client ? await store.getUserById(client.userId) : null;
    if (!client || !owner) return null;
    user = owner;
    staff = current;
  } else {
    client = await store.getClientByUserId(current.id);
  }
  if (!client) return null;
  const [apps, licenses] = await Promise.all([store.listAppsByClient(client.id), store.listLicensesByClient(client.id)]);
  // The switcher's choice, only when it is one of this client's apps; else their first app.
  const chosen = (await cookies()).get(APP_COOKIE)?.value;
  const app = apps.find((a) => a.id === chosen) ?? apps[0] ?? null;
  const license = licenses.find((l) => l.appId === (app?.id ?? null)) ?? null;
  const now = new Date();
  return {
    user,
    staff,
    client,
    apps,
    app,
    license,
    state: appState(client, license, now),
    account: clientAccountState(client, licenses, now),
    licenses,
  };
});

/**
 * Who may use the dashboard: active clients, and our team for any client
 * (so an app can be set up before activation or while suspended).
 */
export function mayUseDashboard(context: ClientContext): boolean {
  return context.client.status === "active" || context.staff !== null;
}

/** Where a signed-in user belongs. */
export async function homeFor(user: User): Promise<string> {
  const store = await getStore();
  if (await adminRoleOf(store, user)) return "/admin";
  const client = await store.getClientByUserId(user.id);
  if (!client || client.status !== "active") return "/pending";
  return "/dashboard";
}

/** For dashboard pages: active (or expired, read-only) clients only. */
export async function requireClient(): Promise<ClientContext> {
  const context = await getClientContext();
  if (!context) {
    const user = await getCurrentUser();
    if (user && (await getAdminRole())) redirect("/admin");
    redirect("/sign-in");
  }
  if (!mayUseDashboard(context)) redirect("/pending");
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
  if (!user) redirect("/sign-in");
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
