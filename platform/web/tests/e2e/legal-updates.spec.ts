import { expect, test, type Page } from "@playwright/test";
import { LEGAL_HISTORY } from "../../src/content/legal-history";
import { E2E } from "../../playwright.config";

/**
 * 172 The team's saved privacy policy, from before Yallapp's default text
 * changed on 18 November 2026 (Phase 106.11): Admin › Website content says
 * so, shows the changes, adds the new text to the team's own text, and once
 * the team saves, /privacy shows the new sentences, in English, Arabic and
 * Turkish. 106.14 changed it again on 23 November 2026 (a designer's public
 * page and the ratings): the notice gives the latest date and those changes too.
 */
test.describe.configure({ mode: "serial" });

const LANGS = ["en", "ar", "tr"] as const;
type Lang = (typeof LANGS)[number];
const NAMES: Record<Lang, string> = { en: "English", ar: "Arabic", tr: "Turkish" };

/** The three sentences 18 November 2026 added, by language (one of each section 2, 6 and 8). */
const NEW_SENTENCES: Record<Lang, string[]> = {
  en: [
    "We use these details only to verify your identity and to pay out your earnings.",
    "We send the transfer details to our bank only to pay out designers' earnings.",
    "we delete the copy of the ID and the verification details when the account is closed.",
  ],
  ar: ["نستخدم هذه البيانات فقط للتحقق من هويتك وتحويل أرباحك.", "نرسل بيانات التحويل إلى بنكنا لإتمام تحويل أرباح المصممين فقط.", "ونحذف صورة الهوية وبيانات التحقق عند إغلاق الحساب."],
  tr: [
    "Bu bilgileri yalnızca kimliğinizi doğrulamak ve kazançlarınızı ödemek için kullanırız.",
    "Ödeme bilgilerini bankamıza yalnızca tasarımcıların kazançlarının ödemesini tamamlamak için göndeririz.",
    "kimlik kopyasını ve doğrulama bilgilerini hesap kapatıldığında sileriz.",
  ],
};

/** The team's own sentence in its saved version, which must stay. */
const OWN: Record<Lang, string> = {
  en: "Our own note: this page was reviewed by our lawyer.",
  ar: "ملاحظتنا: راجع محامينا هذه الصفحة.",
  tr: "Kendi notumuz: bu sayfayı avukatımız inceledi.",
};

/** The privacy policy's default as it was before 18 November 2026. */
function before18(lang: Lang) {
  const versions = LEGAL_HISTORY[lang === "en" ? "privacy" : `privacy@${lang}`]!;
  return versions.filter((v) => Date.parse(v.since) < Date.parse("2026-11-18T00:00:00Z")).at(-1)!;
}

let admin: Page;

test.beforeAll(async ({ browser }) => {
  admin = await browser.newPage();
  await admin.goto("/sign-in");
  await admin.getByLabel("Email").fill(E2E.legalUpdatesAdminEmail);
  await admin.getByLabel("Password", { exact: true }).fill(E2E.adminPassword);
  await admin.getByRole("button", { name: "Sign in" }).click();
  await admin.waitForURL((url) => url.pathname.startsWith("/admin"));
});

test.afterAll(async () => {
  await admin?.close();
});

for (const lang of LANGS) {
  const editor = `/admin/content/privacy${lang === "en" ? "" : `?lang=${lang}`}`;
  const publicPath = lang === "en" ? "/privacy" : `/${lang}/privacy`;
  const name = lang === "en" ? "Privacy policy" : `Privacy policy (${NAMES[lang]})`;

  test(`172 a saved privacy policy without the new text: the notice, the changes, adding them and /privacy (${lang})`, async ({ page }) => {
    const old = before18(lang);
    const own = old.body.replace(/\n## 2\./, `\n${OWN[lang]}\n\n## 2.`);

    // The team's version, saved as before bases were recorded (the form's base taken out): the default before 18 November with its own sentence.
    await admin.goto(editor);
    await expect(admin.locator("[data-legal-update]")).toHaveCount(0);
    await admin.getByLabel("Last updated").fill(old.updated);
    await admin.getByLabel("Text", { exact: true }).fill(own);
    await admin.locator('input[name="base"]').evaluate((input) => input.remove());
    await admin.getByRole("button", { name: "Save and publish" }).click();
    await expect(admin.getByRole("status").filter({ hasText: `${name} saved.` })).toBeVisible();

    // The website shows the team's version, without the new sentences.
    await page.goto(publicPath);
    await expect(page.locator("main")).toContainText(OWN[lang]);
    for (const s of NEW_SENTENCES[lang]) await expect(page.locator("main")).not.toContainText(s);

    // Website content says the default changed, for this language.
    await admin.goto("/admin/content");
    await expect(admin.getByRole("row", { name: /Privacy policy/ }).getByText(`Default updated (${NAMES[lang]})`)).toBeVisible();

    await admin.goto(editor);
    const notice = admin.locator("[data-legal-update]");
    // 106.14 changed it again on 23 November 2026 (the designer's public page and the ratings); the November site audit on 28 November: the latest date.
    await expect(notice).toContainText("Yallapp's default text for this page was updated on 28 November 2026. Your saved version doesn't have the changes.");

    // Review the changes: 18 November's new list item and two changed paragraphs, 23 November's two new list items,
    // and the November site audit's (28 November) new and changed paragraphs; none in the team's version yet.
    await notice.getByRole("button", { name: "Review the changes" }).click();
    const changes = admin.getByRole("list", { name: "What the default added or changed" }).getByRole("listitem");
    await expect(changes).toHaveCount(8);
    await expect(changes.filter({ hasText: "New paragraph" })).toHaveCount(5);
    await expect(changes.filter({ hasText: "Changed paragraph" })).toHaveCount(3);
    for (const s of NEW_SENTENCES[lang]) {
      const item = changes.filter({ hasText: s }).first();
      await expect(item).toContainText("Not in your version");
    }
    await expect(changes.filter({ hasText: NEW_SENTENCES[lang][1]! }).first().locator("ins").filter({ hasText: NEW_SENTENCES[lang][1]! })).toHaveCount(1);

    // Add the new text: in the form only, at the places the default has it, the team's sentence kept.
    await notice.getByRole("button", { name: "Add the new text" }).click();
    await expect(notice.getByRole("status").filter({ hasText: "Nothing is published until you save." })).toBeVisible();
    const text = admin.getByLabel("Text", { exact: true });
    for (const s of NEW_SENTENCES[lang]) await expect(text).toHaveValue(new RegExp(s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    await expect(text).toHaveValue(new RegExp(OWN[lang].replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    await expect(admin.getByLabel("Last updated")).toHaveValue(/28/);
    // Not published yet.
    await page.goto(publicPath);
    await expect(page.locator("main")).not.toContainText(NEW_SENTENCES[lang][1]!);

    await admin.getByRole("button", { name: "Save and publish" }).click();
    await expect(admin.getByRole("status").filter({ hasText: `${name} saved.` })).toBeVisible();
    await expect(admin.locator("[data-legal-update]")).toHaveCount(0);
    // The saved version now records the default it's based on: no notice after a reload either.
    await admin.reload();
    await expect(admin.locator("[data-legal-update]")).toHaveCount(0);

    // /privacy shows the new sentences, the team's own one and the new date.
    await page.goto(publicPath);
    const main = page.locator("main");
    for (const s of NEW_SENTENCES[lang]) await expect(main).toContainText(s);
    await expect(main).toContainText(OWN[lang]);
    await expect(main).toContainText(/28/);
    // 106.14 What the designer's page and the ratings make public.
    await expect(main).toContainText("yallapp.com.tr/designers/");

    // Back to the default text, for the other specs.
    await admin.getByRole("button", { name: "Back to the default text" }).click();
    await expect(admin.getByRole("status").filter({ hasText: "Back to the default text." })).toBeVisible();
  });
}

test("172 new text that can't be placed is highlighted, and the save is refused until the team moves it", async () => {
  const old = before18("en");
  // The team rewrote section 6 entirely: the new sentence has no place to go.
  const own = old.body.replace(/(## 6\. Who we share it with\n\n)[^\n]+/, "$1Our providers are listed on request.");
  await admin.goto("/admin/content/privacy");
  await admin.getByLabel("Text", { exact: true }).fill(own);
  await admin.locator('input[name="base"]').evaluate((input) => input.remove());
  await admin.getByRole("button", { name: "Save and publish" }).click();
  await expect(admin.getByRole("status").filter({ hasText: "Privacy policy saved." })).toBeVisible();

  await admin.goto("/admin/content/privacy");
  const notice = admin.locator("[data-legal-update]");
  await notice.getByRole("button", { name: "Add the new text" }).click();
  await expect(notice.getByRole("alert")).toContainText("couldn't be placed");
  const text = admin.getByLabel("Text", { exact: true });
  await expect(text).toHaveValue(/==== New text from Yallapp's default: move it to its place, then delete this line ====/);
  await admin.getByRole("button", { name: "Save and publish" }).click();
  await expect(admin.getByText("Move the new text between the ==== lines to its place, then delete the two ==== lines.")).toBeVisible();

  // The team takes the two lines out (keeping the sentence where the block was) and saves.
  const value = await text.inputValue();
  await text.fill(value.replace(/==== New text[^\n]*====\n\n/, "").replace(/\n\n==== End of the new text[^\n]*====/, ""));
  await admin.getByRole("button", { name: "Save and publish" }).click();
  await expect(admin.getByRole("status").filter({ hasText: "Privacy policy saved." })).toBeVisible();
  await admin.reload();
  await expect(admin.locator("[data-legal-update]")).toHaveCount(0);

  await admin.getByRole("button", { name: "Back to the default text" }).click();
  await expect(admin.getByRole("status").filter({ hasText: "Back to the default text." })).toBeVisible();
});
