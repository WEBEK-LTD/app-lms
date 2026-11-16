import type { Metadata } from "next";
import { AccountDeletion } from "@/components/account-deletion";
import { AccountCountryForm } from "@/components/account-country";
import { MarketingEmails } from "@/components/marketing-emails";
import { getStore } from "@/lib/data";
import { marketingAllowed } from "@/lib/mailing/consent";
import { COUNTRY_MESSAGES, countryName, countryOptions } from "@/lib/account/country";
import { SignOutEverywhere, TwoStepSettings } from "@/components/two-step-settings";
import { KitCallout, KitHeader, KitHero, KitPage, KitSettingRow, KitSettings, KitStatus } from "@/components/studio-page";
import { requireClient } from "@/lib/auth/session";
import { dashboardText } from "@/lib/dashboard-lang";
import type { DashKey } from "@/i18n/dashboard";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await dashboardText()).t("account.title") };
}

/**
 * 66 Your account: who is signed in, and "Delete your Yallapp account"
 * (the owner asks; a team member is told to ask the owner). Pending and
 * suspended accounts find the same request on the waiting page. 70 Two-step
 * sign-in and "Sign out of all devices" for the signed-in person (the owner
 * or a team member; our team manages its own in the admin). 73 The
 * account's country, which the owner sets (52.9). 114 Yallapp's marketing
 * emails on or off.
 */
export default async function AccountPage({ searchParams }: PageProps<"/dashboard/account">) {
  const context = await requireClient("dashboard");
  const { t, k, lang } = await dashboardText();
  const me = context.member ?? context.user;
  const query = await searchParams;
  const done = typeof query.deletion === "string" ? query.deletion : null;
  const phones = Number(typeof query.phones === "string" ? query.phones : 0) || 0;
  const role = context.member ? t(`team.roles.${context.access.role}` as DashKey) : null;
  // 132.133 The premium kit: who is signed in in one hero card, then every setting as a row (a pill, one action, its explanation behind "?").
  return (
    <KitPage>
      <KitHeader icon="account_circle" title={t("account.title")} description={t("account.intro")} />
      <KitHero label={t("account.signedInAs")}>
        <div className="flex min-w-0 flex-wrap items-center gap-x-5 gap-y-3">
          <span aria-hidden="true" className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-midnight text-[26px] font-bold text-ivory">
            {(me.name.trim()[0] ?? "?").toUpperCase()}
          </span>
          <span className="flex min-w-0 flex-[1_1_220px] flex-col gap-1">
            <span className="text-[13px] font-semibold text-(--sp-muted)">{t("account.signedInAs")}</span>
            <span className="text-[22px] leading-tight font-bold break-words text-(--sp-ink)">{me.name}</span>
            <span className="text-[15px] text-(--sp-muted)">
              <bdi dir="ltr">{me.email}</bdi>
            </span>
          </span>
          {role ? <KitStatus tone="info">{role}</KitStatus> : null}
        </div>
      </KitHero>
      {query.twostep === "off" ? (
        <KitCallout tone="success" icon="check_circle" role="status">
          {t("security.known.turnedOff")}
        </KitCallout>
      ) : null}
      <KitSettings>
        {context.staff ? (
          <div className="py-6">
            <KitCallout icon="shield">{t("security.known.staffOwn")}</KitCallout>
          </div>
        ) : (
          <>
            <TwoStepSettings user={me} from="dashboard" t={t} lang={lang} setup={query.setup === "1"} look="row" />
            <SignOutEverywhere t={t} look="row" />
          </>
        )}
        {/* 73 The account's country (52.9): prices, our WhatsApp number, receipts. */}
        <KitSettingRow
          titleId="h-country"
          id="h-country-row"
          icon="public"
          title={t("account.countryTitle")}
          status={<KitStatus tone={context.client.country ? "info" : "neutral"}>{context.client.country ? countryName(context.client.country, lang) : t("studioPage.notSet")}</KitStatus>}
          description={context.member ? k(COUNTRY_MESSAGES.owner) : undefined}
          help={
            <>
              {context.client.country ? null : <span className="mb-1 block font-semibold">{t("account.countryNone")}</span>}
              {t("account.countryText")}
            </>
          }
          helpLabel={t("studioPage.helpSection")}
        >
          <AccountCountryForm current={context.client.country ?? null} options={countryOptions(lang)} readOnly={context.member !== null} />
        </KitSettingRow>
        {/* 114 Yallapp's marketing emails, for the signed-in person's own address. */}
        <MarketingEmails allowed={await marketingAllowed(await getStore(), me.email)} lang={lang} readOnly={context.staff !== null} look="row" />
        <AccountDeletion context={context} from="account" done={done} phones={phones} look="row" />
      </KitSettings>
    </KitPage>
  );
}
