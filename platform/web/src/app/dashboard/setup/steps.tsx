"use client";

/* eslint-disable @next/next/no-img-element -- previews of uploaded files served by our own asset route */
import Link from "next/link";
import { useActionState, useRef, useState, useTransition, type ReactNode } from "react";
import {
  checkApiAction,
  removeStoreKeyAction,
  saveBrandingAction,
  saveListingAction,
  savePublishingAction,
  saveWebsiteAction,
  uploadAssetAction,
} from "@/app/actions/dashboard";
import { Field, FieldError, FormMessage, SubmitButton } from "@/components/form";
import { Icon } from "@/components/icon";
import { btn } from "@/components/ui";
import { APP_FONTS, RULES } from "@/lib/build-config/types";
import type { AppType } from "@/lib/data/types";
import { initialFormState, type FormState } from "@/lib/forms";

function StepCard({ title, children, id }: { title: string; children: ReactNode; id: string }) {
  return (
    <section aria-labelledby={id} className="flex min-w-0 flex-[1_1_440px] flex-col gap-[18px] rounded-2xl border border-line bg-white p-5 sm:p-6">
      <h2 id={id} className="m-0 text-[19px] font-bold">
        {title}
      </h2>
      {children}
    </section>
  );
}

function StepActions({ back }: { back: string | null }) {
  return (
    <div className="flex justify-between gap-3 pt-1.5">
      {back ? (
        <Link href={back} className={`${btn.secondary} h-[46px]`}>
          Back
        </Link>
      ) : (
        <span />
      )}
      <SubmitButton className="h-[46px]">Save &amp; continue</SubmitButton>
    </div>
  );
}

const v = (state: FormState, key: string, fallback: string) => state.values?.[key] ?? fallback;

type Backend = "wordpress" | "custom_api" | "setup_requested" | "shopify";

const BACKENDS: { id: Backend; title: string; text: string; storeOnly?: boolean }[] = [
  { id: "wordpress", title: "My WordPress site", text: "Install the Yallapp plugin on your site. Most clients start here." },
  {
    id: "shopify",
    title: "My Shopify store",
    text: "Your products, prices and checkout come from Shopify. Customers sign in to the app with a code we send.",
    storeOnly: true,
  },
  { id: "custom_api", title: "My own API", text: "For developers: your website serves the Yallapp API itself." },
  { id: "setup_requested", title: "I don't have WordPress", text: "Our team sets up WordPress for you and moves your content over." },
];

/** The Website step of an app on the hosted API: nothing to fill in. */
export function HostedWebsiteStep({ apiUrl }: { apiUrl: string }) {
  return (
    <div className="flex flex-wrap items-start gap-6">
      <StepCard title="Website" id="h-website">
        <p className="m-0 text-[15px] leading-relaxed text-ink-4">
          Your app runs on the Yallapp hosted API, so it doesn&apos;t need a website. Your customers sign in with a code we send to their
          phone, and you send them notifications from <Link href="/dashboard/notifications">App notifications</Link>.
        </p>
        <div className="flex flex-col gap-1 rounded-xl border border-line bg-sand p-4">
          <span className="text-sm font-semibold">Your app&apos;s API address</span>
          <code className="text-[13px] break-all">{apiUrl}</code>
        </div>
        <p className="m-0 text-sm text-muted">Our team set this up for you. Message us on WhatsApp to change it.</p>
        <div className="flex justify-end pt-1.5">
          <Link href="/dashboard/setup?step=branding" className={`${btn.primary} h-[46px]`}>
            Continue
          </Link>
        </div>
      </StepCard>
    </div>
  );
}

export function WebsiteStep({
  siteUrl,
  plugin,
  activatedSite,
  pluginVersion,
  backend,
  apiBaseUrl,
  setupNote,
  setupRequestedAt,
  appType,
  shopDomain,
  shopifyConnected,
}: {
  siteUrl: string;
  plugin: "none" | "connected" | "other";
  activatedSite: string | null;
  pluginVersion: string | null;
  backend: Backend;
  apiBaseUrl: string;
  setupNote: string;
  setupRequestedAt: string | null;
  appType: AppType;
  shopDomain: string;
  shopifyConnected: boolean;
}) {
  const [state, action] = useActionState(saveWebsiteAction, initialFormState);
  const [check, checkAction, checking] = useActionState(checkApiAction, { result: null });
  const [choice, setChoice] = useState<Backend>((state.values?.backend as Backend | undefined) ?? backend);
  return (
    <form action={action} noValidate className="flex flex-wrap items-start gap-6">
      <StepCard title="Website" id="h-website">
        <FormMessage message={state.message} />
        <fieldset className="m-0 flex flex-col gap-2.5 border-0 p-0">
          <legend className="mb-2 text-sm font-semibold">Where your app gets its content</legend>
          {BACKENDS.filter((b) => !b.storeOnly || appType === "store").map((b) => (
            <label
              key={b.id}
              className="flex cursor-pointer items-start gap-3 rounded-xl border border-line bg-white p-3.5 has-[:checked]:border-2 has-[:checked]:border-midnight has-[:checked]:p-[13px] has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2"
            >
              <input
                type="radio"
                name="backend"
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
        <Field
          label={choice === "wordpress" ? "Your WordPress website" : "Your website"}
          name="siteUrl"
          type="url"
          required
          defaultValue={v(state, "siteUrl", siteUrl)}
          placeholder="https://your-academy.com"
          hint={
            choice === "setup_requested"
              ? "Your current website, if you have one. Your new WordPress site can live next to it, for example on app.your-site.com."
              : "Links in your app open this address. It must use https."
          }
          error={state.errors?.siteUrl}
        />
        {choice === "wordpress" ? (
          <div className="flex flex-col gap-2 rounded-xl border border-line bg-sand p-4">
            <span className="text-sm font-semibold">Plugin connection</span>
            {plugin === "connected" ? (
              <span className="flex items-center gap-2 text-[15px] font-semibold text-success">
                <Icon name="check_circle" size={20} filled />
                Connected{pluginVersion ? ` · plugin ${pluginVersion}` : ""}
              </span>
            ) : plugin === "other" ? (
              <span className="flex items-start gap-2 text-[15px] text-warn">
                <Icon name="warning" size={20} />
                <span>
                  Your license is active on <b>{activatedSite}</b>, which isn&apos;t this address. Check the address, or release the license on the{" "}
                  <Link href="/dashboard/license">License &amp; plugin</Link> page.
                </span>
              </span>
            ) : (
              <span className="flex items-start gap-2 text-[15px] text-ink-4">
                <Icon name="link_off" size={20} className="text-muted" />
                <span>
                  Not connected yet. <Link href="/guides/install-plugin">Install the plugin</Link> and paste your license key from{" "}
                  <Link href="/dashboard/license">License &amp; plugin</Link>. You can continue the setup in the meantime.
                </span>
              </span>
            )}
          </div>
        ) : null}
        {choice === "shopify" ? (
          <>
            <Field
              label="Your Shopify address"
              name="shopDomain"
              required
              defaultValue={v(state, "shopDomain", shopDomain)}
              placeholder="your-shop.myshopify.com"
              hint="The myshopify.com address, also when your shop uses its own domain."
              error={state.errors?.shopDomain}
            />
            <Field
              label="Storefront API access token"
              name="storefrontToken"
              type="password"
              autoComplete="off"
              required={!shopifyConnected}
              placeholder={shopifyConnected ? "Saved. Paste a new one to replace it." : ""}
              hint="In Shopify: Settings, Apps and sales channels, Develop apps, create an app, turn on Storefront API access with product, collection and checkout permissions, then install it and copy the Storefront API access token."
              error={state.errors?.storefrontToken}
            />
            {state.errors?.backend ? <FieldError id="f-backend-error" error={state.errors.backend} /> : null}
          </>
        ) : null}
        {choice === "custom_api" ? (
          <>
            <Field
              label="Your API address"
              name="apiBaseUrl"
              type="url"
              required
              defaultValue={v(state, "apiBaseUrl", apiBaseUrl)}
              placeholder="https://api.your-site.com/yallapp/v1"
              hint={
                <>
                  The app calls the endpoints in our <Link href="/guides/custom-api">developer guide</Link> under this address.
                </>
              }
              error={state.errors?.apiBaseUrl}
            />
            <div className="flex flex-col gap-3 rounded-xl border border-line bg-sand p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="text-sm font-semibold">Check your API</span>
                <button type="submit" formAction={checkAction} formNoValidate className={`${btn.secondary} h-10`} disabled={checking}>
                  {checking ? "Checking…" : "Run the check"}
                </button>
              </div>
              {check.error ? <span className="text-sm text-danger">{check.error}</span> : null}
              {check.result ? (
                <ul aria-live="polite" className="m-0 flex list-none flex-col gap-1.5 p-0">
                  {check.result.checks.map((c) => (
                    <li key={c.id} className="flex items-start gap-2 text-sm">
                      <Icon
                        name={c.ok ? "check_circle" : "cancel"}
                        size={18}
                        filled
                        className={c.ok ? "text-success" : "text-danger"}
                      />
                      <span>
                        <span className="font-semibold">{c.label}</span>
                        {c.detail ? <span className="text-ink-4"> · {c.detail}</span> : null}
                        <span className="sr-only">{c.ok ? " (passed)" : " (failed)"}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <span className="text-sm text-ink-4">We call your API the way the app does and show what&apos;s missing.</span>
              )}
            </div>
          </>
        ) : null}
        {choice === "setup_requested" ? (
          <>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="f-setupNote" className="text-sm font-semibold">
                Anything we should know? (optional)
              </label>
              <textarea
                id="f-setupNote"
                name="setupNote"
                rows={4}
                maxLength={1000}
                defaultValue={v(state, "setupNote", setupNote)}
                placeholder="Your current website platform, how many products or courses you have, where your content is today…"
                className="input"
                aria-invalid={state.errors?.setupNote ? true : undefined}
                aria-describedby={state.errors?.setupNote ? "f-setupNote-error" : undefined}
              />
              <FieldError id="f-setupNote-error" error={state.errors?.setupNote} />
            </div>
            <div className="flex items-start gap-2 rounded-xl border border-line bg-sand p-4 text-sm text-ink-4">
              <Icon name="chat" size={20} className="text-muted" />
              <span>
                {setupRequestedAt
                  ? `You asked us on ${setupRequestedAt}. Our team will message you on WhatsApp. When your WordPress site is ready, choose "My WordPress site" here.`
                  : "Our team messages you on WhatsApp with the price and the next steps. Your first build starts once your WordPress site is ready."}
              </span>
            </div>
          </>
        ) : null}
        <StepActions back="/dashboard/app-type" />
      </StepCard>
    </form>
  );
}

const TEMPLATES = [
  {
    id: "classic",
    label: "Classic",
    thumb: (
      <div className="flex h-[150px] flex-col gap-1.5 rounded-xl bg-ivory p-2.5">
        <span className="h-2.5 w-1/2 rounded-[3px] bg-midnight" />
        <span className="h-[34px] rounded-md bg-midnight" />
        <span className="flex gap-1">
          <span className="h-[50px] flex-1 rounded-md bg-tile-1" />
          <span className="h-[50px] flex-1 rounded-md bg-tile-2" />
        </span>
      </div>
    ),
  },
  {
    id: "bold",
    label: "Bold",
    thumb: (
      <div className="flex h-[150px] flex-col gap-1.5 overflow-hidden rounded-xl bg-ivory">
        <span className="h-10 rounded-b-[10px] bg-midnight" />
        <span className="mx-2.5 h-8 rounded-lg bg-tile-1" />
        <span className="mx-2.5 h-[50px] rounded-lg bg-tile-2" />
      </div>
    ),
  },
  {
    id: "minimal",
    label: "Minimal",
    thumb: (
      <div className="flex h-[150px] flex-col gap-2 rounded-xl bg-white p-2.5">
        <span className="h-3 w-2/5 rounded-[3px] bg-midnight" />
        <span className="h-[22px] rounded-md bg-ivory" />
        <span className="h-px bg-line" />
        <span className="flex items-center gap-1.5">
          <span className="h-[18px] w-[18px] rounded bg-tile-1" />
          <span className="h-1.5 flex-1 rounded-[3px] bg-line-strong" />
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-[18px] w-[18px] rounded bg-tile-2" />
          <span className="h-1.5 flex-1 rounded-[3px] bg-line-strong" />
        </span>
      </div>
    ),
  },
] as const;

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
        setMessage(result.error ?? "The upload failed. Try again.");
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
            <Icon name="progress_activity" size={20} className="animate-spin" /> Uploading…
          </>
        ) : file ? (
          <>
            <img src={file.url} alt="" className="h-16 w-16 rounded-lg border border-line bg-white object-contain" />
            <span className="flex flex-col items-start gap-0.5 font-semibold">
              Replace file
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

export function BrandingStep({
  values,
  icon,
  logo,
}: {
  values: { appName: string; shortName: string; primaryColor: string; splashColor: string; template: string; font: string };
  icon: { id: string; url: string } | null;
  logo: { id: string; url: string } | null;
}) {
  const [state, action] = useActionState(saveBrandingAction, initialFormState);
  const [primary, setPrimary] = useState(v(state, "primaryColor", values.primaryColor));
  const [splash, setSplash] = useState(v(state, "splashColor", values.splashColor));
  const [template, setTemplate] = useState(v(state, "template", values.template));
  const [logoFile, setLogoFile] = useState(logo);
  const [iconFile, setIconFile] = useState(icon);
  const [name, setName] = useState(v(state, "appName", values.appName));

  return (
    <form action={action} noValidate className="flex flex-wrap items-start gap-6">
      <StepCard title="Branding" id="h-brand">
        <FormMessage message={state.message} />
        <Field
          label="App name"
          name="appName"
          required
          maxLength={RULES.appNameMax}
          defaultValue={v(state, "appName", values.appName)}
          placeholder="Your academy's name"
          onChange={(event) => setName(event.currentTarget.value)}
          error={state.errors?.appName}
          small
        />
        <Field
          label="Name under the app icon"
          name="shortName"
          required
          maxLength={RULES.shortNameMax}
          defaultValue={v(state, "shortName", values.shortName)}
          placeholder="Up to 12 characters"
          error={state.errors?.shortName}
          small
        />
        <div className="flex flex-wrap gap-3.5">
          <Upload
            kind="icon"
            label="App icon"
            title="Upload PNG"
            hint="1024 × 1024, no transparency"
            accept="image/png"
            initial={iconFile}
            error={state.errors?.iconAssetId}
            onChange={setIconFile}
          />
          <Upload
            kind="logo"
            label="Logo"
            title="Upload PNG or SVG"
            hint="Shown on the sign-in screen"
            accept="image/png,image/svg+xml"
            initial={logoFile}
            error={state.errors?.logoAssetId}
            onChange={setLogoFile}
          />
        </div>
        <div className="flex flex-wrap gap-3.5">
          <Field
            className="flex-[1_1_180px]"
            label="Primary color"
            name="primaryColor"
            type="color"
            value={primary}
            onChange={(event) => setPrimary(event.currentTarget.value)}
            error={state.errors?.primaryColor}
            small
          />
          <Field
            className="flex-[1_1_180px]"
            label="Splash screen background"
            name="splashColor"
            type="color"
            value={splash}
            onChange={(event) => setSplash(event.currentTarget.value)}
            error={state.errors?.splashColor}
            small
          />
        </div>
        <fieldset className="m-0 flex flex-col gap-2.5 border-0 p-0">
          <legend className="mb-2 p-0 text-sm font-semibold">Template</legend>
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            {TEMPLATES.map((t) => (
              <label key={t.id} className="flex min-w-0 cursor-pointer flex-col gap-2">
                <div
                  className={`rounded-xl ${template === t.id ? "outline-2 outline-midnight" : "outline-1 outline-line"} outline`}
                  aria-hidden="true"
                >
                  {t.thumb}
                </div>
                <span className={`flex items-center gap-2 text-sm ${template === t.id ? "font-bold" : "font-semibold"}`}>
                  <input
                    type="radio"
                    name="template"
                    value={t.id}
                    checked={template === t.id}
                    onChange={() => setTemplate(t.id)}
                    className="m-0 h-[18px] w-[18px] flex-none accent-midnight"
                  />
                  {t.label}
                </span>
              </label>
            ))}
          </div>
          <FieldError id="f-template-error" error={state.errors?.template} />
        </fieldset>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="f-font" className="text-sm font-semibold">
            Font
          </label>
          <select id="f-font" name="font" className="input input-sm" defaultValue={v(state, "font", values.font)}>
            {APP_FONTS.map((font) => (
              <option key={font}>{font}</option>
            ))}
          </select>
          <FieldError id="f-font-error" error={state.errors?.font} />
        </div>
        <StepActions back="/dashboard/setup?step=website" />
      </StepCard>

      <aside aria-label="Live preview" className="flex w-full flex-col items-center gap-3 lg:w-auto lg:flex-[0_1_300px]">
        <span className="text-[13px] font-semibold text-muted">Live preview</span>
        <div className="h-[500px] w-[250px] rounded-[36px] bg-midnight p-2.5" aria-hidden="true">
          <div
            className="flex h-full w-full flex-col gap-4 rounded-[28px] px-[18px] pt-10 pb-[18px]"
            style={{ background: template === "minimal" ? "#FFFFFF" : splash }}
          >
            {logoFile ? (
              <img src={logoFile.url} alt="" className="h-11 max-w-[140px] self-start object-contain" />
            ) : iconFile ? (
              <img src={iconFile.url} alt="" className="h-11 w-11 rounded-xl object-cover" />
            ) : (
              <span className="flex h-11 w-11 items-center justify-center rounded-xl text-[9px] font-bold text-white" style={{ background: primary }}>
                Logo
              </span>
            )}
            <span className="mt-4 text-xl font-extrabold text-midnight">Welcome{name ? ` to ${name}` : ""}</span>
            <span className="-mt-2 text-[11px] leading-normal text-muted">Sign in with your mobile number and we&apos;ll send you a verification code.</span>
            <span className="h-10 rounded-[10px] border-[1.5px] bg-white" style={{ borderColor: primary }} />
            <span
              className={`flex h-10 items-center justify-center text-xs font-bold text-white ${template === "bold" ? "rounded-full" : "rounded-[10px]"}`}
              style={{ background: primary }}
            >
              Send code
            </span>
          </div>
        </div>
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
          setMessage(`${file.name}: ${result.error ?? "The upload failed. Try again."}`);
          break;
        }
      }
      if (added.length > 0) {
        setFiles((current) => [...current, ...added].slice(0, max));
        if (added.length === selected.length) setMessage(undefined);
      }
      if (selected.length > max - files.length) setMessage(`You can add up to ${max} screenshots.`);
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <span id={`${inputId}-label`} className="text-sm font-semibold">
        {label} <span className="font-normal text-muted">(optional)</span>
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
      <ul className="m-0 flex list-none flex-wrap gap-2.5 p-0" aria-label={`${label}: ${files.length} of ${max}`}>
        {files.map((file, index) => (
          <li key={file.id} className="relative">
            <img src={file.url} alt={`Screenshot ${index + 1}`} className="h-36 w-auto max-w-[110px] rounded-lg border border-line bg-white object-cover" />
            <button
              type="button"
              onClick={() => setFiles((current) => current.filter((f) => f.id !== file.id))}
              aria-label={`Remove screenshot ${index + 1}`}
              className="absolute -top-2 -right-2 flex h-7 w-7 cursor-pointer items-center justify-center rounded-full border border-line bg-white text-midnight hover:border-midnight"
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
              {pending ? "Uploading…" : "Add screenshots"}
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
}: {
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
  const [state, action] = useActionState(saveListingAction, initialFormState);
  const value = (key: keyof typeof values) => v(state, key, values[key]);
  return (
    <form action={action} noValidate className="flex flex-wrap items-start gap-6">
      <StepCard title="Store listing" id="h-listing">
        <FormMessage message={state.message} />
        <div className="flex flex-wrap gap-3.5">
          <Field
            className="flex-[1_1_220px]"
            label="Android package name"
            name="androidPackage"
            required
            defaultValue={value("androidPackage")}
            placeholder="com.youracademy.app"
            hint="Can't be changed after your app is on Google Play."
            error={state.errors?.androidPackage}
            small
          />
          <Field
            className="flex-[1_1_220px]"
            label="iOS bundle ID"
            name="iosBundleId"
            required
            defaultValue={value("iosBundleId")}
            placeholder="com.youracademy.app"
            hint="Must match the bundle ID in App Store Connect."
            error={state.errors?.iosBundleId}
            small
          />
        </div>
        <Field label="Store title" name="storeTitle" required maxLength={30} defaultValue={value("storeTitle")} hint="Up to 30 characters." error={state.errors?.storeTitle} small />
        <Field
          label="Short description"
          name="shortDescription"
          required
          maxLength={80}
          defaultValue={value("shortDescription")}
          hint="Up to 80 characters. Shown under the title on Google Play."
          error={state.errors?.shortDescription}
          small
        />
        <div className="flex flex-col gap-1.5">
          <label htmlFor="f-fullDescription" className="text-sm font-semibold">
            Full description
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
            50 to 4000 characters. Describe your courses and what students can do in the app.
          </span>
          <FieldError id="f-fullDescription-error" error={state.errors?.fullDescription} />
        </div>
        <div className="flex flex-wrap gap-3.5">
          <Field
            className="flex-[1_1_220px]"
            label="Support email"
            name="supportEmail"
            type="email"
            required
            defaultValue={value("supportEmail")}
            error={state.errors?.supportEmail}
            small
          />
          <Field
            className="flex-[1_1_220px]"
            label="Privacy policy URL"
            name="privacyUrl"
            type="url"
            required
            defaultValue={value("privacyUrl")}
            placeholder="https://your-academy.com/privacy"
            error={state.errors?.privacyUrl}
            small
          />
        </div>
        <fieldset className="m-0 flex flex-col gap-4 rounded-xl border border-line p-4">
          <legend className="px-1 text-[15px] font-bold">Screenshots</legend>
          <p className="m-0 text-sm leading-relaxed text-ink-4">
            Screenshots of your app for the store pages. They go into your store assets with your icons and feature graphic. You can add them later and start a new build.
          </p>
          <ScreenshotGallery
            kind="play_screenshot"
            field="playScreenshotIds"
            label="Google Play phone screenshots"
            hint="2 to 8 PNG or JPEG files, no transparency. Each side 320 to 3840 pixels, the long side at most twice the short side, for example 1080 × 1920."
            max={8}
            initial={screenshots.phone}
            error={state.errors?.playScreenshotIds}
            saved={state}
          />
          <ScreenshotGallery
            kind="ios_screenshot"
            field="iosScreenshotIds"
            label="iPhone screenshots"
            hint="Up to 10 PNG or JPEG files, no transparency, at 1320 × 2868, 1290 × 2796 or 1260 × 2736 pixels (6.9-inch display). Don't show prices or buy buttons."
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
        className="block w-full min-w-0 rounded-[10px] border border-line-strong bg-white p-2 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-ivory file:px-3 file:py-2 file:font-semibold file:text-midnight"
      />
      <span id={`${id}-hint`} className="text-xs text-muted">
        {hint}
      </span>
      <FieldError id={`${id}-error`} error={error} />
    </div>
  );
}

function SavedKey({ title, detail, store }: { title: string; detail: string; store: "google-play" | "app-store" | "firebase-android" | "firebase-ios" }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-success-bg px-4 py-3">
      <span className="flex min-w-0 items-center gap-2 text-[15px]">
        <Icon name="check_circle" size={20} filled className="text-success" />
        <span className="min-w-0 break-words">
          <b>{title} saved</b> · {detail}
        </span>
      </span>
      <button formAction={removeStoreKeyAction} name="store" value={store} formNoValidate className="cursor-pointer border-0 bg-transparent p-0 text-sm font-semibold text-danger hover:underline">
        Remove
      </button>
    </div>
  );
}

type SavedAppStoreKey = { issuerId: string | null; keyId: string | null } | null;

/** App Store Connect API key fields. Pro needs this or the Google Play key; on Starter it's optional and only signs the iOS app. */
function AppStoreKeyFields({ state, saved, optional = false }: { state: FormState; saved: SavedAppStoreKey; optional?: boolean }) {
  return (
    <fieldset className="m-0 flex flex-col gap-3.5 rounded-xl border border-line p-4">
      <legend className="px-1 text-[15px] font-bold">
        App Store Connect API key
        {optional ? <span className="font-normal text-muted"> (optional)</span> : null}
      </legend>
      {optional ? (
        <p className="m-0 flex gap-2 text-sm leading-relaxed text-ink-4">
          <Icon name="phone_iphone" size={20} className="text-muted" />
          <span>Needed to sign your iOS app. Without it you get the Android app only.</span>
        </p>
      ) : null}
      {saved ? <SavedKey title="API key" detail={`Key ID ${saved.keyId ?? ""}`} store="app-store" /> : null}
      <div className="flex flex-wrap gap-3.5">
        <Field
          className="flex-[1_1_220px]"
          label="Issuer ID"
          name="ascIssuerId"
          defaultValue={v(state, "ascIssuerId", "")}
          placeholder={saved?.issuerId ?? "69a6de7e-…"}
          autoComplete="off"
          error={state.errors?.ascIssuerId}
          small
        />
        <Field
          className="flex-[1_1_160px]"
          label="Key ID"
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
        label={saved ? "Replace the private key (.p8)" : "Private key (.p8)"}
        accept=".p8"
        hint="From App Store Connect › Users and Access › Integrations › App Store Connect API. Use the App Manager role."
        error={state.errors?.ascPrivateKeyFile}
      />
    </fieldset>
  );
}

type SavedFirebase = { android: boolean; ios: boolean };

/** Firebase config files. Optional on every plan: without them the app works, but without push notifications. */
function FirebaseFields({ state, saved }: { state: FormState; saved: SavedFirebase }) {
  return (
    <fieldset className="m-0 flex flex-col gap-3.5 rounded-xl border border-line p-4">
      <legend className="px-1 text-[15px] font-bold">
        Push notifications <span className="font-normal text-muted">(optional)</span>
      </legend>
      <p className="m-0 flex gap-2 text-sm leading-relaxed text-ink-4">
        <Icon name="notifications" size={20} className="text-muted" />
        <span>
          Notifications are sent through your own Firebase project. Add your apps in Firebase with the package name and bundle ID from the previous step, then upload their config files.{" "}
          <Link href="/guides/push-notifications">How to set up Firebase</Link>
        </span>
      </p>
      {saved.android ? <SavedKey title="google-services.json" detail="Android" store="firebase-android" /> : null}
      <FileInput
        name="firebaseAndroidFile"
        label={saved.android ? "Replace google-services.json" : "google-services.json (Android)"}
        accept="application/json,.json"
        hint="Firebase › Project settings › Your apps › Android app."
        error={state.errors?.firebaseAndroidFile}
      />
      {saved.ios ? <SavedKey title="GoogleService-Info.plist" detail="iOS" store="firebase-ios" /> : null}
      <FileInput
        name="firebaseIosFile"
        label={saved.ios ? "Replace GoogleService-Info.plist" : "GoogleService-Info.plist (iOS)"}
        accept=".plist,application/xml,text/xml"
        hint="Firebase › Project settings › Your apps › iOS app. iPhone notifications also need your APNs key in Firebase."
        error={state.errors?.firebaseIosFile}
      />
    </fieldset>
  );
}

export function PublishingStep({
  plan,
  saved,
}: {
  plan: "starter" | "pro" | null;
  saved: { play: { clientEmail: string | null } | null; appStore: SavedAppStoreKey; firebase: SavedFirebase };
}) {
  const [state, action] = useActionState(savePublishingAction, initialFormState);

  if (plan !== "pro") {
    return (
      <form action={action} noValidate className="flex flex-wrap items-start gap-6">
        <StepCard title="Publishing" id="h-publishing">
          <p className="m-0 text-[15px] leading-relaxed text-ink-4">
            On the Starter plan, you publish the apps under your own Google Play and App Store accounts. You get the files, the Android upload key and the store assets on the Builds &amp; downloads page, and our step-by-step guides take you through each store.
          </p>
          <ul className="m-0 flex list-none flex-col gap-2 p-0 text-[15px]">
            <li>
              <Link href="/guides/google-play">Publish on Google Play</Link>
            </li>
            <li>
              <Link href="/guides/app-store">Publish on the App Store</Link>
            </li>
          </ul>
          <FormMessage message={state.message} />
          <AppStoreKeyFields state={state} saved={saved.appStore} optional />
          <p className="m-0 text-sm text-muted">
            The key is encrypted and never shown again. We use it only to sign the builds you start, and you can remove it at any time. Want us to publish for you? Ask us about the Pro plan on WhatsApp.
          </p>
          <FirebaseFields state={state} saved={saved.firebase} />
          <div className="flex justify-between gap-3 pt-1.5">
            <Link href="/dashboard/setup?step=listing" className={`${btn.secondary} h-[46px]`}>
              Back
            </Link>
            <SubmitButton className="h-[46px]">Finish setup</SubmitButton>
          </div>
        </StepCard>
      </form>
    );
  }

  return (
    <form action={action} noValidate className="flex flex-wrap items-start gap-6">
      <StepCard title="Publishing" id="h-publishing">
        <p className="m-0 text-[15px] leading-relaxed text-ink-4">
          We use these keys only to upload the builds you start. They&apos;re encrypted, never shown again, and you can remove them at any time.
        </p>
        <FormMessage message={state.message} />

        <fieldset className="m-0 flex flex-col gap-3.5 rounded-xl border border-line p-4">
          <legend className="px-1 text-[15px] font-bold">Google Play</legend>
          {saved.play ? <SavedKey title="Service account key" detail={saved.play.clientEmail ?? "JSON key"} store="google-play" /> : null}
          <FileInput
            name="googlePlayFile"
            label={saved.play ? "Replace the service account key (JSON)" : "Service account key (JSON)"}
            accept="application/json,.json"
            hint="From Google Cloud › IAM › Service accounts › Keys. Give the account access to your app in Play Console."
            error={state.errors?.googlePlayFile}
          />
        </fieldset>

        <AppStoreKeyFields state={state} saved={saved.appStore} />

        <FirebaseFields state={state} saved={saved.firebase} />

        <div className="flex justify-between gap-3 pt-1.5">
          <Link href="/dashboard/setup?step=listing" className={`${btn.secondary} h-[46px]`}>
            Back
          </Link>
          <SubmitButton className="h-[46px]">Save &amp; finish</SubmitButton>
        </div>
      </StepCard>
    </form>
  );
}
