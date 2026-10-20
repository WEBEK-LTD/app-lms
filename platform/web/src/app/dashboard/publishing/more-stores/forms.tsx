"use client";

import Link from "next/link";
import { useActionState, type ReactNode } from "react";
import { removeMoreStoreKeyAction, saveGalaxyStoreAction, saveHuaweiAction, saveXiaomiAction } from "@/app/actions/more-stores";
import { Field, FieldError, FormMessage, SubmitButton } from "@/components/form";
import { Icon } from "@/components/icon";
import { initialFormState, type FormState } from "@/lib/forms";
import { useDashLang, useDashT } from "@/components/dashboard-i18n";
import { localePath } from "@/i18n/paths";
import { richText } from "@/i18n/rich";

/** 35, 36, 42 The forms of the "More Android stores" page. */

const v = (state: FormState, key: string) => state.values?.[key] ?? "";

function Saved({ title, detail, removeKey }: { title: string; detail: string; removeKey: string }) {
  const t = useDashT();
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-success-bg px-4 py-3">
      <span className="flex min-w-0 items-center gap-2 text-[15px]">
        <Icon name="check_circle" size={20} filled className="text-success" />
        <span className="min-w-0 break-words">
          {richText(t("stores.saved", { title, detail }), { b: (chunk) => <b>{chunk}</b> })}
        </span>
      </span>
      <button formAction={removeMoreStoreKeyAction} name="key" value={removeKey} formNoValidate className="cursor-pointer border-0 bg-transparent p-0 text-sm font-semibold text-danger hover:underline">
        {t("stores.remove")}
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
        className="block w-full min-w-0 rounded-[10px] border border-line-strong bg-white p-2 text-sm file:me-3 file:rounded-lg file:border-0 file:bg-ivory file:px-3 file:py-2 file:font-semibold file:text-midnight"
      />
      <span id={`${id}-hint`} className="text-xs text-muted">
        {hint}
      </span>
      <FieldError id={`${id}-error`} error={error} />
    </div>
  );
}

export function GalaxyStoreForm({ saved, uploads }: { saved: { contentId: string; serviceAccountId: string } | null; uploads: boolean }) {
  const t = useDashT();
  const [state, action] = useActionState(saveGalaxyStoreAction, initialFormState);
  const e = state.errors ?? {};
  return (
    <form action={action} noValidate className="flex flex-col gap-3.5">
      <FormMessage message={state.message} ok={state.ok} />
      {saved ? <Saved title={t("stores.galaxyKeys")} detail={t("stores.contentIdDetail", { id: saved.contentId })} removeKey="galaxy" /> : null}
      <fieldset disabled={!uploads} className="m-0 flex flex-col gap-3.5 border-0 p-0">
        <div className="flex flex-wrap gap-3.5">
          <Field
            className="flex-[1_1_200px]"
            label={t("stores.contentId")}
            name="galaxyContentId"
            inputMode="numeric"
            autoComplete="off"
            defaultValue={v(state, "galaxyContentId")}
            placeholder={saved?.contentId ?? "000001234567"}
            hint={t("stores.contentIdHint")}
            error={e.galaxyContentId}
            small
          />
          <Field
            className="flex-[1_1_240px]"
            label={t("stores.serviceAccountId")}
            name="galaxyServiceAccountId"
            autoComplete="off"
            defaultValue={v(state, "galaxyServiceAccountId")}
            placeholder={saved?.serviceAccountId ?? ""}
            hint={t("stores.serviceAccountHint")}
            error={e.galaxyServiceAccountId}
            small
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="f-galaxyPrivateKey" className="text-sm font-semibold">
            {saved ? t("stores.replacePrivateKey") : t("stores.privateKey")}
          </label>
          <textarea
            id="f-galaxyPrivateKey"
            name="galaxyPrivateKey"
            rows={4}
            spellCheck={false}
            autoComplete="off"
            placeholder="-----BEGIN PRIVATE KEY-----" // i18n-ok: a key's first line
            className="input font-mono text-xs"
            dir="ltr"
            aria-invalid={e.galaxyPrivateKey ? true : undefined}
            aria-describedby={`f-galaxyPrivateKey-hint${e.galaxyPrivateKey ? " f-galaxyPrivateKey-error" : ""}`}
          />
          <span id="f-galaxyPrivateKey-hint" className="text-xs text-muted">
            {t("stores.privateKeyHint")}
          </span>
          <FieldError id="f-galaxyPrivateKey-error" error={e.galaxyPrivateKey} />
        </div>
        <FileField name="galaxyPrivateKeyFile" label={t("stores.privateKeyFile")} accept=".pem,.key,.txt" hint={t("stores.privateKeyFileHint")} />
        <div>
          <SubmitButton className="h-10">{t("stores.saveGalaxy")}</SubmitButton>
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
  const t = useDashT();
  const lang = useDashLang();
  const [state, action] = useActionState(saveHuaweiAction, initialFormState);
  const e = state.errors ?? {};
  const muted = { muted: (chunk: string) => <span className="font-normal text-muted">{chunk}</span> };
  return (
    <form action={action} noValidate className="flex flex-col gap-4">
      <FormMessage message={state.message} ok={state.ok} />
      <Field
        label={t("stores.appId")}
        name="huaweiAppId"
        inputMode="numeric"
        autoComplete="off"
        defaultValue={v(state, "huaweiAppId")}
        placeholder={saved.appId ?? "104123456"}
        hint={t("stores.appIdHint")}
        error={e.huaweiAppId}
        small
      />

      <fieldset className="m-0 flex flex-col gap-3.5 rounded-xl border border-line p-4">
        <legend className="px-1 text-[15px] font-bold">
          {richText(t("stores.huaweiPush"), muted)}
        </legend>
        <p className="m-0 text-sm leading-relaxed text-ink-4">{t("stores.huaweiPushText")}</p>
        {saved.agconnect ? <Saved title="agconnect-services.json" detail={t("stores.huaweiPushNext")} removeKey="huawei-agconnect" /> : null}
        <FileField
          name="huaweiAgconnectFile"
          label={saved.agconnect ? t("stores.replaceAgconnect") : "agconnect-services.json"}
          accept="application/json,.json"
          hint={t("stores.agconnectHint")}
          error={e.huaweiAgconnectFile}
        />
        {saved.push ? <Saved title={t("stores.appSecret")} detail="Push Kit" removeKey="huawei-push" /> : null}
        <Field
          label={saved.push ? t("stores.replaceAppSecret") : t("stores.appSecret")}
          name="huaweiPushSecret"
          type="password"
          autoComplete="off"
          hint={t("stores.appSecretHint")}
          error={e.huaweiPushSecret}
          small
        />
      </fieldset>

      <fieldset disabled={!uploads} className="m-0 flex flex-col gap-3.5 rounded-xl border border-line p-4">
        <legend className="px-1 text-[15px] font-bold">{t("stores.uploadingBuilds")}</legend>
        {saved.clientId ? <Saved title={t("stores.apiClient")} detail={t("stores.clientIdDetail", { id: saved.clientId })} removeKey="huawei-upload" /> : null}
        <div className="flex flex-wrap gap-3.5">
          <Field
            className="flex-[1_1_220px]"
            label={t("stores.clientId")}
            name="huaweiClientId"
            autoComplete="off"
            defaultValue={v(state, "huaweiClientId")}
            placeholder={saved.clientId ?? ""}
            hint={t("stores.clientIdHint")}
            error={e.huaweiClientId}
            small
          />
          <Field
            className="flex-[1_1_220px]"
            label={saved.clientId ? t("stores.replaceKey") : t("stores.key")}
            name="huaweiClientSecret"
            type="password"
            autoComplete="off"
            hint={t("stores.keyHint")}
            error={e.huaweiClientSecret}
            small
          />
        </div>
      </fieldset>

      <div className="flex flex-wrap items-center gap-3">
        <SubmitButton className="h-10">{t("stores.saveHuawei")}</SubmitButton>
        <Link href={localePath(lang, "/docs/huawei-appgallery")} className="text-sm font-semibold">
          {t("stores.howAppGallery")}
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
  const t = useDashT();
  const lang = useDashLang();
  const [state, action] = useActionState(saveXiaomiAction, initialFormState);
  const e = state.errors ?? {};
  return (
    <form action={action} noValidate className="flex flex-col gap-3.5">
      <FormMessage message={state.message} ok={state.ok} />
      {saved ? <Saved title={t("stores.xiaomiKeys")} detail={saved.userName} removeKey="xiaomi" /> : null}
      <fieldset disabled={!uploads} className="m-0 flex flex-col gap-3.5 border-0 p-0">
        <div className="flex flex-wrap gap-3.5">
          <Field
            className="flex-[1_1_240px]"
            label={t("stores.xiaomiEmail")}
            name="xiaomiUserName"
            type="email"
            autoComplete="off"
            defaultValue={v(state, "xiaomiUserName")}
            placeholder={saved?.userName ?? "you@example.com"}
            hint={t("stores.xiaomiEmailHint")}
            error={e.xiaomiUserName}
            small
          />
          <Field
            className="flex-[1_1_240px]"
            label={saved ? t("stores.replaceXiaomiApiKey") : t("stores.xiaomiApiKey")}
            name="xiaomiPassword"
            type="password"
            autoComplete="off"
            hint={t("stores.xiaomiApiKeyHint")}
            error={e.xiaomiPassword}
            small
          />
        </div>
        <FileField
          name="xiaomiCertificateFile"
          label={saved ? t("stores.replaceCertificate") : t("stores.certificate")}
          accept=".cer,.crt,.pem"
          hint={t("stores.certificateHint")}
          error={e.xiaomiCertificateFile}
        />
        <div className="flex flex-col gap-1.5">
          <label htmlFor="f-xiaomiReleaseNotes" className="text-sm font-semibold">
            {richText(t("stores.whatsNew"), { muted: (chunk) => <span className="font-normal text-muted">{chunk}</span> })}
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
            {t("stores.whatsNewHint", { fallback: notes.fallback })}
          </span>
          <FieldError id="f-xiaomiReleaseNotes-error" error={e.xiaomiReleaseNotes} />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <SubmitButton className="h-10">{t("stores.saveXiaomi")}</SubmitButton>
          <Link href={localePath(lang, "/docs/xiaomi-getapps")} className="text-sm font-semibold">
            {t("stores.howXiaomi")}
          </Link>
        </div>
      </fieldset>
    </form>
  );
}
