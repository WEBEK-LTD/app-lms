"use client";

import { useActionState } from "react";
import { refundDonationAction, refundOrderAction } from "@/app/actions/refunds";
import { Field, FieldError, FormMessage, SubmitButton } from "@/components/form";
import { initialFormState } from "@/lib/forms";
import { useDashT, useKnownText } from "@/components/dashboard-i18n";
import type { DashKey } from "@/i18n/dashboard";

/** 47 The serializable part of RefundOptions (lib/refunds/service.ts) the form needs. */
export interface RefundFormOptions {
  providerName: string;
  /** What's left to refund, as the amount field takes it ("450.00") and formatted ("₺450.00"). */
  left: string;
  leftFormatted: string;
  currency: string;
  byApi: boolean;
  manual: boolean;
  /** 96.2 Paid by bank transfer or the owner's own method (`providerName`): paid back the same way. */
  outside?: boolean;
  marketplace: boolean;
  /** Released to the shop already (marketplace, Kashier or Fawaterk): the team takes it from the next transfer. */
  payoutReleased: boolean;
  revocable: {
    tickets: { id: number; label: string }[];
    courses: { id: number; label: string }[];
    memberships: { id: number; label: string }[];
  };
}

const REASONS: [string, DashKey][] = [
  ["buyer_request", "orders.reasonBuyer"],
  ["double_payment", "orders.reasonDouble"],
  ["fraud", "orders.reasonFraud"],
  ["other", "orders.reasonOther"],
];

/** "Refund" under a paid order or donation: full or in part, through the provider or recorded. */
export function RefundForm({ kind, id, label, options }: { kind: "order" | "donation"; id: number; label: string; options: RefundFormOptions }) {
  const t = useDashT();
  const known = useKnownText();
  const [state, action] = useActionState(kind === "order" ? refundOrderAction : refundDonationAction, initialFormState);
  const f = (name: string) => `refund-${kind}-${id}-${name}`;
  const v = (name: string, fallback: string) => state.values?.[name] ?? fallback;
  const method = v("method", options.byApi ? "api" : "manual");
  const { tickets, courses, memberships } = options.revocable;
  const takeBack = [
    ...tickets.map((t) => ["tickets", t] as const),
    ...courses.map((c) => ["courses", c] as const),
    ...memberships.map((m) => ["memberships", m] as const),
  ];
  if (state.ok) return <FormMessage message={state.message} ok />;
  return (
    <details className="rounded-xl border border-line p-3.5" open={Boolean(state.message || state.errors)}>
      <summary className="cursor-pointer text-[15px] font-semibold">{t("orders.refund")}</summary>
      <form action={action} noValidate aria-label={t("orders.refundAria", { label })} className="mt-3 flex flex-col gap-4">
        <input type="hidden" name="id" value={id} />
        <FormMessage message={state.message} ok={state.ok} />
        {options.byApi && options.manual ? (
          <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
            <legend className="mb-1.5 text-sm font-semibold">{t("orders.how")}</legend>
            <label className="flex items-center gap-2 text-[15px]">
              <input type="radio" name="method" value="api" defaultChecked={method === "api"} />
              {t("orders.throughNow", { provider: options.providerName })}
            </label>
            <label className="flex items-center gap-2 text-[15px]">
              <input type="radio" name="method" value="manual" defaultChecked={method === "manual"} />
              {t("orders.recordIt", { provider: options.providerName })}
            </label>
            <FieldError id={`${f("method")}-error`} error={state.errors?.method} />
          </fieldset>
        ) : (
          <>
            <input type="hidden" name="method" value={options.byApi ? "api" : "manual"} />
            {options.byApi ? null : (
              <p className="m-0 text-sm text-ink-4">{t(options.outside ? "orders.outsideOnly" : "orders.panelOnly", { provider: options.providerName })}</p>
            )}
            <FieldError id={`${f("method")}-error`} error={state.errors?.method} />
          </>
        )}
        <div className="grid gap-4 sm:grid-cols-[180px_1fr]">
          <Field
            id={f("amount")}
            label={t("orders.amount", { currency: options.currency })}
            name="amount"
            inputMode="decimal"
            defaultValue={v("amount", options.left)}
            hint={t("orders.upTo", { amount: options.leftFormatted })}
            error={state.errors?.amount}
          />
          <div className="flex flex-col gap-1.5">
            <label htmlFor={f("reason")} className="text-sm font-semibold">
              {t("orders.reason")}
            </label>
            <select id={f("reason")} name="reason" defaultValue={v("reason", "buyer_request")} className="input">
              {REASONS.map(([value, text]) => (
                <option key={value} value={value}>
                  {t(text)}
                </option>
              ))}
            </select>
            <FieldError id={`${f("reason")}-error`} error={state.errors?.reason} />
          </div>
        </div>
        <Field
          id={f("note")}
          label={t("orders.note")}
          name="note"
          maxLength={300}
          defaultValue={v("note", "")}
          hint={options.byApi ? t("orders.sentWith", { provider: options.providerName }) : undefined}
        />
        {options.manual ? (
          <Field
            id={f("reference")}
            label={t("orders.reference", { provider: options.providerName })}
            name="reference"
            maxLength={191}
            defaultValue={v("reference", "")}
            hint={t("orders.referenceHint")}
          />
        ) : null}
        {takeBack.length ? (
          <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
            <legend className="mb-1.5 text-sm font-semibold">{t("orders.takeBack")}</legend>
            {takeBack.map(([name, item]) => (
              <label key={`${name}-${item.id}`} className="flex items-center gap-2 text-[15px]">
                <input type="checkbox" name={name} value={item.id} />
                {known(item.label)}
              </label>
            ))}
            <span className="text-xs text-muted">{t("orders.takeBackHint")}</span>
          </fieldset>
        ) : null}
        {options.marketplace ? (
          <p className="m-0 text-sm text-ink-4">{options.payoutReleased ? t("orders.marketplaceReleased") : t("orders.marketplace")}</p>
        ) : null}
        <p className="m-0 text-sm text-ink-4">{t("orders.emailNote")}</p>
        <SubmitButton variant="secondary" className="self-start" pendingText={t("orders.refunding")}>
          {method === "manual" && !options.byApi ? t("orders.record") : t("orders.refund")}
        </SubmitButton>
      </form>
    </details>
  );
}
