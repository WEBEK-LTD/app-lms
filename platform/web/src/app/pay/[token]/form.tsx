"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { payAction, type PayState } from "@/app/actions/pay";
import { Field, FieldError, FormMessage } from "@/components/form";
import type { CatalogCustomer } from "@/lib/data/types";
import type { ManualChoice } from "@/lib/catalog/manual";
import { initialFormState } from "@/lib/forms";
import { IyzicoCard } from "./iyzico-card";
import { KashierCard } from "./kashier-card";
import { StripeCard } from "./stripe-card";

/** 153 The provider's own page, the same payment, when its form can't show in ours. */
function PayOnProvider({ note, href, label, color, textColor }: { note: string; href: string; label: string; color: string; textColor: string }) {
  return (
    <div className="flex flex-col gap-3">
      <p role="alert" className="m-0 rounded-xl bg-sand px-4 py-3 text-[15px]">
        {note}
      </p>
      <a href={href} className="flex h-12 w-full items-center justify-center rounded-xl text-[16px] font-bold no-underline" style={{ backgroundColor: color, color: textColor }}>
        {label}
      </a>
    </div>
  );
}

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
  cityOptional = false,
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
  /** 168 The order already says where it goes (lib/catalog/payment.ts cityOptionalFor). */
  cityOptional?: boolean;
}) {
  const [state, action] = useActionState<PayState, FormData>(payAction.bind(null, token), initialFormState);
  // 144 Stripe's form didn't load: its own page instead, with the same details. 153 iyzico's or Kashier's: their page, the same payment.
  const [hosted, setHosted] = useState(false);
  const value = (name: keyof CatalogCustomer) => state.values?.[name] ?? defaults?.[name] ?? "";
  const methods = [...(card ? [{ method: "card", name: "Card", instructions: "" }] : []), ...manual];
  // The choice lives outside the form, which React resets after each submit.
  const [method, setMethod] = useState(methods[0]?.method ?? "card");
  const chosen = methods.find((m) => m.method === method);
  // 144 The details are in: Stripe's card form (153 iyzico's, Kashier's), in this page.
  if (state.stripe || state.iyzico || state.kashier) {
    const provider = state.stripe ? "Stripe" : state.iyzico ? "iyzico" : "Kashier";
    return (
      <div className="flex flex-col gap-4" data-pay-step="card">
        <div className="flex flex-col gap-1">
          <h2 className="m-0 text-[18px] font-bold">Your card</h2>
          <p className="m-0 text-[15px] leading-relaxed text-ink-4">Enter your card to pay {total}. It goes straight to {provider}: the shop never sees its number.</p>
        </div>
        {state.stripe ? (
          hosted ? (
            <form action={action} className="flex flex-col gap-3">
              <p role="alert" className="m-0 rounded-xl bg-sand px-4 py-3 text-[15px]">
                The card form didn&apos;t load here. Pay on Stripe&apos;s secure page instead.
              </p>
              <input type="hidden" name="method" value="card" />
              <input type="hidden" name="hosted" value="1" />
              {(["name", "phone", "email", "city", "address"] as const).map((name) => (
                <input key={name} type="hidden" name={name} value={value(name)} />
              ))}
              <PayButton label={`Pay ${total} on Stripe`} busy="Opening the payment…" color={color} textColor={textColor} />
            </form>
          ) : (
            <StripeCard clientSecret={state.stripe.clientSecret} publishableKey={state.stripe.publishableKey} jsUrl={state.stripe.jsUrl} onFailed={() => setHosted(true)} />
          )
        ) : null}
        {state.iyzico ? (
          hosted ? (
            <PayOnProvider note="The card form didn't load here. Pay on iyzico's secure page instead." href={state.iyzico.pageUrl} label={`Pay ${total} on iyzico`} color={color} textColor={textColor} />
          ) : (
            <IyzicoCard formContent={state.iyzico.formContent} onFailed={() => setHosted(true)} />
          )
        ) : null}
        {state.kashier ? (
          <>
            <KashierCard frameUrl={state.kashier.frameUrl} returnUrl={state.kashier.returnUrl} onTrouble={() => setHosted(true)} />
            {/* The form stays: it may only be slow to say it's there. */}
            {hosted ? <PayOnProvider note="Card form not showing? Pay on Kashier's secure page instead." href={state.kashier.pageUrl} label={`Pay ${total} on Kashier`} color={color} textColor={textColor} /> : null}
          </>
        ) : null}
        <button type="button" onClick={() => window.location.reload()} className="cursor-pointer self-start border-0 bg-transparent p-0 text-[15px] font-semibold underline">
          Change your details
        </button>
      </div>
    );
  }
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
        <Field label={cityOptional ? "City (optional)" : "City"} name="city" autoComplete="address-level2" required={!cityOptional} defaultValue={value("city")} error={state.errors?.city} />
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
