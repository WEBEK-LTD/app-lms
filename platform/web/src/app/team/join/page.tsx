import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell } from "@/components/auth-shell";
import { DashboardI18n, DocumentLang } from "@/components/dashboard-i18n";
import { btn } from "@/components/ui";
import { messagesFor, type Lang } from "@/i18n";
import { LANG_INFO } from "@/i18n/config";
import { dashboardMessages, getDashT, knownEnglish, type DashKey } from "@/i18n/dashboard";
import { localePath } from "@/i18n/paths";
import { getStore } from "@/lib/data";
import { dashboardText } from "@/lib/dashboard-lang";
import { businessName, invitationForToken } from "@/lib/team/service";
import { JoinForm } from "./form";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await dashboardText()).t("team.join.metaTitle"), robots: { index: false } };
}

/**
 * 60 The page an invitation's email opens (`/team/join?token=…`), in the
 * invitation's language: who invited whom to which business and as what,
 * then joining with a new password, or with the password of the Yallapp
 * account the email already has. Expired, used and unknown links say so.
 */
export default async function JoinTeamPage({ searchParams }: PageProps<"/team/join">) {
  const raw = (await searchParams).token;
  const token = typeof raw === "string" ? raw : "";
  const store = await getStore();
  const check = await invitationForToken(store, token, new Date());
  const fallback = (await dashboardText()).lang;
  const lang: Lang = check.ok && ["en", "ar", "tr"].includes(check.invitation.lang) ? (check.invitation.lang as Lang) : fallback;
  const t = getDashT(lang);
  const site = messagesFor(lang).auth;
  const dir = LANG_INFO[lang].dir;

  let body: React.ReactNode;
  if (!check.ok) {
    body = (
      <>
        <h1 className="m-0 text-[28px] font-extrabold tracking-[-0.5px]">{t("team.join.metaTitle")}</h1>
        <p className="m-0 text-base leading-relaxed text-ink-4" role="status">
          {t(`team.join.${check.reason}` as DashKey)}
        </p>
        <Link href={localePath(lang, "/sign-in")} className={`${btn.primary} h-[50px]`}>
          {t("team.join.signIn")}
        </Link>
      </>
    );
  } else {
    const { invitation, owner, apps, existing } = check;
    const inviter = (await store.getUserById(invitation.invitedBy))?.name ?? owner.name;
    const business = businessName(owner, invitation.appIds ? apps.filter((a) => invitation.appIds!.includes(a.id)) : apps);
    const hasPassword = Boolean(existing?.passwordHash);
    body = (
      <>
        <div className="flex flex-col gap-2">
          <h1 className="m-0 text-[28px] font-extrabold tracking-[-0.5px] break-words">{t("team.join.title", { business })}</h1>
          <p className="m-0 text-base leading-relaxed text-ink-4">{t("team.join.invited", { inviter, role: t(`team.roles.${invitation.role}` as DashKey) })}</p>
          <p className="m-0 text-sm text-muted">{t(`team.roleText.${invitation.role}` as DashKey)}</p>
        </div>
        <div className="flex flex-col gap-1.5">
          <h2 className="m-0 text-lg font-bold">{hasPassword ? t("team.join.existingTitle") : t("team.join.newTitle")}</h2>
          <p className="m-0 text-sm text-ink-4">{hasPassword ? t("team.join.existingText", { email: invitation.email }) : t("team.join.newText", { email: invitation.email })}</p>
        </div>
        <JoinForm
          token={token}
          existing={hasPassword}
          words={{
            yourName: t("team.join.yourName"),
            password: t("team.join.password"),
            confirm: t("team.join.confirm"),
            submit: t("team.join.submit"),
            show: site.showPassword,
            hide: site.hidePassword,
            pending: t("common.saving"),
            forgot: (
              <Link href={localePath(lang, "/forgot-password")} className="text-sm font-semibold">
                {t("team.join.forgot")}
              </Link>
            ),
          }}
        />
      </>
    );
  }
  return (
    <DashboardI18n lang={lang} messages={dashboardMessages(lang)} knownEnglish={lang === "en" ? {} : knownEnglish()}>
      <DocumentLang lang={lang} />
      <AuthShell footer={false} lang={lang}>
        <main lang={lang} dir={dir} className="flex flex-1 items-center justify-center px-4 pt-6 pb-14 sm:px-6">
          <section className="flex w-full max-w-[520px] flex-col gap-5 rounded-[20px] border border-line bg-white px-5 py-10 sm:px-9">{body}</section>
        </main>
      </AuthShell>
    </DashboardI18n>
  );
}
