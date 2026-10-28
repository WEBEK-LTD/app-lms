"use client";

import { useActionState } from "react";
import { addCourierAction, updateCourierAction } from "@/app/actions/delivery";
import { Field, FormMessage, SubmitButton } from "@/components/form";
import { useDashT } from "@/components/dashboard-i18n";
import { initialFormState } from "@/lib/forms";

export interface CourierFormValues {
  id: number | null;
  name: string;
  phone: string;
  email: string;
  vehicle: string;
}

/** 104 A courier: their name, the number (or email) they sign in with, their vehicle. */
export function CourierForm({ courier, emailOnly }: { courier: CourierFormValues; emailOnly: boolean }) {
  const t = useDashT();
  const [state, action] = useActionState(courier.id ? updateCourierAction : addCourierAction, initialFormState);
  const value = (key: keyof Omit<CourierFormValues, "id">) => state.values?.[key] ?? courier[key];
  const suffix = courier.id ? `-${courier.id}` : "";
  return (
    <form action={action} noValidate className="flex flex-col gap-4">
      <FormMessage message={state.message} ok={state.ok} />
      {courier.id ? <input type="hidden" name="id" value={courier.id} /> : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id={`f-name${suffix}`} label={t("delivery.name")} name="name" defaultValue={value("name")} maxLength={80} error={state.errors?.name} required />
        {emailOnly ? (
          <Field id={`f-email${suffix}`} label={t("delivery.email")} name="email" type="email" defaultValue={value("email")} error={state.errors?.email} hint={t("delivery.emailHint")} />
        ) : (
          <Field id={`f-phone${suffix}`} label={t("delivery.phone")} name="phone" type="tel" dir="ltr" defaultValue={value("phone")} error={state.errors?.phone} hint={t("delivery.phoneHint")} />
        )}
        <Field id={`f-vehicle${suffix}`} label={t("delivery.vehicle")} name="vehicle" defaultValue={value("vehicle")} maxLength={60} error={state.errors?.vehicle} hint={t("delivery.vehicleHint")} />
      </div>
      <div className="flex justify-end">
        <SubmitButton className="h-10" pendingText={t("common.saving")}>
          {courier.id ? t("delivery.saveCourier") : t("delivery.add")}
        </SubmitButton>
      </div>
    </form>
  );
}
