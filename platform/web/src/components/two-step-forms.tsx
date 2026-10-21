"use client";

import { useActionState } from "react";
import { confirmTwoStepSetupAction, renewRecoveryCodesAction, turnOffTwoStepAction, type TwoStepState } from "@/app/actions/security";
import { Field, FormMessage, PasswordField, SubmitButton } from "@/components/form";

/**
 * 70 The forms of two-step sign-in (components/two-step-settings.tsx): the
 * first code that turns it on, new recovery codes, turning it off. The words
 * come from the page in the person's language (the admin's in English);
 * the actions' messages are translated by FormMessage and FieldError.
 */

export interface TwoStepLabels {
  code: string;
  turnOn: string;
  checking: string;
  recoveryTitle: string;
  recoveryText: string;
  recoveryDone: string;
  appCode: string;
  makeCodes: string;
  password: string;
  showPassword: string;
  hidePassword: string;
  turnOff: string;
}

const initial: TwoStepState = {};

/** The codes, shown once, with the way back to the page (a full load, so it shows where things stand). */
function RecoveryCodes({ codes, labels, doneHref }: { codes: string[]; labels: TwoStepLabels; doneHref: string }) {
  return (
    <section aria-labelledby="h-recovery" className="flex flex-col gap-3 rounded-xl border border-line bg-sand px-4 py-4">
      <h3 id="h-recovery" className="m-0 text-base font-bold">
        {labels.recoveryTitle}
      </h3>
      <p className="m-0 text-sm text-ink-3">{labels.recoveryText}</p>
      <ol dir="ltr" data-recovery-codes className="m-0 grid list-none grid-cols-2 gap-x-6 gap-y-1.5 p-0 font-mono text-[15px] sm:grid-cols-[repeat(2,max-content)]">
        {codes.map((code) => (
          <li key={code}>{code}</li>
        ))}
      </ol>
      <a href={doneHref} className="self-start text-sm font-bold">
        {labels.recoveryDone}
      </a>
    </section>
  );
}

/** Each form's own field ID: the page has several of these forms, and the account deletion's password. */
function CodeField({ id, label, error }: { id: string; label: string; error?: string }) {
  return <Field id={id} label={label} name="code" autoComplete="one-time-code" inputMode="text" autoCapitalize="off" spellCheck={false} maxLength={24} dir="ltr" required error={error} className="max-w-[240px]" />;
}

export function ConfirmTwoStepForm({ from, labels, doneHref }: { from: "admin" | "dashboard"; labels: TwoStepLabels; doneHref: string }) {
  const [state, action] = useActionState(confirmTwoStepSetupAction, initial);
  if (state.codes) {
    return (
      <div className="flex flex-col gap-3">
        <FormMessage ok message={state.message} />
        <RecoveryCodes codes={state.codes} labels={labels} doneHref={doneHref} />
      </div>
    );
  }
  return (
    <form action={action} noValidate className="flex flex-col gap-3">
      <input type="hidden" name="from" value={from} />
      <FormMessage message={state.message} />
      <CodeField id="two-step-confirm-code" label={labels.code} error={state.errors?.code} />
      <SubmitButton className="h-11 self-start px-5" pendingText={labels.checking}>
        {labels.turnOn}
      </SubmitButton>
    </form>
  );
}

export function RenewRecoveryCodesForm({ from, labels, doneHref }: { from: "admin" | "dashboard"; labels: TwoStepLabels; doneHref: string }) {
  const [state, action] = useActionState(renewRecoveryCodesAction, initial);
  if (state.codes) {
    return (
      <div className="flex flex-col gap-3">
        <FormMessage ok message={state.message} />
        <RecoveryCodes codes={state.codes} labels={labels} doneHref={doneHref} />
      </div>
    );
  }
  return (
    <form action={action} noValidate className="flex flex-col gap-3">
      <input type="hidden" name="from" value={from} />
      <FormMessage message={state.message} />
      <CodeField id="two-step-renew-code" label={labels.appCode} error={state.errors?.code} />
      <SubmitButton variant="secondary" className="h-11 self-start px-5" pendingText={labels.checking}>
        {labels.makeCodes}
      </SubmitButton>
    </form>
  );
}

export function TurnOffTwoStepForm({ from, labels }: { from: "admin" | "dashboard"; labels: TwoStepLabels }) {
  const [state, action] = useActionState(turnOffTwoStepAction, initial);
  return (
    <form action={action} noValidate className="flex max-w-[420px] flex-col gap-3">
      <input type="hidden" name="from" value={from} />
      <FormMessage message={state.message} />
      <PasswordField
        label={labels.password}
        name="currentPassword"
        autoComplete="current-password"
        error={state.errors?.currentPassword}
        showLabel={labels.showPassword}
        hideLabel={labels.hidePassword}
      />
      <CodeField id="two-step-off-code" label={labels.appCode} error={state.errors?.code} />
      <SubmitButton variant="danger" className="h-11 self-start px-5" pendingText={labels.checking}>
        {labels.turnOff}
      </SubmitButton>
    </form>
  );
}
