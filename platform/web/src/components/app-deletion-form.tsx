"use client";

import { useActionState } from "react";
import { deleteAppAction } from "@/app/actions/apps";
import { useDashT } from "./dashboard-i18n";
import { Field, FormMessage, PasswordField, SubmitButton } from "./form";
import { Icon } from "./icon";
import { initialFormState } from "@/lib/forms";

/** 73 "Delete this app": the app's name typed again and the owner's password. */
export function AppDeletionForm({ appId, name }: { appId: string; name: string }) {
  const t = useDashT();
  const [state, action] = useActionState(deleteAppAction, initialFormState);
  return (
    <form action={action} className="flex flex-col gap-4 border-t border-line-soft pt-4" noValidate>
      <input type="hidden" name="appId" value={appId} />
      <FormMessage message={state.message} ok={state.ok} />
      <Field
        label={t("apps.typeName", { app: name })}
        name="name"
        id="f-delete-app-name"
        autoComplete="off"
        required
        defaultValue={state.values?.name ?? ""}
        error={state.errors?.name}
      />
      <PasswordField
        label={t("apps.password")}
        name="password"
        autoComplete="current-password"
        error={state.errors?.password}
        showLabel={t("account.showPassword")}
        hideLabel={t("account.hidePassword")}
      />
      <SubmitButton variant="danger" pendingText={t("apps.deleting")} className="h-11 self-start px-5">
        <Icon name="delete" size={20} />
        {t("apps.submit")}
      </SubmitButton>
    </form>
  );
}
