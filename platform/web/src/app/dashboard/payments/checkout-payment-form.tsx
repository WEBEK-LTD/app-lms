"use client";

import { useActionState, useState } from "react";
import { refundPlatformOrderAction, retryPlatformOrderAction, saveCheckoutPaymentAction } from "@/app/actions/in-app-pay";
import { FormMessage, SubmitButton } from "@/components/form";
import { Icon } from "@/components/icon";
import { useDashT } from "@/components/dashboard-i18n";
import { initialFormState } from "@/lib/forms";

/** 134 One way customers may pay, as the page words it. */
export interface CheckoutChoice {
  value: "yallapp" | "platform" | "in_app";
  label: string;
  hint: string;
  /** Why it can't be chosen here; null: it can. */
  blocked: string | null;
  /** "Default", "Demo". */
  tag: string | null;
}

/** 134 Payments › How customers pay: the three ways, the one in use checked, the Demo note under the in-app one. */
export function CheckoutPaymentForm({ choices, current, demo, savable }: { choices: CheckoutChoice[]; current: CheckoutChoice["value"]; demo: { title: string; text: string }; savable: boolean }) {
  const t = useDashT();
  const [state, action] = useActionState(saveCheckoutPaymentAction, initialFormState);
  const [chosen, setChosen] = useState<string>(state.values?.checkoutPayment ?? current);
  return (
    <form action={action} className="flex flex-col gap-3" data-checkout-payment="">
      <FormMessage message={state.message} ok={state.ok} />
      <fieldset className="m-0 flex flex-col gap-3 border-0 p-0">
        <legend className="sr-only">{t("inAppPay.title")}</legend>
        {choices.map((c) => (
          <div key={c.value} className="flex flex-col gap-2">
            <label
              className={`flex items-start gap-3 rounded-xl border p-3.5 ${c.blocked ? "cursor-not-allowed border-line-soft bg-sand opacity-80" : "cursor-pointer border-line-soft has-[:checked]:border-ink"}`}
              data-choice={c.value}
            >
              <input
                type="radio"
                name="checkoutPayment"
                value={c.value}
                checked={chosen === c.value}
                disabled={c.blocked !== null}
                onChange={() => setChosen(c.value)}
                className="mt-1 h-4 w-4 shrink-0 accent-midnight"
              />
              <span className="flex min-w-0 flex-col gap-1">
                <span className="flex flex-wrap items-center gap-2 text-[15px] font-semibold">
                  {c.label}
                  {c.value === current && !c.blocked ? (
                    <span className="rounded-lg bg-success-bg px-2 py-0.5 text-xs font-bold text-success">{t("inAppPay.inUse")}</span>
                  ) : null}
                  {c.tag ? <span className="rounded-lg bg-line-soft px-2 py-0.5 text-xs font-bold text-muted">{c.tag}</span> : null}
                </span>
                <span className="text-[13px] leading-relaxed text-ink-4">{c.hint}</span>
                {c.blocked ? (
                  <span className="flex items-start gap-1.5 text-[13px] leading-relaxed text-ink-3" data-blocked="">
                    <Icon name="block" size={16} className="mt-0.5 shrink-0 text-muted" />
                    {c.blocked}
                  </span>
                ) : null}
              </span>
            </label>
            {c.value === "in_app" ? (
              <div role="note" className="flex gap-2.5 rounded-xl bg-peach-soft px-4 py-3 text-[14px] leading-relaxed" data-demo-note="">
                <Icon name="info" size={20} className="mt-0.5 shrink-0" />
                <span>
                  <b>{demo.title}.</b> {demo.text}
                </span>
              </div>
            ) : null}
          </div>
        ))}
      </fieldset>
      {savable ? (
        <div className="flex justify-end">
          <SubmitButton variant="secondary" className="h-10" pendingText={t("common.saving")}>
            {t("common.save")}
          </SubmitButton>
        </div>
      ) : null}
    </form>
  );
}

/** 134 A payment whose order the store refused: create it again, or refund it. */
export function AttentionActions({ id, refund }: { id: number; refund: string | null }) {
  const t = useDashT();
  const [retried, retry] = useActionState(retryPlatformOrderAction, initialFormState);
  const [refunded, giveBack] = useActionState(refundPlatformOrderAction, initialFormState);
  return (
    <div className="flex flex-col gap-2">
      <FormMessage message={retried.message ?? refunded.message} ok={retried.message ? retried.ok : refunded.ok} />
      <div className="flex flex-wrap gap-2">
        <form action={retry}>
          <input type="hidden" name="id" value={id} />
          <SubmitButton className="h-9 px-3.5 text-sm" pendingText={t("inAppPay.retrying")}>
            {t("inAppPay.retry")}
          </SubmitButton>
        </form>
        {refund ? (
          <form action={giveBack} title={refund}>
            <input type="hidden" name="id" value={id} />
            <SubmitButton variant="secondary" className="h-9 px-3.5 text-sm" pendingText={t("inAppPay.refunding")}>
              {t("inAppPay.refund")}
            </SubmitButton>
          </form>
        ) : null}
      </div>
      {refund ? <p className="m-0 text-[13px] text-muted">{refund}</p> : null}
    </div>
  );
}
