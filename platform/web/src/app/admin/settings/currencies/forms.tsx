"use client";

import { useActionState } from "react";
import { refreshRatesAction, saveRateOverrideAction } from "@/app/actions/admin-settings";
import { CurrencyPicker } from "@/components/currency-picker";
import { Field, FormMessage, SubmitButton } from "@/components/form";
import { initialFormState } from "@/lib/forms";

/** 135.6 "Refresh now": the day's rates read at once. */
export function RefreshRatesForm() {
  const [state, action] = useActionState(refreshRatesAction, initialFormState);
  return (
    <form action={action} className="flex flex-wrap items-center gap-3">
      <SubmitButton variant="secondary" className="h-10" pendingText="Reading the rates…">
        Refresh now
      </SubmitButton>
      <FormMessage message={state.message} ok={state.ok} />
    </form>
  );
}

/** 135.6 The team's rate for one currency, over the day's (empty: back to the day's). */
export function RateOverrideForm() {
  const [state, action] = useActionState(saveRateOverrideAction, initialFormState);
  return (
    <form action={action} noValidate className="flex flex-col gap-4" key={state.ok ? state.message : "form"}>
      <FormMessage message={state.message} ok={state.ok} />
      <div className="grid gap-4 sm:grid-cols-[1fr_200px]">
        <CurrencyPicker id="f-override-code" name="code" label="Currency" defaultValue={state.values?.code || "EGP"} error={state.errors?.code} />
        <Field label="Units for 1 USD" name="rate" inputMode="decimal" dir="ltr" defaultValue={state.values?.rate ?? ""} placeholder="48.75" hint="Empty: the day's rate." error={state.errors?.rate} />
      </div>
      <div className="flex justify-end">
        <SubmitButton variant="secondary" className="h-10">
          Save the rate
        </SubmitButton>
      </div>
    </form>
  );
}
