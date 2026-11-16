"use client";

import { startTransition, useActionState, useState } from "react";
import { checkCouponAction, payPlanAction, type CouponState } from "@/app/actions/billing";
import { Field, FieldError, FormMessage, SubmitButton } from "@/components/form";
import { initialFormState } from "@/lib/forms";
import type { Plan } from "@/lib/plans";
import type { PeriodKey } from "@/lib/billing/periods";
import { useDashT, useKnownText } from "./dashboard-i18n";
import { btn } from "./ui";
import { PeriodChoice } from "./period-choice";

/** 133 One of a plan's billing periods on the payment form: its price, per month and the saving, worked out from the team's prices. */
export interface CardPeriod {
  key: PeriodKey;
  /** "EGP 1,500". */
  price: string;
  /** "month", "6 months", "year", "2 years", "3 years" or "lifetime" (English; the form translates it). */
  unit: string;
  /** "EGP 250": per month; null for a month or lifetime. */
  perMonth: string | null;
  /** Whole percent saved against the shortest period. */
  saving: number | null;
  /** The charge line when the charge isn't in the shown currency. */
  charge: string | null;
  /** 13.3 What paying for this period does to the app's current plan. */
  note?: string | null;
}

export interface CardPlan {
  id: Plan;
  name: string;
  price: string;
  period: string | null;
  tagline: string;
  /** 13.3 What paying for this plan does to the app's current plan: "Starts today, …". */
  note?: string | null;
  /** 52 "You'll be charged EGP 1,500 (about $30); your bank may convert it.", when the charge isn't in the shown currency. */
  charge?: string | null;
  /** 133 The periods the plan offers; one, or none for a plan from before. */
  periods?: CardPeriod[];
}

/** Plan choice, billing address and an optional coupon; the card itself is entered on the provider's page (37 iyzico, Kashier, Fawaterk, Stripe or PayPal). */
export function PlanPaymentForm({
  plans,
  current,
  currentPeriod = null,
  cta,
  appId,
  provider,
  storageRenewal = {},
}: {
  plans: CardPlan[];
  current: Plan | null;
  /** 133 The period to start on (the one the client picked on the plan cards). */
  currentPeriod?: PeriodKey | null;
  cta: string;
  /** The app being paid for (the dashboard's current app); the server checks it is still the current one. */
  appId: string | null;
  /** 37 The name of the provider taking the payment: "iyzico", "Kashier" or "Fawaterk". */
  provider: string;
  /** 51 Per plan (133 and period, "plan:period"), the app's storage packs a card renewal can include: "Renew my storage pack (+25 GB) for $60 (charged as EGP 3,000)". */
  storageRenewal?: Partial<Record<string, string>>;
}) {
  const t = useDashT();
  const known = useKnownText();
  const [state, action] = useActionState(payPlanAction, initialFormState);
  const [couponState, couponAction, couponPending] = useActionState(checkCouponAction, {} as CouponState);
  const [plan, setPlan] = useState<string>(state.values?.plan || current || plans[plans.length - 1]?.id || "");
  const chosen = plans.find((p) => p.id === plan);
  // 133 The period: the one sent last, else the one asked for, else the plan's main one.
  const periodsOf = (id: string) => plans.find((p) => p.id === id)?.periods ?? [];
  const firstPeriod = (id: string, wanted?: string | null) => {
    const list = periodsOf(id);
    const card = plans.find((p) => p.id === id);
    return (list.find((p) => p.key === wanted) ?? list.find((p) => p.unit === card?.period) ?? list[0])?.key ?? "";
  };
  const [period, setPeriod] = useState<string>(() => firstPeriod(plan, state.values?.period || currentPeriod));
  const [coupon, setCoupon] = useState(state.values?.coupon ?? "");
  const v = state.values ?? {};
  const choosePlan = (id: string) => {
    setPlan(id);
    // The same period on the new plan when it has it.
    setPeriod(firstPeriod(id, period));
  };
  const periodNow = chosen?.periods?.find((p) => p.key === period) ?? null;
  const key = `${plan}:${period}`;
  // A price shows lowered only while the field still holds the coupon that was applied.
  const applied = couponState.code && couponState.code === coupon.trim().toUpperCase() ? couponState.prices : undefined;
  const free = Boolean(applied?.[key]?.free);
  // 52 The charge line of the chosen plan, with the coupon's when one is applied.
  const withCoupon = applied?.[key];
  const charge = free ? null : withCoupon ? withCoupon.charge : (periodNow?.charge ?? chosen?.charge);
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
      <input type="hidden" name="period" value={period} />
      <input type="hidden" name="appId" value={appId ?? ""} />
      <fieldset className="m-0 flex flex-col gap-2.5 border-0 p-0">
        <legend className="mb-1.5 text-sm font-semibold">{t("license.plan")}</legend>
        {plans.map((p) => {
          // 133 Each plan shows the chosen period's price when it has that period, else its own main one.
          const shownPeriod = p.periods?.find((x) => x.key === (plan === p.id ? period : firstPeriod(p.id, period))) ?? null;
          const lowered = applied?.[`${p.id}:${shownPeriod?.key ?? ""}`];
          const price = shownPeriod?.price ?? p.price;
          const unit = shownPeriod ? known(shownPeriod.unit) : p.period;
          const note = (plan === p.id ? periodNow?.note : shownPeriod?.note) ?? p.note;
          return (
            <label
              key={p.id}
              className={`flex cursor-pointer items-start gap-3 rounded-xl border px-4 py-3 ${plan === p.id ? "border-midnight bg-ivory" : "border-line"}`}
            >
              <input type="radio" name="planChoice" value={p.id} checked={plan === p.id} onChange={() => choosePlan(p.id)} className="mt-1 h-4 w-4 accent-midnight" />
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="text-[15px] font-bold">{p.name}</span>
                  <span className="text-[15px] font-bold" dir="ltr">
                    {lowered ? (
                      <>
                        <s className="me-1.5 font-normal text-muted">{lowered.was}</s>
                        {lowered.price}
                      </>
                    ) : (
                      price
                    )}
                    {unit ? <span className="font-normal text-muted"> / {unit}</span> : null}
                  </span>
                </span>
                {p.tagline ? <span className="text-[13px] text-muted">{p.tagline}</span> : null}
                {note ? <span className="text-[13px] font-semibold text-ink-2">{note}</span> : null}
              </span>
            </label>
          );
        })}
        <FieldError id="f-plan-error" error={state.errors?.plan} />
      </fieldset>
      {/* 133 How long to pay for: the periods the chosen plan offers. */}
      {(chosen?.periods?.length ?? 0) > 1 ? <PeriodChoice name="periodChoice" periods={chosen!.periods!} value={period} onChange={setPeriod} legend={t("license.payFor")} /> : null}
      {storageRenewal[key] ? (
        <label className="flex cursor-pointer items-center gap-2 text-[15px]">
          <input type="checkbox" name="renewStorage" defaultChecked={state.values ? state.values.renewStorage === "on" : true} className="h-4 w-4 accent-midnight" />
          {storageRenewal[key]}
        </label>
      ) : null}
      <div className="grid gap-4 sm:grid-cols-[180px_1fr]">
        <Field label={t("license.city")} name="city" autoComplete="address-level2" defaultValue={v.city} error={state.errors?.city} small />
        <Field label={t("license.address")} name="address" autoComplete="street-address" defaultValue={v.address} error={state.errors?.address} small />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="f-coupon" className="text-sm font-semibold">
          {t("license.coupon")} <span className="font-normal text-muted">{t("license.optional")}</span>
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
            {couponPending ? t("license.checking") : t("license.apply")}
          </button>
        </div>
        <FieldError id="f-coupon-error" error={couponError} />
        {applied && couponState.message ? (
          <p role="status" className="m-0 text-[13px] font-semibold text-success">
            {known(couponState.message)}
          </p>
        ) : null}
      </div>
      {/* The website's live activity card: off unless the client ticks it. */}
      <label className="flex cursor-pointer items-start gap-2 text-[15px]">
        <input type="checkbox" name="showOnSite" defaultChecked={state.values?.showOnSite === "on"} className="mt-1 h-4 w-4 accent-midnight" />
        <span className="flex flex-col gap-0.5">
          {t("license.showOnSite")}
          <span className="text-[13px] text-muted">{t("license.showOnSiteHint")}</span>
        </span>
      </label>
      {charge ? (
        <p data-charge-line="" className="m-0 flex items-start gap-2 rounded-xl bg-ivory px-4 py-3 text-sm font-semibold text-ink-2">
          {charge}
        </p>
      ) : null}
      <SubmitButton className="h-11" pendingText={free ? t("license.activating") : t("license.opening")}>
        {free ? t("license.activateCoupon") : cta}
      </SubmitButton>
      <span className="text-xs leading-normal text-muted">
        {free ? t("license.couponCovers") : t("license.cardOn", { provider })}
      </span>
    </form>
  );
}
