import { readFile } from "node:fs/promises";
import path from "node:path";
import type { CSSProperties, ReactNode } from "react";
import { ImageResponse } from "next/og";
import { DEFAULT_LANG, messagesFor, type Lang } from "@/i18n";
import { rtlWords } from "@/lib/arabic-shape";

/**
 * 32 The share image of yallapp.com.tr's pages (Open Graph and Twitter cards):
 * the wordmark, the page's title and one line, in Yallapp's colors
 * (docs/BRAND.md), in Bricolage Grotesque (static instances in
 * src/app/fonts/og, OFL; the image renderer can't read variable fonts). If the
 * files can't be read, the image uses the renderer's default font.
 * 55 In Arabic and Turkish too: Arabic pages add IBM Plex Sans Arabic (OFL)
 * and lay their text out right to left (lib/arabic-shape.ts).
 */

export const OG_SIZE = { width: 1200, height: 630 };
export const OG_CONTENT_TYPE = "image/png";

const MIDNIGHT = "#0E0D24";
const IVORY = "#F4EFE6";
const EMBER = "#FF5A1F";
const NIGHT_TEXT = "#C9C6DC";

type Weight = 500 | 800;
type Font = { name: string; data: ArrayBuffer; weight: Weight; style: "normal" };
const FONT_FILES: Record<string, Record<Weight, string>> = {
  "Bricolage Grotesque": { 500: "BricolageGrotesque-Medium.ttf", 800: "BricolageGrotesque-ExtraBold.ttf" },
  "IBM Plex Sans Arabic": { 500: "IBMPlexSansArabic-Medium.ttf", 800: "IBMPlexSansArabic-Bold.ttf" },
};

async function loadFonts(families: string[]): Promise<Font[] | undefined> {
  try {
    return await Promise.all(
      families.flatMap((name) =>
        ([500, 800] as const).map(async (weight) => {
          const file = await readFile(path.join(process.cwd(), "src/app/fonts/og", FONT_FILES[name]![weight]));
          return { name, data: file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength) as ArrayBuffer, weight, style: "normal" as const };
        }),
      ),
    );
  } catch {
    return undefined;
  }
}

/** Shorter titles get bigger type. */
function titleSize(title: string): number {
  return title.length <= 32 ? 76 : title.length <= 56 ? 64 : 52;
}

/** Text in a box: as it is, or for Arabic one word per item in a right-to-left row (the renderer only lays out left to right). */
function Text({ value, rtl, style, wrap = true }: { value: string; rtl: boolean; style: CSSProperties; wrap?: boolean }): ReactNode {
  if (!rtl) return <div style={{ display: "flex", ...style }}>{value}</div>;
  // 55 A short label stays on one line: a wrapping row would shrink to its widest word.
  return (
    <div style={{ display: "flex", flexWrap: wrap ? "wrap" : "nowrap", flexDirection: "row-reverse", columnGap: "0.27em", ...style }}>
      {rtlWords(value).map((word, i) => (
        <span key={i} style={{ display: "flex" }}>
          {word}
        </span>
      ))}
    </div>
  );
}

export async function ogImage({ eyebrow, title, text, lang = DEFAULT_LANG }: { eyebrow?: string; title: string; text?: string; lang?: Lang }): Promise<ImageResponse> {
  const rtl = lang === "ar";
  const fonts = await loadFonts(rtl ? ["IBM Plex Sans Arabic", "Bricolage Grotesque"] : ["Bricolage Grotesque"]);
  const family = fonts ? (rtl ? '"IBM Plex Sans Arabic", "Bricolage Grotesque"' : "Bricolage Grotesque") : undefined;
  // 55 Cut at a word, not inside one.
  const clipped = text && text.length > 150 ? `${text.slice(0, 147).replace(/\s+\S*$/, "").replace(/[,;:،]$/, "")}…` : text;
  const footer = messagesFor(lang).og.footer;
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          alignItems: rtl ? "flex-end" : "stretch",
          background: MIDNIGHT,
          color: IVORY,
          padding: "64px 72px",
          fontFamily: family,
          fontWeight: 500,
        }}
      >
        <div style={{ display: "flex", alignItems: "baseline", fontSize: 52, fontWeight: 800, letterSpacing: -1, fontFamily: fonts ? "Bricolage Grotesque" : undefined }}>
          <span>yallapp</span>
          <span style={{ color: EMBER }}>.</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: rtl ? "flex-end" : "stretch", gap: 22 }}>
          {eyebrow ? (
            <div style={{ display: "flex" }}>
              <span style={{ display: "flex", background: IVORY, color: MIDNIGHT, borderRadius: 999, padding: "8px 20px", fontSize: 26, fontWeight: 800 }}>
                <Text value={eyebrow} rtl={rtl} style={{}} wrap={false} />
              </span>
            </div>
          ) : null}
          <Text
            value={title}
            rtl={rtl}
            style={{ fontSize: titleSize(title), lineHeight: rtl ? 1.3 : 1.08, fontWeight: 800, letterSpacing: rtl ? 0 : -1.5, maxWidth: 1000 }}
          />
          {clipped ? <Text value={clipped} rtl={rtl} style={{ fontSize: 28, lineHeight: 1.45, color: NIGHT_TEXT, maxWidth: 960 }} /> : null}
        </div>
        <div style={{ display: "flex", flexDirection: rtl ? "row-reverse" : "row", alignItems: "center", justifyContent: "space-between", alignSelf: "stretch", fontSize: 24, color: NIGHT_TEXT }}>
          <Text value={footer} rtl={rtl} style={{}} wrap={false} />
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ display: "flex", width: 14, height: 14, borderRadius: 7, background: EMBER }} />
            <span style={{ color: IVORY, fontFamily: fonts ? "Bricolage Grotesque" : undefined }}>yallapp.com.tr</span>
          </div>
        </div>
      </div>
    ),
    {
      ...OG_SIZE,
      fonts,
    },
  );
}
