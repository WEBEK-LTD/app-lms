"use client";

import Link from "next/link";
import { useActionState, useEffect, useState } from "react";
import {
  removeAppWhatsappAction,
  replaceSigningKeyAction,
  saveAppMailAction,
  saveAppSignInAction,
  saveAppWhatsappAction,
  saveSignInMethodsAction,
  saveSignInProviderAction,
  testAppMailAction,
  testAppWhatsappAction,
  testTokenAction,
  type TestTokenState,
} from "@/app/actions/app-sign-in";
import { CopyButton } from "@/components/copy-button";
import { Field, FieldError, FormMessage, SubmitButton } from "@/components/form";
import { MAIL_PRESETS, SECURITY_LABELS, mailPreset, type MailSecurity } from "@/lib/email/app-mail-presets";
import { initialFormState } from "@/lib/forms";
import { useDashLang, useDashT, useKnownText } from "@/components/dashboard-i18n";
import type { DashKey } from "@/i18n/dashboard";
import { LANG_INFO } from "@/i18n/config";
import { localePath } from "@/i18n/paths";
import { richText } from "@/i18n/rich";

/** 34 Own API apps: who signs people in. */
const PROVIDERS: readonly { value: "api" | "yallapp"; label: DashKey; hint: DashKey }[] = [
  { value: "api", label: "signin.providerApi", hint: "signin.providerApiHint" },
  { value: "yallapp", label: "signin.providerYallapp", hint: "signin.providerYallappHint" },
];

export function SignInProviderForm({ current }: { current: "api" | "yallapp" }) {
  const t = useDashT();
  const [state, action] = useActionState(saveSignInProviderAction, initialFormState);
  const value = state.values?.signInBy ?? current;
  return (
    <form action={action} noValidate className="flex flex-col gap-4" key={value}>
      <FormMessage message={state.message} ok={state.ok} />
      <fieldset className="m-0 flex flex-col gap-3 border-0 p-0" aria-describedby={state.errors?.signInBy ? "sign-in-by-error" : undefined}>
        <legend className="sr-only">{t("signin.whoSigns")}</legend>
        {PROVIDERS.map((p) => (
          <label key={p.value} className="flex cursor-pointer items-start gap-2.5 text-[15px]">
            <input type="radio" name="signInBy" value={p.value} defaultChecked={value === p.value} className="mt-1 h-4 w-4 accent-midnight" />
            <span className="flex flex-col">
              <span className="font-semibold">{t(p.label)}</span>
              <span className="text-sm text-muted">{t(p.hint)}</span>
            </span>
          </label>
        ))}
        <FieldError id="sign-in-by-error" error={state.errors?.signInBy} />
      </fieldset>
      <div className="flex justify-end">
        <SubmitButton className="h-11" pendingText={t("common.saving")}>
          {t("common.save")}
        </SubmitButton>
      </div>
    </form>
  );
}

/** 34 What the developer of the own API needs: where the keys are, what the tokens say, a test token and a new key. */
export function DeveloperTokens({
  jwksUrl,
  issuer,
  audience,
  authBaseUrl,
  tryUrl,
}: {
  jwksUrl: string;
  issuer: string;
  audience: string;
  authBaseUrl: string;
  /** A signed-in endpoint of the app's own API, for the curl example; null when there's none. */
  tryUrl: string | null;
}) {
  const t = useDashT();
  const known = useKnownText();
  const lang = useDashLang();
  const [token, tokenAction] = useActionState(testTokenAction, {} as TestTokenState);
  const [key, keyAction] = useActionState(replaceSigningKeyAction, initialFormState);
  const [copied, setCopied] = useState<string | null>(null);
  useEffect(() => {
    if (!token.token) return;
    navigator.clipboard?.writeText(token.token).then(
      () => setCopied(token.token!),
      () => setCopied(null),
    );
  }, [token.token]);
  const rows = [
    { label: t("signin.jwks"), value: jwksUrl },
    { label: t("signin.issuer"), value: issuer },
    { label: t("signin.audience"), value: audience },
    { label: t("signin.signInAddress"), value: authBaseUrl },
  ];
  const until = token.expiresAt
    ? new Date(token.expiresAt).toLocaleTimeString(lang === "en" ? "en-GB" : LANG_INFO[lang].intl, { hour: "2-digit", minute: "2-digit" })
    : "";
  return (
    <div className="flex flex-col gap-4">
      <p className="m-0 text-[15px] leading-relaxed text-ink-4">
        {richText(t("signin.devIntro"), {
          code: () => <code dir="ltr">Authorization: Bearer</code>, // i18n-ok: code
          link: (chunk) => <Link href={localePath(lang, "/docs/my-own-api") + "#let-yallapp-sign-people-in"}>{chunk}</Link>,
        })}
      </p>
      <dl className="m-0 grid gap-x-4 gap-y-2 text-[15px] sm:grid-cols-[180px_1fr]">
        {rows.map((r) => (
          <div key={r.label} className="contents">
            <dt className="font-semibold">{r.label}</dt>
            <dd className="m-0 min-w-0">
              <code className="break-all" dir="ltr">
                {r.value}
              </code>
            </dd>
          </div>
        ))}
      </dl>
      <form action={tokenAction} className="flex flex-col gap-3 border-t border-line-soft pt-4">
        {token.error ? <FormMessage message={known(token.error)} ok={false} /> : null}
        <p className="m-0 text-sm leading-relaxed text-muted">{t("signin.testTokenText")}</p>
        <div className="flex flex-wrap items-center gap-3">
          <SubmitButton variant="secondary" className="h-11" pendingText={t("signin.making")}>
            {t("signin.copyToken")}
          </SubmitButton>
        </div>
        {token.token ? (
          <div className="flex flex-col gap-2">
            <label htmlFor="f-test-token" className="text-sm font-semibold">
              {t("signin.testToken")}
            </label>
            <textarea id="f-test-token" readOnly rows={4} value={token.token} className="input font-mono text-xs break-all" dir="ltr" onFocus={(e) => e.currentTarget.select()} />
            <div className="flex flex-wrap items-center gap-3">
              <CopyButton value={token.token} label={t("common.copy")} copiedLabel={t("common.copied")} />
              <span role="status" className="text-sm text-muted">
                {copied === token.token ? t("signin.copiedWorksUntil", { time: until }) : t("signin.worksUntil", { time: until })}
              </span>
            </div>
            {tryUrl ? (
              <p className="m-0 text-sm text-muted">
                {richText(t("signin.tryIt"), {
                  code: () => (
                    <code className="break-all" dir="ltr">
                      {/* i18n-ok: a command */ `curl -H "Authorization: Bearer $TOKEN" ${tryUrl}`}
                    </code>
                  ),
                })}
              </p>
            ) : null}
          </div>
        ) : null}
      </form>
      <form action={keyAction} className="flex flex-col gap-3 border-t border-line-soft pt-4">
        <FormMessage message={key.message} ok={key.ok} />
        <p className="m-0 text-sm leading-relaxed text-muted">{t("signin.keyText")}</p>
        <div className="flex justify-end">
          <SubmitButton variant="secondary" className="h-9 px-3 text-sm" pendingText={t("signin.replacing")}>
            {t("signin.replaceKey")}
          </SubmitButton>
        </div>
      </form>
    </div>
  );
}

function Check({ name, label, checked }: { name: string; label: string; checked: boolean }) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-[15px]">
      <input type="checkbox" name={name} defaultChecked={checked} className="h-4 w-4 accent-midnight" />
      {label}
    </label>
  );
}

const METHODS: readonly { value: "phone" | "email" | "both"; label: DashKey; hint: DashKey | null }[] = [
  { value: "phone", label: "signin.methodPhone", hint: "signin.methodPhoneHint" },
  { value: "email", label: "signin.methodEmail", hint: null },
  { value: "both", label: "signin.methodBoth", hint: "signin.methodBothHint" },
];

/** 24 WordPress: how email sign-in works. */
const EMAIL_WAYS: readonly { value: "code" | "password"; label: DashKey; hint: DashKey }[] = [
  { value: "code", label: "signin.emailCode", hint: "signin.emailCodeHint" },
  { value: "password", label: "signin.emailPasswordWay", hint: "signin.emailPasswordWayHint" },
];

/** 18 Phone, email or both. */
export function SignInMethodsForm({
  current,
  wordpress,
  emailPossible,
  note = null,
  chosen,
  emailWay = "password",
  emailWayChosen = false,
}: {
  current: "phone" | "email" | "both";
  wordpress: boolean;
  emailPossible: boolean;
  /** 19 Why email isn't offered, or how it works with the app's platform (emailSignInNote). */
  note?: string | null;
  chosen: boolean;
  /** 24 WordPress: email with a code or with the password. */
  emailWay?: "code" | "password";
  emailWayChosen?: boolean;
}) {
  const t = useDashT();
  const [state, action] = useActionState(saveSignInMethodsAction, initialFormState);
  const value = state.values?.methods ?? current;
  const way = state.values?.emailSignIn || emailWay;
  const error = state.errors?.methods;
  const emailHint = wordpress ? t("signin.emailHintWordpress") : t("signin.emailHintHosted");
  return (
    <form action={action} noValidate className="flex flex-col gap-4" key={`${value}-${way}`}>
      <FormMessage message={state.message} ok={state.ok} />
      <fieldset className="m-0 flex flex-col gap-3 border-0 p-0" aria-describedby={error ? "methods-error" : undefined}>
        <legend className="sr-only">{t("signin.howSignIn")}</legend>
        {METHODS.map((m) => {
          const disabled = m.value !== "phone" && !emailPossible;
          return (
            <label key={m.value} className={`flex items-start gap-2.5 text-[15px] ${disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"}`}>
              <input type="radio" name="methods" value={m.value} defaultChecked={value === m.value} disabled={disabled} className="mt-1 h-4 w-4 accent-midnight" />
              <span className="flex flex-col">
                <span className="font-semibold">{t(m.label)}</span>
                <span className="text-sm text-muted">{m.hint ? t(m.hint) : emailHint}</span>
              </span>
            </label>
          );
        })}
        <FieldError id="methods-error" error={error} />
      </fieldset>
      {/* 19 Why email isn't offered, or how it works with a course platform. */}
      {note ? <p className="m-0 text-sm leading-relaxed text-muted">{note}</p> : null}
      {wordpress ? (
        <fieldset className="m-0 flex flex-col gap-3 border-0 p-0" aria-describedby={state.errors?.emailSignIn ? "email-way-error" : undefined}>
          <legend className="mb-1.5 text-[15px] font-bold">{t("signin.emailWorks")}</legend>
          {EMAIL_WAYS.map((w) => (
            <label key={w.value} className="flex cursor-pointer items-start gap-2.5 text-[15px]">
              <input type="radio" name="emailSignIn" value={w.value} defaultChecked={way === w.value} className="mt-1 h-4 w-4 accent-midnight" />
              <span className="flex flex-col">
                <span className="font-semibold">{t(w.label)}</span>
                <span className="text-sm text-muted">{t(w.hint)}</span>
              </span>
            </label>
          ))}
          <FieldError id="email-way-error" error={state.errors?.emailSignIn} />
        </fieldset>
      ) : null}
      {wordpress ? (
        <p className="m-0 text-sm leading-relaxed text-muted">
          {chosen ? (emailWayChosen ? t("signin.wpChosen") : t("signin.wpChosenNoWay")) : t("signin.wpNotChosen")}
        </p>
      ) : null}
      <div className="flex justify-end">
        <SubmitButton className="h-11" pendingText={t("common.saving")}>
          {t("signin.saveMethods")}
        </SubmitButton>
      </div>
    </form>
  );
}

/** 18 Codes from the owner's own WhatsApp number (WABEK), with a test. */
export function AppWhatsappForms({
  connected,
  defaultPhone,
  wordpress,
}: {
  connected: { keyLast4: string; instanceId: string | null } | null;
  defaultPhone: string;
  wordpress: boolean;
}) {
  const t = useDashT();
  const [state, action] = useActionState(saveAppWhatsappAction, initialFormState);
  const [test, testAction] = useActionState(testAppWhatsappAction, initialFormState);
  const e = state.errors ?? {};
  return (
    <div className="flex flex-col gap-4">
      <p className="m-0 text-[15px] leading-relaxed text-ink-4">
        {connected
          ? connected.instanceId
            ? t("signin.whatsappOwn", { last4: connected.keyLast4, instance: connected.instanceId })
            : t("signin.whatsappOwnAny", { last4: connected.keyLast4 })
          : t("signin.whatsappYallapp")}
        {wordpress ? ` ${t("signin.whatsappWordpress")}` : ""}
      </p>
      <form action={action} noValidate className="flex flex-col gap-4" key={state.ok ? "saved" : "form"}>
        <FormMessage message={state.message} ok={state.ok} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label={t("signin.wabekKey")}
            name="apiKey"
            type="password"
            autoComplete="off"
            placeholder={connected ? `•••• ${connected.keyLast4}` : ""}
            hint={connected ? t("signin.wabekKeyReplace") : t("signin.wabekKeyHint")}
            error={e.apiKey}
          />
          <Field
            label={t("signin.instanceId")}
            name="instanceId"
            autoComplete="off"
            defaultValue={state.values?.instanceId ?? connected?.instanceId ?? ""}
            hint={t("signin.instanceHint")}
            error={e.instanceId}
          />
        </div>
        <div className="flex justify-end">
          <SubmitButton className="h-11" pendingText={t("common.saving")}>
            {t("signin.saveWhatsapp")}
          </SubmitButton>
        </div>
      </form>
      {connected ? (
        <>
          <form action={testAction} noValidate className="flex flex-col gap-3 border-t border-line-soft pt-4">
            <FormMessage message={test.message} ok={test.ok} />
            <div className="flex flex-wrap items-end gap-3">
              <Field
                label={t("signin.testCodeTo")}
                name="phone"
                type="tel"
                defaultValue={test.values?.phone ?? defaultPhone}
                error={test.errors?.phone}
                className="min-w-[240px] flex-1"
              />
              <SubmitButton variant="secondary" className="h-11" pendingText={t("common.sending")}>
                {t("signin.sendTestCode")}
              </SubmitButton>
            </div>
          </form>
          <form action={removeAppWhatsappAction} className="flex justify-end">
            <SubmitButton variant="secondary" className="h-9 px-3 text-sm" pendingText={t("signin.removing")}>
              {t("signin.useYallappNumber")}
            </SubmitButton>
          </form>
        </>
      ) : null}
    </div>
  );
}

export function AppSignInForm({ current, emailOnly = false }: { current: Record<string, string>; emailOnly?: boolean }) {
  const t = useDashT();
  const [state, action] = useActionState(saveAppSignInAction, initialFormState);
  const v = state.values ?? current;
  const e = state.errors ?? {};
  return (
    <form action={action} noValidate className="flex flex-col gap-6" key={JSON.stringify(v)}>
      <FormMessage message={state.message} ok={state.ok} />

      <fieldset className="m-0 flex flex-col gap-3 border-0 p-0">
        <legend className="mb-1.5 text-[17px] font-bold">{t("signin.newCustomers")}</legend>
        <Check name="signupAllowed" label={t("signin.signupAllowed")} checked={v.signupAllowed === "on"} />
        <span className="text-sm text-muted">{t("signin.askAlso")}</span>
        <div className="flex flex-wrap gap-x-6 gap-y-2">
          <Check name="askEmail" label={t("common.email")} checked={v.askEmail === "on"} />
          <Check name="askCity" label={t("signin.city")} checked={v.askCity === "on"} />
        </div>
      </fieldset>

      <fieldset className="m-0 flex flex-col gap-4 border-0 p-0">
        <legend className="mb-1.5 text-[17px] font-bold">{t("signin.phoneDevices")}</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label={t("signin.countryCode")}
            name="defaultCountryCode"
            inputMode="numeric"
            defaultValue={v.defaultCountryCode}
            hint={t("signin.countryCodeHint")}
            error={e.defaultCountryCode}
          />
          <Field
            label={t("signin.devices")}
            name="deviceLimit"
            inputMode="numeric"
            defaultValue={v.deviceLimit}
            hint={t("signin.devicesHint")}
            error={e.deviceLimit}
          />
        </div>
      </fieldset>

      <fieldset className="m-0 flex flex-col gap-4 border-0 p-0">
        <legend className="mb-1.5 text-[17px] font-bold">{t("signin.helpTerms")}</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t("signin.supportWhatsapp")} name="supportWhatsapp" type="tel" defaultValue={v.supportWhatsapp} hint={t("signin.supportHint")} error={e.supportWhatsapp} />
          <Field label={t("signin.termsPage")} name="termsUrl" type="url" defaultValue={v.termsUrl} placeholder="https://" hint={t("signin.termsHint")} error={e.termsUrl} />
        </div>
      </fieldset>

      <fieldset className="m-0 flex flex-col gap-4 border-0 p-0">
        <legend className="mb-1.5 text-[17px] font-bold">{t("signin.review")}</legend>
        <p className="m-0 text-sm leading-relaxed text-muted">
          {t("signin.reviewText")} {emailOnly ? t("signin.reviewEmailOnly") : t("signin.reviewSetEmail")} {t("signin.reviewGive")}
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t("signin.reviewPhone")} name="reviewPhone" type="tel" defaultValue={v.reviewPhone} error={e.reviewPhone} />
          <Field
            label={t("signin.reviewEmail")}
            name="reviewEmail"
            type="email"
            autoComplete="off"
            defaultValue={v.reviewEmail}
            placeholder="review@your-site.com"
            error={e.reviewEmail}
          />
          <Field label={t("signin.reviewCode")} name="reviewCode" inputMode="numeric" autoComplete="off" maxLength={6} defaultValue={v.reviewCode} error={e.reviewCode} />
        </div>
      </fieldset>

      <div className="flex justify-end">
        <SubmitButton className="h-11" pendingText={t("common.saving")}>
          {t("common.save")}
        </SubmitButton>
      </div>
    </form>
  );
}

/** 24 What the page knows about the saved own email server (never the password). */
export interface SavedMailServer {
  host: string;
  username: string;
  fromName: string;
  fromAddress: string;
}

/** 24 "Your app's email": sent by Yallapp, or from the owner's own email server, with a test. */
export function AppMailForms({
  current,
  saved,
  defaultTestTo,
  production,
  wordpress,
}: {
  /** The form's values (appMailFormValues); the password is always empty. */
  current: Record<string, string>;
  saved: SavedMailServer | null;
  defaultTestTo: string;
  production: boolean;
  wordpress: boolean;
}) {
  const t = useDashT();
  const [state, action] = useActionState(saveAppMailAction, initialFormState);
  const [test, testAction] = useActionState(testAppMailAction, initialFormState);
  const v = state.values ?? current;
  const e = state.errors ?? {};
  return (
    <div className="flex flex-col gap-4">
      <p className="m-0 text-[15px] leading-relaxed text-ink-4">
        {saved
          ? richText(t("signin.mailOwn"), {
              from: () => <bdi dir="ltr">{`${saved.fromName} <${saved.fromAddress}>`}</bdi>,
              host: () => <bdi dir="ltr">{saved.host}</bdi>,
            })
          : t("signin.mailYallapp")}{" "}
        {wordpress ? t("signin.mailWordpress") : t("signin.mailHosted")}
      </p>
      <MailServerForm key={JSON.stringify(v)} action={action} values={v} errors={e} message={state.message} ok={state.ok} saved={saved !== null} production={production} />
      {saved ? (
        <form action={testAction} noValidate className="flex flex-col gap-3 border-t border-line-soft pt-4">
          <FormMessage message={test.message} ok={test.ok} />
          <div className="flex flex-wrap items-end gap-3">
            <Field
              label={t("signin.testEmailTo")}
              name="to"
              type="email"
              autoComplete="email"
              defaultValue={test.values?.to ?? defaultTestTo}
              error={test.errors?.to}
              className="min-w-[240px] flex-1"
            />
            <SubmitButton variant="secondary" className="h-11" pendingText={t("common.sending")}>
              {t("signin.sendTestEmail")}
            </SubmitButton>
          </div>
          <p className="m-0 text-sm text-muted">{t("signin.testEmailNote")}</p>
        </form>
      ) : null}
    </div>
  );
}

function MailServerForm({
  action,
  values,
  errors,
  message,
  ok,
  saved,
  production,
}: {
  action: (formData: FormData) => void;
  values: Record<string, string>;
  errors: Record<string, string>;
  message?: string;
  ok?: boolean;
  saved: boolean;
  production: boolean;
}) {
  const t = useDashT();
  const known = useKnownText();
  const [sender, setSender] = useState(values.sender === "own" ? "own" : "yallapp");
  const [presetId, setPresetId] = useState(values.preset || "google");
  const [host, setHost] = useState(values.host ?? "");
  const [port, setPort] = useState(values.port ?? "");
  const [security, setSecurity] = useState<string>(values.security ?? "ssl");
  const preset = mailPreset(presetId) ?? MAIL_PRESETS[0]!;
  const choose = (id: string) => {
    const next = mailPreset(id);
    setPresetId(id);
    if (next && next.host) {
      setHost(next.host);
      setPort(String(next.ports[0]!.port));
      setSecurity(next.ports[0]!.security);
    }
  };
  const securities: MailSecurity[] = production ? ["ssl", "starttls"] : ["ssl", "starttls", "none"];
  return (
    <form action={action} noValidate className="flex flex-col gap-5">
      <FormMessage message={message} ok={ok} />
      <fieldset className="m-0 flex flex-col gap-3 border-0 p-0">
        <legend className="sr-only">{t("signin.whoSendsEmail")}</legend>
        {[
          { value: "yallapp", label: t("signin.sentByYallapp"), hint: t("signin.sentByYallappHint") },
          { value: "own", label: t("signin.ownServer"), hint: t("signin.ownServerHint") },
        ].map((o) => (
          <label key={o.value} className="flex cursor-pointer items-start gap-2.5 text-[15px]">
            <input
              type="radio"
              name="sender"
              value={o.value}
              checked={sender === o.value}
              onChange={() => setSender(o.value)}
              className="mt-1 h-4 w-4 accent-midnight"
            />
            <span className="flex flex-col">
              <span className="font-semibold">{o.label}</span>
              <span className="text-sm text-muted">{o.hint}</span>
            </span>
          </label>
        ))}
        <FieldError id="sender-error" error={errors.sender} />
      </fieldset>

      {sender === "own" ? (
        <>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="f-preset" className="text-sm font-semibold">
              {t("signin.emailService")}
            </label>
            <select id="f-preset" name="preset" value={presetId} onChange={(event) => choose(event.target.value)} className="input">
              {MAIL_PRESETS.map((p) => (
                <option key={p.id} value={p.id}>
                  {known(p.name)} ({known(p.hint)})
                </option>
              ))}
            </select>
          </div>

          <div className="rounded-xl bg-sand px-4 py-3.5">
            <p className="m-0 text-[15px] font-bold">{t("signin.howToSetUp", { name: known(preset.name) })}</p>
            <ol className="m-0 mt-2 flex flex-col gap-1.5 ps-5 text-sm leading-relaxed text-ink-2">
              {preset.steps.map((step) => (
                <li key={step}>{known(step)}</li>
              ))}
            </ol>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t("signin.username")} name="username" autoComplete="off" defaultValue={values.username} hint={known(preset.usernameHint)} error={errors.username} />
            <Field
              label={t("signin.password")}
              name="password"
              type="password"
              autoComplete="new-password"
              placeholder={saved ? t("signin.passwordSaved") : ""}
              hint={t(saved ? "signin.passwordHintSaved" : "signin.passwordHint", { hint: known(preset.passwordHint) })}
              error={errors.password}
            />
            <Field label={t("signin.fromName")} name="fromName" autoComplete="off" defaultValue={values.fromName} hint={t("signin.fromNameHint")} error={errors.fromName} />
            <Field
              label={t("signin.fromAddress")}
              name="fromAddress"
              type="email"
              autoComplete="off"
              defaultValue={values.fromAddress}
              placeholder="hello@your-site.com"
              hint={t("signin.fromAddressHint")}
              error={errors.fromAddress}
            />
            <Field
              label={t("signin.replyTo")}
              name="replyTo"
              type="email"
              autoComplete="off"
              defaultValue={values.replyTo}
              hint={t("signin.replyToHint")}
              error={errors.replyTo}
            />
          </div>

          <details open={presetId === "custom" || Boolean(errors.host || errors.port || errors.security)} className="rounded-xl border border-line px-4 py-3">
            <summary className="cursor-pointer text-[15px] font-semibold">{t("signin.serverSettings")}</summary>
            <p className="m-0 mt-2 text-sm text-muted">{presetId === "custom" ? t("signin.fromService") : t("signin.filledIn", { name: preset.name })}</p>
            <div className="mt-3 grid gap-4 sm:grid-cols-3">
              <Field label={t("signin.server")} name="host" autoComplete="off" value={host} onChange={(event) => setHost(event.target.value)} placeholder="smtp.example.com" error={errors.host} className="sm:col-span-3" />
              <Field
                label={t("signin.port")}
                name="port"
                inputMode="numeric"
                autoComplete="off"
                value={port}
                onChange={(event) => setPort(event.target.value)}
                placeholder="465"
                hint={t("signin.portHint")}
                error={errors.port}
              />
              <div className="flex min-w-0 flex-col gap-1.5 sm:col-span-2">
                <label htmlFor="f-security" className="text-sm font-semibold">
                  {t("signin.security")}
                </label>
                <select
                  id="f-security"
                  name="security"
                  value={security}
                  onChange={(event) => setSecurity(event.target.value)}
                  className="input"
                  aria-invalid={errors.security ? true : undefined}
                  aria-describedby={errors.security ? "f-security-error" : undefined}
                >
                  {securities.map((s) => (
                    <option key={s} value={s}>
                      {known(SECURITY_LABELS[s])}
                    </option>
                  ))}
                </select>
                <FieldError id="f-security-error" error={errors.security} />
              </div>
            </div>
          </details>
        </>
      ) : null}

      <div className="flex justify-end">
        <SubmitButton className="h-11" pendingText={t("common.saving")}>
          {t("signin.saveEmail")}
        </SubmitButton>
      </div>
    </form>
  );
}
