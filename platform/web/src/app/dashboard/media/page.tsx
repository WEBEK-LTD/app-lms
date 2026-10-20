import { plansIn } from "@/lib/marketing-lang";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { deleteMediaAction, setMediaPublicAction } from "@/app/actions/media";
import { CopyButton } from "@/components/copy-button";
import { SubmitButton } from "@/components/form";
import { Icon } from "@/components/icon";
import { Badge, EmptyState, formatDate, Notice, PageHeader, Section } from "@/components/ui";
import { appLabel } from "@/lib/app/label";
import { contextCan, requireClient } from "@/lib/auth/session";
import { OwnerOnly } from "@/components/owner-only";
import { dashboardText } from "@/lib/dashboard-lang";
import { richText } from "@/i18n/rich";
import type { DashKey } from "@/i18n/dashboard";
import { getContact } from "@/lib/contact";
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

const FILTERS: { id: MediaKind | "all"; label: DashKey; none: DashKey }[] = [
  { id: "all", label: "media.all", none: "media.noFiles" },
  { id: "video", label: "media.videos", none: "media.noVideos" },
  { id: "image", label: "media.pictures", none: "media.noPictures" },
  { id: "pdf", label: "media.pdfs", none: "media.noPdfs" },
];

const KIND_LABEL: Record<MediaKind, DashKey> = { video: "media.video", image: "media.picture", pdf: "media.pdf" };
const LIMIT_LABEL: Record<MediaKind, DashKey> = { video: "media.limitVideos", image: "media.limitPictures", pdf: "media.limitPdfs" };

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
    store.listMediaFiles(app.id, filter === "all" ? {} : { kind: filter }),
    yallappPlanAccount(store, encryptionKey()),
    platformSetting(store, "storagePacks"),
    getContact(),
    priceView(store, client),
  ]);
  const offers = cardOffers(packOffers(packsSetting?.value), account?.provider ?? null, view);
  const buyBlocked = cannotBuy(license, now);
  const limit = usage.limitBytes;
  const share = limit === null ? 0 : Math.min(1, usage.share);
  const tone = usage.over ? "bg-danger" : share >= 0.8 ? "bg-warn" : "bg-ember";
  const bigger = usage.plan ? lowestPlanWith(plans, (p) => p.limits.storageGb === null || p.limits.storageGb > (usage.plan?.limits.storageGb ?? 0), usage.plan.id) : null;
  const disabled = !storage ? t("media.notAvailable") : state !== "active" ? t("media.notActive") : usage.over ? t("media.over") : null;
  const muted = { muted: (chunk: string) => <span className="text-base font-semibold text-muted">{chunk}</span> };
  const payment = typeof query.payment === "string" ? query.payment : null;

  return (
    <>
      <PageHeader
        title={t("media.title")}
        description={t("media.intro", { app: appLabel(app) === "Untitled app" ? k("Untitled app") : appLabel(app) })}
      />
      {payment === "paid" ? (
        <Notice tone="success" icon="check_circle" role="status">
          {t("media.paid")}
        </Notice>
      ) : payment === "failed" ? (
        <Notice tone="danger" icon="error" role="alert">
          {t("media.failed")}
        </Notice>
      ) : payment === "pending" ? (
        <Notice tone="info" role="status">
          {t("media.pending")}
        </Notice>
      ) : null}
      {query.deleted === "failed" ? (
        <Notice tone="danger" icon="error" role="alert">
          {t("media.deleteFailed")}
        </Notice>
      ) : null}

      <Section titleId="h-storage" title={t("media.storage")} description={t("media.storageText")}>
        <div className="flex flex-col gap-1.5">
          <span className="text-2xl font-extrabold" data-storage-used="">
            {limit === null
              ? richText(t("media.used", { used: formatBytes(usage.usedBytes) }), muted)
              : richText(t("media.usedOf", { used: formatBytes(usage.usedBytes), limit: formatBytes(limit) }), muted)}
          </span>
          {limit === null ? (
            <span className="text-sm text-muted">{t("media.noLimit")}</span>
          ) : (
            <div className="h-2 rounded-full bg-ivory" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(share * 100)} aria-label={t("media.storageBar", { used: formatBytes(usage.usedBytes), limit: formatBytes(limit) })}>
              <div className={`h-full rounded-full ${tone}`} style={{ width: `${share * 100}%` }} />
            </div>
          )}
          <span className="text-sm text-muted">
            {usage.plan
              ? t("media.planStorage", {
                  plan: usage.plan.name,
                  storage: usage.plan.limits.storageGb === null ? t("media.unlimited") : formatStorage(usage.plan.limits.storageGb),
                })
              : t("media.noPlan")}
            {usage.active.map((p) => t("media.packUntil", { pack: offerName(p), date: date(p.activeUntil) })).join("")}
          </span>
        </div>
        {usage.over ? (
          <Notice tone="warn" icon="warning" role="alert">
            {t("media.overNotice")}
          </Notice>
        ) : null}
      </Section>

      <Section titleId="h-upload" title={t("media.upload")} description={MEDIA_KINDS.map((m) => t(LIMIT_LABEL[m.kind], { size: formatBytes(m.maxBytes) })).join(" · ")}>
        <MediaUploader appId={app.id} accept={MEDIA_ACCEPT} disabled={disabled} />
      </Section>

      <Section
        titleId="h-files"
        title={t("media.yourFiles")}
        flush
        actions={
          <nav aria-label={t("media.show")} className="flex flex-wrap gap-1.5">
            {FILTERS.map((f) => (
              <Link
                key={f.id}
                href={f.id === "all" ? "/dashboard/media" : `/dashboard/media?kind=${f.id}`}
                aria-current={filter === f.id ? "page" : undefined}
                className={`rounded-full border px-3 py-1 text-sm font-semibold no-underline ${filter === f.id ? "border-midnight bg-midnight text-white hover:text-white" : "border-line text-ink-3"}`}
              >
                {t(f.label)}
              </Link>
            ))}
          </nav>
        }
      >
        {files.length === 0 ? (
          <div className="p-5 sm:p-6">
            <EmptyState icon="photo_library" title={t(FILTERS.find((f) => f.id === filter)!.none)}>
              {t("media.emptyText")}
            </EmptyState>
          </div>
        ) : (
          <ul className="m-0 flex list-none flex-col p-0" aria-label={t("media.files")}>
            {files.map((f) => {
              const link = mediaLink(appUrl(), f.id);
              const open = storage && f.status === "ready" ? fileUrl(storage, f, { ttlSeconds: 3600 }).url : null;
              return (
                <li key={f.id} className="flex flex-col gap-2 border-t border-line-soft px-5 py-4 first:border-t-0 sm:px-6" data-media={f.name}>
                  <div className="flex flex-wrap items-center gap-3">
                    {f.kind === "image" && open ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={open} alt="" className="h-12 w-12 flex-none rounded-lg object-cover" />
                    ) : (
                      <span className="flex h-12 w-12 flex-none items-center justify-center rounded-lg bg-ivory">
                        <Icon name={f.kind === "video" ? "smart_display" : f.kind === "image" ? "image" : "assignment"} size={24} />
                      </span>
                    )}
                    <div className="flex min-w-0 flex-[1_1_220px] flex-col gap-0.5">
                      <span className="truncate text-[15px] font-semibold">{f.name}</span>
                      <span className="text-[13px] text-muted">
                        {t("media.fileLine", { kind: t(KIND_LABEL[f.kind]), size: formatBytes(f.sizeBytes), date: date(f.createdAt) })}
                      </span>
                    </div>
                    {f.status === "uploading" ? (
                      <Badge tone="warn">{t("media.notFinished")}</Badge>
                    ) : isPublic(f) ? (
                      <Badge tone="neutral">{t("media.anyone")}</Badge>
                    ) : (
                      <Badge tone="info">{t("media.lessonsOnly")}</Badge>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {f.status === "ready" ? <CopyButton value={link} label={t("media.copyLink")} copiedLabel={t("common.copied")} /> : null}
                    {open ? (
                      <a href={open} target="_blank" rel="noopener noreferrer" className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-line-strong bg-white px-3.5 text-sm font-semibold text-midnight no-underline hover:border-midnight">
                        <Icon name="open_in_new" size={18} />
                        {t("media.open")}
                      </a>
                    ) : null}
                    {f.status === "ready" ? <RenameForm id={f.id} name={f.name} /> : null}
                    {f.status === "ready" && f.kind !== "image" ? (
                      <form action={setMediaPublicAction}>
                        <input type="hidden" name="id" value={f.id} />
                        <input type="hidden" name="public" value={f.public ? "" : "on"} />
                        <SubmitButton variant="secondary" className="h-10 px-3 text-sm">
                          {f.public ? t("media.lessonsOnly") : t("media.share")}
                        </SubmitButton>
                      </form>
                    ) : null}
                    <form action={deleteMediaAction}>
                      <input type="hidden" name="id" value={f.id} />
                      <SubmitButton variant="secondary" className="h-10 px-3 text-sm">
                        {f.status === "uploading" ? t("media.cancelUpload") : t("common.delete")}
                      </SubmitButton>
                    </form>
                  </div>
                  {f.status === "uploading" ? (
                    <p className="m-0 text-[13px] text-muted">{t("media.carryOn")}</p>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </Section>

      {/* 60 Storage packs are paid for by the owner. */}
      {!contextCan(context, "billing") ? (
        <OwnerOnly id="h-buy-storage" title={t("media.buy")} />
      ) : (
      <Section
        id="buy-storage"
        titleId="h-buy-storage"
        title={t("media.buy")}
        description={license ? t("media.buyText", { date: date(license.expiresAt) }) : t("media.buyNoPlan")}
      >
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
          <p className="m-0 text-[15px] text-ink-4">{k(buyBlocked)}</p>
        ) : offers.length && account && license ? (
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
        ) : (
          <p className="m-0 text-[15px] text-ink-4">
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
      </Section>
      )}
    </>
  );
}
