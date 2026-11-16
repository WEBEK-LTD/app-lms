import type { Metadata } from "next";
import { Notice, PageHeader } from "@/components/ui";
import { requireClient } from "@/lib/auth/session";
import { bookingSetup } from "@/lib/bookings/setup";
import { catalogSettings } from "@/lib/catalog/settings";
import { courseSetup } from "@/lib/courses/setup";
import { dashboardText } from "@/lib/dashboard-lang";
import { getStore } from "@/lib/data";
import type { DataStore } from "@/lib/data/store";
import type { App, CatalogCurrency } from "@/lib/data/types";
import { donationSettingsOf } from "@/lib/donations/service";
import { eventSettingsOf } from "@/lib/events/service";
import { takesOwnCardPayments } from "@/lib/payments/owner-keys";
import { schoolCurrency, schoolSettingsOf } from "@/lib/school/settings";
import { CardPayments, OtherPayments } from "../catalog/payments";
import { HowCustomersPay, InAppPayments } from "./how-customers-pay";
import { inAppBlock } from "@/lib/selling/in-app-pay";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await dashboardText()).t("gateways.page") };
}

/** What the app sells in, as the page that sells it says (for the gateway's currency check). */
async function sellingCurrency(store: DataStore, app: App): Promise<CatalogCurrency> {
  const kind = app.connector?.kind;
  if (kind === "courses") return courseSetup(app).currency;
  if (kind === "bookings") return bookingSetup(app).rules.currency;
  if (kind === "events") return (await eventSettingsOf(store, app.id)).currency;
  if (kind === "campaigns") return donationSettingsOf(await store.getDonationSettings(app.id)).currency;
  if (kind === "school") return schoolCurrency(schoolSettingsOf(await store.getSchoolSettings(app.id), app));
  return catalogSettings(app).currency;
}

/**
 * 132.36 Payments: the owner's own gateway in one place, whatever the app
 * sells (a shop, courses, memberships, tickets, donations, deliveries,
 * rides, school fees), with Stripe's setup, its webhook and "Test
 * connection"; bank transfer and the owner's own method where the app
 * takes them. The same sections stay on the pages where the app sells. A
 * Studio project opens it at /studio/project/payments.
 */
export default async function PaymentsPage() {
  const { app } = await requireClient("settings");
  const { t } = await dashboardText();
  const header = <PageHeader title={t("gateways.page")} description={t("gateways.pageIntro")} />;
  // 134 Every store app chooses how its customers pay (a connected store's in the app needs the gateway here).
  const storeApp = app?.appType === "store";
  // A connected store's gateway is for paying inside the app, where its platform takes it (WooCommerce).
  const ownCards = app ? takesOwnCardPayments(app) || (storeApp && inAppBlock(app) === null) : false;
  if (!app || (!ownCards && !storeApp)) {
    return (
      <div className="flex flex-col gap-6">
        {header}
        <Notice icon="info">{t("gateways.noCards")}</Notice>
      </div>
    );
  }
  const kind = app.connector?.kind;
  const manual = kind === "catalog" || kind === "courses" || kind === "bookings" || kind === "events";
  return (
    <div className="flex flex-col gap-6">
      {header}
      {storeApp ? <HowCustomersPay app={app} /> : null}
      {storeApp && kind !== "catalog" ? <InAppPayments app={app} /> : null}
      {ownCards ? <CardPayments app={app} currency={await sellingCurrency(await getStore(), app)} /> : <Notice icon="info">{t("gateways.noCards")}</Notice>}
      {manual ? <OtherPayments app={app} /> : null}
      <p className="m-0 text-sm text-muted">{t("gateways.otherPlaces")}</p>
    </div>
  );
}
