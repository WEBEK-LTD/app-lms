import type { Metadata } from "next";
import Link from "next/link";
import { Notice, btn } from "@/components/ui";
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
import { chosenEmailSignIn, chosenSignInMethods, emailSignInNote, emailSignInPossible, hostedSignInMethods, signInMethodsChoice } from "@/lib/hosted/sign-in-methods";
import { signedInPath } from "@/lib/app/api-check";
import { jwksUrl, tokenIssuer, yallappSignsIn } from "@/lib/hosted/app-auth";
import { hostedApiUrl } from "@/lib/hosted/urls";
import { AppMailForms, AppSignInForm, AppWhatsappForms, DeveloperTokens, SignInMethodsForm, SignInProviderForm } from "./forms";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await dashboardText()).t("signin.title") };
}

const sectionClass = "flex max-w-[760px] flex-col gap-4 rounded-2xl border border-line bg-white p-5 sm:p-6";
const titleClass = "m-0 text-[26px] leading-tight font-extrabold tracking-[-0.5px] break-words sm:text-[30px]";
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

/** 34 Own API apps: their API signs people in, or Yallapp does. */
function ProviderSection({ app, text }: { app: App; text: DashboardText }) {
  return (
    <section aria-labelledby="h-provider" className={sectionClass}>
      <h2 id="h-provider" className="m-0 text-[19px] font-bold">
        {text.t("signin.whoSigns")}
      </h2>
      <SignInProviderForm current={yallappSignsIn(app) ? "yallapp" : "api"} />
    </section>
  );
}

/** 34 For the developer of the own API: the keys, the claims to check, a test token. */
function DeveloperSection({ app, webhooks, text }: { app: App; webhooks: ApiWebhook[]; text: DashboardText }) {
  const { t, k, lang } = text;
  const path = signedInPath(app.appType);
  return (
    <section aria-labelledby="h-developer" className={sectionClass}>
      <h2 id="h-developer" className="m-0 text-[19px] font-bold">
        {t("signin.forDeveloper")}
      </h2>
      <DeveloperTokens
        jwksUrl={jwksUrl(appUrl(), app.id)}
        issuer={tokenIssuer(appUrl())}
        audience={app.id}
        authBaseUrl={hostedApiUrl(appUrl(), app.id)}
        tryUrl={path && app.apiBaseUrl ? `${app.apiBaseUrl.replace(/\/+$/, "")}${path}` : null}
      />
      {/* 49 Account deletions sent to the client's API, signed, with their last try. */}
      <div className="flex flex-col gap-2" aria-labelledby="h-deletions">
        <h3 id="h-deletions" className="m-0 text-[16px] font-bold">
          {t("signin.deletions")}
        </h3>
        <p className="m-0 text-[15px] leading-relaxed text-ink-4">
          {richText(t("signin.deletionsText"), {
            code: () => <code dir="ltr">POST {app.apiBaseUrl ? webhookUrl(app.apiBaseUrl) : WEBHOOK_PATH}</code>, // i18n-ok: code
            del: () => <code dir="ltr">DELETE /me</code>, // i18n-ok: code
          })}
        </p>
        {webhooks.length === 0 ? (
          <p className="m-0 text-sm text-muted">{t("signin.noDeletions")}</p>
        ) : (
          <ul className="m-0 flex list-none flex-col gap-1.5 p-0 text-[15px]" data-testid="account-deletions">
            {webhooks.map((w) => (
              <li key={w.id} className="flex flex-wrap gap-x-3">
                <span className="text-muted">{dayOf(text, w.createdAt.toISOString())}</span>
                <span>{richText(t("signin.deletionUser"), { code: () => <code>{w.subject}</code> })}</span>
                <span className={w.status === "delivered" ? "text-success" : w.status === "failed" ? "text-danger" : "text-ink-4"}>{k(webhookStateText(w))}</span>
              </li>
            ))}
          </ul>
        )}
        <Link href={localePath(lang, "/docs/my-own-api") + "#account-deletion-notices"} className="text-sm font-semibold underline">
          {t("signin.checkNotice")}
        </Link>
      </div>
    </section>
  );
}

/** 19 Own API apps: the API decides how people sign in; this shows what it said at the last check. */
function CustomApiSignIn({ app, text }: { app: App; text: DashboardText }) {
  const { t, lang } = text;
  const config = { config: () => <code>GET /config</code> }; // i18n-ok: code
  const saved = app.hostedSettings?.apiSignIn ?? null;
  const current = saved && app.apiBaseUrl && saved.baseUrl === app.apiBaseUrl.replace(/\/+$/, "") ? saved : null;
  return (
    <div className="flex flex-col gap-6">
      <div className="flex max-w-[620px] flex-col gap-2">
        <h1 className={titleClass}>{t("signin.title")}</h1>
        <p className="m-0 text-[15px] leading-relaxed text-ink-4">{richText(t("signin.customIntro"), { ...config, methods: () => <code>auth.methods</code> })}</p>
      </div>
      <ProviderSection app={app} text={text} />
      <section aria-labelledby="h-api-sign-in" className={sectionClass}>
        <h2 id="h-api-sign-in" className="m-0 text-[19px] font-bold">
          {t("signin.apiOffers")}
        </h2>
        {current ? (
          <>
            <ul className="m-0 flex flex-col gap-1.5 ps-5 text-[15px]">
              {advertised(current, text).map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
            <p className="m-0 text-sm text-muted">{t("signin.lastCheck", { date: dayOf(text, current.checkedAt) })}</p>
          </>
        ) : (
          <p className="m-0 text-[15px] leading-relaxed text-ink-4">{richText(t("signin.runCheck"), config)}</p>
        )}
        <div className="flex flex-wrap gap-3">
          <Link href="/dashboard/setup?step=website" className={`${btn.secondary} h-10 px-4 text-sm`}>
            {t("signin.checkApi")}
          </Link>
          <Link href={localePath(lang, GUIDE_DOC) + GUIDE_SIGN_IN} className={`${btn.secondary} h-10 px-4 text-sm`}>
            {t("signin.guideSignIn")}
          </Link>
        </div>
      </section>
      {/* 24 An own API sends its own emails. */}
      <section aria-labelledby="h-app-mail" className={sectionClass}>
        <h2 id="h-app-mail" className="m-0 text-[19px] font-bold">
          {t("signin.appEmail")}
        </h2>
        <p className="m-0 text-[15px] leading-relaxed text-ink-4">{t("signin.apiOwnEmail")}</p>
      </section>
    </div>
  );
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
  const { app, client, user } = await requireClient();
  const text = await dashboardText();
  const { t, k } = text;
  // Called, not rendered as its own component: the "Who signs people in" form stays in place (with its message) when the choice changes.
  if (app?.backend === "custom_api" && !yallappSignsIn(app)) return CustomApiSignIn({ app, text });
  // 34 An app on its own API that Yallapp signs people in to has the hosted API's choices.
  const ownApi = app?.backend === "custom_api";
  if (!app || (app.backend !== "hosted" && app.backend !== "wordpress" && app.backend !== "setup_requested" && !ownApi)) {
    return (
      <div className="flex max-w-[620px] flex-col gap-3">
        <h1 className={titleClass}>{t("signin.title")}</h1>
        <p className="m-0 text-[15px] leading-relaxed text-ink-4">
          {t("signin.chooseSourceFirst")} <Link href="/dashboard/setup">{t("signin.backToSetup")}</Link>
        </p>
      </div>
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
  return (
    <div className="flex flex-col gap-6">
      <div className="flex max-w-[620px] flex-col gap-2">
        <h1 className={titleClass}>{t("signin.title")}</h1>
        <p className="m-0 text-[15px] leading-relaxed text-ink-4">
          {wordpress ? t("signin.introWordpress") : ownApi ? t("signin.introOwnApi") : t("signin.introHosted")}
        </p>
      </div>
      {ownApi ? <ProviderSection app={app} text={text} /> : null}
      {ownApi ? <DeveloperSection app={app} webhooks={await (await getStore()).listApiWebhooks(app.id, 20)} text={text} /> : null}
      {waiting ? <Notice icon="hourglass_top">{t("signin.waiting")}</Notice> : null}

      {emailOff ? (
        <Notice tone="warn" icon="warning">
          {source ? t("signin.emailOffNamed", { source }) : t("signin.emailOffUnnamed")}
          {emailOnlyUsers > 0 ? ` ${t("signin.emailOnlyUsers", { count: emailOnlyUsers })}` : ""}{" "}
          {richText(t("signin.emailAgain"), { link: (chunk) => <Link href="/dashboard/setup?step=website">{chunk}</Link> })}
        </Notice>
      ) : null}

      <section aria-labelledby="h-methods" className={sectionClass}>
        <h2 id="h-methods" className="m-0 text-[19px] font-bold">
          {t("signin.howSignIn")}
        </h2>
        <SignInMethodsForm
          current={signInMethodsChoice(methods)}
          wordpress={wordpress}
          emailPossible={emailSignInPossible(app)}
          note={note ? k(note) : null}
          chosen={wordpress ? chosenSignInMethods(app) !== null : true}
          emailWay={chosenEmailSignIn(app) ?? "password"}
          emailWayChosen={chosenEmailSignIn(app) !== null}
        />
      </section>

      <section aria-labelledby="h-whatsapp" className={sectionClass}>
        <h2 id="h-whatsapp" className="m-0 text-[19px] font-bold">
          {t("signin.whatsappTitle")}
        </h2>
        {failedAt ? (
          <Notice tone="warn" icon="warning" role="status">
            {t("signin.whatsappFailed", { date: dayOf(text, failedAt) })}
          </Notice>
        ) : null}
        <AppWhatsappForms
          connected={sender ? { keyLast4: sender.keyLast4, instanceId: sender.instanceId } : null}
          defaultPhone={client.whatsapp ?? ""}
          wordpress={wordpress}
        />
      </section>

      <section aria-labelledby="h-app-mail" className={sectionClass}>
        <h2 id="h-app-mail" className="m-0 text-[19px] font-bold">
          {t("signin.appEmail")}
        </h2>
        {mailFailedAt ? (
          <Notice tone="warn" icon="warning" role="status">
            {app.hostedSettings?.mailFailedReason
              ? t("signin.mailFailedReason", { date: dayOf(text, mailFailedAt), reason: k(app.hostedSettings.mailFailedReason) })
              : t("signin.mailFailed", { date: dayOf(text, mailFailedAt) })}
          </Notice>
        ) : null}
        <AppMailForms
          current={appMailFormValues(app)}
          saved={mailServer ? { host: mailServer.host, username: mailServer.username, fromName: mailServer.fromName, fromAddress: mailServer.fromAddress } : null}
          defaultTestTo={user.email}
          production={isProduction()}
          wordpress={wordpress}
        />
      </section>

      {wordpress ? null : (
        <section aria-labelledby="h-rules" className={sectionClass}>
          <h2 id="h-rules" className="m-0 text-[19px] font-bold">
            {t("signin.rules")}
          </h2>
          <AppSignInForm current={hostedSettingsValues(hostedSettings(app))} emailOnly={methods.length === 1 && methods[0] === "email"} />
        </section>
      )}
    </div>
  );
}
