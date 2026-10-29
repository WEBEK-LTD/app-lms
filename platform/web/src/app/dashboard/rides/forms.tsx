"use client";

import { useActionState } from "react";
import { assignRideAction, cancelRideAction } from "@/app/actions/rides";
import { FieldError, FormMessage, SubmitButton } from "@/components/form";
import { useDashT } from "@/components/dashboard-i18n";
import { initialFormState } from "@/lib/forms";

/** 105.2 Giving a ride to a driver. */
export function GiveRideForm({ rideId, drivers, current }: { rideId: number; drivers: { id: number; label: string }[]; current: number | null }) {
  const t = useDashT();
  const [state, action] = useActionState(assignRideAction, initialFormState);
  return (
    <form action={action} noValidate className="flex flex-col gap-3">
      <FormMessage message={state.message} ok={state.ok} />
      <input type="hidden" name="id" value={rideId} />
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex min-w-[220px] flex-1 flex-col gap-1.5">
          <label htmlFor="f-driverId" className="text-sm font-semibold">
            {t("rides.chooseDriver")}
          </label>
          <select id="f-driverId" name="driverId" defaultValue={current ? String(current) : ""} className="input" aria-describedby="f-driverId-error">
            <option value="" disabled>
              —
            </option>
            {drivers.map((d) => (
              <option key={d.id} value={d.id}>
                {d.label}
              </option>
            ))}
          </select>
        </div>
        <SubmitButton className="h-11" pendingText={t("common.saving")}>
          {t("rides.give")}
        </SubmitButton>
      </div>
      <FieldError id="f-driverId-error" error={state.errors?.driverId} />
    </form>
  );
}

/** 105.2 The company cancels a ride that isn't over. */
export function CancelRideForm({ rideId, reference }: { rideId: number; reference: string }) {
  const t = useDashT();
  const [state, action] = useActionState(cancelRideAction, initialFormState);
  return (
    <form
      action={action}
      noValidate
      className="flex flex-col gap-3"
      onSubmit={(e) => {
        if (!window.confirm(t("rides.cancelConfirm", { reference }))) e.preventDefault();
      }}
    >
      <FormMessage message={state.message} ok={state.ok} />
      <input type="hidden" name="id" value={rideId} />
      <div className="flex flex-col gap-1.5">
        <label htmlFor="f-note" className="text-sm font-semibold">
          {t("rides.cancelNote")}
        </label>
        <input id="f-note" name="note" maxLength={300} className="input" />
      </div>
      <div className="flex justify-end">
        <SubmitButton variant="danger" className="h-10" pendingText={t("common.saving")}>
          {t("rides.cancelRide")}
        </SubmitButton>
      </div>
    </form>
  );
}
