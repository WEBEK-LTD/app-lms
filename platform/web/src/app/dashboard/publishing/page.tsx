import type { Metadata } from "next";
import type { CSSProperties, ReactNode } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { choosePublishingModeAction } from "@/app/actions/publishing";
import { SubmitButton } from "@/components/form";
import { Icon } from "@/components/icon";
import { formatDateTime } from "@/components/ui";
import { KitBar, KitCallout, KitFact, KitFacts, KitFold, KitHeader, KitHero, KitList, KitNext, KitPage, KitRow, KitSection, KitStatus, kit } from "@/components/studio-page";
import { KitInspectButton, KitInspectGroup } from "@/components/studio-page/inspect";
import { KitInspectorBody, KitInspectorHead } from "@/components/studio-page/parts";
import { appLabel } from "@/lib/app/label";
import { hasStoreKeys } from "@/lib/app/setup";
import { requireClient } from "@/lib/auth/session";
import { getStore } from "@/lib/data";
import { appPlan } from "@/lib/entitlements";
import { hasFeature } from "@/lib/plans";
import { appPublishingEmail } from "@/lib/publishing/service";
import {
  APP_STORE_CATEGORIES,
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
import { reviewNotesFor, suggestedReviewNotes } from "@/lib/publishing/review-notes";
import { ChecklistForm, ListingForm } from "./forms";
import { ReadySection } from "./ready";
import { ReviewSection } from "./review-section";
import { PublishingTabs } from "./tabs";
import { courierAppNameOf, hasCourierJobs, secondAppRoleOf } from "@/lib/delivery/courier-app";
import { reviewPlaceOf, vendorReviewNotes } from "@/lib/market/review";
import { hasVendorApp, vendorAppNameOf } from "@/lib/market/vendor-app";
import { reviewNotes } from "@/lib/delivery/review";
import { schoolReviewNotes } from "@/lib/school/review";
import { loadUniSettings, universityOn } from "@/lib/university/settings";
import { deliverySettingsOf } from "@/lib/delivery/settings";
import { readiness, readyToSubmit } from "@/lib/publishing/readiness";
import { REJECTION_LINK } from "@/lib/publishing/review";
import { appUrl } from "@/lib/env";
import { localePath } from "@/i18n/paths";
import { publishingStatusIn } from "@/lib/publishing/status-lang";
import { richText } from "@/i18n/rich";
import { formatList } from "@/i18n/format";
import { dashboardText } from "@/lib/dashboard-lang";
import type { DashKey } from "@/i18n/dashboard";
import type { App, PublishingStatus } from "@/lib/data/types";
import { SamplesStoreNotice } from "@/components/samples";
import { usesYallappFirebase } from "@/lib/firebase/mode";

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


/** One way to get to the stores, as one calm panel of the hero card. */
function Choice({ mode, title, text, points, saving }: { mode: "self" | "managed"; title: string; text: string; points: string[]; saving: string }) {
  return (
    <form action={choosePublishingModeAction} className={`flex flex-col gap-3 rounded-3xl p-5 sm:p-6 ${mode === "managed" ? "bg-(--sp-surface) ring-1 ring-ember/50" : "bg-(--sp-soft)"}`}>
      <input type="hidden" name="mode" value={mode} />
      <span className="flex items-center gap-3">
        <span aria-hidden="true" className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${mode === "managed" ? "bg-peach text-accent" : "bg-(--sp-tile) text-(--sp-ink)"}`}>
          <Icon name={mode === "managed" ? "storefront" : "menu_book"} size={24} />
        </span>
        <h3 className="m-0 text-[17px] font-bold">{title}</h3>
      </span>
      <p className="m-0 text-[15px] leading-relaxed text-(--sp-muted)">{text}</p>
      <ul className="m-0 flex list-none flex-col gap-2 p-0 text-sm leading-relaxed text-(--sp-ink)">
        {points.map((point) => (
          <li key={point} className="flex items-start gap-2">
            <Icon name="check" size={18} className="mt-[1px] text-success" />
            <span>{point}</span>
          </li>
        ))}
      </ul>
      <div className="mt-auto pt-2">
        <SubmitButton variant={mode === "managed" ? "main" : "secondary"} className="h-11" pendingText={saving}>
          {title}
        </SubmitButton>
      </div>
    </form>
  );
}

export default async function PublishingPage({ searchParams }: PageProps<"/dashboard/publishing">) {
  const { app, license } = await requireClient("settings");
  if (!app) redirect("/dashboard/app-type");
  const text = await dashboardText();
  const { t, k, lang } = text;
  const saving = t("common.saving");
  const name = appLabel(app) === "Untitled app" ? k("Untitled app") : appLabel(app);
  const query = await searchParams;
  const store = await getStore();
  const request = await store.getPublishingRequest(app.id);
  const mode = app.publishingMode ?? request?.mode ?? null;
  // 138 The app's own publishing account (given now, the first time), else the publishing team email.
  const teamEmail = (await appPublishingEmail(store, app)).email;
  const current = await appPlan(await getStore(), license, new Date());
  // 104.7 A delivery app's notes for the reviewers of both its apps.
  const delivery = hasCourierJobs(app) ? deliverySettingsOf(await store.getDeliverySettings(app.id)) : null;
  const notes = delivery ? reviewNotes(app, delivery) : null;
  // 105.4.7b A school's notes: the one review sign-in and where each role is.
  // 113.9 And whether it is a university.
  const schoolNotes = app.connector?.kind === "school" ? schoolReviewNotes(app, { university: universityOn(app, current, await loadUniSettings(store, app.id)) }) : null;
  // 115.74 A marketplace's vendor app: its own notes, the reviewers a test manager of its first supermarket or shop.
  const reviewPlace = delivery && hasVendorApp(app, delivery) ? await reviewPlaceOf(store, app.id) : null;
  const vendorNotes = reviewPlace ? vendorReviewNotes(app, reviewPlace) : null;
  const vendor = vendorNotes && reviewPlace ? { notes: vendorNotes, name: vendorAppNameOf(app), place: reviewPlace.name } : null;
  const deliveryNotes = notes && delivery ? { ...notes, courierName: courierAppNameOf(app, delivery), driver: secondAppRoleOf(app) === "driver", vendor } : schoolNotes ? { customer: schoolNotes, courier: null, courierName: "" } : null;

  // 41 Every store Yallapp publishes to.
  // 46 Links that open the app: the Play signing fingerprint and the Team ID live on their own page.
  // 132.171 The console's look: the title with one main action in Ember (the store texts when our team publishes, the
  // builds when the owner does), Publishing's own pages as tabs under it; where it stands as tiles, each store opening in
  // the inspector; the steps, the listing, the review account and the stores' checks as cards, their long guides folded.
  const header = (main: ReactNode) => (
    <>
      <KitHeader icon="rocket_launch" title={t("publishing.title")} description={t("publishing.intro", { app: name })} actions={main} />
      <KitBar>
        {/* 138 The client's own stores, whoever publishes on Google Play and the App Store. */}
        <PublishingTabs more />
      </KitBar>
      {/* 110.2 Sample entries left: nothing goes to the stores. */}
      <SamplesStoreNotice app={app} />
    </>
  );

  const passwords = (
    <KitCallout icon="lock">{richText(t("publishing.passwords"), { email: () => <bdi dir="ltr">{teamEmail}</bdi> })}</KitCallout>
  );

  if (!mode || !request || (mode === "managed" && request.mode !== "managed")) {
    return (
      <KitPage>
        {header(null)}
        <KitHero titleId="h-how" title={t("publishing.howQuestion")}>
          <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(min(300px,100%),1fr))]">
            <Choice
              mode="managed"
              title={t("publishing.managed")}
              text={t("publishing.managedText")}
              points={[t("publishing.managedPoint1"), t("publishing.managedPoint2"), t("publishing.managedPoint3")]}
              saving={saving}
            />
            <Choice
              mode="self"
              title={t("publishing.self")}
              text={t("publishing.selfText")}
              points={[t("publishing.selfPoint1"), t("publishing.selfPointAuto")]}
              saving={saving}
            />
          </div>
        </KitHero>
        {passwords}
        <ReviewSection app={app} text={text} managed={false} delivery={deliveryNotes} />
      </KitPage>
    );
  }

  if (mode === "self") {
    const keys = hasStoreKeys(app);
    return (
      <KitPage>
        {header(
          <Link href="/dashboard/builds" className={kit.main}>
            <Icon name="build" size={20} />
            {t("builds.title")}
          </Link>,
        )}
        {query.chosen === "self" ? (
          <KitCallout tone="success" icon="check_circle" role="status">
            {t("publishing.savedSelf", { app: name })}
          </KitCallout>
        ) : null}
        {/* You publish it yourself: the first step at a glance, every step folded behind one line. */}
        <KitHero
          titleId="h-self"
          title={t("publishing.selfTitle")}
          description={t("publishing.selfText")}
          next={<KitNext icon="download">{richText(t("publishing.selfStep1"), { link: (chunk) => <Link href="/dashboard/builds">{chunk}</Link> })}</KitNext>}
        >
          <KitFold summary={t("studioPage.howItWorks")} icon="menu_book">
            <ol className="m-0 list-decimal space-y-2 ps-5 text-[15px] leading-relaxed marker:font-bold">
              <li>{richText(t("publishing.selfStep1"), { link: (chunk) => <Link href="/dashboard/builds">{chunk}</Link> })}</li>
              <li>
                {richText(t("publishing.selfStep2"), {
                  play: (chunk) => <Link href={localePath(lang, "/guides/google-play")}>{chunk}</Link>,
                  apple: (chunk) => <Link href={localePath(lang, "/guides/app-store")}>{chunk}</Link>,
                })}
              </li>
              <li>{richText(t("publishing.selfStep3"), { link: (chunk) => <Link href="/dashboard/publishing/more-stores">{chunk}</Link> })}</li>
              <li>
                {richText(keys.play || keys.appStore ? t("publishing.selfStep4Saved") : t("publishing.selfStep4None"), {
                  link: (chunk) => <Link href="/dashboard/setup?step=publishing">{chunk}</Link>,
                })}
              </li>
            </ol>
          </KitFold>
        </KitHero>
        <ReviewSection app={app} text={text} managed={false} delivery={deliveryNotes} />
        <ReadySection items={readiness({ app, listing: null, ios: hasFeature(current, "ios"), managed: false, platformUrl: appUrl() })} text={text} />
        <form action={choosePublishingModeAction}>
          <input type="hidden" name="mode" value="managed" />
          <KitCallout
            icon="storefront"
            title={t("publishing.ratherWe")}
            action={
              <SubmitButton variant="secondary" className="h-10" pendingText={saving}>
                {t("publishing.managed")}
              </SubmitButton>
            }
          >
            {t("publishing.ratherWeText")}
          </KitCallout>
        </form>
      </KitPage>
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
    done: stepDone(request, step.id, usesYallappFirebase(app)),
    doneAt: request.checklist[step.id] ? formatDateTime(new Date(request.checklist[step.id]!), lang) : null,
  }));
  const stores = requestStores(request);
  const ready = readiness({ app, listing: request.listing, ios: hasFeature(current, "ios"), managed: true, platformUrl: appUrl() });
  const stopping = ready.filter((item) => item.state === "missing").length;
  const live = stores.filter((which) => trackOf(request, which).status === "live").length;
  const rejected = stores.find((which) => trackOf(request, which).status === "rejected" && trackOf(request, which).rejection) ?? null;
  const firstUndone = steps.find((step) => !step.done && !(step.id === "firebase" && request.firebaseBy === "team")) ?? null;
  const missingItems = lang === "en" ? missing.join(", ") : formatList(lang, missing.map(k));
  // The one next step: what a store asked for, then the client's steps, the listing and the stores' checks; else our team's turn.
  const next = rejected ? (
    <KitNext
      icon="error"
      tone="warn"
      action={
        REJECTION_LINK[trackOf(request, rejected).rejection!] ? (
          <Link href={REJECTION_LINK[trackOf(request, rejected).rejection!]!} className={kit.quiet}>
            {t("publishing.reject.fixIt")}
          </Link>
        ) : undefined
      }
    >
      {t("publishing.nextRejected", { store: STORE_TITLE[rejected] })}
    </KitNext>
  ) : firstUndone ? (
    <KitNext
      icon="task_alt"
      action={
        <a href="#h-checklist" className={kit.quiet}>
          {t("publishing.openSteps")}
        </a>
      }
    >
      {t("publishing.nextStep", { step: firstUndone.title })}
    </KitNext>
  ) : missing.length ? (
    <KitNext
      icon="edit_note"
      action={
        <a href="#h-listing" className={kit.quiet}>
          {t("publishing.completeIt")}
        </a>
      }
    >
      {t("publishing.stillMissing", { items: missingItems })}
    </KitNext>
  ) : !readyToSubmit(ready) ? (
    <KitNext
      icon="warning"
      tone="warn"
      action={
        <a href="#h-ready" className={kit.quiet}>
          {t("publishing.ready.fix")}
        </a>
      }
    >
      {t("publishing.ready.notReady", { count: stopping })}
    </KitNext>
  ) : live === stores.length ? (
    <KitNext icon="check_circle" tone="success">
      {t("publishing.allLive")}
    </KitNext>
  ) : (
    <KitNext icon="support_agent" tone="success">
      {t("publishing.teamOnIt")}
    </KitNext>
  );

  const DOT = { success: "bg-success", danger: "bg-danger", warn: "bg-warn", info: "bg-(--sp-ink-2)", neutral: "bg-(--sp-faint)" } as const;
  return (
    <KitPage>
      {header(
        <Link href="/dashboard/setup?step=listing" className={kit.main}>
          <Icon name="edit" size={20} />
          {t("publishing.editTexts")}
        </Link>,
      )}
      {query.chosen === "managed" ? (
        <KitCallout tone="success" icon="check_circle" role="status">
          {t("publishing.thanks")}
        </KitCallout>
      ) : null}

      {/* Where it stands: the stores live as the first tile with its bar, then each store as a tile that opens in the inspector
          (what its state means, why a store turned it down and what to do, our team's note, its link), then the one next step. */}
      <section aria-labelledby="h-status" className="flex min-w-0 flex-col gap-3" data-stores="">
        <h2 id="h-status" className="sr-only">
          {t("publishing.whereStands")}
        </h2>
        <KitInspectGroup closeLabel={t("common.close")}>
          <div className="kit-bento @max-[561px]/kit-page:grid-cols-2!" style={{ ["--kit-rest" as string]: stores.length } as CSSProperties}>
            <div className="kit-tile">
              <span className="kit-tile-hd">
                <span className="kit-tile-ib" aria-hidden="true">
                  <Icon name="public" size={18} />
                </span>
                <span className="min-w-0">{t("publishing.whereStands")}</span>
              </span>
              <span className="kit-tile-v">{text.num(live)}</span>
              <span className="kit-tile-ft">
                <span className="min-w-0">{t("publishing.liveOn", { live, total: stores.length })}</span>
                <span className="kit-tile-bar" aria-hidden="true">
                  <i style={{ width: `${Math.round((live / stores.length) * 100)}%` }} />
                </span>
              </span>
            </div>
            {stores.map((which) => {
              const track = trackOf(request, which);
              const tone = statusTone(track.status);
              const label = k(CLIENT_STATUS_LABEL[track.status]);
              const when = track.updatedAt ? t("publishing.updated", { date: formatDateTime(track.updatedAt, lang) }) : t("publishing.asked", { date: formatDateTime(request.requestedAt, lang) });
              return (
                <KitInspectButton
                  key={which}
                  id={which}
                  data-store-tile={which}
                  className="kit-tile cursor-pointer border-0 text-start [font:inherit] transition-shadow hover:shadow-[inset_0_0_0_1px_var(--sp-line)] data-open:shadow-[inset_0_0_0_2px_#ff5a1f]"
                  inspector={{
                    label: STORE_TITLE[which],
                    title: t("publishing.store"),
                    footer:
                      track.status === "live" && track.storeUrl ? (
                        <a href={track.storeUrl} target="_blank" rel="noopener noreferrer" className={`${kit.main} w-full`}>
                          {t("publishing.seeOn", { store: STORE_TITLE[which] })}
                          <Icon name="open_in_new" size={18} />
                        </a>
                      ) : track.status === "rejected" && track.rejection && REJECTION_LINK[track.rejection] ? (
                        <Link href={REJECTION_LINK[track.rejection]!} className={`${kit.main} w-full`}>
                          {t("publishing.reject.fixIt")}
                        </Link>
                      ) : undefined,
                  }}
                  details={
                    <KitInspectorBody data-inspector-store={which}>
                      <KitInspectorHead icon={STORE_ICON[which]} badges={<KitStatus tone={tone}>{label}</KitStatus>} title={STORE_TITLE[which]} line={when} />
                      <p className="m-0 text-[14.5px] leading-relaxed text-(--sp-ink)">{publishingStatusIn(lang, which, track.status).text}</p>
                      {/* 88.3 Why the store turned it down, what to do and where. */}
                      {track.status === "rejected" && track.rejection ? (
                        <div className="flex flex-col gap-1.5 rounded-[14px] bg-danger-bg px-4 py-3 text-sm leading-relaxed text-(--sp-ink)" data-rejection={track.rejection}>
                          <span className="font-semibold">{t("publishing.reject.why", { reason: t(`publishing.reject.${track.rejection}`) })}</span>
                          <span>{t("publishing.reject.whatToDo", { fix: t(`publishing.reject.${track.rejection}Fix`) })}</span>
                          {REJECTION_LINK[track.rejection] ? (
                            <Link href={REJECTION_LINK[track.rejection]!} className="self-start font-semibold">
                              {t("publishing.reject.fixIt")}
                            </Link>
                          ) : null}
                        </div>
                      ) : null}
                      {track.note ? (
                        <p className="m-0 rounded-[14px] bg-(--sp-soft) px-4 py-3 text-sm leading-relaxed text-(--sp-ink)">
                          {richText(t("publishing.noteFromTeam", { note: track.note }), { b: (chunk) => <span className="font-semibold">{chunk}</span> })}
                        </p>
                      ) : null}
                      {which === "ios" && track.checkedAt && track.storeState ? (
                        <p className="m-0 text-[13px] text-(--sp-muted)" data-store-checked="">
                          {t("publishing.reject.checked", { date: formatDateTime(track.checkedAt, lang) })}
                        </p>
                      ) : null}
                    </KitInspectorBody>
                  }
                >
                  <span className="kit-tile-hd">
                    <span className="kit-tile-ib" aria-hidden="true">
                      <Icon name={STORE_ICON[which]} size={18} />
                    </span>
                    <span className="min-w-0">{STORE_TITLE[which]}</span>
                  </span>
                  <span className="kit-tile-v flex items-center gap-2 text-[22px]! tracking-[-0.3px]! @max-[561px]/kit-page:text-[18px]!">
                    <span aria-hidden="true" className={`h-2.5 w-2.5 shrink-0 rounded-full ${DOT[tone]}`} />
                    <span className="min-w-0">{label}</span>
                  </span>
                  <span className="kit-tile-ft">
                    <span className="min-w-0">{when}</span>
                  </span>
                  <span className="kit-tile-go" aria-hidden="true">
                    <Icon name="chevron_right" size={18} />
                  </span>
                </KitInspectButton>
              );
            })}
          </div>
        </KitInspectGroup>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-3 rounded-[14px] bg-(--sp-soft) px-4 py-3">{next}</div>
      </section>

      <KitSection
        titleId="h-checklist"
        title={t("publishing.yourSteps")}
        description={
          request.readyAt
            ? t("publishing.progressReady", { done: progress.done, total: progress.total, date: formatDateTime(request.readyAt, lang) })
            : t("publishing.progress", { done: progress.done, total: progress.total })
        }
        help={t("publishing.fees")}
        helpLabel={t("studioPage.helpSection")}
        actions={progress.complete ? <KitStatus tone="success">{t("publishing.allDone")}</KitStatus> : null}
      >
        <div className="h-2 overflow-hidden rounded-full bg-(--sp-soft)" role="progressbar" aria-valuemin={0} aria-valuemax={progress.total} aria-valuenow={progress.done} aria-label={t("publishing.stepsDone")}>
          <div className="h-full rounded-full bg-ember" style={{ width: `${(progress.done / progress.total) * 100}%` }} />
        </div>
        <ChecklistForm steps={steps} firebaseBy={request.firebaseBy} yallappFirebase={usesYallappFirebase(app)} />
        {passwords}
      </KitSection>

      <KitSection
        titleId="h-listing"
        title={t("publishing.listing")}
        description={t("publishing.listingText")}
        actions={
          <Link href="/dashboard/setup?step=listing" className={kit.quiet}>
            <Icon name="edit" size={18} />
            {t("publishing.editTexts")}
          </Link>
        }
      >
        {missing.length ? (
          <KitCallout icon="info">{t("publishing.stillMissing", { items: missingItems })}</KitCallout>
        ) : (
          <KitCallout tone="success" icon="check_circle">
            {t("publishing.listingComplete")}
          </KitCallout>
        )}
        <KitFacts>
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
            <KitFact key={label} label={label}>
              {value ?? <span className="text-danger">{t("publishing.missing")}</span>}
            </KitFact>
          ))}
        </KitFacts>
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
          reviewMeaning={reviewMeaningOf(app, request.listing.reviewNotes, kindOf(app).reviewNote, lang, k)}
          ratingExample={k(wordsOf(app).ratingExample)}
        />
      </KitSection>

      <ReviewSection app={app} text={text} managed delivery={deliveryNotes} />
      <ReadySection items={ready} text={text} />

      {/* 35, 36, 42 Samsung Galaxy Store, Huawei AppGallery and Xiaomi GetApps: 138 the client's own, with automatic uploads once connected; folded behind one line. */}
      <div id="h-more-stores" className="scroll-mt-6">
      <KitFold summary={t("publishing.moreStores")} icon="storefront" data-more-stores="">
        <div className="flex flex-col gap-3" data-more-stores-yours="">
          <p className="m-0 text-[15px] leading-relaxed text-(--sp-muted)">{t("publishing.moreStoresYours")}</p>
          <ul className="m-0 flex list-none flex-col gap-2.5 p-0">
            {MORE_STORES.map((which) => (
              <li key={which} className="flex flex-col gap-0.5 rounded-2xl bg-(--sp-surface) p-3.5 ring-1 ring-(--sp-edge)">
                <span className="text-[15px] font-bold">{STORE_TITLE[which]}</span>
                <span className="text-sm text-(--sp-muted)">{t(MORE_STORE_TEXT[which])}</span>
              </li>
            ))}
          </ul>
          <div>
            <Link href="/dashboard/publishing/more-stores" className={kit.quiet}>
              <Icon name="storefront" size={18} />
              {t("publishing.moreStoresOpen")}
            </Link>
          </div>
        </div>
      </KitFold>
      </div>

      {events.length ? (
        <KitSection titleId="h-history" title={t("publishing.history")} flush>
          <KitList>
            {events.map((event) => (
              <KitRow
                key={event.id}
                title={event.store === "mode" ? k(publishingEventLabel(event, "client")) : `${STORE_TITLE[event.store]}: ${k(CLIENT_STATUS_LABEL[event.status as PublishingStatus] ?? event.status)}`}
                meta={
                  <>
                    {formatDateTime(event.at, lang)}
                    {event.note ? <span className="block text-(--sp-ink)">{event.note}</span> : null}
                  </>
                }
              />
            ))}
          </KitList>
        </KitSection>
      ) : null}

      <form action={choosePublishingModeAction}>
        <input type="hidden" name="mode" value="self" />
        <KitCallout
          icon="menu_book"
          action={
            <SubmitButton variant="ghost" className="h-10" pendingText={saving}>
              {t("publishing.self")}
            </SubmitButton>
          }
        >
          {t("publishing.changedMind")}
        </KitCallout>
      </form>
    </KitPage>
  );
}

/**
 * 62 The suggested note for the reviewers stays in English (Apple and Google
 * read it); outside English the form says what it means. Null in English and
 * when there's no suggested note in sight.
 */
function reviewMeaningOf(app: App, saved: string | null, kindNote: string | undefined, lang: string, k: (english: string) => string): string | null {
  if (lang === "en") return null;
  const suggested = suggestedReviewNotes(app);
  const note = kindNote ?? (suggested && reviewNotesFor(app, saved) === suggested ? suggested : null);
  if (!note) return null;
  const meaning = k(note);
  return meaning === note ? null : meaning;
}
