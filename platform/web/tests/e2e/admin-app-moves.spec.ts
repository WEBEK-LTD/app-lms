import { mkdir, readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { expect, test, type Browser, type Page } from "@playwright/test";
import { E2E } from "../../playwright.config";

/**
 * 132.110–132.115 Our team in a client's account, and their apps moved and
 * copied: the admin opens a client and makes an app as the client from
 * /start (no bounce to the admin), with the banner; makes one from the
 * client's admin page; copies an app from Omar's account to Lina's; moves
 * one with the owner's code typed by the team, one approved by the owner on
 * their own page, one declined, one closed after five wrong codes; moves a
 * plan to another app; and a client can't open any of it.
 */
// Several sign-ins, codes and emails each: room for a slow machine.
test.describe.configure({ mode: "serial", timeout: 180_000 });

const suffix = Date.now().toString(36);
const omar = { name: "Omar Haddad", email: `omar-${suffix}@moves.test`, password: "omar-moves-strong-password-1" };
const lina = { name: "Lina Farouk", email: `lina-${suffix}@moves.test`, password: "lina-moves-strong-password-1" };
const extraHTTPHeaders = { "x-forwarded-for": "198.51.100.132" };
const SHOTS = process.env.ADMIN_SHOTS_DIR ?? null;
let admin: Page;
let omarId = "";
let linaId = "";

interface SentMail {
  to: string;
  subject: string;
  text: string;
  sentAt: string;
}

async function mailsTo(email: string): Promise<SentMail[]> {
  const dir = path.resolve(E2E.mailDir);
  const files = await readdir(dir).catch(() => [] as string[]);
  const mails = await Promise.all(files.map(async (f) => JSON.parse(await readFile(path.join(dir, f), "utf8")) as SentMail));
  return mails.filter((m) => m.to === email).sort((a, b) => a.sentAt.localeCompare(b.sentAt));
}

/** The latest approval email to the owner: its code and its link. */
async function approval(email: string, count: number): Promise<{ code: string; link: string; subject: string }> {
  await expect.poll(async () => (await mailsTo(email)).filter((m) => /Your approval code: \d{6}/.test(m.text)).length).toBe(count);
  const mail = (await mailsTo(email)).filter((m) => /Your approval code: \d{6}/.test(m.text)).at(-1)!;
  return { code: mail.text.match(/Your approval code: (\d{6})/)![1]!, link: mail.text.match(/Review and approve: (\S+)/)![1]!, subject: mail.subject };
}

async function shot(page: Page, name: string, fullPage = false) {
  if (!SHOTS) return;
  await mkdir(SHOTS, { recursive: true });
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: path.join(SHOTS, `${name}.jpg`), type: "jpeg", quality: 85, fullPage });
}

async function signUp(browser: Browser, who: typeof omar) {
  const page = await (await browser.newContext({ extraHTTPHeaders })).newPage();
  await page.goto("/sign-up");
  await page.getByLabel("Full name").fill(who.name);
  await page.getByLabel("Email").fill(who.email);
  await page.getByLabel("WhatsApp number").fill("+90 544 000 01 32");
  await page.getByLabel("Password", { exact: true }).fill(who.password);
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/\/start$/);
  await page.context().close();
}

async function clientPage(who: typeof omar): Promise<string> {
  await admin.goto(`/admin/clients?q=${encodeURIComponent(who.email)}`);
  await admin.getByRole("link", { name: who.name, exact: true }).first().click();
  await expect(admin).toHaveURL(/\/admin\/clients\/[0-9a-f-]{36}$/);
  return admin.url().split("/").pop()!;
}

/** The app named so in the client's "Apps: create, move, copy" card. */
const appRow = (name: string) => admin.locator("[data-client-app]", { hasText: name }).first();
const appIdOf = async (name: string) => (await appRow(name).getAttribute("data-client-app"))!;

test.beforeAll(async ({ browser }) => {
  test.setTimeout(120_000);
  await signUp(browser, omar);
  await signUp(browser, lina);
  admin = await (await browser.newContext({ extraHTTPHeaders: { "x-forwarded-for": "203.0.113.132" }, viewport: { width: 1280, height: 860 }, deviceScaleFactor: 2 })).newPage();
  await admin.goto("/sign-in");
  await admin.getByLabel("Email").fill(E2E.appMovesAdminEmail);
  await admin.getByLabel("Password", { exact: true }).fill(E2E.adminPassword);
  await admin.getByRole("button", { name: "Sign in" }).click();
  await admin.waitForURL((url) => url.pathname.startsWith("/admin"));
  omarId = await clientPage(omar);
  linaId = await clientPage(lina);
});

test.afterAll(async () => {
  await admin?.context().close();
});

test("the team opens a client's account and makes an app from /start as the client, with no bounce to the admin", async () => {
  await admin.goto(`/admin/clients/${omarId}`);
  // No app yet: the client's own start, in their account.
  await admin.getByRole("button", { name: /Manage their app|Edit their app settings/ }).first().click();
  await expect(admin).toHaveURL(/\/start$/);
  const banner = admin.locator("[data-working-in-account]");
  await expect(banner).toContainText(`You're working in ${omar.name}'s account`);
  await expect(banner.getByRole("button", { name: "Back to Admin" })).toBeVisible();
  await shot(admin, "banner-start");
  await admin.goto((await admin.locator('a[data-demo="store"]').getAttribute("href"))!); // an app editor card, under "Other app types"
  await expect(admin).toHaveURL(/\/start\/[a-z-]+$/);
  await expect(admin.locator("[data-working-in-account]")).toBeVisible();
  await admin.getByRole("link", { name: "Start with this app" }).first().click();
  await expect(admin).toHaveURL(/\/start\/[a-z-]+\/make/);
  await admin.getByLabel("Your app's name").fill("Haddad Flowers");
  await admin.getByRole("button", { name: /Create my app/ }).click();
  await admin.waitForURL((url) => !url.pathname.startsWith("/start"));
  expect(new URL(admin.url()).pathname.startsWith("/admin")).toBe(false);
  await expect(admin.locator("[data-working-in-account]")).toContainText(omar.name);
  await shot(admin, "banner-dashboard");

  // "Add an app" from the dashboard opens the client's start, not the admin.
  await admin.goto("/start?new=1&for=editor");
  await expect(admin).toHaveURL(/\/start\?new=1&for=editor$/);
  await expect(admin.getByRole("heading", { level: 1 })).toBeVisible();

  // Back to the admin: the client's page, with both the opening and the app in the log.
  await admin.locator("[data-working-in-account]").getByRole("button", { name: "Back to Admin" }).click();
  await expect(admin).toHaveURL(new RegExp(`/admin/clients/${omarId}$`));
  await expect(admin.getByRole("region", { name: "Changes by the team" })).toContainText("Started an app from the");
  // Outside a client's account, a client page says why instead of bouncing silently.
  await admin.goto("/start");
  await expect(admin).toHaveURL(/\/admin\/clients\?working=ended$/);
  await expect(admin.getByText(/not working in a client.s account any more/)).toBeVisible();
});

test("the team makes an app for the client from their admin page and opens it as the client", async () => {
  await admin.goto(`/admin/clients/${omarId}`);
  const card = admin.getByRole("region", { name: "Apps: create, move, copy" });
  await card.getByText("Create an app for this client").click();
  await card.getByLabel("Starts from").selectOption("kind:store");
  await card.getByLabel("App name").fill("Petal House");
  await card.getByRole("button", { name: "Create it and open it as the client" }).click();
  await expect(admin).toHaveURL(/\/dashboard\/setup\?step=website$/);
  await expect(admin.locator("[data-working-in-account]")).toContainText(omar.name);
  await admin.locator("[data-working-in-account]").getByRole("button", { name: "Back to Admin" }).click();
  await expect(admin.getByRole("region", { name: "Changes by the team" })).toContainText(`Created Petal House for ${omar.name}`);
});

test("the team copies an app from Omar's account into Lina's: what's copied and what isn't, first", async () => {
  await admin.goto(`/admin/clients/${omarId}`);
  const petal = await appIdOf("Petal House");
  await admin.goto(`/admin/clients/${omarId}/copy?app=${petal}`);
  const dialog = admin.getByRole("dialog", { name: "Copy Petal House" });
  await expect(dialog.locator("[data-copy-summary]")).toContainText("Never copied");
  await expect(dialog.locator("[data-copy-summary]")).toContainText("Secrets: payment gateway keys, signing keys, push credentials, API tokens");
  await dialog.getByLabel("Or into another account").fill(lina.email);
  await dialog.getByRole("button", { name: "Search" }).click();
  await dialog.getByRole("link", { name: new RegExp(lina.name) }).click();
  await expect(dialog).toContainText(`${lina.name} (${lina.email})`);
  await dialog.getByLabel("The copy's name").fill("Petal House Copy");
  await shot(admin, "copy-dialog", true);
  await dialog.getByRole("button", { name: "Copy the app" }).click();
  await expect(admin).toHaveURL(new RegExp(`/admin/clients/${linaId}\\?done=copied$`));
  await expect(admin.getByText("The app was copied into this account.")).toBeVisible();
  await expect(appRow("Petal House Copy")).toContainText("no plan");
  // Omar keeps his app.
  await admin.goto(`/admin/clients/${omarId}`);
  await expect(appRow("Petal House")).toBeVisible();
});

test("the team moves an app from Omar to Lina with the code Omar gives them; five wrong codes close a request", async () => {
  await admin.goto(`/admin/clients/${omarId}`);
  const haddad = await appIdOf("Haddad Flowers");
  await admin.goto(`/admin/clients/${omarId}/move?app=${haddad}`);
  const dialog = admin.getByRole("dialog", { name: "Move Haddad Flowers to another account" });
  await dialog.getByLabel("The account it goes to").fill(lina.email);
  await dialog.getByRole("button", { name: "Search" }).click();
  await dialog.getByRole("link", { name: new RegExp(lina.name) }).click();
  await dialog.getByLabel(/Move the subscription/).uncheck();
  await expect(dialog.locator("[data-move-summary]")).toContainText("Past invoices, with the account that paid them");
  await expect(dialog.getByRole("note")).toContainText("Ask the client before moving data or subscriptions.");
  await shot(admin, "move-dialog", true);
  await dialog.getByRole("button", { name: "Send approval code to the client" }).click();
  await expect(admin).toHaveURL(/sent=1/);
  const first = await approval(omar.email, 1);
  expect(first.subject).toBe("Approve moving Haddad Flowers to another account");
  // Wrong codes: tries are counted, and the fifth closes the request.
  const wrong = first.code === "000000" ? "111111" : "000000";
  for (let left = 4; left >= 1; left -= 1) {
    await admin.getByLabel("The client's code").fill(wrong);
    await admin.getByRole("button", { name: "Move it now" }).click();
    await expect(admin.getByText(`That code isn't right. ${left} ${left === 1 ? "try" : "tries"} left.`)).toBeVisible();
  }
  await admin.getByLabel("The client's code").fill(wrong);
  await admin.getByRole("button", { name: "Move it now" }).click();
  await expect(admin).toHaveURL(/closed=attempts/);
  await expect(admin.getByText(/closed after 5 wrong codes/)).toBeVisible();

  // A new code, given by Omar and typed by the team: it moves now.
  await admin.goto(`/admin/clients/${omarId}/move?app=${haddad}&to=${linaId}`);
  await admin.getByLabel(/Move the subscription/).uncheck();
  await admin.getByRole("button", { name: "Send approval code to the client" }).click();
  const second = await approval(omar.email, 2);
  await admin.getByLabel("The client's code").fill(second.code);
  await admin.getByRole("button", { name: "Move it now" }).click();
  await expect(admin).toHaveURL(new RegExp(`/admin/clients/${linaId}\\?done=moved$`));
  await expect(appRow("Haddad Flowers")).toBeVisible();
  await expect(admin.getByRole("region", { name: "Changes by the team" })).toContainText("Moved Haddad Flowers from");
  // Omar keeps a record of it, to read; both were told.
  await admin.goto(`/admin/clients/${omarId}`);
  await expect(appRow("Haddad Flowers")).toContainText("Moved");
  await expect.poll(async () => (await mailsTo(omar.email)).some((m) => m.subject === "Haddad Flowers moved to another account")).toBe(true);
  await expect.poll(async () => (await mailsTo(lina.email)).some((m) => m.subject === "Haddad Flowers was added to your Yallapp account")).toBe(true);
});

test("the owner approves a move on their own page, and declines another", async ({ browser }) => {
  // Lina's copy goes back to Omar, approved by Lina herself.
  await admin.goto(`/admin/clients/${linaId}`);
  const copy = await appIdOf("Petal House Copy");
  await admin.goto(`/admin/clients/${linaId}/move?app=${copy}&to=${omarId}`);
  await admin.getByRole("button", { name: "Send approval code to the client" }).click();
  const mail = await approval(lina.email, 1);
  const own = await (await browser.newContext({ extraHTTPHeaders, viewport: { width: 1280, height: 900 }, deviceScaleFactor: 2 })).newPage();
  // Signed out: the sign-in first, then back to the page.
  await own.goto(mail.link);
  await expect(own).toHaveURL(/\/sign-in$/);
  await own.getByLabel("Email").fill(lina.email);
  await own.getByLabel("Password", { exact: true }).fill(lina.password);
  await own.getByRole("button", { name: "Sign in" }).click();
  await expect(own).toHaveURL(/\/dashboard\/app-moves\/[0-9a-f-]{36}\?expires=/);
  await expect(own.getByRole("heading", { name: "Approve moving your app" })).toBeVisible();
  await shot(own, "owner-approval-page", true);
  await own.getByRole("button", { name: "Approve the move" }).click();
  await expect(own.getByText("Approved. Petal House Copy has moved.")).toBeVisible();
  await admin.goto(`/admin/clients/${omarId}`);
  await expect(appRow("Petal House Copy")).toBeVisible();

  // Omar declines moving Petal House: nothing moves.
  const petal = await appIdOf("Petal House");
  await admin.goto(`/admin/clients/${omarId}/move?app=${petal}&to=${linaId}`);
  await admin.getByRole("button", { name: "Send approval code to the client" }).click();
  const decline = await approval(omar.email, 3);
  const omarPage = await (await browser.newContext({ extraHTTPHeaders })).newPage();
  await omarPage.goto("/sign-in");
  await omarPage.getByLabel("Email").fill(omar.email);
  await omarPage.getByLabel("Password", { exact: true }).fill(omar.password);
  await omarPage.getByRole("button", { name: "Sign in" }).click();
  await omarPage.waitForURL((url) => !url.pathname.startsWith("/sign-in"));
  await omarPage.goto(decline.link);
  await omarPage.getByRole("button", { name: "Decline" }).click();
  await expect(omarPage.getByText(/Declined\. Nothing moved/)).toBeVisible();
  // Lina can't approve Omar's move, even with its link.
  await own.goto(decline.link);
  await expect(own.getByText("Only the owner of the account the app leaves can approve this. Sign in with that account.")).toBeVisible();
  await admin.goto(`/admin/clients/${omarId}`);
  await expect(appRow("Petal House")).not.toContainText("Moved");
  await own.context().close();
  await omarPage.context().close();
});

test("the team moves a plan to another app with the owner's code", async () => {
  await admin.goto(`/admin/clients/${omarId}`);
  const petal = admin.getByRole("region", { name: "Petal House", exact: true });
  await petal.getByRole("region", { name: "Plan and license" }).getByRole("button", { name: "Activate & send license" }).click();
  await expect(admin.getByText(/^Activated\./).first()).toBeVisible();
  const from = await appIdOf("Petal House");
  const to = await appIdOf("Petal House Copy");
  await admin.goto(`/admin/clients/${omarId}/plan?app=${from}`);
  const dialog = admin.getByRole("dialog", { name: "Move the plan of Petal House to another app" });
  await expect(dialog.locator("[data-plan-summary]")).toContainText("active until");
  await dialog.getByRole("link", { name: /Petal House Copy/ }).click();
  await expect(admin).toHaveURL(new RegExp(`toApp=${to}`));
  await dialog.getByRole("button", { name: "Send approval code to the client" }).click();
  const mail = await approval(omar.email, 4);
  expect(mail.subject).toBe("Move your plan from Petal House to Petal House Copy");
  await admin.getByLabel("The client's code").fill(mail.code);
  await admin.getByRole("button", { name: "Move the plan now" }).click();
  await expect(admin).toHaveURL(new RegExp(`/admin/clients/${omarId}\\?done=plan-moved$`));
  await expect(appRow("Petal House Copy")).toContainText("has a plan");
  await expect(appRow("Petal House")).toContainText("no plan");
});

test("a client can't open the team's pages for moving, copying or making apps", async ({ browser }) => {
  const page = await (await browser.newContext({ extraHTTPHeaders })).newPage();
  await page.goto("/sign-in");
  await page.getByLabel("Email").fill(lina.email);
  await page.getByLabel("Password", { exact: true }).fill(lina.password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL((url) => !url.pathname.startsWith("/sign-in"));
  for (const part of ["move", "copy", "plan"]) {
    await page.goto(`/admin/clients/${omarId}/${part}?app=00000000-0000-4000-8000-000000000000`);
    expect(new URL(page.url()).pathname.startsWith("/admin")).toBe(false);
  }
  await page.goto(`/admin/clients/${omarId}`);
  expect(new URL(page.url()).pathname.startsWith("/admin")).toBe(false);
  await page.context().close();
});
