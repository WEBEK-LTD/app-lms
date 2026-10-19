"use client";

import { useActionState } from "react";
import { refundDonationAction, refundOrderAction } from "@/app/actions/refunds";
import { Field, FieldError, FormMessage, SubmitButton } from "@/components/form";
import { initialFormState } from "@/lib/forms";

/** 47 The serializable part of RefundOptions (lib/refunds/service.ts) the form needs. */
export interface RefundFormOptions {
  providerName: string;
  /** What's left to refund, as the amount field takes it ("450.00") and formatted ("₺450.00"). */
  left: string;
  leftFormatted: string;
  currency: string;
  byApi: boolean;
  manual: boolean;
  marketplace: boolean;
  /** Released to the shop already (marketplace, Kashier or Fawaterk): the team takes it from the next transfer. */
  payoutReleased: boolean;
  revocable: {
    tickets: { id: number; label: string }[];
    courses: { id: number; label: string }[];
    memberships: { id: number; label: string }[];
  };
}

const REASONS: [string, string][] = [
  ["buyer_request", "The customer asked"],
  ["double_payment", "Paid twice"],
  ["fraud", "Fraud"],
  ["other", "Other"],
];

/** "Refund" under a paid order or donation: full or in part, through the provider or recorded. */
export function RefundForm({ kind, id, label, options }: { kind: "order" | "donation"; id: number; label: string; options: RefundFormOptions }) {
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
      <summary className="cursor-pointer text-[15px] font-semibold">Refund</summary>
      <form action={action} noValidate aria-label={`Refund ${label}`} className="mt-3 flex flex-col gap-4">
        <input type="hidden" name="id" value={id} />
        <FormMessage message={state.message} ok={state.ok} />
        {options.byApi && options.manual ? (
          <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
            <legend className="mb-1.5 text-sm font-semibold">How</legend>
            <label className="flex items-center gap-2 text-[15px]">
              <input type="radio" name="method" value="api" defaultChecked={method === "api"} />
              Refund it through {options.providerName} now
            </label>
            <label className="flex items-center gap-2 text-[15px]">
              <input type="radio" name="method" value="manual" defaultChecked={method === "manual"} />I refunded it in {options.providerName}&apos;s panel:
              record it
            </label>
            <FieldError id={`${f("method")}-error`} error={state.errors?.method} />
          </fieldset>
        ) : (
          <>
            <input type="hidden" name="method" value={options.byApi ? "api" : "manual"} />
            {options.byApi ? null : (
              <p className="m-0 text-sm text-ink-4">
                {options.providerName} refunds are made in {options.providerName}&apos;s panel. Refund it there, then record it here: the order, the app and the
                customer follow.
              </p>
            )}
            <FieldError id={`${f("method")}-error`} error={state.errors?.method} />
          </>
        )}
        <div className="grid gap-4 sm:grid-cols-[180px_1fr]">
          <Field
            id={f("amount")}
            label={`Amount (${options.currency})`}
            name="amount"
            inputMode="decimal"
            defaultValue={v("amount", options.left)}
            hint={`Up to ${options.leftFormatted}.`}
            error={state.errors?.amount}
          />
          <div className="flex flex-col gap-1.5">
            <label htmlFor={f("reason")} className="text-sm font-semibold">
              Reason
            </label>
            <select id={f("reason")} name="reason" defaultValue={v("reason", "buyer_request")} className="input">
              {REASONS.map(([value, text]) => (
                <option key={value} value={value}>
                  {text}
                </option>
              ))}
            </select>
            <FieldError id={`${f("reason")}-error`} error={state.errors?.reason} />
          </div>
        </div>
        <Field
          id={f("note")}
          label="Note (optional)"
          name="note"
          maxLength={300}
          defaultValue={v("note", "")}
          hint={options.byApi ? `Sent to ${options.providerName} with the refund.` : undefined}
        />
        {options.manual ? (
          <Field
            id={f("reference")}
            label={`${options.providerName}'s reference (optional)`}
            name="reference"
            maxLength={191}
            defaultValue={v("reference", "")}
            hint="When you record a refund made in the panel."
          />
        ) : null}
        {takeBack.length ? (
          <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
            <legend className="mb-1.5 text-sm font-semibold">With a refund in part, also take back</legend>
            {takeBack.map(([name, item]) => (
              <label key={`${name}-${item.id}`} className="flex items-center gap-2 text-[15px]">
                <input type="checkbox" name={name} value={item.id} />
                {item.label}
              </label>
            ))}
            <span className="text-xs text-muted">Refunding all of it takes everything back: tickets free their places, courses and memberships end.</span>
          </fieldset>
        ) : null}
        {options.marketplace ? (
          <p className="m-0 text-sm text-ink-4">
            Sold through Yallapp: the refund comes out of Yallapp&apos;s account, and Yallapp gives its commission back in proportion.
            {options.payoutReleased ? " Your share was already released, so Yallapp takes your share of the refund from your next transfer." : ""}
          </p>
        ) : null}
        <p className="m-0 text-sm text-ink-4">The customer gets an email, and the app shows what was refunded.</p>
        <SubmitButton variant="secondary" className="self-start" pendingText="Refunding…">
          {method === "manual" && !options.byApi ? "Record refund" : "Refund"}
        </SubmitButton>
      </form>
    </details>
  );
}
