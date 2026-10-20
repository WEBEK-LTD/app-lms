"use client";

import { useActionState } from "react";
import { requestAccountDeletionAction } from "@/app/actions/account";
import { useDashT } from "./dashboard-i18n";
import { Field, FieldError, FormMessage, PasswordField, SubmitButton } from "./form";
import { Icon } from "./icon";
import { initialFormState } from "@/lib/forms";

/** 66 The owner's request to delete their Yallapp account: their email typed again, their password and an optional reason. */
export function AccountDeletionForm({ from, email }: { from: "account" | "pending"; email: string }) {
  const t = useDashT();
  const [state, action] = useActionState(requestAccountDeletionAction, initialFormState);
  return (
    <form action={action} className="flex flex-col gap-4 border-t border-line-soft pt-4" noValidate>
      <input type="hidden" name="from" value={from} />
      <FormMessage message={state.message} ok={state.ok} />
      <Field
        label={t("account.confirmEmail")}
        name="confirmEmail"
        type="email"
        autoComplete="off"
        dir="ltr"
        required
        placeholder={email}
        defaultValue={state.values?.confirmEmail ?? ""}
        error={state.errors?.confirmEmail}
      />
      <PasswordField label={t("account.password")} name="password" autoComplete="current-password" error={state.errors?.password} showLabel={t("account.showPassword")} hideLabel={t("account.hidePassword")} />
      <div className="flex flex-col gap-1.5">
        <label htmlFor="f-reason" className="text-sm font-semibold">
          {t("account.reason")}
        </label>
        <textarea
          id="f-reason"
          name="reason"
          rows={3}
          maxLength={1000}
          className="input min-h-[88px] py-2.5"
          defaultValue={state.values?.reason ?? ""}
          aria-describedby={state.errors?.reason ? "f-reason-hint f-reason-error" : "f-reason-hint"}
        />
        <span id="f-reason-hint" className="text-xs text-muted">
          {t("account.reasonHint")}
        </span>
        <FieldError id="f-reason-error" error={state.errors?.reason} />
      </div>
      <SubmitButton variant="danger" pendingText={t("account.sending")} className="h-11 self-start px-5">
        <Icon name="delete" size={20} />
        {t("account.submit")}
      </SubmitButton>
    </form>
  );
}
