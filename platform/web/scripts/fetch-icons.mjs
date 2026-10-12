// Downloads a subset of Google Material Symbols (Rounded) that contains only the
// icons listed in src/components/icon-names.ts, and saves it to
// src/app/fonts/material-symbols-rounded.woff2 so the site self-hosts it.
//
// The full variable font is over 5 MB; the subset is a few kilobytes.
// Run it after adding an icon name to the list: `node scripts/fetch-icons.mjs`.
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const source = await readFile(path.join(root, "src/components/icon-names.ts"), "utf8");
const list = source.slice(source.indexOf("["), source.indexOf("]"));
const names = [...list.matchAll(/"([a-z0-9_]+)"/g)].map((match) => match[1]);
const sorted = [...new Set(names)].sort();

// Optical size 20..48, weight 400, fill 0..1, grade 0.
const cssUrl =
  "https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@20..48,400,0..1,0" +
  `&icon_names=${sorted.join(",")}&display=block`;

const userAgent =
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0 Safari/537.36";
const css = await (await fetch(cssUrl, { headers: { "user-agent": userAgent } })).text();
const match = css.match(/url\((https:[^)]+)\)\s*format\('woff2'\)/);
if (!match) {
  console.error(css);
  throw new Error("No woff2 URL in the Google Fonts response");
}
const font = Buffer.from(await (await fetch(match[1])).arrayBuffer());
const outDir = path.join(root, "src/app/fonts");
await mkdir(outDir, { recursive: true });
await writeFile(path.join(outDir, "material-symbols-rounded.woff2"), font);
console.log(`Saved ${sorted.length} icons, ${font.length} bytes`);
