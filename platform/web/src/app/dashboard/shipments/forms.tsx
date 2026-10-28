"use client";

import { useActionState } from "react";
import { assignShipmentAction, moveShipmentAction } from "@/app/actions/delivery";
import { FieldError, FormMessage, SubmitButton } from "@/components/form";
import { useDashT } from "@/components/dashboard-i18n";
import { initialFormState } from "@/lib/forms";

/** 104 Giving a shipment to a courier. */
export function AssignForm({ shipmentId, couriers, current }: { shipmentId: number; couriers: { id: number; label: string }[]; current: number | null }) {
  const t = useDashT();
  const [state, action] = useActionState(assignShipmentAction, initialFormState);
  return (
    <form action={action} noValidate className="flex flex-col gap-3">
      <FormMessage message={state.message} ok={state.ok} />
      <input type="hidden" name="id" value={shipmentId} />
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex min-w-[220px] flex-1 flex-col gap-1.5">
          <label htmlFor="f-courierId" className="text-sm font-semibold">
            {t("delivery.chooseCourier")}
          </label>
          <select id="f-courierId" name="courierId" defaultValue={current ? String(current) : ""} className="input" aria-describedby="f-courierId-error">
            <option value="" disabled>
              —
            </option>
            {couriers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
        <SubmitButton className="h-11" pendingText={t("common.saving")}>
          {t("delivery.give")}
        </SubmitButton>
      </div>
      <FieldError id="f-courierId-error" error={state.errors?.courierId} />
    </form>
  );
}

/** 104 Moving a shipment to another stage for its courier. */
export function MoveForm({ shipmentId, steps }: { shipmentId: number; steps: { value: string; label: string }[] }) {
  const t = useDashT();
  const [state, action] = useActionState(moveShipmentAction, initialFormState);
  return (
    <form action={action} noValidate className="flex flex-col gap-3">
      <FormMessage message={state.message} ok={state.ok} />
      <input type="hidden" name="id" value={shipmentId} />
      <div className="flex flex-col gap-1.5">
        <label htmlFor="f-status" className="text-sm font-semibold">
          {t("delivery.stage")}
        </label>
        <select id="f-status" name="status" defaultValue={steps[0]?.value} className="input max-w-[320px]">
          {steps.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="f-note" className="text-sm font-semibold">
          {t("delivery.note")}
        </label>
        <input id="f-note" name="note" maxLength={300} className="input" aria-describedby="f-note-hint" />
        <span id="f-note-hint" className="text-[13px] text-muted">
          {t("delivery.noteHint")}
        </span>
      </div>
      <div className="flex justify-end">
        <SubmitButton variant="secondary" className="h-10" pendingText={t("common.saving")}>
          {t("delivery.save")}
        </SubmitButton>
      </div>
    </form>
  );
}
