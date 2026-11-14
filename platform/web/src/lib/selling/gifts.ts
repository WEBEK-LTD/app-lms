import type { App, GiftSettings, OrderDelivery } from "../data/types";

/**
 * 131 Gifts at checkout, for every store app: the card message (at most
 * 500 characters, with beginnings the owner writes), the recipient's name
 * and phone (someone else than the buyer) and "send anonymously". The gift
 * checkout (`checkout: "gift"`, the flower shop's) asks for exactly the
 * sender's name, phone and email and the recipient's name, phone and
 * address, with the delivery day and slot (lib/selling/delivery.ts) and the
 * card. Everything is checked here, bounded, whatever the app sends.
 */

export const GIFT_LIMITS = { message: 500, starters: 6, starter: 80, name: 80, phone: 20, email: 120, address: 300 } as const;

export type CheckoutMode = "standard" | "gift";

export const DEFAULT_GIFTS: GiftSettings = { checkout: "standard", message: false, maxLength: GIFT_LIMITS.message, starters: [], recipient: false, anonymous: false };

/** The shop's gift settings (the defaults, all off, until saved). */
export function giftsOf(app: Pick<App, "catalogSettings" | "vertical">): GiftSettings {
  const saved = app.catalogSettings?.gifts;
  const gifts = { ...DEFAULT_GIFTS, ...(saved ?? {}) };
  // A restaurant's checkout is its kitchen's (26): the gift checkout is for the other shops.
  if (app.vertical === "restaurant") gifts.checkout = "standard";
  return gifts;
}

/** The checkout the app shows: `gift` asks for the sender and the recipient. */
export function checkoutModeOf(gifts: GiftSettings, look: { mode?: string } | null | undefined): CheckoutMode {
  // 131 The flower shop's looks (Studio › Screens, `screens.checkout.mode`) turn it on too.
  return gifts.checkout === "gift" || look?.mode === "gift" ? "gift" : "standard";
}

/** `StoreConfig.gift_message`: as before, with the beginnings, the recipient and "send anonymously". */
export function giftConfigJson(g: GiftSettings, mode: CheckoutMode) {
  const gift = mode === "gift";
  return {
    // The gift checkout always offers the card.
    enabled: g.message || gift,
    max_length: Math.max(1, Math.min(GIFT_LIMITS.message, g.maxLength)),
    starters: g.starters.slice(0, GIFT_LIMITS.starters),
    recipient: g.recipient || gift,
    anonymous: g.anonymous || gift,
  };
}

const CONTROL = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;

/** One line of words: trimmed, spaces collapsed, no control characters. */
export function cleanLine(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const text = value.replace(CONTROL, "").replace(/\s+/g, " ").trim();
  return text === "" ? null : [...text].slice(0, max + 1).join("");
}

/** A phone number as typed, kept with its leading + and its digits; null when it isn't one. */
export function cleanPhone(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const raw = value.trim();
  if (!/^\+?[0-9\s().-]{6,30}$/.test(raw)) return null;
  const digits = raw.replace(/[^0-9]/g, "");
  if (digits.length < 6 || digits.length > 15) return null;
  return `${raw.startsWith("+") ? "+" : ""}${digits}`;
}

const EMAIL = /^[^\s@<>()[\]\\,;:"]{1,64}@[^\s@<>()[\]\\,;:"]{1,180}\.[A-Za-z]{2,24}$/;

export function cleanEmail(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const text = value.trim().toLowerCase();
  return text.length <= GIFT_LIMITS.email && EMAIL.test(text) ? text : null;
}

/** The card's words: newlines kept (at most two in a row), no control characters. */
export function cleanMessage(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const text = value
    .replace(/\r\n?/g, "\n")
    .replace(CONTROL, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return text === "" ? null : text;
}

const length = (text: string) => [...text].length;

export type GiftChoice =
  | { ok: true; sender: OrderDelivery["sender"]; recipient: OrderDelivery["recipient"]; message: string | null; anonymous: boolean }
  | { ok: false; status: number; code: string; message: string };

/**
 * The checkout's `gift_message`, `gift_anonymous`, `recipient` and, in the
 * gift checkout, `sender`, checked strictly. What the shop doesn't offer is
 * left out (older apps send only the message).
 */
export function checkGift(g: GiftSettings, mode: CheckoutMode, body: unknown): GiftChoice {
  const input = (body ?? {}) as { gift_message?: unknown; gift_anonymous?: unknown; recipient?: unknown; sender?: unknown };
  const config = giftConfigJson(g, mode);
  const gift = mode === "gift";
  const bad = (message: string): GiftChoice => ({ ok: false, status: 400, code: "invalid_request", message });

  let message: string | null = null;
  if (config.enabled) {
    message = cleanMessage(input.gift_message);
    if (message !== null && length(message) > config.max_length) return bad(`The card message can be at most ${config.max_length} characters.`);
  }

  let recipient: OrderDelivery["recipient"] = null;
  const r = (input.recipient && typeof input.recipient === "object" ? input.recipient : null) as { name?: unknown; phone?: unknown; address?: unknown } | null;
  if (gift || (config.recipient && r && (r.name || r.phone))) {
    const name = cleanLine(r?.name, GIFT_LIMITS.name);
    if (!name || length(name) < 2) return bad("Enter the recipient's name.");
    if (length(name) > GIFT_LIMITS.name) return bad(`The recipient's name can be at most ${GIFT_LIMITS.name} characters.`);
    const phone = cleanPhone(r?.phone);
    if (!phone) return bad("Enter the recipient's phone number.");
    let address: string | null = null;
    if (gift) {
      address = cleanLine(r?.address, GIFT_LIMITS.address);
      if (!address || length(address) < 5) return bad("Enter the delivery address.");
      if (length(address) > GIFT_LIMITS.address) return bad(`The address can be at most ${GIFT_LIMITS.address} characters.`);
    }
    recipient = { name, phone, address };
  }

  let sender: OrderDelivery["sender"] = null;
  if (gift) {
    const s = (input.sender && typeof input.sender === "object" ? input.sender : null) as { name?: unknown; phone?: unknown; email?: unknown } | null;
    const name = cleanLine(s?.name, GIFT_LIMITS.name);
    if (!name || length(name) < 2) return bad("Enter your name.");
    if (length(name) > GIFT_LIMITS.name) return bad(`Your name can be at most ${GIFT_LIMITS.name} characters.`);
    const phone = cleanPhone(s?.phone);
    if (!phone) return bad("Enter your phone number.");
    const email = cleanEmail(s?.email);
    if (!email) return bad("Enter your email address.");
    sender = { name, phone, email };
  }

  const anonymous = config.anonymous && input.gift_anonymous === true;
  return { ok: true, sender, recipient, message, anonymous };
}

type Parsed<T> = { ok: true; value: T } | { ok: false; errors: Record<string, string> };

/** The dashboard's Gifts form: the switches, the length and one beginning per line. */
export function parseGiftForm(v: Record<string, string>): Parsed<GiftSettings> {
  const errors: Record<string, string> = {};
  const on = (name: string) => v[name] === "on";
  const maxText = (v.maxLength ?? "").trim();
  const maxLength = maxText === "" ? GIFT_LIMITS.message : Number(maxText);
  if (!Number.isInteger(maxLength) || maxLength < 20 || maxLength > GIFT_LIMITS.message) errors.maxLength = `Enter a length from 20 to ${GIFT_LIMITS.message} characters.`;
  const lines = (v.starters ?? "")
    .split(/\r?\n/)
    .map((line) => cleanLine(line, GIFT_LIMITS.starter))
    .filter((line): line is string => line !== null);
  if (lines.length > GIFT_LIMITS.starters) errors.starters = `Write at most ${GIFT_LIMITS.starters} beginnings, one per line.`;
  else if (lines.some((line) => length(line) > GIFT_LIMITS.starter)) errors.starters = `Each beginning can be at most ${GIFT_LIMITS.starter} characters.`;
  if (Object.keys(errors).length) return { ok: false, errors };
  return {
    ok: true,
    value: { checkout: v.checkout === "gift" ? "gift" : "standard", message: on("message"), maxLength, starters: lines, recipient: on("recipient"), anonymous: on("anonymous") },
  };
}

/**
 * The delivery and the gift as one note, for a platform's order that can
 * only take words (and the owner's list): a line per detail, labelled.
 */
export function deliveryNote(d: OrderDelivery, labels: { slotLabel: (slot: { start: string; end: string }) => string }): string {
  const lines: string[] = [];
  if (d.date) lines.push(`Delivery date: ${d.date}${d.slot ? `, ${labels.slotLabel(d.slot)}` : ""}`);
  if (d.sender) lines.push(`Sender: ${d.sender.name}, ${d.sender.phone}, ${d.sender.email}`);
  if (d.recipient) lines.push(`Recipient: ${d.recipient.name}, ${d.recipient.phone}${d.recipient.address ? `, ${d.recipient.address}` : ""}`);
  if (d.message) lines.push(`Card message: ${d.message}`);
  if (d.anonymous) lines.push("Send anonymously: yes");
  return lines.join("\n");
}

/** The same details as a platform's order attributes (Shopify's cart attributes). */
export function deliveryAttributes(d: OrderDelivery, slotLabel: (slot: { start: string; end: string }) => string): { key: string; value: string }[] {
  const out: { key: string; value: string }[] = [];
  const add = (key: string, value: string | null | undefined) => {
    if (value) out.push({ key, value });
  };
  add("Delivery date", d.date);
  add("Delivery time", d.slot ? slotLabel(d.slot) : null);
  add("Sender name", d.sender?.name);
  add("Sender phone", d.sender?.phone);
  add("Sender email", d.sender?.email);
  add("Recipient name", d.recipient?.name);
  add("Recipient phone", d.recipient?.phone);
  add("Recipient address", d.recipient?.address);
  add("Card message", d.message);
  if (d.anonymous) add("Send anonymously", "yes");
  return out;
}

/** Whether an order has anything of a delivery or a gift to keep. */
export function hasDeliveryDetails(d: OrderDelivery): boolean {
  return Boolean(d.date || d.sender || d.recipient || d.message || d.anonymous);
}

/** `Order.delivery` in the contract: the day and slot, the people and the card. */
export function orderDeliveryJson(d: OrderDelivery | null | undefined, fee: string | null) {
  if (!d || !hasDeliveryDetails(d)) return null;
  return {
    date: d.date,
    slot: d.slot ? { id: d.slot.id, start: d.slot.start, end: d.slot.end, label: `${d.slot.start}–${d.slot.end}` } : null,
    fee,
    sender: d.sender,
    recipient: d.recipient,
    gift_message: d.message,
    anonymous: d.anonymous,
  };
}
