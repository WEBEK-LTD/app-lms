import { expect, type APIRequestContext } from "@playwright/test";
import mysql from "mysql2/promise";
import { E2E } from "../../playwright.config";

/**
 * 231 What the community's e2e specs share: the API's address, joining by
 * email, a member's bearer header, reading a whole list, and an admin to
 * approve a new member's posts (area C holds their first ones). No API makes
 * a member an admin, so the admin is made in the database
 * (E2E_DATABASE_URL); without one, `admin` is null.
 */
export const API = `${E2E.baseURL}/api/community/v1`;
export type Json = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

export interface Member {
  id: string;
  token: string;
  username: string;
}

export async function join(request: APIRequestContext, name: string, suffix: string): Promise<Member> {
  const r = await request.post(`${API}/auth/email/sign-up`, { data: { email: `${name.toLowerCase()}-${suffix}@community.test`, password: "correct horse battery", display_name: `${name} ${suffix}` } });
  expect(r.status(), await r.text()).toBe(201);
  const body = (await r.json()) as Json;
  return { id: body.member.id, token: body.access_token, username: body.member.username };
}

export const as = (m: Member) => ({ headers: { authorization: `Bearer ${m.token}` } });

/** The answer's JSON, once its status is the one expected. */
export async function json(response: Promise<{ status(): number; json(): Promise<unknown>; text(): Promise<string> }>, status = 200): Promise<Json> {
  const r = await response;
  expect(r.status(), await r.text()).toBe(status);
  return (await r.json()) as Json;
}

/** Every page of a list, while it has a next cursor. */
export async function all(request: APIRequestContext, url: string, who: Member): Promise<Json[]> {
  const items: Json[] = [];
  let cursor: string | null = null;
  do {
    const page: Json = await json(request.get(`${url}${url.includes("?") ? "&" : "?"}limit=50${cursor ? `&cursor=${cursor}` : ""}`, as(who)));
    items.push(...(page.items as Json[]));
    cursor = page.next_cursor as string | null;
  } while (cursor);
  return items;
}

/** A new member made an admin in the database; null without E2E_DATABASE_URL. */
export async function joinAsAdmin(request: APIRequestContext, suffix: string): Promise<Member | null> {
  if (!process.env.E2E_DATABASE_URL) return null;
  const admin = await join(request, "Admin", suffix);
  const db = await mysql.createConnection({ uri: process.env.E2E_DATABASE_URL });
  try {
    await db.query("UPDATE community_members SET role = 'admin' WHERE id = ?", [admin.id]);
  } finally {
    await db.end();
  }
  return admin;
}

/** The moderation queue's open item for this post (a question, an answer, a reply as a comment). */
export async function heldItem(request: APIRequestContext, admin: Member, targetId: string): Promise<Json | undefined> {
  return (await all(request, `${API}/admin/moderation?status=open`, admin)).find((i) => i.target_id === targetId);
}

/** Approves the post if moderation holds it: the admin decides in the queue. */
export async function approveIfHeld(request: APIRequestContext, admin: Member | null, post: Json): Promise<void> {
  if (post.status !== "pending") return;
  expect(admin, "a new member's post is held for moderation, and approving it needs an admin (E2E_DATABASE_URL)").not.toBeNull();
  const item = await heldItem(request, admin!, post.id as string);
  expect(item, `the moderation queue has ${String(post.id)}`).toBeTruthy();
  await json(request.post(`${API}/admin/moderation/${item!.id}`, { ...as(admin!), data: { decision: "approve" } }));
}
