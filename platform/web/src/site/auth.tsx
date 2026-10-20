import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ForgotPasswordForm, ResetPasswordForm, SignInForm, SignUpForm } from "@/app/(auth)/forms";
import { ClearSignedIn } from "@/components/account-link";
import { AuthShell } from "@/components/auth-shell";
import { Icon } from "@/components/icon";
import { LanguageList } from "@/components/language-switcher";
import { languageLabels } from "@/components/site-chrome";
import { btn } from "@/components/ui";
import { getCurrentUser, homeFor } from "@/lib/auth/session";
import { checkResetToken } from "@/lib/auth/reset";
import { getStore } from "@/lib/data";
import { NO_INDEX } from "@/lib/seo";
import { languageAlternates, localePath } from "@/i18n/paths";
import { messagesFor, type Lang } from "@/i18n";

/**
 * 32 Sign-in and account pages, 55 in any language. They stay out of search
 * engines; their language versions are still named for each other. After
 * signing in, people go to their dashboard as before.
 */
export function authMetadata(lang: Lang, page: "signIn" | "signUp" | "forgot" | "reset", path: string): Metadata {
  const m = messagesFor(lang).auth;
  const title = { signIn: m.titleSignIn, signUp: m.titleSignUp, forgot: m.titleForgot, reset: m.titleReset }[page];
  return { title, robots: page === "reset" ? { index: false } : NO_INDEX, alternates: { canonical: localePath(lang, path), languages: languageAlternates(path) } };
}

function Back({ lang, href, label }: { lang: Lang; href: string; label: string }) {
  return (
    <Link href={localePath(lang, href)} className="flex items-center gap-1.5 text-[15px] font-semibold text-ink-3 no-underline hover:text-midnight">
      <Icon name="arrow_back" size={20} />
      {label}
    </Link>
  );
}

export async function SignInPage({ lang }: { lang: Lang }) {
  const user = await getCurrentUser();
  if (user) redirect(await homeFor(user));
  const m = messagesFor(lang).auth;
  return (
    <AuthShell lang={lang} languages aside={<Back lang={lang} href="/" label={m.backHome} />}>
      {/* 62 Nobody is signed in here: a "signed in" cookie left by a session that ended goes. */}
      <ClearSignedIn />
      <main className="flex flex-1 items-center justify-center px-4 pt-8 pb-14 sm:px-6">
        <SignInForm lang={lang} m={m} />
      </main>
    </AuthShell>
  );
}

export async function SignUpPage({ lang }: { lang: Lang }) {
  const user = await getCurrentUser();
  if (user) redirect(await homeFor(user));
  const m = messagesFor(lang).auth;
  const steps = [
    { title: m.next1Title, text: m.next1Text },
    { title: m.next2Title, text: m.next2Text },
    { title: m.next3Title, text: m.next3Text },
  ];
  return (
    <AuthShell
      footer={false}
      lang={lang}
      aside={
        <span className="flex flex-wrap items-center gap-x-6 gap-y-2 text-[15px] text-muted">
          <LanguageList lang={lang} labels={languageLabels(lang)} />
          <span>
            {m.haveAccount}{" "}
            <Link href={localePath(lang, "/sign-in")} className="font-bold">
              {m.signIn}
            </Link>
          </span>
        </span>
      }
    >
      <main className="mx-auto flex w-full max-w-[1060px] flex-1 flex-wrap items-stretch gap-6 px-4 pt-6 pb-14 sm:px-6">
        <SignUpForm lang={lang} m={m} />
        <aside aria-labelledby="h-next" className="on-dark flex flex-[2_1_300px] flex-col gap-6 rounded-[20px] bg-midnight px-5 py-8 text-night-text sm:px-8 sm:py-9">
          <h2 id="h-next" className="m-0 text-[22px] font-extrabold text-ivory">
            {m.nextTitle}
          </h2>
          <ol className="m-0 flex list-none flex-col gap-[22px] p-0">
            {steps.map((step, index) => (
              <li key={step.title} className="flex gap-3.5">
                <span
                  className={`flex h-8 w-8 flex-none items-center justify-center rounded-full font-extrabold ${index === 0 ? "bg-ember text-midnight" : "bg-night-2 text-ivory"}`}
                >
                  {index + 1}
                </span>
                <div className="flex flex-col gap-1">
                  <span className="text-base font-bold text-ivory">{step.title}</span>
                  <span className="text-sm leading-normal">{step.text}</span>
                </div>
              </li>
            ))}
          </ol>
        </aside>
      </main>
    </AuthShell>
  );
}

export function ForgotPasswordPage({ lang }: { lang: Lang }) {
  const m = messagesFor(lang).auth;
  return (
    <AuthShell lang={lang} languages aside={<Back lang={lang} href="/sign-in" label={m.backSignIn} />}>
      <main className="flex flex-1 items-center justify-center px-4 pt-8 pb-14 sm:px-6">
        <ForgotPasswordForm lang={lang} m={m} />
      </main>
    </AuthShell>
  );
}

export async function ResetPasswordPage({ lang, token }: { lang: Lang; token: string | string[] | undefined }) {
  const value = typeof token === "string" ? token : "";
  const check = value ? await checkResetToken(await getStore(), value, new Date()) : { ok: false as const, reason: "invalid" as const };
  const m = messagesFor(lang).auth;
  return (
    <AuthShell lang={lang} languages>
      <main className="flex flex-1 items-center justify-center px-4 pt-8 pb-14 sm:px-6">
        {check.ok ? (
          <ResetPasswordForm token={value} lang={lang} m={m} />
        ) : (
          <section className="flex w-full max-w-[440px] flex-col gap-5 rounded-[20px] border border-line bg-white px-5 py-8 sm:px-8 sm:py-9">
            <h1 className="m-0 text-[28px] font-extrabold tracking-[-0.5px]">{check.reason === "expired" ? m.expiredTitle : m.invalidTitle}</h1>
            <p className="m-0 text-[15px] leading-relaxed text-ink-4">{m.linkText}</p>
            <Link href={localePath(lang, "/forgot-password")} className={`${btn.primary} h-[50px]`}>
              {m.newLink}
            </Link>
          </section>
        )}
      </main>
    </AuthShell>
  );
}
