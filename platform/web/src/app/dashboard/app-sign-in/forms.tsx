"use client";

import { useActionState } from "react";
import { saveAppSignInAction } from "@/app/actions/app-sign-in";
import { Field, FormMessage, SubmitButton } from "@/components/form";
import { initialFormState } from "@/lib/forms";

function Check({ name, label, checked }: { name: string; label: string; checked: boolean }) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-[15px]">
      <input type="checkbox" name={name} defaultChecked={checked} className="h-4 w-4 accent-midnight" />
      {label}
    </label>
  );
}

export function AppSignInForm({ current }: { current: Record<string, string> }) {
  const [state, action] = useActionState(saveAppSignInAction, initialFormState);
  const v = state.values ?? current;
  const e = state.errors ?? {};
  return (
    <form action={action} noValidate className="flex flex-col gap-6" key={JSON.stringify(v)}>
      <FormMessage message={state.message} ok={state.ok} />

      <fieldset className="m-0 flex flex-col gap-3 border-0 p-0">
        <legend className="mb-1.5 text-[17px] font-bold">New customers</legend>
        <Check name="signupAllowed" label="New customers can sign up in the app" checked={v.signupAllowed === "on"} />
        <span className="text-sm text-muted">Customers give their name when they sign up. Also ask for:</span>
        <div className="flex flex-wrap gap-x-6 gap-y-2">
          <Check name="askEmail" label="Email" checked={v.askEmail === "on"} />
          <Check name="askCity" label="City" checked={v.askCity === "on"} />
        </div>
      </fieldset>

      <fieldset className="m-0 flex flex-col gap-4 border-0 p-0">
        <legend className="mb-1.5 text-[17px] font-bold">Phone and devices</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Country code"
            name="defaultCountryCode"
            inputMode="numeric"
            defaultValue={v.defaultCountryCode}
            hint="Shown first on the sign-in screen, like 90 for Turkey."
            error={e.defaultCountryCode}
          />
          <Field
            label="Devices per customer"
            name="deviceLimit"
            inputMode="numeric"
            defaultValue={v.deviceLimit}
            hint="A customer at the limit signs out on another device first. 0 for no limit."
            error={e.deviceLimit}
          />
        </div>
      </fieldset>

      <fieldset className="m-0 flex flex-col gap-4 border-0 p-0">
        <legend className="mb-1.5 text-[17px] font-bold">Help and terms</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Support WhatsApp" name="supportWhatsapp" type="tel" defaultValue={v.supportWhatsapp} hint="Shown in the app for help. Optional." error={e.supportWhatsapp} />
          <Field label="Terms page" name="termsUrl" type="url" defaultValue={v.termsUrl} placeholder="https://" hint="Linked from the sign-up screen. Optional." error={e.termsUrl} />
        </div>
      </fieldset>

      <fieldset className="m-0 flex flex-col gap-4 border-0 p-0">
        <legend className="mb-1.5 text-[17px] font-bold">App store review</legend>
        <p className="m-0 text-sm leading-relaxed text-muted">
          Apple and Google sign in to check the app before it goes live. This number signs in with this code; no message is sent.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Review phone number" name="reviewPhone" type="tel" defaultValue={v.reviewPhone} error={e.reviewPhone} />
          <Field label="Review code" name="reviewCode" inputMode="numeric" autoComplete="off" maxLength={6} defaultValue={v.reviewCode} error={e.reviewCode} />
        </div>
      </fieldset>

      <div className="flex justify-end">
        <SubmitButton className="h-11" pendingText="Saving…">
          Save
        </SubmitButton>
      </div>
    </form>
  );
}
