import { createServer, type Server } from "node:http";
import { expect, test, type Page } from "@playwright/test";
import { E2E } from "../../playwright.config";
import { solidPng } from "./png";

/**
 * Several apps per account (roadmap 12): a client adds a second app, the team
 * activates only that one on another plan, each app has its own license key
 * and plan, the switcher picks the app the dashboard edits, and a card
 * payment for one app leaves the other as it was.
 */
test.describe.configure({ mode: "serial" });

const suffix = Date.now().toString(36);
const client = { name: "Maple Studio", email: `maple-${suffix}@studio.test`, password: "maple-strong-password-1" };
const extraHTTPHeaders = { "x-forwarded-for": "203.0.113.121" };
const payments = new Map<string, { callbackUrl: string; basketId: string; price: string }>();
let server: Server;
let admin: Page;
let own: Page;
let clientUrl = "";
let storeKey = "";

test.beforeAll(async ({ browser }) => {
  const base = `http://localhost:${E2E.iyzicoPort}`;
  server = createServer((request, response) => {
    let body = "";
    request.on("data", (chunk: Buffer) => (body += chunk.toString()));
    request.on("end", () => {
      const url = new URL(request.url ?? "/", base);
      const send = (json: unknown) => response.writeHead(200, { "content-type": "application/json" }).end(JSON.stringify(json));
      // Checking Yallapp's keys in Settings.
      if (url.pathname === "/payment/bin/check") return send({ status: "success" });
      if (url.pathname.endsWith("/checkoutform/initialize/auth/ecom")) {
        const input = JSON.parse(body) as { callbackUrl: string; basketId: string; price: string };
        const token = `apps-iyzi-${payments.size + 1}`;
        payments.set(token, input);
        return send({ status: "success", token, paymentPageUrl: `${base}/pay?token=${token}` });
      }
      if (url.pathname.endsWith("/checkoutform/auth/ecom/detail")) {
        const { token } = JSON.parse(body) as { token: string };
        const payment = payments.get(token)!;
        return send({ status: "success", paymentStatus: "SUCCESS", paymentId: "6160", paidPrice: Number(payment.price), basketId: payment.basketId });
      }
      if (url.pathname === "/pay") {
        const token = url.searchParams.get("token")!;
        response.writeHead(200, { "content-type": "text/html" }).end(
          `<!doctype html><title>iyzico</title><p>Total ${payments.get(token)!.price}</p><form method="post" action="${payments.get(token)!.callbackUrl}"><input type="hidden" name="token" value="${token}"><button>Pay with test card</button></form>`,
        );
        return;
      }
      response.writeHead(404).end();
    });
  });
  await new Promise<void>((resolve) => server.listen(E2E.iyzicoPort, resolve));

  own = await browser.newPage({ extraHTTPHeaders });
  await own.goto("/sign-up");
  await own.getByLabel("Full name").fill(client.name);
  await own.getByLabel("Email").fill(client.email);
  await own.getByLabel("WhatsApp number").fill("+90 544 000 00 41");
  await own.getByLabel("Your website (optional)").fill(`https://maple-${suffix}.studio.test`);
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
});

test.afterAll(async () => {
  await own.close();
  await admin.close();
  await new Promise((resolve) => server.close(resolve));
});

/** The Website step without a website, then the Branding step with a name and an icon. */
async function setUp(type: "Store" | "Bookings", name: string) {
  await own.getByText("I don't have a website").click();
  await own.getByRole("button", { name: "Save & continue" }).click();
  await expect(own.getByRole("heading", { name: "Branding" })).toBeVisible();
  await own.getByLabel("App name").fill(name);
  await own.getByLabel("Name under the app icon").fill(name.split(" ")[1]!);
  await own.locator("#upload-icon").setInputFiles({ name: "icon.png", mimeType: "image/png", buffer: solidPng(1024, 1024, type === "Store" ? [200, 60, 40] : [40, 90, 200]) });
  await expect(own.getByText("Replace file")).toBeVisible();
  await own.getByRole("button", { name: "Save & continue" }).click();
  await expect(own.getByLabel("Android package name")).toBeVisible();
}

const switcher = () => own.getByLabel("Current app");

async function switchTo(label: string) {
  // Choosing an app sends the switcher form at once; wait for the server to remember the choice.
  await Promise.all([own.waitForResponse((r) => r.request().method() === "POST"), switcher().selectOption({ label })]);
  await own.waitForLoadState();
  await expect(switcher().locator("option:checked")).toHaveText(label);
}

/** The current app's plan on the Plan page (75: apps without WordPress have no license key to show). */
const planRegion = () => own.getByRole("region", { name: "Plan", exact: true });

/** The "Active until" date of the current app on the Plan page. */
async function activeUntil(): Promise<string> {
  await own.goto("/dashboard/license");
  const value = planRegion().locator("dt", { hasText: "Active until" }).locator("xpath=following-sibling::dd[1]");
  return (await value.textContent())!.trim();
}

test("the team activates the account, and the client sets up their first app", async () => {
  await admin.goto(`/admin/clients?q=${encodeURIComponent(client.email)}`);
  await admin.getByRole("link", { name: `Activate ${client.name}` }).click();
  await admin.getByRole("complementary").getByRole("button", { name: "Activate & send license" }).click();
  await expect(admin.getByRole("status")).toContainText("Activated");

  // Signed in since sign-up: the activated account goes to its first app's type.
  await own.goto("/pending");
  await expect(own).toHaveURL(/\/dashboard\/app-type$/);
  await own.getByText("Store", { exact: true }).click();
  await own.getByRole("button", { name: "Continue" }).click();
  await setUp("Store", "Maple Store");

  await own.goto("/dashboard/license");
  await expect(planRegion()).toContainText("Pro");
  await expect(own.getByLabel("License key")).toHaveCount(0);
  await expect(switcher().locator("option:checked")).toHaveText("Maple Store (Store · Active)");
});

test("the client adds a second app, which waits for activation", async () => {
  await own.getByRole("link", { name: "Add an app" }).click();
  await expect(own.getByRole("heading", { name: "Add an app" })).toBeVisible();
  await own.getByText("Bookings", { exact: true }).click();
  await own.getByRole("button", { name: "Add the app" }).click();
  await expect(own).toHaveURL(/\/dashboard\/setup\?step=website$/);
  await setUp("Bookings", "Maple Bookings");

  await expect(switcher().locator("option:checked")).toHaveText("Maple Bookings (Bookings · Pending activation)");
  await expect(switcher().locator("option")).toHaveText(["Maple Store (Store · Active)", "Maple Bookings (Bookings · Pending activation)"]);
  await expect(own.getByRole("link", { name: "Services & team" })).toBeVisible();
  await expect(own.getByRole("link", { name: "Products", exact: true })).toHaveCount(0);

  await own.goto("/dashboard");
  await expect(own.getByText("Maple Bookings is waiting for activation.")).toBeVisible();
  await own.goto("/dashboard/license");
  await expect(own.getByText("This app isn't activated yet.")).toBeVisible();
  await expect(own.getByLabel("License key")).toHaveCount(0);
});

test("the switcher changes which app the dashboard edits", async () => {
  await own.goto("/dashboard/setup?step=branding");
  await expect(own.getByLabel("App name")).toHaveValue("Maple Bookings");
  await switchTo("Maple Store (Store · Active)");
  await own.goto("/dashboard/setup?step=branding");
  await expect(own.getByLabel("App name")).toHaveValue("Maple Store");
  await expect(own.getByRole("link", { name: "Products", exact: true })).toBeVisible();
  await own.getByLabel("App name").fill("Maple Store Online");
  await own.getByRole("button", { name: "Save & continue" }).click();
  await expect(own.getByLabel("Android package name")).toBeVisible();

  // The other app is unchanged.
  await switchTo("Maple Bookings (Bookings · Pending activation)");
  await own.goto("/dashboard/setup?step=branding");
  await expect(own.getByLabel("App name")).toHaveValue("Maple Bookings");
  await switchTo("Maple Store Online (Store · Active)");
});

test("the team activates only the second app, on another plan, from the client's page", async () => {
  await admin.goto(`/admin/clients?q=${encodeURIComponent(client.email)}`);
  await expect(admin.getByRole("row", { name: new RegExp(client.name) })).toContainText("2 apps");
  await admin.getByRole("link", { name: client.name, exact: true }).click();
  await admin.waitForURL(/\/admin\/clients\/[0-9a-f-]{36}$/);
  clientUrl = admin.url();
  const bookings = admin.getByRole("region", { name: "Maple Bookings" });
  const store = admin.getByRole("region", { name: "Maple Store Online" });
  await expect(bookings).toContainText("Pending activation");
  await expect(store.getByRole("region", { name: "Plan and license" })).toContainText("Pro until");
  // The team still sees every app's key.
  storeKey = (await store.getByRole("region", { name: "Plan and license" }).textContent())!.match(/YALL-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}/)![0];

  const plan = bookings.getByRole("region", { name: "Plan and license" });
  await plan.getByLabel("Plan").selectOption("starter");
  await plan.getByRole("button", { name: "Activate & send license" }).click();
  await expect(admin.getByRole("status")).toContainText("Activated");
  await expect(bookings.getByRole("region", { name: "Plan and license" })).toContainText("Starter until");
  await expect(store.getByRole("region", { name: "Plan and license" })).toContainText("Pro until");
  await expect(store.getByRole("region", { name: "Plan and license" })).toContainText(storeKey);
  const bookingsKey = (await bookings.getByRole("region", { name: "Plan and license" }).textContent())!.match(/YALL-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}/)![0];
  expect(bookingsKey).not.toBe(storeKey);
  await expect(admin.getByRole("region", { name: "Changes by the team" })).toContainText("(Maple Bookings)");
});

test("each app shows its own plan, and (75) no license key without WordPress", async () => {
  await own.goto("/dashboard/license");
  await expect(own.getByRole("heading", { level: 1 })).toHaveText("Plan");
  await expect(own.getByLabel("License key")).toHaveCount(0);
  await expect(planRegion()).toContainText("Pro");

  await switchTo("Maple Bookings (Bookings · Active)");
  await own.goto("/dashboard/license");
  await expect(own.getByLabel("License key")).toHaveCount(0);
  await expect(planRegion()).toContainText("Starter");
  await expect(planRegion()).toContainText("Maple Bookings");
});

test("a card payment for one app doesn't change the other", async () => {
  await admin.goto("/admin/settings");
  const iyzico = admin.getByRole("region", { name: "Yallapp's iyzico account" });
  await iyzico.getByLabel("API key").fill("sandbox-yallapp-api");
  await iyzico.getByLabel("Secret key").fill("sandbox-yallapp-secret");
  await iyzico.getByRole("button", { name: "Save keys" }).click();
  await expect(iyzico.getByText("iyzico account saved.")).toBeVisible();
  // 52 Plans through iyzico: it charges the dollar price.
  const billing = admin.getByRole("region", { name: "Yallapp's plan payments" });
  await billing.getByLabel("Gateway for plans").selectOption("iyzico");
  await billing.getByRole("button", { name: "Save plan payments" }).click();
  await expect(billing.getByText("Plans are paid through Yallapp's iyzico account.")).toBeVisible();
  await admin.goto("/admin/plans");
  const starter = admin.getByRole("region", { name: "Starter" });
  await starter.getByLabel("A price").check();
  await starter.getByLabel("Price in EGP").fill("300");
  await starter.getByLabel("Price in USD (optional)").fill("6");
  await starter.getByLabel("Billed").selectOption("1");
  await starter.getByRole("button", { name: "Save plan" }).click();
  await expect(starter.getByText("Starter saved.")).toBeVisible();

  // The other app's plan before the payment.
  await switchTo("Maple Store Online (Store · Active)");
  const storeUntil = await activeUntil();
  await switchTo("Maple Bookings (Bookings · Active)");
  const bookingsUntil = await activeUntil();

  await expect(own.getByRole("heading", { name: "Extend by card" })).toBeVisible();
  await own.getByLabel("City").fill("Izmir");
  await own.getByLabel("Billing address").fill("Kordon Boyu 5, Konak");
  await own.getByRole("button", { name: "Pay by card" }).click();
  await expect(own.getByText("Total 6.00")).toBeVisible();
  await own.getByRole("button", { name: "Pay with test card" }).click();
  await expect(own).toHaveURL(/\/dashboard\/license\?payment=paid$/);
  await expect(own.getByRole("status")).toContainText("Payment received.");
  await expect(planRegion()).toContainText("Maple Bookings");
  expect(await activeUntil()).not.toBe(bookingsUntil);

  await switchTo("Maple Store Online (Store · Active)");
  expect(await activeUntil()).toBe(storeUntil);
  await expect(own.getByLabel("License key")).toHaveCount(0);

  await admin.goto(clientUrl);
  await expect(admin.getByRole("region", { name: "Payments" })).toContainText("Maple Bookings");
  await expect(admin.getByRole("region", { name: "Maple Store Online" }).getByRole("region", { name: "Plan and license" })).toContainText("Pro until");
});

test("the team puts the settings back", async () => {
  await admin.goto("/admin/plans");
  await admin.getByRole("region", { name: "Starter" }).getByRole("button", { name: "Back to the default plan" }).click();
  await admin.goto("/admin/settings");
  const billing = admin.getByRole("region", { name: "Yallapp's plan payments" });
  await billing.getByLabel("Gateway for plans").selectOption("kashier");
  await billing.getByRole("button", { name: "Save plan payments" }).click();
  await expect(billing.getByText(/Plans are paid through Yallapp's Kashier account\./)).toBeVisible();
  const iyzico = admin.getByRole("region", { name: "Yallapp's iyzico account" });
  await iyzico.getByRole("button", { name: "Remove keys" }).click();
  await expect(iyzico).toContainText("Now: not set.");
});
