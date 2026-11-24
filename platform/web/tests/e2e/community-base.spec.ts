import { expect, test, type Browser, type Page } from "@playwright/test";
import { E2E } from "../../playwright.config";

/**
 * 231 Yallapp Community's base on the running server (docs/api/community.yaml):
 * two members join with email through /api/community/v1, one follows and
 * asks the other to be friends, the other accepts; the website's cookie
 * works like the app's token; the community's host answers its API; and a
 * member links their Yallapp account: the confirm page on yallapp.com.tr
 * sends a signed-out visitor to sign in to Yallapp and back, "Link my
 * account" links it, and the community shows the link.
 */
test.describe.configure({ mode: "serial" });
// Its own address, so the sign-up and sign-in limits per IP don't reach the other specs.
const extraHTTPHeaders = { "x-forwarded-for": "203.0.113.231" };
test.use({ extraHTTPHeaders });

const suffix = Date.now().toString(36);
const api = `${E2E.baseURL}/api/community/v1`;
const password = "community-strong-password-1";
const owner = { name: "Selim Kaya", email: `selim-${suffix}@community.test`, password: "selim-strong-password-1" };
let mo = { token: "", id: "", username: "" };
let nour = { token: "", id: "", username: "" };
let page: Page | null = null;

async function freshPage(browser: Browser): Promise<Page> {
  return (await browser.newContext({ extraHTTPHeaders })).newPage();
}

test.afterAll(async () => {
  await page?.context().close();
});

test("231 two members join with email, follow, and become friends", async ({ request }) => {
  const join = async (name: string, email: string) => {
    const r = await request.post(`${api}/auth/email/sign-up`, { data: { email, password, display_name: name, device: { name: "e2e", platform: "web" } } });
    expect(r.status()).toBe(201);
    const body = (await r.json()) as { access_token: string; member: { id: string; username: string } };
    return { token: body.access_token, id: body.member.id, username: body.member.username };
  };
  mo = await join("Mohamed Ali", `mo-${suffix}@community.test`);
  nour = await join("Nour El Hoda", `nour-${suffix}@community.test`);
  const auth = (token: string) => ({ authorization: `Bearer ${token}` });

  const me = await request.get(`${api}/me`, { headers: auth(mo.token) });
  expect(await me.json()).toMatchObject({ id: mo.id, display_name: "Mohamed Ali", email_verified: false, top_badge: null });
  expect((await request.patch(`${api}/me`, { headers: auth(mo.token), data: { headline: "Flutter developer", skills: ["Flutter"] } })).status()).toBe(200);

  expect(await (await request.put(`${api}/members/${nour.id}/follow`, { headers: auth(mo.token) })).json()).toMatchObject({ following: true });
  expect(await (await request.put(`${api}/members/@${nour.username}/friend`, { headers: auth(mo.token) })).json()).toMatchObject({ friend: "requested" });
  const requests = (await (await request.get(`${api}/me/friend-requests`, { headers: auth(nour.token) })).json()) as { items: { id: string; member: { id: string } }[] };
  expect(requests.items.map((r) => r.member.id)).toEqual([mo.id]);
  const accepted = await request.post(`${api}/me/friend-requests/${requests.items[0]!.id}/accept`, { headers: auth(nour.token) });
  expect(await accepted.json()).toMatchObject({ friend: "friends", followed_by: true });
  const profile = await (await request.get(`${api}/members/@${mo.username}`)).json();
  expect(profile).toMatchObject({ headline: "Flutter developer", counts: { following: 1, friends: 1 } });
  expect(profile).not.toHaveProperty("email");
  // A DELETE with no body and no Content-Length, as browsers, curl and the apps send it.
  const unfollow = await request.delete(`${api}/members/${nour.id}/follow`, { headers: auth(mo.token) });
  expect(unfollow.status()).toBe(200);
  expect(await unfollow.json()).toMatchObject({ following: false });
  expect((await request.put(`${api}/members/${nour.id}/follow`, { headers: auth(mo.token) })).status()).toBe(200);
  const bare = await fetch(`${api}/members/${nour.id}/follow`, { method: "DELETE", headers: { ...auth(mo.token), "x-forwarded-for": "203.0.113.231" } });
  expect(bare.status).toBe(200);
});

test("231 the website's cookie signs the member in like the app's token; errors come in the asked language", async ({ request }) => {
  const r = await request.get(`${api}/me`, { headers: { cookie: `yc_access=${mo.token}` } });
  expect(r.status()).toBe(200);
  expect(await r.json()).toMatchObject({ id: mo.id });
  const anonymous = await request.get(`${api}/me`, { headers: { "accept-language": "tr-TR" } });
  expect(anonymous.status()).toBe(401);
  expect(await anonymous.json()).toEqual({ error: { code: "invalid_token", message: "Lütfen tekrar giriş yapın." } });
});

test("231 the community's host answers its API at the same path", async ({ request }) => {
  const r = await request.get(`${api}/config`, { headers: { host: "community.localhost", "accept-language": "ar" } });
  expect(r.status()).toBe(200);
  const config = (await r.json()) as { sections: { slug: string; name: string; coming_soon: boolean }[] };
  expect(config.sections.find((s) => s.slug === "qa")).toEqual({ slug: "qa", name: "الأسئلة والأجوبة", icon: "forum", coming_soon: false });
  expect(config.sections.find((s) => s.slug === "events")?.coming_soon).toBe(true);
});

test("231 a member links their Yallapp account: sign in to Yallapp on the way, confirm, and the community shows it", async ({ browser, request }) => {
  // A Yallapp account to link.
  const signUp = await freshPage(browser);
  await signUp.goto("/sign-up");
  await signUp.getByLabel("Full name").fill(owner.name);
  await signUp.getByLabel("Email").fill(owner.email);
  await signUp.getByLabel("WhatsApp number").fill("+90 544 000 02 31");
  await signUp.getByLabel("Password", { exact: true }).fill(owner.password);
  await signUp.getByRole("checkbox").check();
  await signUp.getByRole("button", { name: "Create account" }).click();
  await expect(signUp).toHaveURL(/\/start$/);
  await signUp.context().close();

  const start = await request.post(`${api}/me/yallapp-link/start`, { headers: { authorization: `Bearer ${mo.token}` }, data: { return_to: "web" } });
  const { confirm_url } = (await start.json()) as { confirm_url: string };
  const url = new URL(confirm_url);
  expect(url.pathname).toBe("/link-community");

  // Signed out of Yallapp: the sign-in first, then back to the page.
  page = await freshPage(browser);
  await page.goto(`${url.pathname}${url.search}`);
  await expect(page).toHaveURL(/\/sign-in$/);
  await page.getByLabel("Email").fill(owner.email);
  await page.getByLabel("Password", { exact: true }).fill(owner.password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/link-community\?state=/);
  await expect(page.getByRole("heading", { name: "Link to Yallapp Community" })).toBeVisible();
  await expect(page.getByText(`community member Mohamed Ali (@${mo.username})`)).toBeVisible();
  await page.getByRole("button", { name: "Link my account" }).click();
  await expect(page.getByRole("main").getByRole("status")).toHaveText("Your Yallapp account is linked. You can go back to Yallapp Community.");
  await expect(page.getByRole("link", { name: "Back to Yallapp Community" })).toHaveAttribute("href", new RegExp(`/u/${mo.username.replace(".", "\\.")}$`));

  const link = await request.get(`${api}/me/yallapp-link`, { headers: { authorization: `Bearer ${mo.token}` } });
  expect(await link.json()).toMatchObject({ linked: true, account_name: owner.name, apps: [] });
  // The link works once.
  await page.goto(`${url.pathname}${url.search}`);
  await expect(page.getByRole("main").getByRole("alert")).toHaveText("This link has expired. Start again from the community.");
});
