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
import { PaymentsSummary } from "./summary";
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
 * Studio project opens it at /studio/project/payments. 132.120 The one place
 * for the products' and the courses' payments too (their old pages lead
 * here), with a summary on top, the gateways as cards and each other way
 * to pay on its own card. 134 A store's "How customers pay" (and the
 * payments made in the app) between the summary and the gateways.
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
  const currency = await sellingCurrency(await getStore(), app);
  // 132.120 The products' and the courses' payments live only here now; the other kinds keep their sections where they sell too.
  const elsewhere = kind !== "catalog" && kind !== "courses";
  return (
    <div className="flex flex-col gap-6" data-payments-page="">
      {/* The page's parts, each its own component, so what comes later slots in between them. */}
      <PageHeader title={t("gateways.page")} description={manual ? t("manage.paymentsIntro") : t("gateways.pageIntro")} />
      {/* The summary is of the owner's gateway: a store that can't take one here (Shopify, Wix…) has none to sum up. */}
      {ownCards ? <PaymentsSummary app={app} currency={currency} /> : null}
      {/* 134 In 132.120's slot, before the gateways: how a store's customers pay (Yallapp checkout, the store's own, or inside the app, Demo), then the payments made in the app. */}
      {storeApp ? <HowCustomersPay app={app} /> : null}
      {storeApp && kind !== "catalog" ? <InAppPayments app={app} /> : null}
      {ownCards ? <CardPayments app={app} currency={currency} wide /> : <Notice icon="info">{t("gateways.noCards")}</Notice>}
      {manual ? <OtherPayments app={app} wide /> : null}
      {elsewhere ? <p className="m-0 text-sm text-muted">{t("gateways.otherPlaces")}</p> : null}
    </div>
  );
}
