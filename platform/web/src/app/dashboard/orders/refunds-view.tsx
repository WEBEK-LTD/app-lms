import { formatDateTime } from "@/components/ui";
import { formatCents } from "@/lib/catalog/money";
import type { CatalogCurrency, PaymentRefund } from "@/lib/data/types";
import { PROVIDER_NAME } from "@/lib/payments/provider";
import { isRefundReason, REFUND_REASONS } from "@/lib/payments/refund";
import type { RefundOptions } from "@/lib/refunds/service";
import { RefundForm } from "./refund";
import { dashboardText } from "@/lib/dashboard-lang";

/**
 * 47 Under a paid order or donation: the refunds made (amount, reason, who,
 * when, the provider's reference) and the Refund form while something is
 * left to refund.
 */
export async function RefundSection({
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
  const { t, k, lang } = await dashboardText();
  return (
    <>
      {refunds.length ? (
        <ul aria-label={t("orders.refunds")} className="m-0 flex list-none flex-col gap-1 p-0 text-sm text-ink-4">
          {refunds.map((r) => (
            <li key={r.id}>
              {t("orders.refundedOn", {
                amount: formatCents(r.amountCents, r.currency),
                date: formatDateTime(r.createdAt, lang),
                email: r.byEmail,
                reason: isRefundReason(r.reason) ? k(REFUND_REASONS[r.reason]) : r.reason,
              })}
              {r.note ? ` (${r.note})` : ""} ·{" "}
              {r.method === "api" ? t("orders.throughProvider", { provider: PROVIDER_NAME[r.provider] }) : t("orders.recordedIn", { provider: PROVIDER_NAME[r.provider] })}
              {r.providerRef ? ` · ${t("orders.referenceN", { reference: r.providerRef })}` : ""}
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
        <p className="m-0 text-sm text-ink-4">{k(options.why)}</p>
      ) : null}
    </>
  );
}
