"use client";

import { useActionState } from "react";
import { saveAccountCountryAction } from "@/app/actions/account";
import { useDashT } from "./dashboard-i18n";
import { FieldError, FormMessage, SubmitButton } from "./form";
import { initialFormState } from "@/lib/forms";

/**
 * 73 Your account › Your country (52.9): the account's country, for the
 * currency of Yallapp's prices, the WhatsApp number shown and the receipts'
 * time zone. `options` are named in the dashboard's language; a team member
 * sees it without the form.
 */
export function AccountCountryForm({ current, options, readOnly }: { current: string | null; options: { code: string; name: string }[]; readOnly: boolean }) {
  const t = useDashT();
  const [state, action] = useActionState(saveAccountCountryAction, initialFormState);
  const value = state.values?.country ?? current ?? "";
  return (
    <form action={action} noValidate className="flex flex-wrap items-end gap-3" key={value}>
      <div className="flex min-w-[240px] flex-1 flex-col gap-1.5">
        <label htmlFor="f-country" className="text-sm font-semibold">
          {t("account.countryLabel")}
        </label>
        <select
          id="f-country"
          name="country"
          defaultValue={value}
          disabled={readOnly}
          className="input"
          aria-invalid={state.errors?.country ? true : undefined}
          aria-describedby={state.errors?.country ? "f-country-error" : undefined}
        >
          {value ? null : <option value="">{t("account.countryChoose")}</option>}
          {options.map((o) => (
            <option key={o.code} value={o.code}>
              {o.name}
            </option>
          ))}
        </select>
        <FieldError id="f-country-error" error={state.errors?.country} />
      </div>
      {readOnly ? null : (
        <SubmitButton variant="secondary" className="h-12 px-5">
          {t("account.countrySave")}
        </SubmitButton>
      )}
      <div className="basis-full">
        <FormMessage message={state.message} ok={state.ok} />
      </div>
    </form>
  );
}
