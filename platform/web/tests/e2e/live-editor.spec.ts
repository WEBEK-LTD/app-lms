import { expect, test, type Page, type Request } from "@playwright/test";
import { E2E } from "../../playwright.config";

/**
 * 82.1 The real app inside the editor: Pages & look shows the app preview
 * with the draft beside the editor; an edit, once saved, reaches the app in
 * the frame (it reads its tabs and pages again) without the frame loading
 * again. The quick view stays one click away.
 */
test.describe.configure({ mode: "serial" });
// Its own address, so its sign-up and sign-ins never use up the shared limits of the other specs.
const extraHTTPHeaders = { "x-forwarded-for": "198.51.100.183" };
test.use({ extraHTTPHeaders });

const suffix = Date.now().toString(36);
const client = { name: "Olive Market", email: `olive-${suffix}@market.test`, password: "olive-strong-password-1" };
let own: Page;

test.beforeAll(async ({ browser }) => {
  own = await (await browser.newContext({ extraHTTPHeaders })).newPage();
  await own.goto("/sign-up");
  await own.getByLabel("Full name").fill(client.name);
  await own.getByLabel("Email").fill(client.email);
  await own.getByLabel("WhatsApp number").fill("+90 544 000 01 83");
  await own.getByLabel("Password", { exact: true }).fill(client.password);
  await own.getByRole("checkbox").check();
  await own.getByRole("button", { name: "Create account" }).click();
  await expect(own).toHaveURL(/\/pending$/);

  const admin = await (await browser.newContext({ extraHTTPHeaders })).newPage();
  await admin.goto("/sign-in");
  await admin.getByLabel("Email").fill(E2E.liveEditorAdminEmail);
  await admin.getByLabel("Password", { exact: true }).fill(E2E.adminPassword);
  await admin.getByRole("button", { name: "Sign in" }).click();
  await admin.waitForURL((url) => url.pathname.startsWith("/admin"));
  await admin.goto(`/admin?q=${encodeURIComponent(client.email)}`);
  await admin.getByRole("link", { name: `Activate ${client.name}` }).click();
  await admin.getByRole("complementary").getByRole("button", { name: "Activate & send license" }).click();
  await expect(admin.getByRole("status")).toContainText("Activated");
  await admin.context().close();

  // A shop without a website: its content is on the hosted API, so the preview can show the draft.
  await own.goto("/dashboard/app-type");
  await own.getByText("Store", { exact: true }).click();
  await own.getByRole("button", { name: "Continue" }).click();
  await own.getByText("I don't have a website").click();
  await own.getByRole("button", { name: "Save & continue" }).click();
  await expect(own.getByRole("heading", { name: "Branding" })).toBeVisible();
});

test.afterAll(async () => {
  await own.context().close();
});

const pagesRead = (r: Request) => /\/api\/app\/[^/]+\/pages$/.test(new URL(r.url()).pathname) && r.method() === "GET";

test("the editor shows the real app with the draft, and an edit reaches it without a reload", async () => {
  const firstRead = own.waitForRequest(pagesRead, { timeout: 45_000 });
  await own.goto("/dashboard/pages");
  const frame = own.locator("iframe[data-testid=editor-preview]");
  await expect(frame).toHaveAttribute("src", /^\/preview-app\/index\.html\?token=p1\./);
  await expect(own.getByRole("button", { name: "The app", exact: true })).toHaveAttribute("aria-pressed", "true");
  // The app in the frame reads the draft's tabs and pages.
  expect((await firstRead).headers()["x-yallapp-preview"]).toMatch(/^p1\./);
  await expect(own.frameLocator("iframe[data-testid=editor-preview]").locator("flutter-view, flt-glass-pane").first()).toBeAttached();

  // From here, the frame never loads again.
  let loads = 0;
  own.on("framenavigated", (f) => {
    if (f !== own.mainFrame()) loads += 1;
  });
  const nextRead = own.waitForRequest(pagesRead, { timeout: 30_000 });
  await own.getByRole("tab", { name: "Tabs" }).click();
  await own.getByRole("group", { name: /^Tab 1/ }).getByLabel("Label", { exact: true }).fill("Start");
  await expect(own.getByText("Unsaved changes")).toHaveCount(0, { timeout: 15_000 });
  // The app reads the draft again, which has the new tab name.
  const read = await nextRead;
  const answer = await read.response();
  expect(((await answer!.json()) as { tabs: { label: string }[] }).tabs[0]!.label).toBe("Start");
  expect(loads).toBe(0);
});

test("the quick view is one click away", async () => {
  await own.getByRole("button", { name: "Quick view", exact: true }).click();
  await expect(own.locator("iframe[data-testid=editor-preview]")).toHaveCount(0);
  await own.getByRole("button", { name: "The app", exact: true }).click();
  await expect(own.locator("iframe[data-testid=editor-preview]")).toHaveCount(1);
});
