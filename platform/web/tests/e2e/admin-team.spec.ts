import { expect, test, type APIRequestContext, type Browser, type Page } from "@playwright/test";
import { E2E } from "../../playwright.config";
import { solidPng } from "./png";

/**
 * The admin team, the audit log, switches, the overview and the client page
 * (roadmap 11.1, 11.2, 11.5, 11.7): an owner invites a support admin, who
 * can activate clients but not change prices; the log shows who did what;
 * a switched-off platform leaves the Website step.
 */
test.describe.configure({ mode: "serial" });

const suffix = Date.now().toString(36);
const client = { name: "Quill Academy", email: `quill-${suffix}@academy.test` };
const support = { name: "Sam Support", email: `sam-${suffix}@yallapp.test`, password: "support-strong-password-1" };
let owner: Page;
let helper: Page;
let clientId = "";

async function signInOwner(browser: Browser) {
  // One sign-in for the whole file: sign-ins are rate limited per email.
  owner = await browser.newPage();
  await owner.goto("/sign-in");
  await owner.getByLabel("Email").fill(E2E.teamAdminEmail);
  await owner.getByLabel("Password", { exact: true }).fill(E2E.adminPassword);
  await owner.getByRole("button", { name: "Sign in" }).click();
  await owner.waitForURL((url) => url.pathname.startsWith("/admin"));
}

test.beforeAll(async ({ browser }) => {
  await signInOwner(browser);
});

test.afterAll(async () => {
  // Other specs share this server: switch everything back on.
  await owner.goto("/admin/switches");
  const ikas = owner.getByRole("checkbox", { name: "ikas" });
  if (!(await ikas.isChecked())) {
    await ikas.check();
    await owner.getByRole("button", { name: "Save switches" }).click();
    await expect(owner.getByText("Switches saved.")).toBeVisible();
  }
  await owner.close();
  await helper?.close();
});

test("the overview counts from the data and the team adds a client", async () => {
  await owner.goto("/admin");
  await expect(owner.getByRole("heading", { name: "Overview" })).toBeVisible();
  const pending = owner.getByRole("link", { name: /^Pending activation/ });
  const before = Number((await pending.textContent())?.replace(/\D/g, ""));

  await owner.getByRole("navigation", { name: "Super admin" }).getByRole("link", { name: "Clients" }).click();
  await owner.getByRole("link", { name: "Add client" }).click();
  const panel = owner.getByRole("complementary");
  await panel.getByLabel("Full name").fill(client.name);
  await panel.getByLabel("Email").fill(client.email);
  await panel.getByLabel("WhatsApp number").fill("+90 544 000 00 31");
  await panel.getByLabel("WordPress website").fill(`https://quill-${suffix}.academy.test`);
  await panel.getByRole("button", { name: "Add client" }).click();
  await expect(owner.getByRole("status")).toContainText("Client added.");
  clientId = new URL(owner.url()).searchParams.get("client") ?? "";
  expect(clientId).toMatch(/^[0-9a-f-]{36}$/);

  await owner.goto("/admin");
  await expect(owner.getByRole("link", { name: /^Pending activation/ })).toContainText(String(before + 1));
  // Links from before the client list had its own page still work.
  await owner.goto(`/admin?q=${encodeURIComponent(client.email)}`);
  await expect(owner).toHaveURL(/\/admin\/clients\?q=/);
  await expect(owner.getByRole("link", { name: client.name, exact: true })).toBeVisible();
});

test("an owner invites a support admin", async ({ browser }) => {
  await owner.goto("/admin/team");
  const invite = owner.getByRole("complementary");
  await invite.getByLabel("Name", { exact: true }).fill(support.name);
  await invite.getByLabel("Email", { exact: true }).fill(support.email);
  await invite.getByRole("radio", { name: /^Support/ }).check();
  await invite.getByRole("button", { name: "Invite" }).click();
  await expect(invite.getByText(`${support.email} is on the team as Support.`)).toBeVisible();
  const link = await invite.getByLabel("Set-password link").inputValue();
  expect(link).toContain("/reset-password?token=");
  await expect(owner.getByRole("table")).toContainText("Invited, no password yet");

  // The same email can't be invited twice, and clients can't join.
  await invite.getByLabel("Name", { exact: true }).fill("Quill");
  await invite.getByLabel("Email", { exact: true }).fill(client.email);
  await invite.getByRole("button", { name: "Invite" }).click();
  await expect(invite.getByText("This email belongs to a client account.")).toBeVisible();

  helper = await (await browser.newContext()).newPage();
  await helper.goto(link);
  await helper.getByLabel("New password", { exact: true }).fill(support.password);
  await helper.getByLabel("Repeat the new password").fill(support.password);
  await helper.getByRole("button", { name: "Save password and sign in" }).click();
  await expect(helper).toHaveURL(/\/admin$/);
  await expect(helper.getByRole("navigation", { name: "Super admin" })).toContainText(`${support.email} · Support`);
});

test("a support admin can't change plan prices but can activate a client", async () => {
  await helper.goto("/admin/plans");
  await expect(helper.getByText("Your role can see this but not change plans or prices.")).toBeVisible();
  const pro = helper.getByRole("region", { name: "Pro" });
  await expect(pro.getByRole("button", { name: "Save plan" })).toBeDisabled();
  await expect(pro.getByLabel("Card price")).toBeDisabled();

  // Forcing the form open doesn't help: the server checks the role.
  await helper.evaluate(() => document.querySelectorAll("fieldset[disabled]").forEach((f) => f.removeAttribute("disabled")));
  await pro.getByLabel("Card price").fill("1");
  await pro.getByRole("button", { name: "Save plan" }).click();
  await expect(helper).toHaveURL(/\/admin\?denied=plans\.edit$/);
  await expect(helper.getByRole("main").getByRole("alert")).toContainText("Your role can't do that.");
  await helper.goto("/admin/team");
  await expect(helper.getByRole("button", { name: "Invite" })).toHaveCount(0);

  await helper.goto(`/admin/clients?q=${encodeURIComponent(client.email)}`);
  await helper.getByRole("link", { name: `Activate ${client.name}` }).click();
  const panel = helper.getByRole("complementary");
  await expect(panel.getByRole("button", { name: "Suspend" })).toHaveCount(0);
  await panel.getByLabel("Plan").selectOption("starter");
  await panel.getByRole("button", { name: "Activate & send license" }).click();
  await expect(helper.getByRole("status")).toContainText("Activated");
});

test("the audit log shows who changed what", async () => {
  await owner.goto("/admin/audit");
  const log = owner.getByRole("region", { name: "Log entries" });
  await expect(log.getByRole("row", { name: /Team member invited/ }).first()).toContainText(`Invited ${support.email} as Support`);
  await expect(log.getByRole("row", { name: new RegExp(`Client activated.*${client.name}`) })).toContainText(support.email);
  await expect(log.getByRole("row", { name: new RegExp(`Client added.*${client.name}`) })).toContainText(E2E.teamAdminEmail);

  await owner.getByLabel("Who").fill(support.email);
  await owner.getByRole("button", { name: "Filter" }).click();
  await expect(log.getByRole("row")).toHaveCount(2);
  await expect(log).toContainText("Client activated");
  await expect(log).not.toContainText("Team member invited");
  // Secrets never reach the log; the plan the support admin tried to change wasn't saved.
  await owner.goto(`/admin/audit?action=plan.save&actor=${encodeURIComponent(support.email)}`);
  await expect(owner.getByText("No entries match.")).toBeVisible();
});

test("a switched-off platform disappears from a client's Website step", async () => {
  await owner.goto("/admin/switches");
  await owner.getByRole("checkbox", { name: "ikas" }).uncheck();
  await owner.getByRole("button", { name: "Save switches" }).click();
  await expect(owner.getByText("Switches saved.")).toBeVisible();
  await owner.reload();
  await expect(owner.getByRole("checkbox", { name: "ikas" })).not.toBeChecked();

  // The team sets up the client's app from their dashboard.
  await owner.goto(`/admin/clients/${clientId}`);
  await owner.getByRole("button", { name: "Edit their app settings" }).click();
  await expect(owner).toHaveURL(/\/dashboard\/app-type$/);
  await owner.getByText("Store", { exact: true }).click();
  await owner.getByRole("button", { name: "Continue" }).click();
  await owner.getByText("Another store platform").click();
  await expect(owner.getByRole("radio", { name: "Ticimax", exact: true })).toBeVisible();
  await expect(owner.getByRole("radio", { name: "ikas", exact: true })).toHaveCount(0);

  // Their WordPress site (apps on the hosted API can't build against this http test server).
  await owner.getByRole("radio", { name: /My WordPress site/ }).check();
  await owner.getByRole("button", { name: "Save & continue" }).click();
  await owner.getByLabel("App name").fill("Quill Academy");
  await owner.getByLabel("Name under the app icon").fill("Quill");
  await owner.locator("#upload-icon").setInputFiles({ name: "icon.png", mimeType: "image/png", buffer: solidPng(1024, 1024, [14, 13, 36]) });
  await expect(owner.getByText("Replace file")).toBeVisible();
  await owner.getByRole("button", { name: "Save & continue" }).click();
  await owner.getByLabel("Android package name").fill(`com.quill${suffix}.app`);
  await owner.getByLabel("iOS bundle ID").fill(`com.quill${suffix}.app`);
  await owner.getByLabel("Store title").fill("Quill Academy");
  await owner.getByLabel("Short description").fill("Shop Quill on your phone.");
  await owner.getByLabel("Full description").fill("Quill brings every product to your phone, with checkout and order history.");
  await owner.getByLabel("Support email").fill("help@quill.test");
  await owner.getByLabel("Privacy policy URL").fill("https://quill.test/privacy");
  await owner.getByRole("button", { name: "Save & continue" }).click();
  await owner.getByRole("button", { name: "Finish setup" }).click();
  await expect(owner).toHaveURL(/\/dashboard\/builds\?started=1$/);
  await owner.getByRole("button", { name: "Back to admin" }).click();
  await expect(owner).toHaveURL(new RegExp(`/admin/clients/${clientId}$`));
});

/** The pipeline fails this client's queued builds, so other specs reading the queue never get them. */
async function failQueuedBuilds(request: APIRequestContext) {
  const headers = { authorization: `Bearer ${E2E.pipelineToken}` };
  const queue = await (await request.get("/api/v1/builds/queue", { headers })).json();
  const mine = queue.builds.filter((b: { client_id: string }) => b.client_id === clientId);
  for (const build of mine) {
    const response = await request.post(`/api/v1/builds/${build.id}/status`, { headers, data: { status: "failed", message: "Gradle failed" } });
    expect(response.ok()).toBe(true);
  }
  return mine.length as number;
}

test("the client page shows the client's app, builds and changes", async ({ request }) => {
  await owner.goto("/admin/clients");
  await owner.getByRole("link", { name: client.name, exact: true }).click();
  await expect(owner).toHaveURL(new RegExp(`/admin/clients/${clientId}$`));
  await expect(owner.getByRole("heading", { name: client.name, level: 1 })).toBeVisible();

  const app = owner.getByRole("region", { name: "App", exact: true });
  await expect(app).toContainText("Store");
  await expect(app).toContainText(`com.quill${suffix}.app`);
  await expect(app).toContainText("Their WordPress site");
  // The test site doesn't exist, so the live check says so.
  await app.getByRole("button", { name: "Check the connection now" }).click();
  await expect(app.getByRole("status")).toContainText("doesn't answer as the app expects", { timeout: 20_000 });

  const builds = owner.getByRole("region", { name: "Builds" });
  await expect(builds).toContainText("#1 · 1.0.0");
  await expect(builds).toContainText("Queued");
  // A failed build runs again from here.
  expect(await failQueuedBuilds(request)).toBe(1);
  await owner.reload();
  await expect(builds).toContainText("Gradle failed");
  await builds.getByRole("button", { name: "Run again" }).click();
  await expect(owner.getByRole("status")).toContainText("The build is queued again.");
  await expect(builds).toContainText("#2 · 1.0.0");
  expect(await failQueuedBuilds(request)).toBe(1);

  await expect(owner.getByRole("region", { name: "Plan and license" })).toContainText("Starter until");
  // App users and notifications are for apps on the hosted API.
  await expect(owner.getByRole("region", { name: /^App users/ })).toHaveCount(0);
  const changes = owner.getByRole("region", { name: "Changes by the team" });
  await expect(changes).toContainText("Client activated");
  await expect(changes).toContainText("Client's app changed");
  await expect(changes).toContainText("Build run again");
});
