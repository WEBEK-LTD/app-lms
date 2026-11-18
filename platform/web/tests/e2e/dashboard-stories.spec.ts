import { expect, test, type APIRequestContext, type Page } from "@playwright/test";
import { E2E } from "../../playwright.config";

/**
 * 165 Dashboard › Stories: a flower shop made from the Rose hour template
 * finds its five occasions copied there, nothing in the app changing; the
 * owner adds a story whose button opens one of the shop's categories (the
 * template's Roses),
 * moves it up, removes another; the app's page JSON shows them in
 * English, Arabic and Turkish; and Studio draws the dashboard's stories,
 * its inspector saying where they come from.
 */
test.describe.configure({ mode: "serial", timeout: 240_000 });

const suffix = Date.now().toString(36);
const client = { name: "Leqaa Stories", email: `stories-${suffix}@stories.test`, password: "leqaa-stories-strong-password-1" };
/** Its own address, so this spec's sign-ups don't count against the other specs' per-IP limits. */
const extraHTTPHeaders = { "x-forwarded-for": "198.51.100.165" };
let own: Page;
let api = "";
let previewToken = "";
/** The id of the template's "Roses" category, which the new story's button opens. */
let roses = "";
/** The template's five stories as copied to Dashboard › Stories, in their order. */
let designed: (string | null)[] = [];

const rows = () => own.locator("[data-story]");
const order = () => rows().evaluateAll((els) => els.map((el) => el.getAttribute("data-story")));

test.beforeAll(async ({ browser }) => {
  own = await (await browser.newContext({ extraHTTPHeaders, viewport: { width: 1360, height: 900 } })).newPage();
  await own.goto("/sign-up");
  await own.getByLabel("Full name").fill(client.name);
  await own.getByLabel("Email").fill(client.email);
  await own.getByLabel("WhatsApp number").fill("+20 100 000 0165");
  await own.getByLabel("Your website (optional)").fill(`https://stories-${suffix}.stories.test`);
  await own.getByLabel("Password", { exact: true }).fill(client.password);
  await own.getByRole("checkbox").check();
  await own.getByRole("button", { name: "Create account" }).click();
  await expect(own).toHaveURL(/\/start$/);

  const admin = await browser.newPage({ extraHTTPHeaders });
  await admin.goto("/sign-in");
  await admin.getByLabel("Email").fill(E2E.storiesAdminEmail);
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
  await own.getByLabel("Project name").fill("Leqaa Stories");
  await own.getByRole("button", { name: "Next" }).click();
  const rose = own.getByRole("radio", { name: /Rose hour/ });
  if (await rose.count()) await rose.first().click();
  await own.getByRole("button", { name: "Next" }).click();
  await expect(own).toHaveURL(/\/studio\/project$/);

  // The app in English, Arabic and Turkish.
  await own.goto("/studio/project/languages");
  const list = own.getByRole("list", { name: "Languages in the app" }).getByRole("listitem");
  for (const [code, name] of [
    ["ar", "Arabic"],
    ["tr", "Turkish"],
  ] as const) {
    if (await list.filter({ hasText: name }).count()) continue;
    await own.getByLabel("Add a language").selectOption(code);
    await own.getByRole("button", { name: "Add", exact: true }).click();
    await expect(list.filter({ hasText: name })).toHaveCount(1);
  }

  // The app's address and the draft preview's token, to read what the app is served.
  await own.goto("/studio/project/setup?step=website");
  api = (await own.locator("code").filter({ hasText: "/api/app/" }).first().textContent())!.trim();
  await own.goto("/studio/project/preview?pages=draft");
  const src = (await own.locator("iframe[data-testid=app-preview]").getAttribute("src"))!;
  previewToken = new URL(src, E2E.baseURL).searchParams.get("token")!;
});

test.afterAll(async () => {
  await own.context().close();
});

test("the template's stories are copied once, nothing in the app changing", async () => {
  await own.goto("/studio/project/stories");
  await expect(own.getByRole("heading", { level: 1, name: "Stories" })).toBeVisible();
  await expect(own.getByText(/have been copied here\. Nothing in your app changed/)).toBeVisible();
  await expect(rows()).toHaveCount(5);
  expect(await order()).toEqual([expect.stringMatching(/./), expect.any(String), expect.any(String), expect.any(String), expect.any(String)]);
  designed = await order();

  // Copied once: the page again shows the same five, without the note.
  await own.reload();
  await expect(rows()).toHaveCount(5);
  await expect(own.getByText(/have been copied here/)).toHaveCount(0);
});

test("189 before Stories are saved: slide 2 or 3, or a picture or words on it, picked on the left or the right, is the slide the phone shows", async () => {
  await own.goto("/studio/editor");
  const phone = own.getByRole("main", { name: "The page in the phone" });
  const inspector = own.getByRole("complementary", { name: "Design" });
  const of = phone.locator("[data-studio-slide-of]").first();
  const list = inspector.locator("[data-studio-slider-slides]");
  // On the left: the second slide in the layers. The phone shows it, and the right side lists the five.
  await own.locator("[data-studio-layer]").filter({ hasText: "Another year, in bloom." }).first().click();
  await expect(of).toHaveText("Slide 2 of 5");
  await expect(phone.getByText("Another year, in bloom.").first()).toBeVisible();
  await expect(list).toContainText("Slides (5)");
  await expect(list.locator("[data-studio-slide-row]")).toHaveCount(5);
  await expect(list.locator('[data-studio-slide-row="2"]')).toHaveAttribute("aria-current", "true");
  // On the right: slide 3. The phone shows it, with its words, icon and button listed under it.
  await list.locator('[data-studio-slide-row="3"] > button').click();
  await expect(of).toHaveText("Slide 3 of 5");
  await expect(phone.getByText("Gentle words, in white.").first()).toBeVisible();
  const title = list.locator('[data-studio-slide-part="text"]').filter({ hasText: "Gentle words, in white." });
  await expect(title).toHaveCount(1);
  await expect(list.locator('[data-studio-slide-part="button"]')).toHaveCount(1);
  // Its title picked on the right: still slide 3, the title selected.
  await title.click();
  await expect(of).toHaveText("Slide 3 of 5");
  await expect(inspector.getByText("Text «Gentle words, in white.»").first()).toBeVisible();
  // The fourth slide's small line on the left: slide 4.
  await own.locator("[data-studio-layer]").filter({ hasText: "Text «For a new baby»" }).first().click();
  await expect(of).toHaveText("Slide 4 of 5");
  // The phone's own arrow: slide 5.
  await phone.getByRole("button", { name: "Next slide" }).first().click();
  await expect(of).toHaveText("Slide 5 of 5");
  // Designed here until Stories are saved: edited here, no word of Stories.
  await expect(inspector.locator("[data-studio-story-slides]")).toHaveCount(0);
  await expect(phone.locator("[data-studio-edit-stories]")).toHaveCount(0);
});

test("the owner adds a story opening a category, moves it up and removes another", async () => {
  await own.goto("/studio/project/stories");
  await expect(rows()).toHaveCount(5);

  // A new story: its photo, its words in the three languages, its ring and its button opening Peonies.
  await own.getByRole("button", { name: "Add a story" }).click();
  const form = own.locator("[data-story-form]");
  await form.getByLabel("Photo link").fill("https://images.example.com/peonies.jpg");
  await form.getByLabel("Small label · English (main)").fill("Just in");
  await form.getByLabel("Title · English (main)").fill("Peonies are here");
  await form.getByLabel("Title · Arabic").fill("وصلت الفاوانيا");
  await form.getByLabel("Title · Turkish").fill("Şakayıklar geldi");
  await form.getByLabel("Ring name · English (main)").fill("Peonies");
  await form.getByLabel("Ring name · Arabic").fill("فاوانيا");
  await form.getByLabel("Ring name · Turkish").fill("Şakayık");
  await form.getByLabel("Button text · English (main)").fill("See peonies");
  await form.getByLabel("Button text · Arabic").fill("شوف الفاوانيا");
  await form.getByLabel("When the customer taps").selectOption("category");
  await form.getByLabel("Category", { exact: true }).selectOption({ label: "Roses" });
  roses = await form.getByLabel("Category", { exact: true }).inputValue();
  expect(roses).toMatch(/^\d+$/);
  // The live preview shows it as it's typed.
  const preview = own.locator("[data-story-preview]");
  await expect(preview).toContainText("Peonies are here");
  await expect(preview).toContainText("See peonies");
  await preview.getByRole("combobox").selectOption("ar");
  await expect(preview).toContainText("وصلت الفاوانيا");
  await form.getByRole("button", { name: "Save story" }).click();
  await expect(form).toHaveCount(0);
  await expect(rows()).toHaveCount(6);
  expect((await order()).at(-1)).toBe("Peonies are here");

  // Moved up to the first place, by its buttons.
  for (let i = 0; i < 5; i += 1) await own.getByRole("button", { name: "Move up: Peonies are here" }).click();
  await expect.poll(order).toEqual(["Peonies are here", ...designed]);
  await expect(own.getByText("Order saved")).toBeVisible();

  // The last of the template's removed.
  own.once("dialog", (d) => void d.accept());
  await own.getByRole("button", { name: `Remove ${designed.at(-1)}` }).click();
  await expect(rows()).toHaveCount(5);
  await expect.poll(order).toEqual(["Peonies are here", ...designed.slice(0, -1)]);

  // Kept after a reload.
  await own.reload();
  await expect.poll(order).toEqual(["Peonies are here", ...designed.slice(0, -1)]);
});

interface Node {
  id: string;
  type: string;
  text?: string;
  story_part?: string;
  action?: { type: string; screen?: string; category_id?: string } | null;
  children?: Node[];
  slides?: { heading: string | null; title?: string; button_label?: string; action?: Node["action"] }[];
  stories_source?: string;
}

const all = (n: Node): Node[] => [n, ...(n.children ?? []).flatMap(all)];

/** The home page as the app gets it, in a language. */
async function home(request: APIRequestContext, lang: string): Promise<Node> {
  const headers = { "x-yallapp-preview": previewToken, "accept-language": lang };
  const nav = await request.get(`${api}/pages?platform=android`, { headers });
  expect(nav.status()).toBe(200);
  const tabs = ((await nav.json()) as { tabs: { target?: { page_slug?: string } }[] }).tabs;
  const slug = tabs.find((t) => t.target?.page_slug)!.target!.page_slug!;
  const res = await request.get(`${api}/pages/${slug}?platform=android`, { headers });
  expect(res.status()).toBe(200);
  return ((await res.json()) as { studio: { body: Node } }).studio.body;
}

test("the app's page JSON shows the stories in English, Arabic and Turkish, the button opening the category", async ({ request }) => {
  for (const [lang, title, ring, button] of [
    ["en", "Peonies are here", "Peonies", "See peonies"],
    ["ar", "وصلت الفاوانيا", "فاوانيا", "شوف الفاوانيا"],
    // No Turkish button: the main language's.
    ["tr", "Şakayıklar geldi", "Şakayık", "See peonies"],
  ] as const) {
    const body = await home(request, lang);
    const slider = all(body).find((n) => n.type === "slider" && n.stories_source === "dashboard")!;
    expect(slider.children).toHaveLength(5);
    const first = all(slider.children![0]!);
    expect(first.find((n) => n.story_part === "title")?.text).toBe(title);
    expect(first.find((n) => n.story_part === "kicker")?.text).toBe("Just in");
    expect(first.find((n) => n.story_part === "button")).toMatchObject({ text: button, action: { type: "screen", screen: "courses", category_id: roses } });
    const rings = all(body).find((n) => n.type === "stories")!.slides!;
    expect(rings).toHaveLength(5);
    expect(rings[0]).toMatchObject({ heading: ring, title, button_label: button, action: { type: "screen", screen: "courses", category_id: roses } });
  }
});

test("Studio draws the dashboard's stories, and says where they come from", async () => {
  await own.goto("/studio/editor");
  const phone = own.getByRole("main", { name: "The page in the phone" });
  await expect(phone.getByText("Peonies are here").first()).toBeVisible();
  await expect(phone.getByText("Peonies", { exact: true }).first()).toBeVisible();
  // The hero's slider: its stories from Dashboard › Stories, with the link and the switch.
  await own.locator("[data-studio-layer]").filter({ hasText: "Every occasion" }).first().click();
  const inspector = own.getByRole("complementary", { name: "Design" });
  await expect(inspector.getByText("These stories come from Dashboard › Stories.")).toBeVisible();
  await expect(inspector.getByRole("link", { name: "Open Stories" })).toHaveAttribute("href", "/studio/project/stories");
  await expect(inspector.getByLabel("Stories from")).toHaveValue("dashboard");
  // As designed: the template's own again on the canvas.
  await inspector.getByLabel("Stories from").selectOption("studio");
  await expect(phone.getByText("Peonies are here")).toHaveCount(0);
  await inspector.getByLabel("Stories from").selectOption("dashboard");
  await expect(phone.getByText("Peonies are here").first()).toBeVisible();
});

test("189 once Stories are saved: a click on a slide lists the slides, says they're changed in Stories, and the arrows go through them", async () => {
  await own.goto("/studio/editor");
  const phone = own.getByRole("main", { name: "The page in the phone" });
  const inspector = own.getByRole("complementary", { name: "Design" });
  // A click on a slide's words on the canvas (not the slider in the layers): the slides on the right, and the way to Stories.
  await phone.getByText("Peonies are here").first().click();
  const list = inspector.locator("[data-studio-slider-slides]");
  await expect(list).toContainText(/Slides \(\d+\)/);
  await expect(list.locator('[data-studio-slide-row][aria-current="true"]')).toHaveCount(1);
  const note = inspector.locator("[data-studio-story-slides]");
  await expect(note).toContainText("change each slide's picture, words and button in Stories");
  await expect(note.getByRole("link", { name: "Edit the slides in Stories" })).toHaveAttribute("href", "/studio/project/stories");
  // On the canvas too: the way to Stories, which slide this is, and the next one.
  await expect(phone.locator("[data-studio-edit-stories]").first()).toHaveAttribute("href", "/studio/project/stories");
  const of = phone.locator("[data-studio-slide-of]").first();
  await expect(of).toHaveText(/^Slide \d+ of \d+$/);
  const before = (await of.textContent())!;
  await phone.getByRole("button", { name: "Next slide" }).first().click();
  await expect(of).not.toHaveText(before);
  await expect(of).toHaveText(/^Slide \d+ of \d+$/);
  // The slider itself selected: its slides, none of them open.
  await own.locator("[data-studio-layer]").filter({ hasText: "Every occasion" }).first().click();
  await expect(list.locator('[data-studio-slide-row][aria-current="true"]')).toHaveCount(0);
  await expect(note).toBeVisible();
});
