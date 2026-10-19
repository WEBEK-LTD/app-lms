// 43 Copies the app's interface strings (mobile/lib/l10n/app_*.arb) into
// src/lib/i18n/app-strings.json, for the dashboard's Translations page: each
// key with its English text, Yallapp's Arabic and Turkish, its description
// and its placeholders. Netlify builds the platform without the mobile
// folder, so the copy is committed; tests/unit/translations.test.ts fails
// when it's out of date. Run: node scripts/app-strings.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
export const ARB_DIR = join(here, "../../../mobile/lib/l10n");
export const OUT = join(here, "../src/lib/i18n/app-strings.json");

/** The JSON the platform keeps, from the ARB files. */
export function appStringsJson(arbDir = ARB_DIR) {
  const read = (code) => JSON.parse(readFileSync(join(arbDir, `app_${code}.arb`), "utf8"));
  const en = read("en");
  const ar = read("ar");
  const tr = read("tr");
  const strings = [];
  for (const [key, text] of Object.entries(en)) {
    if (key.startsWith("@")) continue;
    const meta = en[`@${key}`] ?? {};
    const placeholders = {};
    for (const [name, p] of Object.entries(meta.placeholders ?? {})) placeholders[name] = p.type ?? "String";
    strings.push({
      key,
      en: text,
      ar: ar[key] ?? null,
      tr: tr[key] ?? null,
      ...(meta.description ? { description: meta.description } : {}),
      ...(Object.keys(placeholders).length ? { placeholders } : {}),
    });
  }
  return `${JSON.stringify({ strings }, null, 0).replace(/\},\{"key"/g, '},\n{"key"')}\n`;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  writeFileSync(OUT, appStringsJson());
  console.log(`Wrote ${OUT}`);
}
