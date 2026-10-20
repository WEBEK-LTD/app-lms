"use client";

import { useActionState } from "react";
import { freezeMembershipAction } from "@/app/actions/members";
import { Field, FormMessage, SubmitButton } from "@/components/form";
import { useDashT } from "@/components/dashboard-i18n";
import { initialFormState } from "@/lib/forms";

/** 64 Freezes a membership from a day, until the day it's back or until unfrozen. */
export function FreezeForm({ id, today, latest }: { id: number; today: string; latest: string }) {
  const t = useDashT();
  const [state, action] = useActionState(freezeMembershipAction, initialFormState);
  const v = state.values ?? {};
  const e = state.errors ?? {};
  return (
    <form action={action} noValidate className="flex flex-col gap-3 pt-3" data-testid={`freeze-${id}`}>
      <FormMessage message={state.message} ok={state.ok} />
      <input type="hidden" name="id" value={id} />
      <div className="grid gap-3 sm:grid-cols-2">
        <Field id={`freeze-${id}-from`} label={t("freeze.from")} name="from" type="date" min={today} max={latest} defaultValue={v.from ?? today} error={e.from} small required />
        <Field id={`freeze-${id}-until`} label={t("freeze.until")} name="until" type="date" min={today} defaultValue={v.until ?? ""} error={e.until} small />
      </div>
      <p className="m-0 text-[13px] text-muted">{t("freeze.hint")}</p>
      <div className="flex justify-end">
        <SubmitButton variant="secondary" className="h-9 px-3 text-sm" pendingText={t("common.saving")}>
          {t("freeze.submit")}
        </SubmitButton>
      </div>
    </form>
  );
}
