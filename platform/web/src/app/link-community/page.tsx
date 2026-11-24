import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { confirmCommunityLinkAction } from "@/app/actions/community-link";
import { AuthShell } from "@/components/auth-shell";
import { btn } from "@/components/ui";
import { getCurrentUser } from "@/lib/auth/session";
import { APP_RETURN_URL, pendingLink } from "@/lib/community/base/linking";
import { communitySiteUrl } from "@/lib/community/deps";
import { isCommunityLanguage, isRtl, t } from "@/lib/community/i18n";
import { getCommunityStore } from "@/lib/community/store/server";
import type { CommunityLanguage } from "@/lib/community/types";

export const metadata: Metadata = { title: "Link to Yallapp Community", robots: { index: false } };

/**
 * 231 yallapp.com.tr/link-community?state=…&return=web|app: a Yallapp
 * Community member links their Yallapp account (lib/community/base/linking.ts).
 * Signed in to Yallapp, they confirm "Link my account"; signed out, they
 * sign in first and come back here. In the member's language.
 */
export default async function LinkCommunityPage({ searchParams }: PageProps<"/link-community">) {
  const params = await searchParams;
  const one = (key: string) => (typeof params[key] === "string" ? (params[key] as string) : "");
  const back = one("return") === "app" ? "app" : "web";
  const done = one("done");
  const error = one("error");

  if (done || error) {
    const lang: CommunityLanguage = isCommunityLanguage(one("lang")) ? (one("lang") as CommunityLanguage) : "en";
    const returnUrl = back === "app" ? APP_RETURN_URL : done ? `${communitySiteUrl()}/u/${encodeURIComponent(done)}` : communitySiteUrl();
    return (
      <Card lang={lang} title={t(lang, "link.confirm.title")}>
        <p className="m-0 text-base leading-relaxed text-ink-4" role={error ? "alert" : "status"}>
          {done ? t(lang, "link.done") : t(lang, error === "already_linked" ? "error.already_linked" : "error.link_expired")}
        </p>
        <a href={returnUrl} className={`${btn.primary} h-[50px]`}>
          {t(lang, "link.back")}
        </a>
      </Card>
    );
  }

  const state = one("state");
  const user = await getCurrentUser();
  if (!user) redirect(`/api/community-link/sign-in?state=${encodeURIComponent(state)}&return=${back}`);
  const pending = await pendingLink(await getCommunityStore(), state, new Date());
  if (!pending.ok) {
    return (
      <Card lang="en" title={t("en", "link.confirm.title")}>
        <p className="m-0 text-base leading-relaxed text-ink-4" role="alert">
          {t("en", "error.link_expired")}
        </p>
        <a href={communitySiteUrl()} className={`${btn.secondary} h-[50px]`}>
          {t("en", "link.back")}
        </a>
      </Card>
    );
  }
  const { member } = pending;
  const lang = member.language;
  return (
    <Card lang={lang} title={t(lang, "link.confirm.title")}>
      <p className="m-0 text-base leading-relaxed text-ink-4">{t(lang, "link.confirm.body", { name: member.displayName, username: member.username })}</p>
      <p className="m-0 text-sm font-semibold">{t(lang, "link.confirm.warning")}</p>
      <p className="m-0 text-sm text-ink-4">{t(lang, "link.signedInAs", { name: user.name, email: user.email })}</p>
      <form action={confirmCommunityLinkAction} className="flex flex-col gap-3">
        <input type="hidden" name="state" value={state} />
        <input type="hidden" name="return" value={back} />
        <button type="submit" className={`${btn.primary} h-[50px] w-full cursor-pointer`}>
          {t(lang, "link.confirm.button")}
        </button>
      </form>
    </Card>
  );
}

function Card({ lang, title, children }: { lang: CommunityLanguage; title: string; children: React.ReactNode }) {
  return (
    <AuthShell footer={false} lang={lang}>
      <main lang={lang} dir={isRtl(lang) ? "rtl" : "ltr"} className="flex flex-1 items-center justify-center px-4 pt-6 pb-14 sm:px-6">
        <section className="flex w-full max-w-[520px] flex-col gap-5 rounded-[20px] border border-line bg-white px-5 py-10 sm:px-9">
          <h1 className="m-0 text-[26px] font-extrabold tracking-[-0.5px]">{title}</h1>
          {children}
        </section>
      </main>
    </AuthShell>
  );
}
