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
import { localePath } from "@/i18n/paths";
import { publishingStatusIn } from "@/lib/publishing/status-lang";
import { richText } from "@/i18n/rich";
import { formatList } from "@/i18n/format";
import { dashboardText } from "@/lib/dashboard-lang";
import type { DashKey } from "@/i18n/dashboard";
import type { PublishingStatus } from "@/lib/data/types";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await dashboardText()).t("publishing.title") };
}

/** The group of each step: a store's name, or "Push notifications" (a catalog key). */
const GROUP: Record<string, string> = {
  android: "Google Play",
  ios: "App Store",
  galaxy: "Galaxy Store",
  huawei: "AppGallery",
  xiaomi: "Xiaomi GetApps",
};

/** 35, 36, 42 What the extra stores are, on the Publishing page. */
const MORE_STORE_TEXT: Record<(typeof MORE_STORES)[number], DashKey> = {
  galaxy: "publishing.galaxyText",
  huawei: "publishing.huaweiText",
  xiaomi: "publishing.xiaomiText",
};


function Choice({ mode, title, text, points, disabled, saving }: { mode: "self" | "managed"; title: string; text: string; points: string[]; disabled?: string; saving: string }) {
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
        <SubmitButton variant={mode === "managed" ? "primary" : "secondary"} className="h-11" disabled={Boolean(disabled)} pendingText={saving}>
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
  const { t, k, lang } = await dashboardText();
  const saving = t("common.saving");
  const name = appLabel(app) === "Untitled app" ? k("Untitled app") : appLabel(app);
  const query = await searchParams;
  const store = await getStore();
  const contact = await getContact();
  const request = await store.getPublishingRequest(app.id);
  const mode = app.publishingMode ?? request?.mode ?? null;
  const teamEmail = await publishingTeamEmail(store);
  const current = await appPlan(await getStore(), license, new Date());
  const allowed = canUseManagedPublishing(current);
  const notIncluded = allowed ? undefined : t("publishing.notIncluded", { page: k(licensePageName(app)) });
  const autoUpload = hasFeature(current, "auto_publish");

  // 41 Every store Yallapp publishes to.
  // 46 Links that open the app: the Play signing fingerprint and the Team ID live on their own page.
  const header = (
    <PageHeader
      title={t("publishing.title")}
      description={t("publishing.intro", { app: name })}
      actions={
        <Link href="/dashboard/publishing/links" className={`${btn.secondary} h-10 px-4 text-sm`}>
          <Icon name="link" size={18} />
          {t("publishing.links")}
        </Link>
      }
    />
  );

  const passwords = (
    <p className="m-0 flex gap-2 text-sm leading-relaxed text-ink-4">
      <Icon name="lock" size={20} className="text-muted" />
      <span>{richText(t("publishing.passwords"), { email: () => <bdi dir="ltr">{teamEmail}</bdi> })}</span>
    </p>
  );

  if (!mode || !request || (mode === "managed" && request.mode !== "managed")) {
    return (
      <>
        {header}
        {query.error === "not-included" ? (
          <Notice tone="warn" icon="warning" role="alert">
            {richText(t("publishing.notIncludedAlert"), { wa: (chunk) => <a href={contact.whatsappUrl}>{chunk}</a>, upgrade: (chunk) => <Link href="/dashboard/license#change-plan">{chunk}</Link> })}
          </Notice>
        ) : null}
        <p className="m-0 text-[15px] leading-relaxed text-ink-4">{t("publishing.howQuestion")}</p>
        <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(min(320px,100%),1fr))]">
          <Choice
            mode="managed"
            title={t("publishing.managed")}
            text={t("publishing.managedText")}
            points={[t("publishing.managedPoint1"), t("publishing.managedPoint2"), t("publishing.managedPoint3")]}
            disabled={notIncluded}
            saving={saving}
          />
          <Choice
            mode="self"
            title={t("publishing.self")}
            text={t("publishing.selfText")}
            points={[t("publishing.selfPoint1"), autoUpload ? t("publishing.selfPointAuto") : t("publishing.selfPointGuides")]}
            saving={saving}
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
            {t("publishing.savedSelf", { app: name })}
          </Notice>
        ) : null}
        <section aria-labelledby="h-self" className="flex flex-col gap-4 rounded-2xl border border-line bg-white p-5 sm:p-6">
          <h2 id="h-self" className="m-0 text-lg font-bold">
            {t("publishing.selfTitle")}
          </h2>
          <ol className="m-0 list-decimal space-y-2 ps-5 text-[15px] leading-relaxed marker:font-bold">
            <li>{richText(t("publishing.selfStep1"), { link: (chunk) => <Link href="/dashboard/builds">{chunk}</Link> })}</li>
            <li>
              {richText(t("publishing.selfStep2"), {
                play: (chunk) => <Link href={localePath(lang, "/guides/google-play")}>{chunk}</Link>,
                apple: (chunk) => <Link href={localePath(lang, "/guides/app-store")}>{chunk}</Link>,
              })}
            </li>
            <li>{richText(t("publishing.selfStep3"), { link: (chunk) => <Link href="/dashboard/publishing/more-stores">{chunk}</Link> })}</li>
            {autoUpload ? (
              <li>
                {richText(keys.play || keys.appStore ? t("publishing.selfStep4Saved") : t("publishing.selfStep4None"), {
                  link: (chunk) => <Link href="/dashboard/setup?step=publishing">{chunk}</Link>,
                })}
              </li>
            ) : null}
          </ol>
        </section>
        <form action={choosePublishingModeAction} className="flex flex-col gap-2 rounded-2xl border border-line bg-white p-5 sm:p-6">
          <input type="hidden" name="mode" value="managed" />
          <h2 className="m-0 text-lg font-bold">{t("publishing.ratherWe")}</h2>
          <p className="m-0 text-[15px] text-ink-4">{t("publishing.ratherWeText")}</p>
          <div>
            <SubmitButton variant="secondary" className="h-10" disabled={Boolean(notIncluded)} pendingText={saving}>
              {t("publishing.managed")}
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
    title: k(step.title),
    text: k(stepText(step, teamEmail)),
    links: step.links.map((link) => ({ ...link, label: k(link.label) })),
    group: step.store === "both" ? t("publishing.groupPush") : GROUP[step.store]!,
    done: stepDone(request, step.id),
    doneAt: request.checklist[step.id] ? formatDateTime(new Date(request.checklist[step.id]!), lang) : null,
  }));

  return (
    <>
      {header}
      {query.chosen === "managed" ? (
        <Notice tone="success" icon="check_circle" role="status">
          {t("publishing.thanks")}
        </Notice>
      ) : null}

      <section aria-labelledby="h-status" className="flex flex-col gap-3">
        <h2 id="h-status" className="m-0 text-lg font-bold">
          {t("publishing.whereStands")}
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
                  <Badge tone={statusTone(track.status)}>{k(CLIENT_STATUS_LABEL[track.status])}</Badge>
                </div>
                <p className="m-0 text-sm leading-relaxed text-ink-4">
                  {publishingStatusIn(lang, which, track.status).text}
                </p>
                {track.note ? (
                  <p className="m-0 rounded-lg bg-sand px-3 py-2 text-sm leading-relaxed">
                    {richText(t("publishing.noteFromTeam", { note: track.note }), { b: (chunk) => <span className="font-semibold">{chunk}</span> })}
                  </p>
                ) : null}
                {track.status === "live" && track.storeUrl ? (
                  <a href={track.storeUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm font-semibold">
                    {t("publishing.seeOn", { store: STORE_TITLE[which] })}
                    <Icon name="open_in_new" size={16} />
                  </a>
                ) : null}
                <span className="text-xs text-muted">
                  {track.updatedAt ? t("publishing.updated", { date: formatDateTime(track.updatedAt, lang) }) : t("publishing.asked", { date: formatDateTime(request.requestedAt, lang) })}
                </span>
              </section>
            );
          })}
        </div>
      </section>

      {/* 35, 36, 42 Samsung Galaxy Store, Huawei AppGallery and Xiaomi GetApps, when the client wants them too. */}
      <form action={chooseMoreStoresAction} aria-labelledby="h-more-stores" className="flex flex-col gap-3 rounded-2xl border border-line bg-white p-5 sm:p-6">
        <h2 id="h-more-stores" className="m-0 text-lg font-bold">
          {t("publishing.moreStores")}
        </h2>
        <p className="m-0 text-[15px] leading-relaxed text-ink-4">{t("publishing.moreStoresText")}</p>
        <fieldset className="m-0 flex flex-col gap-2.5 border-0 p-0">
          <legend className="sr-only">{t("publishing.alsoOn")}</legend>
          {MORE_STORES.map((which) => (
            <label key={which} className="flex cursor-pointer items-start gap-3 rounded-xl border border-line p-3.5">
              <input type="checkbox" name="store" value={which} defaultChecked={Boolean(request[which])} className="mt-1 h-4 w-4 accent-midnight" />
              <span className="flex flex-col gap-0.5">
                <span className="text-[15px] font-bold">{STORE_TITLE[which]}</span>
                <span className="text-sm text-ink-4">{t(MORE_STORE_TEXT[which])}</span>
              </span>
            </label>
          ))}
        </fieldset>
        <div>
          <SubmitButton variant="secondary" className="h-10" pendingText={saving}>
            {t("publishing.saveStores")}
          </SubmitButton>
        </div>
      </form>

      <section aria-labelledby="h-checklist" className="flex flex-col gap-4 rounded-2xl border border-line bg-white p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-col gap-1">
            <h2 id="h-checklist" className="m-0 text-lg font-bold">
              {t("publishing.yourSteps")}
            </h2>
            <span className="text-sm text-muted">
              {request.readyAt
                ? t("publishing.progressReady", { done: progress.done, total: progress.total, date: formatDateTime(request.readyAt, lang) })
                : t("publishing.progress", { done: progress.done, total: progress.total })}
            </span>
          </div>
          {progress.complete ? <Badge tone="success">{t("publishing.allDone")}</Badge> : null}
        </div>
        <div className="h-2 rounded-full bg-ivory" role="progressbar" aria-valuemin={0} aria-valuemax={progress.total} aria-valuenow={progress.done} aria-label={t("publishing.stepsDone")}>
          <div className="h-full rounded-full bg-ember" style={{ width: `${(progress.done / progress.total) * 100}%` }} />
        </div>
        <p className="m-0 text-[15px] leading-relaxed text-ink-4">
          {t("publishing.fees")}
        </p>
        <ChecklistForm steps={steps} firebaseBy={request.firebaseBy} />
        {passwords}
      </section>

      <section aria-labelledby="h-listing" className="flex flex-col gap-4 rounded-2xl border border-line bg-white p-5 sm:p-6">
        <div className="flex flex-col gap-1">
          <h2 id="h-listing" className="m-0 text-lg font-bold">
            {t("publishing.listing")}
          </h2>
          <span className="text-sm text-muted">{t("publishing.listingText")}</span>
        </div>
        <dl className="m-0 grid gap-x-6 gap-y-2.5 text-[15px] sm:grid-cols-[minmax(160px,auto)_1fr]">
          {[
            [t("publishing.storeName"), app.storeTitle],
            [t("publishing.shortDescription"), app.shortDescription],
            [t("publishing.fullDescription"), app.fullDescription ? `${app.fullDescription.slice(0, 160)}${app.fullDescription.length > 160 ? "…" : ""}` : null],
            [t("publishing.supportEmail"), app.supportEmail],
            [t("publishing.privacyUrl"), app.privacyUrl],
            [
              t("publishing.screenshots"),
              t(app.phoneScreenshotIds.length + app.iphoneScreenshotIds.length === 0 ? "publishing.screenshotNone" : "publishing.screenshotCount", {
                play: app.phoneScreenshotIds.length,
                apple: app.iphoneScreenshotIds.length,
              }),
            ],
          ].map(([label, value]) => (
            <div key={label} className="contents">
              <dt className="font-semibold text-muted">{label}</dt>
              <dd className="m-0 min-w-0 break-words">{value ?? <span className="text-danger">{t("publishing.missing")}</span>}</dd>
            </div>
          ))}
        </dl>
        <div>
          <Link href="/dashboard/setup?step=listing" className={`${btn.secondary} h-10`}>
            <Icon name="edit" size={18} />
            {t("publishing.editTexts")}
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
          ratingExample={k(wordsOf(app).ratingExample)}
        />
        {missing.length ? (
          <Notice icon="info">{t("publishing.stillMissing", { items: lang === "en" ? missing.join(", ") : formatList(lang, missing.map(k)) })}</Notice>
        ) : (
          <Notice tone="success" icon="check_circle">
            {t("publishing.listingComplete")}
          </Notice>
        )}
      </section>

      {events.length ? (
        <section aria-labelledby="h-history" className="flex flex-col gap-3 rounded-2xl border border-line bg-white px-4 py-5 sm:px-6">
          <h2 id="h-history" className="m-0 text-lg font-bold">
            {t("publishing.history")}
          </h2>
          <ul className="m-0 flex list-none flex-col gap-2 p-0 text-sm">
            {events.map((event) => (
              <li key={event.id} className="flex flex-wrap gap-x-2 border-t border-line-soft pt-2 first:border-t-0 first:pt-0">
                <span className="text-muted">{formatDateTime(event.at, lang)}</span>
                <span className="font-semibold">
                  {event.store === "mode" ? k(publishingEventLabel(event, "client")) : `${STORE_TITLE[event.store]}: ${k(CLIENT_STATUS_LABEL[event.status as PublishingStatus] ?? event.status)}`}
                </span>
                {event.note ? <span className="basis-full text-ink-4">{event.note}</span> : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <form action={choosePublishingModeAction} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-white px-5 py-4">
        <input type="hidden" name="mode" value="self" />
        <span className="text-sm text-ink-4">{t("publishing.changedMind")}</span>
        <SubmitButton variant="ghost" className="h-10" pendingText={saving}>
          {t("publishing.self")}
        </SubmitButton>
      </form>
    </>
  );
}
