import type { Metadata } from "next";
import Link from "next/link";
import { Icon } from "@/components/icon";
import { MarketHeader } from "@/components/studio-market/header";
import { formatDateTime } from "@/components/ui";
import { countryName } from "@/lib/account/country";
import { adminCan, requireAdmin } from "@/lib/auth/session";
import { getStore } from "@/lib/data";
import type { DesignerPayoutDetails, PayoutDetailsStatus } from "@/lib/data/types";
import { encryptionKey } from "@/lib/env";
import { idDocumentLink } from "@/lib/studio-market/id-document";
import { designerMoney } from "@/lib/studio-market/money";
import { detailsView } from "@/lib/studio-market/payout-details";
import { formatUsd } from "@/lib/studio-market/plans";
import { DetailsDecisionForm } from "../forms";

export const metadata: Metadata = { title: "Studio Market payout checks" };
export const dynamic = "force-dynamic";

const STATUS: Record<PayoutDetailsStatus, [string, string]> = {
  submitted: ["bg-warn-bg text-warn", "To review"],
  changes_requested: ["bg-danger-bg text-danger", "Fix asked for"],
  approved: ["bg-success-bg text-success", "Approved"],
};

/**
 * 106.11 Admin › Studio Market › Payout checks: each designer's ID, name and
 * country and their bank for SWIFT, checked before their first payout (not
 * before publishing), the waiting ones first. Approve, or ask for a fix with
 * a note (the designer is emailed in their language). The ID number and the
 * account show in full, and the ID document opens, only for `market.payouts`
 * (owners and admins); everyone else on the team sees them masked.
 */
export default async function PayoutChecksPage({ searchParams }: PageProps<"/admin/market/payouts/checks">) {
  await requireAdmin("view");
  const reveal = await adminCan("market.payouts");
  const store = await getStore();
  const now = new Date();
  const params = await searchParams;
  const all = await store.listDesignerPayoutDetails();
  const order: Record<PayoutDetailsStatus, number> = { submitted: 0, changes_requested: 1, approved: 2 };
  const list = [...all].sort((a, b) => order[a.status] - order[b.status] || a.submittedAt.getTime() - b.submittedAt.getTime());
  const designers = new Map((await store.listTemplateDesigners(list.map((d) => d.designerId))).map((d) => [d.id, d]));
  const selected: DesignerPayoutDetails | null = list.find((d) => d.designerId === params.id) ?? list[0] ?? null;
  const designer = selected ? (designers.get(selected.designerId) ?? null) : null;
  const view = selected ? detailsView(selected, encryptionKey(), reveal) : null;
  const document = selected?.idDocumentAssetId ? await store.getAsset(selected.idDocumentAssetId) : null;
  const money = designer ? (await designerMoney(store, designer.id, now)).money : null;
  const waiting = list.filter((d) => d.status === "submitted").length;
  const notice = params.done === "approved" ? "Approved. Their payouts can go out; they were emailed." : params.done === "fix" ? "Sent back to the designer with your note; they were emailed." : null;

  const row = (label: string, value: React.ReactNode) => (
    <div className="grid grid-cols-[170px_1fr] gap-3 border-t border-[var(--mk-hair2)] py-2.5 text-sm first:border-t-0">
      <dt className="text-muted">{label}</dt>
      <dd className="m-0 font-semibold">{value}</dd>
    </div>
  );

  return (
    <div className="mk mk-page flex flex-col gap-6">
      <MarketHeader
        eyebrow="Studio Market"
        title="Payout checks"
        lead="Each designer's ID, name and country and their bank for SWIFT, checked once before their first payout (never before publishing); a change comes back here. ID numbers and accounts are encrypted, shown in full only to the team with Studio Market payouts."
        actions={
          <>
            <span className="inline-flex items-center gap-1 rounded-xl bg-warn-bg px-3 py-1.5 text-[13px] font-bold text-warn">
              <Icon name="hourglass_top" size={16} filled />
              {waiting} to review
            </span>
            <Link href="/admin/market/payouts" className="mk-btn mk-btn-ghost mk-btn-sm">
              <Icon name="send" size={18} />
              Payouts
            </Link>
          </>
        }
      />
      {notice ? (
        <p role="status" className="m-0 rounded-xl bg-success-bg px-4 py-3 text-[15px] font-semibold text-success">
          {notice}
        </p>
      ) : null}
      {list.length ? (
        <div className="grid gap-5 lg:grid-cols-[320px_1fr]">
          <nav aria-label="Designers' checks" className="mk-panel flex flex-col overflow-hidden">
            {list.map((d) => {
              const who = designers.get(d.designerId);
              const current = d.designerId === selected?.designerId;
              return (
                <Link
                  key={d.designerId}
                  href={`/admin/market/payouts/checks?id=${d.designerId}`}
                  aria-current={current ? "page" : undefined}
                  className={`flex items-center justify-between gap-3 border-t border-[var(--mk-hair2)] px-4 py-3 text-sm no-underline first:border-t-0 ${current ? "bg-[var(--mk-mat)] font-bold" : ""}`}
                >
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate text-[var(--mk-ink)]" dir="auto">
                      {who?.name ?? d.legalName}
                    </span>
                    <span className="text-xs font-normal text-muted">Sent {formatDateTime(d.submittedAt)}</span>
                  </span>
                  <span className={`inline-flex flex-none rounded-xl px-2 py-0.5 text-xs font-bold ${STATUS[d.status][0]}`}>{STATUS[d.status][1]}</span>
                </Link>
              );
            })}
          </nav>
          {selected && view ? (
            <section aria-label="The designer's checks" data-checks={selected.designerId} className="mk-panel flex flex-col gap-5 px-5 py-5 sm:px-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex flex-col gap-0.5">
                  <h2 className="m-0 text-xl font-bold" dir="auto">
                    {designer?.name ?? view.legalName}
                  </h2>
                  <span className="text-sm text-muted">
                    {designer ? `${designer.slug} · profile in ${countryName(designer.country, "en")}` : null}
                    {money ? ` · balance ${formatUsd(money.availableCents)}, earned ${formatUsd(money.earnedCents)}` : null}
                  </span>
                </div>
                <span className={`inline-flex rounded-xl px-2.5 py-1 text-xs font-bold ${STATUS[selected.status][0]}`}>{STATUS[selected.status][1]}</span>
              </div>
              {selected.status !== "submitted" && selected.reviewedAt ? (
                <p className="m-0 text-sm text-muted">
                  {selected.status === "approved" ? "Approved" : "Fix asked for"} by {selected.reviewedBy} on {formatDateTime(selected.reviewedAt)}
                  {selected.reviewNote ? `: “${selected.reviewNote}”` : "."}
                </p>
              ) : null}
              {view.masked ? <p className="m-0 rounded-xl bg-[var(--mk-mat)] px-4 py-3 text-sm">The ID number, the account and the ID document need the Studio Market payouts permission (owners and admins).</p> : null}
              <div className="grid gap-5 xl:grid-cols-2">
                <div className="flex flex-col gap-1">
                  <h3 className="m-0 text-[15px] font-bold">ID</h3>
                  <dl className="m-0 flex flex-col">
                    {row("Name on the ID", <span dir="auto">{view.legalName}</span>)}
                    {row("Lives in", countryName(view.country, "en"))}
                    {row("Kind", view.idType === "passport" ? "Passport" : "National ID card")}
                    {row("Number", <bdi dir="ltr" data-id-number>{view.idNumber}</bdi>)}
                    {row(
                      "Document",
                      document ? (
                        reveal ? (
                          <a href={idDocumentLink(document.id, now)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1">
                            <Icon name="visibility" size={16} />
                            Open ({document.contentType === "application/pdf" ? "PDF" : "picture"}, {Math.ceil(document.size / 1024)} KB)
                          </a>
                        ) : (
                          "Added"
                        )
                      ) : (
                        "None"
                      ),
                    )}
                  </dl>
                </div>
                <div className="flex flex-col gap-1">
                  <h3 className="m-0 text-[15px] font-bold">Bank for SWIFT</h3>
                  <dl className="m-0 flex flex-col">
                    {row("Account holder", <span dir="auto">{view.holderName}</span>)}
                    {row(view.accountKind === "iban" ? "IBAN" : "Account number", <bdi dir="ltr" data-account>{view.account}</bdi>)}
                    {row("SWIFT/BIC", <bdi dir="ltr">{view.swift}</bdi>)}
                    {view.bankCode ? row("Routing or sort code", <bdi dir="ltr">{view.bankCode}</bdi>) : null}
                    {row("Bank", <span dir="auto">{view.bankName}</span>)}
                    {row("Bank's country", countryName(view.bankCountry, "en"))}
                    {row("Address", <span dir="auto">{view.address}</span>)}
                  </dl>
                </div>
              </div>
              {selected.status === "submitted" && reveal ? (
                <div className="border-t border-[var(--mk-hair2)] pt-4">
                  <DetailsDecisionForm designerId={selected.designerId} seen={selected.submittedAt.toISOString()} />
                </div>
              ) : null}
            </section>
          ) : null}
        </div>
      ) : (
        <div className="mk-panel px-5 py-10 text-center text-muted">No designer has sent their payout details yet.</div>
      )}
    </div>
  );
}
