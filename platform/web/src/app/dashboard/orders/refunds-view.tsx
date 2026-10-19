import { formatDateTime } from "@/components/ui";
import { formatCents } from "@/lib/catalog/money";
import type { CatalogCurrency, PaymentRefund } from "@/lib/data/types";
import { PROVIDER_NAME } from "@/lib/payments/provider";
import { isRefundReason, REFUND_REASONS } from "@/lib/payments/refund";
import type { RefundOptions } from "@/lib/refunds/service";
import { RefundForm } from "./refund";

/**
 * 47 Under a paid order or donation: the refunds made (amount, reason, who,
 * when, the provider's reference) and the Refund form while something is
 * left to refund.
 */
export function RefundSection({
  kind,
  id,
  label,
  currency,
  refunds,
  options,
  payoutReleased = false,
}: {
  kind: "order" | "donation";
  id: number;
  label: string;
  currency: CatalogCurrency;
  refunds: PaymentRefund[];
  options: RefundOptions;
  payoutReleased?: boolean;
}) {
  return (
    <>
      {refunds.length ? (
        <ul aria-label="Refunds" className="m-0 flex list-none flex-col gap-1 p-0 text-sm text-ink-4">
          {refunds.map((r) => (
            <li key={r.id}>
              Refunded {formatCents(r.amountCents, r.currency)} on {formatDateTime(r.createdAt)} by {r.byEmail}:{" "}
              {isRefundReason(r.reason) ? REFUND_REASONS[r.reason] : r.reason}
              {r.note ? ` (${r.note})` : ""} ·{" "}
              {r.method === "api" ? `through ${PROVIDER_NAME[r.provider]}` : `recorded, made in ${PROVIDER_NAME[r.provider]}'s panel`}
              {r.providerRef ? ` · reference ${r.providerRef}` : ""}
            </li>
          ))}
        </ul>
      ) : null}
      {options.refundable ? (
        <RefundForm
          kind={kind}
          id={id}
          label={label}
          options={{
            providerName: PROVIDER_NAME[options.provider],
            left: (options.leftCents / 100).toFixed(2),
            leftFormatted: formatCents(options.leftCents, currency),
            currency,
            byApi: options.byApi,
            manual: options.manual,
            marketplace: options.marketplace,
            payoutReleased: payoutReleased && options.provider !== "iyzico",
            revocable: options.revocable,
          }}
        />
      ) : options.why ? (
        <p className="m-0 text-sm text-ink-4">{options.why}</p>
      ) : null}
    </>
  );
}
