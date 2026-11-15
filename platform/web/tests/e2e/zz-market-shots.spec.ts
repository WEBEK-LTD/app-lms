import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { expect, test, type Browser, type Page } from "@playwright/test";
import { E2E } from "../../playwright.config";

// Temporary (not committed): screenshots of stage 1's screens after studio-market.spec.ts ran in the same server.
const OUT = "/tmp/claude-0/-home-user/79dd7bf6-1ec5-553b-bdbf-feab2c11c43f/scratchpad/market-build/stage1";
const CHECK = "/tmp/claude-0/-home-user/79dd7bf6-1ec5-553b-bdbf-feab2c11c43f/scratchpad/market-build/check";
test.describe.configure({ mode: "serial" });
const extraHTTPHeaders = { "x-forwarded-for": "198.51.100.232" };
const FINAL = process.env.SHOTS_FINAL === "1";
const ONLY = process.env.SHOTS_ONLY ?? "";

// The run's designer, from its mail (kept beside the pictures: a later run's setup empties the mail).
const SUFFIX = "/tmp/claude-0/-home-user/79dd7bf6-1ec5-553b-bdbf-feab2c11c43f/scratchpad/market-build/suffix.txt";
function suffix(): string {
  const dir = path.resolve(E2E.mailDir);
  for (const f of existsSync(dir) ? readdirSync(dir) : []) {
    const m = /market-designer-(\w+)@market\.test/.exec(readFileSync(path.join(dir, f), "utf8"));
    if (m) {
      writeFileSync(SUFFIX, m[1]!);
      return m[1]!;
    }
  }
  if (existsSync(SUFFIX)) return readFileSync(SUFFIX, "utf8").trim();
  throw new Error("no designer");
}

async function signIn(browser: Browser, email: string, password: string, o: { dark?: boolean; phone?: boolean } = {}): Promise<Page> {
  const ctx = await browser.newContext({ extraHTTPHeaders, viewport: o.phone ? { width: 390, height: 844 } : { width: 1440, height: 900 }, deviceScaleFactor: FINAL ? 2 : 1, colorScheme: o.dark ? "dark" : "light" });
  ctx.setDefaultTimeout(60_000);
  ctx.setDefaultNavigationTimeout(60_000);
  const p = await ctx.newPage();
  await p.goto("/sign-in");
  await p.getByLabel("Email").fill(email);
  await p.getByLabel("Password", { exact: true }).fill(password);
  await p.getByRole("button", { name: "Sign in" }).click();
  await p.waitForURL((u) => !u.pathname.startsWith("/sign-in"));
  return p;
}

async function shot(p: Page, name: string) {
  await p.waitForTimeout(1500);
  mkdirSync(FINAL ? OUT : CHECK, { recursive: true });
  await p.screenshot({ path: path.join(FINAL ? OUT : CHECK, `${name}.${FINAL ? "jpg" : "png"}`), fullPage: true, timeout: 120_000, ...(FINAL ? { type: "jpeg" as const, quality: 82 } : {}) });
}

async function language(p: Page, name: "العربية" | "English") {
  await p.goto("/dashboard/studio-market/mine");
  await p.getByRole("button", { name }).first().click();
  await expect(p.locator("html")).toHaveAttribute("dir", name === "English" ? "ltr" : "rtl");
}

test("prepare", async ({ browser }) => {
  test.skip(FINAL || process.env.SHOTS_PREPARE !== "1");
  const s = suffix();
  const dz = await signIn(browser, `market-designer-${s}@market.test`, "nur-market-strong-password-1");
  const own = await signIn(browser, `market-buyer-${s}@market.test`, "tulip-market-strong-password-1");
  // A second template, sent for review, for the queue's picture.
  await dz.goto("/designer/publish");
  await dz.getByRole("button", { name: "Save and continue" }).click();
  await expect(dz).toHaveURL(/id=/);
  const texts = dz.locator("#step-texts");
  await texts.getByRole("textbox", { name: "Title", exact: true }).fill("Bloom Grid");
  await texts.getByRole("textbox", { name: "Short line", exact: true }).fill("A calm shop with big pictures.");
  await texts.getByRole("textbox", { name: "Description", exact: true }).fill("Every screen of a flower shop, light and dark.");
  await texts.getByRole("button", { name: "Save and continue" }).click();
  await expect(texts.getByText("Saved.")).toBeVisible();
  for (const id of ["#step-screens", "#step-kinds", "#step-plans", "#step-after"]) {
    await dz.locator(id).getByRole("button", { name: "Save and continue" }).click();
    await expect(dz.locator(id).getByText("Saved.")).toBeVisible();
  }
  await dz.locator("#step-send").getByRole("checkbox", { name: /every photo, font and icon/ }).check();
  await dz.locator("#step-send").getByRole("button", { name: "Send for review" }).click();
  await expect(dz).toHaveURL(/sent=1/);
  // The buyer's template on an app again.
  await own.goto("/dashboard/studio-market/mine");
  await own.getByRole("button", { name: "Apply to an app" }).click();
  await expect(own.getByText(/Applied/)).toBeVisible();
  for (const p of [dz, own]) await p.context().close();
});

test("screens", async ({ browser }) => {
  test.setTimeout(1_700_000);
  const s = suffix();
  const buyer = [`market-buyer-${s}@market.test`, "tulip-market-strong-password-1"] as const;
  const seller = [`market-designer-${s}@market.test`, "nur-market-strong-password-1"] as const;
  // One fresh browser for each picture (large pictures at 2x stall when many pages stay open).
  const one = async (who: readonly [string, string], o: { dark?: boolean; phone?: boolean }, url: string, name: string, then?: (p: Page) => Promise<void>) => {
    if (ONLY && !ONLY.split(",").some((x) => name.startsWith(x))) return;
    console.log(new Date().toISOString(), name, "sign in");
    const p = await signIn(browser, ...who, o);
    console.log(new Date().toISOString(), name, "open");
    await p.goto(url);
    if (then) await then(p);
    console.log(new Date().toISOString(), name, "shot");
    await shot(p, name);
    await p.context().close();
  };
  const openTemplate = async (p: Page) => {
    await p.getByRole("link", { name: /Rose Atelier/ }).first().click();
    await expect(p).toHaveURL(/\/t\//);
  };
  const editTemplate = async (p: Page) => {
    await p.goto((await p.locator('a[href*="/designer/publish?id="]').first().getAttribute("href"))!);
  };
  const switchTo = async (name: "العربية" | "English") => {
    for (const who of [buyer, seller]) {
      const p = await signIn(browser, ...who);
      await language(p, name);
      await p.context().close();
    }
  };
  for (const lang of ["en", "ar"] as const) {
    if (lang === "ar") await switchTo("العربية");
    for (const dark of [false, true]) {
      const tag = `${lang}-${dark ? "dark" : "light"}`;
      await one(buyer, { dark }, "/dashboard/studio-market", `01-market-home-${tag}`);
      await one(buyer, { dark }, "/dashboard/studio-market", `02-template-${tag}`, openTemplate);
      await one(buyer, { dark }, "/dashboard/studio-market/mine", `04-my-templates-${tag}`);
      await one(seller, { dark }, "/designer/join", `05-become-designer-${tag}`);
      await one(seller, { dark }, "/designer/templates", `07-seller-templates-${tag}`);
      await one(seller, { dark }, "/designer/templates", `08-publish-${tag}`, editTemplate);
      if (lang === "en") await one([E2E.marketAdminEmail, E2E.adminPassword] as const, { dark }, "/admin/market", `11-admin-review-${tag}`);
      // Phones: the market, a template and My templates.
      if (dark === (lang === "ar")) {
        await one(buyer, { dark, phone: true }, "/dashboard/studio-market", `01-market-home-${tag}-phone`);
        await one(buyer, { dark, phone: true }, "/dashboard/studio-market", `02-template-${tag}-phone`, openTemplate);
        await one(buyer, { dark, phone: true }, "/dashboard/studio-market/mine", `04-my-templates-${tag}-phone`);
      }
    }
    if (lang === "ar") await switchTo("English");
  }
});
