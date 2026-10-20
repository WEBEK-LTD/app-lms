"use client";

import { useActionState } from "react";
import { addMembershipCreditsAction, giveMembershipAction, saveMembershipPlanAction, saveMembershipRulesAction } from "@/app/actions/classes";
import { Field, FieldError, FormMessage, SubmitButton } from "@/components/form";
import { initialFormState } from "@/lib/forms";
import { useDashT, useKnownText } from "@/components/dashboard-i18n";
import { richText } from "@/i18n/rich";
import type { DashKey } from "@/i18n/dashboard";

const PERIODS: { value: string; label: DashKey }[] = [
  { value: "month", label: "bookings.known.monthly" },
  { value: "quarter", label: "bookings.known.quarterly" },
  { value: "year", label: "bookings.known.yearly" },
  { value: "pack", label: "bookings.known.pack" },
];

/** 27 "Classes need a membership". */
export function MembershipRulesForm({ required }: { required: boolean }) {
  const t = useDashT();
  const [state, action] = useActionState(saveMembershipRulesAction, initialFormState);
  const checked = state.values ? state.values.membershipRequired === "on" : required;
  return (
    <form action={action} noValidate className="flex flex-col gap-3" key={String(checked)}>
      <FormMessage message={state.message} ok={state.ok} />
      <label className="flex cursor-pointer items-start gap-2 text-[15px]">
        <input type="checkbox" name="membershipRequired" defaultChecked={checked} className="mt-1 h-4 w-4 accent-midnight" />
        <span>{richText(t("bookings.requiredRule"), { b: (chunk) => <b>{chunk}</b> })}</span>
      </label>
      <div className="flex justify-end">
        <SubmitButton className="h-10" pendingText={t("common.saving")}>
          {t("common.save")}
        </SubmitButton>
      </div>
    </form>
  );
}

/** 27 A membership plan: name, price, how long it lasts, how many classes (empty: unlimited) and a few words. */
export function MembershipPlanForm({ current, submit, currency }: { current: Record<string, string>; submit: string; currency: string }) {
  const t = useDashT();
  const [state, action] = useActionState(saveMembershipPlanAction, initialFormState);
  const v = state.values ?? current;
  const e = state.errors ?? {};
  const key = current.id ?? "new";
  return (
    <form action={action} noValidate className="flex flex-col gap-4" key={current.id || !state.ok ? JSON.stringify(v) : state.message}>
      <FormMessage message={state.message} ok={state.ok} />
      <input type="hidden" name="id" value={current.id ?? ""} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id={`plan-${key}-name`} label={t("bookings.planName")} name="name" defaultValue={v.name} error={e.name} small />
        <Field id={`plan-${key}-price`} label={t("bookings.priceIn", { currency })} name="price" inputMode="decimal" defaultValue={v.price} error={e.price} small />
        <div className="flex min-w-0 flex-col gap-1.5">
          <label htmlFor={`plan-${key}-period`} className="text-sm font-semibold">
            {t("bookings.lasts")}
          </label>
          <select id={`plan-${key}-period`} name="period" defaultValue={v.period ?? "month"} className="input input-sm">
            {PERIODS.map((p) => (
              <option key={p.value} value={p.value}>
                {t(p.label)}
              </option>
            ))}
          </select>
          <FieldError id={`plan-${key}-period-error`} error={e.period} />
        </div>
        <Field
          id={`plan-${key}-credits`}
          label={t("bookings.classesIncluded")}
          name="credits"
          inputMode="numeric"
          defaultValue={v.credits}
          hint={t("bookings.unlimitedHint")}
          error={e.credits}
          small
        />
      </div>
      <div className="flex min-w-0 flex-col gap-1.5">
        <label htmlFor={`plan-${key}-description`} className="text-sm font-semibold">
          {t("bookings.descriptionOptional")}
        </label>
        <textarea id={`plan-${key}-description`} name="description" rows={2} defaultValue={v.description} className="input min-h-[64px] py-2.5" />
        <FieldError id={`plan-${key}-description-error`} error={e.description} />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <label className="flex cursor-pointer items-center gap-2 text-[15px]">
          <input type="checkbox" name="active" defaultChecked={v.active !== ""} className="h-4 w-4 accent-midnight" />
          {t("bookings.onSale")}
        </label>
        <SubmitButton className="h-10" pendingText={t("common.saving")}>
          {submit}
        </SubmitButton>
      </div>
    </form>
  );
}

/** 27 Gives a member a membership they paid for another way. */
export function GiveMembershipForm({ plans }: { plans: { id: number; name: string }[] }) {
  const t = useDashT();
  const [state, action] = useActionState(giveMembershipAction, initialFormState);
  const v = state.ok ? {} : (state.values ?? {});
  const e = state.errors ?? {};
  return (
    <form action={action} noValidate className="flex flex-col gap-3" key={state.ok ? state.message : JSON.stringify(v)}>
      <FormMessage message={state.message} ok={state.ok} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="give-who" label={t("bookings.whoField")} name="who" defaultValue={v.who} hint={t("bookings.whoHint")} error={e.who} small />
        <div className="flex min-w-0 flex-col gap-1.5">
          <label htmlFor="give-plan" className="text-sm font-semibold">
            {t("bookings.plan")}
          </label>
          <select id="give-plan" name="planId" defaultValue={v.planId ?? String(plans[0]?.id ?? "")} className="input input-sm">
            {plans.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <FieldError id="give-plan-error" error={e.planId} />
        </div>
      </div>
      <div className="flex justify-end">
        <SubmitButton className="h-10" pendingText={t("common.adding")}>
          {t("bookings.addMembershipButton")}
        </SubmitButton>
      </div>
    </form>
  );
}

/** 27 Adds classes to one membership (or takes some away). */
export function CreditsForm({ id, name }: { id: number; name: string }) {
  const t = useDashT();
  const known = useKnownText();
  const [state, action] = useActionState(addMembershipCreditsAction, initialFormState);
  return (
    <form action={action} noValidate className="flex flex-wrap items-end gap-2" key={state.ok ? state.message : "form"}>
      <input type="hidden" name="id" value={id} />
      <Field
        id={`credits-${id}`}
        label={richText(t("bookings.addClasses", { name }), { sr: (chunk) => <span className="sr-only">{chunk}</span> })}
        name="credits"
        inputMode="numeric"
        defaultValue={state.ok ? "" : state.values?.credits}
        error={state.errors?.credits}
        className="w-[140px]"
        small
      />
      <SubmitButton variant="secondary" className="h-11 px-3">
        {t("common.add")}
      </SubmitButton>
      {state.message ? <span className={`basis-full text-sm ${state.ok ? "text-success" : "text-danger"}`}>{known(state.message)}</span> : null}
    </form>
  );
}
