import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { expect, test, type Page } from "@playwright/test";
import { E2E } from "../../playwright.config";

/**
 * Roadmap 19: a business without a website. Their own API is saved even when
 * its check fails (and the dashboard keeps saying so); "I don't have
 * WordPress" needs no address, lets them choose App sign-in now, and ends
 * when our team marks the site ready or the plugin is activated on it; an
 * app our team moved to the hosted API chooses its content source.
 */
test.describe.configure({ mode: "serial" });

const suffix = Date.now().toString(36);
const client = { name: "Nadia Quill", email: `nadia-${suffix}@quill.test`, password: "nadia-strong-password-1" };
const extraHTTPHeaders = { "x-forwarded-for": "203.0.113.191" };
let admin: Page;
let own: Page;
let clientUrl = "";

async function mailsTo(email: string): Promise<{ to: string; subject: string; text: string }[]> {
  const dir = path.resolve(E2E.mailDir);
  const files = await readdir(dir).catch(() => [] as string[]);
  const mails = await Promise.all(files.map(async (f) => JSON.parse(await readFile(path.join(dir, f), "utf8")) as { to: string; subject: string; text: string }));
  return mails.filter((m) => m.to === email);
}

test.beforeAll(async ({ browser }) => {
  own = await browser.newPage({ extraHTTPHeaders });
  await own.goto("/sign-up");
  await own.getByLabel("Full name").fill(client.name);
  await own.getByLabel("Email").fill(client.email);
  await own.getByLabel("WhatsApp number").fill("+90 544 000 00 19");
  // No website at all.
  await own.getByLabel("Password", { exact: true }).fill(client.password);
  await own.getByRole("checkbox").check();
  await own.getByRole("button", { name: "Create account" }).click();
  await expect(own).toHaveURL(/\/pending$/);

  admin = await browser.newPage({ extraHTTPHeaders });
  await admin.goto("/sign-in");
  await admin.getByLabel("Email").fill(E2E.appsAdminEmail);
  await admin.getByLabel("Password", { exact: true }).fill(E2E.adminPassword);
  await admin.getByRole("button", { name: "Sign in" }).click();
  await admin.waitForURL((url) => url.pathname.startsWith("/admin"));
  await admin.goto(`/admin/clients?q=${encodeURIComponent(client.email)}`);
  await admin.getByRole("link", { name: `Activate ${client.name}` }).click();
  await admin.getByRole("complementary").getByRole("button", { name: "Activate & send license" }).click();
  await expect(admin.getByRole("status")).toContainText("Activated");
  await admin.getByRole("link", { name: client.name, exact: true }).click();
  await admin.waitForURL(/\/admin\/clients\/[0-9a-f-]{36}$/);
  clientUrl = admin.url();
});

test.afterAll(async () => {
  await own.close();
  await admin.close();
});

test("their own API is saved even when its check fails, and the dashboard says so", async () => {
  await own.goto("/pending");
  await expect(own).toHaveURL(/\/dashboard\/app-type$/);
  await own.getByRole("button", { name: "Continue" }).click();
  await own.getByRole("radio", { name: /My own API/ }).check();
  await own.getByLabel("Your website", { exact: true }).fill(`https://quill-${suffix}.test`);
  await own.getByLabel("Your API address").fill("https://127.0.0.1/yallapp/v1");
  await own.getByRole("button", { name: "Save & continue" }).click();
  await expect(own.getByText("Saved. Your API didn't pass every check below")).toBeVisible();
  await expect(own.getByRole("listitem").filter({ hasText: "This address points to a private network." })).toContainText("(failed)");
  await expect(own.getByRole("link", { name: "Continue the setup in the meantime" })).toBeVisible();

  await own.goto("/dashboard");
  await expect(own.getByText("Untitled app: your API didn't pass the check")).toBeVisible();
  await own.goto("/dashboard/builds");
  await expect(own.getByText("Your API didn't pass its last check")).toBeVisible();
});

test("“I don't have WordPress” needs no website, and App sign-in can be chosen while they wait", async () => {
  await own.goto("/dashboard/setup?step=website");
  await own.getByRole("radio", { name: /I don't have WordPress/ }).check();
  await expect(own.getByLabel("Your current website (optional)")).toBeVisible();
  await own.getByLabel("Your current website (optional)").fill("");
  await own.getByRole("button", { name: "Save & continue" }).click();
  await expect(own.getByText("Thanks! Our team will message you on WhatsApp")).toBeVisible();
  // Another website now: the API's failed check no longer applies.
  await own.goto("/dashboard/builds");
  await expect(own.getByText("Your API didn't pass its last check")).toHaveCount(0);

  await own.getByRole("navigation", { name: "Dashboard" }).getByRole("link", { name: "App sign-in" }).click();
  await expect(own.getByText("Our team is still setting up your WordPress site.")).toBeVisible();
  await own.getByText("Phone number or email address").click();
  await own.getByRole("button", { name: "Save sign-in methods" }).click();
  await expect(own.getByText("Saved. It applies as soon as your WordPress site and the Yallapp plugin are ready.")).toBeVisible();
  await expect(own.getByRole("heading", { name: "WhatsApp number for codes" })).toBeVisible();

  await own.goto("/dashboard/preview");
  await expect(own.getByText("Your WordPress site, once our team has set it up.")).toBeVisible();
  await expect(own.getByText("Your API signs people in")).toHaveCount(0);
  await own.goto("/dashboard/pages");
  await expect(own.getByText("Apps on your own API don't get these pages")).toHaveCount(0);
});

test("our team marks the WordPress site ready, and the client is told", async () => {
  await admin.goto(clientUrl);
  const card = admin.getByRole("region", { name: "App", exact: true });
  await card.getByRole("button", { name: "Check the connection now" }).click();
  await expect(card.getByText("the plugin isn't active on a site yet")).toBeVisible();
  await card.getByLabel("Their new WordPress site").fill("not a site");
  await card.getByRole("button", { name: "WordPress is ready" }).click();
  await expect(card.getByText("Enter the site's address")).toBeVisible();
  await card.getByLabel("Their new WordPress site").fill(`https://wp-${suffix}.quill.test/`);
  await card.getByRole("button", { name: "WordPress is ready" }).click();
  await expect(admin.getByRole("status").first()).toContainText("The app now gets its content from the client's new WordPress site.");
  await expect(admin.getByRole("region", { name: "Changes by the team" })).toContainText(`https://wp-${suffix}.quill.test`);

  await own.goto("/dashboard");
  await expect(own.getByText("Your WordPress site for Untitled app is ready")).toBeVisible();
  await expect.poll(async () => (await mailsTo(client.email)).map((m) => m.subject)).toContain("Untitled app: your WordPress site is ready");
  await own.goto("/dashboard/setup?step=website");
  await expect(own.getByRole("radio", { name: /My WordPress site/ })).toBeChecked();
  await expect(own.getByLabel("Your WordPress website")).toHaveValue(`https://wp-${suffix}.quill.test`);
});

test("activating the license in the plugin on the new site does the same", async ({ request }) => {
  // They ask again (another site this time).
  await own.getByRole("radio", { name: /I don't have WordPress/ }).check();
  await own.getByRole("button", { name: "Save & continue" }).click();
  await expect(own.getByText("Thanks! Our team will message you on WhatsApp")).toBeVisible();

  await own.goto("/dashboard/license");
  const key = (await own.getByLabel("License key").textContent())!.trim();
  const activated = await request.post("/api/v1/licenses/activate", {
    headers: { "x-forwarded-for": "203.0.113.192" },
    data: { license_key: key, site_url: `http://shop-${suffix}.quill.test/`, plugin_version: "0.3.0" },
  });
  expect(activated.status()).toBe(200);

  await own.goto("/dashboard/setup?step=website");
  await expect(own.getByRole("radio", { name: /My WordPress site/ })).toBeChecked();
  await expect(own.getByLabel("Your WordPress website")).toHaveValue(`https://shop-${suffix}.quill.test`);
  await expect(own.getByRole("region", { name: "Website" })).toContainText("Connected · plugin 0.3.0");
  await expect.poll(async () => (await mailsTo(client.email)).filter((m) => m.subject === "Untitled app: your WordPress site is ready").length).toBe(2);
});

test("an app our team moved to the hosted API chooses where its content comes from", async () => {
  await admin.goto(clientUrl);
  await admin.getByRole("region", { name: "App", exact: true }).getByRole("button", { name: "Use the hosted API" }).click();
  await expect(admin.getByRole("status").first()).toContainText("The client chooses where its content comes from");

  await own.goto("/dashboard");
  await expect(own.getByRole("listitem").filter({ hasText: "Website" }).first()).toContainText("(next)");
  await own.goto("/dashboard/setup?step=website");
  await expect(own.getByText("Our team moved your app to the Yallapp hosted API, but nothing gives it content yet.")).toBeVisible();
  await own.getByRole("radio", { name: /I don't have a website/ }).check();
  await own.getByRole("button", { name: "Save & continue" }).click();
  await expect(own.getByRole("heading", { name: "Branding" })).toBeVisible();
  await expect(own.getByRole("navigation", { name: "Dashboard" }).getByRole("link", { name: "Courses" })).toBeVisible();
});
