import { expect, type APIRequestContext, type Browser } from "@playwright/test";
import { E2E } from "../../playwright.config";

/**
 * 231 What the community's e2e specs share: the API's address, joining by
 * email, a member's bearer header, reading a whole list, and an admin to
 * approve a new member's posts (area C holds their first ones). Who runs
 * the community is a member whose linked Yallapp account is a Yallapp
 * owner or admin (lib/community/staff.ts): the admin links one of the
 * e2e's super admins the way any member does, through
 * yallapp.com.tr/link-community.
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

/**
 * A new member who runs the community: they link `yallappEmail`, one of the
 * e2e's super admins (signed in to Yallapp on the way, then "Link my
 * account"). Each such account links to one member, so each spec has its
 * own (playwright.config.ts), on a fresh database.
 */
export async function joinAsAdmin(browser: Browser, request: APIRequestContext, suffix: string, yallappEmail: string): Promise<Member> {
  const admin = await join(request, "Admin", suffix);
  const start = await json(request.post(`${API}/me/yallapp-link/start`, { ...as(admin), data: { return_to: "web" } }));
  const url = new URL(start.confirm_url as string);
  const context = await browser.newContext();
  try {
    const page = await context.newPage();
    await page.goto(`${url.pathname}${url.search}`);
    await expect(page).toHaveURL(/\/sign-in$/);
    await page.getByLabel("Email").fill(yallappEmail);
    await page.getByLabel("Password", { exact: true }).fill(E2E.adminPassword);
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL(/\/link-community\?state=/);
    await page.getByRole("button", { name: "Link my account" }).click();
    await expect(page.getByRole("main").getByRole("status")).toContainText("linked");
  } finally {
    await context.close();
  }
  expect((await json(request.get(`${API}/me`, as(admin)))).community_role).toBe("admin");
  return admin;
}

/** The moderation queue's open item for this post (a question, an answer, a reply as a comment). */
export async function heldItem(request: APIRequestContext, admin: Member, targetId: string): Promise<Json | undefined> {
  return (await all(request, `${API}/admin/moderation?status=open`, admin)).find((i) => i.target_id === targetId);
}

/** Approves the post if moderation holds it: the admin decides in the queue. */
export async function approveIfHeld(request: APIRequestContext, admin: Member, post: Json): Promise<void> {
  if (post.status !== "pending") return;
  const item = await heldItem(request, admin, post.id as string);
  expect(item, `the moderation queue has ${String(post.id)}`).toBeTruthy();
  await json(request.post(`${API}/admin/moderation/${item!.id}`, { ...as(admin), data: { decision: "approve" } }));
}
