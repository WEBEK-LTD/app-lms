import { plansIn } from "@/lib/marketing-lang";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { deleteMediaAction, setMediaPublicAction } from "@/app/actions/media";
import { CopyButton } from "@/components/copy-button";
import { SubmitButton } from "@/components/form";
import { Icon } from "@/components/icon";
import { SheetButton } from "@/components/page-kit-client";
import { formatDate } from "@/components/ui";
import { KitCallout, KitDrawer, KitEmpty, KitFact, KitFacts, KitFold, KitHeader, KitHero, KitNext, KitPage, KitSection, KitStatus, KitThumb, kit } from "@/components/studio-page";
import { appLabel } from "@/lib/app/label";
import { contextCan, requireClient } from "@/lib/auth/session";
import { OwnerOnly } from "@/components/owner-only";
import { dashboardText } from "@/lib/dashboard-lang";
import { richText } from "@/i18n/rich";
import type { DashKey } from "@/i18n/dashboard";
import { getVisitorContact } from "@/lib/contact";
import { getStore } from "@/lib/data";
import type { MediaKind } from "@/lib/data/types";
import { effectivePlans } from "@/lib/entitlements";
import { appUrl, encryptionKey } from "@/lib/env";
import { fileUrl, isPublic, MEDIA_ACCEPT, MEDIA_KINDS, mediaLink } from "@/lib/media/files";
import { cannotBuy, cardOffers, offerName, packOffers, packPrice } from "@/lib/media/packs";
import { formatBytes } from "@/lib/media/quota";
import { getMediaStorage } from "@/lib/media/storage";
import { appStorage } from "@/lib/media/usage";
import { PROVIDER_NAME } from "@/lib/payments/provider";
import { formatStorage, lowestPlanWith } from "@/lib/plans";
import { formatList } from "@/i18n/format";
import { priceView } from "@/lib/billing/display";
import { formatMoney } from "@/lib/billing/prices";
import { platformSetting, yallappPlanAccount } from "@/lib/settings/platform";
import { UpgradeHint } from "@/components/upgrade";
import { BuyStorageForm, RenameForm } from "./forms";
import { MediaUploader } from "./uploader";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await dashboardText()).t("media.title") };
}
export const dynamic = "force-dynamic";

const FILTERS: { id: MediaKind | "all" | "chat"; label: DashKey; none: DashKey }[] = [
  { id: "all", label: "media.all", none: "media.noFiles" },
  { id: "video", label: "media.videos", none: "media.noVideos" },
  { id: "image", label: "media.pictures", none: "media.noPictures" },
  { id: "pdf", label: "media.pdfs", none: "media.noPdfs" },
  // 77 Photos, videos, voice messages and files people sent in the chat.
  { id: "chat", label: "media.fromChat", none: "media.noChat" },
];

const KIND_LABEL: Record<MediaKind, DashKey> = { video: "media.video", image: "media.picture", pdf: "media.pdf", audio: "media.voice", file: "media.document" };
/** What the library takes (77: voice messages and documents come from the chat only). */
const LIMIT_LABEL: Partial<Record<MediaKind, DashKey>> = { video: "media.limitVideos", image: "media.limitPictures", pdf: "media.limitPdfs" };

/**
 * 51 Media: the app's videos, pictures and PDFs, kept on Yallapp's own
 * server. Videos used in lessons play in the app's own player (nothing shows
 * where they're hosted); pictures go in pages, products and listings.
 * Storage comes with the plan, and packs add to it.
 */
export default async function MediaPage({ searchParams }: PageProps<"/dashboard/media">) {
  const context = await requireClient("media");
  const { app, client, license, state } = context;
  if (!app) redirect("/dashboard/app-type");
  const { t, k, lang } = await dashboardText();
  const date = (d: Date | null | undefined) => formatDate(d, lang);
  const query = await searchParams;
  const filter = FILTERS.find((f) => f.id === query.kind)?.id ?? "all";
  const store = await getStore();
  const now = new Date();
  const plans = plansIn(lang, await effectivePlans(store));
  const storage = getMediaStorage();
  // 52 Packs are paid like the plans (the plans' gateway, in pounds) and shown in the client's currency.
  const [usage, files, account, packsSetting, contact, view] = await Promise.all([
    appStorage(store, app, plans, now),
    store.listMediaFiles(app.id, filter === "all" || filter === "chat" ? {} : { kind: filter }).then((list) => (filter === "chat" ? list.filter((f) => f.source === "chat") : list)),
    yallappPlanAccount(store, encryptionKey()),
    platformSetting(store, "storagePacks"),
    getVisitorContact(),
    priceView(store, client),
  ]);
  const offers = cardOffers(packOffers(packsSetting?.value), account?.provider ?? null, view);
  const buyBlocked = cannotBuy(license, now);
  const limit = usage.limitBytes;
  const share = limit === null ? 0 : Math.min(1, usage.share);
  const tone = usage.over ? "bg-danger" : share >= 0.8 ? "bg-warn" : "bg-ember";
  const bigger = usage.plan ? lowestPlanWith(plans, (p) => p.limits.storageGb === null || p.limits.storageGb > (usage.plan?.limits.storageGb ?? 0), usage.plan.id) : null;
  const disabled = !storage ? t("media.notAvailable") : state !== "active" ? t("media.notActive") : usage.over ? t("media.over") : null;
  const muted = { muted: (chunk: string) => <span className="text-base font-semibold text-(--sp-muted)">{chunk}</span> };
  const payment = typeof query.payment === "string" ? query.payment : null;
  const canBuy = contextCan(context, "billing");
  const closeLabel = t("common.close");
  const kindIcon = (kind: MediaKind) => (kind === "video" ? "smart_display" : kind === "image" ? "image" : kind === "audio" ? "mic" : kind === "file" ? "description" : "picture_as_pdf");
  const who = (f: (typeof files)[number]) =>
    f.status === "uploading" ? (
      <KitStatus tone="warn">{t("media.notFinished")}</KitStatus>
    ) : f.source === "chat" ? (
      <KitStatus tone="neutral">{t("media.chatFile")}</KitStatus>
    ) : isPublic(f) ? (
      <KitStatus tone="neutral">{t("media.anyone")}</KitStatus>
    ) : (
      <KitStatus tone="info">{t("media.lessonsOnly")}</KitStatus>
    );

  // 132.138 The premium kit: the header with Upload, the storage in one hero card (with what to do when it's full), the files in one card with the upload on top (each file's details and actions in its drawer, its link one tap away), then more storage folded.
  return (
    <KitPage>
      <KitHeader
        icon="photo_library"
        title={t("media.title")}
        description={t("media.intro", { app: appLabel(app) === "Untitled app" ? k("Untitled app") : appLabel(app) })}
        actions={
          disabled ? null : (
            <SheetButton target="upload" icon="upload" variant="main" className="h-11">
              {t("media.upload")}
            </SheetButton>
          )
        }
      />
      {payment === "paid" ? (
        <KitCallout tone="success" icon="check_circle" role="status">
          {t("media.paid")}
        </KitCallout>
      ) : payment === "failed" ? (
        <KitCallout tone="danger" icon="error" role="alert">
          {t("media.failed")}
        </KitCallout>
      ) : payment === "pending" ? (
        <KitCallout icon="schedule" role="status">
          {t("media.pending")}
        </KitCallout>
      ) : null}
      {query.deleted === "failed" ? (
        <KitCallout tone="danger" icon="error" role="alert">
          {t("media.deleteFailed")}
        </KitCallout>
      ) : null}

      <KitHero
        titleId="h-storage"
        heading={t("media.storage")}
        status={limit === null ? null : usage.over ? <KitStatus tone="danger">{t("license.usageFull")}</KitStatus> : share >= 0.8 ? <KitStatus tone="warn">{t("license.usageNear")}</KitStatus> : null}
        title={
          <span data-storage-used="">
            {limit === null
              ? richText(t("media.used", { used: formatBytes(usage.usedBytes) }), muted)
              : richText(t("media.usedOf", { used: formatBytes(usage.usedBytes), limit: formatBytes(limit) }), muted)}
          </span>
        }
        description={t("media.storageText")}
        next={
          usage.over ? (
            <KitNext
              icon="warning"
              tone="warn"
              action={
                canBuy ? (
                  <a href="#buy-storage" className={kit.quiet}>
                    {t("media.buy")}
                  </a>
                ) : undefined
              }
            >
              <span role="alert">{t("media.overNotice")}</span>
            </KitNext>
          ) : disabled ? (
            <KitNext icon="info">{disabled}</KitNext>
          ) : undefined
        }
      >
        <div className="flex flex-col gap-2.5">
          {limit === null ? (
            <span className="text-sm text-(--sp-muted)">{t("media.noLimit")}</span>
          ) : (
            <div className="h-2.5 rounded-full bg-(--sp-soft)" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(share * 100)} aria-label={t("media.storageBar", { used: formatBytes(usage.usedBytes), limit: formatBytes(limit) })}>
              <div className={`h-full rounded-full ${tone}`} style={{ width: `${share * 100}%` }} />
            </div>
          )}
          <span className="text-sm text-(--sp-muted)">
            {usage.plan
              ? t("media.planStorage", {
                  plan: usage.plan.name,
                  storage: usage.plan.limits.storageGb === null ? t("media.unlimited") : formatStorage(usage.plan.limits.storageGb),
                })
              : t("media.noPlan")}
            {usage.active.map((p) => t("media.packUntil", { pack: offerName(p), date: date(p.activeUntil) })).join("")}
          </span>
        </div>
      </KitHero>

      <KitSection
        titleId="h-files"
        title={t("media.yourFiles")}
        flush
        actions={
          <nav aria-label={t("media.show")} className="flex flex-wrap gap-1.5">
            {FILTERS.map((f) => (
              <Link key={f.id} href={f.id === "all" ? "/dashboard/media" : `/dashboard/media?kind=${f.id}`} aria-current={filter === f.id ? "page" : undefined} className={`${kit.chip(filter === f.id)} no-underline hover:text-inherit`}>
                {t(f.label)}
              </Link>
            ))}
          </nav>
        }
      >
        {/* The upload, on top of the files it adds to (the header's Upload brings it into view). */}
        <div id="upload" aria-labelledby="h-upload" role="group" className="flex scroll-mt-6 flex-col gap-2 px-5 pb-5 sm:px-8">
          <h3 id="h-upload" className="sr-only">
            {t("media.upload")}
          </h3>
          <MediaUploader appId={app.id} accept={MEDIA_ACCEPT} disabled={disabled} />
          <p className="m-0 text-xs text-(--sp-muted)">{MEDIA_KINDS.map((m) => t(LIMIT_LABEL[m.kind]!, { size: formatBytes(m.maxBytes) })).join(" · ")}</p>
        </div>
        {files.length === 0 ? (
          <div className="border-t border-(--sp-line-soft)">
            <KitEmpty icon="photo_library" title={t(FILTERS.find((f) => f.id === filter)!.none)}>
              {t("media.emptyText")}
            </KitEmpty>
          </div>
        ) : (
          <ul className="m-0 flex list-none flex-col border-t border-(--sp-line-soft) px-2 pt-1 sm:px-4" aria-label={t("media.files")}>
            {files.map((f) => {
              const link = mediaLink(appUrl(), f.id);
              const open = storage && f.status === "ready" ? fileUrl(storage, f, { ttlSeconds: 3600 }).url : null;
              const line = t("media.fileLine", { kind: t(KIND_LABEL[f.kind]), size: formatBytes(f.sizeBytes), date: date(f.createdAt) });
              const copyable = f.status === "ready" && f.source !== "chat";
              return (
                <li key={f.id} data-media={f.name} className="flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-(--sp-line-soft) px-1 py-2.5 first:border-t-0 sm:px-2">
                  <KitDrawer
                    closeLabel={closeLabel}
                    title={<span className="break-all">{f.name}</span>}
                    description={line}
                    triggerClassName="group -mx-2 flex min-w-0 flex-[1_1_300px] cursor-pointer flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl border-0 bg-transparent px-2 py-1.5 text-start text-(--sp-ink) transition-colors hover:bg-(--sp-soft) sm:flex-nowrap"
                    trigger={
                      <>
                        <KitThumb src={f.kind === "image" ? open : null} icon={kindIcon(f.kind)} />
                        <span className="flex min-w-0 flex-1 flex-col gap-1">
                          <span className="text-[15px] font-semibold break-all">{f.name}</span>
                          <span className="text-[13px] text-(--sp-muted)">{line}</span>
                        </span>
                        <span className="flex shrink-0 items-center max-sm:basis-full max-sm:ps-16">{who(f)}</span>
                      </>
                    }
                  >
                    {f.kind === "image" && open ? (
                      // eslint-disable-next-line @next/next/no-img-element -- An uploaded picture, already sized by the platform.
                      <img src={open} alt="" className="max-h-64 w-full rounded-2xl bg-(--sp-soft) object-contain" />
                    ) : null}
                    {f.status === "uploading" ? <KitCallout icon="upload">{t("media.carryOn")}</KitCallout> : null}
                    <KitFacts>
                      <KitFact label={t("common.status")}>{who(f)}</KitFact>
                      {copyable ? (
                        <KitFact label={t("studioPage.fileLink")}>
                          <code className="text-[13px] break-all" dir="ltr">
                            {link}
                          </code>
                        </KitFact>
                      ) : null}
                    </KitFacts>
                    <div className="flex flex-wrap items-center gap-2">
                      {open ? (
                        <a href={open} target="_blank" rel="noopener noreferrer" className={kit.quiet}>
                          <Icon name="open_in_new" size={18} />
                          {t("media.open")}
                        </a>
                      ) : null}
                      {f.status === "ready" && f.kind !== "image" && f.source !== "chat" ? (
                        <form action={setMediaPublicAction}>
                          <input type="hidden" name="id" value={f.id} />
                          <input type="hidden" name="public" value={f.public ? "" : "on"} />
                          <SubmitButton variant="secondary" className="h-10 px-4 text-sm">
                            {f.public ? t("media.lessonsOnly") : t("media.share")}
                          </SubmitButton>
                        </form>
                      ) : null}
                    </div>
                    {f.status === "ready" ? <RenameForm id={f.id} name={f.name} /> : null}
                    <form action={deleteMediaAction} className="border-t border-(--sp-line-soft) pt-5">
                      <input type="hidden" name="id" value={f.id} />
                      <SubmitButton variant="danger" className="h-10 px-4 text-sm">
                        <Icon name="delete" size={18} />
                        {f.status === "uploading" ? t("media.cancelUpload") : t("common.delete")}
                      </SubmitButton>
                    </form>
                  </KitDrawer>
                  {/* The one action on the row: the file's link. */}
                  {copyable ? <CopyButton value={link} label={t("media.copyLink")} copiedLabel={t("common.copied")} className={kit.row} /> : null}
                </li>
              );
            })}
          </ul>
        )}
      </KitSection>

      {/* 60 Storage packs are paid for by the owner. */}
      {!canBuy ? (
        <OwnerOnly id="h-buy-storage" title={t("media.buy")} />
      ) : (
        <KitSection id="buy-storage" titleId="h-buy-storage" title={t("media.buy")} description={license ? t("media.buyText", { date: date(license.expiresAt) }) : t("media.buyNoPlan")}>
          {bigger ? (
            <UpgradeHint
              title={t("media.bigger", { plan: bigger.name, storage: bigger.limits.storageGb === null ? t("media.unlimited") : formatStorage(bigger.limits.storageGb) })}
              to={{ id: bigger.id, name: bigger.name }}
              compact
              cta={t("overview.upgradeTo", { plan: bigger.name })}
            >
              {t("media.biggerText")}
            </UpgradeHint>
          ) : null}
          {buyBlocked ? (
            <p className="m-0 text-[15px] text-(--sp-muted)">{k(buyBlocked)}</p>
          ) : offers.length && account && license ? (
            <KitFold icon="add_circle" summary={t("studioPage.mediaChoosePack")} open={usage.over || payment === "failed" ? true : undefined} data-buy-storage="">
              <BuyStorageForm
                appId={app.id}
                provider={PROVIDER_NAME[account.provider]}
                options={offers.map(({ offer, monthly }) => {
                  const price = packPrice(monthly, license.expiresAt, now);
                  return {
                    id: offer.id,
                    label: offerName(offer),
                    price: formatMoney(price.offer.shown),
                    note: t("media.packNote", { monthly: formatMoney(monthly.shown), months: price.months, date: date(license.expiresAt) }),
                    charge: price.offer.line ? k(price.offer.line) : null,
                  };
                })}
              />
            </KitFold>
          ) : (
            <p className="m-0 text-[15px] text-(--sp-muted)">
              {richText(t("media.byTeam", { packs: formatList(lang, packOffers(packsSetting?.value).map(offerName)) }), {
                link: (chunk) => (
                  <a href={contact.whatsappUrl} target="_blank" rel="noopener noreferrer">
                    {chunk}
                  </a>
                ),
              })}
            </p>
          )}
          {client.status === "suspended" ? <p className="m-0 text-sm text-danger">{t("media.suspended")}</p> : null}
        </KitSection>
      )}
    </KitPage>
  );
}
