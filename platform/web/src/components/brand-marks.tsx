import type { CSSProperties } from "react";
import { STORES, TRADEMARK_NOTE, WHATSAPP_MARK, WORKS_WITH_ROWS, type Brand, type BrandMark } from "@/lib/brands";
import type { AppStore } from "@/lib/stores";
import { DEFAULT_LANG, messagesFor, type Lang } from "@/i18n";

/**
 * 41 Third-party brand marks, the only icons on the site that aren't Material
 * Symbols (docs/BRAND.md): the "Works with" strip and the store marks on the
 * plans. Each mark is an image with the brand's name as its accessible name.
 */

/** Relative luminance of a "#rrggbb" color (WCAG). */
function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
}

/** The hover colors: the brand's own, unless it would vanish on the light (or dark) page. */
export function brandColors(mark: BrandMark): CSSProperties {
  const l = luminance(mark.hex);
  return { "--brand": l > 0.6 ? "var(--color-midnight)" : mark.hex, "--brand-dark": l < 0.07 ? "#f4efe6" : mark.hex } as CSSProperties;
}

/** A mark at a height; wide wordmarks are drawn lower so they don't tower over the square marks. */
export function MarkSvg({ mark, height }: { mark: BrandMark; height: number }) {
  const h = mark.ratio > 2 ? Math.round(height * 0.62) : height;
  return (
    <svg aria-hidden="true" focusable="false" viewBox={mark.viewBox} width={Math.round(h * mark.ratio)} height={h}>
      <path d={mark.path} />
    </svg>
  );
}

/**
 * WhatsApp's mark in the text color, on a button or link that opens a chat
 * with Yallapp on WhatsApp. Decorative: the button's text says "WhatsApp".
 */
export function WhatsAppMark({ size = 20, className = "" }: { size?: number; className?: string }) {
  return (
    <svg aria-hidden="true" focusable="false" viewBox={WHATSAPP_MARK.viewBox} width={size} height={size} fill="currentColor" className={`flex-none ${className}`} data-whatsapp-mark="">
      <path d={WHATSAPP_MARK.path} />
    </svg>
  );
}

/** One brand in the strip: its mark and name, or its name alone when there is no mark to show. */
export function BrandChip({ brand }: { brand: Brand }) {
  return (
    <span role="img" aria-label={brand.name} data-brand={brand.id} className="brand-chip" style={brand.mark ? brandColors(brand.mark) : undefined}>
      {brand.mark ? <MarkSvg mark={brand.mark} height={brand.wordmark ? 30 : 24} /> : null}
      {brand.wordmark ? null : <span aria-hidden="true">{brand.label ?? brand.name}</span>}
    </span>
  );
}

/**
 * 41 "Works with": the stores, payments and messaging in one row, the
 * platforms in another, each scrolling slowly (still and wrapped for people
 * who prefer less motion). Not "partners": Yallapp has no agreement with
 * these companies, and the small print says so.
 */
export function WorksWithStrip({ headingLevel = 2, lang = DEFAULT_LANG }: { headingLevel?: 2 | 3; lang?: Lang }) {
  const Heading = headingLevel === 2 ? "h2" : "h3";
  // 55 The strip's words in the page's language; the brands keep their names.
  const m = messagesFor(lang).worksWith;
  const rowLabel: Record<string, string> = { stores: m.storesRow, platforms: m.platformsRow };
  return (
    <div className="flex flex-col gap-7" data-works-with="">
      <div className="mx-auto flex max-w-[640px] flex-col items-center gap-2 px-4 text-center">
        <span className="text-[13px] font-bold tracking-[1px] text-accent uppercase">{m.eyebrow}</span>
        <Heading id="works-with-title" className="m-0 text-[26px] leading-tight font-extrabold tracking-[-0.5px] text-balance sm:text-[32px]">
          {m.title}
        </Heading>
      </div>
      <div className="flex flex-col gap-3">
        {WORKS_WITH_ROWS.map((row, index) => (
          <div
            key={row.id}
            className={`marquee ${index % 2 === 1 ? "marquee-reverse" : ""}`}
            style={{ "--marquee-duration": `${row.brands.length * 4}s` } as CSSProperties}
          >
            <div className="marquee-track">
              <ul aria-label={rowLabel[row.id] ?? row.label} className="marquee-list">
                {row.brands.map((brand) => (
                  <li key={brand.id}>
                    <BrandChip brand={brand} />
                  </li>
                ))}
              </ul>
              <ul aria-hidden="true" className="marquee-list">
                {row.brands.map((brand) => (
                  <li key={brand.id}>
                    <BrandChip brand={brand} />
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </div>
      <p className="m-0 px-4 text-center text-xs text-muted">{lang === "en" ? TRADEMARK_NOTE : m.trademarks}</p>
    </div>
  );
}

/** 41 Store marks in a row, each named for assistive technology and on hover. */
export function StoreMarks({
  stores,
  label,
  size = 20,
  tone = "light",
  className = "",
}: {
  stores: AppStore[];
  label: string;
  size?: number;
  /** "dark" on the footer and other dark bands. */
  tone?: "light" | "dark";
  className?: string;
}) {
  return (
    <ul aria-label={label} className={`m-0 flex list-none flex-wrap items-center p-0 ${size <= 16 ? "gap-1" : "gap-1.5"} ${className}`}>
      {stores.map((id) => {
        const store = STORES[id];
        return (
          <li key={id} className="flex">
            <span
              role="img"
              aria-label={store.name}
              title={store.name}
              data-store={id}
              className={`store-mark flex items-center justify-center rounded-lg border ${store.mark!.ratio > 2 ? "px-1.5" : "px-2"} ${tone === "dark" ? "border-night-line bg-night-2 text-night-text" : "border-line bg-white text-ink-3"}`}
              style={{ ...brandColors(store.mark!), height: size + 14, minWidth: size + 14, paddingInline: size <= 16 ? 6 : undefined }}
            >
              <MarkSvg mark={store.mark!} height={size} />
            </span>
          </li>
        );
      })}
    </ul>
  );
}

/** 41 A store's mark beside its name, as in the pricing table's rows. */
export function StoreName({ id, size = 18 }: { id: AppStore; size?: number }) {
  const store = STORES[id];
  return (
    <span className="store-mark inline-flex items-center gap-2.5 text-ink-3" style={brandColors(store.mark!)}>
      <MarkSvg mark={store.mark!} height={size} />
      <span className="text-midnight">{store.name}</span>
    </span>
  );
}
