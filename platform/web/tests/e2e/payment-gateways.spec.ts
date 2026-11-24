import { expect, test, type Page } from "@playwright/test";
import { E2E } from "../../playwright.config";
import { startFakeStripe, type FakeServer } from "./fake-stripe-paypal-servers";

/**
 * 132.30–132.36 A Studio project's owner sets up their own Stripe on the
 * Payments page (/studio/project/payments): Stripe's guide and webhook,
 * both keys of one mode, "Test connection" item by item (a fake Stripe
 * answers), the same page in Egyptian Arabic, and the test's limit. Every
 * key here is made up.
 */
test.describe.configure({ mode: "serial" });
// Its own address, so its sign-up and sign-in don't count against the other specs' per-IP limits.
const extraHTTPHeaders = { "x-forwarded-for": "198.51.100.132" };
test.use({ extraHTTPHeaders });

const suffix = Date.now().toString(36);
const owner = { name: "Lotus Gifts", email: `lotus-${suffix}@studio.test`, password: "lotus-gifts-strong-password-1" };
let stripe: FakeServer;
let own: Page;
// The limit on tests (src/lib/rate-limit.ts, gatewayTest) counts in fixed ten-minute windows aligned to the clock,
// so the window each earlier test ran in is kept: a window that ends between them and the limit's test empties the count.
const TEST_WINDOW_MS = 10 * 60 * 1000;
const windowNow = () => Math.floor(Date.now() / TEST_WINDOW_MS);
const testedIn: number[] = [];

test.beforeAll(async ({ browser }) => {
  stripe = await startFakeStripe(E2E.stripePort, { accountName: "Lotus Gifts" });
  own = await browser.newPage({ extraHTTPHeaders });
  await own.goto("/sign-up");
  await own.getByLabel("Full name").fill(owner.name);
  await own.getByLabel("Email").fill(owner.email);
  await own.getByLabel("WhatsApp number").fill("+20 100 000 0132");
  await own.getByLabel("Your website (optional)").fill(`https://lotus-${suffix}.studio.test`);
  await own.getByLabel("Password", { exact: true }).fill(owner.password);
  await own.getByRole("checkbox").check();
  await own.getByRole("button", { name: "Create account" }).click();
  await expect(own).toHaveURL(/\/start$/);

  const admin = await browser.newPage({ extraHTTPHeaders });
  await admin.goto("/sign-in");
  await admin.getByLabel("Email").fill(E2E.gatewaysAdminEmail);
  await admin.getByLabel("Password", { exact: true }).fill(E2E.adminPassword);
  await admin.getByRole("button", { name: "Sign in" }).click();
  await admin.waitForURL((url) => url.pathname.startsWith("/admin"));
  await admin.goto(`/admin?q=${encodeURIComponent(owner.email)}`);
  await admin.getByRole("link", { name: `Activate ${owner.name}` }).click();
  await admin.getByRole("complementary").getByRole("button", { name: "Activate & send license" }).click();
  await expect(admin.getByRole("status")).toContainText("Activated");
  await admin.close();

  await own.goto("/studio/new");
  await own.getByRole("radio", { name: /^Store( |$)/ }).check();
  await own.getByLabel("Project name").fill("Lotus Gifts");
  await own.getByRole("button", { name: "Next" }).click();
  await own.getByRole("radio", { name: "Blank page" }).click();
  await own.getByRole("button", { name: "Next" }).click();
  await expect(own).toHaveURL(/\/studio\/project$/);
});

test.afterAll(async () => {
  await own.close();
  await stripe.close();
});

test("a Studio project sets up Stripe on its Payments page and tests it", async () => {
  await own.goto("/studio/project/payments");
  await expect(own.getByRole("heading", { name: "Payments", level: 1 })).toBeVisible();
  // The dashboard's address leads to the same page in Studio's frame.
  await own.goto("/dashboard/payments");
  await expect(own).toHaveURL(/\/studio\/project\/payments$/);
  await expect(own.getByRole("region", { name: "Bank transfer and your own method" })).toBeVisible();
  const payments = own.getByRole("region", { name: "Card payments" });
  // 132.180 Nothing connected yet: the gateway's keys open from its row.
  await payments.getByRole("button", { name: "Connect", exact: true }).click();
  await payments.locator('[data-gateway="stripe"]').click();
  await expect(payments.getByText("How to set up Stripe")).toBeVisible();
  // Only Stripe's own guides, on docs.stripe.com.
  for (const href of await payments.getByRole("link").evaluateAll((links) => links.map((a) => (a as HTMLAnchorElement).href))) expect(href).toMatch(/^https:\/\/docs\.stripe\.com\//);
  const webhookUrl = await payments.getByLabel("Endpoint URL").inputValue();
  expect(webhookUrl).toMatch(/\/api\/pay\/stripe\/webhook\/[0-9a-f-]{36}$/);

  // Nothing typed, nothing saved: the test asks for the keys.
  await payments.getByRole("button", { name: "Test connection" }).click();
  testedIn.push(windowNow());
  const results = payments.getByTestId("gateway-test-results");
  await expect(results).toContainText("Paste your Stripe keys first, then test.");

  await payments.getByLabel("Publishable key").fill("pk_test_51LotusGiftsKey");
  await payments.getByLabel("Secret key").fill("sk_test_51LotusGiftsKey");
  await payments.getByLabel("Webhook signing secret").fill("whsec_LotusGiftsSigningSecret01");
  stripe.endpoints!.push({ url: webhookUrl, status: "enabled", enabled_events: ["checkout.session.completed"] });
  await payments.getByRole("checkbox", { name: /Also make a 0.50 USD test payment/ }).check();
  await payments.getByRole("button", { name: "Test connection" }).click();
  testedIn.push(windowNow());
  await expect(results).toContainText("Stripe account: Lotus Gifts · AE.");
  await expect(results).toContainText("Signing secret: it looks right (whsec_…).");
  await expect(results).toContainText("Your webhook endpoint doesn't send checkout.session.async_payment_succeeded and payment_intent.succeeded. Add them to the endpoint in Stripe.");
  await expect(results).toContainText("Webhook: not received yet. It comes with the next payment.");
  await expect(results).toContainText(/Test payment made and cancelled \(pi_test_\w+\)/);
  await expect(results.getByText("Test mode", { exact: true })).toBeVisible();
  // Tested, not saved.
  await expect(payments.getByTestId("gateway-saved")).toHaveCount(0);

  await payments.getByRole("button", { name: "Save keys" }).click();
  await expect(payments.getByText("Stripe keys saved.")).toBeVisible();
  await expect(payments.getByTestId("gateway-saved")).toContainText("Saved: Stripe");
  await expect(own.locator("body")).not.toContainText("sk_test_51LotusGiftsKey");
  await expect(own.locator("body")).not.toContainText("whsec_LotusGiftsSigningSecret01");
});

test("the page and the test's results in Egyptian Arabic", async () => {
  await own.context().addCookies([{ name: "yallapp_lang", value: "ar", url: E2E.baseURL }]);
  await own.goto("/studio/project/payments");
  await expect(own.getByRole("heading", { name: "المدفوعات", level: 1 })).toBeVisible();
  // 155 The domain was registered with the keys saved: Apple Pay and Google Pay ready, in Egyptian Arabic.
  await expect(own.locator("[data-wallets]")).toContainText("Apple Pay وGoogle Pay: جاهزين.");
  // 132.145 Connected, the gateway's keys open from its row.
  await own.locator("[data-gateway-edit]").click();
  const test = own.getByRole("button", { name: "جرّب الاتصال" });
  await test.click();
  testedIn.push(windowNow());
  const results = own.getByTestId("gateway-test-results");
  await expect(results).toContainText("نتيجة التجربة");
  await expect(results).toContainText("حساب Stripe: Lotus Gifts · AE.");
  await expect(results).toContainText("الوضع: تجربة. مفيش فلوس حقيقية بتتحرك.");
  await own.context().clearCookies({ name: "yallapp_lang" });
});

test("ten tests every ten minutes, then a plain message", async () => {
  test.setTimeout(90_000);
  // Not across a window's end while it counts: with under 20 s of this window left, it starts in the next one.
  const left = TEST_WINDOW_MS - (Date.now() % TEST_WINDOW_MS);
  if (left < 20_000) await own.waitForTimeout(left + 1_000);
  const earlier = testedIn.filter((w) => w === windowNow()).length;
  await own.goto("/studio/project/payments");
  const payments = own.getByRole("region", { name: "Card payments" });
  await payments.getByRole("button", { name: "Edit" }).click();
  const button = payments.getByRole("button", { name: /^(Test connection|Testing…)$/ });
  const limited = payments.getByText(/^Too many tests\. Try again in \d+ minutes\.$/);
  // Three tests so far (in this window, or none when a new window began since); the eleventh in ten minutes is refused.
  let ran = 0;
  for (; ran < 12 && !(await limited.isVisible()); ran++) {
    await button.click();
    await expect(button).toHaveText(/Test connection$/);
  }
  await expect(limited).toBeVisible();
  // `ran` counts the refused click too: the tests left in the window, plus one.
  if (earlier === 0) {
    // A new window since the earlier tests: all ten, then the eleventh refused.
    expect(ran).toBe(11);
  } else {
    // 7–9 with all three earlier tests in this window (11 − 3, give or take the one that sent no keys); fewer when a window ended between them.
    expect(ran).toBeGreaterThanOrEqual(10 - earlier);
    expect(ran).toBeLessThanOrEqual(12 - earlier);
  }
});
