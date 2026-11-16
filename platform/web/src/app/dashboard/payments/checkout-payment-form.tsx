"use client";

import { useActionState, useState } from "react";
import { refundPlatformOrderAction, retryPlatformOrderAction, saveCheckoutPaymentAction } from "@/app/actions/in-app-pay";
import { FormMessage, SubmitButton } from "@/components/form";
import { Icon } from "@/components/icon";
import type { IconName } from "@/components/icon-names";
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

/** 132.120 Each way to pay by its picture, as the gateways have theirs. */
const CHOICE_ICON: Record<CheckoutChoice["value"], IconName> = { yallapp: "shopping_bag", platform: "storefront", in_app: "smartphone" };

/**
 * 134 Payments › How customers pay: the three ways, the one in use checked, the Demo note under the in-app one.
 * 132.120 In the Payments page's design: each way a card side by side (as the gateways' cards), the one
 * chosen ringed, one that can't be chosen here greyed with why; the Demo note across under them.
 */
export function CheckoutPaymentForm({ choices, current, demo, savable }: { choices: CheckoutChoice[]; current: CheckoutChoice["value"]; demo: { title: string; text: string }; savable: boolean }) {
  const t = useDashT();
  const [state, action] = useActionState(saveCheckoutPaymentAction, initialFormState);
  const [chosen, setChosen] = useState<string>(state.values?.checkoutPayment ?? current);
  return (
    <form action={action} className="flex flex-col gap-3" data-checkout-payment="">
      <FormMessage message={state.message} ok={state.ok} />
      <fieldset className="m-0 grid gap-3 border-0 p-0 md:grid-cols-3">
        <legend className="sr-only">{t("inAppPay.title")}</legend>
        {choices.map((c) => {
          const id = `checkout-${c.value}`;
          const on = chosen === c.value;
          return (
            <label
              key={c.value}
              className={`relative flex flex-col gap-2 rounded-2xl border p-4 transition-shadow focus-within:ring-2 focus-within:ring-accent motion-reduce:transition-none ${
                c.blocked ? "cursor-not-allowed border-line-soft bg-sand" : on ? "cursor-pointer border-midnight bg-white ring-2 ring-midnight" : "cursor-pointer border-line bg-white hover:border-line-strong"
              }`}
              data-choice={c.value}
              data-checked={on ? "" : undefined}
            >
              <span className="flex items-center gap-2">
                <span className="flex h-9 w-9 flex-none items-center justify-center rounded-xl bg-ivory">
                  <Icon name={CHOICE_ICON[c.value]} size={20} filled={on} className={on ? "text-accent" : "text-muted"} />
                </span>
                <span className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
                  {c.value === current && !c.blocked ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-success-bg px-2 py-0.5 text-xs font-bold text-success">
                      <Icon name="check_circle" size={14} filled />
                      {t("inAppPay.inUse")}
                    </span>
                  ) : null}
                  {c.tag ? <span className="rounded-full bg-line-soft px-2 py-0.5 text-xs font-bold text-muted">{c.tag}</span> : null}
                </span>
                <input
                  type="radio"
                  name="checkoutPayment"
                  value={c.value}
                  checked={on}
                  disabled={c.blocked !== null}
                  onChange={() => setChosen(c.value)}
                  aria-labelledby={`${id}-name`}
                  aria-describedby={c.blocked ? `${id}-hint ${id}-why` : `${id}-hint`}
                  className="h-4 w-4 shrink-0 accent-midnight"
                />
              </span>
              <span id={`${id}-name`} className={`text-[16px] leading-snug font-extrabold ${c.blocked ? "text-ink-3" : "text-midnight"}`}>
                {c.label}
              </span>
              <span id={`${id}-hint`} className="text-[13px] leading-relaxed text-ink-4">
                {c.hint}
              </span>
              {c.blocked ? (
                <span id={`${id}-why`} className="mt-auto flex items-start gap-1.5 border-t border-line-soft pt-2 text-[13px] leading-relaxed text-ink-3" data-blocked="">
                  <Icon name="block" size={16} className="mt-0.5 shrink-0 text-muted" />
                  {c.blocked}
                </span>
              ) : null}
            </label>
          );
        })}
      </fieldset>
      <div role="note" className="flex gap-2.5 rounded-xl bg-peach-soft px-4 py-3 text-[14px] leading-relaxed" data-demo-note="">
        <Icon name="info" size={20} className="mt-0.5 shrink-0" />
        <span>
          <b>{demo.title}.</b> {demo.text}
        </span>
      </div>
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
