"use client";

import Link from "next/link";
import { useActionState } from "react";
import { forgotPasswordAction, resetPasswordAction, signInAction, signUpAction, twoStepSignInAction } from "@/app/actions/auth";
import { Field, FieldError, FormMessage, PasswordField, SubmitButton } from "@/components/form";
import { DEFAULT_LANG, type Lang } from "@/i18n/config";
import type { Messages } from "@/i18n/messages/en";
import { localePath } from "@/i18n/paths";
import { richText } from "@/i18n/rich";
import { initialFormState } from "@/lib/forms";
import { CampaignFields } from "@/components/campaign";

const card = "flex w-full flex-col rounded-[20px] border border-line bg-white px-5 py-8 sm:px-8 sm:py-9";

/** 55 The forms' words come from the page (the catalog's `auth`, in the page's language), and the forms send the language to the actions. */
interface FormText {
  lang?: Lang;
  m: Messages["auth"];
}

function LangField({ lang }: { lang: Lang }) {
  return lang === DEFAULT_LANG ? null : <input type="hidden" name="lang" value={lang} />;
}

export function SignInForm({ notice, lang = DEFAULT_LANG, m }: { notice?: string } & FormText) {
  const [state, action] = useActionState(signInAction, initialFormState);
  return (
    <form action={action} noValidate className={`${card} max-w-[440px] gap-5`}>
      <LangField lang={lang} />
      <div className="flex flex-col gap-1.5">
        <h1 className="m-0 text-[30px] font-extrabold tracking-[-0.5px]">{m.signInTitle}</h1>
        <p className="m-0 text-[15px] text-muted">{m.signInText}</p>
      </div>
      {notice && !state.message ? <FormMessage ok message={notice} /> : null}
      <FormMessage message={state.message} ok={state.ok} />
      <Field
        label={m.email}
        name="email"
        type="email"
        autoComplete="email"
        placeholder={m.emailPlaceholder}
        required
        defaultValue={state.values?.email}
        error={state.errors?.email}
      />
      <PasswordField
        label={m.password}
        name="password"
        autoComplete="current-password"
        error={state.errors?.password}
        showLabel={m.showPassword}
        hideLabel={m.hidePassword}
        aside={
          <Link href={localePath(lang, "/forgot-password")} className="text-sm font-semibold no-underline hover:underline">
            {m.forgot}
          </Link>
        }
      />
      <SubmitButton className="h-[50px] text-base" pendingText={m.signingIn}>
        {m.signIn}
      </SubmitButton>
      <p className="m-0 text-center text-[15px] text-muted">
        {m.newHere}{" "}
        <Link href={localePath(lang, "/sign-up")} className="font-bold">
          {m.createAccount}
        </Link>
      </p>
    </form>
  );
}

export function SignUpForm({ lang = DEFAULT_LANG, m }: FormText) {
  const [state, action] = useActionState(signUpAction, initialFormState);
  const v = state.values ?? {};
  return (
    <form action={action} noValidate className={`${card} min-w-0 flex-[3_1_420px] gap-[18px]`}>
      <LangField lang={lang} />
      <CampaignFields />
      <div className="flex flex-col gap-1.5">
        <h1 className="m-0 text-[30px] font-extrabold tracking-[-0.5px]">{m.signUpTitle}</h1>
        <p className="m-0 text-[15px] text-muted">{m.signUpText}</p>
      </div>
      <FormMessage message={state.message} />
      <Field label={m.fullName} name="name" autoComplete="name" required defaultValue={v.name} error={state.errors?.name} />
      <div className="flex flex-wrap gap-3.5">
        <Field
          className="flex-[1_1_200px]"
          label={m.email}
          name="email"
          type="email"
          autoComplete="email"
          placeholder={m.businessEmailPlaceholder}
          required
          defaultValue={v.email}
          error={state.errors?.email}
        />
        <Field
          className="flex-[1_1_200px]"
          label={m.whatsapp}
          name="whatsapp"
          type="tel"
          autoComplete="tel"
          placeholder="+90 5XX XXX XX XX"
          required
          defaultValue={v.whatsapp}
          error={state.errors?.whatsapp}
        />
      </div>
      <Field
        label={m.website}
        name="siteUrl"
        type="url"
        placeholder="https://your-site.com"
        hint={m.websiteHint}
        defaultValue={v.siteUrl}
        error={state.errors?.siteUrl}
      />
      <PasswordField
        label={m.password}
        name="password"
        autoComplete="new-password"
        hint={m.passwordHint}
        error={state.errors?.password}
        showLabel={m.showPassword}
        hideLabel={m.hidePassword}
      />
      <div className="flex flex-col gap-1.5">
        <label className="flex items-start gap-2.5 text-sm leading-normal text-ink-3">
          <input
            type="checkbox"
            name="terms"
            defaultChecked={v.terms === "on"}
            aria-invalid={state.errors?.terms ? true : undefined}
            aria-describedby={state.errors?.terms ? "f-terms-error" : undefined}
            className="mt-0.5 h-[18px] w-[18px] flex-none accent-midnight"
          />
          <span>
            {richText(m.agree, {
              terms: (chunk) => <Link href={localePath(lang, "/terms")}>{chunk}</Link>,
              privacy: (chunk) => <Link href={localePath(lang, "/privacy")}>{chunk}</Link>,
            })}
          </span>
        </label>
        <FieldError id="f-terms-error" error={state.errors?.terms} />
      </div>
      <SubmitButton className="h-[50px] text-base" pendingText={m.creating}>
        {m.createButton}
      </SubmitButton>
    </form>
  );
}

export function ForgotPasswordForm({ lang = DEFAULT_LANG, m }: FormText) {
  const [state, action] = useActionState(forgotPasswordAction, initialFormState);
  return (
    <form action={action} noValidate className={`${card} max-w-[440px] gap-5`}>
      <LangField lang={lang} />
      <div className="flex flex-col gap-1.5">
        <h1 className="m-0 text-[30px] font-extrabold tracking-[-0.5px]">{m.forgotTitle}</h1>
        <p className="m-0 text-[15px] text-muted">{m.forgotText}</p>
      </div>
      <FormMessage message={state.message} ok={state.ok} />
      <Field
        label={m.email}
        name="email"
        type="email"
        autoComplete="email"
        placeholder={m.emailPlaceholder}
        required
        defaultValue={state.values?.email}
        error={state.errors?.email}
      />
      <SubmitButton className="h-[50px] text-base" pendingText={m.sending}>
        {m.sendLink}
      </SubmitButton>
      <p className="m-0 text-center text-[15px] text-muted">
        {m.remembered}{" "}
        <Link href={localePath(lang, "/sign-in")} className="font-bold">
          {m.signIn}
        </Link>
      </p>
    </form>
  );
}

/** 70 The second step of signing in: the authenticator app's code, or a recovery code. */
export function TwoStepForm({ lang = DEFAULT_LANG, m }: FormText) {
  const [state, action] = useActionState(twoStepSignInAction, initialFormState);
  return (
    <form action={action} noValidate className={`${card} max-w-[440px] gap-5`}>
      <LangField lang={lang} />
      <div className="flex flex-col gap-1.5">
        <h1 className="m-0 text-[30px] font-extrabold tracking-[-0.5px]">{m.codeTitle}</h1>
        <p className="m-0 text-[15px] text-muted">{m.codeText}</p>
      </div>
      <FormMessage message={state.message} ok={state.ok} />
      <Field
        label={m.codeLabel}
        name="code"
        inputMode="text"
        autoComplete="one-time-code"
        autoCapitalize="off"
        spellCheck={false}
        autoFocus
        required
        maxLength={24}
        dir="ltr"
        hint={m.codeHint}
        error={state.errors?.code}
      />
      <SubmitButton className="h-[50px] text-base" pendingText={m.codeVerifying}>
        {m.codeVerify}
      </SubmitButton>
      <p className="m-0 text-center text-[15px]">
        <Link href={localePath(lang, "/sign-in")} className="font-bold">
          {m.codeOther}
        </Link>
      </p>
    </form>
  );
}

export function ResetPasswordForm({ token, lang = DEFAULT_LANG, m }: { token: string } & FormText) {
  const [state, action] = useActionState(resetPasswordAction, initialFormState);
  return (
    <form action={action} noValidate className={`${card} max-w-[440px] gap-5`}>
      <LangField lang={lang} />
      <div className="flex flex-col gap-1.5">
        <h1 className="m-0 text-[30px] font-extrabold tracking-[-0.5px]">{m.resetTitle}</h1>
        <p className="m-0 text-[15px] text-muted">{m.resetText}</p>
      </div>
      <FormMessage message={state.message} ok={state.ok} />
      {state.message ? (
        <Link href={localePath(lang, "/forgot-password")} className="font-bold">
          {m.newLink}
        </Link>
      ) : null}
      <input type="hidden" name="token" value={token} />
      <PasswordField
        label={m.newPassword}
        name="password"
        autoComplete="new-password"
        hint={m.passwordHint}
        error={state.errors?.password ?? state.errors?.token}
        showLabel={m.showPassword}
        hideLabel={m.hidePassword}
      />
      <PasswordField
        label={m.repeatPassword}
        name="confirm"
        autoComplete="new-password"
        error={state.errors?.confirm}
        showLabel={m.showPassword}
        hideLabel={m.hidePassword}
      />
      <SubmitButton className="h-[50px] text-base" pendingText={m.saving}>
        {m.savePassword}
      </SubmitButton>
    </form>
  );
}
