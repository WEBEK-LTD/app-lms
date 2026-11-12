"use client";

import { useEffect } from "react";
import type { StudioNode } from "@/lib/pages/types";
import { eachNode } from "@/lib/studio/tree";

/**
 * 124.6 The fonts a Studio page is drawn in, on the canvas as in the app:
 * the look's font and every element's own (a template's Alexandria). The
 * app loads them from Yallapp (/api/v1/fonts); so does the canvas, under
 * their own names, once each. The project's own fonts come with their files.
 */

/** Families the browser draws without loading anything. */
const SYSTEM = new Set(["system-ui", "sans-serif", "serif", "monospace", "inherit"]);

/** Families added to the page (or being), by name. */
const added = new Map<string, Promise<void>>();

/** The families a page's elements name, with the look's. */
export function fontsOfPage(body: StudioNode | null | undefined, lookFont: string | null | undefined): string[] {
  const out = new Set<string>();
  if (lookFont) out.add(lookFont);
  if (body) eachNode(body, (n) => void (n.font?.family && out.add(n.font.family)));
  return [...out].filter((f) => !SYSTEM.has(f));
}

/** A font file's weights: a variable file draws them all. */
function weightsOf(url: string): string | undefined {
  return /\[wght|%5Bwght/i.test(url) ? "100 900" : undefined;
}

function addFace(family: string, url: string, weight?: number | null): Promise<void> {
  if (typeof FontFace === "undefined" || typeof document === "undefined") return Promise.resolve();
  const descriptors: FontFaceDescriptors = weight ? { weight: String(weight) } : weightsOf(url) ? { weight: weightsOf(url) } : {};
  return new FontFace(family, `url("${url}")`, descriptors)
    .load()
    .then((face) => void document.fonts.add(face))
    .catch(() => undefined);
}

/** A free font, asked of the catalog by its exact name. */
async function addFreeFont(family: string): Promise<void> {
  const found = await fetch(`/api/v1/fonts?${new URLSearchParams({ q: family, limit: "5" })}`)
    .then((r) => (r.ok ? (r.json() as Promise<{ fonts: { family: string; preview_url: string }[] }>) : { fonts: [] }))
    .catch(() => ({ fonts: [] as { family: string; preview_url: string }[] }));
  const font = found.fonts.find((f) => f.family.toLowerCase() === family.toLowerCase());
  if (font) await addFace(family, font.preview_url);
}

/** Loads the families on the page; `own` the project's own fonts with their files. */
export function useStudioFonts(families: readonly string[], own: readonly { family: string; files: readonly { weight: number | null; url: string }[] }[] = []): void {
  const key = families.join("\u0000");
  useEffect(() => {
    for (const family of key ? key.split("\u0000") : []) {
      if (added.has(family)) continue;
      const mine = own.find((f) => f.family === family);
      added.set(family, mine ? Promise.all(mine.files.map((f) => addFace(family, f.url, f.weight))).then(() => undefined) : addFreeFont(family));
    }
  }, [key, own]);
}
