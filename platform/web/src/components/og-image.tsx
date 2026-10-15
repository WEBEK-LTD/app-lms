import { readFile } from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";

/**
 * 32 The share image of yallapp.com.tr's pages (Open Graph and Twitter cards):
 * the wordmark, the page's title and one line, in Yallapp's colors
 * (docs/BRAND.md), in Bricolage Grotesque (static instances in
 * src/app/fonts/og, OFL; the image renderer can't read variable fonts). If the
 * files can't be read, the image uses the renderer's default font.
 */

export const OG_SIZE = { width: 1200, height: 630 };
export const OG_CONTENT_TYPE = "image/png";

const MIDNIGHT = "#0E0D24";
const IVORY = "#F4EFE6";
const EMBER = "#FF5A1F";
const NIGHT_TEXT = "#C9C6DC";

type Weight = 500 | 800;
const FONT_FILES: Record<Weight, string> = { 500: "BricolageGrotesque-Medium.ttf", 800: "BricolageGrotesque-ExtraBold.ttf" };

async function brandFonts(): Promise<{ name: string; data: ArrayBuffer; weight: Weight; style: "normal" }[] | undefined> {
  try {
    return await Promise.all(
      ([500, 800] as const).map(async (weight) => {
        const file = await readFile(path.join(process.cwd(), "src/app/fonts/og", FONT_FILES[weight]));
        return { name: "Bricolage Grotesque", data: file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength) as ArrayBuffer, weight, style: "normal" as const };
      }),
    );
  } catch {
    return undefined;
  }
}

/** Shorter titles get bigger type. */
function titleSize(title: string): number {
  return title.length <= 32 ? 76 : title.length <= 56 ? 64 : 52;
}

export async function ogImage({ eyebrow, title, text }: { eyebrow?: string; title: string; text?: string }): Promise<ImageResponse> {
  const fonts = await brandFonts();
  const clipped = text && text.length > 150 ? `${text.slice(0, 147).trimEnd()}…` : text;
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: MIDNIGHT,
          color: IVORY,
          padding: "64px 72px",
          fontFamily: fonts ? "Bricolage Grotesque" : undefined,
          fontWeight: 500,
        }}
      >
        <div style={{ display: "flex", alignItems: "baseline", fontSize: 52, fontWeight: 800, letterSpacing: -1 }}>
          <span>yallapp</span>
          <span style={{ color: EMBER }}>.</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
          {eyebrow ? (
            <div style={{ display: "flex" }}>
              <span style={{ display: "flex", background: IVORY, color: MIDNIGHT, borderRadius: 999, padding: "8px 20px", fontSize: 26, fontWeight: 800 }}>{eyebrow}</span>
            </div>
          ) : null}
          <div style={{ display: "flex", fontSize: titleSize(title), lineHeight: 1.08, fontWeight: 800, letterSpacing: -1.5, maxWidth: 1000 }}>{title}</div>
          {clipped ? <div style={{ display: "flex", fontSize: 28, lineHeight: 1.4, color: NIGHT_TEXT, maxWidth: 960 }}>{clipped}</div> : null}
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 24, color: NIGHT_TEXT }}>
          <span>Branded Android and iOS apps for your business</span>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ display: "flex", width: 14, height: 14, borderRadius: 7, background: EMBER }} />
            <span style={{ color: IVORY }}>yallapp.com.tr</span>
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
