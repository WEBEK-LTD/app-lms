import { expect, test, type APIRequestContext, type Page } from "@playwright/test";
import { E2E } from "../../playwright.config";
import { solidPng } from "./png";

/**
 * 139 Store screenshots made automatically: a new Store app's listing step
 * has "Make them for me" on; Make again queues a run, which the pipeline
 * claims (the preview's signed link and the shots) and fills through its API
 * (here, by the test, as the screenshots workflow would); the set shows with
 * each size and language and "Made automatically on"; the owner replaces one
 * (kept when the set is made again) and removes one (Make again brings it
 * back); a failed run says why and keeps the set; off, the owner's uploads
 * are the listing's again.
 */
test.describe.configure({ mode: "serial" });

const suffix = Date.now().toString(36);
const client = { name: "Harbour Books", email: `auto-shots-${suffix}@harbour.test`, password: "harbour-books-strong-password-1", site: `https://auto-shots-${suffix}.harbour.test` };
const extraHTTPHeaders = { "x-forwarded-for": "198.51.100.139" };
const pipeline = { authorization: `Bearer ${E2E.pipelineToken}` };
const SIZES = { phone: [1080, 1920], iphone: [1320, 2868], tablet: [1600, 2560], ipad: [2064, 2752] } as const;
type Device = keyof typeof SIZES;

let page: Page;
let appId = "";
const problems: string[] = [];

async function signIn(email: string, password: string) {
  await page.context().clearCookies();
  await page.goto("/sign-in");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL((url) => url.pathname !== "/sign-in");
}

const toggle = () => page.getByLabel("Make them for me");
const panel = () => page.locator("[data-auto-shots]");
const status = () => page.locator("[data-auto-shots-status]");
const place = (key: string) => page.locator(`[data-auto-shot="${key}"]`);

/** The run waiting for this app (after Make again). */
async function waitingRun(request: APIRequestContext): Promise<string> {
  const queue = (await (await request.get("/api/v1/screenshots/queue?limit=50", { headers: pipeline })).json()) as { runs: { id: string; app_id: string }[] };
  const run = queue.runs.find((r) => r.app_id === appId);
  expect(run, "a run waiting for the app").toBeTruthy();
  return run!.id;
}

type Plan = { preview_url: string; storage: Record<string, string>; devices: Record<Device, { width: number; height: number }>; shots: { key: string; device: Device; screen: string; route: string; list?: string }[] };

async function claim(request: APIRequestContext, run: string): Promise<Plan> {
  const response = await request.post(`/api/v1/screenshots/${run}/claim`, { headers: pipeline, data: {} });
  expect(response.status()).toBe(200);
  return (await response.json()) as Plan;
}

async function send(request: APIRequestContext, run: string, key: string, device: Device, rgb: [number, number, number]) {
  const [width, height] = SIZES[device];
  const response = await request.put(`/api/v1/screenshots/${run}/shots/${encodeURIComponent(key)}`, { headers: { ...pipeline, "content-type": "image/png" }, data: solidPng(width, height, rgb) });
  return response.status();
}

test.beforeAll(async ({ browser }) => {
  page = await browser.newPage({ extraHTTPHeaders });
  page.on("console", (m) => {
    if (m.type() === "error" && !m.location().url.includes("/api/v1/fonts/")) problems.push(`${m.type()} on ${page.url()}: ${m.text()}`);
  });
  page.on("pageerror", (e) => problems.push(`pageerror on ${page.url()}: ${e.message}`));
  await page.goto("/sign-up");
  await page.getByLabel("Full name").fill(client.name);
  await page.getByLabel("Email").fill(client.email);
  await page.getByLabel("WhatsApp number").fill("+90 544 000 01 39");
  await page.getByLabel("Your website (optional)").fill(client.site);
  await page.getByLabel("Password", { exact: true }).fill(client.password);
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/\/start$/);

  await signIn(E2E.autoShotsAdminEmail, E2E.adminPassword);
  await page.goto("/admin/clients");
  await page.getByRole("searchbox", { name: "Search clients" }).fill(client.email);
  await page.getByRole("button", { name: "Search" }).click();
  await page.getByRole("link", { name: `Activate ${client.name}` }).click();
  const side = page.getByRole("complementary");
  await side.getByLabel("Plan").selectOption("pro");
  await side.getByLabel("Active until").fill(new Date(Date.now() + 365 * 86_400_000).toISOString().slice(0, 10));
  await side.getByRole("button", { name: "Activate & send license" }).click();
  await expect(page.getByRole("status")).toContainText("Activated");

  await signIn(client.email, client.password);
  await page.getByRole("link", { name: "Start from an empty app" }).click();
  await page.getByText("Store", { exact: true }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("heading", { name: "Website" })).toBeVisible();
  // Its products kept in Yallapp: the preview shows them.
  await page.getByText("I don't have a website").click();
  await page.getByRole("button", { name: "Save & continue" }).click();
  await expect(page.getByRole("heading", { name: "Branding" })).toBeVisible();
  await page.getByLabel("App name").fill("Harbour Books");
  await page.getByLabel("Name under the app icon").fill("Harbour");
  await page.locator("#upload-icon").setInputFiles({ name: "icon.png", mimeType: "image/png", buffer: solidPng(1024, 1024, [14, 13, 36]) });
  await expect(page.getByText("Replace file")).toBeVisible();
  await page.getByRole("button", { name: "Save & continue" }).click();
  await expect(page.getByRole("heading", { name: "Store listing" })).toBeVisible();

  // The app's id, from its API address on the Website step.
  await page.goto("/dashboard/setup?step=website");
  const api = (await page.locator("code").filter({ hasText: "/api/app/" }).textContent())!.trim();
  appId = /\/api\/app\/([0-9a-f-]{36})$/.exec(api)![1]!;
});

test.afterAll(async () => {
  await page.close();
});

test("on for a new app: saved, made by the pipeline, shown with each size and language", async ({ request }) => {
  await page.goto("/dashboard/setup?step=listing");
  await expect(toggle()).toBeChecked();
  // On: the uploads are put away and the set's panel shows.
  await expect(page.getByRole("list", { name: /Google Play phone screenshots/ })).toBeHidden();
  await expect(panel()).toBeVisible();
  await expect(page.getByText("Only real screens of your app, with no device frame.")).toBeVisible();
  await page.getByLabel("Android package name").fill("com.harbourbooks.app");
  await page.getByLabel("iOS bundle ID").fill("com.harbourbooks.app");
  await page.getByLabel("Store title").fill("Harbour Books");
  await page.getByLabel("Short description").fill("Books from the harbour shop, at your door.");
  await page.getByLabel("Full description").fill("Harbour Books brings the whole shop to your phone: new titles, the classics and the cart.");
  await page.getByLabel("Support email").fill("help@harbour.test");
  await page.getByLabel("Privacy policy URL").fill("https://harbour.test/privacy");
  await page.getByRole("button", { name: "Save & continue" }).click();
  await expect(page.getByRole("heading", { name: "Publishing" })).toBeVisible();

  await page.goto("/dashboard/setup?step=listing");
  await expect(toggle()).toBeChecked();
  await expect(status()).toHaveText("Your screenshots will be made in a few minutes.");
  await page.getByRole("button", { name: "Make again" }).click();
  await expect(status()).toHaveText("Making your screenshots…");
  await expect(page.getByRole("button", { name: "Make again" })).toBeDisabled();

  // The pipeline: the run, the app preview's signed link with guest mode, the shots at each store size.
  const run = await waitingRun(request);
  const plan = await claim(request, run);
  expect(plan.preview_url).toMatch(new RegExp(`/preview-app/index\\.html\\?token=p1\\.${appId}\\.`));
  expect(Object.values(plan.storage)).toEqual(["true"]);
  expect(plan.devices.iphone).toMatchObject({ width: 1320, height: 2868 });
  expect(plan.devices.ipad).toMatchObject({ width: 2064, height: 2752 });
  expect(plan.shots.map((s) => s.key)).toEqual(
    (["phone", "iphone", "tablet", "ipad"] as const).flatMap((d) => ["home", "list", "item", "cart"].map((s) => `${d}:en:${s}`)),
  );
  expect(plan.shots.find((s) => s.key === "phone:en:item")).toMatchObject({ route: "/product/{id}", list: "/store/products" });
  // A picture of the wrong size is refused; the item is left out (the shop has no products).
  expect(await send(request, run, "iphone:en:home", "phone", [1, 1, 1])).toBe(422);
  for (const shot of plan.shots.filter((s) => s.screen !== "item")) expect(await send(request, run, shot.key, shot.device, [20, 120, 200])).toBe(200);
  const done = await request.post(`/api/v1/screenshots/${run}/status`, { headers: pipeline, data: { status: "done", message: "12 screenshots; 4 left out (item)." } });
  expect(done.status()).toBe(200);
  expect(await done.json()).toMatchObject({ state: "idle", shots: 12 });

  // Shown: the date, a group for the language and a row per store size.
  await expect(status()).toHaveText(/^Made automatically on /, { timeout: 15_000 });
  await expect(page.getByRole("heading", { name: "Screenshots in English" })).toBeVisible();
  for (const device of ["phone", "iphone", "tablet", "ipad"]) {
    await expect(page.locator(`[data-auto-shots-device="${device}"] img`)).toHaveCount(3);
  }
  await expect(page.locator('[data-auto-shots-device="iphone"]')).toContainText("iPhone 6.9\" 1320 × 2868");
  await expect(page.locator('[data-auto-shots-device="ipad"]')).toContainText("iPad 13\" 2064 × 2752");
  await expect(page.locator('[data-auto-shots-device="tablet"]')).toContainText("Google Play 7\" and 10\" tablets 1600 × 2560");
  await expect(page.getByRole("img", { name: "Home, Google Play phone, English" })).toBeVisible();
  // The publishing check counts the set.
  await page.goto("/dashboard/publishing");
  await expect(page.locator("body")).not.toContainText("Google Play needs at least 2");
});

test("replace one (kept when made again), remove one (Make again brings it back), a failed run keeps the set", async ({ request }) => {
  await page.goto("/dashboard/setup?step=listing");
  // A wrong size says why, and nothing changes.
  // Again until the page is live (a file chosen before it hydrates has no one to read it); a refused file changes nothing.
  await expect(async () => {
    await page.getByLabel("Replace Home, iPhone 6.9\", English").setInputFiles({ name: "small.png", mimeType: "image/png", buffer: solidPng(1080, 1920, [200, 10, 10]) });
    await expect(panel().getByRole("alert")).toContainText("iPhone screenshots must be 1320 × 2868", { timeout: 3000 });
  }).toPass({ timeout: 30_000 });
  await expect(place("iphone:en:home")).toHaveAttribute("data-source", "auto");

  await page.getByLabel("Replace Home, Google Play phone, English").setInputFiles({ name: "mine.png", mimeType: "image/png", buffer: solidPng(1080, 1920, [200, 10, 10]) });
  await expect(place("phone:en:home")).toHaveAttribute("data-source", "uploaded");
  await expect(place("phone:en:home")).toContainText("Your own");

  await page.getByRole("button", { name: "Remove Cart, Google Play phone, English" }).click();
  await expect(place("phone:en:cart")).toHaveAttribute("data-source", "removed");
  await expect(place("phone:en:cart")).toContainText("Make again brings it back.");
  await expect(page.locator('[data-auto-shots-device="phone"] img')).toHaveCount(2);

  // Make again: every place but the owner's own, the removed one back.
  await page.getByRole("button", { name: "Make again" }).click();
  await expect(page.getByText("Asked. Your screenshots are being made again.")).toBeVisible();
  const run = await waitingRun(request);
  const keys = (await claim(request, run)).shots.map((s) => s.key);
  expect(keys).not.toContain("phone:en:home");
  expect(keys).toContain("phone:en:cart");
  expect(await send(request, run, "phone:en:home", "phone", [1, 1, 1])).toBe(409);
  await request.post(`/api/v1/screenshots/${run}/status`, { headers: pipeline, data: { status: "failed", message: "The app preview didn't open." } });
  await page.reload();
  await expect(status()).toHaveText("The last try didn't finish: The app preview didn't open.");
  await expect(place("phone:en:home")).toHaveAttribute("data-source", "uploaded");
  await expect(page.getByRole("button", { name: "Make again" })).toBeEnabled();
});

test("off: the owner's uploads are the listing's again; Arabic and dark read", async () => {
  await page.goto("/dashboard/setup?step=listing");
  await toggle().uncheck();
  await expect(panel()).toHaveCount(0);
  await expect(page.getByRole("list", { name: /Google Play phone screenshots/ })).toBeVisible();
  await page.getByRole("button", { name: "Save & continue" }).click();
  await expect(page.getByRole("heading", { name: "Publishing" })).toBeVisible();
  await page.goto("/dashboard/setup?step=listing");
  await expect(toggle()).not.toBeChecked();
  await expect(panel()).toHaveCount(0);

  // On again: the set is still there, as it was.
  await toggle().check();
  await page.getByRole("button", { name: "Save & continue" }).click();
  await expect(page.getByRole("heading", { name: "Publishing" })).toBeVisible();
  await page.goto("/dashboard/setup?step=listing");
  await expect(place("phone:en:home")).toHaveAttribute("data-source", "uploaded");

  // In Egyptian Arabic, right to left, and in the dark.
  await page.context().addCookies([{ name: "yallapp_lang", value: "ar", url: E2E.baseURL }]);
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("/dashboard/setup?step=listing");
  await expect(page.getByLabel("اعملهالي إنت")).toBeChecked();
  await expect(page.getByRole("button", { name: "اعملها تاني" })).toBeVisible();
  await page.context().clearCookies({ name: "yallapp_lang" });
  await page.emulateMedia({ colorScheme: "light" });
  expect(problems).toEqual([]);
});
