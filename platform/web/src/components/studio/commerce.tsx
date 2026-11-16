"use client";

import { useEffect, useState } from "react";
import type { Pickable, PickableEntry } from "@/lib/hosted/pages/pickable";
import type { StudioNode } from "@/lib/pages/types";

/**
 * 131 Studio's canvas draws the commerce elements as the app does: the
 * flash sale (banner, carousel or grid: was and now prices, the share off,
 * the live countdown and the stock bar), the coupon's premium looks (ticket
 * and glass, the copy button) and the sale on the products' cards. Real
 * sales, products and coupons from the shop (`Pickable.commerce`), else a
 * sample so the look shows.
 */

export interface CommerceWords {
  flash: string;
  left: string;
  soldOut: string;
  endsIn: string;
  copy: string;
  off: string;
  days: string;
  hours: string;
  minutes: string;
  seconds: string;
}

export const COMMERCE_WORDS_EN: CommerceWords = {
  flash: "Flash sale",
  left: "{count} left",
  soldOut: "Sold out",
  endsIn: "Ends in",
  copy: "Copy",
  off: "off",
  days: "d",
  hours: "h",
  minutes: "m",
  seconds: "s",
};

/** Ticks once a second (never faster), whatever the motion settings: only the numbers change. */
function useNow(): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

/** [days, hours, minutes, seconds] until `endsAt`, or null once it has passed. */
export function countdownParts(endsAt: string | null | undefined, now: number): [number, number, number, number] | null {
  const end = endsAt ? Date.parse(endsAt) : NaN;
  if (!Number.isFinite(end) || end <= now) return null;
  let s = Math.floor((end - now) / 1000);
  const d = Math.floor(s / 86_400);
  s -= d * 86_400;
  const h = Math.floor(s / 3600);
  s -= h * 3600;
  const m = Math.floor(s / 60);
  return [d, h, m, s - m * 60];
}

const pad = (n: number) => String(n).padStart(2, "0");

function Timer({ endsAt, accent, words, onDark }: { endsAt: string | null; accent: string; words: CommerceWords; onDark: boolean }) {
  const now = useNow();
  const parts = countdownParts(endsAt, now);
  if (!parts) return null;
  const units = [words.days, words.hours, words.minutes, words.seconds];
  return (
    <span dir="ltr" data-studio-flash-timer="" style={{ display: "inline-flex", gap: 4, alignItems: "center" }}>
      {parts.map((v, i) =>
        i === 0 && v === 0 ? null : (
          // 132.58 The second can tick between the server's drawing and the browser's: not a mismatch to report.
          <span key={i} suppressHydrationWarning style={{ display: "inline-flex", alignItems: "baseline", gap: 1, padding: "3px 6px", borderRadius: 8, background: onDark ? "rgba(255,255,255,0.16)" : accent, color: "#FFFFFF", fontWeight: 800, fontSize: 13, fontVariantNumeric: "tabular-nums" }}>
            {pad(v)}
            <span style={{ fontSize: 9, fontWeight: 600, opacity: 0.8 }}>{units[i]}</span>
          </span>
        ),
      )}
    </span>
  );
}

function StockBar({ remaining, total, accent, words }: { remaining: number | null; total: number | null; accent: string; words: CommerceWords }) {
  if (remaining === null || !total) return null;
  const sold = Math.max(0, Math.min(1, (total - remaining) / total));
  return (
    <span data-studio-flash-stock="" style={{ display: "flex", flexDirection: "column", gap: 3 }}>
      <span style={{ height: 6, borderRadius: 999, background: "rgba(127,127,127,0.22)", overflow: "hidden" }}>
        <span style={{ display: "block", height: "100%", width: `${Math.round(sold * 100)}%`, background: accent, borderRadius: 999 }} />
      </span>
      <span style={{ fontSize: 10, fontWeight: 700, color: accent }}>{remaining > 0 ? words.left.replace("{count}", String(remaining)) : words.soldOut}</span>
    </span>
  );
}

interface SaleEntry {
  id: string;
  title: string;
  imageUrl: string | null;
  was: string;
  now: string;
  percentOff: number;
}

/** The sale the element shows on the canvas, with its products: the shop's, else a sample. */
function saleOf(node: StudioNode, pickable: Pickable, now: number): { title: string | null; endsAt: string | null; remaining: number | null; total: number | null; entries: SaleEntry[] } {
  const sales = pickable.commerce?.flashSales ?? [];
  const sale = (node.flash_sale?.sale_id ? sales.find((s) => s.id === node.flash_sale?.sale_id) : null) ?? sales[0];
  const products = pickable.items.products ?? [];
  const onSale = (p: PickableEntry): SaleEntry | null => (p.sale ? { id: p.id, title: p.title, imageUrl: p.imageUrl ?? null, was: p.sale.was, now: p.sale.now, percentOff: p.sale.percentOff } : null);
  const limit = node.flash_sale?.limit ?? 6;
  let entries = (sale ? products.filter((p) => sale.productIds.includes(Number(p.id))) : products).map(onSale).filter((e): e is SaleEntry => e !== null).slice(0, limit);
  if (!entries.length) {
    // A sample, so the look shows before the shop has a sale on.
    entries = Array.from({ length: Math.min(limit, 3) }, (_, i) => ({ id: `s${i}`, title: `[${i + 1}]`, imageUrl: null, was: "₺500", now: "₺400", percentOff: 20 }));
  }
  const endsAt = sale?.endsAt ?? new Date(now + 5 * 3_600_000 + 23 * 60_000).toISOString();
  return { title: sale?.title ?? null, endsAt, remaining: sale?.remaining ?? (sale ? null : 12), total: sale?.total ?? (sale ? null : 40), entries };
}

function ProductCard({ e, accent, dark, wide }: { e: SaleEntry; accent: string; dark: boolean; wide?: boolean }) {
  return (
    <span data-studio-flash-entry={e.id} style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 0, background: dark ? "#22203A" : "#FFFFFF", borderRadius: 14, padding: 6, boxShadow: "0 2px 8px rgba(20,20,40,0.08)", ...(wide ? { flex: "0 0 58%" } : {}) }}>
      <span style={{ position: "relative", display: "block", aspectRatio: "1 / 1", borderRadius: 10, overflow: "hidden", background: dark ? "#33304F" : "#F6E3E7" }}>
        {e.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- the product's own picture, as the app shows it
          <img src={e.imageUrl} alt="" draggable={false} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
        ) : null}
        <span style={{ position: "absolute", top: 6, insetInlineStart: 6, background: accent, color: "#FFFFFF", fontSize: 10, fontWeight: 800, padding: "2px 7px", borderRadius: 999 }}>−{e.percentOff}%</span>
      </span>
      <span style={{ fontSize: 12, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.title}</span>
      <span style={{ display: "flex", gap: 6, alignItems: "baseline", fontSize: 12 }}>
        <span style={{ fontWeight: 800, color: accent }}>{e.now}</span>
        <span style={{ textDecoration: "line-through", opacity: 0.55, fontSize: 11 }}>{e.was}</span>
      </span>
    </span>
  );
}

/** 131 The flash sale element on the canvas. */
export function FlashSaleCanvas({ node, title, pickable, dark, brand, words }: { node: StudioNode; title: string; pickable: Pickable; dark: boolean; brand: string; words: CommerceWords }) {
  const now = useNow();
  const accent = node.flash_sale?.accent ?? brand;
  const sale = saleOf(node, pickable, now);
  const look = node.flash_sale?.look ?? "banner";
  const header = (
    <span style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
      <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontWeight: 800, fontSize: 16 }}>
        <span className="material-symbols-rounded" aria-hidden="true" style={{ fontSize: 20, color: look === "banner" ? "#FFFFFF" : accent }}>
          bolt
        </span>
        {title || sale.title || words.flash}
      </span>
      {node.flash_sale?.countdown !== false ? (
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11, opacity: 0.9 }}>
          {words.endsIn}
          <Timer endsAt={sale.endsAt} accent={accent} words={words} onDark={look === "banner"} />
        </span>
      ) : null}
    </span>
  );
  const bar = node.flash_sale?.stock_bar !== false ? <StockBar remaining={sale.remaining} total={sale.total} accent={look === "banner" ? "#FFFFFF" : accent} words={words} /> : null;
  if (look === "banner") {
    return (
      <span data-studio-flash-sale="banner" style={{ display: "flex", flexDirection: "column", gap: 10, padding: 14, borderRadius: "inherit", color: "#FFFFFF", background: `linear-gradient(135deg, ${accent}, ${shade(accent)})` }}>
        {header}
        {bar}
        <span style={{ display: "flex", gap: 8, overflow: "hidden" }}>
          {sale.entries.slice(0, 3).map((e) => (
            <span key={e.id} style={{ flex: "1 1 0", minWidth: 0, color: dark ? "#FFFFFF" : "#1A1A2E" }}>
              <ProductCard e={e} accent={accent} dark={dark} />
            </span>
          ))}
        </span>
      </span>
    );
  }
  return (
    <span data-studio-flash-sale={look} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {header}
      {bar}
      <span style={look === "grid" ? { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 } : { display: "flex", gap: 8, overflow: "hidden" }}>
        {sale.entries.map((e) => (
          <ProductCard key={e.id} e={e} accent={accent} dark={dark} wide={look === "carousel"} />
        ))}
      </span>
    </span>
  );
}

/** A deeper tone of the colour, for the banner's gradient. */
function shade(hex: string): string {
  const m = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!m) return hex;
  const n = parseInt(m[1]!, 16);
  const ch = (v: number) => Math.max(0, Math.round(v * 0.62));
  return `#${[(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => ch(v).toString(16).padStart(2, "0")).join("")}`;
}

/** 131 The coupon's looks on the canvas: classic (as before), a perforated ticket, or frosted glass; the shop's own coupon when bound. */
export function CouponCanvas({ node, pickable, dark, brand, color, words }: { node: StudioNode; pickable: Pickable; dark: boolean; brand: string; color: string | null; words: CommerceWords }) {
  const accent = color ?? brand;
  const bound = node.coupon?.bind === "public" ? ((node.code ? pickable.commerce?.coupons.find((c) => c.code === node.code) : null) ?? pickable.commerce?.coupons[0]) : undefined;
  const code = bound?.code ?? node.code ?? "SAVE10";
  const offer = bound ? (bound.percentOff ? `${bound.percentOff}% ${words.off}` : bound.amountOff ? `${bound.amountOff} ${words.off}` : null) : null;
  const look = node.coupon?.look ?? "classic";
  const copy = (
    <span style={{ display: "flex", alignItems: "center", gap: 4, padding: "6px 12px", borderRadius: 8, background: accent, color: "#FFFFFF", fontSize: 12, fontWeight: 700, flex: "none" }}>
      <span className="material-symbols-rounded" aria-hidden="true" style={{ fontSize: 16 }}>
        content_copy
      </span>
      {words.copy}
    </span>
  );
  const codeText = <span style={{ fontWeight: 800, fontSize: 16, letterSpacing: 2, fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", color: look === "glass" ? undefined : accent }}>{code}</span>;
  if (look === "ticket") {
    return (
      <span dir="ltr" data-studio-coupon="ticket" style={{ position: "relative", display: "flex", alignItems: "stretch", borderRadius: "inherit", background: dark ? "#2A2742" : "#FFF5F7", border: `1px solid ${accent}33`, overflow: "hidden" }}>
        <span style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "10px 14px", background: accent, color: "#FFFFFF", fontWeight: 800, fontSize: 14, minWidth: 64 }}>{offer ?? "%"}</span>
        <span style={{ borderInlineStart: `2px dashed ${accent}55`, margin: "6px 0" }} />
        <span style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", flex: "1 1 auto", justifyContent: "space-between" }}>
          {codeText}
          {copy}
        </span>
        <span style={{ position: "absolute", top: -7, insetInlineStart: 57, width: 14, height: 14, borderRadius: 999, background: dark ? "#14122A" : "#F7F4EE" }} />
        <span style={{ position: "absolute", bottom: -7, insetInlineStart: 57, width: 14, height: 14, borderRadius: 999, background: dark ? "#14122A" : "#F7F4EE" }} />
      </span>
    );
  }
  if (look === "glass") {
    return (
      <span dir="ltr" data-studio-coupon="glass" style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 10px 10px 14px", borderRadius: "inherit", background: dark ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.55)", backdropFilter: "blur(14px)", border: "1px solid rgba(255,255,255,0.45)", boxShadow: "0 8px 24px rgba(20,20,40,0.12)" }}>
        <span style={{ display: "flex", flexDirection: "column", flex: "1 1 auto", minWidth: 0 }}>
          {codeText}
          {offer ? <span style={{ fontSize: 11, opacity: 0.75 }}>{offer}</span> : null}
        </span>
        {copy}
      </span>
    );
  }
  return (
    <span dir="ltr" data-studio-coupon="" style={{ display: "flex", alignItems: "center", gap: 8, border: `1.5px dashed ${accent}`, borderRadius: "inherit", padding: "6px 6px 6px 14px", background: dark ? "rgba(255,255,255,0.06)" : "#FFFFFF" }}>
      <span style={{ flex: "1 1 auto" }}>{codeText}</span>
      {copy}
    </span>
  );
}
