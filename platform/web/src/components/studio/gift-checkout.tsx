"use client";

import type { CSSProperties, ReactNode } from "react";
import type { CheckoutLook } from "@/lib/studio/checkout-look";
import { formatCents } from "@/lib/catalog/money";
import { convertPrice } from "@/lib/catalog/price-convert";
import { CHECKOUT_SAMPLE_AMOUNTS as AMOUNTS, CHECKOUT_SAMPLE_CENTS as CENTS, checkoutWords } from "@/lib/studio/checkout-words";
import type { ShopSample } from "@/lib/studio/shop-sample-types";
import { alpha, mix } from "./app-screens";
import { useShopSample } from "./shop-sample";

/**
 * 131.25 The gift checkout (`Config.screens.checkout` `gift`) on Studio's
 * canvas, as the app draws it (mobile/lib/modules/store/widgets/
 * gift_checkout_look.dart): five steps on one screen (who it is from, who
 * it is for, when, the card's message, pay) under a stepper, the gift
 * card's live preview with the bouquet's photo, and the order with the day,
 * the slot and the delivery fee's breakdown. Drawn with a sample order
 * (lib/studio/checkout-words.ts, SAMPLE): the app draws the shop's own.
 */

function Icon({ name, size = 18, color, fill }: { name: string; size?: number; color?: string; fill?: boolean }) {
  return (
    <span className="material-symbols-rounded" aria-hidden="true" style={{ fontSize: size, width: size, height: size, lineHeight: 1, color, flex: "none", fontVariationSettings: fill ? "'FILL' 1" : undefined }}>
      {name}
    </span>
  );
}

export interface GiftCheckoutProps {
  look: CheckoutLook;
  dark: boolean;
  lang: string;
  brand: string;
  /** The bouquet's photo (the sample order's); null, a soft tile. */
  photo: string | null;
  top: number;
}

/**
 * 175 The sample order as the shop's own (lib/studio/shop-sample.ts): its
 * currency (the pounds at the day's rate), tomorrow from today, its country
 * and city; without a shop, the sample's own (E£, 15 Nov, Cairo).
 */
function shopView(shop: ShopSample | null, lang: string, w: ReturnType<typeof checkoutWords>) {
  if (!shop) {
    const pounds = (amount: string) => (lang === "ar" ? `${amount} ج.م` : lang === "tr" ? `${amount.replace(",", ".")} E£` : `E£ ${amount}`);
    return {
      amount: (key: "bouquet" | "card" | "chocolates" | "subtotal" | "base" | "distance" | "slot" | "fee" | "total") => pounds(AMOUNTS[key]),
      slotExtra: (i: number) => AMOUNTS.slotExtra[i] ?? null,
      freeOver: w.freeOver,
      pay: w.pay,
      country: w.sample.country,
      city: w.sample.city,
      tomorrow: w.sample.tomorrowDate,
    };
  }
  const key = lang === "ar" || lang === "tr" ? lang : "en";
  const at = (cents: number) => (shop.rate === null ? cents : convertPrice(cents, shop.rate, shop.currency));
  const bouquet = at(CENTS.bouquet);
  const card = at(CENTS.card);
  const chocolates = at(CENTS.chocolates);
  const base = at(CENTS.base);
  const distance = at(CENTS.distance);
  const subtotal = bouquet + card + chocolates;
  const fee = base + distance;
  const cents = { bouquet, card, chocolates, subtotal, base, distance, slot: 0, fee, total: subtotal + fee };
  const fmt = (c: number) => formatCents(c, shop.currency);
  const day = new Intl.DateTimeFormat(`${key === "en" ? "en-GB" : key}-u-nu-latn`, { day: "numeric", month: key === "en" ? "short" : "long", timeZone: "UTC" }).format(new Date(`${shop.tomorrow}T12:00:00Z`));
  return {
    amount: (k: keyof typeof cents) => fmt(cents[k]),
    slotExtra: (i: number) => {
      const extra = CENTS.slotExtra[i];
      return extra ? `+${fmt(at(extra))}` : null;
    },
    freeOver: w.freeOverAmount.replace("{amount}", fmt(at(CENTS.freeOver))),
    pay: w.payAmount.replace("{amount}", fmt(subtotal + fee)),
    country: shop.country?.[key] ?? w.sample.country,
    city: shop.city?.[key] ?? w.sample.city,
    tomorrow: `${w.tomorrow}${key === "ar" ? "، " : ", "}${day}`,
  };
}

export function GiftCheckout(props: GiftCheckoutProps) {
  const { dark } = props;
  const w = checkoutWords(props.lang);
  const shop = shopView(useShopSample(), props.lang, w);
  const rtl = props.lang === "ar";
  const tone = (dark ? (props.look.dark_accent ?? props.look.accent) : props.look.accent) ?? props.brand;
  const page = dark ? mix(tone, "#0A0709", 0.88) : mix(tone, "#FFFFFF", 0.95);
  const surface = dark ? mix(tone, "#120C10", 0.82) : "#FFFFFF";
  const ink = dark ? "#F8EEF1" : "#24121A";
  const muted = dark ? alpha("#F8EEF1", 0.66) : alpha("#24121A", 0.6);
  const line = dark ? alpha("#FFFFFF", 0.1) : alpha(tone, 0.14);
  const onTone = dark ? "#1A0D13" : "#FFFFFF";
  const soft = alpha(tone, dark ? 0.22 : 0.1);
  const card: CSSProperties = { background: surface, borderRadius: 24, border: `1px solid ${line}`, boxShadow: dark ? "0 10px 26px rgba(0,0,0,0.35)" : `0 12px 28px ${alpha(tone, 0.1)}`, padding: 16, display: "flex", flexDirection: "column", gap: 12 };
  const field = (icon: string, label: string, value: string, end?: ReactNode, ltr?: boolean) => (
    <div style={{ display: "flex", alignItems: "center", gap: 10, minHeight: 52, padding: "6px 14px", borderRadius: 16, background: dark ? alpha("#FFFFFF", 0.05) : mix(tone, "#FFFFFF", 0.965), border: `1px solid ${line}` }}>
      <Icon name={icon} size={19} color={tone} />
      <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: muted }}>{label}</span>
        <span dir={ltr ? "ltr" : undefined} style={{ fontSize: 14.5, fontWeight: 600, color: ink, textAlign: rtl ? "right" : "left", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {value}
        </span>
      </span>
      {end}
    </div>
  );
  const head = (n: number, required = false) => (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <span style={{ width: 28, height: 28, borderRadius: "14px 14px 14px 5px", background: n < 4 ? tone : soft, color: n < 4 ? onTone : tone, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800 }}>{n + 1}</span>
      <b style={{ flex: 1, fontSize: 18, fontWeight: 650, color: ink }}>{w.stepTitles[n]}</b>
      {required ? <span style={{ padding: "3px 9px", borderRadius: 999, fontSize: 11, fontWeight: 800, background: soft, color: tone, letterSpacing: "0.04em" }}>{w.required}</span> : null}
    </div>
  );
  const chip = (label: string, on: boolean, icon?: string, off = false, extra?: string | null) => (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, height: 36, padding: "0 13px", borderRadius: 18, fontSize: 13, fontWeight: 700, whiteSpace: "nowrap", background: on ? tone : "transparent", color: on ? onTone : off ? alpha(ink, 0.35) : ink, border: `1px solid ${on ? tone : line}`, textDecoration: off ? "line-through" : undefined }}>
      {icon ? <Icon name={icon} size={15} color={on ? onTone : off ? alpha(ink, 0.35) : tone} /> : null}
      {label}
      {extra ? <span style={{ fontSize: 11.5, opacity: 0.75 }}>{extra}</span> : null}
    </span>
  );
  const row = (label: string, value: string, strong = false, small = false) => (
    <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: small ? 12.5 : 14, color: small ? muted : ink, fontWeight: strong ? 800 : 500 }}>
      <span style={{ flex: 1 }}>{label}</span>
      <span>{value}</span>
    </div>
  );
  const stepper = (
    <div data-gift-stepper="" style={{ display: "flex", alignItems: "flex-start", gap: 0, padding: "6px 14px 2px" }}>
      {w.steps.map((s, i) => (
        <div key={s} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 5, position: "relative" }}>
          {i > 0 ? <span style={{ position: "absolute", top: 12, insetInlineEnd: "50%", width: "100%", height: 2, background: i <= 2 ? tone : line }} /> : null}
          <span style={{ position: "relative", width: 26, height: 26, borderRadius: 13, display: "flex", alignItems: "center", justifyContent: "center", background: i < 2 ? tone : i === 2 ? surface : surface, border: `2px solid ${i <= 2 ? tone : line}`, boxShadow: i === 2 ? `0 0 0 4px ${soft}` : undefined }}>
            {i < 2 ? <Icon name="check" size={15} color={onTone} /> : <span style={{ width: 7, height: 7, borderRadius: 4, background: i === 2 ? tone : line }} />}
          </span>
          <span style={{ fontSize: 11, fontWeight: i === 2 ? 800 : 600, color: i <= 2 ? ink : muted }}>{s}</span>
        </div>
      ))}
    </div>
  );
  const preview = (
    <div data-gift-preview="" style={{ position: "relative", margin: "4px 16px 0", borderRadius: 26, overflow: "hidden", background: `linear-gradient(135deg, ${mix(tone, "#FFFFFF", dark ? 0.12 : 0.82)}, ${mix(tone, "#FFFFFF", dark ? 0.02 : 0.68)})`, boxShadow: `0 16px 34px ${alpha(tone, dark ? 0.4 : 0.22)}`, display: "flex", minHeight: 168 }}>
      <span style={{ width: 118, flex: "none", background: props.photo ? `url("${props.photo}") center / cover no-repeat` : soft }} />
      <div style={{ flex: 1, padding: "14px 16px", display: "flex", flexDirection: "column", gap: 6, color: dark ? "#2A121C" : "#2A121C", background: dark ? mix(tone, "#FFF6F2", 0.86) : "#FFFBF8", position: "relative" }}>
        <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 10.5, fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase", color: tone }}>
          <Icon name="cake" size={14} color={tone} fill />
          {w.preview}
        </span>
        <span style={{ fontSize: 12, color: alpha("#2A121C", 0.6) }}>
          {w.to} <b style={{ color: "#2A121C" }}>{w.sample.recipient}</b>
        </span>
        <span style={{ fontSize: 16.5, lineHeight: 1.3, fontStyle: "italic", color: "#2A121C" }}>“{w.sample.message}”</span>
        <span style={{ fontSize: 12, color: alpha("#2A121C", 0.6), marginTop: "auto" }}>
          {w.from} <b style={{ color: "#2A121C" }}>{w.sample.sender}</b>
        </span>
        <span aria-hidden="true" style={{ position: "absolute", top: 10, insetInlineEnd: 12, width: 34, height: 34, borderRadius: "50% 50% 50% 14%", transform: "rotate(-45deg)", background: alpha(tone, 0.16) }} />
      </div>
    </div>
  );
  const map = (
    <div data-gift-map="" style={{ position: "relative", height: 118, borderRadius: 18, overflow: "hidden", background: dark ? "#1B1E22" : "#EEF0EC", border: `1px solid ${line}` }}>
      <svg aria-hidden="true" viewBox="0 0 300 118" preserveAspectRatio="none" style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}>
        <path d="M0 80 C70 60 120 98 190 74 S280 40 300 50 V118 H0 Z" fill={dark ? "#1E3341" : "#CFE2EA"} />
        {[18, 52, 86].map((y) => (
          <line key={y} x1="0" y1={y} x2="300" y2={y - 14} stroke={dark ? "#2C3036" : "#FFFFFF"} strokeWidth="6" />
        ))}
        {[60, 150, 230].map((x) => (
          <line key={x} x1={x} y1="0" x2={x + 20} y2="118" stroke={dark ? "#2C3036" : "#FFFFFF"} strokeWidth="5" />
        ))}
      </svg>
      <span style={{ position: "absolute", left: "50%", top: "44%", transform: "translate(-50%, -100%)", display: "flex", flexDirection: "column", alignItems: "center" }}>
        <span style={{ width: 34, height: 34, borderRadius: "50% 50% 50% 0", transform: "rotate(-45deg)", background: tone, boxShadow: "0 6px 14px rgba(0,0,0,0.25)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <span style={{ transform: "rotate(45deg)", display: "flex" }}>
            <Icon name="local_florist" size={17} color={onTone} fill />
          </span>
        </span>
      </span>
      <span style={{ position: "absolute", insetInlineStart: 10, bottom: 10, display: "inline-flex", alignItems: "center", gap: 6, padding: "5px 10px", borderRadius: 999, background: surface, color: ink, fontSize: 11.5, fontWeight: 700, boxShadow: "0 4px 10px rgba(0,0,0,0.12)" }}>
        <Icon name="pin_drop" size={14} color={tone} />
        {w.pin}
      </span>
    </div>
  );
  const picker = (icon: string, label: string, value: string) => (
    <div style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", gap: 8, height: 50, padding: "0 12px", borderRadius: 16, background: dark ? alpha("#FFFFFF", 0.05) : mix(tone, "#FFFFFF", 0.965), border: `1px solid ${line}` }}>
      <Icon name={icon} size={18} color={tone} />
      <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
        <span style={{ fontSize: 10.5, fontWeight: 700, color: muted }}>{label}</span>
        <span style={{ fontSize: 14, fontWeight: 700, color: ink }}>{value}</span>
      </span>
      <Icon name="expand_more" size={18} color={muted} />
    </div>
  );
  return (
    <div data-studio-screen-drawn="checkout:gift" style={{ flex: "1 0 auto", display: "flex", flexDirection: "column", gap: 14, background: page, color: ink, paddingTop: props.top, paddingBottom: 24 }}>
      {stepper}
      {preview}
      <div style={{ padding: "0 16px", display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={card}>
          {head(0)}
          {field("person", w.name, w.sample.sender)}
          <div style={{ display: "flex", gap: 8 }}>
            <div style={{ flex: 1 }}>{field("call", w.phone, w.sample.phone, null, true)}</div>
          </div>
          {field("mail", w.email, w.sample.email, null, true)}
        </div>
        <div style={card}>
          {head(1)}
          {field("redeem", w.theirName, w.sample.recipient)}
          {field("call", w.theirPhone, w.sample.theirPhone, null, true)}
          {/* SAMPLE: the owner's allowed countries and cities (the commerce side's delivery zones). */}
          <span style={{ fontSize: 11.5, fontWeight: 700, color: muted, display: "flex", alignItems: "center", gap: 6 }}>
            <Icon name="verified" size={14} color={tone} />
            {w.onlyPlaces}
          </span>
          <div data-gift-places="" style={{ display: "flex", gap: 8 }}>
            {picker("public", w.country, shop.country)}
            {picker("location_city", w.city, shop.city)}
          </div>
          {field("home_pin", w.address, w.sample.address)}
          {map}
          <span style={{ fontSize: 12, color: muted }}>{w.pinNote}</span>
        </div>
        <div style={card} data-gift-when="">
          {head(2, true)}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {chip(w.today, false, "bolt", true)}
            {chip(shop.tomorrow, true, "wb_sunny")}
            {chip(w.pickDate, false, "calendar_month")}
          </div>
          <span style={{ fontSize: 12, color: muted, display: "flex", alignItems: "center", gap: 6 }}>
            <Icon name="schedule" size={14} color={muted} />
            {w.cutoffPassed}
          </span>
          <span style={{ fontSize: 12.5, fontWeight: 800, color: ink }}>{w.slot}</span>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {AMOUNTS.slots.map((slot, i) => (
              <span key={slot} dir="ltr" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, height: 42, borderRadius: 14, fontSize: 13, fontWeight: 700, background: i === 1 ? tone : "transparent", color: i === 1 ? onTone : ink, border: `1px solid ${i === 1 ? tone : line}` }}>
                {slot}
                {shop.slotExtra(i) ? <span style={{ fontSize: 11, opacity: 0.7 }}>{shop.slotExtra(i)}</span> : null}
              </span>
            ))}
          </div>
        </div>
        {/* SAMPLE: the occasions and their ready messages are the owner's `gift_messages` (the dashboard). */}
        <div style={card} data-gift-message="">
          {head(3)}
          <span style={{ fontSize: 12.5, fontWeight: 800, color: ink }}>{w.occasion}</span>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>{w.occasions.map((o, i) => chip(o, i === 1, ["favorite", "cake", "diamond", "celebration", "child_care", "healing", "volunteer_activism", "spa"][i]))}</div>
          <span style={{ fontSize: 12.5, fontWeight: 800, color: ink, marginTop: 2 }}>{w.ready}</span>
          <div style={{ display: "flex", gap: 8, overflow: "hidden" }}>
            {w.sample.messages.map((m, i) => (
              <span key={m} style={{ flex: "none", width: 168, padding: 12, borderRadius: 18, fontSize: 13, lineHeight: 1.35, color: ink, background: i === 0 ? soft : "transparent", border: `1px solid ${i === 0 ? tone : line}`, fontStyle: "italic" }}>
                {m}
              </span>
            ))}
          </div>
          <span style={{ fontSize: 12.5, fontWeight: 800, color: ink, marginTop: 2 }}>{w.write}</span>
          <div style={{ padding: 14, borderRadius: 16, border: `1.5px solid ${tone}`, background: dark ? alpha("#FFFFFF", 0.04) : "#FFFFFF", fontSize: 14.5, lineHeight: 1.45, color: ink, minHeight: 64 }}>
            {w.sample.message}
            <span style={{ display: "inline-block", width: 2, height: 17, marginInlineStart: 2, verticalAlign: "text-bottom", background: tone }} />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Icon name="visibility_off" size={19} color={tone} />
            <span style={{ flex: 1, display: "flex", flexDirection: "column" }}>
              <b style={{ fontSize: 14, color: ink }}>{w.anonymous}</b>
              <span style={{ fontSize: 12, color: muted }}>{w.anonymousNote}</span>
            </span>
            <span aria-hidden="true" style={{ width: 46, height: 28, borderRadius: 14, display: "flex", alignItems: "center", padding: 3, boxSizing: "border-box", background: line }}>
              <span style={{ width: 22, height: 22, borderRadius: 11, background: "#FFFFFF", boxShadow: "0 1px 3px rgba(0,0,0,0.25)" }} />
            </span>
          </div>
        </div>
        {/* SAMPLE: the order, its add-ons and the fee's breakdown are the shop's (its zones, slots and free threshold). */}
        <div style={card} data-gift-summary="">
          {head(4)}
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <span style={{ width: 62, height: 74, borderRadius: 31, flex: "none", background: props.photo ? `url("${props.photo}") center / cover no-repeat` : soft }} />
            <span style={{ flex: 1, display: "flex", flexDirection: "column", gap: 2 }}>
              <b style={{ fontSize: 16, color: ink }}>{w.sample.bouquet}</b>
              <span style={{ fontSize: 12.5, color: muted }}>{w.sample.size}</span>
            </span>
            <b style={{ fontSize: 14, color: ink }}>{shop.amount("bouquet")}</b>
          </div>
          <span style={{ fontSize: 11.5, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: muted }}>{w.addOns}</span>
          {row(w.sample.card, shop.amount("card"))}
          {row(w.sample.chocolates, shop.amount("chocolates"))}
          <div data-gift-arrives="" style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 16, background: soft }}>
            <Icon name="event_available" size={20} color={tone} />
            <span style={{ flex: 1, fontSize: 12.5, color: muted }}>{w.arrives}</span>
            <b style={{ fontSize: 13.5, color: ink }}>
              {shop.tomorrow} · <span dir="ltr">{AMOUNTS.slots[1]}</span>
            </b>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <span style={{ flex: 1, display: "flex", alignItems: "center", gap: 8, height: 46, padding: "0 14px", borderRadius: 14, border: `1px dashed ${alpha(tone, 0.6)}`, color: muted, fontSize: 13.5 }}>
              <Icon name="sell" size={17} color={tone} />
              {w.discount}
            </span>
            <span style={{ display: "flex", alignItems: "center", height: 46, padding: "0 16px", borderRadius: 14, background: soft, color: tone, fontWeight: 800, fontSize: 13.5 }}>{w.apply}</span>
          </div>
          {row(w.subtotal, shop.amount("subtotal"))}
          <div data-gift-fee="" style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {row(w.deliveryFee, shop.amount("fee"))}
            <div style={{ display: "flex", flexDirection: "column", gap: 3, paddingInlineStart: 12, borderInlineStart: `2px solid ${soft}` }}>
              {row(w.base, shop.amount("base"), false, true)}
              {row(w.distance, shop.amount("distance"), false, true)}
              {row(w.slotFee, shop.amount("slot"), false, true)}
              <span style={{ fontSize: 12, color: tone, fontWeight: 700 }}>{shop.freeOver}</span>
            </div>
          </div>
          <span style={{ height: 1, background: line }} />
          {row(w.total, shop.amount("total"), true)}
          <span style={{ height: 54, borderRadius: 27, background: `linear-gradient(135deg, ${tone}, ${mix(tone, "#000000", 0.2)})`, color: onTone, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, fontWeight: 800, fontSize: 16, boxShadow: `0 14px 28px ${alpha(tone, 0.35)}` }}>
            <Icon name="lock" size={18} color={onTone} />
            {shop.pay}
          </span>
        </div>
      </div>
    </div>
  );
}
