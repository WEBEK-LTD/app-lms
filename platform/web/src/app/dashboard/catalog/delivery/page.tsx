import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { PageHeader, Section } from "@/components/ui";
import { requireClient } from "@/lib/auth/session";
import { centsToDecimal } from "@/lib/catalog/money";
import { DEFAULT_FULFILMENT, fulfilmentOf } from "@/lib/catalog/fulfilment";
import { catalogSettings } from "@/lib/catalog/settings";
import type { FulfilmentSettings } from "@/lib/data/types";
import { dashboardText } from "@/lib/dashboard-lang";
import { FulfilmentForm } from "../forms";
import { CatalogTabs } from "../tabs";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await dashboardText()).t("shop.pickupDelivery") };
}


/** 26 The Pickup and delivery form's values. */
function fulfilmentValues(f: FulfilmentSettings): Record<string, string> {
  const on = (b: boolean) => (b ? "on" : "");
  const values: Record<string, string> = {
    pickup: on(f.pickup),
    delivery: on(f.delivery),
    pickupAddress: f.pickupAddress ?? "",
    deliveryFee: f.deliveryFeeCents ? centsToDecimal(f.deliveryFeeCents) : "",
    minOrder: f.minOrderCents !== null ? centsToDecimal(f.minOrderCents) : "",
    deliveryAreas: f.deliveryAreas.join("\n"),
    deliveryNote: f.deliveryNote ?? "",
    prepMinutes: String(f.prepMinutes),
    timezone: f.timezone,
    asap: on(f.asap),
    scheduled: on(f.scheduled),
    slotStep: String(f.slotStepMinutes),
    maxDaysAhead: String(f.maxDaysAhead),
  };
  f.hours.forEach((ranges, d) => {
    values[`open${d}`] = on(ranges.length > 0);
    values[`start${d}`] = ranges[0]?.start ?? DEFAULT_FULFILMENT.hours[d]![0]!.start;
    values[`end${d}`] = ranges[0]?.end ?? DEFAULT_FULFILMENT.hours[d]![0]!.end;
  });
  return values;
}

/** 26 A restaurant's pickup and delivery, opening hours and order times; 132.10 on their own page (a shop's shipping is in its Settings). */
export default async function CatalogDeliveryPage() {
  const { app } = await requireClient("catalog");
  if (!app || app.connector?.kind !== "catalog") notFound();
  const fulfilment = fulfilmentOf(app);
  if (!fulfilment) redirect("/dashboard/catalog/settings");
  const { t } = await dashboardText();
  return (
    <div className="flex flex-col gap-5">
      <PageHeader title={t("shop.pickupDelivery")} description={t("shop.pickupDeliveryText")} />
      <CatalogTabs app={app} />
      <Section titleId="h-fulfilment" title={t("shop.pickupDelivery")} className="max-w-[860px]">
        <FulfilmentForm current={fulfilmentValues(fulfilment)} currency={catalogSettings(app).currency} />
      </Section>
    </div>
  );
}
