"use client";

import { useActionState } from "react";
import { shipOrderAction } from "@/app/actions/catalog";
import { Field, FormMessage, SubmitButton } from "@/components/form";
import { useDashT, useKnownText } from "@/components/dashboard-i18n";
import { initialFormState } from "@/lib/forms";

export interface ShipmentValues {
  carrier: string;
  trackingNumber: string;
  trackingUrl: string;
  waybill: string;
}

/** 80.4 "Shipping" under an order with something to ship: any carrier, and a tracking link, number or waybill. */
export function ShippingForm({ id, current, carriers }: { id: number; current: ShipmentValues | null; carriers: readonly string[] }) {
  const t = useDashT();
  const known = useKnownText();
  const [state, action] = useActionState(shipOrderAction, initialFormState);
  const v = (name: keyof ShipmentValues) => state.values?.[name] ?? current?.[name] ?? "";
  const e = (name: keyof ShipmentValues) => (state.errors?.[name] ? known(state.errors[name]) : undefined);
  const list = `carriers-${id}`;
  return (
    <form action={action} className="flex flex-col gap-3" data-shipping-form={id}>
      <input type="hidden" name="id" value={id} />
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={t("orders.carrier")} name="carrier" id={`carrier-${id}`} list={list} hint={t("orders.carrierHint")} defaultValue={v("carrier")} maxLength={60} small />
        <datalist id={list}>
          {carriers.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
        <Field label={t("orders.trackingNumber")} name="trackingNumber" id={`trackingNumber-${id}`} defaultValue={v("trackingNumber")} error={e("trackingNumber")} maxLength={80} dir="ltr" small />
        <Field label={t("orders.trackingUrl")} name="trackingUrl" id={`trackingUrl-${id}`} type="url" inputMode="url" defaultValue={v("trackingUrl")} error={e("trackingUrl")} maxLength={500} dir="ltr" small />
        <Field label={t("orders.waybill")} name="waybill" id={`waybill-${id}`} hint={t("orders.waybillHint")} defaultValue={v("waybill")} error={e("waybill")} maxLength={500} dir="ltr" small />
      </div>
      <div className="flex flex-col items-start gap-2">
        <SubmitButton className="h-9 px-3 text-sm">{current ? t("orders.saveTracking") : t("orders.markShipped")}</SubmitButton>
        <FormMessage message={state.message} ok={state.ok} />
      </div>
    </form>
  );
}
