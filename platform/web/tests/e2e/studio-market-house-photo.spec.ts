import { expect, test, type Page } from "@playwright/test";
import { E2E } from "../../playwright.config";
import { solidPng } from "./png";

/**
 * 218 Yallapp's own designer page: the Yallapp logo is its photo (on
 * /designers/yallapp, in its JSON-LD and on the market's cards of Yallapp's
 * free templates) until the team uploads one in Admin › Studio Market ›
 * Designers › Yallapp's own page; uploaded, it shows at once (no review);
 * "Use the Yallapp logo" takes it away again. The demo account is made
 * first (Admin › Demo apps), as Yallapp's own templates need it.
 */
test.describe.configure({ mode: "serial", timeout: 240_000 });

const extraHTTPHeaders = { "x-forwarded-for": "198.51.100.218" };
const LOGO = /\/android-chrome-512x512\.png$/;
const UPLOADED = /\/api\/v1\/assets\/[0-9a-f-]{36}$/;
let admin: Page;
let pagePath = "";

test.beforeAll(async ({ browser }) => {
  admin = await browser.newPage({ extraHTTPHeaders });
  await admin.goto("/sign-in");
  await admin.getByLabel("Email").fill(E2E.housePhotoAdminEmail);
  await admin.getByLabel("Password", { exact: true }).fill(E2E.adminPassword);
  await admin.getByRole("button", { name: "Sign in" }).click();
  await admin.waitForURL((url) => url.pathname.startsWith("/admin"));
  // Yallapp's own templates are listed by the demo account's designer (tests/e2e/demo-apps.spec.ts may have made it already).
  await admin.goto("/admin/demos");
  const create = admin.getByRole("button", { name: "Create the regular demo apps" });
  if (await create.count()) {
    admin.once("dialog", (dialog) => void dialog.accept());
    await create.click();
    await expect(admin.getByRole("status")).toContainText("The regular apps' demos are created and up to date.", { timeout: 60_000 });
  }
});

test.afterAll(async () => {
  await admin?.close();
});

async function ldImage(p: Page): Promise<string | undefined> {
  const blocks = await p.locator('script[type="application/ld+json"]').allTextContents();
  const profile = blocks.flatMap((b) => [JSON.parse(b)].flat()).find((d: { "@type"?: string }) => d["@type"] === "ProfilePage") as { mainEntity?: { image?: string } } | undefined;
  return profile?.mainEntity?.image;
}

test("the Yallapp logo until a photo is uploaded; the team's upload shows at once on the page and the cards", async ({ browser }) => {
  await admin.goto("/admin/market/designers");
  const card = admin.locator("[data-house-page]");
  await expect(card.getByRole("heading", { name: "Yallapp's own page" })).toBeVisible();
  const see = card.getByRole("link", { name: "See the page" });
  await expect(see).toBeVisible();
  pagePath = (await see.getAttribute("href"))!;
  expect(pagePath).toMatch(/^\/designers\/yallapp/);

  // Make sure it starts from the logo (a run before may have left a photo).
  const useLogo = card.getByRole("checkbox", { name: /Use the Yallapp logo/ });
  if (await useLogo.count()) {
    await useLogo.check();
    await card.getByRole("button", { name: "Save Yallapp's page" }).click();
    await expect(card.getByRole("status")).toContainText("Yallapp's page shows the Yallapp logo.");
    await admin.reload();
  }
  await expect(card.getByRole("img", { name: "The Yallapp logo" })).toHaveAttribute("src", LOGO);

  const visitor = await browser.newPage({ extraHTTPHeaders });
  await visitor.goto(pagePath);
  await expect(visitor.getByRole("heading", { level: 1, name: "Yallapp" })).toBeVisible();
  await expect(visitor.locator("[data-designer-photo]")).toHaveAttribute("src", LOGO);
  expect(await ldImage(visitor)).toMatch(LOGO);
  await visitor.goto("/templates?price=free");
  const sofra = visitor.locator('[data-template-card="sofra-eats-editorial-menu"]');
  await expect(sofra.locator("img[src$='/android-chrome-512x512.png']").first()).toBeAttached();

  // Not a PNG or JPEG: refused, whatever it is named.
  await card.locator('input[type="file"][name="photo"]').setInputFiles({ name: "photo.png", mimeType: "image/png", buffer: Buffer.from("<svg xmlns='http://www.w3.org/2000/svg'/>") });
  await card.getByRole("button", { name: "Save Yallapp's page" }).click();
  await expect(card.getByText("Choose a PNG or JPEG photo up to 2 MB.")).toBeVisible();

  // The team uploads a photo and a line: shown at once, no review.
  await card.locator('input[type="file"][name="photo"]').setInputFiles({ name: "yallapp.png", mimeType: "image/png", buffer: solidPng(400, 400, [255, 90, 31]) });
  await card.getByLabel("A line about Yallapp").fill("Yallapp's own Studio designs, free for every project.");
  await card.getByRole("button", { name: "Save Yallapp's page" }).click();
  await expect(card.getByRole("status")).toContainText("Saved. Yallapp's page shows it now.");
  await admin.reload();
  await expect(card.getByRole("img", { name: "Yallapp's page photo" })).toHaveAttribute("src", UPLOADED);
  await expect(admin.locator('[data-profile-review^="yallapp"]')).toHaveCount(0);

  await visitor.goto(pagePath);
  await expect(visitor.locator("[data-designer-photo]")).toHaveAttribute("src", UPLOADED);
  await expect(visitor.locator("[data-designer-bio]")).toHaveText("Yallapp's own Studio designs, free for every project.");
  expect(await ldImage(visitor)).toMatch(UPLOADED);
  const photo = await visitor.locator("[data-designer-photo]").getAttribute("src");
  const served = await visitor.request.get(photo!);
  expect(served.status()).toBe(200);
  expect(served.headers()["content-type"]).toBe("image/png");
  await visitor.goto("/templates?price=free");
  await expect(visitor.locator('[data-template-card="sofra-eats-editorial-menu"]').locator(`img[src="${photo}"]`).first()).toBeAttached();

  // In the audit log.
  await admin.goto("/admin/audit");
  await expect(admin.getByText(/Yallapp's own designer page: uploaded a photo/).first()).toBeVisible();

  // "Use the Yallapp logo": the logo again.
  await admin.goto("/admin/market/designers");
  await card.getByRole("checkbox", { name: /Use the Yallapp logo/ }).check();
  await card.getByRole("button", { name: "Save Yallapp's page" }).click();
  await expect(card.getByRole("status")).toContainText("The uploaded photo is removed: Yallapp's page shows the Yallapp logo.");
  await visitor.goto(pagePath);
  await expect(visitor.locator("[data-designer-photo]")).toHaveAttribute("src", LOGO);
  await visitor.close();
});
