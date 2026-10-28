import { expect, test } from "@playwright/test";
import { DOCS } from "../../src/content/docs";

const PAGES: { path: string; heading: RegExp; footer: boolean }[] = [
  { path: "/", heading: /Your business, as your own mobile app\./, footer: true },
  { path: "/solutions", heading: /An app for the way your business works/, footer: true },
  { path: "/solutions/academy", heading: /Your academy, in your students' pockets/, footer: true },
  { path: "/solutions/store", heading: /Your shop, one tap away/, footer: true },
  { path: "/solutions/bookings", heading: /Appointments, booked in your own app/, footer: true },
  { path: "/solutions/clinic", heading: /Your clinic, booked from your patients. phones/, footer: true },
  { path: "/docs/clinics", heading: /Clinics: doctors, visits and the intake form/, footer: true },
  { path: "/solutions/restaurant", heading: /Your menu, ordered from your customers. phones/, footer: true },
  { path: "/docs/restaurants", heading: /Restaurants and cafés: menu, pickup, delivery and the kitchen/, footer: true },
  { path: "/solutions/fitness", heading: /Your classes, booked from your members. phones/, footer: true },
  { path: "/docs/fitness", heading: /Gyms and studios: timetable, classes and memberships/, footer: true },
  { path: "/solutions/real-estate", heading: /Your listings, with search, favorites and messages/, footer: true },
  { path: "/features", heading: /Everything your app needs, built in/, footer: true },
  { path: "/integrations", heading: /Your content, from wherever it lives/, footer: true },
  { path: "/how-it-works", heading: /From sign-up to the app stores in five steps/, footer: true },
  { path: "/pricing", heading: /A plan for every app/, footer: true },
  { path: "/yallapp-studio", heading: /Design your app your way, element by element/, footer: true },
  { path: "/demo/studio", heading: /See what a Studio project looks like/, footer: true },
  { path: "/docs/yallapp-studio", heading: /Yallapp Studio: design your app freely/, footer: true },
  { path: "/faq", heading: /Questions, answered/, footer: true },
  { path: "/contact", heading: /Talk to us/, footer: true },
  { path: "/docs", heading: /Yallapp documentation/, footer: true },
  { path: "/docs/getting-started", heading: /Welcome to Yallapp/, footer: true },
  { path: "/docs/google-play", heading: /Publish on Google Play/, footer: true },
  { path: "/docs/push-notifications", heading: /Push notifications with Firebase/, footer: true },
  { path: "/docs/shopify", heading: /Connect Shopify/, footer: true },
  { path: "/docs/my-own-api", heading: /Connect your own API/, footer: true },
  { path: "/docs/store-rejections", heading: /If the store rejects your app/, footer: true },
  { path: "/developers", heading: /The Yallapp API reference/, footer: true },
  { path: "/terms", heading: /Terms of service/, footer: true },
  { path: "/privacy", heading: /Privacy policy/, footer: true },
  { path: "/refund", heading: /Refund policy/, footer: true },
  { path: "/sign-in", heading: /Sign in/, footer: true },
  { path: "/sign-up", heading: /Create your account/, footer: false },
  { path: "/forgot-password", heading: /Reset your password/, footer: true },
  { path: "/this-page-does-not-exist", heading: /We can't find this page/, footer: true },
];

for (const width of [360, 1280]) {
  test.describe(`public pages at ${width} px`, () => {
    test.use({ viewport: { width, height: 900 } });

    for (const page of PAGES) {
      test(`${page.path} renders without horizontal scroll`, async ({ page: tab }) => {
        const response = await tab.goto(page.path);
        expect(response?.status()).toBe(page.path === "/this-page-does-not-exist" ? 404 : 200);
        await expect(tab.getByRole("heading", { level: 1, name: page.heading })).toBeVisible();
        const overflow = await tab.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
        expect(overflow).toBeLessThanOrEqual(0);
        if (page.footer) await expect(tab.getByRole("contentinfo")).toContainText(`© ${new Date().getFullYear()} Yallapp · Cairo, Egypt`);
      });
    }
  });
}

test("the landing page has the plans, the steps and the full footer", async ({ page }) => {
  await page.goto("/");
  const nav = page.getByRole("navigation", { name: "Main" });
  // 54 Home is the first menu entry, marked on the home page; the logo leads home too.
  await expect(nav.getByRole("link", { name: "Home", exact: true })).toHaveAttribute("aria-current", "page");
  await expect(nav.locator("[aria-current]")).toHaveCount(1);
  await expect(page.getByRole("contentinfo").getByRole("navigation", { name: "Product" }).getByRole("link", { name: "Home" })).toHaveAttribute("href", "/");
  await expect(page.getByRole("link", { name: "Yallapp home" })).toHaveAttribute("href", "/");
  await expect(page.getByRole("banner").getByRole("link", { name: "Get started" })).toHaveAttribute("href", "/sign-up");
  await expect(page.getByRole("banner").getByRole("link", { name: "Sign in" })).toHaveAttribute("href", "/sign-in");

  // 32 Four plan cards with prices, limits, highlights and a button each.
  await expect(page.getByRole("heading", { level: 2, name: "A plan for every app" })).toBeVisible();
  const plans = page.getByRole("list", { name: "Plans" });
  for (const name of ["Starter", "Growth", "Pro", "Business"]) {
    await expect(plans.getByRole("heading", { level: 3, name, exact: true })).toBeVisible();
    await expect(plans.getByRole("link", { name: `Start with ${name}` })).toHaveAttribute("href", "/sign-up");
  }
  await expect(plans.locator('[data-plan="growth"]')).toContainText("Most popular");
  await expect(plans.locator('[data-plan="starter"]')).toContainText("On request");
  await expect(plans.locator('[data-plan="starter"]')).toContainText("Up to 1,000 users");
  await expect(plans.locator('[data-plan="growth"]')).toContainText("Android and iOS");
  await expect(plans.locator('[data-plan="growth"]')).toContainText("Full page editor");
  await expect(page.getByRole("link", { name: "Compare all features" })).toHaveAttribute("href", "/pricing");
  // Equal heights side by side on a wide screen.
  const heights = await plans.locator("[data-plan]").evaluateAll((cards) => cards.map((c) => Math.round(c.getBoundingClientRect().height)));
  expect(new Set(heights).size).toBe(1);

  // 41 Every plan card shows the marks of its stores: the Android stores on Starter, the App Store too from Growth.
  const storeNames = ["Google Play", "Apple App Store", "Samsung Galaxy Store", "Huawei AppGallery", "Xiaomi GetApps"];
  for (const [plan, names] of [
    ["starter", storeNames.filter((n) => n !== "Apple App Store")],
    ["growth", storeNames],
    ["pro", storeNames],
    ["business", storeNames],
  ] as const) {
    const marks = plans.locator(`[data-plan="${plan}"]`).getByRole("list", { name: /app stores$/ });
    await expect(marks.getByRole("img")).toHaveCount(names.length);
    for (const name of names) await expect(marks.getByRole("img", { name, exact: true })).toHaveCount(1);
  }
  await expect(plans.locator('[data-plan="pro"]')).toContainText("5 app stores · We publish for you");
  await expect(plans.locator('[data-plan="starter"]')).toContainText("4 app stores · You publish with our guides");

  // 41 The Works with strip replaced the numbers strip: real brands, named, never "partners".
  await expect(page.getByRole("region", { name: "Yallapp in numbers" })).toHaveCount(0);
  const strip = page.getByRole("region", { name: "Publish to the stores, connect what you already use" });
  await expect(strip.getByText("Works with", { exact: true })).toBeVisible();
  await expect(strip).not.toContainText(/partner/i);
  await expect(strip).toContainText("are trademarks of their owners and don't mean they endorse Yallapp");
  const stores = strip.getByRole("list", { name: "App stores, payments and messaging" });
  for (const name of [...storeNames, "WhatsApp", "Firebase", "iyzico", "Kashier", "Fawaterk"]) await expect(stores.getByRole("img", { name, exact: true })).toHaveCount(1);
  await expect(stores.getByRole("img", { name: "Xiaomi GetApps" })).toHaveCount(1);
  const platforms = strip.getByRole("list", { name: "Websites and platforms" });
  for (const name of ["WordPress", "WooCommerce", "Shopify", "Wix", "Salla", "Zid", "Tutor LMS", "SimplyBook.me"]) await expect(platforms.getByRole("img", { name, exact: true })).toHaveCount(1);
  // Every logo has a name; the loop's second copy is hidden from assistive technology.
  const labels = await strip.locator("[data-brand]").evaluateAll((chips) => chips.map((c) => c.getAttribute("aria-label") ?? ""));
  expect(labels.length).toBeGreaterThan(20);
  for (const label of labels) expect(label.trim().length).toBeGreaterThan(1);
  expect(await strip.getByRole("img").count()).toBe(labels.length / 2);
  await expect(page.locator("[data-steps-timeline] > li")).toHaveCount(5);
  await expect(page.getByRole("heading", { level: 2, name: "One platform, eleven kinds of apps" })).toBeVisible();

  const footer = page.getByRole("contentinfo");
  await expect(footer).toContainText(`© ${new Date().getFullYear()} Yallapp · Cairo, Egypt`);
  await expect(footer).toContainText("are trademarks of their owners");
  await expect(footer).not.toContainText(/WEBEK|England|16326894|London/);
  await expect(footer.getByRole("link", { name: "+90 544 673 19 42" })).toHaveAttribute("href", "https://wa.me/905446731942");
  await expect(footer.getByRole("link", { name: "Refund policy" })).toHaveAttribute("href", "/refund");
  await expect(footer.getByRole("link", { name: "Documentation" })).toHaveAttribute("href", "/docs");
});

test("the Works with strip scrolls, pauses under the pointer and stands still for less motion", async ({ browser }) => {
  // 41 Moving by default; paused while hovered.
  const moving = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await moving.goto("/");
  const track = moving.locator(".marquee-track").first();
  await expect.poll(() => track.evaluate((t) => getComputedStyle(t).animationName)).toBe("marquee");
  await moving.locator(".marquee").first().hover();
  await expect.poll(() => track.evaluate((t) => getComputedStyle(t).animationPlayState)).toBe("paused");
  await moving.close();
  // Still and wrapped, the loop's copy hidden, when the visitor prefers less motion; nothing overflows a phone.
  const still = await browser.newPage({ viewport: { width: 390, height: 844 }, reducedMotion: "reduce" });
  await still.goto("/");
  await expect.poll(() => still.locator(".marquee-track").first().evaluate((t) => getComputedStyle(t).animationName)).toBe("none");
  await expect(still.locator('.marquee-list[aria-hidden="true"]').first()).toBeHidden();
  await expect(still.getByRole("img", { name: "Xiaomi GetApps" }).first()).toBeVisible();
  expect(await still.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
  await still.close();
});

test("the public site follows dark mode, and (73) the sign-in page too", async ({ browser }) => {
  // 41 Midnight page and Ivory text on public pages; the dark bands stay dark.
  const dark = await browser.newPage({ colorScheme: "dark" });
  await dark.goto("/pricing");
  const colors = await dark.evaluate(() => ({ body: getComputedStyle(document.body).backgroundColor, text: getComputedStyle(document.body).color }));
  expect(colors).toEqual({ body: "rgb(14, 13, 36)", text: "rgb(244, 239, 230)" });
  await expect(dark.getByRole("contentinfo")).toHaveCSS("background-color", "rgb(14, 13, 36)");
  await dark.goto("/sign-in");
  expect(await dark.evaluate(() => getComputedStyle(document.body).backgroundColor)).toBe("rgb(14, 13, 36)");
  await dark.close();
});

test("the contact page and the legal pages name Yallapp in Cairo, Egypt", async ({ page }) => {
  await page.goto("/contact");
  await expect(page.getByRole("main")).toContainText("Based in Cairo, Egypt");
  await expect(page.getByRole("main")).not.toContainText(/WEBEK|England|16326894|Shelton/);
  await page.goto("/terms");
  await expect(page.getByRole("heading", { name: "17. Disputes and your rights" })).toBeVisible();
  // 77 The business is responsible for its app's chat.
  await expect(page.getByRole("heading", { name: "11. Chat in your app" })).toBeVisible();
  await expect(page.getByRole("main")).not.toContainText(/England|WEBEK/);
  await page.goto("/privacy");
  await expect(page.getByRole("main")).toContainText("Yallapp is based in Cairo, Egypt, and is the data controller");
});

test("the phones on the landing page have thin bezels that scale with their size", async ({ page }) => {
  // 19 One frame everywhere: the bezel is about 2.6% of the phone's width (3 to 10 px), the corners about 14%.
  await page.goto("/");
  const phones = await page.locator("[data-phone-frame] > .phone-body").evaluateAll((bodies) =>
    bodies
      .filter((b) => (b as HTMLElement).offsetWidth > 0)
      .map((b) => {
        const style = getComputedStyle(b);
        return { width: (b as HTMLElement).offsetWidth, bezel: parseFloat(style.paddingTop), radius: parseFloat(style.borderTopLeftRadius) };
      }),
  );
  expect(phones.length).toBeGreaterThan(3);
  for (const phone of phones) {
    expect(phone.bezel).toBeGreaterThanOrEqual(3);
    expect(phone.bezel).toBeLessThanOrEqual(Math.max(3, phone.width * 0.03));
    expect(phone.radius / phone.width).toBeCloseTo(0.14, 2);
  }
});

test("every menu link opens its own page and marks it", async ({ page }) => {
  const pages = [
    { group: null, name: "Home", path: "/" },
    { group: "Product", name: "Yallapp Studio", path: "/yallapp-studio" },
    { group: "Product", name: "Solutions", path: "/solutions" },
    { group: "Product", name: "Features", path: "/features" },
    { group: "Product", name: "Integrations", path: "/integrations" },
    { group: "Product", name: "How it works", path: "/how-it-works" },
    { group: null, name: "Pricing", path: "/pricing" },
    { group: null, name: "Demo", path: "/demo" },
    { group: "Resources", name: "Docs", path: "/docs" },
    { group: "Resources", name: "FAQ", path: "/faq" },
    { group: "Resources", name: "API reference", path: "/developers" },
    { group: null, name: "Contact", path: "/contact" },
  ];
  for (const target of pages) {
    await page.goto(target.path === "/" ? "/pricing" : "/");
    const nav = page.getByRole("navigation", { name: "Main" });
    if (target.group) await nav.getByRole("button", { name: target.group }).click();
    await nav.getByRole("link", { name: new RegExp(`^${target.name}`) }).click();
    await expect(page).toHaveURL(new RegExp(`${target.path}$`));
    const here = page.getByRole("navigation", { name: "Main" });
    if (target.group) {
      // The section's button is marked; its list shows the page as current.
      const button = here.getByRole("button", { name: target.group });
      await expect(button).toHaveAttribute("aria-current", "true");
      await button.click();
      await expect(here.getByRole("link", { name: new RegExp(`^${target.name}`) })).toHaveAttribute("aria-current", "page");
    } else {
      await expect(here.getByRole("link", { name: target.name, exact: true })).toHaveAttribute("aria-current", "page");
    }
  }
  await page.goto("/pricing");
  await expect(page.getByRole("heading", { name: "Compare plans" })).toBeVisible();
});

test("103R Yallapp Studio has its own page: the editor, apps made in it, Studio-only types, the differences and its own plans", async ({ page }) => {
  await page.goto("/yallapp-studio");
  await expect(page.getByRole("heading", { level: 1, name: "Design your app your way, element by element" })).toBeVisible();
  await expect(page.getByRole("img", { name: /^The Yallapp Studio editor/ }).first()).toBeVisible();
  // Real screenshots of apps made in Studio, light and dark, and a delivery company's.
  for (const screen of ["studio-cafe-home", "studio-cafe-home-dark", "delivery-send", "delivery-shipment", "delivery-courier"]) {
    await expect(page.locator(`#apps img[src*="${screen}.png"]`)).toHaveCount(1);
  }
  await expect(page.locator("[data-studio-only]").filter({ hasText: "Delivery & couriers" })).toContainText("Only in Studio");
  await expect(page.getByRole("link", { name: "Restaurant & café" })).toHaveAttribute("href", "/solutions/restaurant");
  // Regular apps next to Studio projects.
  const differences = page.getByRole("table", { name: "Regular apps and Studio projects" });
  await expect(differences.getByRole("columnheader")).toContainText(["Topic", "Regular apps", "Yallapp Studio"]);
  await expect(differences.getByRole("row", { name: /^Plans/ })).toContainText("Starter, Growth, Pro and Business");
  await expect(differences.getByRole("row", { name: /^Plans/ })).toContainText("a Studio project is paid on a Studio plan only");
  // Studio's own plans: the offered ones, or on request; what every plan has and what changes plan by plan.
  const plans = page.locator("#plans [data-studio-plans]");
  await expect(page.getByRole("heading", { level: 2, name: "Studio's own plans" })).toBeVisible();
  await expect(plans.locator("[data-studio-on-request], [data-plan]").first()).toBeVisible();
  await expect(plans.locator('[data-plan="starter"], [data-plan="growth"], [data-plan="pro"], [data-plan="business"]')).toHaveCount(0);
  await expect(plans.getByRole("heading", { name: "Every Studio plan has" })).toBeVisible();
  await expect(plans.getByText("Delivery & couriers").first()).toBeVisible();
  await expect(page.getByRole("link", { name: "Start a Studio project" })).toHaveAttribute("href", "/sign-up");
  await page.getByRole("link", { name: "See the Studio demo" }).first().click();
  await expect(page).toHaveURL(/\/demo\/studio$/);
});

test("103R the Studio demo has its own page; the regular demo stays as it is", async ({ page }) => {
  await page.goto("/demo/studio");
  await expect(page.getByRole("heading", { level: 1, name: "See what a Studio project looks like" })).toBeVisible();
  await expect(page.getByRole("heading", { level: 2, name: "A café designed in Studio" })).toBeVisible();
  await expect(page.getByRole("heading", { level: 2, name: "A delivery company" })).toBeVisible();
  await expect(page.getByRole("heading", { level: 2, name: "The editor behind them" })).toBeVisible();
  for (const screen of ["studio-cafe-home", "studio-cafe-home-dark", "delivery-send", "delivery-shipment", "delivery-courier", "studio-editor", "studio-home", "studio-project"]) {
    await expect(page.locator(`main img[src*="${screen}.png"]`).first()).toBeVisible();
  }
  // The Demo menu entry is marked, and the regular demo apps are a link away.
  await expect(page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "Demo", exact: true })).toHaveAttribute("aria-current", "page");
  await page.getByRole("link", { name: "Demo apps of regular apps" }).click();
  await expect(page).toHaveURL(/\/demo$/);
  await expect(page.getByRole("heading", { level: 1, name: "Try a real app on your phone" })).toBeVisible();
  await expect(page.locator("main img[src*=\"studio-\"]")).toHaveCount(0);
});

test("103R pricing keeps the regular plans and Studio's own plans apart, with the differences", async ({ page }) => {
  await page.goto("/pricing");
  await expect(page.getByRole("heading", { level: 2, name: "Plans for regular apps" })).toBeVisible();
  const regular = page.locator("#regular [data-pricing-plans]");
  for (const name of ["Starter", "Growth", "Pro", "Business"]) await expect(regular.getByRole("heading", { level: 3, name, exact: true })).toBeVisible();
  await expect(regular.locator('[data-plan^="studio_"]')).toHaveCount(0);
  await expect(page.locator("#regular")).toContainText("Studio projects are paid on Studio's own plans, not on these.");
  const studio = page.locator("#studio");
  await expect(studio.getByRole("heading", { level: 2, name: "Studio's own plans" })).toBeVisible();
  await expect(studio.locator('[data-plan="starter"], [data-plan="growth"], [data-plan="pro"], [data-plan="business"]')).toHaveCount(0);
  await expect(page.getByRole("table", { name: "Regular apps and Studio projects" })).toBeVisible();
  // The home page has its Studio section, and the footer links to the Studio page and its demo.
  await page.goto("/");
  const section = page.locator("[data-home-studio]");
  await expect(section.getByRole("heading", { level: 2, name: "Yallapp Studio: design your app freely" })).toBeVisible();
  await expect(section.getByRole("link", { name: "Discover Yallapp Studio" })).toHaveAttribute("href", "/yallapp-studio");
  const footer = page.getByRole("contentinfo");
  await expect(footer.getByRole("link", { name: "Yallapp Studio", exact: true })).toHaveAttribute("href", "/yallapp-studio");
  await expect(footer.getByRole("link", { name: "Studio demo", exact: true })).toHaveAttribute("href", "/demo/studio");
});

test("the menu's lists open with the keyboard and close on Escape or a click outside", async ({ page }) => {
  await page.goto("/pricing");
  const nav = page.getByRole("navigation", { name: "Main" });
  const product = nav.getByRole("button", { name: "Product" });
  await expect(product).toHaveAttribute("aria-expanded", "false");
  await product.focus();
  await page.keyboard.press("Enter");
  await expect(product).toHaveAttribute("aria-expanded", "true");
  const list = page.locator(`#${await product.getAttribute("aria-controls")}`);
  await expect(list.getByRole("link", { name: /^Solutions/ })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(product).toHaveAttribute("aria-expanded", "false");
  await expect(list).toBeHidden();
  await expect(product).toBeFocused();
  // Arrow down opens the list on its first link; arrows move between links.
  await page.keyboard.press("ArrowDown");
  await expect(list.getByRole("link", { name: /^Yallapp Studio/ })).toBeFocused();
  await page.keyboard.press("ArrowDown");
  await expect(list.getByRole("link", { name: /^Solutions/ })).toBeFocused();
  // One list at a time.
  await nav.getByRole("button", { name: "Resources" }).click();
  await expect(product).toHaveAttribute("aria-expanded", "false");
  await expect(nav.getByRole("button", { name: "Resources" })).toHaveAttribute("aria-expanded", "true");
  // A click outside the list, on the page below.
  await page.mouse.click(20, 600);
  await expect(nav.getByRole("button", { name: "Resources" })).toHaveAttribute("aria-expanded", "false");
});

test("on a phone the menu opens full screen, keeps focus and closes", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 700 });
  await page.goto("/features");
  const toggle = page.getByRole("button", { name: "Menu", exact: true });
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await expect(page.getByRole("banner").getByRole("link", { name: "Pricing" })).toBeHidden();
  await toggle.click();
  const menu = page.getByRole("dialog", { name: "Menu" });
  await expect(menu).toBeVisible();
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  await expect(menu.getByRole("button", { name: "Close menu" })).toBeFocused();
  expect(await page.evaluate(() => getComputedStyle(document.documentElement).overflow)).toBe("hidden");
  // The groups and the page the visitor is on.
  await expect(menu.getByRole("link", { name: /^Features/ })).toHaveAttribute("aria-current", "page");
  await expect(menu.getByRole("link", { name: /^API reference/ })).toBeVisible();
  await expect(menu.getByRole("link", { name: "Sign in" })).toHaveAttribute("href", "/sign-in");
  await expect(menu.getByRole("link", { name: "Get started" })).toHaveAttribute("href", "/sign-up");
  // Focus stays in the menu: back past the logo to the last link, and on to the first.
  await page.keyboard.press("Shift+Tab");
  await expect(menu.getByRole("link", { name: "Yallapp home" })).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(menu.getByRole("link", { name: "Get started" })).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(menu.getByRole("link", { name: "Yallapp home" })).toBeFocused();
  // Escape closes it and gives focus back to the button.
  await page.keyboard.press("Escape");
  await expect(menu).toHaveCount(0);
  await expect(toggle).toBeFocused();
  expect(await page.evaluate(() => getComputedStyle(document.documentElement).overflow)).not.toBe("hidden");
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
  // A link opens its page and closes the menu.
  await toggle.click();
  await page.getByRole("dialog", { name: "Menu" }).getByRole("link", { name: "Pricing" }).click();
  await expect(page).toHaveURL(/\/pricing$/);
  await expect(page.getByRole("dialog", { name: "Menu" })).toHaveCount(0);
});

test("search engines get the sitemap, robots.txt, canonical addresses, link previews and structured data", async ({ page, request }) => {
  const sitemap = await request.get("/sitemap.xml");
  expect(sitemap.status()).toBe(200);
  const xml = await sitemap.text();
  expect(xml).toContain("<loc>http://localhost:");
  for (const path of ["/pricing", "/solutions/clinic", "/docs/shopify", "/privacy"]) expect(xml).toContain(`${path}</loc>`);
  expect(xml).not.toMatch(/\/(dashboard|admin|api|pay|give|receipts|shop)\b/);

  const robots = await request.get("/robots.txt");
  expect(robots.status()).toBe(200);
  const rules = await robots.text();
  expect(rules).toContain("Disallow: /dashboard");
  expect(rules).toContain("Disallow: /admin");
  expect(rules).toMatch(/Sitemap: http:\/\/localhost:\d+\/sitemap\.xml/);

  await page.goto("/pricing");
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", /\/pricing$/);
  await expect(page.locator('meta[property="og:title"]')).toHaveAttribute("content", "Pricing · Yallapp");
  await expect(page.locator('meta[property="og:url"]')).toHaveAttribute("content", /\/pricing$/);
  await expect(page.locator('meta[property="og:site_name"]')).toHaveAttribute("content", "Yallapp");
  await expect(page.locator('meta[property="og:type"]')).toHaveAttribute("content", "website");
  await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute("content", "summary_large_image");
  const image = await page.locator('meta[property="og:image"]').getAttribute("content");
  expect(image).toMatch(/\/pricing\/opengraph-image/);
  const png = await request.get(new URL(image!).pathname + new URL(image!).search);
  expect(png.status()).toBe(200);
  expect(png.headers()["content-type"]).toBe("image/png");
  await expect(page.locator('meta[name="robots"]')).toHaveCount(0);

  // Structured data: the home page describes Yallapp, the FAQ its questions, articles their place.
  const ld = async () => (await page.locator('script[type="application/ld+json"]').allTextContents()).flatMap((t) => [JSON.parse(t)].flat());
  await page.goto("/");
  const home = await ld();
  expect(home.map((d) => d["@type"])).toEqual(["Organization", "WebSite", "SoftwareApplication"]);
  expect(home[0].address).toEqual({ "@type": "PostalAddress", addressLocality: "Cairo", addressCountry: "EG" });
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", /localhost:\d+\/?$/);
  await page.goto("/faq");
  const faq = (await ld())[0];
  expect(faq["@type"]).toBe("FAQPage");
  expect(faq.mainEntity.length).toBeGreaterThan(10);
  await page.goto("/docs/shopify");
  expect((await ld())[0].itemListElement.map((i: { name: string }) => i.name)).toEqual(["Home", "Docs", "Connect Shopify"]);
  await page.goto("/solutions/clinic");
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", /\/solutions\/clinic$/);
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute("content", /\/solutions\/clinic\/opengraph-image/);

  // Sign-in and payment pages stay out of search engines.
  await page.goto("/sign-in");
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
});

test("67 the home page in every language links favicons Google can use, and each one answers 200 with an image", async ({ page, request }) => {
  const robots = await (await request.get("/robots.txt")).text();
  const disallowed = [...robots.matchAll(/^Disallow: (.+)$/gm)].map((m) => m[1]!.trim());
  for (const home of ["/", "/ar", "/tr"]) {
    const response = await page.goto(home);
    expect(response!.headers()["x-robots-tag"], home).toBeUndefined();
    await expect(page.locator('meta[name="robots"]')).toHaveCount(0);
    const icons = await page.locator('head link[rel="icon"], head link[rel="apple-touch-icon"]').evaluateAll((links) =>
      links.map((l) => ({ rel: l.getAttribute("rel"), href: l.getAttribute("href")!, sizes: l.getAttribute("sizes") ?? "" })),
    );
    expect(icons.map((i) => i.href), home).toEqual([
      "/favicon.ico",
      "/favicon-48x48.png",
      "/favicon-96x96.png",
      "/android-chrome-192x192.png",
      "/favicon.svg",
      "/apple-touch-icon.png",
    ]);
    // A square PNG of at least 48 px, as Google Search asks.
    expect(icons.some((i) => i.rel === "icon" && /^(\d+)x\1$/.test(i.sizes) && Number(i.sizes.split("x")[0]) >= 48)).toBe(true);
    for (const icon of icons) {
      expect(disallowed.some((d) => icon.href.startsWith(d)), icon.href).toBe(false);
      const file = await request.get(icon.href, { maxRedirects: 0 });
      expect(file.status(), icon.href).toBe(200);
      expect(file.headers()["content-type"], icon.href).toMatch(/^image\//);
    }
  }
});

test("the home page shows the app types, the screens and the comparison", async ({ page }) => {
  await page.goto("/");
  // Every app type links to its own page.
  for (const [name, path] of [
    ["Academy apps", "/solutions/academy"],
    ["Store apps", "/solutions/store"],
    ["Restaurant & café apps", "/solutions/restaurant"],
    ["Bookings apps", "/solutions/bookings"],
    ["Clinic apps", "/solutions/clinic"],
    ["Gym & fitness apps", "/solutions/fitness"],
    ["Real estate apps", "/solutions/real-estate"],
  ] as const) {
    await expect(page.getByRole("link", { name: new RegExp(name) })).toHaveAttribute("href", path);
  }
  await expect(page.getByRole("table", { name: "A typical app builder compared with Yallapp" })).toBeVisible();
  // App screenshots and dashboard screenshots load.
  for (const alt of ["An academy app's home screen with courses", "The pages and look editor in the Yallapp dashboard"]) {
    const image = page.getByRole("img", { name: alt }).first();
    await image.scrollIntoViewIfNeeded();
    await expect.poll(() => image.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true);
  }
  await page.getByRole("link", { name: "All integrations" }).click();
  await expect(page).toHaveURL(/\/integrations$/);
  await expect(page.getByRole("heading", { name: "SimplyBook.me" })).toBeVisible();
  await page.getByRole("link", { name: "How to connect Shopify" }).click();
  await expect(page).toHaveURL(/\/docs\/shopify$/);
  await expect(page.getByRole("heading", { level: 1, name: "Connect Shopify" })).toBeVisible();
});

test("the documentation's menu finds and opens articles", async ({ page }) => {
  await page.goto("/docs");
  const menu = page.getByRole("navigation", { name: "Documentation" });
  await menu.getByRole("searchbox").fill("firebase");
  await expect(menu.getByRole("link", { name: "Push notifications with Firebase" })).toBeVisible();
  await expect(menu.getByRole("link", { name: "Connect Shopify" })).toHaveCount(0);
  await menu.getByRole("link", { name: "Push notifications with Firebase" }).click();
  await expect(page).toHaveURL(/\/docs\/push-notifications$/);
  await expect(page.getByRole("heading", { level: 1, name: "Push notifications with Firebase" })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Documentation" }).getByRole("link", { name: "Push notifications with Firebase" })).toHaveAttribute(
    "aria-current",
    "page",
  );
  // Headings can be linked to.
  await page.getByRole("navigation", { name: "On this page" }).getByRole("link", { name: "Connect Apple push notifications" }).click();
  await expect(page).toHaveURL(/#connect-apple-push-notifications$/);
  // Next article.
  await page.getByRole("link", { name: /^Next: / }).click();
  await expect(page).toHaveURL(/\/docs\/app-users$/);

  // The developer guide links to the reference, which lists the endpoints.
  await page.goto("/docs/my-own-api");
  await expect(page.locator("pre").first()).toContainText("/config?platform=android");
  await page.getByRole("link", { name: "API reference" }).first().click();
  await expect(page).toHaveURL(/\/developers$/);
  await expect(page.getByText("/auth/otp/verify", { exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Download openapi.yaml" })).toHaveAttribute("href", "/developers/openapi.yaml");
});

test("every documentation article fits a 360 px phone", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  for (const article of DOCS) {
    const response = await page.goto(`/docs/${article.slug}`);
    expect(response?.status(), article.slug).toBe(200);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(article.title);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow, article.slug).toBeLessThanOrEqual(0);
  }
});

test("the documentation's menu folds away on phones", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto("/docs/setup-steps");
  const menu = page.getByRole("navigation", { name: "Documentation" });
  await expect(menu.getByRole("link", { name: "Connect Shopify" })).toBeHidden();
  await menu.getByRole("button", { name: "Browse the documentation" }).click();
  await menu.getByRole("link", { name: "Connect Shopify" }).click();
  await expect(page).toHaveURL(/\/docs\/shopify$/);
});

test("93.2 the documentation's search finds words inside the articles, in every language", async ({ page }) => {
  await page.goto("/docs/setup-steps");
  const menu = page.getByRole("navigation", { name: "Documentation" });
  await menu.getByPlaceholder("Search the documentation").fill("loyalty points");
  // Enter searches every article's text.
  await menu.getByPlaceholder("Search the documentation").press("Enter");
  await expect(page).toHaveURL(/\/docs\/search\?q=loyalty\+points$/);
  await expect(page.getByRole("status")).toContainText(/\d+ articles? mentions? “loyalty points”\./);
  const first = page.locator("[data-doc-hit]").first();
  await expect(first).toHaveAttribute("data-doc-hit", "store-orders");
  await expect(first).toContainText("Loyalty points");
  await first.getByRole("link").click();
  await expect(page).toHaveURL(/\/docs\/store-orders$/);

  await page.goto("/docs/search?q=zzqxv");
  await expect(page.getByRole("status")).toHaveText("No article mentions “zzqxv”. Try other words.");
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);

  await page.goto(`/ar/docs/search?q=${encodeURIComponent("نقاط الولاء")}`);
  await expect(page.locator("[data-doc-hit]").first()).toHaveAttribute("data-doc-hit", "store-orders");
  await expect(page.locator("[data-doc-hit]").first().getByRole("link")).toHaveAttribute("href", "/ar/docs/store-orders");
  await page.goto("/tr/docs/search?q=sadakat");
  await expect(page.locator("[data-doc-hit]").first()).toHaveAttribute("data-doc-hit", "store-orders");
});

test("the old guide addresses open their documentation article", async ({ page }) => {
  for (const [guide, article] of [
    ["/guides", "/docs"],
    ["/guides/google-play", "/docs/google-play"],
    ["/guides/install-plugin", "/docs/wordpress-plugin"],
    ["/guides/custom-api", "/docs/my-own-api"],
    ["/guides/push-notifications", "/docs/push-notifications"],
    ["/guides/store-rejection", "/docs/store-rejections"],
  ]) {
    await page.goto(guide!);
    await expect(page).toHaveURL(new RegExp(`${article}$`));
  }
});

test("a business signs up without a website", async ({ browser }) => {
  // Sign-ups are limited per address; this one has its own.
  const page = await browser.newPage({ extraHTTPHeaders: { "x-forwarded-for": "198.51.100.88" } });
  await page.goto("/sign-up");
  await expect(page.getByText("Apps can also come from Shopify and other platforms, or from no website at all.")).toBeVisible();
  await page.getByLabel("Full name").fill("Nora Bloom");
  await page.getByLabel("Email").fill(`nora-${Date.now().toString(36)}@bloom.test`);
  await page.getByLabel("WhatsApp number").fill("+90 544 000 00 88");
  await page.getByLabel("Your website (optional)").fill("not a website");
  await page.getByLabel("Password", { exact: true }).fill("nora-strong-password-1");
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByText("Enter a full address, e.g. https://your-site.com, or leave it empty.")).toBeVisible();

  await page.getByLabel("Your website (optional)").fill("");
  await page.getByLabel("Password", { exact: true }).fill("nora-strong-password-1");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/\/pending$/);
  await page.close();
});

test("the dashboard needs a signed-in user", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/sign-in$/);
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/sign-in$/);
});
