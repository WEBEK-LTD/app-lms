import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth-shell";
import { DashboardI18n, DocumentLang } from "@/components/dashboard-i18n";
import { Icon } from "@/components/icon";
import { SignOutButton } from "@/components/sign-out";
import { dashboardMessages, knownEnglish } from "@/i18n/dashboard";
import { getAdminRole, getClientContext, getCurrentUser, signInPath } from "@/lib/auth/session";
import { dashboardText } from "@/lib/dashboard-lang";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await dashboardText()).t("setup.startTitle"), robots: { index: false } };
}

/**
 * 121 Where a new account starts: it is active from the start, so the
 * person chooses how to make their app, with the regular editor (the app
 * types, their content and pages) or in Yallapp Studio (every screen
 * designed, from a demo). Someone who already has an app goes to it; a
 * suspended account to the page that says so.
 */
export default async function StartPage() {
  const user = await getCurrentUser();
  if (!user) redirect(await signInPath());
  if (await getAdminRole()) redirect("/admin");
  const context = await getClientContext();
  if (!context || context.client.status !== "active") redirect("/pending");
  if (context.apps.length) redirect(context.app?.section === "studio" ? "/studio" : "/dashboard");
  const { t, lang, dir } = await dashboardText();
  const choices: { href: string; icon: "dashboard" | "palette"; title: string; text: string; key: string }[] = [
    { href: "/dashboard/app-type", icon: "dashboard", title: t("setup.startEditor"), text: t("setup.startEditorText"), key: "editor" },
    { href: "/studio/new", icon: "palette", title: t("setup.startStudio"), text: t("setup.startStudioText"), key: "studio" },
  ];
  return (
    <DashboardI18n lang={lang} messages={dashboardMessages(lang)} knownEnglish={lang === "en" ? {} : knownEnglish()}>
      <DocumentLang lang={lang} />
      <AuthShell
        footer={false}
        lang={lang}
        aside={
          <span lang={lang} dir={dir} className="flex flex-wrap items-center gap-1 text-sm text-muted">
            <span className="break-all" dir="ltr">
              {user.email}
            </span>{" "}
            ·
            <SignOutButton className="cursor-pointer border-0 bg-transparent p-0 font-semibold text-accent hover:text-accent-hover hover:underline">{t("nav.signOut")}</SignOutButton>
          </span>
        }
      >
        <main lang={lang} dir={dir} className="flex flex-1 items-center justify-center px-4 pt-6 pb-14 sm:px-6">
          <section className="flex w-full max-w-[760px] flex-col gap-6">
            <div className="flex flex-col gap-2">
              <h1 className="m-0 text-[28px] font-extrabold tracking-[-0.5px]">{t("setup.startTitle")}</h1>
              <p className="m-0 text-base leading-relaxed text-ink-4">{t("setup.startText")}</p>
            </div>
            <ul aria-label={t("setup.startTitle")} className="m-0 grid list-none grid-cols-1 gap-4 p-0 sm:grid-cols-2">
              {choices.map((c) => (
                <li key={c.key}>
                  <Link
                    href={c.href}
                    data-start={c.key}
                    className="flex h-full flex-col gap-3 rounded-[20px] border border-line bg-white px-5 py-6 text-ink no-underline transition-[border-color,box-shadow] hover:border-line-strong hover:shadow-[0_20px_40px_-28px_rgba(14,13,36,0.35)] sm:px-6"
                  >
                    <span className="flex h-12 w-12 items-center justify-center rounded-full bg-peach text-accent">
                      <Icon name={c.icon} size={26} />
                    </span>
                    <span className="text-[19px] font-extrabold">{c.title}</span>
                    <span className="text-[15px] leading-relaxed text-ink-4">{c.text}</span>
                    <span className="mt-auto flex items-center gap-1 pt-1 font-bold text-accent">
                      {t("setup.startChoose")}
                      <Icon name={dir === "rtl" ? "arrow_back" : "arrow_forward"} size={18} />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        </main>
      </AuthShell>
    </DashboardI18n>
  );
}
