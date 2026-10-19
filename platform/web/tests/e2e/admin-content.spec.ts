import { readdir, readFile } from "node:fs/promises";
import { createServer, type Server } from "node:http";
import path from "node:path";
import { expect, test, type Page } from "@playwright/test";
import { E2E } from "../../playwright.config";

/**
 * The team runs the website texts, the emails, coupons and announcements
 * from the admin (roadmap 11.3, 11.4, 11.6 and 11.8), and clients see each
 * change: on yallapp.com.tr, in their inbox, at the card payment (a fake
 * iyzico here) and on their dashboard.
 */
test.describe.configure({ mode: "serial" });

const suffix = Date.now().toString(36);
const client = { name: "Willow Academy", email: `willow-${suffix}@academy.test`, password: "willow-strong-password-1" };
const payments = new Map<string, { callbackUrl: string; basketId: string; price: string }>();
let server: Server;
let admin: Page;
let own: Page;

interface SentMail {
  to: string;
  subject: string;
  text: string;
  html?: string;
  sentAt: string;
}

/** The emails the server sent to this address, oldest first (YALLAPP_MAIL_DIR). */
async function mailsTo(email: string): Promise<SentMail[]> {
  const dir = path.resolve(E2E.mailDir);
  const files = await readdir(dir).catch(() => [] as string[]);
  const mails = await Promise.all(files.map(async (f) => JSON.parse(await readFile(path.join(dir, f), "utf8")) as SentMail));
  return mails.filter((m) => m.to === email).sort((a, b) => a.sentAt.localeCompare(b.sentAt));
}

test.beforeAll(async ({ browser }) => {
  const base = `http://localhost:${E2E.iyzicoPort}`;
  server = createServer((request, response) => {
    let body = "";
    request.on("data", (chunk: Buffer) => (body += chunk.toString()));
    request.on("end", () => {
      const url = new URL(request.url ?? "/", base);
      const send = (json: unknown) => response.writeHead(200, { "content-type": "application/json" }).end(JSON.stringify(json));
      if (url.pathname === "/payment/bin/check") return send({ status: "success" });
      if (url.pathname.endsWith("/checkoutform/initialize/auth/ecom")) {
        const input = JSON.parse(body) as { callbackUrl: string; basketId: string; price: string };
        const token = `coupon-iyzi-${payments.size + 1}`;
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

  // One sign-in for the whole file: sign-ins are rate limited per email.
  admin = await browser.newPage();
  await admin.goto("/sign-in");
  await admin.getByLabel("Email").fill(E2E.contentAdminEmail);
  await admin.getByLabel("Password", { exact: true }).fill(E2E.adminPassword);
  await admin.getByRole("button", { name: "Sign in" }).click();
  await admin.waitForURL((url) => url.pathname.startsWith("/admin"));

  // The team adds the client (sign-ups are rate limited per address, and the suite has many),
  // and the client sets their password from the "Set your password" email.
  await admin.goto("/admin?add=1");
  const panel = admin.getByRole("complementary");
  await panel.getByLabel("Full name").fill(client.name);
  await panel.getByLabel("Email").fill(client.email);
  await panel.getByLabel("WhatsApp number").fill("+90 544 000 00 31");
  await panel.getByLabel("Website (optional)").fill(`https://willow-${suffix}.academy.test`);
  await panel.getByRole("button", { name: "Add client" }).click();
  await expect(admin).toHaveURL(/done=added/);
  // The first email of a run can take a few seconds on a busy machine.
  await expect
    .poll(async () => (await mailsTo(client.email)).map((m) => m.subject), { timeout: 15_000 })
    .toContain("Set your Yallapp password");
  const link = /https?:\/\/\S+\/reset-password\?token=\S+/.exec((await mailsTo(client.email))[0]!.text)![0];

  own = await browser.newPage();
  await own.goto(link);
  await own.getByLabel("New password", { exact: true }).fill(client.password);
  await own.getByLabel("Repeat the new password").fill(client.password);
  await own.getByRole("button", { name: "Save password and sign in" }).click();
  await expect(own).toHaveURL(/\/pending$/);
});

test.afterAll(async () => {
  await own.close();
  await admin.close();
  await new Promise((resolve) => server.close(resolve));
});

test("the team changes the home page's title and it shows on yallapp.com.tr", async ({ page }) => {
  await admin.goto("/admin/content");
  await admin.getByRole("link", { name: "Home page", exact: true }).click();
  await expect(admin.getByRole("heading", { level: 1, name: "Home page" })).toBeVisible();
  await expect(admin.getByLabel("Title", { exact: true })).toHaveValue("Your business, as your own mobile app.");
  await admin.getByLabel("Title", { exact: true }).fill("Your academy, in your students' pockets.");
  await admin.getByRole("button", { name: "Save and publish" }).click();
  await expect(admin.getByText("Home page saved. It shows on the website now.")).toBeVisible();

  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1, name: "Your academy, in your students' pockets." })).toBeVisible();

  // A long text with a live preview: the FAQ.
  await admin.goto("/admin/content/faq");
  const entries = admin.getByLabel("Questions and answers", { exact: true });
  await entries.fill(`${await entries.inputValue()}\n### Is there a free trial?\n\nAsk us on **WhatsApp**.\n`);
  await expect(admin.getByRole("region", { name: "Preview of questions and answers" })).toContainText("Ask us on WhatsApp.");
  await admin.getByRole("button", { name: "Save and publish" }).click();
  await expect(admin.getByText("FAQ saved.")).toBeVisible();
  await page.goto("/faq");
  await page.getByText("Is there a free trial?").click();
  await expect(page.getByText("Ask us on WhatsApp.")).toBeVisible();

  // Back to the default texts, as the other checks expect them.
  for (const key of ["home", "faq"]) {
    await admin.goto(`/admin/content/${key}`);
    await admin.getByRole("button", { name: "Back to the default text" }).click();
    await expect(admin.getByText("Back to the default text. The website shows it now.")).toBeVisible();
  }
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1, name: "Your business, as your own mobile app." })).toBeVisible();
});

test("the team edits an email, and the test email and the client's email use it", async ({ page }) => {
  await admin.goto("/admin/emails");
  await admin.getByRole("link", { name: "Password reset" }).click();
  const subject = admin.getByLabel("Subject");
  await subject.fill("Choose a new Yallapp password, {{nmae}}");
  await admin.getByRole("button", { name: "Save email" }).click();
  await expect(admin.getByText("{{nmae}} isn't a placeholder of this email.").first()).toBeVisible();

  await subject.fill("Choose a new Yallapp password, {{name}}");
  await expect(admin.getByRole("region", { name: "Preview with sample values" })).toContainText("Choose a new Yallapp password, Ada Lovelace");
  await admin.getByRole("button", { name: "Save email" }).click();
  await expect(admin.getByText("Password reset saved.")).toBeVisible();

  await admin.getByRole("button", { name: "Send a test to me" }).click();
  await expect(admin.getByText(`Test email sent to ${E2E.contentAdminEmail}`)).toBeVisible();
  await expect.poll(async () => (await mailsTo(E2E.contentAdminEmail)).map((m) => m.subject)).toContain("[Test] Choose a new Yallapp password, Ada Lovelace");

  // What a client receives.
  await page.goto("/forgot-password");
  await page.getByLabel("Email").fill(client.email);
  await page.getByRole("button", { name: "Send reset link" }).click();
  await expect(page.getByText("If there's an account for this email")).toBeVisible();
  await expect.poll(async () => (await mailsTo(client.email)).map((m) => m.subject)).toContain(`Choose a new Yallapp password, ${client.name}`);
  const mail = (await mailsTo(client.email)).find((m) => m.subject.startsWith("Choose a new"))!;
  expect(mail.text).toContain(`Hello ${client.name},`);
  expect(mail.html).toContain("/reset-password?token=");

  await admin.getByRole("button", { name: "Back to the default text" }).click();
  await expect(admin.getByText("Back to the default text. The next email uses it.")).toBeVisible();
  await expect(admin.getByLabel("Subject")).toHaveValue("Reset your Yallapp password");
});

test("a coupon lowers the client's card payment", async () => {
  await admin.goto("/admin/settings");
  const iyzico = admin.getByRole("region", { name: "Yallapp's iyzico account" });
  await iyzico.getByLabel("API key").fill("sandbox-yallapp-api");
  await iyzico.getByLabel("Secret key").fill("sandbox-yallapp-secret");
  await iyzico.getByRole("button", { name: "Save keys" }).click();
  await expect(iyzico.getByText("iyzico account saved.")).toBeVisible();
  // 52 Plans through iyzico: it charges the dollar price (the same figure here).
  const billing = admin.getByRole("region", { name: "Yallapp's plan payments" });
  await billing.getByLabel("Gateway for plans").selectOption("iyzico");
  await billing.getByRole("button", { name: "Save plan payments" }).click();
  await expect(billing.getByText("Plans are paid through Yallapp's iyzico account.")).toBeVisible();
  await admin.goto("/admin/plans");
  const pro = admin.getByRole("region", { name: "Pro" });
  await pro.getByLabel("A price").check();
  await pro.getByLabel("Price in EGP").fill("4800");
  await pro.getByLabel("Price in USD (optional)").fill("4800");
  await pro.getByLabel("Billed").selectOption("12");
  await pro.getByRole("button", { name: "Save plan" }).click();
  await expect(pro.getByText("Pro saved.")).toBeVisible();

  const code = `SPRING${suffix.slice(-4).toUpperCase()}`;
  await admin.goto("/admin/coupons");
  await admin.getByRole("link", { name: "New coupon" }).click();
  await admin.getByLabel("Code").fill(code.toLowerCase());
  await admin.getByLabel("Percent off").fill("25");
  await admin.getByRole("button", { name: "Create coupon" }).click();
  await expect(admin.getByText("Coupon created.")).toBeVisible();
  await expect(admin.getByRole("heading", { level: 1 })).toContainText(code);
  const couponUrl = admin.url();

  await own.reload();
  await expect(own.getByRole("heading", { name: "Pay by card" })).toBeVisible();
  await own.getByLabel("City").fill("Izmir");
  await own.getByLabel("Billing address").fill("Kordon Boyu 5, Konak");
  await own.getByLabel("Coupon code").fill("NOT-A-COUPON");
  await own.getByRole("button", { name: "Apply" }).click();
  await expect(own.getByText("This coupon code isn't valid.")).toBeVisible();
  await own.getByLabel("Coupon code").fill(code.toLowerCase());
  await own.getByRole("button", { name: "Apply" }).click();
  await expect(own.getByText("Coupon applied. The price below is what you pay.")).toBeVisible();
  await expect(own.getByText("$3,600")).toBeVisible();
  // Applying the coupon keeps the address.
  await expect(own.getByLabel("City")).toHaveValue("Izmir");
  await own.getByRole("button", { name: "Pay and activate" }).click();
  await expect(own.getByText("Total 3600.00")).toBeVisible();
  await own.getByRole("button", { name: "Pay with test card" }).click();
  await expect(own).toHaveURL(/\/dashboard\/license\?payment=paid$/);
  await expect(own.getByRole("status")).toContainText("Payment received.");

  await admin.goto(couponUrl);
  const uses = admin.getByRole("region", { name: "Uses" });
  await expect(uses.getByRole("row", { name: new RegExp(client.name) })).toContainText("Used");
  await expect(uses.getByRole("row", { name: new RegExp(client.name) })).toContainText("$3,600");
  await admin.goto("/admin/payments");
  await expect(admin.getByRole("row", { name: new RegExp(client.name) })).toContainText(`$3,600Coupon ${code}, $1,200 off`);

  // The settings go back for the other checks.
  await admin.goto(couponUrl);
  await admin.getByRole("button", { name: "Turn off" }).click();
  await expect(admin.getByText("Coupon turned off.")).toBeVisible();
  await admin.goto("/admin/plans");
  await admin.getByRole("region", { name: "Pro" }).getByRole("button", { name: "Back to the default plan" }).click();
  await admin.goto("/admin/settings");
  const billingBack = admin.getByRole("region", { name: "Yallapp's plan payments" });
  await billingBack.getByLabel("Gateway for plans").selectOption("kashier");
  await billingBack.getByRole("button", { name: "Save plan payments" }).click();
  await expect(billingBack.getByText(/Plans are paid through Yallapp's Kashier account\./)).toBeVisible();
  const keys = admin.getByRole("region", { name: "Yallapp's iyzico account" });
  await keys.getByRole("button", { name: "Remove keys" }).click();
  await expect(keys).toContainText("Now: not set.");
});

test("the team publishes an announcement; the client sees it, gets the email and dismisses it", async () => {
  // The client, active since the payment, picks their app type to reach the overview.
  await own.goto("/dashboard");
  await expect(own).toHaveURL(/\/dashboard\/app-type$/);
  await own.getByRole("button", { name: "Continue" }).click();
  await expect(own.getByRole("heading", { name: "Website" })).toBeVisible();

  const title = `Planned maintenance ${suffix}`;
  await admin.goto("/admin/announcements");
  await admin.getByRole("link", { name: "New announcement" }).click();
  await admin.getByLabel("Title", { exact: true }).fill(title);
  await admin.getByLabel("Message", { exact: true }).fill("Builds pause tonight from **22:00** to 23:00 UTC.");
  await expect(admin.getByRole("region", { name: "Preview of the message" })).toContainText("Builds pause tonight from 22:00 to 23:00 UTC.");
  await admin.getByRole("radio", { name: "Clients in chosen states" }).check();
  await admin.getByRole("checkbox", { name: "Active", exact: true }).check();
  await admin.getByLabel("Style").selectOption("warning");
  await admin.getByLabel("Link", { exact: true }).fill("/dashboard/builds");
  await admin.getByLabel("Link text").fill("See your builds");
  await admin.getByLabel("Also email it to these clients now").check();
  await admin.getByRole("button", { name: "Publish announcement" }).click();
  await expect(admin.getByText(/Announcement published and emailed to \d+ clients?\./)).toBeVisible();
  const announcementUrl = admin.url();
  await expect.poll(async () => (await mailsTo(client.email)).map((m) => m.subject)).toContain(title);
  const mail = (await mailsTo(client.email)).find((m) => m.subject === title)!;
  expect(mail.html).toContain("<strong>22:00</strong>");

  await own.goto("/dashboard");
  const banner = own.getByRole("region", { name: `Announcement: ${title}` });
  await expect(banner).toContainText("Builds pause tonight from 22:00 to 23:00 UTC.");
  await expect(banner.getByRole("link", { name: "See your builds" })).toHaveAttribute("href", "/dashboard/builds");
  await banner.getByRole("button", { name: `Dismiss ${title}` }).click();
  await expect(banner).toHaveCount(0);
  await own.reload();
  await expect(own.getByRole("region", { name: `Announcement: ${title}` })).toHaveCount(0);
  // 57 Closed on the overview, still on the full list behind the bell.
  await own.getByRole("link", { name: "Updates from Yallapp", exact: true }).click();
  await expect(own.getByRole("article", { name: title })).toContainText("Builds pause tonight from 22:00 to 23:00 UTC.");

  await admin.goto(announcementUrl);
  await admin.getByRole("button", { name: "Delete" }).click();
  await expect(admin.getByText("Announcement deleted.")).toBeVisible();
});
