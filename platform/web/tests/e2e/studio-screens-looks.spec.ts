import { expect, test, type APIRequestContext, type Page } from "@playwright/test";
import { E2E } from "../../playwright.config";

/**
 * 132.9 Studio › Screens' sign-in looks and the account menu's tops as
 * pictures (roadmap 132): a flower shop starts from the Rose hour template
 * (its sign-in follows the petal system screens, on the template's photo).
 * Each look chosen marks its picture, changes the big preview at once, is
 * saved as the app reads it (`Config.screens`: the sign-in's style, and the
 * system screens' `sign_in` and `code` given their own or back to the
 * look) and is still chosen after a reload; each menu top likewise.
 */
test.describe.configure({ mode: "serial" });

const suffix = Date.now().toString(36);
const client = { name: "Leqaa Looks", email: `screens-looks-${suffix}@studio.test`, password: "leqaa-looks-strong-password-1" };
/** Its own address, so this spec's sign-up and sign-in don't count against the other specs' per-IP limits. */
const extraHTTPHeaders = { "x-forwarded-for": "198.51.100.214" };
let own: Page;
let api = "";
let previewToken = "";
const problems: string[] = [];

test.beforeAll(async ({ browser }) => {
  own = await (await browser.newContext({ extraHTTPHeaders, viewport: { width: 1360, height: 900 } })).newPage();
  own.on("pageerror", (e) => problems.push(`pageerror on ${own.url()}: ${e.message}`));
  own.on("console", (m) => {
    if (m.type() === "error" && !m.location().url.includes("/api/v1/fonts/") && !m.location().url.includes("/preview-app/") && !/Failed to load resource/.test(m.text())) problems.push(`error on ${own.url()}: ${m.text()}`);
  });
  await own.goto("/sign-up");
  await own.getByLabel("Full name").fill(client.name);
  await own.getByLabel("Email").fill(client.email);
  await own.getByLabel("WhatsApp number").fill("+20 100 000 0214");
  await own.getByLabel("Your website (optional)").fill(`https://screens-looks-${suffix}.studio.test`);
  await own.getByLabel("Password", { exact: true }).fill(client.password);
  await own.getByRole("checkbox").check();
  await own.getByRole("button", { name: "Create account" }).click();
  await expect(own).toHaveURL(/\/start$/);

  // The same team member as studio-setup.spec.ts and studio-nav.spec.ts: one sign-in each, under the limit per address.
  const admin = await browser.newPage({ extraHTTPHeaders });
  await admin.goto("/sign-in");
  await admin.getByLabel("Email").fill(E2E.studioSetupAdminEmail);
  await admin.getByLabel("Password", { exact: true }).fill(E2E.adminPassword);
  await admin.getByRole("button", { name: "Sign in" }).click();
  await admin.waitForURL((url) => url.pathname.startsWith("/admin"));
  await admin.goto(`/admin?q=${encodeURIComponent(client.email)}`);
  await admin.getByRole("link", { name: `Activate ${client.name}` }).click();
  await admin.getByRole("complementary").getByRole("button", { name: "Activate & send license" }).click();
  await expect(admin.getByRole("status")).toContainText("Activated");
  await admin.close();

  // A flower shop from the Rose hour template.
  await own.goto("/studio/new");
  await own.getByRole("radio", { name: /^Store( |$)/ }).first().check();
  await own.getByLabel("Project name").fill("Leqaa Looks");
  await own.getByRole("button", { name: "Next" }).click();
  const rose = own.getByRole("radio", { name: /Rose hour/ });
  if (await rose.count()) await rose.first().click();
  await own.getByRole("button", { name: "Next" }).click();
  await expect(own).toHaveURL(/\/studio\/project$/);
  // The app's address and the preview's token, to read what the app is served.
  await own.goto("/studio/project/setup?step=website");
  api = (await own.locator("code").filter({ hasText: "/api/app/" }).first().textContent())!.trim();
  await own.goto("/studio/project/preview?pages=draft");
  const src = (await own.locator("iframe[data-testid=app-preview]").getAttribute("src"))!;
  previewToken = new URL(src, E2E.baseURL).searchParams.get("token")!;
});

test.afterAll(async () => {
  await own.context().close();
});

interface Served {
  sign_in?: { style: string; image_url: string | null };
  account_menu?: { header: string };
  system?: { look: string; screens?: Record<string, string> };
}

/** `Config.screens` as the app gets it. */
async function served(request: APIRequestContext): Promise<Served> {
  const res = await request.get(`${api}/config?platform=android&app_version=1.0.0`, { headers: { "x-yallapp-preview": previewToken } });
  expect(res.status()).toBe(200);
  return ((await res.json()) as { screens?: Served }).screens ?? {};
}

const choice = (group: "sign-in" | "menu", value: string) => own.locator(`[data-${group === "sign-in" ? "sign-in" : "menu"}-looks] [data-look-choice="${value}"]`);
const preview = () => own.getByRole("complementary").getByTestId("sign-in-preview");
const menuPreview = () => own.getByRole("complementary").getByTestId("menu-preview");

async function save(): Promise<void> {
  await own.getByRole("button", { name: "Save", exact: true }).click();
  await expect(own.getByText(/^Saved\./)).toBeVisible();
}

test("every sign-in look: chosen, drawn, saved as the app reads it, and kept", async ({ request }) => {
  await own.goto("/studio/project/screens");
  // From the template: sign-in follows the system screens' petal look, on its photo.
  await expect(choice("sign-in", "system")).toHaveAttribute("data-checked", "");
  await expect(choice("sign-in", "system")).toContainText("As the system screens: Petal");
  await expect(preview()).toHaveAttribute("data-auth-look", "petal");
  // Every option is a picture: the look drawn as the app draws it, the photo looks on the template's photo.
  for (const style of ["classic", "photo", "card", "minimal", "premium"]) await expect(choice("sign-in", style).getByTestId("sign-in-preview")).toHaveAttribute("data-auth-style", style);
  await expect(choice("sign-in", "photo").locator("img")).toHaveCount(1);
  const before = await served(request);
  expect(before.system?.look).toBe("petal");
  expect(before.system?.screens?.sign_in).toBeUndefined();

  // Each one, with what the big preview shows and what the app is served.
  const looks: [string, string, (p: Served) => void][] = [
    ["photo", "[data-preview-form=over-photo]", (p) => expect(p.sign_in?.image_url).toMatch(/^https?:\/\//)],
    ["card", "[data-preview-form=card-under-photo]", (p) => expect(p.sign_in?.image_url).toMatch(/^https?:\/\//)],
    ["premium", "[data-preview-premium-card] [data-preview-button=premium]", () => undefined],
    ["minimal", "[data-preview-form=centred]", () => undefined],
    ["classic", "[data-preview-form=page]", () => undefined],
  ];
  for (const [style, drawn, check] of looks) {
    await choice("sign-in", style).click();
    await expect(choice("sign-in", style)).toHaveAttribute("data-checked", "");
    await expect(choice("sign-in", style).locator("input[type=radio]")).toBeChecked();
    await expect(own.locator("[data-sign-in-looks] [data-checked]")).toHaveCount(1);
    await expect(preview()).toHaveAttribute("data-auth-style", style);
    await expect(preview().locator(drawn)).toHaveCount(1);
    await save();
    const now = await served(request);
    expect(now.sign_in?.style, style).toBe(style);
    // Its own look: sign-in and the code screen leave the petal look; the account keeps it.
    expect(now.system).toEqual({ look: "petal", screens: { sign_in: "classic", code: "classic" } });
    check(now);
    await own.reload();
    await expect(choice("sign-in", style)).toHaveAttribute("data-checked", "");
    await expect(preview()).toHaveAttribute("data-auth-style", style);
  }

  // Back to the system screens' look: sign-in and the code screen follow it again.
  await choice("sign-in", "system").click();
  await expect(preview()).toHaveAttribute("data-auth-look", "petal");
  await save();
  expect((await served(request)).system).toEqual({ look: "petal" });
  await own.reload();
  await expect(choice("sign-in", "system")).toHaveAttribute("data-checked", "");
  // The code screen and a new account in the look too.
  for (const screen of ["code", "signup"]) {
    await own.locator(`[data-preview-auth=${screen}]`).click();
    await expect(preview()).toHaveAttribute("data-auth-look", "petal");
  }
  expect(problems).toEqual([]);
});

test("every top of the account menu: chosen, drawn, saved and kept", async ({ request }) => {
  await own.goto("/studio/project/screens");
  await expect(choice("menu", "system")).toHaveAttribute("data-checked", "");
  await expect(menuPreview()).toHaveAttribute("data-header", "system-petal");
  for (const header of ["plain", "card", "cover", "tiles", "night", "academy"]) {
    // Its picture is the menu drawn with that top.
    await expect(choice("menu", header).locator("[data-header]")).toHaveAttribute("data-header", header);
    await choice("menu", header).click();
    await expect(choice("menu", header)).toHaveAttribute("data-checked", "");
    await expect(own.locator("[data-menu-looks] [data-checked]")).toHaveCount(1);
    await expect(menuPreview()).toHaveAttribute("data-header", header);
    await save();
    const now = await served(request);
    expect(now.account_menu?.header, header).toBe(header);
    expect(now.system?.screens?.account).toBe("classic");
    await own.reload();
    await expect(choice("menu", header)).toHaveAttribute("data-checked", "");
  }
  await choice("menu", "system").click();
  await expect(menuPreview()).toHaveAttribute("data-header", "system-petal");
  await save();
  expect((await served(request)).system?.screens?.account).toBeUndefined();
  await own.reload();
  await expect(choice("menu", "system")).toHaveAttribute("data-checked", "");
  expect(problems).toEqual([]);
});
