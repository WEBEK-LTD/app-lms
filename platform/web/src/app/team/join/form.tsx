"use client";

import { useActionState } from "react";
import { joinTeamAction } from "@/app/actions/team";
import { Field, FormMessage, PasswordField, SubmitButton } from "@/components/form";
import { initialFormState } from "@/lib/forms";

/** 60 The form on an invitation's page: a new account's name and password, or an existing account's password. */
export function JoinForm({
  token,
  existing,
  words,
}: {
  token: string;
  existing: boolean;
  words: { yourName: string; password: string; confirm: string; submit: string; show: string; hide: string; pending: string; forgot: React.ReactNode };
}) {
  const [state, action] = useActionState(joinTeamAction, initialFormState);
  return (
    <form action={action} noValidate className="flex flex-col gap-4">
      <input type="hidden" name="token" value={token} />
      <FormMessage message={state.message} ok={state.ok} />
      {existing ? (
        <PasswordField label={words.password} name="password" autoComplete="current-password" error={state.errors?.password} aside={words.forgot} showLabel={words.show} hideLabel={words.hide} />
      ) : (
        <>
          <Field label={words.yourName} name="name" required maxLength={120} autoComplete="name" defaultValue={state.values?.name} error={state.errors?.name} />
          <PasswordField label={words.password} name="password" autoComplete="new-password" error={state.errors?.password} showLabel={words.show} hideLabel={words.hide} />
          <PasswordField label={words.confirm} name="confirm" autoComplete="new-password" error={state.errors?.confirm} showLabel={words.show} hideLabel={words.hide} />
        </>
      )}
      <SubmitButton className="h-[50px] w-full" pendingText={words.pending}>
        {words.submit}
      </SubmitButton>
    </form>
  );
}
