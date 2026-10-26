// 97.1 Makes src/lib/fonts/google-fonts.json, the free fonts clients can
// choose, from a checkout of github.com/google/fonts (only its METADATA.pb
// files are needed):
//
//   git clone --depth 1 --filter=blob:none --no-checkout https://github.com/google/fonts gfonts
//   cd gfonts && git sparse-checkout init --no-cone
//   printf '/ofl/*/METADATA.pb\n/apache/*/METADATA.pb\n/ufl/*/METADATA.pb\n' > .git/info/sparse-checkout
//   git checkout main && cd ..
//   node scripts/google-fonts.mjs gfonts
//
// Each family keeps its folder, the commit the files are read at (so a file
// never changes under an app), its category, whether it draws Arabic, and its
// upright files: one variable file, or one file per weight (400 to 700).
// Icon and emoji fonts are left out, and so are families with a file over
// 5 MB (a Yallapp function answers at most 6 MB; the sizes are read from
// raw.githubusercontent.com at that commit, which takes a few minutes).
import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync, existsSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const OUT = join(here, "../src/lib/fonts/google-fonts.json");
const WEIGHTS = [400, 500, 600, 700];
const MAX_FILE_BYTES = 5 * 1024 * 1024;
const CATEGORIES = { SANS_SERIF: "sans", SERIF: "serif", DISPLAY: "display", HANDWRITING: "handwriting", MONOSPACE: "mono" };

/** The values of `key: "value"` lines at the top level of a METADATA.pb (nested blocks skipped). */
function topLevel(text, key) {
  const out = [];
  let depth = 0;
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (trimmed.endsWith("{")) depth++;
    else if (trimmed === "}") depth--;
    else if (depth === 0) {
      const m = new RegExp(`^${key}: "?([^"]*)"?$`).exec(trimmed);
      if (m) out.push(m[1]);
    }
  }
  return out;
}

/** The `fonts { … }` blocks: style, weight and file of each. */
function fontFiles(text) {
  return [...text.matchAll(/^fonts \{([\s\S]*?)^\}/gm)].map((m) => ({
    style: /style: "([^"]+)"/.exec(m[1])?.[1],
    weight: Number(/weight: (\d+)/.exec(m[1])?.[1]),
    file: /filename: "([^"]+)"/.exec(m[1])?.[1],
  }));
}

export function familyFrom(dir, text) {
  const name = topLevel(text, "name")[0];
  if (!name || /icons|symbols|emoji/i.test(name)) return null;
  const upright = fontFiles(text).filter((f) => f.style === "normal" && f.file);
  if (upright.length === 0) return null;
  const subsets = topLevel(text, "subsets");
  // A family in several categories takes the most useful for an app's text.
  const listed = topLevel(text, "category");
  const category = CATEGORIES[Object.keys(CATEGORIES).find((c) => listed.includes(c))] ?? "sans";
  const variable = upright.find((f) => f.file.includes("["));
  const family = { family: name, dir, category, arabic: subsets.includes("arabic") };
  if (variable) {
    // One file for every weight; a variable font without a weight axis still draws one.
    return { ...family, files: { variable: variable.file } };
  }
  const files = {};
  for (const weight of WEIGHTS) {
    const nearest = [...upright].sort((a, b) => Math.abs(a.weight - weight) - Math.abs(b.weight - weight) || a.weight - b.weight)[0];
    files[weight] = nearest.file;
  }
  return { ...family, files };
}

export function catalogFrom(root) {
  const families = [];
  for (const licence of ["ofl", "apache", "ufl"]) {
    const base = join(root, licence);
    if (!existsSync(base)) continue;
    for (const folder of readdirSync(base)) {
      const meta = join(base, folder, "METADATA.pb");
      if (!existsSync(meta)) continue;
      const family = familyFrom(`${licence}/${folder}`, readFileSync(meta, "utf8"));
      if (family) families.push(family);
    }
  }
  // One entry per family name (a few are in two folders): the first wins.
  const seen = new Set();
  return families
    .sort((a, b) => a.family.localeCompare(b.family, "en"))
    .filter((f) => (seen.has(f.family.toLowerCase()) ? false : seen.add(f.family.toLowerCase())));
}

/** Each file's size at the commit, from a HEAD request. */
async function sizes(commit, families) {
  const files = families.flatMap((f) => [...new Set(Object.values(f.files))].map((file) => `${f.dir}/${file}`));
  const out = new Map();
  let next = 0;
  async function worker() {
    while (next < files.length) {
      const path = files[next++];
      const url = `https://raw.githubusercontent.com/google/fonts/${commit}/${path.split("/").map(encodeURIComponent).join("/")}`;
      for (let attempt = 0; attempt < 3; attempt++) {
        const res = await fetch(url, { method: "HEAD" }).catch(() => null);
        if (res?.ok) {
          out.set(path, Number(res.headers.get("content-length")));
          break;
        }
      }
    }
  }
  await Promise.all(Array.from({ length: 16 }, worker));
  return out;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const root = process.argv[2];
  if (!root) {
    console.error("Usage: node scripts/google-fonts.mjs <checkout of github.com/google/fonts>");
    process.exit(1);
  }
  const commit = execFileSync("git", ["-C", root, "rev-parse", "HEAD"], { encoding: "utf8" }).trim();
  const found = await sizes(commit, catalogFrom(root));
  // Every file found and small enough to serve.
  const families = catalogFrom(root).filter((f) =>
    Object.values(f.files).every((file) => (found.get(`${f.dir}/${file}`) ?? Infinity) <= MAX_FILE_BYTES),
  );
  writeFileSync(OUT, `${JSON.stringify({ commit, families })}\n`);
  console.log(`${families.length} families at ${commit.slice(0, 12)} → ${OUT}`);
}
