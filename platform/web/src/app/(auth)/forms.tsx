"use client";

import Link from "next/link";
import { useActionState } from "react";
import { forgotPasswordAction, resetPasswordAction, signInAction, signUpAction } from "@/app/actions/auth";
import { Field, FieldError, FormMessage, PasswordField, SubmitButton } from "@/components/form";
import { initialFormState } from "@/lib/forms";

const card = "flex w-full flex-col rounded-[20px] border border-line bg-white px-5 py-8 sm:px-8 sm:py-9";

export function SignInForm({ notice }: { notice?: string }) {
  const [state, action] = useActionState(signInAction, initialFormState);
  return (
    <form action={action} noValidate className={`${card} max-w-[440px] gap-5`}>
      <div className="flex flex-col gap-1.5">
        <h1 className="m-0 text-[30px] font-extrabold tracking-[-0.5px]">Sign in</h1>
        <p className="m-0 text-[15px] text-muted">Manage your apps, builds and license.</p>
      </div>
      {notice && !state.message ? <FormMessage ok message={notice} /> : null}
      <FormMessage message={state.message} ok={state.ok} />
      <Field
        label="Email"
        name="email"
        type="email"
        autoComplete="email"
        placeholder="you@academy.com"
        required
        defaultValue={state.values?.email}
        error={state.errors?.email}
      />
      <PasswordField
        label="Password"
        name="password"
        autoComplete="current-password"
        error={state.errors?.password}
        aside={
          <Link href="/forgot-password" className="text-sm font-semibold no-underline hover:underline">
            Forgot password?
          </Link>
        }
      />
      <SubmitButton className="h-[50px] text-base" pendingText="Signing in…">
        Sign in
      </SubmitButton>
      <p className="m-0 text-center text-[15px] text-muted">
        New to Yallapp?{" "}
        <Link href="/sign-up" className="font-bold">
          Create an account
        </Link>
      </p>
    </form>
  );
}

export function SignUpForm() {
  const [state, action] = useActionState(signUpAction, initialFormState);
  const v = state.values ?? {};
  return (
    <form action={action} noValidate className={`${card} min-w-0 flex-[3_1_420px] gap-[18px]`}>
      <div className="flex flex-col gap-1.5">
        <h1 className="m-0 text-[30px] font-extrabold tracking-[-0.5px]">Create your account</h1>
        <p className="m-0 text-[15px] text-muted">Tell us about you and your academy.</p>
      </div>
      <FormMessage message={state.message} />
      <Field label="Full name" name="name" autoComplete="name" required defaultValue={v.name} error={state.errors?.name} />
      <div className="flex flex-wrap gap-3.5">
        <Field
          className="flex-[1_1_200px]"
          label="Email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="you@academy.com"
          required
          defaultValue={v.email}
          error={state.errors?.email}
        />
        <Field
          className="flex-[1_1_200px]"
          label="WhatsApp number"
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
        label="Your WordPress website"
        name="siteUrl"
        type="url"
        placeholder="https://your-academy.com"
        required
        defaultValue={v.siteUrl}
        error={state.errors?.siteUrl}
      />
      <PasswordField label="Password" name="password" autoComplete="new-password" hint="At least 10 characters." error={state.errors?.password} />
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
            I agree to the <Link href="/terms">Terms of service</Link> and have read the <Link href="/privacy">Privacy policy</Link>. I’m signing up for my business.
          </span>
        </label>
        <FieldError id="f-terms-error" error={state.errors?.terms} />
      </div>
      <SubmitButton className="h-[50px] text-base" pendingText="Creating your account…">
        Create account
      </SubmitButton>
    </form>
  );
}

export function ForgotPasswordForm() {
  const [state, action] = useActionState(forgotPasswordAction, initialFormState);
  return (
    <form action={action} noValidate className={`${card} max-w-[440px] gap-5`}>
      <div className="flex flex-col gap-1.5">
        <h1 className="m-0 text-[30px] font-extrabold tracking-[-0.5px]">Reset your password</h1>
        <p className="m-0 text-[15px] text-muted">Enter your account email and we’ll send you a link to choose a new password.</p>
      </div>
      <FormMessage message={state.message} ok={state.ok} />
      <Field
        label="Email"
        name="email"
        type="email"
        autoComplete="email"
        placeholder="you@academy.com"
        required
        defaultValue={state.values?.email}
        error={state.errors?.email}
      />
      <SubmitButton className="h-[50px] text-base" pendingText="Sending…">
        Send reset link
      </SubmitButton>
      <p className="m-0 text-center text-[15px] text-muted">
        Remembered it? <Link href="/sign-in" className="font-bold">Sign in</Link>
      </p>
    </form>
  );
}

export function ResetPasswordForm({ token }: { token: string }) {
  const [state, action] = useActionState(resetPasswordAction, initialFormState);
  return (
    <form action={action} noValidate className={`${card} max-w-[440px] gap-5`}>
      <div className="flex flex-col gap-1.5">
        <h1 className="m-0 text-[30px] font-extrabold tracking-[-0.5px]">Choose a new password</h1>
        <p className="m-0 text-[15px] text-muted">You’ll be signed in on this device and signed out everywhere else.</p>
      </div>
      <FormMessage message={state.message} ok={state.ok} />
      {state.message ? (
        <Link href="/forgot-password" className="font-bold">
          Ask for a new link
        </Link>
      ) : null}
      <input type="hidden" name="token" value={token} />
      <PasswordField label="New password" name="password" autoComplete="new-password" hint="At least 10 characters." error={state.errors?.password ?? state.errors?.token} />
      <PasswordField label="Repeat the new password" name="confirm" autoComplete="new-password" error={state.errors?.confirm} />
      <SubmitButton className="h-[50px] text-base">Save password and sign in</SubmitButton>
    </form>
  );
}
