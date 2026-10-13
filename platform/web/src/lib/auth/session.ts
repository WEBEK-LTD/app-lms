import "server-only";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { getStore } from "../data";
import type { App, Client, License, User } from "../data/types";
import { secureCookies, sessionSecret, superAdminEmails } from "../env";
import { ipFromHeaders } from "../http";
import { accountState, type AccountState } from "../license/status";
import { SESSION_TTL_SECONDS, sealSession, unsealSession } from "./session-token";

export const SESSION_COOKIE = "yallapp_session";
/** The client a super admin is managing from their dashboard. Only read for super admins. */
export const MANAGE_COOKIE = "yallapp_manage";
const MANAGE_TTL_SECONDS = 8 * 60 * 60;

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
}

export async function endSession(): Promise<void> {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
  jar.delete(MANAGE_COOKIE);
}

/** A super admin opens a client's dashboard and changes it as the client would. */
export async function startManaging(clientId: string): Promise<void> {
  const jar = await cookies();
  jar.set(MANAGE_COOKIE, clientId, {
    httpOnly: true,
    secure: secureCookies(),
    sameSite: "lax",
    path: "/",
    maxAge: MANAGE_TTL_SECONDS,
  });
}

export async function stopManaging(): Promise<void> {
  (await cookies()).delete(MANAGE_COOKIE);
}

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

export interface ClientContext {
  /** The client's own user, also when a super admin is managing the client. */
  user: User;
  /** The super admin managing this client's dashboard, or null for the client themselves. */
  staff: User | null;
  client: Client;
  license: License | null;
  app: App | null;
  state: AccountState;
}

export const getClientContext = cache(async (): Promise<ClientContext | null> => {
  const current = await getCurrentUser();
  if (!current) return null;
  const store = await getStore();
  let user = current;
  let staff: User | null = null;
  let client: Client | null;
  if (isSuperAdmin(current)) {
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
  const [license, app] = await Promise.all([store.getLicenseByClientId(client.id), store.getAppByClientId(client.id)]);
  return { user, staff, client, license, app, state: accountState(client, license, new Date()) };
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
  if (isSuperAdmin(user)) return "/admin";
  const store = await getStore();
  const client = await store.getClientByUserId(user.id);
  if (!client || client.status !== "active") return "/pending";
  return "/dashboard";
}

/** For dashboard pages: active (or expired, read-only) clients only. */
export async function requireClient(): Promise<ClientContext> {
  const context = await getClientContext();
  if (!context) {
    const user = await getCurrentUser();
    if (user && isSuperAdmin(user)) redirect("/admin");
    redirect("/sign-in");
  }
  if (!mayUseDashboard(context)) redirect("/pending");
  return context;
}

export async function requireAdmin(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");
  if (!isSuperAdmin(user)) redirect(await homeFor(user));
  return user;
}

/** Client IP of the current request. */
export async function requestIp(): Promise<string> {
  return ipFromHeaders(await headers());
}
