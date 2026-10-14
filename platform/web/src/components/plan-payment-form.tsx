"use client";

import { startTransition, useActionState, useState } from "react";
import { checkCouponAction, payPlanAction, type CouponState } from "@/app/actions/billing";
import { Field, FieldError, FormMessage, SubmitButton } from "@/components/form";
import { initialFormState } from "@/lib/forms";
import type { Plan } from "@/lib/plans";
import { btn } from "./ui";

export interface CardPlan {
  id: Plan;
  name: string;
  price: string;
  period: string | null;
  tagline: string;
  /** 13.3 What paying for this plan does to the app's current plan: "Starts today, …". */
  note?: string | null;
}

/** Plan choice, billing address and an optional coupon; the card itself is entered on iyzico's page. */
export function PlanPaymentForm({
  plans,
  current,
  cta,
  appId,
}: {
  plans: CardPlan[];
  current: Plan | null;
  cta: string;
  /** The app being paid for (the dashboard's current app); the server checks it is still the current one. */
  appId: string | null;
}) {
  const [state, action] = useActionState(payPlanAction, initialFormState);
  const [couponState, couponAction, couponPending] = useActionState(checkCouponAction, {} as CouponState);
  const [plan, setPlan] = useState<string>(state.values?.plan || current || plans[plans.length - 1]?.id || "");
  const [coupon, setCoupon] = useState(state.values?.coupon ?? "");
  const v = state.values ?? {};
  // A price shows lowered only while the field still holds the coupon that was applied.
  const applied = couponState.code && couponState.code === coupon.trim().toUpperCase() ? couponState.prices : undefined;
  const free = Boolean(applied?.[plan]?.free);
  const couponError = state.errors?.coupon ?? (couponState.code === undefined ? couponState.error : undefined);
  // Not a form submission: React would empty the address fields afterwards.
  const applyCoupon = () => {
    const data = new FormData();
    data.set("coupon", coupon);
    startTransition(() => couponAction(data));
  };
  return (
    <form action={action} noValidate className="flex flex-col gap-4">
      <FormMessage message={state.message} />
      {/* The choice is sent from state: React resets the form's own radios after each submit. */}
      <input type="hidden" name="plan" value={plan} />
      <input type="hidden" name="appId" value={appId ?? ""} />
      <fieldset className="m-0 flex flex-col gap-2.5 border-0 p-0">
        <legend className="mb-1.5 text-sm font-semibold">Plan</legend>
        {plans.map((p) => {
          const lowered = applied?.[p.id];
          return (
            <label
              key={p.id}
              className={`flex cursor-pointer items-start gap-3 rounded-xl border px-4 py-3 ${plan === p.id ? "border-midnight bg-ivory" : "border-line"}`}
            >
              <input type="radio" name="planChoice" value={p.id} checked={plan === p.id} onChange={() => setPlan(p.id)} className="mt-1 h-4 w-4 accent-midnight" />
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="text-[15px] font-bold">{p.name}</span>
                  <span className="text-[15px] font-bold">
                    {lowered ? (
                      <>
                        <s className="mr-1.5 font-normal text-muted">{lowered.was}</s>
                        {lowered.price}
                      </>
                    ) : (
                      p.price
                    )}
                    {p.period ? <span className="font-normal text-muted"> / {p.period}</span> : null}
                  </span>
                </span>
                {p.tagline ? <span className="text-[13px] text-muted">{p.tagline}</span> : null}
                {p.note ? <span className="text-[13px] font-semibold text-ink-2">{p.note}</span> : null}
              </span>
            </label>
          );
        })}
        <FieldError id="f-plan-error" error={state.errors?.plan} />
      </fieldset>
      <div className="grid gap-4 sm:grid-cols-[180px_1fr]">
        <Field label="City" name="city" autoComplete="address-level2" defaultValue={v.city} error={state.errors?.city} small />
        <Field label="Billing address" name="address" autoComplete="street-address" defaultValue={v.address} error={state.errors?.address} small />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="f-coupon" className="text-sm font-semibold">
          Coupon code <span className="font-normal text-muted">(optional)</span>
        </label>
        <div className="flex flex-wrap gap-2">
          <input
            id="f-coupon"
            name="coupon"
            value={coupon}
            onChange={(e) => setCoupon(e.target.value)}
            onKeyDown={(e) => {
              // Enter applies the coupon instead of paying.
              if (e.key === "Enter") {
                e.preventDefault();
                applyCoupon();
              }
            }}
            autoComplete="off"
            autoCapitalize="characters"
            className="input input-sm min-w-[160px] flex-1 uppercase"
            aria-invalid={couponError ? true : undefined}
            aria-describedby={couponError ? "f-coupon-error" : undefined}
          />
          <button type="button" onClick={applyCoupon} disabled={couponPending || !coupon.trim()} className={`${btn.secondary} h-10`}>
            {couponPending ? "Checking…" : "Apply"}
          </button>
        </div>
        <FieldError id="f-coupon-error" error={couponError} />
        {applied && couponState.message ? (
          <p role="status" className="m-0 text-[13px] font-semibold text-success">
            {couponState.message}
          </p>
        ) : null}
      </div>
      <SubmitButton className="h-11" pendingText={free ? "Activating…" : "Opening the payment page…"}>
        {free ? "Activate with the coupon" : cta}
      </SubmitButton>
      <span className="text-xs leading-normal text-muted">
        {free
          ? "The coupon covers the whole price, so there's no card payment."
          : "You enter your card on iyzico's secure page. Your plan starts as soon as the payment is confirmed."}
      </span>
    </form>
  );
}
