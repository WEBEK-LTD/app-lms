import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { EmptyState, PageHeader } from "@/components/ui";
import { Stat, StatRow } from "@/components/page-kit";
import { FilterList } from "@/components/page-kit-client";
import { requireClient } from "@/lib/auth/session";
import { getStore } from "@/lib/data";
import { STORE_REQUEST_STATUSES } from "@/lib/data/types";
import { dashboardText } from "@/lib/dashboard-lang";
import { CatalogTabs } from "../tabs";
import { REQUEST_KEYS, RequestItem } from "./parts";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await dashboardText()).t("shop.requests") };
}

/**
 * 210 The shop's custom-order requests (the custom-order page of the shop
 * types' looks, or any form marked as one): new ones first, each with its
 * answers and who sent it; the owner answers with a price and a reply and
 * moves it on (quoted, accepted, declined, done). Yallapp Business shows
 * the same list.
 */
export default async function CatalogRequestsPage() {
  const { app } = await requireClient("orders");
  if (!app || app.connector?.kind !== "catalog") notFound();
  const { t } = await dashboardText();
  const requests = await (await getStore()).listStoreRequests(app.id);
  const fresh = requests.filter((r) => r.status === "new");
  const ordered = [...fresh, ...requests.filter((r) => r.status !== "new")];
  const count = (s: (typeof STORE_REQUEST_STATUSES)[number]) => requests.filter((r) => r.status === s).length;
  return (
    <div className="flex flex-col gap-5">
      <PageHeader title={t("shop.requests")} description={t("shop.requestsIntro")} />
      <CatalogTabs app={app} />
      {requests.length ? (
        <StatRow label={t("shop.requests")}>
          <Stat icon="new_releases" tone={fresh.length ? "warn" : "neutral"} label={t(REQUEST_KEYS.new)} value={fresh.length} />
          <Stat icon="sell" label={t(REQUEST_KEYS.quoted)} value={count("quoted")} />
          <Stat icon="check_circle" tone="success" label={t(REQUEST_KEYS.accepted)} value={count("accepted")} />
        </StatRow>
      ) : null}
      <section className="card overflow-hidden p-0">
        {ordered.length === 0 ? (
          <div className="p-5 sm:p-6">
            <EmptyState icon="edit_note" title={t("shop.noRequests")}>
              {t("shop.noRequestsHint")}
            </EmptyState>
          </div>
        ) : (
          <FilterList
            allLabel={t("common.all")}
            searchLabel={t("shop.searchRequests")}
            noMatch={t("shop.noRequestMatch")}
            filters={STORE_REQUEST_STATUSES.map((s) => ({ value: s, label: t(REQUEST_KEYS[s]) }))}
            items={ordered.map((r) => ({
              id: r.id,
              text: [r.customer.name, r.customer.phone, r.customer.email, ...r.answers.map((a) => a.value)].filter(Boolean).join(" "),
              group: r.status,
              node: <RequestItem request={r} t={t} />,
            }))}
          />
        )}
      </section>
    </div>
  );
}
