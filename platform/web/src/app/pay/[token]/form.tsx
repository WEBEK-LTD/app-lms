"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { payAction } from "@/app/actions/pay";
import { Field, FieldError, FormMessage } from "@/components/form";
import type { CatalogCustomer } from "@/lib/data/types";
import type { ManualChoice } from "@/lib/catalog/manual";
import { initialFormState } from "@/lib/forms";

function PayButton({ label, busy, color, textColor }: { label: string; busy: string; color: string; textColor: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="h-12 w-full cursor-pointer rounded-xl border-0 text-[16px] font-bold disabled:opacity-70"
      style={{ backgroundColor: color, color: textColor }}
    >
      {pending ? busy : label}
    </button>
  );
}

export function PayForm({
  token,
  card,
  manual,
  total,
  color,
  textColor,
  defaults,
}: {
  token: string;
  /** The card provider's name; null when the shop takes no cards. */
  card: string | null;
  /** 96.2 Bank transfer and the owner's own method. */
  manual: ManualChoice[];
  total: string;
  color: string;
  textColor: string;
  defaults?: Partial<CatalogCustomer>;
}) {
  const [state, action] = useActionState(payAction.bind(null, token), initialFormState);
  const value = (name: keyof CatalogCustomer) => state.values?.[name] ?? defaults?.[name] ?? "";
  const methods = [...(card ? [{ method: "card", name: "Card", instructions: "" }] : []), ...manual];
  // The choice lives outside the form, which React resets after each submit.
  const [method, setMethod] = useState(methods[0]?.method ?? "card");
  const chosen = methods.find((m) => m.method === method);
  return (
    <div className="flex flex-col gap-4">
      {methods.length > 1 ? (
        <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
          <legend className="mb-2 p-0 text-sm font-semibold">How would you like to pay?</legend>
          {methods.map((m) => (
            <label key={m.method} className="flex cursor-pointer items-center gap-3 rounded-xl border border-line px-4 py-3 text-[15px] has-[:checked]:border-ink">
              <input type="radio" name="pay-method" checked={method === m.method} onChange={() => setMethod(m.method)} className="size-4" />
              <span className="font-semibold">{m.name}</span>
            </label>
          ))}
        </fieldset>
      ) : null}
      {chosen && chosen.method !== "card" ? (
        <div role="note" className="flex flex-col gap-1 rounded-xl bg-sand px-4 py-3 text-[15px]">
          <span className="font-semibold">{chosen.name}</span>
          <span className="whitespace-pre-line text-ink-4">{chosen.instructions}</span>
          <span className="text-[13px] text-muted">Place your order, then pay {total} this way. The shop confirms your order once the payment arrives.</span>
        </div>
      ) : null}
      <form action={action} noValidate className="flex flex-col gap-4">
        <input type="hidden" name="method" value={method} />
        <FormMessage message={state.message} ok={state.ok} />
        <Field label="Full name" name="name" autoComplete="name" required defaultValue={value("name")} error={state.errors?.name} />
        <Field label="Mobile number" name="phone" type="tel" autoComplete="tel" required defaultValue={value("phone")} error={state.errors?.phone} />
        <Field label="Email" name="email" type="email" autoComplete="email" required defaultValue={value("email")} error={state.errors?.email} />
        <Field label="City" name="city" autoComplete="address-level2" required defaultValue={value("city")} error={state.errors?.city} />
        <div className="flex flex-col gap-1.5">
          <label htmlFor="f-address" className="text-sm font-semibold">
            Address
          </label>
          <textarea
            id="f-address"
            name="address"
            autoComplete="street-address"
            required
            rows={3}
            defaultValue={value("address")}
            className="input min-h-24 py-3"
            aria-invalid={state.errors?.address ? true : undefined}
            aria-describedby={state.errors?.address ? "f-address-error" : undefined}
          />
          <FieldError id="f-address-error" error={state.errors?.address} />
        </div>
        {method === "card" ? (
          <PayButton label={`Pay ${total}`} busy="Opening the payment…" color={color} textColor={textColor} />
        ) : (
          <PayButton label={`Place order · ${total}`} busy="Placing your order…" color={color} textColor={textColor} />
        )}
      </form>
    </div>
  );
}
