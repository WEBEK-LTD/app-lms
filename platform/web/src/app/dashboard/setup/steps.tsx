"use client";

/* eslint-disable @next/next/no-img-element -- previews of uploaded files served by our own asset route */
import Link from "next/link";
import { UpgradeHint } from "@/components/upgrade";
import type { Plan } from "@/lib/plans";
import { useActionState, useRef, useState, useTransition, type ReactNode } from "react";
import {
  checkApiAction,
  connectPlatformAction,
  disconnectPlatformAction,
  removeStoreKeyAction,
  saveBrandingAction,
  saveListingAction,
  savePublishingAction,
  saveWebsiteAction,
  uploadAssetAction,
  type WebsiteFormState,
} from "@/app/actions/dashboard";
import { PhoneFrame } from "@/components/device-frame";
import { useDashT, useKnownText } from "@/components/dashboard-i18n";
import { Field, FieldError, FormMessage, SubmitButton } from "@/components/form";
import { Icon } from "@/components/icon";
import { btn } from "@/components/ui";
import { ENGINES, ownContentTitle, ownContentWords, type WebsiteChoice } from "@/lib/app/kinds";
import type { SiteMatch } from "@/lib/app/site-match";
import { SiteMatchNote } from "@/components/site-match";
import type { ApiCheckResult } from "@/lib/app/api-check";
import type { DashKey } from "@/i18n/dashboard";
import { APP_FONTS, RULES } from "@/lib/build-config/types";
import type { AppType, AppVertical, SignInMethod } from "@/lib/data/types";
import { codeDeliveryText, emailOffWarning } from "@/lib/hosted/sign-in-methods";
import { initialFormState, type FormState } from "@/lib/forms";
import type { Appearance, LayoutContent } from "@/lib/pages/types";
import { richText } from "@/i18n/rich";
import { DesignThumb } from "../pages/preview";

function StepCard({ title, children, id }: { title: string; children: ReactNode; id: string }) {
  return (
    <section aria-labelledby={id} className="flex min-w-0 flex-[1_1_440px] flex-col gap-[18px] rounded-2xl border border-line bg-white p-5 sm:p-6">
      <h2 id={id} className="m-0 text-lg font-bold">
        {title}
      </h2>
      {children}
    </section>
  );
}

function StepActions({ back }: { back: string | null }) {
  const t = useDashT();
  return (
    <div className="flex justify-between gap-3 pt-1.5">
      {back ? (
        <Link href={back} className={`${btn.secondary} h-11`}>
          {t("setup.back")}
        </Link>
      ) : (
        <span />
      )}
      <SubmitButton className="h-11">{t("setup.saveContinue")}</SubmitButton>
    </div>
  );
}

const v = (state: FormState, key: string, fallback: string) => state.values?.[key] ?? fallback;

type Backend = WebsiteChoice;

/** A platform connected with keys, as the Website step shows it. */
export interface PlatformOption {
  id: string;
  name: string;
  summary: string;
  fields: { name: string; label: string; hint: string; secret: boolean; placeholder?: string; optional?: boolean }[];
  /** 25 Connected with OAuth through Yallapp's partner app (Salla, Zid) instead of fields. */
  oauth?: {
    /** Whether the team saved the partner app (admin Settings). */
    available: boolean;
    /** The connected store's name, when this app is connected to this platform. */
    connectedStore: string | null;
  };
}

/** The Website step's choices, in order; which ones an app type offers, and the wording of its own, are in lib/app/kinds.ts. */
const BACKENDS: { id: Backend; title: DashKey | null; text: DashKey | null }[] = [
  { id: "wordpress", title: "setup.wordpress", text: "setup.wordpressText" },
  { id: "shopify", title: "setup.shopify", text: "setup.shopifyText" },
  { id: "platform", title: null, text: null },
  { id: "catalog", title: null, text: null },
  { id: "custom_api", title: "setup.customApi", text: "setup.customApiText" },
  { id: "setup_requested", title: "setup.noWordpress", text: "setup.noWordpressText" },
];

/** "After this step, add … on the **Courses** page." with the bold parts. */
function Bold({ text }: { text: string }) {
  return (
    <>
      {text.split("**").map((part, i) => (i % 2 === 1 ? <b key={i}>{part}</b> : part))}
    </>
  );
}

/** The platform to connect and the keys it needs. */
interface ActionProps {
  action: (formData: FormData) => void;
  pending: boolean;
  state: FormState;
}

/** 25 "Connect with …" for a platform connected through Yallapp's partner app, or what's missing. */
function OAuthConnect({
  platform,
  oauth,
  staff,
  connect,
  disconnect,
}: {
  platform: PlatformOption;
  oauth: NonNullable<PlatformOption["oauth"]>;
  staff: boolean;
  connect: ActionProps;
  disconnect: ActionProps;
}) {
  const t = useDashT();
  const known = useKnownText();
  if (!oauth.available) {
    return (
      <div role="status" className="flex flex-col gap-1.5 rounded-xl border border-line bg-sand p-4 text-[15px] leading-relaxed">
        <span className="flex items-center gap-2 font-semibold">
          <Icon name="schedule" size={20} className="text-muted" />
          <span>{t("setup.notAvailable")}</span>
        </span>
        <span className="text-ink-4">{t("setup.notAvailableText", { platform: platform.name })}</span>
        {staff ? (
          <span className="text-sm text-ink-4">
            {richText(t("setup.teamPartner", { platform: platform.name }), { link: (chunk) => <Link href={`/admin/settings#h-${platform.id}`}>{chunk}</Link> })}
          </span>
        ) : null}
      </div>
    );
  }
  const message = disconnect.state.message ?? connect.state.message;
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-line bg-sand p-4">
      {oauth.connectedStore ? (
        <span className="flex items-center gap-2 text-[15px] font-semibold text-success">
          <Icon name="check_circle" size={20} filled />
          <span>{richText(t("setup.connectedTo", { store: oauth.connectedStore }), { b: (chunk) => <b>{chunk}</b> })}</span>
        </span>
      ) : (
        <span className="text-[15px] text-ink-4">{t("setup.approve", { platform: platform.name })}</span>
      )}
      <div className="flex flex-wrap gap-3">
        <button type="submit" formAction={connect.action} formNoValidate disabled={connect.pending} className={`${btn.primary} h-10`}>
          <Icon name="link" size={18} />
          {connect.pending
            ? t("setup.opening")
            : oauth.connectedStore
              ? t("setup.connectAnother", { platform: platform.name })
              : t("setup.connectWith", { platform: platform.name })}
        </button>
        {oauth.connectedStore ? (
          <button type="submit" formAction={disconnect.action} formNoValidate disabled={disconnect.pending} className={`${btn.secondary} h-10`}>
            <Icon name="link_off" size={18} />
            {disconnect.pending ? t("setup.disconnecting") : t("setup.disconnect")}
          </button>
        ) : null}
      </div>
      {message ? (
        <p role="status" className="m-0 text-sm text-ink-4">
          {known(message)}
        </p>
      ) : null}
      {connect.state.errors?.platform ? <FieldError id="f-connect-error" error={connect.state.errors.platform} /> : null}
      {connect.state.errors?.confirmEmailOff ? <FieldError id="f-connect-email-error" error={connect.state.errors.confirmEmailOff} /> : null}
    </div>
  );
}

function PlatformFields({
  platforms,
  saved,
  state,
  staff,
  connect,
  disconnect,
}: {
  platforms: PlatformOption[];
  saved: { platform: string; settings: Record<string, string>; secrets: string[] } | null;
  state: FormState;
  staff: boolean;
  connect: ActionProps;
  disconnect: ActionProps;
}) {
  const t = useDashT();
  const known = useKnownText();
  const [selected, setSelected] = useState<string>(
    connect.state.values?.platform ?? disconnect.state.values?.platform ?? state.values?.platform ?? saved?.platform ?? platforms[0]?.id ?? "",
  );
  const platform = platforms.find((p) => p.id === selected) ?? platforms[0];
  if (!platform) return null;
  const same = saved?.platform === platform.id;
  return (
    <div className="flex flex-col gap-4">
      <input type="hidden" name="platform" value={platform.id} />
      {platforms.length > 1 ? (
        <fieldset className="m-0 flex flex-wrap gap-2 border-0 p-0">
          <legend className="mb-2 text-sm font-semibold">{t("setup.platform")}</legend>
          {platforms.map((p) => (
            <label
              key={p.id}
              className="flex cursor-pointer items-center gap-2 rounded-xl border border-line bg-white px-3.5 py-2.5 text-[15px] font-semibold has-[:checked]:border-2 has-[:checked]:border-midnight has-[:checked]:px-[13px] has-[:checked]:py-[9px]"
            >
              <input
                type="radio"
                name="platformChoice"
                value={p.id}
                checked={platform.id === p.id}
                onChange={() => setSelected(p.id)}
                className="h-4 w-4 accent-midnight"
              />
              {p.name}
            </label>
          ))}
        </fieldset>
      ) : null}
      <p className="m-0 text-sm text-ink-4">{known(platform.summary)}</p>
      {platform.oauth ? <OAuthConnect platform={platform} oauth={platform.oauth} staff={staff} connect={connect} disconnect={disconnect} /> : null}
      {platform.fields.map((field) => {
        const kept = same && field.secret && saved.secrets.includes(field.name);
        // The action words a missing field as "Enter your <label>." from the English label; it's worded again here in the dashboard's language.
        const error = state.errors?.[`p_${field.name}`];
        const lowered = `${field.label.charAt(0).toLowerCase()}${field.label.slice(1)}`;
        const label = known(field.label);
        return (
          <Field
            key={`${platform.id}-${field.name}`}
            label={field.optional ? t("setup.optionalField", { label }) : label}
            name={`p_${field.name}`}
            type={field.secret ? "password" : "text"}
            autoComplete="off"
            required={!field.optional && !kept}
            defaultValue={field.secret ? "" : v(state, `p_${field.name}`, same ? (saved.settings[field.name] ?? "") : "")}
            placeholder={kept ? t("setup.savedReplace") : field.placeholder}
            hint={known(field.hint)}
            error={error === `Enter your ${lowered}.` ? t("setup.enterField", { label: label === field.label ? lowered : label }) : error}
          />
        );
      })}
      {state.errors?.platform ? <FieldError id="f-platform-error" error={state.errors.platform} /> : null}
    </div>
  );
}

/** The results of the API check, one line each. */
function ApiCheckList({ result }: { result: ApiCheckResult }) {
  const t = useDashT();
  const known = useKnownText();
  return (
    <ul aria-live="polite" className="m-0 flex list-none flex-col gap-1.5 p-0">
      {result.checks.map((c) => (
        <li key={c.id} className="flex items-start gap-2 text-sm">
          <Icon name={c.ok ? "check_circle" : "cancel"} size={18} filled className={c.ok ? "text-success" : "text-danger"} />
          <span>
            <span className="font-semibold" dir="auto">
              {known(c.label)}
            </span>
            {c.detail ? <span className="text-ink-4"> · {known(c.detail)}</span> : null}
            <span className="sr-only">{c.ok ? t("setup.passed") : t("setup.failed")}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}

export function WebsiteStep({
  siteUrl,
  plugin,
  activatedSite,
  pluginVersion,
  site = null,
  backend,
  apiBaseUrl,
  setupNote,
  setupRequestedAt,
  appType,
  vertical = null,
  shopDomain,
  shopifyConnected,
  shopifyAdmin,
  hostedApiUrl,
  platforms,
  platformSaved,
  hidden = [],
  signInMethods = ["phone"],
  emailOnlyUsers = 0,
  hostedWithoutSource = false,
  staff = false,
}: {
  /** 25 A team member manages this dashboard: says what the team must set for platforms not available yet. */
  staff?: boolean;
  /** Choices the team switched off (11.5); the app's own choice is never in it. */
  hidden?: Backend[];
  /** 19 How customers sign in with content managed in Yallapp (the owner's choice on App sign-in). */
  signInMethods?: SignInMethod[];
  /** 19 Customers who signed up by email: a connected platform (phone only) would lock them out. */
  emailOnlyUsers?: number;
  /** 19 Our team moved the app to the hosted API, but nothing gives it content yet. */
  hostedWithoutSource?: boolean;
  /** The platforms this app type can connect. */
  platforms: PlatformOption[];
  /** The connected platform: its values that aren't secret, and which secrets are saved. */
  platformSaved: { platform: string; settings: Record<string, string>; secrets: string[] } | null;
  /** The app's address on the hosted API, once it runs there. */
  hostedApiUrl: string | null;
  siteUrl: string;
  plugin: "none" | "connected" | "other";
  activatedSite: string | null;
  pluginVersion: string | null;
  /** 30 What the connected site runs, and whether the app's type fits it. */
  site?: SiteMatch | null;
  backend: Backend;
  apiBaseUrl: string;
  setupNote: string;
  setupRequestedAt: string | null;
  appType: AppType;
  /** 21 The kind of business: its own words for content managed here. */
  vertical?: AppVertical | null;
  shopDomain: string;
  shopifyConnected: boolean;
  /** Whether an Admin API token (order history) is saved. */
  shopifyAdmin: boolean;
}) {
  const t = useDashT();
  const known = useKnownText();
  const [state, action] = useActionState(saveWebsiteAction, initialFormState as WebsiteFormState);
  const [check, checkAction, checking] = useActionState(checkApiAction, { result: null });
  // 25 "Connect with …" and "Disconnect" for platforms connected through Yallapp's partner app.
  const [connectState, connectAction, connecting] = useActionState(connectPlatformAction, initialFormState);
  const [disconnectState, disconnectAction, disconnecting] = useActionState(disconnectPlatformAction, initialFormState);
  // React resets a form after each submit, which unchecks its controlled radios; drawing the form
  // again after each answer brings back the choices (and fields) the answer kept.
  const [formKey, setFormKey] = useState(0);
  const [seen, setSeen] = useState([state, connectState, disconnectState]);
  if (seen[0] !== state || seen[1] !== connectState || seen[2] !== disconnectState) {
    setSeen([state, connectState, disconnectState]);
    setFormKey((k) => k + 1);
  }
  // 19 The check that ran when the API was saved, unless one was run since with the button.
  const checkResult = check.result ?? state.apiCheck ?? null;
  const savedWithFailedCheck = Boolean(state.apiCheck && !state.apiCheck.ok);
  const engine = ENGINES[appType];
  const own = ownContentWords({ appType, vertical });
  const offered = BACKENDS.filter(
    (b) => engine.websites.includes(b.id) && !hidden.includes(b.id) && (b.id !== "platform" || platforms.length > 0),
  ).map((b) => b.id);
  const initial = (state.values?.backend as Backend | undefined) ?? backend;
  const [choice, setChoice] = useState<Backend>(offered.includes(initial) ? initial : (offered[0] ?? initial));
  return (
    <form key={formKey} action={action} noValidate className="flex flex-wrap items-start gap-6">
      {/* Sent from state: React resets the form's own radios after each submit. */}
      <input type="hidden" name="backend" value={choice} />
      <StepCard title={t("setup.website")} id="h-website">
        <FormMessage message={state.message} />
        {hostedWithoutSource ? (
          <p role="status" className="m-0 flex gap-2 rounded-xl border border-line bg-sand p-4 text-[15px] leading-relaxed text-ink-4">
            <Icon name="info" size={20} className="text-muted" />
            <span>{t("setup.movedHosted")}</span>
          </p>
        ) : null}
        <fieldset className="m-0 flex flex-col gap-2.5 border-0 p-0">
          <legend className="mb-2 text-sm font-semibold">{t("setup.contentFrom")}</legend>
          {BACKENDS.filter((b) => engine.websites.includes(b.id))
            .map((b) =>
              b.id === "catalog"
                ? { id: b.id, title: known(ownContentTitle(appType)), text: known(own.text) }
                : b.id === "platform"
                  ? { id: b.id, title: known(engine.platformChoice.title), text: known(engine.platformChoice.text) }
                  : { id: b.id, title: b.title ? t(b.title) : "", text: b.text ? t(b.text) : "" },
            )
            .filter((b) => offered.includes(b.id))
            .map((b) => (
            <label
              key={b.id}
              className="flex cursor-pointer items-start gap-3 rounded-xl border border-line bg-white p-3.5 has-[:checked]:border-2 has-[:checked]:border-midnight has-[:checked]:p-[13px] has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2"
            >
              <input
                type="radio"
                name="backendChoice"
                value={b.id}
                checked={choice === b.id}
                onChange={() => setChoice(b.id)}
                className="mt-1 h-4 w-4 accent-midnight"
              />
              <span className="flex flex-col gap-0.5">
                <span className="text-[15px] font-bold">{b.title}</span>
                <span className="text-sm text-ink-4">{b.text}</span>
              </span>
            </label>
          ))}
        </fieldset>
        {choice === "catalog" ? (
          <p className="m-0 rounded-xl border border-line bg-sand p-4 text-[15px] leading-relaxed text-ink-4">
            <Bold text={t("setup.signInWith", { next: known(own.next), how: known(codeDeliveryText(signInMethods)) })} />
            {hostedApiUrl && backend === "catalog" ? (
              <span className="mt-2 block text-sm">
                {richText(t("setup.apiAddress"), {
                  code: () => (
                    <code className="break-all" dir="ltr">
                      {hostedApiUrl}
                    </code>
                  ),
                })}
              </span>
            ) : null}
          </p>
        ) : choice === "platform" ? (
          <PlatformFields
            platforms={platforms}
            saved={platformSaved}
            state={state}
            staff={staff}
            connect={{ action: connectAction, pending: connecting, state: connectState }}
            disconnect={{ action: disconnectAction, pending: disconnecting, state: disconnectState }}
          />
        ) : (
          <Field
            label={choice === "wordpress" ? t("setup.yourWordpress") : choice === "setup_requested" ? t("setup.currentOptional") : t("setup.yourWebsite")}
            name="siteUrl"
            type="url"
            required={choice !== "setup_requested"}
            defaultValue={v(state, "siteUrl", siteUrl)}
            placeholder={choice === "shopify" ? ENGINES.store.sitePlaceholder : engine.sitePlaceholder}
            hint={choice === "setup_requested" ? t("setup.currentHint") : t("setup.httpsHint")}
            error={state.errors?.siteUrl}
          />
        )}
        {choice === "catalog" && state.errors?.backend ? <FieldError id="f-backend-error" error={state.errors.backend} /> : null}
        {choice === "wordpress" ? (
          <div className="flex flex-col gap-2 rounded-xl border border-line bg-sand p-4">
            <span className="text-sm font-semibold">{t("setup.pluginConnection")}</span>
            {plugin === "connected" ? (
              <>
                <span className="flex items-center gap-2 text-[15px] font-semibold text-success">
                  <Icon name="check_circle" size={20} filled />
                  {pluginVersion ? t("setup.connectedPlugin", { version: pluginVersion }) : t("setup.connected")}
                </span>
                <SiteMatchNote match={site} words={{ k: known, changeType: t("overview.changeType") }} />
              </>
            ) : plugin === "other" ? (
              <span className="flex items-start gap-2 text-[15px] text-warn">
                <Icon name="warning" size={20} />
                <span>
                  {richText(t("setup.otherSite", { site: activatedSite ?? "", page: known("License & plugin") }), {
                    b: (chunk) => <b dir="ltr">{chunk}</b>,
                    license: (chunk) => <Link href="/dashboard/license">{chunk}</Link>,
                  })}
                </span>
              </span>
            ) : (
              <span className="flex items-start gap-2 text-[15px] text-ink-4">
                <Icon name="link_off" size={20} className="text-muted" />
                <span>
                  {richText(t("setup.notConnected", { page: known("License & plugin") }), {
                    install: (chunk) => <Link href="/guides/install-plugin">{chunk}</Link>,
                    license: (chunk) => <Link href="/dashboard/license">{chunk}</Link>,
                  })}
                </span>
              </span>
            )}
          </div>
        ) : null}
        {choice === "shopify" ? (
          <>
            <Field
              label={t("setup.shopifyAddress")}
              name="shopDomain"
              required
              defaultValue={v(state, "shopDomain", shopDomain)}
              placeholder="your-shop.myshopify.com"
              hint={t("setup.shopifyAddressHint")}
              error={state.errors?.shopDomain}
            />
            <Field
              label={t("setup.storefrontToken")}
              name="storefrontToken"
              type="password"
              autoComplete="off"
              required={!shopifyConnected}
              placeholder={shopifyConnected ? t("setup.savedReplace") : ""}
              hint={t("setup.storefrontHint")}
              error={state.errors?.storefrontToken}
            />
            <Field
              label={t("setup.adminToken")}
              name="adminToken"
              type="password"
              autoComplete="off"
              placeholder={shopifyAdmin ? t("setup.savedReplace") : ""}
              hint={t("setup.adminTokenHint")}
              error={state.errors?.adminToken}
            />
            {shopifyAdmin ? (
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="removeAdminToken" className="h-4 w-4 accent-midnight" />
                {t("setup.removeAdmin")}
              </label>
            ) : null}
            {state.errors?.backend ? <FieldError id="f-backend-error" error={state.errors.backend} /> : null}
          </>
        ) : null}
        {choice === "custom_api" ? (
          <>
            <Field
              label={t("setup.yourApi")}
              name="apiBaseUrl"
              type="url"
              required
              defaultValue={v(state, "apiBaseUrl", apiBaseUrl)}
              placeholder="https://api.your-site.com/yallapp/v1"
              hint={richText(t("setup.yourApiHint"), { link: (chunk) => <Link href="/guides/custom-api">{chunk}</Link> })}
              error={state.errors?.apiBaseUrl}
            />
            <div className="flex flex-col gap-3 rounded-xl border border-line bg-sand p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="text-sm font-semibold">{t("setup.checkApi")}</span>
                <button type="submit" formAction={checkAction} formNoValidate className={`${btn.secondary} h-10`} disabled={checking}>
                  {checking ? t("setup.checking") : t("setup.runCheck")}
                </button>
              </div>
              {check.error ? <span className="text-sm text-danger">{known(check.error)}</span> : null}
              {checkResult ? (
                <ApiCheckList result={checkResult} />
              ) : (
                <span className="text-sm text-ink-4">{t("setup.checkText")}</span>
              )}
              {savedWithFailedCheck ? (
                <Link href="/dashboard/setup?step=branding" className="text-sm font-semibold">
                  {t("setup.continueMeantime")}
                </Link>
              ) : null}
            </div>
          </>
        ) : null}
        {(choice === "shopify" || choice === "platform") && emailOnlyUsers > 0 ? (
          <div role="alert" className="flex flex-col gap-2 rounded-xl border border-line bg-warn-bg p-4 text-[15px] leading-relaxed">
            <span className="flex items-start gap-2">
              <Icon name="warning" size={20} className="text-warn" />
              <span>{known(emailOffWarning(emailOnlyUsers))}</span>
            </span>
            <label className="flex cursor-pointer items-start gap-2 text-sm font-semibold">
              <input
                type="checkbox"
                name="confirmEmailOff"
                defaultChecked={state.values?.confirmEmailOff === "on"}
                aria-describedby={state.errors?.confirmEmailOff ? "f-confirmEmailOff-error" : undefined}
                className="mt-0.5 h-4 w-4 accent-midnight"
              />
              {t("setup.understand")}
            </label>
            <FieldError id="f-confirmEmailOff-error" error={state.errors?.confirmEmailOff} />
          </div>
        ) : null}
        {choice === "setup_requested" ? (
          <>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="f-setupNote" className="text-sm font-semibold">
                {t("setup.anything")}
              </label>
              <textarea
                id="f-setupNote"
                name="setupNote"
                rows={4}
                maxLength={1000}
                defaultValue={v(state, "setupNote", setupNote)}
                placeholder={t("setup.anythingPlaceholder", { items: known(engine.words.items) })}
                className="input"
                aria-invalid={state.errors?.setupNote ? true : undefined}
                aria-describedby={state.errors?.setupNote ? "f-setupNote-error" : undefined}
              />
              <FieldError id="f-setupNote-error" error={state.errors?.setupNote} />
            </div>
            <div className="flex items-start gap-2 rounded-xl border border-line bg-sand p-4 text-sm text-ink-4">
              <Icon name="chat" size={20} className="text-muted" />
              <span>
                {setupRequestedAt ? t("setup.askedOn", { date: setupRequestedAt }) : t("setup.willMessage")}
              </span>
            </div>
          </>
        ) : null}
        <StepActions back="/dashboard/app-type" />
      </StepCard>
    </form>
  );
}

// 33 The templates, now a choice under the designs (a design sets one).
const TEMPLATES = [
  { id: "classic", label: "setup.classic", text: "setup.classicText" },
  { id: "bold", label: "setup.bold", text: "setup.boldText" },
  { id: "minimal", label: "setup.minimal", text: "setup.minimalText" },
] as const satisfies readonly { id: string; label: DashKey; text: DashKey }[];

function Upload({
  kind,
  label,
  title,
  hint,
  accept,
  initial,
  error,
  onChange,
}: {
  kind: "icon" | "logo";
  label: string;
  title: string;
  hint: string;
  accept: string;
  initial: { id: string; url: string } | null;
  error?: string;
  onChange: (file: { id: string; url: string } | null) => void;
}) {
  const t = useDashT();
  const input = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState(initial);
  const [message, setMessage] = useState<string | undefined>(error);
  const [pending, start] = useTransition();
  const fieldName = kind === "icon" ? "iconAssetId" : "logoAssetId";
  const inputId = `upload-${kind}`;

  function upload(selected: File) {
    const data = new FormData();
    data.set("kind", kind);
    data.set("file", selected);
    start(async () => {
      const result = await uploadAssetAction(data);
      if (result.ok && result.id && result.url) {
        const next = { id: result.id, url: result.url };
        setFile(next);
        setMessage(undefined);
        onChange(next);
      } else {
        setMessage(result.error ?? t("forms.known.uploadFailed"));
      }
    });
  }

  return (
    <div className="flex min-w-0 flex-[1_1_180px] flex-col gap-1.5">
      <span id={`${inputId}-label`} className="text-sm font-semibold">
        {label}
      </span>
      <input type="hidden" name={fieldName} value={file?.id ?? ""} />
      <input
        ref={input}
        id={inputId}
        type="file"
        accept={accept}
        className="sr-only"
        aria-labelledby={`${inputId}-label`}
        aria-describedby={message ? `${inputId}-error` : undefined}
        onChange={(event) => {
          const selected = event.target.files?.[0];
          if (selected) upload(selected);
          event.target.value = "";
        }}
      />
      <button
        type="button"
        onClick={() => input.current?.click()}
        disabled={pending}
        aria-describedby={`${inputId}-label`}
        className="flex h-24 items-center justify-center gap-3 rounded-xl border border-dashed border-[#9A96A6] bg-sand px-3 text-sm text-midnight hover:border-midnight"
      >
        {pending ? (
          <>
            <Icon name="progress_activity" size={20} className="animate-spin" /> {t("common.uploading")}
          </>
        ) : file ? (
          <>
            <img src={file.url} alt="" className="h-16 w-16 rounded-lg border border-line bg-white object-contain" />
            <span className="flex flex-col items-start gap-0.5 font-semibold">
              {t("setup.replaceFile")}
              <span className="text-xs font-normal text-muted">{hint}</span>
            </span>
          </>
        ) : (
          <span className="flex flex-col items-center gap-1 font-semibold">
            {title}
            <span className="text-xs font-normal text-muted">{hint}</span>
          </span>
        )}
      </button>
      <FieldError id={`${inputId}-error`} error={message} />
    </div>
  );
}

/** 33 The ready-made designs the Branding step offers, each as the draft it makes. */
export interface BrandingDesigns {
  designs: { id: string; name: string; description: string; layout: LayoutContent }[];
  /** The draft as it is, for "Keep my pages". */
  current: LayoutContent;
  /** The design the app last started from. */
  design: string | null;
}

export function BrandingStep({
  values,
  icon,
  logo,
  ...designs
}: {
  values: { appName: string; shortName: string; primaryColor: string; splashColor: string; template: string; font: string };
  icon: { id: string; url: string } | null;
  logo: { id: string; url: string } | null;
} & BrandingDesigns) {
  const t = useDashT();
  const known = useKnownText();
  const [state, action] = useActionState(saveBrandingAction, initialFormState);
  const [primary, setPrimary] = useState(v(state, "primaryColor", values.primaryColor));
  const [splash, setSplash] = useState(v(state, "splashColor", values.splashColor));
  const [template, setTemplate] = useState(v(state, "template", values.template));
  const [font, setFont] = useState(v(state, "font", values.font));
  const [design, setDesign] = useState(v(state, "design", designs.design ?? ""));
  // A design brings its template and font; both can still be changed below.
  function chooseDesign(id: string) {
    setDesign(id);
    const chosen = designs.designs.find((d) => d.id === id);
    if (chosen) {
      setTemplate(chosen.layout.appearance.template);
      setFont(chosen.layout.appearance.font);
    }
  }
  const [logoFile, setLogoFile] = useState(logo);
  const [iconFile, setIconFile] = useState(icon);
  const [name, setName] = useState(v(state, "appName", values.appName));

  return (
    <form action={action} noValidate className="flex flex-wrap items-start gap-6">
      {/* Sent from state: React resets the form's own radios after each submit. */}
      <input type="hidden" name="template" value={template} />
      <input type="hidden" name="design" value={design} />
      <StepCard title={t("setup.branding")} id="h-brand">
        <FormMessage message={state.message} />
        <Field
          label={t("setup.appName")}
          name="appName"
          required
          maxLength={RULES.appNameMax}
          defaultValue={v(state, "appName", values.appName)}
          placeholder={t("setup.appNamePlaceholder")}
          onChange={(event) => setName(event.currentTarget.value)}
          error={state.errors?.appName}
          small
        />
        <Field
          label={t("setup.shortName")}
          name="shortName"
          required
          maxLength={RULES.shortNameMax}
          defaultValue={v(state, "shortName", values.shortName)}
          placeholder={t("setup.shortNamePlaceholder")}
          error={state.errors?.shortName}
          small
        />
        <div className="flex flex-wrap gap-3.5">
          <Upload
            kind="icon"
            label={t("setup.appIcon")}
            title={t("setup.uploadPng")}
            hint={t("setup.iconHint")}
            accept="image/png"
            initial={iconFile}
            error={state.errors?.iconAssetId}
            onChange={setIconFile}
          />
          <Upload
            kind="logo"
            label={t("setup.logo")}
            title={t("setup.uploadPngSvg")}
            hint={t("setup.logoHint")}
            accept="image/png,image/svg+xml"
            initial={logoFile}
            error={state.errors?.logoAssetId}
            onChange={setLogoFile}
          />
        </div>
        <div className="flex flex-wrap gap-3.5">
          <Field
            className="flex-[1_1_180px]"
            label={t("setup.primaryColor")}
            name="primaryColor"
            type="color"
            value={primary}
            onChange={(event) => setPrimary(event.currentTarget.value)}
            error={state.errors?.primaryColor}
            small
          />
          <Field
            className="flex-[1_1_180px]"
            label={t("setup.splashColor")}
            name="splashColor"
            type="color"
            value={splash}
            onChange={(event) => setSplash(event.currentTarget.value)}
            error={state.errors?.splashColor}
            small
          />
        </div>
        {/* 33 Ready-made designs for this kind of app instead of three bare templates: each sets the pages, tabs and look. */}
        <fieldset className="m-0 flex min-w-0 flex-col gap-2.5 border-0 p-0" aria-describedby="f-design-hint">
          <legend className="mb-1 p-0 text-sm font-semibold">{t("setup.design")}</legend>
          <p id="f-design-hint" className="m-0 text-[13px] leading-normal text-muted">
            {t("setup.designHint")}
          </p>
          <div className="grid grid-cols-2 gap-2 sm:gap-3 xl:grid-cols-3">
            {[
              { id: "", name: t("setup.keepPages"), description: t("setup.keepPagesText"), layout: designs.current },
              ...designs.designs.map((d) => ({ ...d, name: known(d.name), description: known(d.description) })),
            ].map((d) => {
              const checked = design === d.id;
              const layout = d.id ? d.layout : { ...d.layout, appearance: { ...d.layout.appearance, template: template as Appearance["template"] } };
              return (
                <label key={d.id || "keep"} className="flex min-w-0 cursor-pointer flex-col gap-1.5">
                  <div className={`overflow-hidden rounded-xl ${checked ? "outline-2 outline-midnight" : "outline-1 outline-line"} bg-ivory outline`}>
                    <DesignThumb layout={{ ...layout, appearance: { ...layout.appearance, theme_mode: "light" } }} app={{ name: name || t("setup.yourApp"), primaryColor: primary }} />
                  </div>
                  <span className={`flex items-center gap-2 text-sm ${checked ? "font-bold" : "font-semibold"}`}>
                    <input
                      type="radio"
                      name="designChoice"
                      value={d.id}
                      checked={checked}
                      onChange={() => chooseDesign(d.id)}
                      className="m-0 h-[18px] w-[18px] flex-none accent-midnight"
                    />
                    {d.name}
                  </span>
                  <span className="text-xs leading-snug text-muted">{d.description}</span>
                </label>
              );
            })}
          </div>
          <FieldError id="f-design-error" error={state.errors?.design} />
        </fieldset>
        <div className="flex flex-wrap gap-3.5">
          <div className="flex flex-[1_1_180px] flex-col gap-1.5">
            <label htmlFor="f-template" className="text-sm font-semibold">
              {t("setup.template")}
            </label>
            <select id="f-template" className="input input-sm" value={template} onChange={(e) => setTemplate(e.target.value)}>
              {TEMPLATES.map((option) => (
                <option key={option.id} value={option.id}>
                  {t("setup.templateOption", { name: t(option.label), text: t(option.text) })}
                </option>
              ))}
            </select>
            <FieldError id="f-template-error" error={state.errors?.template} />
          </div>
          <div className="flex flex-[1_1_180px] flex-col gap-1.5">
            <label htmlFor="f-font" className="text-sm font-semibold">
              {t("setup.font")}
            </label>
            <select id="f-font" name="font" className="input input-sm" value={font} onChange={(e) => setFont(e.target.value)}>
              {APP_FONTS.map((f) => (
                <option key={f}>{f}</option>
              ))}
            </select>
            <FieldError id="f-font-error" error={state.errors?.font} />
          </div>
        </div>
        <StepActions back="/dashboard/setup?step=website" />
      </StepCard>

      <aside aria-label={t("setup.livePreview")} className="flex w-full flex-col items-center gap-3 lg:w-auto lg:flex-[0_1_300px]">
        <span className="text-[13px] font-semibold text-muted">{t("setup.livePreview")}</span>
        {/* The app's own sign-in screen, as the app shows it (its texts are the app's, not the dashboard's). */}
        <PhoneFrame className="w-[250px]" aria-hidden="true" lang="en" dir="ltr">
          <div
            className="flex h-full w-full flex-col gap-4 px-[18px] pt-10 pb-[18px]"
            style={{ background: template === "minimal" ? "#FFFFFF" : splash }}
          >
            {logoFile ? (
              <img src={logoFile.url} alt="" className="h-11 max-w-[140px] self-start object-contain" />
            ) : iconFile ? (
              <img src={iconFile.url} alt="" className="h-11 w-11 rounded-xl object-cover" />
            ) : (
              <span className="flex h-11 w-11 items-center justify-center rounded-xl text-[9px] font-bold text-white" style={{ background: primary }}>
                Logo {/* i18n-ok: the app's preview */}
              </span>
            )}
            {/* i18n-ok: the app's preview */}
            <span className="mt-4 text-xl font-extrabold text-midnight">Welcome{name ? ` to ${name}` : ""}</span>
            {/* i18n-ok: the app's preview */}
            <span className="-mt-2 text-[11px] leading-normal text-muted">Sign in with your mobile number and we&apos;ll send you a verification code.</span>
            <span className="h-10 rounded-[10px] border-[1.5px] bg-white" style={{ borderColor: primary }} />
            <span
              className={`flex h-10 items-center justify-center text-xs font-bold text-white ${template === "bold" ? "rounded-full" : "rounded-[10px]"}`}
              style={{ background: primary }}
            >
              Send code {/* i18n-ok: the app's preview */}
            </span>
          </div>
        </PhoneFrame>
      </aside>
    </form>
  );
}

type UploadedFile = { id: string; url: string };

/** Store screenshots: uploaded one by one (each request stays small), kept in upload order. */
function ScreenshotGallery({
  kind,
  field,
  label,
  hint,
  max,
  initial,
  error,
  saved,
}: {
  kind: "play_screenshot" | "ios_screenshot";
  field: string;
  label: string;
  hint: string;
  max: number;
  initial: UploadedFile[];
  error?: string;
  /** The form state of the last save: its error is hidden once the list changes, until the next save. */
  saved: FormState;
}) {
  const t = useDashT();
  const known = useKnownText();
  const input = useRef<HTMLInputElement>(null);
  const [files, setFilesState] = useState(initial);
  const [uploadError, setMessage] = useState<string | undefined>();
  const [changedAfter, setChangedAfter] = useState<FormState | null>(null);
  const message = uploadError ?? (changedAfter === saved ? undefined : error);
  const setFiles: typeof setFilesState = (next) => {
    setFilesState(next);
    setChangedAfter(saved);
  };
  const [pending, start] = useTransition();
  const inputId = `upload-${kind}`;

  function upload(selected: File[]) {
    start(async () => {
      let added: UploadedFile[] = [];
      for (const file of selected.slice(0, Math.max(0, max - files.length))) {
        const data = new FormData();
        data.set("kind", kind);
        data.set("file", file);
        const result = await uploadAssetAction(data);
        if (result.ok && result.id && result.url) {
          added = [...added, { id: result.id, url: result.url }];
        } else {
          setMessage(t("setup.shotFailed", { file: file.name, error: known(result.error ?? "The upload failed. Try again.") }));
          break;
        }
      }
      if (added.length > 0) {
        setFiles((current) => [...current, ...added].slice(0, max));
        if (added.length === selected.length) setMessage(undefined);
      }
      if (selected.length > max - files.length) setMessage(t("setup.tooManyShots", { max }));
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <span id={`${inputId}-label`} className="text-sm font-semibold">
        {label} <span className="font-normal text-muted">{t("license.optional")}</span>
      </span>
      {files.map((file) => (
        <input key={file.id} type="hidden" name={field} value={file.id} />
      ))}
      <input
        ref={input}
        id={inputId}
        type="file"
        multiple
        accept="image/png,image/jpeg"
        className="sr-only"
        aria-labelledby={`${inputId}-label`}
        aria-describedby={`${inputId}-hint${message ? ` ${inputId}-error` : ""}`}
        onChange={(event) => {
          const selected = Array.from(event.target.files ?? []);
          if (selected.length > 0) upload(selected);
          event.target.value = "";
        }}
      />
      <ul className="m-0 flex list-none flex-wrap gap-2.5 p-0" aria-label={t("setup.shots", { label, count: files.length, max })}>
        {files.map((file, index) => (
          <li key={file.id} className="relative">
            <img src={file.url} alt={t("setup.screenshot", { n: index + 1 })} className="h-36 w-auto max-w-[110px] rounded-lg border border-line bg-white object-cover" />
            <button
              type="button"
              onClick={() => setFiles((current) => current.filter((f) => f.id !== file.id))}
              aria-label={t("setup.removeShot", { n: index + 1 })}
              className="absolute -end-2 -top-2 flex h-7 w-7 cursor-pointer items-center justify-center rounded-full border border-line bg-white text-midnight hover:border-midnight"
            >
              <Icon name="close" size={16} />
            </button>
          </li>
        ))}
        {files.length < max ? (
          <li>
            <button
              type="button"
              onClick={() => input.current?.click()}
              disabled={pending}
              aria-describedby={`${inputId}-label`}
              className="flex h-36 w-[110px] flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed border-[#9A96A6] bg-sand px-2 text-center text-xs font-semibold text-midnight hover:border-midnight"
            >
              {pending ? <Icon name="progress_activity" size={20} className="animate-spin" /> : <Icon name="add" size={20} />}
              {pending ? t("common.uploading") : t("setup.addShots")}
            </button>
          </li>
        ) : null}
      </ul>
      <span id={`${inputId}-hint`} className="text-xs text-muted">
        {hint}
      </span>
      <FieldError id={`${inputId}-error`} error={message} />
    </div>
  );
}

export function ListingStep({
  values,
  screenshots,
  descriptionHint,
}: {
  /** 31 What to describe, for this app's type. */
  descriptionHint: string;
  values: {
    androidPackage: string;
    iosBundleId: string;
    storeTitle: string;
    shortDescription: string;
    fullDescription: string;
    supportEmail: string;
    privacyUrl: string;
  };
  screenshots: { phone: UploadedFile[]; iphone: UploadedFile[] };
}) {
  const t = useDashT();
  const [state, action] = useActionState(saveListingAction, initialFormState);
  const value = (key: keyof typeof values) => v(state, key, values[key]);
  return (
    <form action={action} noValidate className="flex flex-wrap items-start gap-6">
      <StepCard title={t("setup.listing")} id="h-listing">
        <FormMessage message={state.message} />
        <div className="flex flex-wrap gap-3.5">
          <Field
            className="flex-[1_1_220px]"
            label={t("setup.androidPackage")}
            name="androidPackage"
            required
            defaultValue={value("androidPackage")}
            placeholder="com.youracademy.app"
            dir="ltr"
            hint={t("setup.androidPackageHint")}
            error={state.errors?.androidPackage}
            small
          />
          <Field
            className="flex-[1_1_220px]"
            label={t("setup.bundleId")}
            name="iosBundleId"
            required
            defaultValue={value("iosBundleId")}
            placeholder="com.youracademy.app"
            dir="ltr"
            hint={t("setup.bundleIdHint")}
            error={state.errors?.iosBundleId}
            small
          />
        </div>
        <Field
          label={t("setup.storeTitle")}
          name="storeTitle"
          required
          maxLength={30}
          defaultValue={value("storeTitle")}
          hint={t("setup.storeTitleHint")}
          error={state.errors?.storeTitle}
          small
        />
        <Field
          label={t("setup.shortDescription")}
          name="shortDescription"
          required
          maxLength={80}
          defaultValue={value("shortDescription")}
          hint={t("setup.shortDescriptionHint")}
          error={state.errors?.shortDescription}
          small
        />
        <div className="flex flex-col gap-1.5">
          <label htmlFor="f-fullDescription" className="text-sm font-semibold">
            {t("setup.fullDescription")}
          </label>
          <textarea
            id="f-fullDescription"
            name="fullDescription"
            required
            rows={7}
            maxLength={4000}
            defaultValue={value("fullDescription")}
            className="input"
            aria-invalid={state.errors?.fullDescription ? true : undefined}
            aria-describedby={`f-fullDescription-hint${state.errors?.fullDescription ? " f-fullDescription-error" : ""}`}
          />
          <span id="f-fullDescription-hint" className="text-xs text-muted">
            {t("setup.fullDescriptionHint", { hint: descriptionHint })}
          </span>
          <FieldError id="f-fullDescription-error" error={state.errors?.fullDescription} />
        </div>
        <div className="flex flex-wrap gap-3.5">
          <Field
            className="flex-[1_1_220px]"
            label={t("setup.supportEmail")}
            name="supportEmail"
            type="email"
            required
            defaultValue={value("supportEmail")}
            error={state.errors?.supportEmail}
            small
          />
          <Field
            className="flex-[1_1_220px]"
            label={t("setup.privacyUrl")}
            name="privacyUrl"
            type="url"
            required
            defaultValue={value("privacyUrl")}
            placeholder="https://your-website.com/privacy"
            error={state.errors?.privacyUrl}
            small
          />
        </div>
        <fieldset className="m-0 flex flex-col gap-4 rounded-xl border border-line p-4">
          <legend className="px-1 text-[15px] font-bold">{t("setup.screenshots")}</legend>
          <p className="m-0 text-sm leading-relaxed text-ink-4">{t("setup.screenshotsText")}</p>
          <ScreenshotGallery
            kind="play_screenshot"
            field="playScreenshotIds"
            label={t("setup.playShots")}
            hint={t("setup.playShotsHint")}
            max={8}
            initial={screenshots.phone}
            error={state.errors?.playScreenshotIds}
            saved={state}
          />
          <ScreenshotGallery
            kind="ios_screenshot"
            field="iosScreenshotIds"
            label={t("setup.iphoneShots")}
            hint={t("setup.iphoneShotsHint")}
            max={10}
            initial={screenshots.iphone}
            error={state.errors?.iosScreenshotIds}
            saved={state}
          />
        </fieldset>
        <StepActions back="/dashboard/setup?step=branding" />
      </StepCard>
    </form>
  );
}

function FileInput({ name, label, accept, hint, error }: { name: string; label: string; accept: string; hint: string; error?: string }) {
  const id = `f-${name}`;
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-semibold">
        {label}
      </label>
      <input
        id={id}
        name={name}
        type="file"
        accept={accept}
        aria-invalid={error ? true : undefined}
        aria-describedby={`${id}-hint${error ? ` ${id}-error` : ""}`}
        className="block w-full min-w-0 rounded-[10px] border border-line-strong bg-white p-2 text-sm file:me-3 file:rounded-lg file:border-0 file:bg-ivory file:px-3 file:py-2 file:font-semibold file:text-midnight"
      />
      <span id={`${id}-hint`} className="text-xs text-muted">
        {hint}
      </span>
      <FieldError id={`${id}-error`} error={error} />
    </div>
  );
}

function SavedKey({ title, detail, store }: { title: string; detail: string; store: "google-play" | "app-store" | "firebase-android" | "firebase-ios" }) {
  const t = useDashT();
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-success-bg px-4 py-3">
      <span className="flex min-w-0 items-center gap-2 text-[15px]">
        <Icon name="check_circle" size={20} filled className="text-success" />
        <span className="min-w-0 break-words">
          {richText(t("setup.keySaved", { title, detail }), { b: (chunk) => <b>{chunk}</b> })}
        </span>
      </span>
      <button formAction={removeStoreKeyAction} name="store" value={store} formNoValidate className="cursor-pointer border-0 bg-transparent p-0 text-sm font-semibold text-danger hover:underline">
        {t("common.remove")}
      </button>
    </div>
  );
}

type SavedAppStoreKey = { issuerId: string | null; keyId: string | null } | null;

/** App Store Connect API key fields. Pro needs this or the Google Play key; on Starter it's optional and only signs the iOS app. */
function AppStoreKeyFields({ state, saved, optional = false }: { state: FormState; saved: SavedAppStoreKey; optional?: boolean }) {
  const t = useDashT();
  return (
    <fieldset className="m-0 flex flex-col gap-3.5 rounded-xl border border-line p-4">
      <legend className="px-1 text-[15px] font-bold">
        {t("setup.ascKey")}
        {optional ? <span className="font-normal text-muted"> {t("license.optional")}</span> : null}
      </legend>
      {optional ? (
        <p className="m-0 flex gap-2 text-sm leading-relaxed text-ink-4">
          <Icon name="phone_iphone" size={20} className="text-muted" />
          <span>{t("setup.ascOptional")}</span>
        </p>
      ) : null}
      {saved ? <SavedKey title={t("setup.apiKey")} detail={t("setup.keyIdDetail", { id: saved.keyId ?? "" })} store="app-store" /> : null}
      <div className="flex flex-wrap gap-3.5">
        <Field
          className="flex-[1_1_220px]"
          label={t("setup.issuerId")}
          name="ascIssuerId"
          defaultValue={v(state, "ascIssuerId", "")}
          placeholder={saved?.issuerId ?? "69a6de7e-…"}
          autoComplete="off"
          error={state.errors?.ascIssuerId}
          small
        />
        <Field
          className="flex-[1_1_160px]"
          label={t("setup.keyId")}
          name="ascKeyId"
          defaultValue={v(state, "ascKeyId", "")}
          placeholder={saved?.keyId ?? "2X9R4HXF34"}
          autoComplete="off"
          error={state.errors?.ascKeyId}
          small
        />
      </div>
      <FileInput
        name="ascPrivateKeyFile"
        label={saved ? t("setup.replaceP8") : t("setup.p8")}
        accept=".p8"
        hint={t("setup.p8Hint")}
        error={state.errors?.ascPrivateKeyFile}
      />
    </fieldset>
  );
}

type SavedFirebase = { android: boolean; ios: boolean };

/** Firebase config files. Optional on every plan: without them the app works, but without push notifications. */
function FirebaseFields({ state, saved }: { state: FormState; saved: SavedFirebase }) {
  const t = useDashT();
  return (
    <fieldset className="m-0 flex flex-col gap-3.5 rounded-xl border border-line p-4">
      <legend className="px-1 text-[15px] font-bold">
        {t("setup.push")} <span className="font-normal text-muted">{t("license.optional")}</span>
      </legend>
      <p className="m-0 flex gap-2 text-sm leading-relaxed text-ink-4">
        <Icon name="notifications" size={20} className="text-muted" />
        <span>{richText(t("setup.pushText"), { link: (chunk) => <Link href="/guides/push-notifications">{chunk}</Link> })}</span>
      </p>
      {saved.android ? <SavedKey title="google-services.json" detail="Android" store="firebase-android" /> : null}
      <FileInput
        name="firebaseAndroidFile"
        label={saved.android ? t("setup.replaceGoogleServices") : t("setup.googleServices")}
        accept="application/json,.json"
        hint={t("setup.googleServicesHint")}
        error={state.errors?.firebaseAndroidFile}
      />
      {saved.ios ? <SavedKey title="GoogleService-Info.plist" detail="iOS" store="firebase-ios" /> : null}
      <FileInput
        name="firebaseIosFile"
        label={saved.ios ? t("setup.replacePlist") : t("setup.plist")}
        accept=".plist,application/xml,text/xml"
        hint={t("setup.plistHint")}
        error={state.errors?.firebaseIosFile}
      />
    </fieldset>
  );
}

/** 35, 36, 42 Samsung Galaxy Store, Huawei AppGallery (and Huawei push) and Xiaomi GetApps have their own page. */
function MoreStoresLink() {
  const t = useDashT();
  return (
    <p className="m-0 flex gap-2 text-sm leading-relaxed text-ink-4">
      <Icon name="storefront" size={20} className="text-muted" />
      <span>{richText(t("setup.moreStores"), { link: (chunk) => <Link href="/dashboard/publishing/more-stores">{chunk}</Link> })}</span>
    </p>
  );
}

/** 19 Who publishes the app, on plans with "We publish for you". */
const PUBLISHING_CHOICES: { id: "managed" | "self"; title: DashKey; text: DashKey }[] = [
  { id: "managed", title: "setup.publishForMe", text: "setup.publishForMeText" },
  { id: "self", title: "setup.publishMyself", text: "setup.publishMyselfText" },
];

export function PublishingStep({
  autoPublish,
  ios,
  planName,
  upgrade,
  saved,
  teamPublishes = false,
}: {
  /** "We publish for you" is in the app's plan (13.1): we upload the builds to the stores. */
  autoPublish: boolean;
  /** The iOS app is in the app's plan. */
  ios: boolean;
  planName: string;
  /** The lowest plans with what this one lacks, for the Upgrade hints. */
  upgrade: { managed: { id: Plan; name: string } | null; ios: { id: Plan; name: string } | null };
  saved: { play: { clientEmail: string | null } | null; appStore: SavedAppStoreKey; firebase: SavedFirebase };
  /** The client asked our team to publish this app (14.1): nothing here is required. */
  teamPublishes?: boolean;
}) {
  const t = useDashT();
  const [state, action] = useActionState(savePublishingAction, initialFormState);
  const [mode, setMode] = useState<"managed" | "self">(teamPublishes ? "managed" : "self");
  const teamNotice = teamPublishes ? (
    <p className="m-0 flex gap-2 rounded-xl bg-success-bg px-4 py-3 text-[15px] leading-relaxed">
      <Icon name="check_circle" size={20} filled className="text-success" />
      <span>{richText(t("setup.teamNotice"), { link: (chunk) => <Link href="/dashboard/publishing">{chunk}</Link> })}</span>
    </p>
  ) : null;

  if (!autoPublish) {
    return (
      <form action={action} noValidate className="flex flex-wrap items-start gap-6">
        <StepCard title={t("setup.publishing")} id="h-publishing">
          {teamNotice}
          <p className="m-0 text-[15px] leading-relaxed text-ink-4">{ios ? t("setup.selfPublishApps", { plan: planName }) : t("setup.selfPublishApp", { plan: planName })}</p>
          <ul className="m-0 flex list-none flex-col gap-2 p-0 text-[15px]">
            <li>
              <Link href="/guides/google-play">{t("setup.guidePlay")}</Link>
            </li>
            {ios ? (
              <li>
                <Link href="/guides/app-store">{t("setup.guideAppStore")}</Link>
              </li>
            ) : null}
          </ul>
          <FormMessage message={state.message} />
          {ios ? (
            <>
              <AppStoreKeyFields state={state} saved={saved.appStore} optional />
              <p className="m-0 text-sm text-muted">{t("setup.keyEncrypted")}</p>
            </>
          ) : (
            <UpgradeHint title={t("setup.iosApp")} to={upgrade.ios} cta={upgrade.ios ? t("overview.upgradeTo", { plan: upgrade.ios.name }) : undefined}>
              {t("setup.iosUpgrade")}
            </UpgradeHint>
          )}
          <UpgradeHint title={t("setup.publishForMe")} to={upgrade.managed} cta={upgrade.managed ? t("overview.upgradeTo", { plan: upgrade.managed.name }) : undefined}>
            {t("setup.managedUpgrade")}
          </UpgradeHint>
          <FirebaseFields state={state} saved={saved.firebase} />
        <MoreStoresLink />
          <div className="flex justify-between gap-3 pt-1.5">
            <Link href="/dashboard/setup?step=listing" className={`${btn.secondary} h-11`}>
              {t("setup.back")}
            </Link>
            <SubmitButton className="h-11">{t("setup.finish")}</SubmitButton>
          </div>
        </StepCard>
      </form>
    );
  }

  return (
    <form action={action} noValidate className="flex flex-wrap items-start gap-6">
      {/* Sent from state: React resets the form's own radios after each submit. */}
      <input type="hidden" name="publishingMode" value={mode} />
      <StepCard title={t("setup.publishing")} id="h-publishing">
        <FormMessage message={state.message} />
        {/* 19 The same choice as on the Publishing page. */}
        <fieldset className="m-0 flex flex-col gap-2.5 border-0 p-0">
          <legend className="mb-2 text-sm font-semibold">{t("setup.whoPublishes")}</legend>
          {PUBLISHING_CHOICES.map((c) => (
            <label
              key={c.id}
              className="flex cursor-pointer items-start gap-3 rounded-xl border border-line bg-white p-3.5 has-[:checked]:border-2 has-[:checked]:border-midnight has-[:checked]:p-[13px] has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2"
            >
              <input
                type="radio"
                name="publishingModeChoice"
                value={c.id}
                checked={mode === c.id}
                onChange={() => setMode(c.id)}
                className="mt-1 h-4 w-4 accent-midnight"
              />
              <span className="flex flex-col gap-0.5">
                <span className="text-[15px] font-bold">{t(c.title)}</span>
                <span className="text-sm text-ink-4">{t(c.text)}</span>
              </span>
            </label>
          ))}
        </fieldset>

        {mode === "managed" ? (
          (teamNotice ?? (
            <p className="m-0 flex gap-2 rounded-xl border border-line bg-sand p-4 text-[15px] leading-relaxed text-ink-4">
              <Icon name="storefront" size={20} className="text-muted" />
              <span>{richText(t("setup.noKeys"), { link: (chunk) => <Link href="/dashboard/publishing">{chunk}</Link> })}</span>
            </p>
          ))
        ) : (
          <>
            <p className="m-0 text-[15px] leading-relaxed text-ink-4">{t("setup.keysText")}</p>

            <fieldset className="m-0 flex flex-col gap-3.5 rounded-xl border border-line p-4">
              <legend className="px-1 text-[15px] font-bold">Google Play</legend>
              {saved.play ? <SavedKey title={t("setup.serviceAccount")} detail={saved.play.clientEmail ?? t("setup.jsonKey")} store="google-play" /> : null}
              <FileInput
                name="googlePlayFile"
                label={saved.play ? t("setup.replaceServiceAccount") : t("setup.serviceAccountJson")}
                accept="application/json,.json"
                hint={t("setup.serviceAccountHint")}
                error={state.errors?.googlePlayFile}
              />
            </fieldset>

            {ios ? <AppStoreKeyFields state={state} saved={saved.appStore} /> : null}
          </>
        )}

        {ios ? null : (
          <UpgradeHint title={t("setup.iosApp")} to={upgrade.ios} cta={upgrade.ios ? t("overview.upgradeTo", { plan: upgrade.ios.name }) : undefined}>
            {t("setup.iosUpgrade")}
          </UpgradeHint>
        )}

        <FirebaseFields state={state} saved={saved.firebase} />
        <MoreStoresLink />

        <div className="flex justify-between gap-3 pt-1.5">
          <Link href="/dashboard/setup?step=listing" className={`${btn.secondary} h-11`}>
            {t("setup.back")}
          </Link>
          <SubmitButton className="h-11">{t("setup.saveFinish")}</SubmitButton>
        </div>
      </StepCard>
    </form>
  );
}
