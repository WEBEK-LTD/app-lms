"use client";

import { useActionState, useState } from "react";
import { createDiscountAction } from "@/app/actions/designer-discounts";
import { useDashLang, useDashT } from "@/components/dashboard-i18n";
import { FieldError, FormMessage, SubmitButton } from "@/components/form";
import { Icon } from "@/components/icon";
import { WasPrice } from "@/components/studio-market/parts";
import { initialFormState, type FormState } from "@/lib/forms";
import { discountedCents, reachesFloor } from "@/lib/studio-market/discounts";
import { formatUsd, ltr, readUsd } from "@/lib/studio-market/plans";

/**
 * 106.12 The designer's new price drop, flash sale or coupon code, each
 * opened from its section: an amount or a percentage off, the plans, the
 * start and the end in the designer's time zone, and for a code its letters
 * and usage limit; the plans' prices with it, never below $1, as they type.
 */

export interface DiscountPlan {
  period: string;
  name: string;
  cents: number;
}

type Kind = "drop" | "flash" | "coupon";

export function NewDiscount({ templateId, kind, plans, zone }: { templateId: string; kind: Kind; plans: DiscountPlan[]; zone: string }) {
  const t = useDashT();
  const [state, action] = useActionState(createDiscountAction, initialFormState);
  const [open, setOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  // React resets a form after each answer of its action: a key that changes with each answer draws the fields again from it.
  const [seen, setSeen] = useState(state);
  const [round, setRound] = useState(0);
  if (seen !== state) {
    setSeen(state);
    setRound((r) => r + 1);
    // Saved: the form closes and says so; the list above has the new one.
    if (state.ok) {
      setOpen(false);
      setNotice(state.message ?? null);
    }
  }
  const label = { drop: t("marketDiscounts.newDrop"), flash: t("marketDiscounts.newFlash"), coupon: t("marketDiscounts.newCoupon") }[kind];
  if (!open)
    return (
      <div className="flex flex-col gap-2">
        {notice ? <FormMessage message={notice} ok /> : null}
        <div>
          <button
            type="button"
            aria-expanded="false"
            onClick={() => {
              setNotice(null);
              setOpen(true);
            }}
            className="mk-btn mk-btn-ink mk-btn-sm"
          >
            <Icon name="add" size={20} />
            {label}
          </button>
        </div>
      </div>
    );
  return (
    <form action={action} aria-label={label} className="flex flex-col gap-4 rounded-[18px] border border-[var(--mk-hair)] bg-[var(--mk-mat)] p-4 sm:p-5">
      <input type="hidden" name="template" value={templateId} />
      <input type="hidden" name="kind" value={kind} />
      <DiscountFields key={round} kind={kind} plans={plans} zone={zone} state={state.ok ? initialFormState : state} onCancel={() => setOpen(false)} />
    </form>
  );
}

function DiscountFields({ kind, plans, zone, state, onCancel }: { kind: Kind; plans: DiscountPlan[]; zone: string; state: FormState; onCancel: () => void }) {
  const t = useDashT();
  const lang = useDashLang();
  const value = state.values;
  const [offType, setOffType] = useState<"percent" | "amount">(value?.offType === "amount" ? "amount" : "percent");
  const [percent, setPercent] = useState(value?.percent ?? "");
  const [amount, setAmount] = useState(value?.amount ?? "");
  const [all, setAll] = useState(value ? value.allPlans === "on" : true);
  const [chosen, setChosen] = useState<string[]>(value?.plans ? value.plans.split(",").filter(Boolean) : plans.map((p) => p.period));
  const id = (name: string) => `${kind}-${name}`;
  const errors = state.errors ?? {};

  // The prices with it, as typed.
  const off = offType === "percent" ? (/^\d{1,3}$/.test(percent.trim().replace(/%$/, "")) ? Number(percent.trim().replace(/%$/, "")) : null) : readUsd(amount);
  const shown = plans.filter((p) => all || chosen.includes(p.period));
  const usd = (cents: number) => ltr(formatUsd(cents), lang);

  return (
    <>
      <FormMessage message={state.message} />
      <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
        <legend className="mb-1 text-sm font-semibold">{t("marketDiscounts.offLabel")}</legend>
        <div className="flex flex-wrap gap-2">
          {(["percent", "amount"] as const).map((type) => (
            <label key={type} className={`flex cursor-pointer items-center gap-2 rounded-xl px-3.5 py-2.5 text-sm font-semibold ${offType === type ? "border-2 border-midnight bg-sand px-[13px] py-[9px]" : "border border-line bg-white"}`}>
              <input type="radio" name="offType" value={type} checked={offType === type} onChange={() => setOffType(type)} className="h-4 w-4 accent-[var(--color-midnight)]" />
              {t(type === "percent" ? "marketDiscounts.offPercentChoice" : "marketDiscounts.offAmountChoice")}
            </label>
          ))}
        </div>
        <FieldError id={id("offType-error")} error={errors.offType} />
      </fieldset>
      {offType === "percent" ? (
        <div className="flex flex-col gap-1.5">
          <label htmlFor={id("percent")} className="text-sm font-semibold">
            {t("marketDiscounts.percentLabel")}
          </label>
          <span className="relative w-[140px]">
            <input
              id={id("percent")}
              name="percent"
              inputMode="numeric"
              dir="ltr"
              value={percent}
              onChange={(e) => setPercent(e.target.value)}
              aria-invalid={errors.percent ? true : undefined}
              aria-describedby={errors.percent ? id("percent-error") : undefined}
              className="input h-10 w-full pe-8 text-end"
            />
            <span aria-hidden="true" className="pointer-events-none absolute end-3 top-1/2 -translate-y-1/2 text-sm text-muted">
              %
            </span>
          </span>
          <FieldError id={id("percent-error")} error={errors.percent} />
        </div>
      ) : (
        <div className="flex flex-col gap-1.5">
          <label htmlFor={id("amount")} className="text-sm font-semibold">
            {t("marketDiscounts.amountLabel")}
          </label>
          <span className="relative w-[140px]">
            <span aria-hidden="true" className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-sm text-muted">
              $
            </span>
            <input
              id={id("amount")}
              name="amount"
              inputMode="decimal"
              dir="ltr"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              aria-invalid={errors.amount ? true : undefined}
              aria-describedby={errors.amount ? id("amount-error") : undefined}
              className="input h-10 w-full ps-7 text-end"
            />
          </span>
          <FieldError id={id("amount-error")} error={errors.amount} />
        </div>
      )}
      <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
        <legend className="mb-1 text-sm font-semibold">{t("marketDiscounts.plansLabel")}</legend>
        <label className="flex cursor-pointer items-center gap-2.5 text-sm">
          <input type="checkbox" name="allPlans" checked={all} onChange={(e) => setAll(e.target.checked)} className="h-[18px] w-[18px] accent-[var(--color-midnight)]" />
          {t("marketDiscounts.allPlans")}
        </label>
        {all ? null : (
          <div className="flex flex-wrap gap-x-4 gap-y-2 ps-1">
            {plans.map((p) => (
              <label key={p.period} className="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  name="plan"
                  value={p.period}
                  checked={chosen.includes(p.period)}
                  onChange={(e) => setChosen((c) => (e.target.checked ? [...c, p.period] : c.filter((x) => x !== p.period)))}
                  className="h-[18px] w-[18px] accent-[var(--color-midnight)]"
                />
                {p.name}
              </label>
            ))}
          </div>
        )}
        <FieldError id={id("plans-error")} error={errors.plans} />
      </fieldset>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex min-w-0 flex-col gap-1.5">
          <label htmlFor={id("starts")} className="text-sm font-semibold">
            {t("marketDiscounts.startsLabel")}
          </label>
          <input id={id("starts")} name="startsAt" type="datetime-local" dir="ltr" defaultValue={value?.startsAt} aria-describedby={`${id("starts")}-hint`} aria-invalid={errors.startsAt ? true : undefined} className="input h-10" />
          <span id={`${id("starts")}-hint`} className="text-xs text-muted">
            {t("marketDiscounts.startsHint")}
          </span>
          <FieldError id={id("starts-error")} error={errors.startsAt} />
        </div>
        <div className="flex min-w-0 flex-col gap-1.5">
          <label htmlFor={id("ends")} className="text-sm font-semibold">
            {t("marketDiscounts.endsLabel")}
          </label>
          <input
            id={id("ends")}
            name="endsAt"
            type="datetime-local"
            dir="ltr"
            required={kind === "flash"}
            defaultValue={value?.endsAt}
            aria-describedby={kind === "flash" ? undefined : `${id("ends")}-hint`}
            aria-invalid={errors.endsAt ? true : undefined}
            className="input h-10"
          />
          {kind === "flash" ? null : (
            <span id={`${id("ends")}-hint`} className="text-xs text-muted">
              {t("marketDiscounts.endsHint")}
            </span>
          )}
          <FieldError id={id("ends-error")} error={errors.endsAt} />
        </div>
      </div>
      <span className="flex items-start gap-1.5 text-[13px] text-muted">
        <Icon name="schedule" size={16} />
        <span>{t("marketDiscounts.zoneNote", { zone })}</span>
      </span>
      {kind === "coupon" ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex min-w-0 flex-col gap-1.5">
            <label htmlFor={id("code")} className="text-sm font-semibold">
              {t("marketDiscounts.codeField")}
            </label>
            <input id={id("code")} name="code" dir="ltr" autoComplete="off" spellCheck={false} maxLength={40} defaultValue={value?.code} aria-describedby={`${id("code")}-hint`} aria-invalid={errors.code ? true : undefined} className="input h-10 uppercase" />
            <span id={`${id("code")}-hint`} className="text-xs text-muted">
              {t("marketDiscounts.codeHint")}
            </span>
            <FieldError id={id("code-error")} error={errors.code} />
          </div>
          <div className="flex min-w-0 flex-col gap-1.5">
            <label htmlFor={id("limit")} className="text-sm font-semibold">
              {t("marketDiscounts.limitLabel")}
            </label>
            <input id={id("limit")} name="limit" inputMode="numeric" dir="ltr" defaultValue={value?.limit} aria-describedby={`${id("limit")}-hint`} aria-invalid={errors.limit ? true : undefined} className="input h-10 w-[160px]" />
            <span id={`${id("limit")}-hint`} className="text-xs text-muted">
              {t("marketDiscounts.limitHint")}
            </span>
            <FieldError id={id("limit-error")} error={errors.limit} />
          </div>
        </div>
      ) : null}
      {off !== null && off > 0 && shown.length ? (
        <div className="flex flex-col gap-1.5 rounded-xl border border-[var(--mk-hair)] px-3.5 py-3" aria-live="polite">
          <span className="text-[13px] font-bold">{t("marketDiscounts.preview")}</span>
          <ul className="m-0 flex list-none flex-col gap-1 p-0 text-sm">
            {shown.map((p) => {
              const d = { offType, offValue: off } as const;
              const after = discountedCents(p.cents, d);
              return (
                <li key={p.period} data-preview={p.period} className="flex flex-wrap items-baseline gap-x-2">
                  <span className="min-w-[90px] text-muted">{p.name}</span>
                  <WasPrice text={usd(p.cents)} />
                  <b>{reachesFloor(p.cents, d) ? t("marketDiscounts.previewFloor", { price: usd(after) }) : usd(after)}</b>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
      <span className="flex items-start gap-1.5 text-[13px] text-muted">
        <Icon name="info" size={16} />
        <span>{t("marketDiscounts.floorDesigner")}</span>
      </span>
      <div className="flex flex-wrap gap-2.5">
        <SubmitButton className="h-10">{t("marketDiscounts.save")}</SubmitButton>
        <button type="button" onClick={onCancel} className="mk-btn mk-btn-ghost h-10 px-4 text-sm">
          {t("marketDiscounts.cancel")}
        </button>
      </div>
    </>
  );
}

/** A coupon's code, copied with a tap. */
export function CopyCode({ code }: { code: string }) {
  const t = useDashT();
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        void navigator.clipboard?.writeText(code).then(() => {
          setCopied(true);
          window.setTimeout(() => setCopied(false), 2000);
        });
      }}
      className="inline-flex h-7 cursor-pointer items-center gap-1 rounded-lg border border-line bg-white px-2 text-xs font-semibold text-midnight hover:border-midnight"
    >
      <Icon name={copied ? "check" : "content_copy"} size={15} />
      {copied ? t("marketDiscounts.copied") : t("marketDiscounts.copyCode")}
    </button>
  );
}
