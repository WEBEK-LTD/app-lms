"use client";

import { startTransition, useActionState, useState } from "react";
import { buyAddonAction, checkAddonCouponAction, type AddonCouponState } from "@/app/actions/addons";
import { Field, FieldError, FormMessage, SubmitButton } from "@/components/form";
import { PeriodChoice, type PeriodOption } from "@/components/period-choice";
import { useDashT, useKnownText } from "@/components/dashboard-i18n";
import { btn } from "@/components/ui";
import { initialFormState } from "@/lib/forms";

/** 133 One way to pay an add-on, as the page worked it out (the client's currency). */
export interface AddonChoice extends PeriodOption {
  /** The charge line when the charge isn't in the shown currency. */
  charge: string | null;
}

/**
 * 133 Paying an add-on: how (one-time, a period, or for life), the billing
 * address and an optional coupon; the card is entered on the provider's
 * page, as for the plans.
 */
export function AddonBuyForm({ appId, addon, renews, choices, provider }: { appId: string | null; addon: string; renews: string | null; choices: AddonChoice[]; provider: string }) {
  const t = useDashT();
  const known = useKnownText();
  const [state, action] = useActionState(buyAddonAction, initialFormState);
  const [couponState, couponAction, couponPending] = useActionState(checkAddonCouponAction, {} as AddonCouponState);
  const [billing, setBilling] = useState<string>(state.values?.billing || choices[0]?.key || "");
  const [coupon, setCoupon] = useState(state.values?.coupon ?? "");
  const v = state.values ?? {};
  const applied = couponState.code && couponState.code === coupon.trim().toUpperCase() ? couponState.prices : undefined;
  const lowered = applied?.[billing];
  const chosen = choices.find((c) => c.key === billing);
  const free = Boolean(lowered?.free);
  const charge = free ? null : lowered ? lowered.charge : chosen?.charge;
  const couponError = state.errors?.coupon ?? (couponState.code === undefined ? couponState.error : undefined);
  const applyCoupon = () => {
    const data = new FormData();
    data.set("coupon", coupon);
    data.set("addon", addon);
    startTransition(() => couponAction(data));
  };
  // The coupon's lowered price shows on the choice.
  const shown = choices.map((c) => (applied?.[c.key] ? { ...c, price: applied[c.key]!.price } : c));
  return (
    <form action={action} noValidate className="flex flex-col gap-4" aria-label={t("addons.checkout")}>
      <FormMessage message={state.message} />
      <input type="hidden" name="addon" value={addon} />
      <input type="hidden" name="renews" value={renews ?? ""} />
      <input type="hidden" name="billing" value={billing} />
      <input type="hidden" name="appId" value={appId ?? ""} />
      <PeriodChoice name="billingChoice" periods={shown} value={billing} onChange={setBilling} legend={t("license.payFor")} />
      <FieldError id="f-billing-error" error={state.errors?.billing} />
      <div className="grid gap-4 sm:grid-cols-[180px_1fr]">
        <Field label={t("license.city")} name="city" autoComplete="address-level2" defaultValue={v.city} error={state.errors?.city} small />
        <Field label={t("license.address")} name="address" autoComplete="street-address" defaultValue={v.address} error={state.errors?.address} small />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="f-addon-coupon" className="text-sm font-semibold">
          {t("license.coupon")} <span className="font-normal text-muted">{t("license.optional")}</span>
        </label>
        <div className="flex flex-wrap gap-2">
          <input
            id="f-addon-coupon"
            name="coupon"
            value={coupon}
            onChange={(e) => setCoupon(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                applyCoupon();
              }
            }}
            autoComplete="off"
            autoCapitalize="characters"
            className="input input-sm min-w-[160px] flex-1 uppercase"
            aria-invalid={couponError ? true : undefined}
            aria-describedby={couponError ? "f-addon-coupon-error" : undefined}
          />
          <button type="button" onClick={applyCoupon} disabled={couponPending || !coupon.trim()} className={`${btn.secondary} h-10`}>
            {couponPending ? t("license.checking") : t("license.apply")}
          </button>
        </div>
        <FieldError id="f-addon-coupon-error" error={couponError} />
        {applied && couponState.message ? (
          <p role="status" className="m-0 text-[13px] font-semibold text-success">
            {known(couponState.message)}
          </p>
        ) : null}
      </div>
      {charge ? (
        <p data-charge-line="" className="m-0 flex items-start gap-2 rounded-xl bg-ivory px-4 py-3 text-sm font-semibold text-ink-2">
          {charge}
        </p>
      ) : null}
      <SubmitButton className="h-11" pendingText={free ? t("license.activating") : t("license.opening")}>
        {free ? t("addons.addWithCoupon") : renews ? t("addons.payRenew") : t("addons.pay")}
      </SubmitButton>
      <span className="text-xs leading-normal text-muted">{free ? t("license.couponCovers") : t("license.cardOn", { provider })}</span>
    </form>
  );
}
