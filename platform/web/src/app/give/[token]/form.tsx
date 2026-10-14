"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { giveAction } from "@/app/actions/give";
import { Field, FormMessage } from "@/components/form";
import { initialFormState } from "@/lib/forms";

function GiveButton({ label, color, textColor }: { label: string; color: string; textColor: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="h-12 w-full cursor-pointer rounded-xl border-0 text-[16px] font-bold disabled:opacity-70"
      style={{ backgroundColor: color, color: textColor }}
    >
      {pending ? "One moment…" : label}
    </button>
  );
}

/** 29 The donor's details for the receipt, then the card payment (or, in a demo, nothing to pay). */
export function GiveForm({
  token,
  label,
  color,
  textColor,
  defaults,
}: {
  token: string;
  label: string;
  color: string;
  textColor: string;
  defaults: { name: string; email: string; phone: string; city: string };
}) {
  const [state, action] = useActionState(giveAction.bind(null, token), initialFormState);
  const value = (name: keyof typeof defaults) => state.values?.[name] ?? defaults[name];
  return (
    <form action={action} noValidate className="flex flex-col gap-4">
      <FormMessage message={state.message} ok={state.ok} />
      <Field label="Full name" name="name" autoComplete="name" required defaultValue={value("name")} error={state.errors?.name} />
      <Field
        label="Email"
        name="email"
        type="email"
        autoComplete="email"
        required
        defaultValue={value("email")}
        hint="We send your receipt here."
        error={state.errors?.email}
      />
      <Field label="Mobile number (optional)" name="phone" type="tel" autoComplete="tel" defaultValue={value("phone")} error={state.errors?.phone} />
      <Field label="City" name="city" autoComplete="address-level2" required defaultValue={value("city")} error={state.errors?.city} />
      <GiveButton label={label} color={color} textColor={textColor} />
    </form>
  );
}
