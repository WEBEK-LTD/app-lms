"use client";

import { startTransition, useActionState, useRef, useState } from "react";
import { savePaymentKeysAction, testPaymentKeysAction } from "@/app/actions/catalog";
import { Field, FieldError, FormMessage, SubmitButton } from "@/components/form";
import { Icon } from "@/components/icon";
import type { IconName } from "@/components/icon-names";
import { Badge, btn } from "@/components/ui";
import { useDashLang, useDashT, useKnownText } from "@/components/dashboard-i18n";
import type { DashKey, DashT } from "@/i18n/dashboard";
import { formatDate, formatList } from "@/i18n/format";
import type { Lang } from "@/i18n/config";
import { initialFormState } from "@/lib/forms";
import type { PaymentProviderId, PaymentWebhookReceipt } from "@/lib/data/types";
import type { CheckTone, ConnectionReport, PaymentTestState } from "@/lib/payments/connection";
import type { SavedKeysView } from "@/lib/payments/owner-keys";
import { STRIPE_WEBHOOK_EVENTS, stripeKeyMode, type StripeMode } from "@/lib/payments/stripe-keys";

type ProviderChoice = PaymentProviderId;

/** 37 Where each provider shows the keys, for the hint under the choice (132.30 Stripe: both keys). */
const KEYS_WHERE: Record<ProviderChoice, DashKey> = { iyzico: "shop.keysIyzico", kashier: "shop.keysKashier", fawaterk: "shop.keysFawaterk", stripe: "gateways.keysStripe", paypal: "shop.keysPaypal" };
/** 96.1 Stripe has none: its test keys say so themselves (sk_test_…). */
const TEST_LABEL: Record<Exclude<ProviderChoice, "stripe">, DashKey> = { iyzico: "shop.testIyzico", kashier: "shop.testKashier", fawaterk: "shop.testFawaterk", paypal: "shop.testPaypal" };
const TEST_HINT: Record<Exclude<ProviderChoice, "stripe">, DashKey> = { iyzico: "shop.testIyzicoHint", kashier: "shop.testKashierHint", fawaterk: "shop.testFawaterkHint", paypal: "shop.testPaypalHint" };
const NAMES: Record<ProviderChoice, string> = { iyzico: "iyzico", kashier: "Kashier", fawaterk: "Fawaterk", stripe: "Stripe", paypal: "PayPal" };

/** 132.35 Stripe's own guides, the only links on the page (docs.stripe.com). */
const STRIPE_DOCS: { href: string; label: DashKey }[] = [
  { href: "https://docs.stripe.com/keys", label: "gateways.docKeys" },
  { href: "https://docs.stripe.com/keys/restricted-api-keys", label: "gateways.docRestricted" },
  { href: "https://docs.stripe.com/webhooks", label: "gateways.docWebhooks" },
  { href: "https://docs.stripe.com/webhooks/signature", label: "gateways.docSignature" },
  { href: "https://docs.stripe.com/testing", label: "gateways.docTesting" },
];

const TONES: Record<CheckTone, { icon: IconName; color: string }> = {
  ok: { icon: "check_circle", color: "text-success" },
  warn: { icon: "warning", color: "text-warn" },
  fail: { icon: "error", color: "text-danger" },
  info: { icon: "info", color: "text-muted" },
};

/** "16 Nov, 14:05", in the dashboard's language and the browser's time. */
const when = (lang: Lang, iso: string) => formatDate(lang, new Date(iso), { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });

/** A check's value as the page says it: a time in the language, a list of currencies ("USD or EUR") or of events ("a and b"). */
function shown(lang: Lang, key: string, value: string): string {
  if (key === "at") return when(lang, value);
  if (key === "list" || key === "events") return formatList(lang, value.split(", "), key === "list" ? "disjunction" : "conjunction");
  return value;
}

export interface PaymentKeysFormProps {
  provider: ProviderChoice | null;
  sandbox: boolean;
  merchantId?: string;
  clientId?: string;
  /** 132 What is saved, secrets masked ("sk_test_…abcd"): an empty field keeps it. */
  saved?: SavedKeysView | null;
  /** 132.31 This app's Stripe webhook endpoint, to paste in Stripe. */
  stripeWebhookUrl?: string;
  /** 132.33 The saved gateway's last webhook. */
  receipt?: PaymentWebhookReceipt | null;
  /** What the app sells in, for the test's currency check. */
  currency?: string;
}

function ModeBadge({ mode, t }: { mode: StripeMode | "mix"; t: DashT }) {
  if (mode === "mix") return <Badge tone="danger">{t("gateways.modeMix")}</Badge>;
  return <Badge tone={mode === "test" ? "warn" : "success"}>{t(mode === "test" ? "gateways.modeTest" : "gateways.modeLive")}</Badge>;
}

function CopyButton({ text, controls }: { text: string; controls: string }) {
  const t = useDashT();
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      className={`${btn.secondary} h-9 px-3 text-sm`}
      aria-controls={controls}
      onClick={() => {
        void navigator.clipboard?.writeText(text).then(() => {
          setDone(true);
          setTimeout(() => setDone(false), 2000);
        });
      }}
    >
      <Icon name={done ? "check" : "content_copy"} size={18} />
      {done ? t("gateways.copied") : t("gateways.copy")}
    </button>
  );
}

/** 132.34 The test's checks, one per line: what works, what to fix. */
function TestResults({ report }: { report: ConnectionReport }) {
  const t = useDashT();
  const lang = useDashLang();
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-line bg-white p-4" data-testid="gateway-test-results">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="m-0 text-[15px] font-bold">{t("gateways.results")}</h3>
        <ModeBadge mode={report.mode} t={t} />
        <span className="text-[13px] text-muted">{t("gateways.testedAt", { at: when(lang, report.at) })}</span>
      </div>
      <p className={`m-0 text-sm font-semibold ${report.ok ? "text-success" : "text-danger"}`}>{t(report.ok ? "gateways.allGood" : "gateways.needsWork")}</p>
      <ul className="m-0 flex list-none flex-col gap-2 p-0">
        {report.checks.map((check, i) => {
          const tone = TONES[check.tone];
          const values = Object.fromEntries(Object.entries(check.values ?? {}).map(([k, v]) => [k, shown(lang, k, v)]));
          return (
            <li key={`${check.code}-${i}`} data-tone={check.tone} className="flex items-start gap-2 text-sm leading-relaxed text-ink-2">
              <Icon name={tone.icon} size={20} filled className={`mt-px ${tone.color}`} />
              <span className="min-w-0 break-words">{t(`gateways.check.${check.code}` as DashKey, values)}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** 132.35 Stripe, step by step, with Stripe's own guides. */
function StripeGuide({ open }: { open: boolean }) {
  const t = useDashT();
  return (
    <details className="group rounded-xl border border-line bg-white p-4" open={open}>
      <summary className="flex cursor-pointer list-none items-center gap-2 text-[15px] font-bold [&::-webkit-details-marker]:hidden">
        <Icon name="menu_book" size={20} className="text-muted" />
        <span className="flex-1">{t("gateways.guideTitle")}</span>
        <Icon name="expand_more" size={20} className="text-muted transition-transform group-open:rotate-180" />
      </summary>
      <ol className="m-0 mt-3 flex list-decimal flex-col gap-2 ps-5 text-sm leading-relaxed text-ink-3">
        {(["gateways.guide1", "gateways.guide2", "gateways.guide3", "gateways.guide4", "gateways.guide5", "gateways.guide6"] as const).map((step) => (
          <li key={step}>{t(step)}</li>
        ))}
      </ol>
      <p className="m-0 mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-muted">
        <span>{t("gateways.docsLabel")}</span>
        {STRIPE_DOCS.map((doc) => (
          <a key={doc.href} href={doc.href} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-0.5 font-semibold">
            {t(doc.label)}
            <Icon name="open_in_new" size={14} />
          </a>
        ))}
      </p>
    </details>
  );
}

/**
 * The owner's own merchant account: 37 iyzico, Kashier, Fawaterk, 96.1
 * Stripe or PayPal, with the keys each one needs. 132.30 Stripe asks for the
 * publishable and the secret key (the mode badge follows what's typed),
 * 132.31 shows its webhook endpoint and takes its signing secret, 132.35
 * with its setup guide. 132 A secret left empty keeps the saved one (shown
 * masked). 132.34 "Test connection" checks the keys with the gateway, item
 * by item, without saving or charging anything.
 */
export function PaymentKeysForm({ provider, sandbox, merchantId = "", clientId = "", saved = null, stripeWebhookUrl = "", receipt = null, currency = "" }: PaymentKeysFormProps) {
  const t = useDashT();
  const lang = useDashLang();
  const known = useKnownText();
  const [state, action] = useActionState(savePaymentKeysAction, initialFormState);
  const [test, runTest, testing] = useActionState(testPaymentKeysAction, {} as PaymentTestState);
  const [choice, setChoice] = useState<ProviderChoice>((state.values?.provider as ProviderChoice | undefined) || provider || "iyzico");
  const form = useRef<HTMLFormElement>(null);
  const mine = saved?.provider === choice ? saved : null;
  const [secretTyped, setSecretTyped] = useState("");
  const [publishable, setPublishable] = useState(state.values?.publishableKey ?? mine?.publishableKey ?? "");
  const [sandboxOn, setSandboxOn] = useState(state.values ? state.values.sandbox === "on" : sandbox);
  const stripe = choice === "stripe";
  // Stripe's mode by the keys' prefixes, as typed (else as saved).
  const secretMode = stripeKeyMode(secretTyped.trim()) ?? (stripe ? stripeKeyMode(mine?.secretKey) : null);
  const publishableMode = stripeKeyMode(publishable.trim());
  const stripeMode: StripeMode | "mix" | null = secretMode && publishableMode && secretMode !== publishableMode ? "mix" : (secretMode ?? publishableMode);
  const mode: StripeMode | "mix" | null = stripe ? stripeMode : sandboxOn ? "test" : "live";
  const report = test.report?.provider === choice ? test.report : null;
  const hint = (key: string | null | undefined) => (key ? t("gateways.savedHint", { key }) : undefined);
  const savedHere = provider === choice && saved !== null;

  const startTest = () => {
    if (!form.current) return;
    const data = new FormData(form.current);
    startTransition(() => runTest(data));
  };

  return (
    <div className="flex flex-col gap-4">
      {savedHere ? (
        <p className="m-0 flex flex-wrap items-center gap-2 text-sm text-ink-3" data-testid="gateway-saved">
          <Icon name="verified" size={18} className="text-success" />
          <span className="font-semibold">{t("gateways.savedProvider", { provider: NAMES[choice] })}</span>
          <ModeBadge mode={stripe ? (stripeKeyMode(saved?.secretKey) ?? "test") : sandbox ? "test" : "live"} t={t} />
          {choice === "stripe" || choice === "kashier" || choice === "fawaterk" ? (
            <span className="inline-flex items-center gap-1">
              <Icon name="sensors" size={16} className={receipt?.failedAt && (!receipt.at || receipt.failedAt >= receipt.at) ? "text-danger" : receipt?.at ? "text-success" : "text-muted"} />
              {receipt?.failedAt && (!receipt.at || receipt.failedAt >= receipt.at)
                ? t("gateways.webhookRefused", { at: when(lang, receipt.failedAt) })
                : receipt?.at
                  ? t("gateways.webhookWorking", { at: when(lang, receipt.at) })
                  : t("gateways.webhookWaiting")}
            </span>
          ) : null}
        </p>
      ) : null}
      {/* 96.1 Outside the form: React resets a form after its action, which would put the menu back on its first choice. The form sends the choice. */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="f-provider" className="text-sm font-semibold">
          {t("shop.provider")}
        </label>
        <select id="f-provider" value={choice} onChange={(event) => setChoice(event.target.value as ProviderChoice)} className="input">
          <option value="iyzico">{t("shop.optIyzico")}</option>
          <option value="kashier">{t("shop.optKashier")}</option>
          <option value="fawaterk">{t("shop.optFawaterk")}</option>
          <option value="stripe">{t("shop.optStripe")}</option>
          <option value="paypal">{t("shop.optPaypal")}</option>
        </select>
        <span className="text-[13px] leading-normal text-muted">{t(KEYS_WHERE[choice])}</span>
        <FieldError id="f-provider-error" error={state.errors?.provider} />
      </div>
      {stripe ? <StripeGuide open={!mine} /> : null}
      <form ref={form} action={action} noValidate className="flex flex-col gap-4" onReset={() => setSecretTyped("")}>
        <FormMessage message={state.message} ok={state.ok} />
        <input type="hidden" name="provider" value={choice} />
        <input type="hidden" name="currency" value={currency} />
        {choice === "kashier" ? (
          <Field
            label={t("shop.merchantId")}
            name="merchantId"
            dir="ltr"
            autoComplete="off"
            placeholder="MID-1234-567"
            defaultValue={state.values?.merchantId ?? merchantId}
            required
            error={state.errors?.merchantId}
          />
        ) : null}
        {choice === "paypal" ? (
          <Field
            key="client-paypal"
            label={t("shop.clientId")}
            name="clientId"
            dir="ltr"
            autoComplete="off"
            defaultValue={state.values?.clientId ?? clientId}
            required
            error={state.errors?.clientId}
          />
        ) : null}
        {stripe ? (
          <Field
            key="publishable-stripe"
            label={t("gateways.publishableKey")}
            name="publishableKey"
            dir="ltr"
            autoComplete="off"
            spellCheck={false}
            placeholder="pk_test_…"
            value={publishable}
            onChange={(event) => setPublishable(event.target.value)}
            hint={t("gateways.publishableHint")}
            required
            error={state.errors?.publishableKey}
          />
        ) : null}
        {!stripe && choice !== "paypal" ? (
          <Field
            key={`api-${choice}`}
            label={choice === "kashier" ? t("shop.paymentApiKey") : t("shop.apiKey")}
            name="apiKey"
            dir="ltr"
            autoComplete="off"
            spellCheck={false}
            hint={hint(mine?.apiKey)}
            required={!mine}
            error={state.errors?.apiKey}
          />
        ) : null}
        {choice !== "fawaterk" ? (
          <Field
            key={`secret-${choice}`}
            label={choice === "paypal" ? t("shop.paypalSecret") : t("shop.secretKey")}
            name="secretKey"
            dir="ltr"
            type="password"
            autoComplete="off"
            spellCheck={false}
            placeholder={stripe ? "sk_test_…" : undefined}
            onChange={(event) => setSecretTyped(event.target.value)}
            hint={hint(mine?.secretKey) ?? (stripe ? t("gateways.secretHint") : undefined)}
            required={!mine}
            error={state.errors?.secretKey}
          />
        ) : null}
        {stripe && mode ? (
          <p className="m-0 flex items-center gap-2 text-sm" data-testid="stripe-mode">
            <ModeBadge mode={mode} t={t} />
          </p>
        ) : null}
        {stripe ? (
          <fieldset className="m-0 flex min-w-0 flex-col gap-3 rounded-xl border border-line bg-white p-4">
            <legend className="flex items-center gap-1.5 px-1 text-[15px] font-bold">
              <Icon name="sensors" size={20} className="text-muted" />
              {t("gateways.webhookTitle")}
            </legend>
            <p className="m-0 text-sm leading-relaxed text-ink-4">{t("gateways.webhookIntro")}</p>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="f-webhook-url" className="text-sm font-semibold">
                {t("gateways.webhookUrl")}
              </label>
              <div className="flex min-w-0 gap-2">
                <input id="f-webhook-url" readOnly value={stripeWebhookUrl} dir="ltr" className="input min-w-0 flex-1 font-mono text-[13px]" onFocus={(event) => event.target.select()} />
                <CopyButton text={stripeWebhookUrl} controls="f-webhook-url" />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <span className="text-sm font-semibold" id="webhook-events">
                {t("gateways.webhookEvents")}
              </span>
              <ul aria-labelledby="webhook-events" className="m-0 flex list-none flex-wrap gap-2 p-0" dir="ltr">
                {STRIPE_WEBHOOK_EVENTS.map((event) => (
                  <li key={event}>
                    <code className="rounded-lg bg-sand px-2 py-1 text-[13px]">{event}</code>
                  </li>
                ))}
              </ul>
            </div>
            <Field
              key="webhook-secret"
              label={t("gateways.webhookSecret")}
              name="webhookSecret"
            dir="ltr"
              type="password"
              autoComplete="off"
              spellCheck={false}
              placeholder="whsec_…"
              hint={hint(mine?.webhookSecret) ?? t("gateways.webhookSecretHint")}
              error={state.errors?.webhookSecret}
            />
          </fieldset>
        ) : null}
        {!stripe ? (
          <label key={`test-${choice}`} className="flex cursor-pointer items-start gap-3">
            <input type="checkbox" name="sandbox" checked={sandboxOn} onChange={(event) => setSandboxOn(event.target.checked)} className="mt-1 h-4 w-4 accent-midnight" />
            <span className="flex flex-col gap-0.5">
              <span className="text-[15px] font-semibold">{t(TEST_LABEL[choice])}</span>
              <span className="text-[13px] text-muted">{t(TEST_HINT[choice])}</span>
            </span>
          </label>
        ) : mode === "test" ? (
          <label className="flex cursor-pointer items-start gap-3">
            <input type="checkbox" name="testPayment" className="mt-1 h-4 w-4 accent-midnight" />
            <span className="flex flex-col gap-0.5">
              <span className="text-[15px] font-semibold">{t("gateways.testPayment")}</span>
              <span className="text-[13px] text-muted">{t("gateways.testPaymentHint")}</span>
            </span>
          </label>
        ) : null}
        <p className="m-0 text-[13px] leading-normal text-muted">{t("gateways.testHint", { provider: NAMES[choice] })}</p>
        <div className="flex flex-wrap justify-end gap-3">
          <button type="button" className={`${btn.secondary} h-10`} onClick={startTest} disabled={testing} aria-describedby={report ? "gateway-test-results" : undefined}>
            <Icon name="fact_check" size={20} />
            {testing ? t("gateways.testing") : t("gateways.test")}
          </button>
          <SubmitButton className="h-10" pendingText={t("shop.checking")}>
            {t("shop.saveKeys")}
          </SubmitButton>
        </div>
      </form>
      <div id="gateway-test-results" aria-live="polite" className="flex flex-col gap-3">
        {test.message && !report ? (
          <p role="alert" className="m-0 rounded-xl bg-danger-bg px-4 py-3 text-[15px] font-semibold text-danger">
            {known(test.message)}
          </p>
        ) : null}
        {report ? <TestResults report={report} /> : null}
      </div>
    </div>
  );
}
