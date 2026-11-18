import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { MarketHeader } from "@/components/studio-market/header";
import { Notice, formatDate } from "@/components/ui";
import { countryOptions } from "@/lib/account/country";
import { requireClient } from "@/lib/auth/session";
import { getStore } from "@/lib/data";
import { dashboardText } from "@/lib/dashboard-lang";
import { encryptionKey } from "@/lib/env";
import { detailsView } from "@/lib/studio-market/payout-details";
import { PayoutDetailsForm, type SavedDetails } from "./form";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await dashboardText()).t("marketMoney.detailsTitle") };
}
export const dynamic = "force-dynamic";

/**
 * 106.11 The checks before the designer's first payout: their ID and the
 * bank account a SWIFT transfer goes to, sent to Yallapp's team, who
 * approve them or ask for a fix with a note. Saved values come back masked
 * (the ID number and the account): left empty, they're kept.
 */
export default async function PayoutDetailsPage() {
  const context = await requireClient("billing");
  const { t, lang } = await dashboardText();
  const store = await getStore();
  const designer = await store.getTemplateDesignerByClient(context.client.id);
  if (!designer) redirect("/designer/join");
  const details = await store.getDesignerPayoutDetails(designer.id);
  const view = details ? detailsView(details, encryptionKey(), false) : null;
  const document = details?.idDocumentAssetId ? await store.getAsset(details.idDocumentAssetId) : null;
  const saved: SavedDetails | null = view
    ? {
        legalName: view.legalName,
        country: view.country,
        idType: view.idType,
        idNumberMasked: view.idNumber,
        documentDate: document ? formatDate(document.createdAt, lang) : null,
        holderName: view.holderName,
        accountKind: view.accountKind,
        accountMasked: view.account,
        swift: view.swift,
        bankCode: view.bankCode ?? "",
        bankName: view.bankName,
        bankCountry: view.bankCountry,
        address: view.address,
      }
    : null;

  return (
    <>
      <MarketHeader eyebrow={t("studioMarket.designerArea")} title={t("marketMoney.detailsTitle")} lead={t("marketMoney.detailsIntro")} back={{ href: "/designer/money", label: t("marketMoney.title") }} />
      {details?.status === "submitted" ? (
        <Notice tone="warn" icon="hourglass_top" role="status">
          {t("marketMoney.detailsSubmitted", { date: formatDate(details.submittedAt, lang) })}
        </Notice>
      ) : details?.status === "approved" ? (
        <Notice tone="success" icon="verified_user" role="status">
          {t("marketMoney.detailsApproved", { date: formatDate(details.reviewedAt, lang) })}
        </Notice>
      ) : details?.status === "changes_requested" ? (
        <Notice tone="danger" icon="edit_note" role="alert">
          <b>{t("marketMoney.detailsFix", { date: formatDate(details.reviewedAt, lang) })}</b>
          <span className="mt-1 block whitespace-pre-line" dir="auto">
            {details.reviewNote}
          </span>
        </Notice>
      ) : null}
      <Notice tone="neutral" icon="lock">
        {t("marketMoney.detailsSecure")}
      </Notice>
      <PayoutDetailsForm saved={saved} countries={countryOptions(lang)} defaultCountry={designer.country} />
    </>
  );
}
