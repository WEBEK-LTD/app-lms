import { expect, test, type APIRequestContext, type Page } from "@playwright/test";
import { E2E } from "../../playwright.config";

/**
 * 115.50–115.53 A marketplace complaint end to end, on Studio's demo Zad, in
 * English and then in Arabic: the demo number opens a complaint on its order
 * on the way (from placing it, D3); support finds it in the queue, puts a
 * ready reply into the box (it isn't sent by itself) and sends it; decides a
 * part refund to the wallet on the complaint's page; the customer reads the
 * answer with the support person's first name, the decision and the wallet's
 * credit, and can still write without reopening it. The second ticket (in
 * Arabic) is the one more allowed on the order after a decision.
 */
test.describe.configure({ mode: "serial", timeout: 120_000 });

const DEMO = { countryCode: "+1", number: "2025550123", code: "246810" };
const DEVICE = { id: "e2e-complaints-install", platform: "android", name: "Pixel 8", app_version: "1.0.0" };
const ip = { "x-forwarded-for": "198.51.100.181" };
let admin: Page;
let appId = "";
let token = "";
let orderId = 0;
const problems: string[] = [];

async function customer(request: APIRequestContext) {
  const auth = { ...ip, authorization: `Bearer ${token}` };
  return {
    get: async (path: string) => {
      const r = await request.get(`/api/app/${appId}${path}`, { headers: auth });
      expect(r.status(), path).toBe(200);
      return r.json();
    },
    post: (path: string, data: unknown) => request.post(`/api/app/${appId}${path}`, { headers: auth, data }),
  };
}

const minor = (money: { amount: string }) => Math.round(Number(money.amount) * 100);

/** With COMPLAINTS_SHOTS=<folder>, the queue and the page as the designs (11, 12) show them, at 1440 × 1024, light and dark. */
const SHOTS = process.env.COMPLAINTS_SHOTS ?? "";
async function shot(p: Page, name: string): Promise<void> {
  if (!SHOTS) return;
  await p.setViewportSize({ width: 1440, height: 1024 });
  for (const scheme of ["light", "dark"] as const) {
    await p.emulateMedia({ colorScheme: scheme });
    await p.screenshot({ path: `${SHOTS}/${name}-${scheme}.png`, fullPage: true });
  }
  await p.emulateMedia({ colorScheme: "light" });
}

test.beforeAll(async ({ browser, request }) => {
  admin = await browser.newPage({ extraHTTPHeaders: { "x-forwarded-for": "203.0.113.181" } });
  admin.on("pageerror", (e) => problems.push(`pageerror on ${admin.url()}: ${e.message}`));
  admin.on("console", (m) => {
    if (m.type() === "error" && /\/dashboard\/market\/complaints/.test(admin.url())) problems.push(`console on ${admin.url()}: ${m.text()}`);
  });
  await admin.goto("/sign-in");
  await admin.getByLabel("Email").fill(E2E.complaintsAdminEmail);
  await admin.getByLabel("Password", { exact: true }).fill(E2E.adminPassword);
  await admin.getByRole("button", { name: "Sign in" }).click();
  await admin.waitForURL((url) => url.pathname.startsWith("/admin"));
  await admin.goto("/admin/demos?family=studio");
  const create = admin.getByRole("button", { name: /Create Studio's demo apps|Refresh all of Studio's demo apps/ });
  admin.on("dialog", (d) => void d.accept());
  await create.click();
  await expect(admin.getByRole("status")).toContainText("Yallapp Studio's demos are created and up to date.", { timeout: 60_000 });
  appId = await admin.locator(`form:not(:has(input[name="variant"])):has(button:has-text("Start a build of Zad")) input[name="appId"]`).first().inputValue();
  expect(appId).toMatch(/^[0-9a-f-]{36}$/);

  // The demo number signs in to Zad's app (the public demo code).
  const asked = await request.post(`/api/app/${appId}/auth/otp/request`, { data: { country_code: DEMO.countryCode, phone: DEMO.number }, headers: ip });
  expect(asked.status()).toBe(200);
  const verified = await request.post(`/api/app/${appId}/auth/otp/verify`, { data: { request_id: (await asked.json()).request_id, code: DEMO.code, device: DEVICE }, headers: ip });
  expect(verified.status()).toBe(200);
  token = (await verified.json()).access_token;
  expect(token).toBeTruthy();

  // Its pizza on the way: complaints are open from placing the order.
  const me = await customer(request);
  const orders = (await me.get("/me/market-orders?active=true")).items as { id: number; status: string; can_complain: boolean }[];
  const moving = orders.find((o) => o.status === "on_the_way" && o.can_complain);
  expect(moving, JSON.stringify(orders.map((o) => [o.id, o.status, o.can_complain]))).toBeTruthy();
  orderId = moving!.id;

  // Into Zad's dashboard, as the team.
  await admin.goto("/admin/demos?family=studio");
  await admin.locator("form").filter({ has: admin.getByRole("button", { name: "Open in the dashboard (Zad)" }) }).getByRole("button").click();
  await admin.waitForURL((url) => !url.pathname.startsWith("/admin"));
});

test.afterAll(async () => {
  // Back to English for the next specs of this admin.
  await admin?.goto("/dashboard/market/complaints").catch(() => undefined);
  await admin?.locator("[data-dashboard-languages]").getByRole("button", { name: "English" }).click().catch(() => undefined);
  await admin?.close();
  expect(problems).toEqual([]);
});

const LANG = {
  en: {
    switch: "English",
    text: "The pizza came cold and the box was crushed.",
    waiting: "Waiting on you",
    reply: "We're sorry about this. We're looking into it now and will come back to you shortly.",
    send: "Send",
    part: "Part refund",
    wallet: "To their wallet",
    decide: "Decide",
    decided: "Part refund",
    amount: "Amount (EGP)",
  },
  ar: {
    switch: "العربية",
    text: "وصلت البيتزا باردة والعلبة مهروسة.",
    waiting: "بانتظار ردك",
    reply: "نعتذر عن ذلك. نراجع الأمر الآن وسنعود إليك قريبًا.",
    send: "إرسال",
    part: "استرداد جزئي",
    wallet: "محفظة العميل",
    decide: "اعتماد القرار",
    decided: "استرداد جزئي",
    amount: "المبلغ (EGP)",
  },
} as const;

for (const lang of ["en", "ar"] as const) {
  const L = LANG[lang];

  test(`${lang}: open a complaint, support replies, a wallet decision, and the customer sees it`, async ({ request }) => {
    const me = await customer(request);
    const walletBefore = minor((await me.get("/me/wallet")).balance);

    // 1. The customer opens it, about the whole order (no items).
    const opened = await me.post(`/me/market-orders/${orderId}/complaints`, { reason: "quality", text: L.text, line_ids: [] });
    expect(opened.status(), await opened.text()).toBe(201);
    const complaint = await opened.json();
    expect(complaint).toMatchObject({ status: "open", line_ids: [], decision: null, can_open_another: false });
    // A second one at once is refused: one at a time.
    expect((await (await me.post(`/me/market-orders/${orderId}/complaints`, { reason: "late", text: "And it was late too." })).json()).code).toBe("complaint_open");

    // 2. Support finds it waiting, chooses a ready reply (into the box only), and sends it.
    await admin.goto("/dashboard/market/complaints");
    await admin.locator("[data-dashboard-languages]").getByRole("button", { name: L.switch }).click();
    await expect(admin.locator("html")).toHaveAttribute("lang", lang);
    await expect(admin.getByRole("link", { name: new RegExp(L.waiting) }).first()).toHaveAttribute("aria-current", "page");
    await admin.getByRole("link", { name: complaint.reference, exact: true }).click();
    await expect(admin.getByRole("heading", { name: new RegExp(complaint.reference) })).toBeVisible();
    await admin.getByRole("button", { name: L.reply }).click();
    await expect(admin.getByRole("textbox", { name: lang === "en" ? "Write to the customer…" : "اكتب للعميل…" })).toHaveValue(L.reply);
    expect((await me.get(`/me/complaints/${complaint.id}`)).messages).toEqual([]);
    await shot(admin, `11-dashboard-complaints-queue-${lang}`);
    await admin.getByRole("button", { name: L.send, exact: true }).click();
    await expect.poll(async () => (await me.get(`/me/complaints/${complaint.id}`)).messages.filter((m: { kind: string }) => m.kind === "message").length).toBe(1);
    const answered = await me.get(`/me/complaints/${complaint.id}`);
    const said = answered.messages.find((m: { kind: string }) => m.kind === "message");
    expect(said).toMatchObject({ from: "support", text: L.reply });
    expect(typeof said.agent).toBe("string");
    expect(answered.support_agent).toBe(said.agent);
    expect(JSON.stringify(answered)).not.toContain("@yallapp.test");
    expect(answered.status).toBe("waiting_for_customer");

    // 3. The decision on its page: EGP 10.00 back to the wallet.
    await admin.goto(`/dashboard/market/complaints/${complaint.id}`);
    await admin.getByText(L.part, { exact: true }).click();
    await admin.getByLabel(L.amount).fill("10.00");
    await admin.getByText(L.wallet, { exact: true }).click();
    await shot(admin, `12-dashboard-complaint-${lang}`);
    await admin.getByRole("button", { name: L.decide }).click();
    await expect(admin.locator("#h-decision").locator("..")).toContainText(L.decided);

    // 4. The customer sees it: the decision, the support person's name and the wallet's credit.
    const decided = await me.get(`/me/complaints/${complaint.id}`);
    expect(decided).toMatchObject({ status: "resolved", decision: { outcome: "partial_refund", to: "wallet", amount: { amount: "10.00" } } });
    expect(decided.decision.agent).toBe(said.agent);
    expect(minor((await me.get("/me/wallet")).balance)).toBe(walletBefore + 1000);
    // The chat stays open and the decision isn't reopened.
    const after = await me.post(`/me/complaints/${complaint.id}/messages`, { text: lang === "en" ? "Thank you!" : "شكرًا لكم!" });
    expect(after.status()).toBe(201);
    expect((await after.json()).status).toBe("resolved");
    // One more complaint is allowed on the order after the first decision, and then no more.
    if (lang === "en") expect(decided.can_open_another).toBe(true);
    else {
      expect(decided.can_open_another).toBe(false);
      expect((await (await me.post(`/me/market-orders/${orderId}/complaints`, { reason: "late", text: "Late as well." })).json()).code).toBe("complaint_limit");
    }
  });
}
