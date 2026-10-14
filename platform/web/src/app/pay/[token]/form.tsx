"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { payAction } from "@/app/actions/pay";
import { Field, FieldError, FormMessage } from "@/components/form";
import type { CatalogCustomer } from "@/lib/data/types";
import { initialFormState } from "@/lib/forms";

function PayButton({ label, color, textColor }: { label: string; color: string; textColor: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="h-12 w-full cursor-pointer rounded-xl border-0 text-[16px] font-bold disabled:opacity-70"
      style={{ backgroundColor: color, color: textColor }}
    >
      {pending ? "Opening the payment…" : label}
    </button>
  );
}

export function PayForm({
  token,
  total,
  color,
  textColor,
  defaults,
}: {
  token: string;
  total: string;
  color: string;
  textColor: string;
  defaults?: Partial<CatalogCustomer>;
}) {
  const [state, action] = useActionState(payAction.bind(null, token), initialFormState);
  const value = (name: keyof CatalogCustomer) => state.values?.[name] ?? defaults?.[name] ?? "";
  return (
    <form action={action} noValidate className="flex flex-col gap-4">
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
      <PayButton label={`Pay ${total}`} color={color} textColor={textColor} />
    </form>
  );
}
