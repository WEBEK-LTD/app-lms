"use client";

import { useActionState, useState } from "react";
import { payPlanAction } from "@/app/actions/billing";
import { Field, FieldError, FormMessage, SubmitButton } from "@/components/form";
import { initialFormState } from "@/lib/forms";

export interface CardPlan {
  id: "starter" | "pro";
  name: string;
  price: string;
  period: string | null;
  tagline: string;
}

/** Plan choice and billing address; the card itself is entered on iyzico's page. */
export function PlanPaymentForm({ plans, current, cta }: { plans: CardPlan[]; current: "starter" | "pro" | null; cta: string }) {
  const [state, action] = useActionState(payPlanAction, initialFormState);
  const [plan, setPlan] = useState<string>(state.values?.plan || current || plans[plans.length - 1]?.id || "");
  const v = state.values ?? {};
  return (
    <form action={action} noValidate className="flex flex-col gap-4">
      <FormMessage message={state.message} />
      {/* The choice is sent from state: React resets the form's own radios after each submit. */}
      <input type="hidden" name="plan" value={plan} />
      <fieldset className="m-0 flex flex-col gap-2.5 border-0 p-0">
        <legend className="mb-1.5 text-sm font-semibold">Plan</legend>
        {plans.map((p) => (
          <label
            key={p.id}
            className={`flex cursor-pointer items-start gap-3 rounded-xl border px-4 py-3 ${plan === p.id ? "border-midnight bg-ivory" : "border-line"}`}
          >
            <input type="radio" name="planChoice" value={p.id} checked={plan === p.id} onChange={() => setPlan(p.id)} className="mt-1 h-4 w-4 accent-midnight" />
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="text-[15px] font-bold">{p.name}</span>
                <span className="text-[15px] font-bold">
                  {p.price}
                  {p.period ? <span className="font-normal text-muted"> / {p.period}</span> : null}
                </span>
              </span>
              {p.tagline ? <span className="text-[13px] text-muted">{p.tagline}</span> : null}
            </span>
          </label>
        ))}
        <FieldError id="f-plan-error" error={state.errors?.plan} />
      </fieldset>
      <div className="grid gap-4 sm:grid-cols-[180px_1fr]">
        <Field label="City" name="city" autoComplete="address-level2" defaultValue={v.city} error={state.errors?.city} small />
        <Field label="Billing address" name="address" autoComplete="street-address" defaultValue={v.address} error={state.errors?.address} small />
      </div>
      <SubmitButton className="h-11" pendingText="Opening the payment page…">
        {cta}
      </SubmitButton>
      <span className="text-xs leading-normal text-muted">You enter your card on iyzico&apos;s secure page. Your plan starts as soon as the payment is confirmed.</span>
    </form>
  );
}
