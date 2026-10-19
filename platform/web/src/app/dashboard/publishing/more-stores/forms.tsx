"use client";

import Link from "next/link";
import { useActionState, type ReactNode } from "react";
import { removeMoreStoreKeyAction, saveGalaxyStoreAction, saveHuaweiAction, saveXiaomiAction } from "@/app/actions/more-stores";
import { Field, FieldError, FormMessage, SubmitButton } from "@/components/form";
import { Icon } from "@/components/icon";
import { initialFormState, type FormState } from "@/lib/forms";

/** 35, 36, 42 The forms of the "More Android stores" page. */

const v = (state: FormState, key: string) => state.values?.[key] ?? "";

function Saved({ title, detail, removeKey }: { title: string; detail: string; removeKey: string }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-success-bg px-4 py-3">
      <span className="flex min-w-0 items-center gap-2 text-[15px]">
        <Icon name="check_circle" size={20} filled className="text-success" />
        <span className="min-w-0 break-words">
          <b>{title} saved</b> · {detail}
        </span>
      </span>
      <button formAction={removeMoreStoreKeyAction} name="key" value={removeKey} formNoValidate className="cursor-pointer border-0 bg-transparent p-0 text-sm font-semibold text-danger hover:underline">
        Remove
      </button>
    </div>
  );
}

function FileField({ name, label, accept, hint, error }: { name: string; label: string; accept: string; hint: ReactNode; error?: string }) {
  const id = `f-${name}`;
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-semibold">
        {label}
      </label>
      <input
        id={id}
        name={name}
        type="file"
        accept={accept}
        aria-invalid={error ? true : undefined}
        aria-describedby={`${id}-hint${error ? ` ${id}-error` : ""}`}
        className="block w-full min-w-0 rounded-[10px] border border-line-strong bg-white p-2 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-ivory file:px-3 file:py-2 file:font-semibold file:text-midnight"
      />
      <span id={`${id}-hint`} className="text-xs text-muted">
        {hint}
      </span>
      <FieldError id={`${id}-error`} error={error} />
    </div>
  );
}

export function GalaxyStoreForm({ saved, uploads }: { saved: { contentId: string; serviceAccountId: string } | null; uploads: boolean }) {
  const [state, action] = useActionState(saveGalaxyStoreAction, initialFormState);
  const e = state.errors ?? {};
  return (
    <form action={action} noValidate className="flex flex-col gap-3.5">
      <FormMessage message={state.message} ok={state.ok} />
      {saved ? <Saved title="Galaxy Store keys" detail={`Content ID ${saved.contentId}`} removeKey="galaxy" /> : null}
      <fieldset disabled={!uploads} className="m-0 flex flex-col gap-3.5 border-0 p-0">
        <div className="flex flex-wrap gap-3.5">
          <Field
            className="flex-[1_1_200px]"
            label="Content ID"
            name="galaxyContentId"
            inputMode="numeric"
            autoComplete="off"
            defaultValue={v(state, "galaxyContentId")}
            placeholder={saved?.contentId ?? "000001234567"}
            hint="Seller Portal › Applications: the number shown with your app."
            error={e.galaxyContentId}
            small
          />
          <Field
            className="flex-[1_1_240px]"
            label="Service account ID"
            name="galaxyServiceAccountId"
            autoComplete="off"
            defaultValue={v(state, "galaxyServiceAccountId")}
            placeholder={saved?.serviceAccountId ?? ""}
            hint="Seller Portal › Assistance › API Service."
            error={e.galaxyServiceAccountId}
            small
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="f-galaxyPrivateKey" className="text-sm font-semibold">
            {saved ? "Replace the private key" : "Private key"}
          </label>
          <textarea
            id="f-galaxyPrivateKey"
            name="galaxyPrivateKey"
            rows={4}
            spellCheck={false}
            autoComplete="off"
            placeholder="-----BEGIN PRIVATE KEY-----"
            className="input font-mono text-xs"
            aria-invalid={e.galaxyPrivateKey ? true : undefined}
            aria-describedby={`f-galaxyPrivateKey-hint${e.galaxyPrivateKey ? " f-galaxyPrivateKey-error" : ""}`}
          />
          <span id="f-galaxyPrivateKey-hint" className="text-xs text-muted">
            Paste the key Seller Portal shows when you create the service account, or upload its file below.
          </span>
          <FieldError id="f-galaxyPrivateKey-error" error={e.galaxyPrivateKey} />
        </div>
        <FileField name="galaxyPrivateKeyFile" label="Or the private key file" accept=".pem,.key,.txt" hint="The file Seller Portal gave you." />
        <div>
          <SubmitButton className="h-10">Save Galaxy Store keys</SubmitButton>
        </div>
      </fieldset>
    </form>
  );
}

export function HuaweiForm({
  saved,
  uploads,
}: {
  saved: { appId: string | null; agconnect: boolean; push: boolean; clientId: string | null };
  uploads: boolean;
}) {
  const [state, action] = useActionState(saveHuaweiAction, initialFormState);
  const e = state.errors ?? {};
  return (
    <form action={action} noValidate className="flex flex-col gap-4">
      <FormMessage message={state.message} ok={state.ok} />
      <Field
        label="App ID"
        name="huaweiAppId"
        inputMode="numeric"
        autoComplete="off"
        defaultValue={v(state, "huaweiAppId")}
        placeholder={saved.appId ?? "104123456"}
        hint="AppGallery Connect › Project settings › App information. Taken from agconnect-services.json when you leave it empty."
        error={e.huaweiAppId}
        small
      />

      <fieldset className="m-0 flex flex-col gap-3.5 rounded-xl border border-line p-4">
        <legend className="px-1 text-[15px] font-bold">
          Push notifications on Huawei phones <span className="font-normal text-muted">(optional)</span>
        </legend>
        <p className="m-0 text-sm leading-relaxed text-ink-4">
          Huawei phones without Google Play get notifications through Huawei Push Kit. Turn on Push Kit for your app in AppGallery Connect, then add these.
        </p>
        {saved.agconnect ? <Saved title="agconnect-services.json" detail="Huawei push in the next build" removeKey="huawei-agconnect" /> : null}
        <FileField
          name="huaweiAgconnectFile"
          label={saved.agconnect ? "Replace agconnect-services.json" : "agconnect-services.json"}
          accept="application/json,.json"
          hint="AppGallery Connect › Project settings › App information."
          error={e.huaweiAgconnectFile}
        />
        {saved.push ? <Saved title="App secret" detail="Push Kit" removeKey="huawei-push" /> : null}
        <Field
          label={saved.push ? "Replace the app secret" : "App secret"}
          name="huaweiPushSecret"
          type="password"
          autoComplete="off"
          hint="AppGallery Connect › Project settings › App information. We send notifications with it."
          error={e.huaweiPushSecret}
          small
        />
      </fieldset>

      <fieldset disabled={!uploads} className="m-0 flex flex-col gap-3.5 rounded-xl border border-line p-4">
        <legend className="px-1 text-[15px] font-bold">Uploading builds</legend>
        {saved.clientId ? <Saved title="API client" detail={`Client ID ${saved.clientId}`} removeKey="huawei-upload" /> : null}
        <div className="flex flex-wrap gap-3.5">
          <Field
            className="flex-[1_1_220px]"
            label="Client ID"
            name="huaweiClientId"
            autoComplete="off"
            defaultValue={v(state, "huaweiClientId")}
            placeholder={saved.clientId ?? ""}
            hint="Users and permissions › API key › Connect API, with the App administrator role."
            error={e.huaweiClientId}
            small
          />
          <Field
            className="flex-[1_1_220px]"
            label={saved.clientId ? "Replace the key" : "Key"}
            name="huaweiClientSecret"
            type="password"
            autoComplete="off"
            hint="Shown next to the API client."
            error={e.huaweiClientSecret}
            small
          />
        </div>
      </fieldset>

      <div className="flex flex-wrap items-center gap-3">
        <SubmitButton className="h-10">Save Huawei settings</SubmitButton>
        <Link href="/docs/huawei-appgallery" className="text-sm font-semibold">
          How to set up AppGallery
        </Link>
      </div>
    </form>
  );
}

/** 42 Xiaomi GetApps: the developer account's email, the API private key, Xiaomi's public certificate and what's new. */
export function XiaomiForm({
  saved,
  uploads,
  notes,
}: {
  saved: { userName: string } | null;
  uploads: boolean;
  notes: { current: string; fallback: string; max: number };
}) {
  const [state, action] = useActionState(saveXiaomiAction, initialFormState);
  const e = state.errors ?? {};
  return (
    <form action={action} noValidate className="flex flex-col gap-3.5">
      <FormMessage message={state.message} ok={state.ok} />
      {saved ? <Saved title="Xiaomi GetApps keys" detail={saved.userName} removeKey="xiaomi" /> : null}
      <fieldset disabled={!uploads} className="m-0 flex flex-col gap-3.5 border-0 p-0">
        <div className="flex flex-wrap gap-3.5">
          <Field
            className="flex-[1_1_240px]"
            label="Developer account email"
            name="xiaomiUserName"
            type="email"
            autoComplete="off"
            defaultValue={v(state, "xiaomiUserName")}
            placeholder={saved?.userName ?? "you@example.com"}
            hint="The email you sign in to the Xiaomi developer platform with."
            error={e.xiaomiUserName}
            small
          />
          <Field
            className="flex-[1_1_240px]"
            label={saved ? "Replace the API private key" : "API private key"}
            name="xiaomiPassword"
            type="password"
            autoComplete="off"
            hint="From the automatic publishing page. It isn't your sign-in password."
            error={e.xiaomiPassword}
            small
          />
        </div>
        <FileField
          name="xiaomiCertificateFile"
          label={saved ? "Replace the public certificate" : "Public certificate"}
          accept=".cer,.crt,.pem"
          hint="The certificate file you download from the same page."
          error={e.xiaomiCertificateFile}
        />
        <div className="flex flex-col gap-1.5">
          <label htmlFor="f-xiaomiReleaseNotes" className="text-sm font-semibold">
            What&apos;s new <span className="font-normal text-muted">(optional)</span>
          </label>
          <textarea
            id="f-xiaomiReleaseNotes"
            name="xiaomiReleaseNotes"
            rows={3}
            maxLength={notes.max}
            defaultValue={state.values?.xiaomiReleaseNotes ?? notes.current}
            placeholder={notes.fallback}
            className="input text-sm"
            aria-invalid={e.xiaomiReleaseNotes ? true : undefined}
            aria-describedby={`f-xiaomiReleaseNotes-hint${e.xiaomiReleaseNotes ? " f-xiaomiReleaseNotes-error" : ""}`}
          />
          <span id="f-xiaomiReleaseNotes-hint" className="text-xs text-muted">
            Xiaomi shows it with the update. We send it with every build until you change it; without it, “{notes.fallback}”
          </span>
          <FieldError id="f-xiaomiReleaseNotes-error" error={e.xiaomiReleaseNotes} />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <SubmitButton className="h-10">Save Xiaomi GetApps keys</SubmitButton>
          <Link href="/docs/xiaomi-getapps" className="text-sm font-semibold">
            How to set up Xiaomi GetApps
          </Link>
        </div>
      </fieldset>
    </form>
  );
}
