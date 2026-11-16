import type { Metadata } from "next";
import Link from "next/link";
import { KitCallout, KitFold, KitGroup, KitHeader, KitPage, KitSection, KitSettingRow, KitSettings, KitStatus, kit } from "@/components/studio-page";
import { localePath } from "@/i18n/paths";
import { richText } from "@/i18n/rich";
import { dashboardText, type DashboardText } from "@/lib/dashboard-lang";
import { requireClient } from "@/lib/auth/session";
import { getStore } from "@/lib/data";
import type { ApiWebhook, App } from "@/lib/data/types";
import { WEBHOOK_PATH, webhookStateText, webhookUrl } from "@/lib/hosted/api-webhooks";
import { appMailFormValues } from "@/lib/email/app-mail";
import { appUrl, isProduction } from "@/lib/env";
import { platformDefinition } from "@/lib/hosted/connectors/registry";
import { hostedSettings } from "@/lib/hosted/service";
import { hostedSettingsValues } from "@/lib/hosted/settings-form";
import { chosenEmailSignIn, chosenSignInMethods, emailSignInNote, emailSignInPossible, hostedSignInMethods, passwordSignIn, passwordSignInPossible, signInMethodsChoice } from "@/lib/hosted/sign-in-methods";
import { signedInPath } from "@/lib/app/api-check";
import { jwksUrl, tokenIssuer, yallappSignsIn } from "@/lib/hosted/app-auth";
import { hostedApiUrl } from "@/lib/hosted/urls";
import { AppMailForms, AppSignInForm, AppWhatsappForms, DeveloperTokens, ResendWebhookForm, SignInMethodsForm, SignInProviderForm, StudioSignInForm } from "./forms";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await dashboardText()).t("signin.title") };
}

const GUIDE_DOC = "/docs/my-own-api";
const GUIDE_SIGN_IN = "#the-sign-in-flow-simply";

/** 19 What an own API's /config said at the last API check, in words. */
function advertised(signIn: NonNullable<NonNullable<App["hostedSettings"]>["apiSignIn"]>, { t }: DashboardText): string[] {
  const lines: string[] = [];
  if (signIn.methods.includes("phone")) lines.push(t("signin.phoneApi"));
  if (signIn.methods.includes("email")) lines.push(signIn.emailSignIn === "password" ? t("signin.emailPassword") : t("signin.emailApi"));
  lines.push(signIn.previewSignIn ? t("signin.previewYes") : t("signin.previewNo"));
  return lines;
}

/** 56 A saved ISO date ("31 Mar 2027") in the dashboard's language. */
const dayOf = (text: DashboardText, iso: string) => text.date(new Date(iso));

/** 34 Own API apps: their API signs people in, or Yallapp does. 132.136 A settings row, its choice in sight. */
function ProviderSection({ app, text }: { app: App; text: DashboardText }) {
  const yallapp = yallappSignsIn(app);
  return (
    <KitSettingRow
      titleId="h-provider"
      icon="key"
      title={text.t("signin.whoSigns")}
      status={<KitStatus tone="info">{yallapp ? text.t("signin.providerYallapp") : text.t("signin.providerApi")}</KitStatus>}
    >
      <SignInProviderForm current={yallapp ? "yallapp" : "api"} />
    </KitSettingRow>
  );
}

/** 34 For the developer of the own API: the keys, the claims to check, a test token. */
function DeveloperSection({ app, webhooks, text }: { app: App; webhooks: ApiWebhook[]; text: DashboardText }) {
  const { t, k, lang } = text;
  const path = signedInPath(app.appType);
  return (
    <KitSection titleId="h-developer" title={t("signin.forDeveloper")}>
      <DeveloperTokens
        jwksUrl={jwksUrl(appUrl(), app.id)}
        issuer={tokenIssuer(appUrl())}
        audience={app.id}
        authBaseUrl={hostedApiUrl(appUrl(), app.id)}
        tryUrl={path && app.apiBaseUrl ? `${app.apiBaseUrl.replace(/\/+$/, "")}${path}` : null}
      />
      {/* 49 Account deletions sent to the client's API, signed, with their last try. */}
      <div className="flex flex-col gap-2 border-t border-(--sp-line-soft) pt-5" aria-labelledby="h-deletions">
        <h3 id="h-deletions" className="m-0 text-[16px] font-bold">
          {t("signin.deletions")}
        </h3>
        <p className="m-0 text-sm leading-relaxed text-(--sp-muted)">
          {richText(t("signin.deletionsText"), {
            code: () => <code dir="ltr">POST {app.apiBaseUrl ? webhookUrl(app.apiBaseUrl) : WEBHOOK_PATH}</code>, // i18n-ok: code
            del: () => <code dir="ltr">DELETE /me</code>, // i18n-ok: code
          })}
        </p>
        {webhooks.length === 0 ? (
          <p className="m-0 text-sm text-(--sp-muted)">{t("signin.noDeletions")}</p>
        ) : (
          <ul className="m-0 flex list-none flex-col p-0 text-[15px]" data-testid="account-deletions">
            {webhooks.map((w) => (
              <li key={w.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-(--sp-line-soft) py-2.5 first:border-t-0">
                <span className="text-(--sp-muted)">{dayOf(text, w.createdAt.toISOString())}</span>
                <span>{richText(t("signin.deletionUser"), { code: () => <code>{w.subject}</code> })}</span>
                <span className={w.status === "delivered" ? "text-success" : w.status === "failed" ? "text-danger" : "text-(--sp-muted)"}>{k(webhookStateText(w))}</span>
                {w.status === "failed" ? <ResendWebhookForm id={w.id} /> : null}
              </li>
            ))}
          </ul>
        )}
        <Link href={localePath(lang, "/docs/my-own-api") + "#account-deletion-notices"} className="text-sm font-semibold underline">
          {t("signin.checkNotice")}
        </Link>
      </div>
    </KitSection>
  );
}

/** 19 Own API apps: the API decides how people sign in; this shows what it said at the last check. */
function CustomApiSignIn({ app, text }: { app: App; text: DashboardText }) {
  const { t, lang } = text;
  const config = { config: () => <code>GET /config</code> }; // i18n-ok: code
  const saved = app.hostedSettings?.apiSignIn ?? null;
  const current = saved && app.apiBaseUrl && saved.baseUrl === app.apiBaseUrl.replace(/\/+$/, "") ? saved : null;
  // 132.136 The premium kit: who signs people in, what the API offers and the app's email as settings rows.
  return (
    <KitPage>
      <KitHeader icon="login" title={t("signin.title")} description={richText(t("signin.customIntro"), { ...config, methods: () => <code>auth.methods</code> })} />
      {/* The same shape as the page below up to "Who signs people in": its form stays in place, with its message, when the choice changes. */}
      <KitGroup title={t("signin.groupSignIn")}>
        <KitSettings>
          <ProviderSection app={app} text={text} />
          <KitSettingRow
            titleId="h-api-sign-in"
            icon="code"
            title={t("signin.apiOffers")}
            description={current ? t("signin.lastCheck", { date: dayOf(text, current.checkedAt) }) : richText(t("signin.runCheck"), config)}
            action={
              <>
                <Link href="/dashboard/setup?step=website" className={kit.row}>
                  {t("signin.checkApi")}
                </Link>
                <Link href={localePath(lang, GUIDE_DOC) + GUIDE_SIGN_IN} className={kit.row}>
                  {t("signin.guideSignIn")}
                </Link>
              </>
            }
          >
            {current ? (
              <ul className="m-0 flex flex-col gap-1.5 ps-5 text-[15px]">
                {advertised(current, text).map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            ) : null}
          </KitSettingRow>
          {/* 24 An own API sends its own emails. */}
          <KitSettingRow titleId="h-app-mail" icon="mail" title={t("signin.appEmail")} description={t("signin.apiOwnEmail")} />
        </KitSettings>
      </KitGroup>
    </KitPage>
  );
}

/** 118 A Studio app's ways as the form's checkboxes: the saved passwords, or the code methods. */
function studioWays(app: App): Record<string, string> {
  const passwords = passwordSignIn(app);
  const codes = passwords ? passwords.codes : hostedSignInMethods(app);
  return {
    ...Object.fromEntries(codes.map((m) => [`code_${m}`, "on"])),
    ...Object.fromEntries((passwords?.by ?? []).map((w) => [`password_${w}`, "on"])),
    recovery: passwords?.recovery ?? (emailSignInPossible(app) ? "email" : "phone"),
  };
}

/** 19 The connected platform's name, for the note that email sign-in is off; null when it has none. */
function sourceName(app: App): string | null {
  if (app.connector?.kind === "shopify") return "Shopify";
  if (app.connector?.kind === "platform") return platformDefinition(app.connector.platform)?.name ?? null;
  return null;
}

/**
 * How people sign in to the app (18: phone, email or both, and the owner's own
 * WhatsApp number) for apps on the hosted API and WordPress apps, and the
 * sign-in rules of apps on the hosted API (WordPress sets those in the plugin).
 */
export default async function AppSignInPage() {
  const { app, client, user } = await requireClient("settings");
  const text = await dashboardText();
  const { t, k } = text;
  // Called, not rendered as its own component: the "Who signs people in" form stays in place (with its message) when the choice changes.
  if (app?.backend === "custom_api" && !yallappSignsIn(app)) return CustomApiSignIn({ app, text });
  // 34 An app on its own API that Yallapp signs people in to has the hosted API's choices.
  const ownApi = app?.backend === "custom_api";
  if (!app || (app.backend !== "hosted" && app.backend !== "wordpress" && app.backend !== "setup_requested" && !ownApi)) {
    return (
      <KitPage>
        <KitHeader
          icon="login"
          title={t("signin.title")}
          description={
            <>
              {t("signin.chooseSourceFirst")} <Link href="/dashboard/setup">{t("signin.backToSetup")}</Link>
            </>
          }
        />
      </KitPage>
    );
  }
  // 19 An app waiting for the WordPress site our team sets up chooses now; it applies once the site is ready.
  const waiting = app.backend === "setup_requested";
  const wordpress = app.backend === "wordpress" || waiting;
  const methods = wordpress ? (chosenSignInMethods(app) ?? ["phone"]) : hostedSignInMethods(app);
  const sender = app.hostedSettings?.whatsappSender ?? null;
  const failedAt = sender ? (app.hostedSettings?.whatsappFailedAt ?? null) : null;
  // 24 The owner's own email server, and its last failure.
  const mailServer = app.hostedSettings?.mailServer ?? null;
  const mailFailedAt = mailServer ? (app.hostedSettings?.mailFailedAt ?? null) : null;
  // 19 Email chosen, but the content now comes from a platform that finds customers by phone.
  const emailOff = !wordpress && !emailSignInPossible(app) && (chosenSignInMethods(app) ?? []).includes("email");
  const emailOnlyUsers = emailOff ? await (await getStore()).countHostedEmailOnlyUsers(app.id) : 0;
  const source = sourceName(app);
  const note = emailSignInNote(app);
  const studio = !wordpress && passwordSignInPossible(app);
  const ways = studio ? Object.entries(studioWays(app)).filter(([name, on]) => name !== "recovery" && on === "on").length : 0;
  const choice = signInMethodsChoice(methods);
  const rules = wordpress ? null : hostedSettingsValues(hostedSettings(app));
  // 132.136 The premium kit: how people sign in, its choice in sight; the rules, the WhatsApp number and the email each a row with its state as a pill, their forms folded.
  return (
    <KitPage>
      <KitHeader icon="login" title={t("signin.title")} description={wordpress ? t("signin.introWordpress") : ownApi ? t("signin.introOwnApi") : t("signin.introHosted")} />
      {ownApi ? (
        <KitGroup title={t("signin.groupApi")}>
          <KitSettings>
            <ProviderSection app={app} text={text} />
          </KitSettings>
          <DeveloperSection app={app} webhooks={await (await getStore()).listApiWebhooks(app.id, 20, ["account.deleted"])} text={text} />
        </KitGroup>
      ) : null}
      {waiting ? <KitCallout icon="hourglass_top">{t("signin.waiting")}</KitCallout> : null}

      {emailOff ? (
        <KitCallout tone="warn" icon="warning">
          {source ? t("signin.emailOffNamed", { source }) : t("signin.emailOffUnnamed")}
          {emailOnlyUsers > 0 ? ` ${t("signin.emailOnlyUsers", { count: emailOnlyUsers })}` : ""}{" "}
          {richText(t("signin.emailAgain"), { link: (chunk) => <Link href="/dashboard/setup?step=website">{chunk}</Link> })}
        </KitCallout>
      ) : null}

      <KitGroup title={t("signin.groupSignIn")}>
        <KitSettings>
          <KitSettingRow
            titleId="h-methods"
            icon="login"
            title={t("signin.howSignIn")}
            status={<KitStatus tone="info">{studio ? t("studioPage.signinWays", { count: ways }) : t(choice === "both" ? "studioPage.signinBoth" : choice === "email" ? "studioPage.signinEmail" : "studioPage.signinPhone")}</KitStatus>}
          >
            {/* 118 Yallapp Studio apps: codes and passwords, any of them. */}
            {studio ? (
              <StudioSignInForm current={studioWays(app)} emailPossible={emailSignInPossible(app)} note={note ? k(note) : null} />
            ) : (
              <SignInMethodsForm
                current={choice}
                wordpress={wordpress}
                emailPossible={emailSignInPossible(app)}
                note={note ? k(note) : null}
                chosen={wordpress ? chosenSignInMethods(app) !== null : true}
                emailWay={chosenEmailSignIn(app) ?? "password"}
                emailWayChosen={chosenEmailSignIn(app) !== null}
              />
            )}
          </KitSettingRow>

          {rules ? (
            <KitSettingRow
              titleId="h-rules"
              icon="tune"
              title={t("signin.rules")}
              status={rules.signupAllowed === "on" ? <KitStatus tone="success">{t("studioPage.signupsOpen")}</KitStatus> : <KitStatus tone="neutral">{t("studioPage.signupsClosed")}</KitStatus>}
              description={t("studioPage.rulesLine")}
            >
              <KitFold summary={t("studioPage.rulesOpen")} icon="tune" data-fold="rules">
                <AppSignInForm current={rules} emailOnly={methods.length === 1 && methods[0] === "email"} />
              </KitFold>
            </KitSettingRow>
          ) : null}
        </KitSettings>
      </KitGroup>

      <KitGroup title={t("signin.groupCodes")}>
        <KitSettings>
          <KitSettingRow
            titleId="h-whatsapp"
            icon="chat"
            title={t("signin.whatsappTitle")}
            status={failedAt ? <KitStatus tone="warn">{t("studioPage.failed")}</KitStatus> : sender ? <KitStatus tone="success">{t("studioPage.ownNumber")}</KitStatus> : <KitStatus tone="neutral">{t("studioPage.yallappNumber")}</KitStatus>}
          >
            {failedAt ? (
              <KitCallout tone="warn" icon="warning" role="status">
                {t("signin.whatsappFailed", { date: dayOf(text, failedAt) })}
              </KitCallout>
            ) : null}
            <AppWhatsappForms
              connected={sender ? { keyLast4: sender.keyLast4, instanceId: sender.instanceId } : null}
              defaultPhone={client.whatsapp ?? ""}
              wordpress={wordpress}
              fold={{ summary: sender ? t("studioPage.whatsappChange") : t("studioPage.whatsappOwn"), open: failedAt !== null }}
            />
          </KitSettingRow>

          <KitSettingRow
            titleId="h-app-mail"
            icon="mail"
            title={t("signin.appEmail")}
            status={mailFailedAt ? <KitStatus tone="warn">{t("studioPage.failed")}</KitStatus> : mailServer ? <KitStatus tone="success">{t("studioPage.ownServer")}</KitStatus> : <KitStatus tone="neutral">{t("studioPage.yallappAddress")}</KitStatus>}
          >
            {mailFailedAt ? (
              <KitCallout tone="warn" icon="warning" role="status">
                {app.hostedSettings?.mailFailedReason
                  ? t("signin.mailFailedReason", { date: dayOf(text, mailFailedAt), reason: k(app.hostedSettings.mailFailedReason) })
                  : t("signin.mailFailed", { date: dayOf(text, mailFailedAt) })}
              </KitCallout>
            ) : null}
            <AppMailForms
              current={appMailFormValues(app)}
              saved={mailServer ? { host: mailServer.host, username: mailServer.username, fromName: mailServer.fromName, fromAddress: mailServer.fromAddress } : null}
              defaultTestTo={user.email}
              production={isProduction()}
              wordpress={wordpress}
              fold={{ summary: mailServer ? t("studioPage.mailChange") : t("studioPage.mailOwn"), open: mailFailedAt !== null }}
            />
          </KitSettingRow>
        </KitSettings>
      </KitGroup>
    </KitPage>
  );
}
