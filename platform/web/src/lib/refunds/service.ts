import { recordAudit } from "../admin/audit";
import { formatCents } from "../catalog/money";
import { accountForOrder, orderNumber } from "../catalog/settings";
import type { DataStore } from "../data/store";
import type { App, CatalogOrder, Donation, PaymentProviderId, PaymentRefund } from "../data/types";
import { donationAccount } from "../donations/payment";
import { donationReference } from "../donations/service";
import type { EmailTemplateKey, TemplateValue } from "../email/templates";
import { PROVIDER_NAME, type PaymentAccount, type ProviderUrls } from "../payments/provider";
import { isRefundReason, refundsByApi, refundThroughProvider, REFUND_REASONS, type RefundReason } from "../payments/refund";

/**
 * 47 Refunds from the dashboard (apps without a website that take card
 * payments): the owner refunds a paid order (products, a restaurant's
 * order, tickets, paid courses, memberships) or a donation, in full or in
 * part. Through the provider's API when it has one (iyzico, Kashier) with
 * the account the payment was taken with; Fawaterk's are made in its panel
 * and recorded here. Each refund is recorded (amount, reason, who, when,
 * the provider's references), the order or donation follows (all of it
 * refunded: "Refunded"), what it paid for is taken back (a refunded ticket
 * frees its place, a course purchase loses access, a membership ends; in
 * part only what the owner ticks), a donation leaves its campaign's total,
 * the customer gets an email and the audit log an entry.
 *
 * Marketplace orders (sold through Yallapp's account): the refund comes out
 * of Yallapp's account, and Yallapp's commission is given back in
 * proportion (owner to confirm, roadmap 47). iyzico refunds the item
 * transactions it split, so its split follows; with Kashier the team
 * deducts the shop's share of it from the next transfer once the payout
 * was released. A Fawaterk marketplace payment can't be refunded by the
 * shop: it is in Yallapp's Fawaterk account, so the team refunds it.
 */

export interface RefundActor {
  /** The user ID of who made it (the owner, or the team member managing the dashboard). */
  id: string | null;
  email: string;
}

export interface RefundDeps {
  store: DataStore;
  /** The platform's encryption key (the payment keys). */
  key: Buffer;
  urls?: ProviderUrls;
  fetcher?: typeof fetch;
  now: Date;
  /** The owner's address, which iyzico asks for. */
  ip: string;
  actor: RefundActor;
  /** Sends a template email in the app's name; failures are ignored. */
  mail: (key: EmailTemplateKey, to: string, values: Record<string, TemplateValue>, app: App) => Promise<unknown>;
}

/** What the owner chose in the form. */
export interface RefundInput {
  cents: number;
  reason: RefundReason;
  /** The owner's words, sent to the provider and kept; null for none. */
  note: string | null;
  /** "api": through the provider; "manual": already refunded in the provider's panel, recorded here. */
  method: "api" | "manual";
  /** Manual: the provider's reference for it, if the owner has one. */
  providerRef?: string | null;
  /** A refund in part takes back only these (all of it takes back everything). */
  revoke?: { tickets?: number[]; courses?: number[]; memberships?: number[] };
}

export type RefundResult = { ok: true; refund: PaymentRefund; message: string } | { ok: false; message: string };

/** What can be taken back with an order's refund, by kind. */
export interface Revocable {
  tickets: { id: number; label: string }[];
  courses: { id: number; label: string }[];
  memberships: { id: number; label: string }[];
}

/** What the refund form of an order or donation shows. */
export interface RefundOptions {
  /** False with the reason when nothing can be refunded here. */
  refundable: boolean;
  why: string | null;
  provider: PaymentProviderId;
  /** What's left to refund. */
  leftCents: number;
  /** Through the provider's API (iyzico, Kashier with the account it was paid with). */
  byApi: boolean;
  /** Recording a refund made in the provider's panel. */
  manual: boolean;
  marketplace: boolean;
  revocable: Revocable;
}

const NONE: Revocable = { tickets: [], courses: [], memberships: [] };
const PAID_ORDER = new Set<CatalogOrder["status"]>(["processing", "completed", "cancelled"]);

function readableDate(date: Date): string {
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

/** An amount like "150" or "150.50" in cents; null when it isn't one. */
export function parseRefundAmount(value: string): number | null {
  const text = value.trim().replace(",", ".");
  if (!/^\d{1,9}(\.\d{1,2})?$/.test(text)) return null;
  const cents = Math.round(Number(text) * 100);
  return cents > 0 ? cents : null;
}

/** What a paid order's refund can take back: its tickets, courses or memberships. */
export async function orderRevocable(store: DataStore, app: App, order: CatalogOrder): Promise<Revocable> {
  const kind = app.connector?.kind;
  if (kind === "events") {
    const tickets = await store.listTickets({
      appId: app.id,
      orderId: order.id,
    });
    return {
      ...NONE,
      tickets: tickets
        .filter((t) => t.status === "valid")
        .map((t) => ({
          id: t.id,
          label: `Ticket ${t.code.slice(0, 4)}-${t.code.slice(4, 8)}-${t.code.slice(8)} · ${t.holderName}`,
        })),
    };
  }
  if (kind === "courses" && order.userId !== null) {
    const enrolled = await store.listCourseEnrollments({
      appId: app.id,
      userId: order.userId,
    });
    const courses = order.lines.filter((l) => enrolled.some((e) => e.courseId === l.productId));
    return {
      ...NONE,
      courses: courses.map((l) => ({
        id: l.productId,
        label: `Access to ${l.name}`,
      })),
    };
  }
  if (kind === "bookings" && order.userId !== null) {
    const memberships = await store.listMemberships({
      appId: app.id,
      userId: order.userId,
      limit: 500,
    });
    return {
      ...NONE,
      memberships: memberships.filter((m) => m.orderId === order.id && m.status === "active").map((m) => ({ id: m.id, label: `Membership: ${m.planName}` })),
    };
  }
  return NONE;
}

async function orderAccount(deps: Pick<RefundDeps, "store" | "key">, app: App, order: CatalogOrder): Promise<PaymentAccount | null> {
  return (await accountForOrder(deps.store, app, order, deps.key))?.account ?? null;
}

export async function orderRefundOptions(deps: Pick<RefundDeps, "store" | "key">, app: App, order: CatalogOrder): Promise<RefundOptions> {
  const provider = order.paymentProvider ?? "iyzico";
  const leftCents = order.totalCents - (order.refundedCents ?? 0);
  const marketplace = order.commissionCents !== null;
  const base = {
    provider,
    leftCents,
    marketplace,
    byApi: false,
    manual: false,
    revocable: NONE,
  };
  if (app.demo) return { ...base, refundable: false, why: "Demo orders charge nothing." };
  if (!PAID_ORDER.has(order.status) || leftCents <= 0 || !order.paidAt) return { ...base, refundable: false, why: null };
  const account = refundsByApi(provider) ? await orderAccount(deps, app, order) : null;
  const byApi = account !== null && account.provider === provider;
  // A marketplace payment is in Yallapp's account: the owner can't refund it in a panel of their own.
  const manual = !marketplace;
  const revocable = await orderRevocable(deps.store, app, order);
  if (!byApi && !manual) {
    return {
      ...base,
      revocable,
      refundable: false,
      why: `This payment is in Yallapp's ${PROVIDER_NAME[provider]} account: message us on WhatsApp and our team refunds it.`,
    };
  }
  return { ...base, byApi, manual, revocable, refundable: true, why: null };
}

export async function donationRefundOptions(deps: Pick<RefundDeps, "key">, app: App, donation: Donation): Promise<RefundOptions> {
  const provider = donation.paymentProvider ?? "iyzico";
  const leftCents = donation.amountCents - (donation.refundedCents ?? 0);
  const base = {
    provider,
    leftCents,
    marketplace: false,
    byApi: false,
    manual: false,
    revocable: NONE,
  };
  if (app.demo)
    return {
      ...base,
      refundable: false,
      why: "Demo donations charge nothing.",
    };
  if ((donation.status !== "paid" && donation.status !== "refunded") || leftCents <= 0 || !donation.paidAt) return { ...base, refundable: false, why: null };
  const account = refundsByApi(provider) ? donationAccount(app, deps.key) : null;
  return {
    ...base,
    byApi: account !== null && account.provider === provider,
    manual: true,
    refundable: true,
    why: null,
  };
}

/** Reads the refund form; the errors per field otherwise. */
export function readRefundForm(
  form: {
    amount: string;
    reason: string;
    note: string;
    method: string;
    reference: string;
    tickets: string[];
    courses: string[];
    memberships: string[];
  },
  options: RefundOptions,
): { ok: true; input: RefundInput } | { ok: false; errors: Record<string, string> } {
  const errors: Record<string, string> = {};
  const cents = parseRefundAmount(form.amount);
  if (cents === null) errors.amount = "Enter an amount, like 150 or 150.50.";
  else if (cents > options.leftCents) errors.amount = "That's more than what's left to refund.";
  if (!isRefundReason(form.reason)) errors.reason = "Choose a reason.";
  const method = form.method === "manual" ? "manual" : "api";
  if (method === "api" && !options.byApi) errors.method = "Refund it in your provider's panel, then record it here.";
  if (method === "manual" && !options.manual) errors.method = "Refund it here, through the provider.";
  if (Object.keys(errors).length) return { ok: false, errors };
  const ids = (list: string[]) => list.map(Number).filter((n) => Number.isSafeInteger(n) && n > 0);
  return {
    ok: true,
    input: {
      cents: cents!,
      reason: form.reason as RefundReason,
      note: form.note.trim().slice(0, 300) || null,
      method,
      providerRef: method === "manual" ? form.reference.trim().slice(0, 191) || null : null,
      revoke: {
        tickets: ids(form.tickets),
        courses: ids(form.courses),
        memberships: ids(form.memberships),
      },
    },
  };
}

/** What a refunded order takes back: all of it, or what the owner ticked. */
async function toRevoke(store: DataStore, app: App, order: CatalogOrder, all: boolean, chosen: RefundInput["revoke"]): Promise<PaymentRefund["revoked"]> {
  const can = await orderRevocable(store, app, order);
  const pick = (list: { id: number }[], ids: number[] | undefined) => list.map((x) => x.id).filter((id) => all || (ids ?? []).includes(id));
  return {
    tickets: pick(can.tickets, chosen?.tickets),
    courses: pick(can.courses, chosen?.courses),
    memberships: pick(can.memberships, chosen?.memberships),
  };
}

async function applyRevoke(store: DataStore, app: App, order: CatalogOrder, revoked: PaymentRefund["revoked"], now: Date): Promise<void> {
  // A refunded ticket frees its place: it is cancelled, and says it was refunded.
  if (revoked.tickets.length) await store.cancelTickets(app.id, { ids: revoked.tickets, refunded: true }, now);
  for (const courseId of revoked.courses) if (order.userId !== null) await store.leaveCourse(app.id, order.userId, courseId);
  for (const id of revoked.memberships)
    await store.updateMembership(app.id, id, {
      status: "cancelled",
      endsAt: now,
      updatedAt: now,
    });
}

interface Target {
  kind: PaymentRefund["kind"];
  id: number;
  totalCents: number;
  refundedCents: number;
  currency: CatalogOrder["currency"];
  provider: PaymentProviderId;
  paymentId: string | null;
  providerRef: string | null;
  paidAt: Date;
  conversationId: string;
  /** "order 1042", "donation D-1042". */
  label: string;
  customer: { name: string; email: string } | null;
}

async function refund(
  deps: RefundDeps,
  app: App,
  target: Target,
  account: PaymentAccount | null,
  input: RefundInput,
  extra: {
    commission: (cents: number) => number | null;
    /** What it takes back, decided before it is recorded and done after. */
    takeBack: (all: boolean) => Promise<PaymentRefund["revoked"]>;
    apply: (revoked: PaymentRefund["revoked"]) => Promise<void>;
  },
): Promise<RefundResult> {
  const left = target.totalCents - target.refundedCents;
  if (input.cents <= 0 || input.cents > left) return { ok: false, message: "That's more than what's left to refund." };
  let parts: PaymentRefund["parts"] = [];
  let warning: string | null = null;
  if (input.method === "api") {
    if (!account || account.provider !== target.provider)
      return {
        ok: false,
        message: `The ${PROVIDER_NAME[target.provider]} keys this payment was taken with aren't set. Refund it in the provider's panel and record it here.`,
      };
    const done = await refundThroughProvider(
      account,
      {
        conversationId: target.conversationId,
        paymentId: target.paymentId,
        providerRef: target.providerRef,
        currency: target.currency,
        paidCents: target.totalCents,
        paidAt: target.paidAt,
        cents: input.cents,
        earlier: (await deps.store.listRefunds(app.id, target.kind, [target.id])).flatMap((r) => r.parts),
        refundedBeforeCents: target.refundedCents,
        reason: input.reason,
        note: input.note ?? "",
        ip: deps.ip,
        now: deps.now,
      },
      { fetcher: deps.fetcher, urls: deps.urls },
    );
    parts = done.parts;
    warning = done.error;
    if (parts.length === 0)
      return {
        ok: false,
        message: `Nothing was refunded. ${done.error ?? ""}`.trim(),
      };
  }
  const cents = input.method === "api" ? parts.reduce((sum, p) => sum + p.cents, 0) : input.cents;
  const all = target.refundedCents + cents === target.totalCents;
  const revoked = await extra.takeBack(all);
  const refunded = await deps.store.recordRefund({
    appId: app.id,
    kind: target.kind,
    targetId: target.id,
    amountCents: cents,
    currency: target.currency,
    reason: input.reason,
    note: input.note,
    provider: target.provider,
    method: input.method,
    parts,
    providerRef:
      input.method === "api"
        ? parts
            .map((p) => p.reference)
            .join(", ")
            .slice(0, 191) || null
        : (input.providerRef ?? null),
    commissionCents: extra.commission(cents),
    revoked,
    byUserId: deps.actor.id,
    byEmail: deps.actor.email,
    createdAt: deps.now,
  });
  if (!refunded)
    return {
      ok: false,
      message: "It was refunded meanwhile. Reload the page to see it.",
    };
  await extra.apply(revoked);
  const money = (c: number) => formatCents(c, target.currency);
  if (target.customer?.email) {
    await deps
      .mail(
        "payment_refunded",
        target.customer.email,
        {
          org_name: app.appName ?? "The business",
          customer_name: target.customer.name || "customer",
          amount: money(cents),
          what: target.label,
          total_refunded: `${money(target.refundedCents + cents)} of ${money(target.totalCents)}`,
          date: readableDate(deps.now),
        },
        app,
      )
      .catch(() => {
        // The refund is made either way; the dashboard shows it.
      });
  }
  const how = input.method === "api" ? `through ${PROVIDER_NAME[target.provider]}` : `recorded (made in ${PROVIDER_NAME[target.provider]}'s panel)`;
  await recordAudit(
    {
      actor: { id: deps.actor.id ?? "", email: deps.actor.email },
      action: "payment.refund",
      target: { type: target.kind, id: `${app.id}:${target.id}` },
      clientId: app.clientId,
      summary: `Refunded ${money(cents)} of ${target.label} ${how}: ${REFUND_REASONS[input.reason]}${app.appName ? ` (${app.appName})` : ""}`,
      after: {
        amountCents: cents,
        reason: input.reason,
        note: input.note,
        providerRef: refunded.providerRef,
        commissionCents: refunded.commissionCents,
        revoked,
      },
    },
    { store: deps.store, now: deps.now },
  );
  const message = `Refunded ${money(cents)}${all ? ": all of it" : ""}.${warning ? ` ${money(input.cents - cents)} wasn't: ${warning}` : ""}`;
  return { ok: true, refund: refunded, message };
}

/** Refunds part or all of a paid order. */
export async function refundOrder(deps: RefundDeps, app: App, order: CatalogOrder, input: RefundInput): Promise<RefundResult> {
  const options = await orderRefundOptions(deps, app, order);
  if (!options.refundable)
    return {
      ok: false,
      message: options.why ?? "This order can't be refunded.",
    };
  if (input.method === "manual" && !options.manual)
    return {
      ok: false,
      message: options.why ?? "Refund it here, through the provider.",
    };
  const account = input.method === "api" ? await orderAccount(deps, app, order) : null;
  return refund(
    deps,
    app,
    {
      kind: "order",
      id: order.id,
      totalCents: order.totalCents,
      refundedCents: order.refundedCents ?? 0,
      currency: order.currency,
      provider: options.provider,
      paymentId: order.paymentId,
      providerRef: order.providerRef ?? null,
      paidAt: order.paidAt!,
      conversationId: `order-${orderNumber(order)}`,
      label: `order ${orderNumber(order)}`,
      customer: order.customer ? { name: order.customer.name, email: order.customer.email } : null,
    },
    account,
    input,
    {
      // Yallapp's commission goes back in proportion to what's refunded of what's left; all of it with the last refund.
      commission: (cents) =>
        order.commissionCents === null ? null : Math.min(order.commissionCents, Math.round((order.commissionCents * cents) / options.leftCents)),
      takeBack: (all) => toRevoke(deps.store, app, order, all, input.revoke),
      apply: (revoked) => applyRevoke(deps.store, app, order, revoked, deps.now),
    },
  );
}

/** Refunds part or all of a donation; its campaign's total goes down by it. */
export async function refundDonation(deps: RefundDeps, app: App, donation: Donation, input: RefundInput): Promise<RefundResult> {
  const options = await donationRefundOptions(deps, app, donation);
  if (!options.refundable)
    return {
      ok: false,
      message: options.why ?? "This donation can't be refunded.",
    };
  const account = input.method === "api" ? donationAccount(app, deps.key) : null;
  return refund(
    deps,
    app,
    {
      kind: "donation",
      id: donation.id,
      totalCents: donation.amountCents,
      refundedCents: donation.refundedCents ?? 0,
      currency: donation.currency,
      provider: options.provider,
      paymentId: donation.paymentId,
      providerRef: donation.providerRef ?? null,
      paidAt: donation.paidAt!,
      conversationId: `donation-${donationReference(donation)}`,
      label: `donation ${donationReference(donation)}`,
      customer: donation.donorEmail ? { name: donation.donorName ?? "", email: donation.donorEmail } : null,
    },
    account,
    input,
    {
      commission: () => null,
      takeBack: async () => ({ tickets: [], courses: [], memberships: [] }),
      apply: async () => undefined,
    },
  );
}

/** "Refunded ₺150.00 of ₺450.00": a line for the dashboard and the app; null for nothing refunded. */
export function refundedLine(refundedCents: number | undefined, totalCents: number, currency: CatalogOrder["currency"]): string | null {
  if (!refundedCents) return null;
  return refundedCents >= totalCents
    ? `Refunded ${formatCents(refundedCents, currency)}`
    : `Refunded ${formatCents(refundedCents, currency)} of ${formatCents(totalCents, currency)}`;
}
