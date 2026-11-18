// Phase 184 contact screens. Renders every screen to PNG at deviceScaleFactor 2: phones 390×844, the dashboard 1440×1024,
// each in English and Arabic, light and dark.
//   node docs/design/2026-11-18-contact/render.mjs [screen-prefix…]
// Icons come from Google Fonts (Material Symbols Rounded). Set MSR_WOFF2 to a local copy of
// that font to render offline.
import { createRequire } from "node:module";
import { readdirSync, readFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const here = dirname(fileURLToPath(import.meta.url));
const screens = join(here, "screens");
const out = join(here, "png");
mkdirSync(out, { recursive: true });

const only = process.argv.slice(2);
const files = readdirSync(screens).filter((f) => f.endsWith(".html") && (!only.length || only.some((p) => f.startsWith(p))));
const font = process.env.MSR_WOFF2 && existsSync(process.env.MSR_WOFF2) ? readFileSync(process.env.MSR_WOFF2) : null;

const browser = await chromium.launch();
for (const file of files) {
  const html = readFileSync(join(screens, file), "utf8");
  const wide = /data-size="dashboard"/.test(html);
  const variants = (/data-variants="([^"]+)"/.exec(html)?.[1] ?? "").split(",").filter(Boolean);
  const viewport = wide ? { width: 1440, height: 1024 } : { width: 390, height: 844 };
  for (const variant of variants.length ? variants : [""]) {
    for (const lang of ["en", "ar"]) {
      for (const theme of ["light", "dark"]) {
        const page = await browser.newPage({ viewport, deviceScaleFactor: 2 });
        if (font) {
          await page.route(/fonts\.googleapis\.com/, (r) =>
            r.fulfill({ contentType: "text/css", body: `@font-face{font-family:'Material Symbols Rounded';font-style:normal;font-weight:100 700;src:url(https://fonts.gstatic.com/msr.woff2) format('woff2');}` }));
          await page.route(/fonts\.gstatic\.com/, (r) => r.fulfill({ contentType: "font/woff2", body: font }));
        }
        const url = pathToFileURL(join(screens, file)).href + `?lang=${lang}&theme=${theme}${variant ? `&v=${variant}` : ""}`;
        await page.goto(url);
        await page.waitForSelector("body[data-ready='1']", { timeout: 20000 });
        await page.waitForTimeout(150);
        const name = file.replace(/\.html$/, "") + (variant ? `-${variant}` : "") + `-${lang}-${theme}.png`;
        await page.screenshot({ path: join(out, name) });
        await page.close();
        console.log(name);
      }
    }
  }
}
await browser.close();
