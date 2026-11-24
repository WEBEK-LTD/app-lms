import type { Pickable, PickableEntry } from "@/lib/hosted/pages/pickable";
import { STUDIO_PRODUCT_LOOKS, type StudioNode, type StudioProductType } from "@/lib/pages/types";
import { APP_WORDS, type AppWordsLang } from "@/lib/studio/app-words";

/**
 * 228 Studio's canvas for the product page's elements (lib/pages/types.ts
 * STUDIO_PRODUCT_TYPES), drawn as the app draws them on a product page
 * (mobile/lib/modules/shared/pages/studio_product.dart): the shop's first
 * product (its photo, name, price, sale and specs) stands for the product
 * the page opens on; without one, a sample product in the canvas's
 * language, quieter, as the tech elements' samples.
 */

type Words = Record<keyof (typeof APP_WORDS)["en"], string>;
const wordsOf = (lang: string): Words => APP_WORDS[(lang in APP_WORDS ? lang : "en") as AppWordsLang];

export interface CanvasProduct {
  own: boolean;
  title: string;
  photos: (string | null)[];
  price: string;
  was: string | null;
  percentOff: number | null;
  rating: number;
  ratingCount: number;
  specs: { label: string; value: string }[];
  related: { title: string; price: string; imageUrl: string | null }[];
}

/** The product the canvas shows: the shop's first, with the others' photos after its own, else a sample. */
export function canvasProduct(pickable: Pickable, lang: string): CanvasProduct {
  const w = wordsOf(lang);
  const own = (pickable.items.products ?? []).filter((e) => e.title);
  const samples = pickable.samples?.[lang]?.products ?? pickable.samples?.en?.products ?? [];
  const list: PickableEntry[] = own.length ? own : samples;
  const first = list[0];
  const photos = list.map((e) => e.imageUrl ?? null).filter(Boolean).slice(0, 4);
  return {
    own: own.length > 0,
    title: (own.length ? first?.title : null) ?? w.pSampleTitle,
    photos: photos.length ? photos : [null, null, null],
    price: first?.sale?.now ?? first?.price ?? "1,250",
    was: first?.sale?.was ?? (own.length ? null : "1,490"),
    percentOff: first?.sale?.percentOff ?? (own.length ? null : 16),
    rating: first?.rating ?? 4.8,
    ratingCount: 126,
    specs: first?.specs?.length
      ? first.specs.map((s) => ({ label: s.label, value: s.value }))
      : [
          { label: w.pSampleMaterial, value: w.pSampleMaterialValue },
          { label: w.pSampleFit, value: w.pSampleFitValue },
          { label: w.pSampleCare, value: w.pSampleCareValue },
        ],
    related: list.slice(1, 7).map((e) => ({ title: e.title, price: e.sale?.now ?? e.price ?? "", imageUrl: e.imageUrl ?? null })),
  };
}

const palette = (dark: boolean, accent?: string | null, color?: string) => ({
  ink: color ?? (dark ? "#F3F1EE" : "#16130F"),
  muted: dark ? "#A9A39B" : "#6B645B",
  line: dark ? "#34302B" : "#E6E1DA",
  tint: dark ? "#221F1B" : "#F4F1EC",
  photo: dark ? "#2A2622" : "#ECE7E0",
  accent: accent ?? (dark ? "#F3F1EE" : "#16130F"),
});

function onAccent(hex: string): string {
  const v = hex.replace("#", "");
  if (v.length !== 6) return "#FFFFFF";
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(v.slice(i, i + 2), 16));
  return 0.299 * r! + 0.587 * g! + 0.114 * b! > 150 ? "#111111" : "#FFFFFF";
}

function Photo({ url, dark, radius = 0, style }: { url: string | null; dark: boolean; radius?: number; style?: React.CSSProperties }) {
  return <span style={{ display: "block", borderRadius: radius, background: url ? `center / cover no-repeat url("${url}")` : palette(dark).photo, ...style }} />;
}

function Stars({ rating, size, color }: { rating: number; size: number; color: string }) {
  return (
    <span aria-hidden style={{ display: "inline-flex", gap: 1, color }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} className="material-symbols-rounded" style={{ fontSize: size, fontVariationSettings: `'FILL' ${rating >= i - 0.25 ? 1 : 0}` }}>
          star
        </span>
      ))}
    </span>
  );
}

function Heading({ text, ink }: { text: string; ink: string }) {
  return <span style={{ fontWeight: 800, fontSize: 16, color: ink }}>{text}</span>;
}

export interface ProductPartProps {
  node: StudioNode;
  pickable: Pickable;
  dark: boolean;
  lang: string;
  brand: string;
  color?: string;
  /** Its own title (or Add to cart's words), in the canvas's language; empty, the app's. */
  title: string;
  /** Buy now's words, or the delivery element's own lines. */
  second: string;
}

export function ProductPartCanvas({ node, pickable, dark, lang, brand, color, title, second }: ProductPartProps) {
  const type = node.type as StudioProductType;
  const w = wordsOf(lang);
  const product = canvasProduct(pickable, lang);
  const look = node.product_part?.look ?? STUDIO_PRODUCT_LOOKS[type][0];
  const p = palette(dark, node.product_part?.accent ?? (type === "product_buy" ? brand : null), color);
  const quiet = product.own ? 1 : 0.7;
  const font = node.font ?? {};
  const mark = { "data-studio-product": type, "data-product-look": look } as const;
  switch (type) {
    case "product_gallery": {
      const radius = node.product_part?.radius ?? (look === "card" || look === "thumbs" ? 20 : 0);
      const ratio = node.aspect_ratio ?? (look === "pager" ? 1 : 4 / 5);
      if (look === "stacked")
        return (
          <span {...mark} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {product.photos.slice(0, 3).map((url, i) => (
              <Photo key={i} url={url} dark={dark} radius={radius} style={{ aspectRatio: `${ratio}` }} />
            ))}
          </span>
        );
      if (look === "thumbs")
        return (
          <span {...mark} style={{ display: "flex", flexDirection: "column", gap: 8, padding: "0 16px" }}>
            <Photo url={product.photos[0] ?? null} dark={dark} radius={radius} style={{ aspectRatio: `${ratio}` }} />
            <span style={{ display: "flex", gap: 8 }}>
              {product.photos.slice(0, 4).map((url, i) => (
                <Photo key={i} url={url} dark={dark} radius={Math.min(radius, 12)} style={{ width: 56, height: 56, outline: i === 0 ? `2px solid ${p.accent}` : undefined, outlineOffset: 2 }} />
              ))}
            </span>
          </span>
        );
      const dots = (
        <span style={{ position: "absolute", insetInline: 0, bottom: 12, display: "flex", justifyContent: "center", gap: 6 }}>
          {product.photos.map((_, i) => (
            <span key={i} style={{ width: i === 0 ? 18 : 6, height: 6, borderRadius: 3, background: i === 0 ? "#FFFFFF" : "rgba(255,255,255,.55)" }} />
          ))}
        </span>
      );
      return (
        <span {...mark} style={{ display: "block", position: "relative", padding: look === "card" ? "8px 16px" : 0 }}>
          <span style={{ display: "block", position: "relative", borderRadius: radius, overflow: "hidden", boxShadow: look === "card" ? "0 10px 30px rgba(0,0,0,.12)" : undefined }}>
            <Photo url={product.photos[0] ?? null} dark={dark} style={{ aspectRatio: `${ratio}` }} />
            {product.photos.length > 1 ? dots : null}
          </span>
        </span>
      );
    }
    case "product_title":
      return (
        <span {...mark} style={{ display: "flex", flexDirection: "column", gap: 6, opacity: quiet }}>
          <span style={{ fontSize: font.size ?? 22, fontWeight: font.weight ?? 800, lineHeight: 1.3, color: p.ink }}>{product.title}</span>
          {look === "rating" ? (
            <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: p.muted }}>
              <Stars rating={product.rating} size={16} color={node.product_part?.accent ?? "#E0A100"} />
              {product.rating.toFixed(1)} · {w.pReviewCount.replace("{count}", String(product.ratingCount))}
            </span>
          ) : null}
        </span>
      );
    case "product_price": {
      const size = font.size ?? 20;
      const price = look === "from" ? w.pFrom.replace("{price}", product.price) : product.price;
      return (
        <span {...mark} style={{ display: "flex", alignItems: "baseline", flexWrap: "wrap", gap: 10, opacity: quiet }}>
          <span style={{ fontSize: size, fontWeight: font.weight ?? 800, color: node.product_part?.accent ?? p.ink }}>{price}</span>
          {look === "sale" && product.was ? (
            <>
              <span style={{ fontSize: size * 0.7, color: p.muted, textDecoration: "line-through" }}>{product.was}</span>
              {product.percentOff ? <span style={{ fontSize: 12, fontWeight: 800, padding: "3px 8px", borderRadius: 999, background: "#C62828", color: "#FFFFFF" }}>−{product.percentOff}%</span> : null}
            </>
          ) : null}
        </span>
      );
    }
    case "product_variants": {
      const sizes = ["XS", "S", "M", "L", "XL"];
      const colours = ["#1E1B18", "#C9B79C", "#7A2E2E", "#3F5A4A"];
      const chosen = 2;
      const chip = (label: string, on: boolean, gone = false) => (
        <span key={label} style={{ padding: "8px 14px", borderRadius: 999, fontSize: 13, fontWeight: 700, border: `1.5px solid ${on ? p.accent : p.line}`, background: on ? p.accent : "transparent", color: on ? onAccent(p.accent) : p.ink, opacity: gone ? 0.4 : 1, textDecoration: gone ? "line-through" : undefined }}>
          {label}
        </span>
      );
      return (
        <span {...mark} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {look === "swatches" ? (
            <span style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <span style={{ fontWeight: 700, fontSize: 15, color: p.ink }}>{title || w.pColour}</span>
              <span style={{ display: "flex", gap: 10 }}>
                {colours.map((c, i) => (
                  <span key={c} style={{ width: 34, height: 34, borderRadius: 999, background: c, boxShadow: i === 0 ? `0 0 0 2px ${dark ? "#000" : "#FFF"}, 0 0 0 4px ${p.accent}` : `inset 0 0 0 1px ${p.line}` }} />
                ))}
              </span>
            </span>
          ) : null}
          <span style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <span style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontWeight: 700, fontSize: 15, color: p.ink }}>{look === "swatches" ? w.pSize : title || w.pSize}</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: p.muted, display: "inline-flex", alignItems: "center", gap: 4 }}>
                <span className="material-symbols-rounded" style={{ fontSize: 18 }}>
                  straighten
                </span>
                {w.pSizeGuide}
              </span>
            </span>
            {look === "grid" ? (
              <span style={{ display: "grid", gridTemplateColumns: "repeat(5, minmax(0, 1fr))", gap: 6 }}>
                {sizes.map((s, i) => (
                  <span key={s} style={{ height: 44, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 10, fontSize: 13, fontWeight: 700, border: `1.5px solid ${i === chosen ? p.accent : p.line}`, background: i === chosen ? p.accent : "transparent", color: i === chosen ? onAccent(p.accent) : p.ink, opacity: i === 4 ? 0.4 : 1, textDecoration: i === 4 ? "line-through" : undefined }}>
                    {s}
                  </span>
                ))}
              </span>
            ) : (
              <span style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>{sizes.map((s, i) => chip(s, i === chosen, i === 4))}</span>
            )}
          </span>
        </span>
      );
    }
    case "product_quantity": {
      // − as a sign (the site's icon font has "add", not "remove").
      const button = (glyph: "add" | "minus") => (
        <span className={glyph === "add" ? "material-symbols-rounded" : undefined} style={{ width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 999, border: look === "pill" ? undefined : `1.5px solid ${p.line}`, fontSize: glyph === "add" ? 20 : 22, fontWeight: 600, color: p.ink }}>
          {glyph === "add" ? "add" : "−"}
        </span>
      );
      const control = (
        <span style={{ display: "inline-flex", alignItems: "center", gap: 10, padding: look === "pill" ? "2px 6px" : 0, borderRadius: 999, background: look === "pill" ? p.tint : undefined }}>
          {button("minus")}
          <span style={{ minWidth: 18, textAlign: "center", fontWeight: 800, color: p.ink }}>1</span>
          {button("add")}
        </span>
      );
      return (
        <span {...mark} style={{ display: "flex", alignItems: "center", justifyContent: look === "pill" ? "flex-start" : "space-between" }}>
          {look === "stepper" ? <span style={{ fontWeight: 700, fontSize: 15, color: p.ink }}>{w.pQuantity}</span> : null}
          {control}
        </span>
      );
    }
    case "product_buy": {
      const radius = node.radius ?? 14;
      const filled = { flex: "1 1 0", height: 50, borderRadius: radius, background: p.accent, color: onAccent(p.accent), display: "flex", alignItems: "center", justifyContent: "center", gap: 8, fontWeight: 800, fontSize: 15 } as const;
      return (
        <span {...mark} style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {look === "price" ? (
            <span style={{ display: "flex", flexDirection: "column", minWidth: 0, opacity: quiet }}>
              {product.was ? <span style={{ fontSize: 12, color: p.muted, textDecoration: "line-through" }}>{product.was}</span> : null}
              <span style={{ fontSize: 18, fontWeight: 800, color: p.ink }}>{product.price}</span>
            </span>
          ) : null}
          <span style={look === "buy_now" ? { ...filled, background: "transparent", color: p.ink, border: `1.5px solid ${p.ink}` } : filled}>
            <span className="material-symbols-rounded" style={{ fontSize: 20 }}>
              shopping_bag
            </span>
            {title || w.pAddToCart}
          </span>
          {look === "buy_now" ? <span style={filled}>{second || w.pBuyNow}</span> : null}
        </span>
      );
    }
    case "product_description": {
      const words = <span style={{ fontSize: 14, lineHeight: 1.65, color: p.muted }}>{w.pSampleText}</span>;
      if (look === "accordion")
        return (
          <span {...mark} style={{ display: "flex", flexDirection: "column", borderTop: `1px solid ${p.line}`, borderBottom: `1px solid ${p.line}` }}>
            <span style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 0" }}>
              <Heading text={title || w.pDescription} ink={p.ink} />
              <span className="material-symbols-rounded" style={{ color: p.ink }}>
                expand_less
              </span>
            </span>
            <span style={{ paddingBottom: 14 }}>{words}</span>
          </span>
        );
      return (
        <span {...mark} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <Heading text={title || w.pDescription} ink={p.ink} />
          {words}
        </span>
      );
    }
    case "product_specs": {
      const rows = product.specs.slice(0, node.product_part?.rows ?? product.specs.length);
      return (
        <span {...mark} style={{ display: "flex", flexDirection: "column", gap: look === "list" ? 6 : 0, opacity: quiet }}>
          <span style={{ marginBottom: 6 }}>
            <Heading text={title || w.pDetails} ink={p.ink} />
          </span>
          {rows.map((r, i) =>
            look === "list" ? (
              <span key={i} style={{ fontSize: 13.5, color: p.ink, display: "flex", gap: 8 }}>
                <span style={{ color: p.accent }}>•</span>
                <span>
                  <b>{r.label}:</b> {r.value}
                </span>
              </span>
            ) : (
              <span key={i} style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "9px 12px", fontSize: 13, background: i % 2 ? undefined : p.tint, borderRadius: 8 }}>
                <span style={{ color: p.muted }}>{r.label}</span>
                <span style={{ fontWeight: 700, color: p.ink, textAlign: "end" }}>{r.value}</span>
              </span>
            ),
          )}
        </span>
      );
    }
    case "product_reviews": {
      const shares = [72, 18, 6, 3, 1];
      return (
        <span {...mark} style={{ display: "flex", flexDirection: "column", gap: 10, opacity: quiet }}>
          <Heading text={title || w.pReviews} ink={p.ink} />
          <span style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <span style={{ fontSize: 34, fontWeight: 800, color: p.ink }}>{product.rating.toFixed(1)}</span>
            <span style={{ display: "flex", flexDirection: "column", gap: 3 }}>
              <Stars rating={product.rating} size={16} color={node.product_part?.accent ?? "#E0A100"} />
              <span style={{ fontSize: 12.5, color: p.muted }}>{w.pReviewCount.replace("{count}", String(product.ratingCount))}</span>
            </span>
          </span>
          {look === "bars"
            ? shares.map((share, i) => (
                <span key={i} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: p.muted }}>
                  <span style={{ width: 10 }}>{5 - i}</span>
                  <span style={{ flex: 1, height: 6, borderRadius: 3, background: p.tint, overflow: "hidden" }}>
                    <span style={{ display: "block", width: `${share}%`, height: "100%", background: node.product_part?.accent ?? "#E0A100" }} />
                  </span>
                </span>
              ))
            : null}
          <span style={{ fontSize: 13, fontWeight: 700, color: p.ink, textDecoration: "underline" }}>{w.pSeeReviews}</span>
        </span>
      );
    }
    case "product_related": {
      const shown = product.related.length ? product.related : [1, 2, 3, 4].map(() => ({ title: w.pSampleTitle, price: "1,250", imageUrl: null }));
      const items = shown.slice(0, node.product_part?.rows ?? (look === "grid" ? 4 : 6));
      const card = (r: (typeof items)[number], i: number, width?: number) => (
        <span key={i} style={{ display: "flex", flexDirection: "column", gap: 6, width, flex: width ? "none" : undefined }}>
          <Photo url={r.imageUrl} dark={dark} radius={14} style={{ aspectRatio: "3 / 4" }} />
          <span style={{ fontSize: 13, fontWeight: 600, color: p.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.title}</span>
          <span style={{ fontSize: 13, fontWeight: 800, color: node.product_part?.accent ?? p.ink }}>{r.price}</span>
        </span>
      );
      return (
        <span {...mark} style={{ display: "flex", flexDirection: "column", gap: 10, opacity: product.related.length ? 1 : 0.7 }}>
          <span style={{ padding: "0 16px" }}>
            <Heading text={title || (node.product_part?.related === "complete_look" ? w.pCompleteLook : w.pRelated)} ink={p.ink} />
          </span>
          {look === "grid" ? (
            <span style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 12, padding: "0 16px" }}>{items.map((r, i) => card(r, i))}</span>
          ) : (
            <span style={{ display: "flex", gap: 12, overflow: "hidden", padding: "0 16px" }}>{items.map((r, i) => card(r, i, 150))}</span>
          )}
        </span>
      );
    }
    case "product_delivery": {
      const own = second
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean)
        .map((l) => ({ icon: "check_circle", text: l }));
      const lines = [{ icon: "local_shipping", text: w.pDeliveryDays }, { icon: "sync", text: w.pReturns.replace("{days}", "14") }, ...own, ...(own.length ? [] : [{ icon: "lock", text: w.pSecure }])];
      return (
        <span {...mark} style={{ display: "flex", flexDirection: "column", gap: 10, padding: look === "card" ? 14 : 0, borderRadius: look === "card" ? 16 : 0, background: look === "card" ? p.tint : undefined }}>
          {title ? <Heading text={title} ink={p.ink} /> : look === "card" ? <Heading text={w.pDelivery} ink={p.ink} /> : null}
          {lines.map((l, i) => (
            <span key={i} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13.5, fontWeight: 600, color: p.ink }}>
              <span className="material-symbols-rounded" style={{ fontSize: 20, color: node.product_part?.accent ?? p.muted }}>
                {l.icon}
              </span>
              {l.text}
            </span>
          ))}
        </span>
      );
    }
  }
}
