"use client";

import { useActionState, useState } from "react";
import { removeApnsKeyAction, saveApnsKeyAction } from "@/app/actions/apns";
import { useDashT } from "@/components/dashboard-i18n";
import { Field, FieldError, FormMessage, SubmitButton } from "@/components/form";
import { Icon } from "@/components/icon";
import { richText } from "@/i18n/rich";
import { initialFormState, type FormState } from "@/lib/forms";

/** The Key ID in Apple's file name, `AuthKey_<KEYID>.p8` (as lib/hosted/apns.ts reads it). */
function keyIdOfFile(name: string): string | null {
  const match = /^AuthKey_([A-Z0-9]{10})\.p8$/i.exec(name);
  return match ? match[1]!.toUpperCase() : null;
}

export type SavedApnsKey = { keyId: string; teamId: string } | null;

/**
 * 136.20 The APNs key fields: the .p8, its Key ID (from the file name when
 * it's Apple's) and the Team ID (the iOS build's when known). Inside the
 * setup's Publishing form, or in `ApnsKeyForm` on the Notifications page.
 */
export function ApnsKeyFields({ state, saved, buildTeamId, back }: { state: FormState; saved: SavedApnsKey; buildTeamId: string | null; back: "setup" | "notifications" }) {
  const t = useDashT();
  const [keyId, setKeyId] = useState(state.values?.apnsKeyId ?? "");
  const teamId = state.values?.apnsTeamId ?? saved?.teamId ?? buildTeamId ?? "";
  const fileError = state.errors?.apnsKeyFile;
  return (
    <fieldset className="m-0 flex flex-col gap-3.5 rounded-xl border border-line p-4">
      <legend className="px-1 text-[15px] font-bold">{t("apns.title")}</legend>
      <p className="m-0 flex gap-2 text-sm leading-relaxed text-ink-4">
        <Icon name="phone_iphone" size={20} className="shrink-0 text-muted" />
        <span>{t("apns.text")}</span>
      </p>
      {saved ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-success-bg px-4 py-3">
          <span className="flex min-w-0 items-center gap-2 text-[15px]">
            <Icon name="check_circle" size={20} filled className="shrink-0 text-success" />
            <span className="min-w-0 break-words">
              {richText(t("apns.saved", { keyId: saved.keyId, teamId: saved.teamId }), { b: (chunk) => <b dir="ltr">{chunk}</b> })}
            </span>
          </span>
          <button formAction={removeApnsKeyAction} name="back" value={back} formNoValidate className="cursor-pointer border-0 bg-transparent p-0 text-sm font-semibold text-danger hover:underline">
            {t("common.remove")}
          </button>
        </div>
      ) : null}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="f-apnsKeyFile" className="text-sm font-semibold">
          {saved ? t("apns.replaceKeyFile") : t("apns.keyFile")}
        </label>
        <input
          id="f-apnsKeyFile"
          name="apnsKeyFile"
          type="file"
          accept=".p8"
          onChange={(event) => {
            const fromName = keyIdOfFile(event.currentTarget.files?.[0]?.name ?? "");
            if (fromName) setKeyId(fromName);
          }}
          aria-invalid={fileError ? true : undefined}
          aria-describedby={`f-apnsKeyFile-hint${fileError ? " f-apnsKeyFile-error" : ""}`}
          className="block w-full min-w-0 rounded-[10px] border border-line-strong bg-white p-2 text-sm file:me-3 file:rounded-lg file:border-0 file:bg-ivory file:px-3 file:py-2 file:font-semibold file:text-midnight"
        />
        <span id="f-apnsKeyFile-hint" className="text-xs text-muted">
          {t("apns.keyFileHint")}
        </span>
        <FieldError id="f-apnsKeyFile-error" error={fileError} />
      </div>
      <div className="flex flex-wrap gap-3.5">
        <Field
          className="flex-[1_1_180px]"
          label={t("apns.keyId")}
          name="apnsKeyId"
          value={keyId}
          onChange={(event) => setKeyId(event.currentTarget.value.toUpperCase())}
          placeholder={saved?.keyId ?? "ABCDE12345"}
          maxLength={10}
          dir="ltr"
          autoComplete="off"
          hint={t("apns.keyIdHint")}
          error={state.errors?.apnsKeyId}
          small
        />
        <Field
          className="flex-[1_1_180px]"
          label={t("apns.teamId")}
          name="apnsTeamId"
          defaultValue={teamId}
          placeholder="ABCDE12345"
          maxLength={10}
          dir="ltr"
          autoComplete="off"
          hint={buildTeamId && teamId === buildTeamId ? t("apns.teamIdFromBuild") : t("apns.teamIdHint")}
          error={state.errors?.apnsTeamId}
          small
        />
      </div>
    </fieldset>
  );
}

/** 136.20 The Notifications page's own form: checks the key with Apple and saves it. */
export function ApnsKeyForm({ saved, buildTeamId }: { saved: SavedApnsKey; buildTeamId: string | null }) {
  const t = useDashT();
  const [state, action] = useActionState(saveApnsKeyAction, initialFormState);
  return (
    <form action={action} noValidate className="flex flex-col gap-3">
      <FormMessage message={state.message} ok={state.ok} />
      <ApnsKeyFields state={state} saved={saved} buildTeamId={buildTeamId} back="notifications" />
      <div className="flex justify-end">
        <SubmitButton variant="secondary" className="h-10" pendingText={t("apns.checking")}>
          {t("apns.save")}
        </SubmitButton>
      </div>
    </form>
  );
}
