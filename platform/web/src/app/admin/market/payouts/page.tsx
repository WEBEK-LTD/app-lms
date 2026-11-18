import type { Metadata } from "next";
import Link from "next/link";
import { preparePayoutsAction } from "@/app/actions/admin-market-money";
import { Icon } from "@/components/icon";
import { MarketHeader } from "@/components/studio-market/header";
import { formatDateTime } from "@/components/ui";
import { countryName } from "@/lib/account/country";
import { adminCan, requireAdmin } from "@/lib/auth/session";
import { getStore } from "@/lib/data";
import type { DesignerPayout } from "@/lib/data/types";
import { encryptionKey } from "@/lib/env";
import { PAYOUT_MIN_CENTS, payoutRun, type RunRow } from "@/lib/studio-market/money";
import { detailsView } from "@/lib/studio-market/payout-details";
import { payoutMonth } from "@/lib/studio-market/payout-receipt";
import { formatUsd } from "@/lib/studio-market/plans";
import { CancelPayoutForm, MarkSentForm } from "./forms";

export const metadata: Metadata = { title: "Studio Market payouts" };
export const dynamic = "force-dynamic";

/**
 * 106.11 Admin › Studio Market › Payouts: the month's payouts to designers,
 * monthly by SWIFT from USD 250 (below that the balance carries over), only
 * once their checks are approved. "Prepare the bank file" fixes each due
 * designer's balance as a payout; the CSV has each one's bank details in
 * full for Yallapp's bank; the team sends the transfers there, then marks
 * each payout sent with the bank's reference and date (the designer is
 * emailed a receipt), or cancels one the bank didn't send. Everyone on the
 * team sees it, the accounts masked; `market.payouts` acts.
 */
export default async function MarketPayoutsPage({ searchParams }: PageProps<"/admin/market/payouts">) {
  await requireAdmin("view");
  const mayPay = await adminCan("market.payouts");
  const store = await getStore();
  const now = new Date();
  const params = await searchParams;
  const run = await payoutRun(store, now);
  const key = encryptionKey();
  const month = payoutMonth(run.period, "en");
  const by = (state: RunRow["state"]) => run.rows.filter((r) => r.state === state);
  const due = by("due");
  const waiting = by("checks");
  const below = by("below");
  const processing = (await store.listDesignerPayouts({ statuses: ["processing"] })).sort((a, b) => a.preparedAt.getTime() - b.preparedAt.getTime());
  const sent = (await store.listDesignerPayouts({ statuses: ["sent"] })).slice(0, 50);
  const designers = new Map((await store.listTemplateDesigners([...new Set([...processing, ...sent].map((p) => p.designerId))])).map((d) => [d.id, d]));
  const sum = (cents: number[]) => cents.reduce((n, c) => n + c, 0);
  const today = now.toISOString().slice(0, 10);
  const masked = (r: RunRow) => (r.details ? detailsView(r.details, key, false).account : "—");

  const notice =
    params.done === "prepared"
      ? Number(params.n) > 0
        ? `Prepared ${params.n === "1" ? "1 payout" : `${params.n} payouts`}: download the bank file, send the transfers from Yallapp's bank, then mark each one sent.${params.skipped ? " Some balances changed meanwhile: they're left for the next try." : ""}`
        : "No payout was due."
      : params.done === "sent"
        ? "Marked as sent. The designer was emailed a receipt."
        : params.done === "cancelled"
          ? "Cancelled. The amount is back in the designer's balance."
          : null;

  const th = "border-b border-[var(--mk-hair2)] bg-[var(--mk-mat)] px-3.5 py-3 text-start text-[13px] font-semibold whitespace-nowrap text-muted";
  const td = "px-3.5 py-3 align-top";
  const designerCell = (r: Pick<RunRow, "designer">) => (
    <td className={td}>
      <b dir="auto">{r.designer.name}</b>
      <span className="block text-xs text-muted">
        {r.designer.slug} · {countryName(r.designer.country, "en")}
      </span>
    </td>
  );
  const payee = (p: DesignerPayout) => (
    <td className={td}>
      <b dir="auto">{designers.get(p.designerId)?.name ?? p.payeeName}</b>
      <span className="block text-xs text-muted" dir="auto">
        {p.payeeName} · {p.bankName} ({p.bankCountry})
      </span>
      <span className="block text-xs text-muted">
        <bdi dir="ltr">{p.accountHint}</bdi> · <bdi dir="ltr">{p.swift}</bdi>
      </span>
    </td>
  );

  return (
    <div className="mk mk-page flex flex-col gap-6">
      <MarketHeader
        eyebrow="Studio Market"
        title="Payouts"
        lead="Monthly, by SWIFT, in US dollars, from USD 250; below that the balance carries over. Designers get exactly 75% of each sale: Yallapp's 25% covers taxes, the gateway's fees and the SWIFT and intermediary banks' fees. Nothing is sent from here: the team sends the transfers from Yallapp's bank and records them."
        actions={
          <Link href="/admin/market/payouts/checks" className="mk-btn mk-btn-ghost mk-btn-sm">
            <Icon name="verified_user" size={18} />
            Payout checks
          </Link>
        }
      />
      {notice ? (
        <p role="status" className="m-0 rounded-xl bg-success-bg px-4 py-3 text-[15px] font-semibold text-success">
          {notice}
        </p>
      ) : null}
      <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4 lg:gap-4">
        {(
          [
            ["due", `Due in ${month}`, `${formatUsd(sum(due.map((r) => r.money.availableCents)))}`, due.length === 1 ? "1 designer" : `${due.length} designers`],
            ["processing", "To send", formatUsd(sum(processing.map((p) => p.amountCents))), processing.length === 1 ? "1 payout prepared" : `${processing.length} payouts prepared`],
            ["checks", "Waiting for checks", String(waiting.length), `${formatUsd(PAYOUT_MIN_CENTS)} or more, checks not approved`],
            ["below", "Below USD 250", formatUsd(sum(below.map((r) => r.money.availableCents))), "Carried over to next month"],
          ] as const
        ).map(([k, label, value, hint]) => (
          <div key={k} data-kpi={k} className="mk-panel flex flex-col gap-1.5 px-[18px] py-4">
            <span className="text-[13px] font-semibold text-muted">{label}</span>
            <span className="mk-kpi text-[26px]">{value}</span>
            <span className="text-xs text-muted">{hint}</span>
          </div>
        ))}
      </div>

      <section aria-labelledby="due-title" className="flex flex-col gap-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="flex flex-col gap-0.5">
            <h2 id="due-title" className="m-0 text-lg font-bold">
              Due in {month}
            </h2>
            <span className="text-sm text-muted">USD 250 or more, checks approved, no payout yet this month. Preparing fixes each balance as a payout, with the bank details as approved now.</span>
          </div>
          {mayPay && due.length ? (
            <form action={preparePayoutsAction}>
              <button type="submit" className="mk-btn mk-btn-ember mk-btn-sm">
                <Icon name="receipt_long" size={18} />
                Prepare the bank file
              </button>
            </form>
          ) : null}
        </div>
        {due.length ? (
          <div className="mk-panel overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr>
                  {["Designer", "Balance", "Bank", "Earned in all", "Paid out"].map((h) => (
                    <th key={h} className={th}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {due.map((r) => (
                  <tr key={r.designer.id} data-due={r.designer.id} className="border-t border-[var(--mk-hair2)]">
                    {designerCell(r)}
                    <td className={`${td} font-bold`}>{formatUsd(r.money.availableCents)}</td>
                    <td className={td}>
                      <span dir="auto">{r.details?.bankName}</span>
                      <span className="block text-xs text-muted">
                        <bdi dir="ltr">{masked(r)}</bdi>
                      </span>
                    </td>
                    <td className={td}>{formatUsd(r.money.earnedCents)}</td>
                    <td className={td}>{formatUsd(r.money.paidCents)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="mk-panel px-5 py-6 text-center text-muted">Nothing due this month.</div>
        )}
      </section>

      <section aria-labelledby="send-title" className="flex flex-col gap-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="flex flex-col gap-0.5">
            <h2 id="send-title" className="m-0 text-lg font-bold">
              To send
            </h2>
            <span className="text-sm text-muted">Prepared payouts, their amounts fixed. The bank file has each account in full; every download is in the audit log.</span>
          </div>
          {mayPay && processing.length ? (
            <a href="/admin/market/payouts/export" className="mk-btn mk-btn-ghost mk-btn-sm" download>
              <Icon name="download" size={18} />
              Download the bank file (CSV)
            </a>
          ) : null}
        </div>
        {processing.length ? (
          <div className="mk-panel overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr>
                  {["Designer and bank", "Month", "Amount", "Prepared", mayPay ? "Record the transfer" : "Status"].map((h) => (
                    <th key={h} className={th}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {processing.map((p) => (
                  <tr key={p.id} data-processing={p.id} className="border-t border-[var(--mk-hair2)]">
                    {payee(p)}
                    <td className={`${td} whitespace-nowrap`}>{p.period}</td>
                    <td className={`${td} font-bold`}>{formatUsd(p.amountCents)}</td>
                    <td className={`${td} whitespace-nowrap`}>
                      {formatDateTime(p.preparedAt)}
                      <span className="block text-xs text-muted">{p.preparedBy}</span>
                    </td>
                    <td className={`${td} min-w-[340px]`}>
                      {mayPay ? (
                        <div className="flex flex-col gap-2">
                          <MarkSentForm payoutId={p.id} today={today} />
                          <CancelPayoutForm payoutId={p.id} />
                        </div>
                      ) : (
                        "Prepared, not sent yet"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="mk-panel px-5 py-6 text-center text-muted">No payout waiting to be sent.</div>
        )}
      </section>

      {waiting.length ? (
        <section aria-labelledby="waiting-title" className="flex flex-col gap-3">
          <h2 id="waiting-title" className="m-0 text-lg font-bold">
            Waiting for their checks
          </h2>
          <div className="mk-panel overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr>
                  {["Designer", "Balance", "Checks"].map((h) => (
                    <th key={h} className={th}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {waiting.map((r) => (
                  <tr key={r.designer.id} data-waiting={r.designer.id} className="border-t border-[var(--mk-hair2)]">
                    {designerCell(r)}
                    <td className={`${td} font-bold`}>{formatUsd(r.money.availableCents)}</td>
                    <td className={td}>
                      {r.details ? (
                        <Link href={`/admin/market/payouts/checks?id=${r.designer.id}`}>{r.details.status === "submitted" ? "Sent, to review" : "Fix asked for"}</Link>
                      ) : (
                        "Not sent yet"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      <section aria-labelledby="sent-title" className="flex flex-col gap-3">
        <h2 id="sent-title" className="m-0 text-lg font-bold">
          Sent
        </h2>
        {sent.length ? (
          <div className="mk-panel overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr>
                  {["Designer and bank", "Month", "Amount", "Sent on", "Bank reference", "Recorded", "Receipt"].map((h) => (
                    <th key={h} className={th}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sent.map((p) => (
                  <tr key={p.id} data-sent={p.id} className="border-t border-[var(--mk-hair2)]">
                    {payee(p)}
                    <td className={`${td} whitespace-nowrap`}>{p.period}</td>
                    <td className={`${td} font-bold`}>{formatUsd(p.amountCents)}</td>
                    <td className={`${td} whitespace-nowrap`}>{p.sentOn}</td>
                    <td className={td}>
                      <bdi dir="ltr">{p.bankReference}</bdi>
                    </td>
                    <td className={`${td} whitespace-nowrap`}>
                      {formatDateTime(p.sentAt)}
                      <span className="block text-xs text-muted">{p.sentBy}</span>
                    </td>
                    <td className={td}>{p.emailedAt ? `Emailed ${formatDateTime(p.emailedAt)}` : "Not emailed"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="mk-panel px-5 py-6 text-center text-muted">No payouts sent yet.</div>
        )}
      </section>

      {below.length ? (
        <section aria-labelledby="below-title" className="flex flex-col gap-3">
          <h2 id="below-title" className="m-0 text-lg font-bold">
            Below USD 250: carried over
          </h2>
          <div className="mk-panel overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr>
                  {["Designer", "Balance", "Earned in all", "Paid out"].map((h) => (
                    <th key={h} className={th}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {below.map((r) => (
                  <tr key={r.designer.id} data-below={r.designer.id} className="border-t border-[var(--mk-hair2)]">
                    {designerCell(r)}
                    <td className={`${td} font-bold`}>{formatUsd(r.money.availableCents)}</td>
                    <td className={td}>{formatUsd(r.money.earnedCents)}</td>
                    <td className={td}>{formatUsd(r.money.paidCents)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
    </div>
  );
}
