import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { chooseMoreStoresAction, choosePublishingModeAction } from "@/app/actions/publishing";
import { SubmitButton } from "@/components/form";
import { Icon } from "@/components/icon";
import { Badge, Notice, PageHeader, btn, formatDateTime } from "@/components/ui";
import { appLabel, licensePageName } from "@/lib/app/label";
import { hasStoreKeys } from "@/lib/app/setup";
import { requireClient } from "@/lib/auth/session";
import { getContact } from "@/lib/contact";
import { getStore } from "@/lib/data";
import { appPlan } from "@/lib/entitlements";
import { hasFeature } from "@/lib/plans";
import { publishingTeamEmail } from "@/lib/publishing/service";
import {
  APP_STORE_CATEGORIES,
  canUseManagedPublishing,
  checklistProgress,
  CLIENT_STATUS_LABEL,
  listingMissing,
  MORE_STORES,
  PLAY_CATEGORIES,
  publishingEventLabel,
  requestStores,
  statusText,
  statusTone,
  stepDone,
  stepsFor,
  stepText,
  STORE_ICON,
  STORE_TITLE,
  trackOf,
} from "@/lib/publishing/steps";
import { kindOf, suggestedCategories, wordsOf } from "@/lib/app/kinds";
import { reviewNotesFor } from "@/lib/publishing/review-notes";
import { ChecklistForm, ListingForm } from "./forms";

export const metadata: Metadata = { title: "Publishing" };

const GROUP: Record<string, string> = { android: "Google Play", ios: "App Store", both: "Push notifications", galaxy: "Galaxy Store", huawei: "AppGallery" };

/** 35, 36 What the extra stores are, on the Publishing page. */
const MORE_STORE_TEXT: Record<(typeof MORE_STORES)[number], string> = {
  galaxy: "Samsung's own app store, on every Samsung Galaxy phone and tablet.",
  huawei: "Huawei's app store, for Huawei phones without Google Play.",
};

function Choice({ mode, title, text, points, disabled }: { mode: "self" | "managed"; title: string; text: string; points: string[]; disabled?: string }) {
  return (
    <form action={choosePublishingModeAction} className="flex flex-col gap-3 rounded-2xl border border-line bg-white p-5 sm:p-6">
      <input type="hidden" name="mode" value={mode} />
      <span className="flex items-center gap-2.5">
        <Icon name={mode === "managed" ? "storefront" : "menu_book"} size={26} />
        <h2 className="m-0 text-lg font-bold">{title}</h2>
      </span>
      <p className="m-0 text-[15px] leading-relaxed text-ink-4">{text}</p>
      <ul className="m-0 flex list-none flex-col gap-2 p-0 text-[15px] leading-relaxed text-ink-4">
        {points.map((point) => (
          <li key={point} className="flex items-start gap-2">
            <Icon name="check" size={18} className="mt-[3px] text-success" />
            <span>{point}</span>
          </li>
        ))}
      </ul>
      <div className="mt-auto pt-2">
        <SubmitButton variant={mode === "managed" ? "primary" : "secondary"} className="h-11" disabled={Boolean(disabled)} pendingText="Saving…">
          {title}
        </SubmitButton>
        {disabled ? <span className="mt-1.5 block text-sm text-muted">{disabled}</span> : null}
      </div>
    </form>
  );
}

export default async function PublishingPage({ searchParams }: PageProps<"/dashboard/publishing">) {
  const { app, license } = await requireClient();
  if (!app) redirect("/dashboard/app-type");
  const query = await searchParams;
  const store = await getStore();
  const contact = await getContact();
  const request = await store.getPublishingRequest(app.id);
  const mode = app.publishingMode ?? request?.mode ?? null;
  const teamEmail = await publishingTeamEmail(store);
  const current = await appPlan(await getStore(), license, new Date());
  const allowed = canUseManagedPublishing(current);
  const notIncluded = allowed ? undefined : `Not included in this app's plan. Upgrade it on ${licensePageName(app)}.`;
  const autoUpload = hasFeature(current, "auto_publish");

  const header = <PageHeader title="Publishing" description={<>{appLabel(app)} on Google Play and the App Store.</>} />;

  const passwords = (
    <p className="m-0 flex gap-2 text-sm leading-relaxed text-ink-4">
      <Icon name="lock" size={20} className="text-muted" />
      <span>
        We never ask for your Google or Apple passwords. The accounts stay yours, in your name: you invite our team email, {teamEmail}, and you can remove
        our access at any time.
      </span>
    </p>
  );

  if (!mode || !request || (mode === "managed" && request.mode !== "managed")) {
    return (
      <>
        {header}
        {query.error === "not-included" ? (
          <Notice tone="warn" icon="warning" role="alert">
            Publishing for you isn&apos;t included in this app&apos;s plan. <Link href="/dashboard/license#change-plan">Upgrade the plan</Link> or <a href={contact.whatsappUrl}>message us on WhatsApp</a>.
          </Notice>
        ) : null}
        <p className="m-0 text-[15px] leading-relaxed text-ink-4">How should your app get to Google Play and the App Store? You can change your mind later.</p>
        <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(min(320px,100%),1fr))]">
          <Choice
            mode="managed"
            title="Publish it for me"
            text="Our team publishes your app on both stores and keeps it there, under your own developer accounts."
            points={[
              "You create your Google Play and Apple developer accounts, in your name: we show you how, step by step.",
              "You invite our team email to them. No passwords.",
              "We prepare the store listings, send the app for review and tell you each step by email.",
            ]}
            disabled={notIncluded}
          />
          <Choice
            mode="self"
            title="I'll publish it myself"
            text="You upload the files from Builds & downloads to your own store accounts, with our step-by-step guides."
            points={[
              "Download the Android App Bundle, the iOS app and the store assets.",
              autoUpload
                ? "Or add your store keys in App setup › Publishing and we upload every new build for you."
                : "Follow our Google Play and App Store guides.",
            ]}
          />
        </div>
        {passwords}
      </>
    );
  }

  if (mode === "self") {
    const keys = hasStoreKeys(app);
    return (
      <>
        {header}
        {query.chosen === "self" ? (
          <Notice tone="success" icon="check_circle" role="status">
            Saved: you publish {appLabel(app)} yourself.
          </Notice>
        ) : null}
        <section aria-labelledby="h-self" className="flex flex-col gap-4 rounded-2xl border border-line bg-white p-5 sm:p-6">
          <h2 id="h-self" className="m-0 text-lg font-bold">
            You publish it yourself
          </h2>
          <ol className="m-0 list-decimal space-y-2 pl-5 text-[15px] leading-relaxed marker:font-bold">
            <li>
              Download your files on <Link href="/dashboard/builds">Builds &amp; downloads</Link>: the App Bundle for Google Play, the iOS app and the store
              assets.
            </li>
            <li>
              Follow our guides: <Link href="/guides/google-play">Publish on Google Play</Link> and <Link href="/guides/app-store">Publish on the App Store</Link>.
            </li>
            <li>
              More Android stores: <Link href="/dashboard/publishing/more-stores">Samsung Galaxy Store and Huawei AppGallery</Link>, with their guides.
            </li>
            {autoUpload ? (
              <li>
                With your store keys in <Link href="/dashboard/setup?step=publishing">App setup › Publishing</Link>, we upload every new build for you.
                {keys.play || keys.appStore ? " Your keys are saved." : " No key is saved yet."}
              </li>
            ) : null}
          </ol>
        </section>
        <form action={choosePublishingModeAction} className="flex flex-col gap-2 rounded-2xl border border-line bg-white p-5 sm:p-6">
          <input type="hidden" name="mode" value="managed" />
          <h2 className="m-0 text-lg font-bold">Would you rather we publish it?</h2>
          <p className="m-0 text-[15px] text-ink-4">Our team publishes it under your own developer accounts. You only create the accounts and invite us.</p>
          <div>
            <SubmitButton variant="secondary" className="h-10" disabled={Boolean(notIncluded)} pendingText="Saving…">
              Publish it for me
            </SubmitButton>
            {notIncluded ? <span className="mt-1.5 block text-sm text-muted">{notIncluded}</span> : null}
          </div>
        </form>
      </>
    );
  }

  // "Publish it for me"
  const events = await store.listPublishingEvents(app.id);
  const progress = checklistProgress(request, app);
  const missing = listingMissing(app, request.listing);
  const suggested = suggestedCategories(app);
  const steps = stepsFor(request).map((step) => ({
    id: step.id,
    title: step.title,
    text: stepText(step, teamEmail),
    links: step.links,
    group: GROUP[step.store]!,
    done: stepDone(request, step.id),
    doneAt: request.checklist[step.id] ? formatDateTime(new Date(request.checklist[step.id]!)) : null,
  }));

  return (
    <>
      {header}
      {query.chosen === "managed" ? (
        <Notice tone="success" icon="check_circle" role="status">
          Thanks! Our team has your request. Work through the steps below; we email you each time something changes.
        </Notice>
      ) : null}

      <section aria-labelledby="h-status" className="flex flex-col gap-3">
        <h2 id="h-status" className="m-0 text-lg font-bold">
          Where it stands
        </h2>
        <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(min(300px,100%),1fr))]">
          {requestStores(request).map((which) => {
            const track = trackOf(request, which);
            return (
              <section key={which} aria-label={STORE_TITLE[which]} className="flex flex-col gap-2.5 rounded-2xl border border-line bg-white p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="flex items-center gap-2 text-base font-bold">
                    <Icon name={STORE_ICON[which]} size={22} />
                    {STORE_TITLE[which]}
                  </span>
                  <Badge tone={statusTone(track.status)}>{CLIENT_STATUS_LABEL[track.status]}</Badge>
                </div>
                <p className="m-0 text-sm leading-relaxed text-ink-4">{statusText(which, track.status)}</p>
                {track.note ? (
                  <p className="m-0 rounded-lg bg-sand px-3 py-2 text-sm leading-relaxed">
                    <span className="font-semibold">Note from our team:</span> {track.note}
                  </p>
                ) : null}
                {track.status === "live" && track.storeUrl ? (
                  <a href={track.storeUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm font-semibold">
                    See it on {STORE_TITLE[which]}
                    <Icon name="open_in_new" size={16} />
                  </a>
                ) : null}
                <span className="text-xs text-muted">{track.updatedAt ? `Updated ${formatDateTime(track.updatedAt)}` : `Asked ${formatDateTime(request.requestedAt)}`}</span>
              </section>
            );
          })}
        </div>
      </section>

      {/* 35, 36 Samsung Galaxy Store and Huawei AppGallery, when the client wants them too. */}
      <form action={chooseMoreStoresAction} aria-labelledby="h-more-stores" className="flex flex-col gap-3 rounded-2xl border border-line bg-white p-5 sm:p-6">
        <h2 id="h-more-stores" className="m-0 text-lg font-bold">
          More Android stores
        </h2>
        <p className="m-0 text-[15px] leading-relaxed text-ink-4">
          We can publish your Android app on these stores too, under your own accounts. Each one adds two steps to your list below.
        </p>
        <fieldset className="m-0 flex flex-col gap-2.5 border-0 p-0">
          <legend className="sr-only">Also publish on</legend>
          {MORE_STORES.map((which) => (
            <label key={which} className="flex cursor-pointer items-start gap-3 rounded-xl border border-line p-3.5">
              <input type="checkbox" name="store" value={which} defaultChecked={Boolean(request[which])} className="mt-1 h-4 w-4 accent-midnight" />
              <span className="flex flex-col gap-0.5">
                <span className="text-[15px] font-bold">{STORE_TITLE[which]}</span>
                <span className="text-sm text-ink-4">{MORE_STORE_TEXT[which]}</span>
              </span>
            </label>
          ))}
        </fieldset>
        <div>
          <SubmitButton variant="secondary" className="h-10" pendingText="Saving…">
            Save stores
          </SubmitButton>
        </div>
      </form>

      <section aria-labelledby="h-checklist" className="flex flex-col gap-4 rounded-2xl border border-line bg-white p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-col gap-1">
            <h2 id="h-checklist" className="m-0 text-lg font-bold">
              Your steps
            </h2>
            <span className="text-sm text-muted">
              {progress.done} of {progress.total} done
              {request.readyAt ? ` · ready since ${formatDateTime(request.readyAt)}` : ""}
            </span>
          </div>
          {progress.complete ? <Badge tone="success">All done</Badge> : null}
        </div>
        <div className="h-2 rounded-full bg-ivory" role="progressbar" aria-valuemin={0} aria-valuemax={progress.total} aria-valuenow={progress.done} aria-label="Steps done">
          <div className="h-full rounded-full bg-ember" style={{ width: `${(progress.done / progress.total) * 100}%` }} />
        </div>
        <p className="m-0 text-[15px] leading-relaxed text-ink-4">
          The fees go straight to Google and Apple, in your name; we never pay them for you or see your card. Tick each step when you&apos;ve done it.
        </p>
        <ChecklistForm steps={steps} firebaseBy={request.firebaseBy} />
        {passwords}
      </section>

      <section aria-labelledby="h-listing" className="flex flex-col gap-4 rounded-2xl border border-line bg-white p-5 sm:p-6">
        <div className="flex flex-col gap-1">
          <h2 id="h-listing" className="m-0 text-lg font-bold">
            Store listing details
          </h2>
          <span className="text-sm text-muted">What the stores show. The texts and screenshots come from your app setup.</span>
        </div>
        <dl className="m-0 grid gap-x-6 gap-y-2.5 text-[15px] sm:grid-cols-[minmax(160px,auto)_1fr]">
          {[
            ["App name on the stores", app.storeTitle],
            ["Short description", app.shortDescription],
            ["Full description", app.fullDescription ? `${app.fullDescription.slice(0, 160)}${app.fullDescription.length > 160 ? "…" : ""}` : null],
            ["Support email", app.supportEmail],
            ["Privacy policy URL", app.privacyUrl],
            [
              "Screenshots",
              `${app.phoneScreenshotIds.length} for Google Play, ${app.iphoneScreenshotIds.length} for the App Store${
                app.phoneScreenshotIds.length + app.iphoneScreenshotIds.length === 0 ? " (we take them from your app if you don't add any)" : ""
              }`,
            ],
          ].map(([label, value]) => (
            <div key={label} className="contents">
              <dt className="font-semibold text-muted">{label}</dt>
              <dd className="m-0 min-w-0 break-words">{value ?? <span className="text-danger">Missing</span>}</dd>
            </div>
          ))}
        </dl>
        <div>
          <Link href="/dashboard/setup?step=listing" className={`${btn.secondary} h-10`}>
            <Icon name="edit" size={18} />
            Edit texts and screenshots
          </Link>
        </div>
        <ListingForm
          current={{
            playCategory: request.listing.playCategory ?? suggested.play,
            appStoreCategory: request.listing.appStoreCategory ?? suggested.appStore,
            contentRatingNotes: request.listing.contentRatingNotes ?? "",
            reviewNotes: reviewNotesFor(app, request.listing.reviewNotes),
          }}
          playCategories={PLAY_CATEGORIES}
          appStoreCategories={APP_STORE_CATEGORIES}
          reviewNote={kindOf(app).reviewNote}
          ratingExample={wordsOf(app).ratingExample}
        />
        {missing.length ? (
          <Notice icon="info">Still missing: {missing.join(", ")}.</Notice>
        ) : (
          <Notice tone="success" icon="check_circle">
            Your listing details are complete.
          </Notice>
        )}
      </section>

      {events.length ? (
        <section aria-labelledby="h-history" className="flex flex-col gap-3 rounded-2xl border border-line bg-white px-4 py-5 sm:px-6">
          <h2 id="h-history" className="m-0 text-lg font-bold">
            History
          </h2>
          <ul className="m-0 flex list-none flex-col gap-2 p-0 text-sm">
            {events.map((event) => (
              <li key={event.id} className="flex flex-wrap gap-x-2 border-t border-line-soft pt-2 first:border-t-0 first:pt-0">
                <span className="text-muted">{formatDateTime(event.at)}</span>
                <span className="font-semibold">
                  {publishingEventLabel(event, "client")}
                </span>
                {event.note ? <span className="basis-full text-ink-4">{event.note}</span> : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <form action={choosePublishingModeAction} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-white px-5 py-4">
        <input type="hidden" name="mode" value="self" />
        <span className="text-sm text-ink-4">Changed your mind? You can publish the app yourself with our guides instead.</span>
        <SubmitButton variant="ghost" className="h-10" pendingText="Saving…">
          I&apos;ll publish it myself
        </SubmitButton>
      </form>
    </>
  );
}
