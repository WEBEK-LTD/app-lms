import type { PaymentProviderId } from "../data/types";
import { PaymentError } from "./errors";
import { explainPaymentError } from "./explain";
import { cancelIyzicoPayment, refundIyzicoItem, retrieveIyzicoPayment, type IyzicoRefundReason } from "./iyzico";
import { getKashierSessionPayment, refundKashierPayment } from "./kashier";
import { PROVIDER_NAME, type PaymentAccount, type ProviderOptions } from "./provider";

/**
 * 47 Refunds through each provider's documented API, with the account the
 * payment was taken with:
 *
 * - iyzico: a whole payment on the day it was taken is cancelled
 *   (`/payment/cancel`, nothing on the customer's statement); otherwise, or
 *   when iyzico won't cancel it, each basket item's transaction is refunded
 *   (`/payment/refund`), as iyzico refunds per item, never more than was
 *   paid for it. The items come from the payment itself (`/payment/detail`),
 *   less what earlier refunds took from each.
 * - Kashier: one `PUT /v3/orders/{orderId}/` with `apiOperation: "REFUND"`
 *   and the amount, naming the payment's transaction (both read back from
 *   the payment session).
 * - Fawaterk: its API v2 (the one the payments use) has no refund call, so
 *   the owner refunds in Fawaterk's panel and records it (`manual`).
 *
 * A refund made of several calls (iyzico items) can stop half-way: what was
 * done is returned with the error, so it is recorded and nothing is
 * refunded twice.
 */

/** Which providers refund through their API; the others are refunded in their panel and recorded. */
export function refundsByApi(provider: PaymentProviderId): boolean {
  return provider === "iyzico" || provider === "kashier";
}

export type RefundReason = "buyer_request" | "double_payment" | "fraud" | "other";

export const REFUND_REASONS: Record<RefundReason, string> = {
  buyer_request: "The customer asked",
  double_payment: "Paid twice",
  fraud: "Fraud",
  other: "Other",
};

export function isRefundReason(value: unknown): value is RefundReason {
  return typeof value === "string" && Object.hasOwn(REFUND_REASONS, value);
}

export interface ProviderRefundRequest {
  /** iyzico's conversation ID for the payment ("order-1042"). */
  conversationId: string;
  /** The provider's payment ID kept when it was paid (iyzico's paymentId, Kashier's transaction). */
  paymentId: string | null;
  /** Kashier's payment session (the payment is read back from it). */
  providerRef: string | null;
  currency: string;
  /** What the customer paid. */
  paidCents: number;
  paidAt: Date;
  /** This refund. */
  cents: number;
  /** What earlier refunds took from each iyzico item transaction. */
  earlier: { transactionId: string | null; cents: number }[];
  /** Anything refunded before (any provider part). */
  refundedBeforeCents: number;
  reason: RefundReason;
  /** The owner's words, sent to the provider (no personal data). */
  note: string;
  /** The owner's address, which iyzico asks for. */
  ip: string;
  now: Date;
}

export interface RefundPart {
  /** "cancel": iyzico cancelled the whole payment; "refund": a refund (of an item, for iyzico). */
  kind: "cancel" | "refund";
  /** iyzico's item transaction refunded; null for the others. */
  transactionId: string | null;
  cents: number;
  /** The provider's reference for it. */
  reference: string;
}

export interface ProviderRefund {
  parts: RefundPart[];
  /** Why it stopped before the whole amount was refunded; null when it was. */
  error: string | null;
}

/** The day in Turkey (iyzico's end-of-day report closes iyzico's day). */
function turkishDay(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Istanbul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

const message = (e: unknown, provider: PaymentProviderId) =>
  e instanceof PaymentError
    ? e.unreachable
      ? `${PROVIDER_NAME[provider]} didn't answer. Check its panel before trying again: the refund may have been made.`
      : explainPaymentError(provider, e)
    : null;

/**
 * Refunds `cents` of a payment through the provider's API. Never throws a
 * PaymentError: the parts done and the reason it stopped come back.
 */
export async function refundThroughProvider(account: PaymentAccount, request: ProviderRefundRequest, options: ProviderOptions = {}): Promise<ProviderRefund> {
  if (request.cents <= 0 || request.cents + request.refundedBeforeCents > request.paidCents)
    throw new Error("A refund can't be more than what's left of the payment");
  if (account.provider === "fawaterk")
    return {
      parts: [],
      error: "Fawaterk refunds are made in Fawaterk's panel.",
    };
  if (!request.paymentId)
    return {
      parts: [],
      error: `${PROVIDER_NAME[account.provider]} didn't give this payment's ID. Refund it in its panel and record it here.`,
    };

  if (account.provider === "kashier") {
    try {
      if (!request.providerRef)
        return {
          parts: [],
          error: "Kashier's payment session isn't known. Refund it in Kashier's panel and record it here.",
        };
      const payment = await getKashierSessionPayment(account.keys, request.providerRef, { fetcher: options.fetcher, baseUrl: options.urls?.kashier });
      if (!payment.paid || !payment.kashierOrderId)
        return {
          parts: [],
          error: "Kashier didn't give its order for this payment. Refund it in Kashier's panel and record it here.",
        };
      const done = await refundKashierPayment(
        account.keys,
        {
          kashierOrderId: payment.kashierOrderId,
          transactionId: payment.transactionId,
          cents: request.cents,
          reason: request.note || REFUND_REASONS[request.reason],
        },
        { fetcher: options.fetcher, baseUrl: options.urls?.kashier },
      );
      return {
        parts: [
          {
            kind: "refund",
            transactionId: null,
            cents: request.cents,
            reference: done.reference.slice(0, 191),
          },
        ],
        error: null,
      };
    } catch (e) {
      const text = message(e, "kashier");
      if (text === null) throw e;
      return { parts: [], error: text };
    }
  }

  // iyzico
  const keys = account.keys;
  const opts = { fetcher: options.fetcher, baseUrl: options.urls?.iyzico };
  const reason: IyzicoRefundReason = request.reason;
  const description = request.note || REFUND_REASONS[request.reason];
  if (request.refundedBeforeCents === 0 && request.cents === request.paidCents && turkishDay(request.paidAt) === turkishDay(request.now)) {
    try {
      const done = await cancelIyzicoPayment(
        keys,
        {
          paymentId: request.paymentId,
          conversationId: request.conversationId,
          ip: request.ip,
          reason,
          description,
        },
        opts,
      );
      return {
        parts: [
          {
            kind: "cancel",
            transactionId: null,
            cents: request.cents,
            reference: done.reference.slice(0, 191),
          },
        ],
        error: null,
      };
    } catch (e) {
      if (!(e instanceof PaymentError)) throw e;
      // No answer: it may be cancelled, so nothing more is tried. Refused (the day was closed): refund the items instead.
      if (e.unreachable) return { parts: [], error: message(e, "iyzico") };
    }
  }
  const parts: RefundPart[] = [];
  try {
    const payment = await retrieveIyzicoPayment(keys, { paymentId: request.paymentId, conversationId: request.conversationId }, opts);
    let left = request.cents;
    for (const item of payment.items) {
      if (left <= 0) break;
      const taken = request.earlier.filter((e) => e.transactionId === item.paymentTransactionId).reduce((sum, e) => sum + e.cents, 0);
      const cents = Math.min(left, item.paidCents - taken);
      if (cents <= 0) continue;
      const done = await refundIyzicoItem(
        keys,
        {
          paymentTransactionId: item.paymentTransactionId,
          cents,
          currency: request.currency,
          conversationId: request.conversationId,
          ip: request.ip,
          reason,
          description,
        },
        opts,
      );
      parts.push({
        kind: "refund",
        transactionId: item.paymentTransactionId,
        cents,
        reference: done.reference.slice(0, 191),
      });
      left -= cents;
    }
    return {
      parts,
      error: left > 0 ? "iyzico has nothing left to refund on this payment." : null,
    };
  } catch (e) {
    const text = message(e, "iyzico");
    if (text === null) throw e;
    return { parts, error: text };
  }
}
