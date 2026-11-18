import { expect, test, type Page } from "@playwright/test";
import { E2E } from "../../playwright.config";

/**
 * 182 The app check on Publish in Studio: a shop from the Shop looks
 * template (one the check passes as an owner gets it). The owner writes words with a [placeholder] in them and
 * publishes: nothing is published, the list says what the customers would
 * see and where, with no way to publish anyway; Fix opens that element in
 * the editor, the owner writes their own words and publishes. With Arabic in
 * the app, an English text the owner changed shows as it is on an Arabic
 * phone: a warning, and "Publish anyway" publishes; the same warnings aren't
 * asked about again.
 */
test.describe.configure({ mode: "serial" });

const suffix = Date.now().toString(36);
const client = { name: "Rose Corner", email: `app-check-${suffix}@studio.test`, password: "rose-corner-strong-password-1" };
/** Its own address, so this spec's sign-up and sign-in don't count against the other specs' per-IP limits. */
const extraHTTPHeaders = { "x-forwarded-for": "198.51.100.182" };
let own: Page;

test.beforeAll(async ({ browser }) => {
  test.setTimeout(120_000);
  own = await (await browser.newContext({ extraHTTPHeaders, viewport: { width: 1440, height: 900 } })).newPage();
  await own.goto("/sign-up");
  await own.getByLabel("Full name").fill(client.name);
  await own.getByLabel("Email").fill(client.email);
  await own.getByLabel("WhatsApp number").fill("+20 100 000 0182");
  await own.getByLabel("Your website (optional)").fill(`https://app-check-${suffix}.studio.test`);
  await own.getByLabel("Password", { exact: true }).fill(client.password);
  await own.getByRole("checkbox").check();
  await own.getByRole("button", { name: "Create account" }).click();
  await expect(own).toHaveURL(/\/start$/);

  const admin = await browser.newPage({ extraHTTPHeaders });
  await admin.goto("/sign-in");
  await admin.getByLabel("Email").fill(E2E.appCheckAdminEmail);
  await admin.getByLabel("Password", { exact: true }).fill(E2E.adminPassword);
  await admin.getByRole("button", { name: "Sign in" }).click();
  await admin.waitForURL((url) => url.pathname.startsWith("/admin"));
  await admin.goto(`/admin?q=${encodeURIComponent(client.email)}`);
  await admin.getByRole("link", { name: `Activate ${client.name}` }).click();
  await admin.getByRole("complementary").getByRole("button", { name: "Activate & send license" }).click();
  await expect(admin.getByRole("status")).toContainText("Activated");
  await admin.close();

  await own.goto("/studio/new");
  await own.getByRole("radio", { name: /^Store( |$)/ }).first().check();
  await own.getByLabel("Project name").fill(client.name);
  await own.getByRole("button", { name: "Next" }).click();
  await own.getByRole("radio", { name: /Shop looks/ }).first().click();
  await own.getByRole("button", { name: "Next" }).click();
  await expect(own).toHaveURL(/\/studio\/project$/);
});

test.afterAll(async () => {
  await own.context().close();
});

const phone = () => own.getByRole("main", { name: "The page in the phone" });
const inspector = () => own.getByRole("complementary", { name: "Design" });
const dialog = () => own.getByRole("dialog", { name: "Before your customers see it" });
const published = () => own.getByText("Published. The app shows it the next time it opens.");

test("a [placeholder] stops Publish; Fix opens the element; fixed, it publishes", async () => {
  await own.goto("/studio/editor");
  await phone().getByText("Shop by brand", { exact: true }).first().click();
  const text = inspector().getByRole("textbox", { name: "Text", exact: true });
  await text.fill("Call us on [your number]");

  await own.getByRole("button", { name: "Publish", exact: true }).click();
  await expect(dialog()).toBeVisible();
  const problem = dialog().locator('[data-problem="placeholder"]');
  await expect(problem).toHaveCount(1);
  await expect(problem).toHaveAttribute("data-severity", "error");
  await expect(problem).toContainText("Customers see “Call us on [your number]”, words the template left for you to write.");
  await expect(problem).toContainText("home page");
  await expect(dialog()).toContainText("the app can't be published until they're fixed");
  // An error: no way to publish anyway.
  await expect(dialog().getByRole("button", { name: "Publish anyway" })).toHaveCount(0);
  await expect(published()).toHaveCount(0);

  // Somewhere else on the canvas first: Fix brings the owner back to that element.
  await dialog().getByRole("button", { name: "Not now" }).click();
  await expect(dialog()).toHaveCount(0);
  await phone().getByText(client.name, { exact: true }).first().click();
  await own.getByRole("button", { name: "Publish", exact: true }).click();
  await dialog().getByRole("link", { name: /^Fix:/ }).first().click();
  await expect(dialog()).toHaveCount(0);
  await expect(inspector().getByRole("textbox", { name: "Text", exact: true })).toHaveValue("Call us on [your number]");
  await inspector().getByRole("textbox", { name: "Text", exact: true }).fill("Call us any time");

  await own.getByRole("button", { name: "Publish", exact: true }).click();
  await expect(published()).toBeVisible();
  await expect(dialog()).toHaveCount(0);
});

test("with Arabic in the app, an English text not translated is a warning: Publish anyway publishes, and isn't asked again", async () => {
  await own.goto("/studio/project/languages");
  const list = own.getByRole("list", { name: "Languages in the app" }).getByRole("listitem");
  await own.getByLabel("Add a language").selectOption("ar");
  await own.getByRole("button", { name: "Add", exact: true }).click();
  await expect(list).toHaveCount(2);
  await expect(own.getByText("Languages saved to your draft")).toBeVisible();

  await own.goto("/studio/editor");
  await phone().getByText("Call us any time", { exact: true }).first().click();
  await inspector().getByRole("textbox", { name: "Text", exact: true }).fill("Our florists answer every day");
  await own.getByRole("button", { name: "Publish", exact: true }).click();
  await expect(dialog()).toBeVisible();
  const warning = dialog().locator('[data-problem="untranslated"]').first();
  await expect(warning).toHaveAttribute("data-severity", "warning");
  await expect(warning).toContainText("“Our florists answer every day” isn't translated, so it shows as it is in this language.");
  await expect(warning).toContainText("العربية");
  await expect(dialog()).toContainText("Nothing is broken.");
  await dialog().getByRole("button", { name: "Publish anyway" }).click();
  await expect(published()).toBeVisible();
  await expect(dialog()).toHaveCount(0);

  // The same warnings: published without asking.
  await own.reload();
  await own.getByRole("button", { name: "Publish", exact: true }).click();
  await expect(published()).toBeVisible();
  await expect(dialog()).toHaveCount(0);
});
