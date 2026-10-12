"use client";

import { useActionState } from "react";
import { startBuildAction } from "@/app/actions/dashboard";
import { FormMessage, SubmitButton } from "@/components/form";
import { initialFormState } from "@/lib/forms";

export function StartBuildForm({ suggestedVersion, disabledReason }: { suggestedVersion: string; disabledReason: string | null }) {
  const [state, action] = useActionState(startBuildAction, initialFormState);
  const error = state.errors?.versionName;
  return (
    <form action={action} noValidate className="flex flex-col items-stretch gap-2 sm:items-end">
      <div className="flex flex-wrap items-end gap-2.5">
        <div className="flex flex-col gap-1">
          <label htmlFor="f-versionName" className="text-[13px] font-semibold text-muted">
            App version
          </label>
          <input
            id="f-versionName"
            name="versionName"
            defaultValue={state.values?.versionName ?? suggestedVersion}
            inputMode="decimal"
            pattern="\d+\.\d+\.\d+"
            className="input input-sm w-[110px]"
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? "f-versionName-error" : undefined}
          />
        </div>
        <SubmitButton className="h-[46px]" pendingText="Starting…">
          Start new build
        </SubmitButton>
      </div>
      {error ? (
        <span id="f-versionName-error" className="text-[13px] font-semibold text-danger">
          {error}
        </span>
      ) : null}
      {disabledReason && !state.message ? <span className="max-w-[360px] text-[13px] text-muted sm:text-right">{disabledReason}</span> : null}
      <div className="sm:max-w-[420px]">
        <FormMessage message={state.message} ok={state.ok} />
      </div>
    </form>
  );
}
