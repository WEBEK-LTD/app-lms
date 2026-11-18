import type { DataStore } from "../data/store";
import type { ComplaintDecision, ComplaintReason, MarketComplaint, MarketComplaintPatch, MarketOrder, Shipment } from "../data/types";
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

/** 115.50 Over this long since its last stage, an order still under way is stuck (D3): it can be complained about, and its window runs from that stage. */
export const COMPLAINT_STUCK_HOURS = 6;
/** 115.50 One ticket, and one more once the first has its decision (D3). */
export const COMPLAINT_TICKETS_PER_ORDER = 2;

type WindowOrder = Pick<MarketOrder, "status" | "completedAt" | "timeline" | "updatedAt" | "createdAt" | "deliveryBy" | "paymentMethod" | "paymentStatus" | "money">;
/** The order's courier job (104), when the app's couriers deliver it. */
export type WindowJob = Pick<Shipment, "status" | "timeline"> | null;

/** Money was taken for the order: paid online (refunded since or not), or part of it from the wallet. */
export function moneyTaken(order: Pick<MarketOrder, "paymentMethod" | "paymentStatus" | "money">): boolean {
  if (order.money.wallet > 0) return true;
  return order.paymentMethod !== "cash" && ["paid", "partly_refunded", "refunded"].includes(order.paymentStatus);
}

const stageAt = (timeline: { status: string; at: string }[], status: string) => {
  const stage = [...timeline].reverse().find((s) => s.status === status);
  return stage ? new Date(stage.at) : null;
};

/**
 * The order's last moment: an app courier's delivered stage (the job's own
 * time, not when the order was next read), else delivered or picked up,
 * else turned down or cancelled; null while it is still under way.
 */
function endedAt(order: WindowOrder, job: WindowJob): Date | null {
  if (order.deliveryBy === "app" && job?.status === "delivered" && order.status !== "cancelled" && order.status !== "rejected") {
    const at = stageAt(job.timeline, "delivered");
    if (at) return at;
  }
  if (order.completedAt) return order.completedAt;
  if (order.status === "rejected" || order.status === "cancelled") return stageAt(order.timeline, order.status) ?? order.updatedAt;
  return null;
}

/** The latest stage of an order still under way, its courier job's included. */
function lastStageAt(order: WindowOrder, job: WindowJob): Date {
  const times = [order.createdAt.getTime(), ...order.timeline.map((s) => Date.parse(s.at)), ...(order.deliveryBy === "app" && job ? job.timeline.map((s) => Date.parse(s.at)) : [])].filter(Number.isFinite);
  return new Date(Math.max(...times));
}

export interface ComplaintWindow {
  open: boolean;
  /** When it closes; null while the order is under way and not stuck. */
  until: Date | null;
  /** Under way with no new stage for COMPLAINT_STUCK_HOURS. */
  stuck: boolean;
  /** Why it is closed: not paid yet, turned down or cancelled with no money taken, or the 48 hours are over. */
  closed: "unpaid" | "no_money" | "ended" | null;
}

/** 115.50 Whether the customer may open a complaint now, and until when (D3). */
export function complaintWindow(order: WindowOrder, now: Date, job: WindowJob = null): ComplaintWindow {
  if (order.status === "awaiting_payment") return { open: false, until: null, stuck: false, closed: "unpaid" };
  if ((order.status === "rejected" || order.status === "cancelled") && !moneyTaken(order)) return { open: false, until: null, stuck: false, closed: "no_money" };
  const end = endedAt(order, job);
  if (end) {
    const until = new Date(end.getTime() + COMPLAINT_WINDOW_HOURS * 3600_000);
    return now < until ? { open: true, until, stuck: false, closed: null } : { open: false, until, stuck: false, closed: "ended" };
  }
  if (order.status === "scheduled") return { open: true, until: null, stuck: false, closed: null };
  const last = lastStageAt(order, job);
  if (now.getTime() - last.getTime() < COMPLAINT_STUCK_HOURS * 3600_000) return { open: true, until: null, stuck: false, closed: null };
  const until = new Date(last.getTime() + COMPLAINT_WINDOW_HOURS * 3600_000);
  return now < until ? { open: true, until, stuck: true, closed: null } : { open: false, until, stuck: true, closed: "ended" };
}

/** Whether the order may take a new ticket: none working, and fewer than COMPLAINT_TICKETS_PER_ORDER, the last one decided. */
export function ticketAllowed(tickets: Pick<MarketComplaint, "status" | "decision">[]): "ok" | "already_open" | "limit" {
  if (tickets.some((t) => ACTIVE_COMPLAINT.includes(t.status) && !t.decision)) return "already_open";
  return tickets.length >= COMPLAINT_TICKETS_PER_ORDER ? "limit" : "ok";
}

export interface ComplaintRequest {
  reason: string;
  text: string;
  lineIds: number[];
  photoAssetIds: string[];
}

export type ComplaintResult = { ok: true; complaint: MarketComplaint } | { ok: false; code: "window_closed" | "already_open" | "limit" | "invalid"; field: string | null; error: string };

/** The customer's complaint, checked against the order (and its courier job, for the window). */
export async function openComplaint(store: DataStore, order: MarketOrder, userId: number, request: ComplaintRequest, now: Date, job: WindowJob = null): Promise<ComplaintResult> {
  if (order.userId !== userId) return { ok: false, code: "invalid", field: null, error: "This isn't one of your orders." };
  const window = complaintWindow(order, now, job);
  if (!window.open)
    return {
      ok: false,
      code: "window_closed",
      field: null,
      error: window.closed === "no_money" ? "Nothing was paid for this order, so there's nothing to complain about." : window.closed === "unpaid" ? "This order isn't paid yet." : `Complaints can be sent until ${COMPLAINT_WINDOW_HOURS} hours after the order arrives.`,
    };
  if (!(COMPLAINT_REASONS as readonly string[]).includes(request.reason)) return { ok: false, code: "invalid", field: "reason", error: "Choose what went wrong." };
  const text = request.text.trim();
  if (text.length > COMPLAINT_TEXT_MAX) return { ok: false, code: "invalid", field: "text", error: `Keep it under ${COMPLAINT_TEXT_MAX} characters.` };
  if (!text && request.reason === "other") return { ok: false, code: "invalid", field: "text", error: "Tell us what went wrong." };
  const lineIds = [...new Set(request.lineIds)];
  if (lineIds.some((id) => !order.lines.some((l) => l.id === id))) return { ok: false, code: "invalid", field: "line_ids", error: "Choose items from this order." };
  const photos = [...new Set(request.photoAssetIds)];
  if (photos.length > COMPLAINT_MAX_PHOTOS) return { ok: false, code: "invalid", field: "photos", error: `Add up to ${COMPLAINT_MAX_PHOTOS} photos.` };
  // No items chosen: the whole order (115.50).
  const tickets = (await store.listMarketComplaints({ appId: order.appId, orderId: order.id, limit: 50, offset: 0 })).items;
  const allowed = ticketAllowed(tickets);
  if (allowed === "already_open") return { ok: false, code: "already_open", field: null, error: "This order already has a complaint we're working on. Add to it instead." };
  if (allowed === "limit") return { ok: false, code: "limit", field: null, error: "This order has had its complaints. Write to support on the last one." };
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

/** A person's first name, as the customer reads it ("Nour"): from their name, else the part of their email before the @. */
export function agentFirstName(name: string | null | undefined, email: string | null | undefined): string | null {
  const fromName = name?.trim().split(/\s+/)[0];
  if (fromName) return fromName.slice(0, 40);
  const local = email?.split("@")[0]?.split(/[._+-]/)[0];
  return local ? (local[0]!.toUpperCase() + local.slice(1)).slice(0, 40) : null;
}

/** The thread's messages, without the "took it" lines. */
export function threadMessages(c: Pick<MarketComplaint, "messages">) {
  return c.messages.filter((m) => m.kind !== "taken");
}

/**
 * 115.51 Support's answer to the customer, as "<App> support" with the
 * person's first name. Before a decision the ticket then waits for the
 * customer; after one the conversation goes on and the decision stays.
 */
export function supportReply(c: MarketComplaint, text: string, by: string, now: Date, name: string | null = null): MarketComplaintPatch | null {
  const t = text.trim().slice(0, COMPLAINT_TEXT_MAX);
  if (!t) return null;
  const message = { id: nextMessageId(c), from: "support" as const, text: t, by, name, at: now.toISOString() };
  if (c.decision) return { messages: [...c.messages, message], answeredAt: now, updatedAt: now };
  if (!ACTIVE_COMPLAINT.includes(c.status)) return null;
  return { messages: [...c.messages, message], answeredAt: now, status: "waiting_for_customer", updatedAt: now };
}

/** The customer's message: support's turn again. After a decision it's written in the same thread and the decision isn't reopened. */
export function customerMessage(c: MarketComplaint, text: string, now: Date): MarketComplaintPatch | null {
  const t = text.trim().slice(0, COMPLAINT_TEXT_MAX);
  if (!t) return null;
  const message = { id: nextMessageId(c), from: "customer" as const, text: t, by: null, at: now.toISOString() };
  if (c.decision) return { messages: [...c.messages, message], updatedAt: now };
  return { messages: [...c.messages, message], status: "in_review", updatedAt: now };
}

/** Someone on the team takes the ticket: theirs, in review, and the customer reads who took it. */
export function takeComplaint(c: MarketComplaint, by: string, name: string | null, now: Date): MarketComplaintPatch {
  const told = c.messages.some((m) => m.kind === "taken" && m.by === by);
  return {
    assignee: by,
    ...(c.status === "open" && !c.decision ? { status: "in_review" as const } : {}),
    ...(told ? {} : { messages: [...c.messages, { id: nextMessageId(c), from: "support" as const, text: "", by, name, kind: "taken" as const, at: now.toISOString() }] }),
    updatedAt: now,
  };
}

export function teamNote(c: MarketComplaint, text: string, by: string, now: Date): MarketComplaintPatch | null {
  const t = text.trim().slice(0, COMPLAINT_TEXT_MAX);
  return t ? { notes: [...c.notes, { text: t, by, at: now.toISOString() }], updatedAt: now } : null;
}

/** The decision's time as a date (the JSON column reads it back as a string). */
export function decidedAt(d: Pick<ComplaintDecision, "at">): Date {
  return d.at instanceof Date ? d.at : new Date(d.at);
}

/** After a decision, the customer wrote last and support hasn't answered: it waits on support again, the decision kept. */
export function awaitsSupportAfterDecision(c: Pick<MarketComplaint, "decision" | "messages">): boolean {
  if (!c.decision) return false;
  const last = threadMessages(c).at(-1);
  return !!last && last.from === "customer" && Date.parse(last.at) > decidedAt(c.decision).getTime();
}

/** Whose turn it is and for how long, for the queue: since it opened, and since the last reply (the customer's last word, or support's when the customer is to answer). */
export function queueTimers(c: Pick<MarketComplaint, "status" | "createdAt" | "answeredAt" | "messages" | "decision">, now: Date): { openMinutes: number; waitingOn: "support" | "customer" | null; waitingMinutes: number | null } {
  const minutes = (from: Date) => Math.max(0, Math.floor((now.getTime() - from.getTime()) / 60_000));
  const last = threadMessages(c).at(-1);
  if (c.decision || !ACTIVE_COMPLAINT.includes(c.status)) {
    return c.decision && awaitsSupportAfterDecision(c) ? { openMinutes: minutes(c.createdAt), waitingOn: "support", waitingMinutes: minutes(new Date(last!.at)) } : { openMinutes: minutes(c.createdAt), waitingOn: null, waitingMinutes: null };
  }
  if (c.status === "waiting_for_customer") return { openMinutes: minutes(c.createdAt), waitingOn: "customer", waitingMinutes: c.answeredAt ? minutes(c.answeredAt) : null };
  const since = last ? (last.from === "customer" ? new Date(last.at) : (c.answeredAt ?? new Date(last.at))) : c.createdAt;
  return { openMinutes: minutes(c.createdAt), waitingOn: "support", waitingMinutes: minutes(since) };
}

/** 115.53 The queue's colour for "since last reply": amber and red after the owner's minutes (15 and 60 unless set). */
export const DEFAULT_REPLY_COLOURS = { amberMinutes: 15, redMinutes: 60 } as const;

export function replyColoursOf(settings: { supportReply?: { amberMinutes: number; redMinutes: number } } | null | undefined): { amberMinutes: number; redMinutes: number } {
  const s = settings?.supportReply;
  if (!s || !Number.isInteger(s.amberMinutes) || !Number.isInteger(s.redMinutes) || s.amberMinutes < 1 || s.redMinutes <= s.amberMinutes) return { ...DEFAULT_REPLY_COLOURS };
  return { amberMinutes: s.amberMinutes, redMinutes: s.redMinutes };
}

export function replyTone(waitingMinutes: number | null, waitingOn: "support" | "customer" | null, colours: { amberMinutes: number; redMinutes: number }): "ok" | "amber" | "red" | null {
  if (waitingMinutes === null || waitingOn !== "support") return null;
  return waitingMinutes >= colours.redMinutes ? "red" : waitingMinutes >= colours.amberMinutes ? "amber" : "ok";
}

/** Money already given back on the order: refunds to the payment and to the wallet (coupons aren't money back). */
function moneyGiven(decided: Pick<MarketComplaint, "decision">[], to?: "payment"): number {
  return decided.reduce((sum, c) => {
    const d = c.decision;
    if (!d || d.outcome === "no_refund" || d.outcome === "compensation" || !d.amount) return sum;
    if (d.to === "coupon" || (to && d.to !== to)) return sum;
    return sum + (to === "payment" ? (d.cardAmount ?? d.amount) : d.amount);
  }, 0);
}

/** What can still be given back on the order: what was paid less the money refunds already made. */
export function refundable(order: Pick<MarketOrder, "money">, decided: Pick<MarketComplaint, "decision">[]): number {
  return Math.max(0, order.money.total - moneyGiven(decided));
}

/** What can still go back to the card: what was paid online, less earlier refunds to it. */
export function refundableToPayment(order: Pick<MarketOrder, "money" | "paymentMethod">, decided: Pick<MarketComplaint, "decision">[]): number {
  if (order.paymentMethod === "cash" || order.paymentMethod === "wallet") return 0;
  return Math.max(0, order.money.payNow - moneyGiven(decided, "payment"));
}

/** 115.52 A complaint's coupon lasts 30 days. */
export const COMPLAINT_COUPON_DAYS = 30;

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
  /** Makes a one-use coupon worth the amount at the order's place (115.10), for COMPLAINT_COUPON_DAYS, and returns its code and last day. */
  makeCoupon?: (order: MarketOrder, amount: number, complaintId: number) => Promise<{ code: string; endsAt: Date | null }>;
}

export type DecisionResult = { ok: true; complaint: MarketComplaint } | { ok: false; field: string | null; error: string };

/**
 * 115.52 Support's decision, carried out: a refund to the card (the
 * gateway's refund, never more than was paid online), to the wallet (at
 * once, once), a coupon (it may be worth more than the refund, never more
 * than the order), a compensation, or no refund with the reason. The
 * customer is told in the thread; the ticket is then resolved or closed,
 * and the conversation can go on.
 */
export async function decideComplaint(store: DataStore, deps: DecisionDeps, complaint: MarketComplaint, order: MarketOrder, request: DecisionRequest, by: string, now: Date, byName: string | null = null): Promise<DecisionResult> {
  if (complaint.decision) return { ok: false, field: null, error: "This complaint has a decision already." };
  if (complaint.orderId !== order.id || complaint.appId !== order.appId) return { ok: false, field: null, error: "This complaint isn't on that order." };
  const reason = request.reason?.trim().slice(0, 500) || null;
  const others = (await store.listMarketComplaints({ appId: order.appId, orderId: order.id, limit: 50, offset: 0 })).items.filter((c) => c.id !== complaint.id);
  const left = refundable(order, others);
  const cardLeft = refundableToPayment(order, others);
  let amount: number | null = null;
  let to: ComplaintDecision["to"] = null;
  const asked = request.amount === null || request.amount === undefined ? null : Math.round(request.amount);
  switch (request.outcome) {
    case "no_refund":
      if (!reason) return { ok: false, field: "reason", error: "Tell the customer why." };
      break;
    case "refund":
      to = request.to ?? "payment";
      amount = to === "coupon" && asked !== null && asked > 0 ? asked : left;
      if (left <= 0) return { ok: false, field: "amount", error: "This order has been refunded in full already." };
      break;
    case "partial_refund":
      amount = asked ?? 0;
      to = request.to ?? "payment";
      if (amount <= 0) return { ok: false, field: "amount", error: "Enter the amount to give back." };
      if (to !== "coupon" && amount > left) return { ok: false, field: "amount", error: "That's more than is left to give back on this order." };
      break;
    case "compensation":
      amount = asked ?? 0;
      to = request.to === "coupon" ? "coupon" : "wallet";
      if (amount <= 0) return { ok: false, field: "amount", error: "Enter the compensation's amount." };
      break;
  }
  if (amount !== null && (to === "coupon" || request.outcome === "compensation") && amount > order.money.total) return { ok: false, field: "amount", error: "A coupon or a compensation can be worth up to the order's total." };
  if (to === "payment" && order.paymentMethod === "cash") return { ok: false, field: "to", error: "This order was paid in cash. Give it back to the wallet or as a coupon." };
  if (to === "payment" && order.paymentMethod === "wallet") to = "wallet";
  if ((to === "wallet" || to === "coupon") && order.userId === null) return { ok: false, field: "to", error: "This customer has no account to keep a wallet or a coupon in." };

  // The card takes back at most what it paid; a full refund gives the wallet's part back to the wallet.
  let toCard = 0;
  let toWallet = 0;
  if (amount !== null && to === "payment") {
    toCard = Math.min(amount, cardLeft);
    toWallet = amount - toCard;
    if (request.outcome === "partial_refund" && toWallet > 0) return { ok: false, field: "amount", error: "That's more than can go back to the card. Give the rest to the wallet." };
    if (toCard <= 0) to = "wallet";
  }
  if (amount !== null && to === "wallet") toWallet = amount;

  let couponCode: string | null = null;
  let couponEndsAt: string | null = null;
  if (toCard > 0) {
    if (!deps.refundToPayment) return { ok: false, field: "to", error: "Refunds to the payment aren't set up for this app yet. Use the wallet or a coupon." };
    const done = await deps.refundToPayment(order, toCard, complaint.id);
    if (!done.ok) return { ok: false, field: "to", error: done.error };
  }
  if (toWallet > 0) {
    const added = await store.addWalletEntry({
      appId: order.appId,
      userId: order.userId!,
      kind: request.outcome === "compensation" ? "credit" : "refund",
      amount: toWallet,
      label: request.outcome === "compensation" ? "Compensation" : "Refund",
      orderId: order.id,
      complaintId: complaint.id,
      key: `complaint:${complaint.id}`,
      createdAt: now,
    });
    if (!added.ok && added.reason !== "duplicate") return { ok: false, field: "to", error: "The wallet couldn't be credited." };
  }
  if (amount !== null && to === "coupon") {
    if (!deps.makeCoupon) return { ok: false, field: "to", error: "Coupons aren't set up for this app yet. Use the wallet." };
    const coupon = await deps.makeCoupon(order, amount, complaint.id);
    couponCode = coupon.code;
    couponEndsAt = coupon.endsAt ? coupon.endsAt.toISOString() : null;
  }

  const decision: ComplaintDecision = { outcome: request.outcome, amount, to, couponCode, couponEndsAt, cardAmount: to === "payment" ? toCard : null, funder: request.funder, reason, by, byName, at: now };
  const message = reason ?? defaultDecisionText(decision);
  const patch: MarketComplaintPatch = {
    decision,
    status: request.outcome === "no_refund" ? "rejected" : "resolved",
    answeredAt: now,
    messages: [...complaint.messages, { id: nextMessageId(complaint), from: "support", text: message, by, name: byName, at: now.toISOString() }],
    sharedWithVendor: request.shareWithVendor ?? complaint.sharedWithVendor,
    updatedAt: now,
  };
  if (!(await store.updateMarketComplaint(order.appId, complaint.id, patch))) return { ok: false, field: null, error: "The complaint couldn't be saved." };
  if (toCard > 0) {
    const refundedAll = (amount ?? 0) >= left;
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
  return { orderId: c.orderId, reference, at: decidedAt(d), kind: d.outcome === "compensation" ? "compensation" : "refund", amount: d.amount, funder: d.funder };
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
