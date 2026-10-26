"use client";

import { useActionState } from "react";
import { recordBankTransferAction } from "@/app/actions/admin-invoices";
import { Field, FieldError, FormMessage, SubmitButton } from "@/components/form";
import type { CatalogCurrency } from "@/lib/data/types";
import { initialFormState } from "@/lib/forms";
import type { Plan } from "@/lib/plans";

/** 95.2 A client's transfer into Yallapp's bank account: the invoice it becomes, and the app's plan it pays. */
export function BankTransferForm({
  clientId,
  apps,
  plans,
  currencies,
  defaults,
}: {
  clientId: string;
  apps: { id: string; label: string }[];
  plans: { id: Plan; name: string }[];
  currencies: CatalogCurrency[];
  defaults: { appId: string; plan: Plan; months: "1" | "12"; amount: string; currency: CatalogCurrency };
}) {
  const [state, action] = useActionState(recordBankTransferAction, initialFormState);
  const v = state.values ?? {};
  const select = (name: string, label: string, options: { value: string; label: string }[], value: string) => (
    <div className="flex min-w-0 flex-col gap-1.5">
      <label htmlFor={`f-${name}`} className="text-sm font-semibold">
        {label}
      </label>
      <select
        id={`f-${name}`}
        name={name}
        className="input input-sm"
        defaultValue={v[name] ?? value}
        aria-invalid={state.errors?.[name] ? true : undefined}
        aria-describedby={state.errors?.[name] ? `f-${name}-error` : undefined}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <FieldError id={`f-${name}-error`} error={state.errors?.[name]} />
    </div>
  );
  return (
    <form action={action} noValidate className="flex flex-col gap-3.5">
      <input type="hidden" name="clientId" value={clientId} />
      <FormMessage message={state.message} />
      <div className="grid gap-3.5 sm:grid-cols-2">
        {select("appId", "App", apps.map((a) => ({ value: a.id, label: a.label })), defaults.appId)}
        {select("plan", "Plan", plans.map((p) => ({ value: p.id, label: p.name })), defaults.plan)}
        {select("months", "Pays for", [{ value: "1", label: "1 month" }, { value: "12", label: "1 year" }], defaults.months)}
        <div className="grid grid-cols-[1fr_auto] gap-2">
          <Field label="Amount that arrived" name="amount" inputMode="decimal" required defaultValue={v.amount ?? defaults.amount} error={state.errors?.amount} small />
          {select("currency", "Currency", currencies.map((c) => ({ value: c, label: c })), defaults.currency)}
        </div>
        <Field
          label="Bank reference"
          name="reference"
          required
          maxLength={100}
          defaultValue={v.reference}
          error={state.errors?.reference}
          hint="As it shows on the bank statement. It's printed on the invoice."
          small
          className="sm:col-span-2"
        />
      </div>
      <SubmitButton className="h-11 self-start px-5" pendingText="Recording…">
        Record the transfer and send the invoice
      </SubmitButton>
      <span className="text-xs leading-normal text-muted">
        The app&apos;s plan is activated or extended at once, as after a card payment, and the client gets the invoice as a PDF by email. It can&apos;t be undone here.
      </span>
    </form>
  );
}
