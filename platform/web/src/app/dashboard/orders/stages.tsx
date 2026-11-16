"use client";

import { useActionState } from "react";
import { setOrderStageAction } from "@/app/actions/catalog";
import { Field, FieldError, FormMessage, SubmitButton } from "@/components/form";
import { useDashT, useKnownText } from "@/components/dashboard-i18n";
import type { DashKey } from "@/i18n/dashboard";
import { initialFormState } from "@/lib/forms";

/** 132 What the Delivery forms need from the server: the order, where it may go next, the shop's slots. */
export interface StageFormProps {
  id: number;
  next: string[];
  slots: { id: string; label: string }[];
  /** The shop's today (YYYY-MM-DD), the first day a postponed delivery may take. */
  today: string;
}

const POSTPONE = ["customer_asked", "recipient_away", "shop_asked", "weather", "other"] as const;
const FAILED = ["recipient_away", "wrong_address", "refused", "unreachable", "other"] as const;
const NEXT = ["retry", "return", "cancel"] as const;

/** One stage's button: a form that opens with what the stage asks for. */
function StageForm({ stage, props }: { stage: string; props: StageFormProps }) {
  const t = useDashT();
  const known = useKnownText();
  const [state, action] = useActionState(setOrderStageAction, initialFormState);
  const f = (name: string) => `stage-${props.id}-${stage}-${name}`;
  const v = (name: string, fallback = "") => state.values?.[name] ?? fallback;
  const e = (name: string) => (state.errors?.[name] ? known(state.errors[name]) : undefined);
  const day = stage === "postponed" || stage === "failed";
  if (state.ok) return <FormMessage message={state.message} ok />;
  return (
    <details className="rounded-xl border border-line p-3" open={Boolean(state.message || state.errors)} data-stage-form={stage}>
      <summary className="cursor-pointer text-[15px] font-semibold">{t(`orders.do_${stage}` as DashKey)}</summary>
      <form action={action} noValidate className="mt-3 flex flex-col gap-3">
        <input type="hidden" name="id" value={props.id} />
        <input type="hidden" name="stage" value={stage} />
        <FormMessage message={state.message} ok={state.ok} />
        {stage === "shipped" ? (
          <div className="grid gap-3 sm:grid-cols-3">
            <Field id={f("courier_name")} label={t("orders.courierName")} name="courier_name" defaultValue={v("courier_name")} maxLength={80} small />
            <Field id={f("courier_phone")} label={t("orders.courierPhone")} name="courier_phone" type="tel" dir="ltr" defaultValue={v("courier_phone")} error={e("courier_phone")} maxLength={30} small />
            <Field id={f("tracking_url")} label={t("orders.trackingLink")} name="tracking_url" type="url" inputMode="url" dir="ltr" defaultValue={v("tracking_url")} error={e("tracking_url")} maxLength={500} small />
          </div>
        ) : null}
        {day ? (
          <div className="flex flex-col gap-1.5">
            <label htmlFor={f("reason")} className="text-sm font-semibold">
              {t("orders.stageReason")}
            </label>
            <select id={f("reason")} name="reason" defaultValue={v("reason")} className="input" aria-describedby={`${f("reason")}-error`}>
              <option value="" />
              {(stage === "postponed" ? POSTPONE : FAILED).map((r) => (
                <option key={r} value={r}>
                  {t(`orders.reason_${r}` as DashKey)}
                </option>
              ))}
            </select>
            <FieldError id={`${f("reason")}-error`} error={e("reason")} />
          </div>
        ) : null}
        {stage === "failed" ? (
          <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
            <legend className="mb-1 text-sm font-semibold">{t("orders.stageNext")}</legend>
            {NEXT.map((n) => (
              <label key={n} className="flex items-center gap-2 text-[15px]">
                <input type="radio" name="next_step" value={n} defaultChecked={v("next_step") === n} />
                {t(`orders.next_${n}` as DashKey)}
              </label>
            ))}
            <FieldError id={`${f("next_step")}-error`} error={e("next_step")} />
            <p className="m-0 text-xs text-ink-4">{t("orders.stageCancelHint")}</p>
          </fieldset>
        ) : null}
        {day ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <Field id={f("date")} label={t("orders.stageNewDay")} name="date" type="date" min={props.today} defaultValue={v("date")} error={e("date")} small />
            {props.slots.length ? (
              <div className="flex flex-col gap-1.5">
                <label htmlFor={f("slot_id")} className="text-sm font-semibold">
                  {t("orders.stageSlot")}
                </label>
                <select id={f("slot_id")} name="slot_id" defaultValue={v("slot_id")} className="input" dir="ltr">
                  <option value="">{t("orders.stageSlotAny")}</option>
                  {props.slots.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.label}
                    </option>
                  ))}
                </select>
                <FieldError id={`${f("slot_id")}-error`} error={e("slot_id")} />
              </div>
            ) : null}
          </div>
        ) : null}
        {stage !== "delivered" ? (
          <div className="flex flex-col gap-1.5">
            <label htmlFor={f("note")} className="text-sm font-semibold">
              {t("orders.stageNote")}
            </label>
            <textarea id={f("note")} name="note" rows={2} maxLength={500} className="input" defaultValue={v("note")} dir="auto" />
            <FieldError id={`${f("note")}-error`} error={e("note")} />
          </div>
        ) : (
          <p className="m-0 text-sm text-ink-4">{t("orders.stageDeliverHint")}</p>
        )}
        <div>
          <SubmitButton variant={stage === "delivered" ? "primary" : "secondary"} className="h-9 px-3 text-sm">
            {stage === "delivered" ? t("orders.do_delivered") : t("orders.stageSave")}
          </SubmitButton>
        </div>
      </form>
    </details>
  );
}

/** 132 The Delivery section's buttons, one per stage the order may go to next. */
export function StageForms(props: StageFormProps) {
  if (props.next.length === 0) return null;
  return (
    <div className="flex flex-col gap-2" data-stage-forms={props.id}>
      {props.next.map((stage) => (
        <StageForm key={stage} stage={stage} props={props} />
      ))}
    </div>
  );
}
