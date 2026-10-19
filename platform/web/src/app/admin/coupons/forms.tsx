"use client";

import { useActionState, useState } from "react";
import { PLANS, type Plan } from "@/lib/plans";
import { createCouponAction, updateCouponAction } from "@/app/actions/admin-coupons";
import { Field, FieldError, FormMessage, SubmitButton } from "@/components/form";
import type { CouponFormValues } from "@/lib/billing/coupons";
import { initialFormState } from "@/lib/forms";

export function CouponForm({ id, coupon, planNames }: { id?: string; coupon: CouponFormValues; planNames: Record<Plan, string> }) {
  const [state, action] = useActionState(id ? updateCouponAction : createCouponAction, initialFormState);
  const s = state.values;
  const v = (name: keyof CouponFormValues & string) => (s ? (s[name] ?? "") : String(coupon[name]));
  const checked = (name: "firstPaymentOnly" | "active") => (s ? s[name] === "on" : coupon[name]);
  const inList = (name: "plans" | "periods", value: string) => (s ? (s[name] ?? "") : coupon[name]).split(",").includes(value);
  const [kind, setKind] = useState<string>(s?.kind ?? coupon.kind);
  const e = state.errors ?? {};
  return (
    <form action={action} noValidate className="flex flex-col gap-5">
      {id ? <input type="hidden" name="id" value={id} /> : null}
      <FormMessage message={state.message} ok={state.ok} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Code" name="code" maxLength={40} defaultValue={v("code")} hint="Clients can type it in any case." error={e.code} />
        <Field label="Note for the team" name="note" maxLength={200} defaultValue={v("note")} hint="Optional, never shown to clients." error={e.note} />
      </div>

      <fieldset className="m-0 flex flex-col gap-3 border-0 p-0">
        <legend className="mb-1 text-sm font-semibold">Discount</legend>
        <div className="flex flex-wrap gap-5">
          {[
            { id: "percent", label: "A percentage" },
            { id: "fixed", label: "A fixed amount" },
          ].map((option) => (
            <label key={option.id} className="flex cursor-pointer items-center gap-2 text-[15px]">
              <input type="radio" name="kind" value={option.id} checked={kind === option.id} onChange={() => setKind(option.id)} className="h-4 w-4 accent-midnight" />
              {option.label}
            </label>
          ))}
        </div>
        <FieldError id="f-kind-error" error={e.kind} />
        {kind === "percent" ? (
          <Field label="Percent off" name="percent" inputMode="numeric" defaultValue={v("percent")} hint="100 makes the plan free: no card payment." error={e.percent} className="max-w-[220px]" />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {/* 52 Kashier charges in pounds; dollars only when Yallapp's plans are paid through iyzico. */}
            <Field
              label="Off in EGP"
              name="amountEGP"
              inputMode="decimal"
              defaultValue={v("amountEGP")}
              error={e.amountEGP}
              hint="Off the charge in pounds. The dollar price shown outside Egypt drops in the same proportion."
            />
            <Field label="Off in USD" name="amountUSD" inputMode="decimal" defaultValue={v("amountUSD")} error={e.amountUSD} hint="Only when plans are paid through iyzico, in dollars." />
          </div>
        )}
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
          <legend className="mb-1 text-sm font-semibold">Plans</legend>
          {PLANS.map((plan) => (
            <label key={plan} className="flex cursor-pointer items-center gap-2 text-[15px]">
              <input type="checkbox" name="plans" value={plan} defaultChecked={inList("plans", plan)} className="h-4 w-4 accent-midnight" />
              {planNames[plan]}
            </label>
          ))}
          <FieldError id="f-plans-error" error={e.plans} />
        </fieldset>
        <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
          <legend className="mb-1 text-sm font-semibold">Billing periods</legend>
          {[
            { id: "1", label: "Monthly" },
            { id: "12", label: "Yearly" },
          ].map((period) => (
            <label key={period.id} className="flex cursor-pointer items-center gap-2 text-[15px]">
              <input type="checkbox" name="periods" value={period.id} defaultChecked={inList("periods", period.id)} className="h-4 w-4 accent-midnight" />
              {period.label}
            </label>
          ))}
          <FieldError id="f-periods-error" error={e.periods} />
        </fieldset>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Valid from" name="validFrom" type="date" defaultValue={v("validFrom")} hint="Optional. Days are in UTC." error={e.validFrom} />
        <Field label="Valid until" name="validUntil" type="date" defaultValue={v("validUntil")} hint="Optional. Works all of that day." error={e.validUntil} />
        <Field label="Uses in total" name="maxRedemptions" inputMode="numeric" defaultValue={v("maxRedemptions")} hint="Empty for no limit." error={e.maxRedemptions} />
        <Field label="Uses per client" name="maxPerClient" inputMode="numeric" defaultValue={v("maxPerClient")} hint="Empty for no limit." error={e.maxPerClient} />
      </div>

      <div className="flex flex-col gap-2">
        <label className="flex cursor-pointer items-center gap-2 text-[15px]">
          <input type="checkbox" name="firstPaymentOnly" defaultChecked={checked("firstPaymentOnly")} className="h-4 w-4 accent-midnight" />
          First payment only (an app that has never been activated)
        </label>
        <label className="flex cursor-pointer items-center gap-2 text-[15px]">
          <input type="checkbox" name="active" defaultChecked={checked("active")} className="h-4 w-4 accent-midnight" />
          Clients can use it
        </label>
      </div>

      <div className="flex justify-end">
        <SubmitButton className="h-10" pendingText="Saving…">
          {id ? "Save coupon" : "Create coupon"}
        </SubmitButton>
      </div>
    </form>
  );
}
