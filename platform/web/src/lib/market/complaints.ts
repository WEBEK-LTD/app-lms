import type { DataStore } from "../data/store";
import type { ComplaintDecision, ComplaintReason, MarketComplaint, MarketComplaintPatch, MarketOrder } from "../data/types";
import { COMPLAINT_REASONS } from "../data/types";
import type { StatementAdjustment } from "./statement";

/**
 * 115.9 Complaints on marketplace orders. The customer opens a ticket from
 * when the order is placed to 48 hours after it arrives (or after it was
 * turned down or cancelled), about the whole order or some of its items,
 * with photos and words. The app owner's support team works the queue
 * (assignee, status, its own notes, the times since it opened and since its
 * last answer, ready replies) and decides: a full or part refund to the
 * payment, to the wallet or as a coupon, a compensation, or no refund with
 * the reason the customer reads. Vendors never talk to customers; they read
 * their orders' tickets and decisions without anyone's contact details.
 */

export const COMPLAINT_WINDOW_HOURS = 48;
export const COMPLAINT_MAX_PHOTOS = 5;
export const COMPLAINT_TEXT_MAX = 2000;
export const ACTIVE_COMPLAINT: MarketComplaint["status"][] = ["open", "in_review", "waiting_for_customer"];

/** The order's last moment: delivered or picked up, else turned down or cancelled; null while it is still on its way. */
function endedAt(order: Pick<MarketOrder, "status" | "completedAt" | "timeline" | "updatedAt">): Date | null {
  if (order.completedAt) return order.completedAt;
  if (order.status === "rejected" || order.status === "cancelled") {
    const stage = [...order.timeline].reverse().find((s) => s.status === order.status);
    return stage ? new Date(stage.at) : order.updatedAt;
  }
  return null;
}

/** Whether the customer may open a complaint now, and until when. */
export function complaintWindow(order: Pick<MarketOrder, "status" | "completedAt" | "timeline" | "updatedAt">, now: Date): { open: boolean; until: Date | null } {
  if (order.status === "awaiting_payment") return { open: false, until: null };
  const end = endedAt(order);
  if (!end) return { open: true, until: null };
  const until = new Date(end.getTime() + COMPLAINT_WINDOW_HOURS * 3600_000);
  return { open: now < until, until };
}

export interface ComplaintRequest {
  reason: string;
  text: string;
  lineIds: number[];
  photoAssetIds: string[];
}

export type ComplaintResult = { ok: true; complaint: MarketComplaint } | { ok: false; code: "window_closed" | "already_open" | "invalid"; field: string | null; error: string };

/** The customer's complaint, checked against the order. */
export async function openComplaint(store: DataStore, order: MarketOrder, userId: number, request: ComplaintRequest, now: Date): Promise<ComplaintResult> {
  if (order.userId !== userId) return { ok: false, code: "invalid", field: null, error: "This isn't one of your orders." };
  const window = complaintWindow(order, now);
  if (!window.open) return { ok: false, code: "window_closed", field: null, error: `Complaints can be sent until ${COMPLAINT_WINDOW_HOURS} hours after the order arrives.` };
  if (!(COMPLAINT_REASONS as readonly string[]).includes(request.reason)) return { ok: false, code: "invalid", field: "reason", error: "Choose what went wrong." };
  const text = request.text.trim();
  if (text.length > COMPLAINT_TEXT_MAX) return { ok: false, code: "invalid", field: "text", error: `Keep it under ${COMPLAINT_TEXT_MAX} characters.` };
  if (!text && request.reason === "other") return { ok: false, code: "invalid", field: "text", error: "Tell us what went wrong." };
  const lineIds = [...new Set(request.lineIds)];
  if (lineIds.some((id) => !order.lines.some((l) => l.id === id))) return { ok: false, code: "invalid", field: "line_ids", error: "Choose items from this order." };
  if (["missing_items", "wrong_items", "damaged"].includes(request.reason) && lineIds.length === 0) return { ok: false, code: "invalid", field: "line_ids", error: "Choose the items it is about." };
  const photos = [...new Set(request.photoAssetIds)];
  if (photos.length > COMPLAINT_MAX_PHOTOS) return { ok: false, code: "invalid", field: "photos", error: `Add up to ${COMPLAINT_MAX_PHOTOS} photos.` };
  const active = await store.listMarketComplaints({ appId: order.appId, orderId: order.id, statuses: ACTIVE_COMPLAINT, limit: 1, offset: 0 });
  if (active.total > 0) return { ok: false, code: "already_open", field: null, error: "This order already has a complaint we're working on. Add to it instead." };
  const complaint = await store.createMarketComplaint({
    appId: order.appId,
    orderId: order.id,
    vendorId: order.vendorId,
    userId,
    reason: request.reason as ComplaintReason,
    text,
    lineIds,
    photoAssetIds: photos,
    status: "open",
    assignee: null,
    sharedWithVendor: false,
    messages: [],
    notes: [],
    decision: null,
    answeredAt: null,
    createdAt: now,
    updatedAt: now,
  });
  return { ok: true, complaint };
}

function nextMessageId(c: Pick<MarketComplaint, "messages">): number {
  return c.messages.reduce((max, m) => Math.max(max, m.id), 0) + 1;
}

/** Support's answer to the customer: the ticket then waits for them. */
export function supportReply(c: MarketComplaint, text: string, by: string, now: Date): MarketComplaintPatch | null {
  const t = text.trim().slice(0, COMPLAINT_TEXT_MAX);
  if (!t || !ACTIVE_COMPLAINT.includes(c.status)) return null;
  return { messages: [...c.messages, { id: nextMessageId(c), from: "support", text: t, by, at: now.toISOString() }], answeredAt: now, status: "waiting_for_customer", updatedAt: now };
}

/** The customer's message: the ticket is support's turn again. After a decision it reopens for review. */
export function customerMessage(c: MarketComplaint, text: string, now: Date): MarketComplaintPatch | null {
  const t = text.trim().slice(0, COMPLAINT_TEXT_MAX);
  if (!t) return null;
  return { messages: [...c.messages, { id: nextMessageId(c), from: "customer", text: t, by: null, at: now.toISOString() }], status: "in_review", updatedAt: now };
}

export function teamNote(c: MarketComplaint, text: string, by: string, now: Date): MarketComplaintPatch | null {
  const t = text.trim().slice(0, COMPLAINT_TEXT_MAX);
  return t ? { notes: [...c.notes, { text: t, by, at: now.toISOString() }], updatedAt: now } : null;
}

/** Whose turn it is and for how long, for the queue. */
export function queueTimers(c: Pick<MarketComplaint, "status" | "createdAt" | "answeredAt" | "messages">, now: Date): { openMinutes: number; waitingOn: "support" | "customer" | null; waitingMinutes: number | null } {
  const minutes = (from: Date) => Math.max(0, Math.floor((now.getTime() - from.getTime()) / 60_000));
  if (!ACTIVE_COMPLAINT.includes(c.status)) return { openMinutes: minutes(c.createdAt), waitingOn: null, waitingMinutes: null };
  const last = c.messages.at(-1);
  if (c.status === "waiting_for_customer") return { openMinutes: minutes(c.createdAt), waitingOn: "customer", waitingMinutes: c.answeredAt ? minutes(c.answeredAt) : null };
  const since = last && last.from === "customer" ? new Date(last.at) : c.createdAt;
  return { openMinutes: minutes(c.createdAt), waitingOn: "support", waitingMinutes: minutes(since) };
}

/** What can still be given back on the order: its total less the money decisions already made. */
export function refundable(order: Pick<MarketOrder, "money">, decided: Pick<MarketComplaint, "decision">[]): number {
  const given = decided.reduce((sum, c) => sum + (c.decision && c.decision.outcome !== "no_refund" && c.decision.outcome !== "compensation" ? (c.decision.amount ?? 0) : 0), 0);
  return Math.max(0, order.money.total - given);
}

export interface DecisionRequest {
  outcome: ComplaintDecision["outcome"];
  /** Minor units: a part refund or a compensation (a full refund is what is left). */
  amount?: number | null;
  to?: ComplaintDecision["to"];
  funder: ComplaintDecision["funder"];
  reason: string | null;
  shareWithVendor?: boolean;
}

export interface DecisionDeps {
  /** Gives money back on the order's payment (115.11's gateways); its error is shown to support. */
  refundToPayment?: (order: MarketOrder, amount: number, complaintId: number) => Promise<{ ok: true } | { ok: false; error: string }>;
  /** Makes a one-person coupon worth the amount (115.10) and returns its code. */
  makeCoupon?: (order: MarketOrder, amount: number, complaintId: number) => Promise<string>;
}

export type DecisionResult = { ok: true; complaint: MarketComplaint } | { ok: false; field: string | null; error: string };

/** Support's decision, carried out: the refund or credit given, the customer told, the ticket closed. */
export async function decideComplaint(store: DataStore, deps: DecisionDeps, complaint: MarketComplaint, order: MarketOrder, request: DecisionRequest, by: string, now: Date): Promise<DecisionResult> {
  if (complaint.decision) return { ok: false, field: null, error: "This complaint has a decision already." };
  if (complaint.orderId !== order.id || complaint.appId !== order.appId) return { ok: false, field: null, error: "This complaint isn't on that order." };
  const reason = request.reason?.trim().slice(0, 500) || null;
  const others = (await store.listMarketComplaints({ appId: order.appId, orderId: order.id, limit: 50, offset: 0 })).items.filter((c) => c.id !== complaint.id);
  const left = refundable(order, others);
  let amount: number | null = null;
  let to: ComplaintDecision["to"] = null;
  switch (request.outcome) {
    case "no_refund":
      if (!reason) return { ok: false, field: "reason", error: "Tell the customer why." };
      break;
    case "refund":
      amount = left;
      to = request.to ?? "payment";
      if (amount <= 0) return { ok: false, field: "amount", error: "This order has been refunded in full already." };
      break;
    case "partial_refund":
      amount = Math.round(request.amount ?? 0);
      to = request.to ?? "payment";
      if (amount <= 0) return { ok: false, field: "amount", error: "Enter the amount to give back." };
      if (amount > left) return { ok: false, field: "amount", error: "That's more than is left to give back on this order." };
      break;
    case "compensation":
      amount = Math.round(request.amount ?? 0);
      to = request.to === "coupon" ? "coupon" : "wallet";
      if (amount <= 0) return { ok: false, field: "amount", error: "Enter the compensation's amount." };
      break;
  }
  if (to === "payment" && order.paymentMethod === "cash") return { ok: false, field: "to", error: "This order was paid in cash. Give it back to the wallet or as a coupon." };
  if (to === "payment" && order.paymentMethod === "wallet") to = "wallet";
  if (to === "wallet" && order.userId === null) return { ok: false, field: "to", error: "This customer has no account to keep a wallet in." };

  let couponCode: string | null = null;
  if (amount !== null && to === "payment") {
    if (!deps.refundToPayment) return { ok: false, field: "to", error: "Refunds to the payment aren't set up for this app yet. Use the wallet or a coupon." };
    const done = await deps.refundToPayment(order, amount, complaint.id);
    if (!done.ok) return { ok: false, field: "to", error: done.error };
  } else if (amount !== null && to === "wallet") {
    const added = await store.addWalletEntry({
      appId: order.appId,
      userId: order.userId!,
      kind: request.outcome === "compensation" ? "credit" : "refund",
      amount,
      label: request.outcome === "compensation" ? "Compensation" : "Refund",
      orderId: order.id,
      complaintId: complaint.id,
      key: `complaint:${complaint.id}`,
      createdAt: now,
    });
    if (!added.ok && added.reason !== "duplicate") return { ok: false, field: "to", error: "The wallet couldn't be credited." };
  } else if (amount !== null && to === "coupon") {
    if (!deps.makeCoupon) return { ok: false, field: "to", error: "Coupons aren't set up for this app yet. Use the wallet." };
    couponCode = await deps.makeCoupon(order, amount, complaint.id);
  }

  const decision: ComplaintDecision = { outcome: request.outcome, amount, to, couponCode, funder: request.funder, reason, by, at: now };
  const message = reason ?? defaultDecisionText(decision);
  const patch: MarketComplaintPatch = {
    decision,
    status: request.outcome === "no_refund" ? "rejected" : "resolved",
    answeredAt: now,
    messages: [...complaint.messages, { id: nextMessageId(complaint), from: "support", text: message, by, at: now.toISOString() }],
    sharedWithVendor: request.shareWithVendor ?? complaint.sharedWithVendor,
    updatedAt: now,
  };
  if (!(await store.updateMarketComplaint(order.appId, complaint.id, patch))) return { ok: false, field: null, error: "The complaint couldn't be saved." };
  if (amount !== null && request.outcome !== "compensation" && to === "payment") {
    const refundedAll = amount >= left;
    await store.updateMarketOrder(order.appId, order.id, { paymentStatus: refundedAll ? "refunded" : "partly_refunded", updatedAt: now });
  }
  return { ok: true, complaint: { ...complaint, ...patch } as MarketComplaint };
}

function defaultDecisionText(d: ComplaintDecision): string {
  switch (d.outcome) {
    case "refund":
    case "partial_refund":
      return d.to === "wallet" ? "We've given the amount back to your wallet." : d.to === "coupon" ? `We've sent you a coupon for the amount: ${d.couponCode}.` : "We've refunded the amount to your payment. It can take a few days to show.";
    case "compensation":
      return d.to === "coupon" ? `We've sent you a coupon as an apology: ${d.couponCode}.` : "We've added a credit to your wallet as an apology.";
    case "no_refund":
      return "We looked into it and can't refund this order.";
  }
}

/** The decision as the vendor's statement counts it. */
export function complaintAdjustment(c: Pick<MarketComplaint, "orderId" | "decision">, reference: string): StatementAdjustment | null {
  const d = c.decision;
  if (!d || d.outcome === "no_refund" || !d.amount) return null;
  return { orderId: c.orderId, reference, at: new Date(d.at), kind: d.outcome === "compensation" ? "compensation" : "refund", amount: d.amount, funder: d.funder };
}

/** What the vendor reads: the complaint and its decision, never anyone's contact, the team's notes or the conversation. */
export function vendorComplaintView(c: MarketComplaint) {
  return {
    id: c.id,
    orderId: c.orderId,
    reason: c.reason,
    text: c.text,
    lineIds: c.lineIds,
    photoAssetIds: c.photoAssetIds,
    status: c.status,
    decision: c.decision ? { outcome: c.decision.outcome, amount: c.decision.amount, funder: c.decision.funder, at: c.decision.at } : null,
    createdAt: c.createdAt,
  };
}

/** Support's ready replies, to start an answer from. */
export const READY_REPLIES: Record<"en" | "ar" | "tr", { key: string; text: string }[]> = {
  en: [
    { key: "sorry_checking", text: "We're sorry about this. We're looking into it now and will come back to you shortly." },
    { key: "photo", text: "Could you send a photo of the items, so we can sort this out quickly?" },
    { key: "refund_wallet", text: "We've added the amount to your wallet. You can use it on your next order." },
    { key: "refund_payment", text: "We've refunded the amount to your payment. It can take a few days to show." },
    { key: "vendor_told", text: "Thank you for telling us. We've passed this on so it doesn't happen again." },
  ],
  ar: [
    { key: "sorry_checking", text: "نعتذر عن ذلك. نراجع الأمر الآن وسنعود إليك قريبًا." },
    { key: "photo", text: "هل يمكنك إرسال صورة للمنتجات لنحل الأمر بسرعة؟" },
    { key: "refund_wallet", text: "أضفنا المبلغ إلى محفظتك، ويمكنك استخدامه في طلبك القادم." },
    { key: "refund_payment", text: "أعدنا المبلغ إلى وسيلة الدفع، وقد يستغرق ظهوره بضعة أيام." },
    { key: "vendor_told", text: "شكرًا لإخبارنا. أبلغنا المتجر حتى لا يتكرر ذلك." },
  ],
  tr: [
    { key: "sorry_checking", text: "Bunun için üzgünüz. Şimdi inceliyoruz ve kısa süre içinde size döneceğiz." },
    { key: "photo", text: "Sorunu hızlıca çözebilmemiz için ürünlerin bir fotoğrafını gönderebilir misiniz?" },
    { key: "refund_wallet", text: "Tutarı cüzdanınıza ekledik. Bir sonraki siparişinizde kullanabilirsiniz." },
    { key: "refund_payment", text: "Tutarı ödeme yönteminize iade ettik. Görünmesi birkaç gün sürebilir." },
    { key: "vendor_told", text: "Bildirdiğiniz için teşekkürler. Tekrarlanmaması için işletmeye ilettik." },
  ],
};
