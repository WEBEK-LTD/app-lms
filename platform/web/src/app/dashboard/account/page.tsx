import type { Metadata } from "next";
import { AccountDeletion } from "@/components/account-deletion";
import { SignOutEverywhere, TwoStepSettings } from "@/components/two-step-settings";
import { Notice, PageHeader } from "@/components/ui";
import { requireClient } from "@/lib/auth/session";
import { dashboardText } from "@/lib/dashboard-lang";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await dashboardText()).t("account.title") };
}

/**
 * 66 Your account: who is signed in, and "Delete your Yallapp account"
 * (the owner asks; a team member is told to ask the owner). Pending and
 * suspended accounts find the same request on the waiting page. 70 Two-step
 * sign-in and "Sign out of all devices" for the signed-in person (the owner
 * or a team member; our team manages its own in the admin).
 */
export default async function AccountPage({ searchParams }: PageProps<"/dashboard/account">) {
  const context = await requireClient("dashboard");
  const { t, lang } = await dashboardText();
  const me = context.member ?? context.user;
  const query = await searchParams;
  const done = typeof query.deletion === "string" ? query.deletion : null;
  const phones = Number(typeof query.phones === "string" ? query.phones : 0) || 0;
  return (
    <>
      <PageHeader title={t("account.title")} description={t("account.intro")} />
      <section aria-label={t("account.signedInAs")} className="flex max-w-[720px] flex-col gap-1 rounded-2xl border border-line bg-white px-5 py-4 sm:px-6">
        <span className="text-sm text-muted">{t("account.signedInAs")}</span>
        <span className="font-bold text-midnight">{me.name}</span>
        <span className="text-[15px] text-ink-3">
          <bdi dir="ltr">{me.email}</bdi>
        </span>
      </section>
      {query.twostep === "off" ? (
        <div className="max-w-[720px]">
          <Notice tone="success" icon="check_circle" role="status">
            {t("security.known.turnedOff")}
          </Notice>
        </div>
      ) : null}
      {context.staff ? (
        <div className="max-w-[720px]">
          <Notice tone="neutral" icon="shield">
            {t("security.known.staffOwn")}
          </Notice>
        </div>
      ) : (
        <>
          <TwoStepSettings user={me} from="dashboard" t={t} lang={lang} setup={query.setup === "1"} />
          <SignOutEverywhere t={t} />
        </>
      )}
      <AccountDeletion context={context} from="account" done={done} phones={phones} />
    </>
  );
}
