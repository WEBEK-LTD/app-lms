import { plansIn } from "@/lib/marketing-lang";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { deleteMediaAction, setMediaPublicAction } from "@/app/actions/media";
import { CopyButton } from "@/components/copy-button";
import { SubmitButton } from "@/components/form";
import { Icon } from "@/components/icon";
import type { IconName } from "@/components/icon-names";
import { formatDate } from "@/components/ui";
import { KitCallout, KitEmpty, KitFold, KitHeader, KitHero, KitMore, KitNext, KitPage, KitSection, KitStat, KitStatus, KitThumb, kit } from "@/components/studio-page";
import { KitInspectorBody, KitInspectorFacts, KitInspectorHead, KitInspectorPart } from "@/components/studio-page/parts";
import { KitTable, type KitTableRow } from "@/components/studio-page/table";
import { appLabel } from "@/lib/app/label";
import { contextCan, requireClient } from "@/lib/auth/session";
import { OwnerOnly } from "@/components/owner-only";
import { dashboardText } from "@/lib/dashboard-lang";
import { richText } from "@/i18n/rich";
import type { DashKey } from "@/i18n/dashboard";
import { getVisitorContact } from "@/lib/contact";
import { getStore } from "@/lib/data";
import type { MediaFile, MediaKind } from "@/lib/data/types";
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
import { MediaUploader, UploadButton } from "./uploader";
import { MediaPreview } from "./viewer";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await dashboardText()).t("media.title") };
}
export const dynamic = "force-dynamic";

/** The files' groups, behind Filters (77 the chat's photos, videos, voice messages and files too). */
const GROUPS: { id: MediaKind | "chat"; label: DashKey }[] = [
  { id: "video", label: "media.videos" },
  { id: "image", label: "media.pictures" },
  { id: "pdf", label: "media.pdfs" },
  { id: "chat", label: "media.fromChat" },
];

const KIND_LABEL: Record<MediaKind, DashKey> = { video: "media.video", image: "media.picture", pdf: "media.pdf", audio: "media.voice", file: "media.document" };
/** What the library takes (77: voice messages and documents come from the chat only). */
const LIMIT_LABEL: Partial<Record<MediaKind, DashKey>> = { video: "media.limitVideos", image: "media.limitPictures", pdf: "media.limitPdfs" };
const KIND_ICON: Record<MediaKind, IconName> = { video: "smart_display", image: "image", audio: "mic", file: "description", pdf: "picture_as_pdf" };
const INPUT = "media-files";

/**
 * 51 Media: the app's videos, pictures and PDFs, kept on Yallapp's own
 * server. Videos used in lessons play in the app's own player (nothing shows
 * where they're hosted); pictures go in pages, products and listings.
 * Storage comes with the plan, and packs add to it.
 * 132.160 The console's look: Upload as the main action (files dropped on
 * the table upload too), the storage as the dark tile with its bar and the
 * files by kind beside it, the files as a table (the kinds behind Filters),
 * a file's picture or player, its link, Open, Rename, sharing and Delete in
 * its inspector; more storage folded at the end.
 */
export default async function MediaPage({ searchParams }: PageProps<"/dashboard/media">) {
  const context = await requireClient("media");
  const { app, client, license, state } = context;
  if (!app) redirect("/dashboard/app-type");
  const { t, k, lang, num } = await dashboardText();
  const date = (d: Date | null | undefined) => formatDate(d, lang);
  // 132.169 A size reads as one piece in Arabic ("2 MB", not "MB 2"), and the numbers around it keep their places.
  const size = (bytes: number) => (lang === "ar" ? `\u2066${formatBytes(bytes)}\u2069` : formatBytes(bytes));
  const query = await searchParams;
  const asked = GROUPS.find((g) => g.id === query.kind)?.id;
  const store = await getStore();
  const now = new Date();
  const plans = plansIn(lang, await effectivePlans(store));
  const storage = getMediaStorage();
  // 52 Packs are paid like the plans (the plans' gateway, in pounds) and shown in the client's currency.
  const [usage, files, account, packsSetting, contact, view] = await Promise.all([
    appStorage(store, app, plans, now),
    store.listMediaFiles(app.id, {}),
    yallappPlanAccount(store, encryptionKey()),
    platformSetting(store, "storagePacks"),
    getVisitorContact(),
    priceView(store, client),
  ]);
  const offers = cardOffers(packOffers(packsSetting?.value), account?.provider ?? null, view);
  const buyBlocked = cannotBuy(license, now);
  const limit = usage.limitBytes;
  const share = limit === null ? 0 : Math.min(1, usage.share);
  const bigger = usage.plan ? lowestPlanWith(plans, (p) => p.limits.storageGb === null || p.limits.storageGb > (usage.plan?.limits.storageGb ?? 0), usage.plan.id) : null;
  const disabled = !storage ? t("media.notAvailable") : state !== "active" ? t("media.notActive") : usage.over ? t("media.over") : null;
  const plain = { muted: (chunk: string) => chunk };
  const payment = typeof query.payment === "string" ? query.payment : null;
  const canBuy = contextCan(context, "billing");
  const more = t("studioPage.more");
  const planLine = (
    <>
      {usage.plan
        ? t("media.planStorage", {
            plan: usage.plan.name,
            storage: usage.plan.limits.storageGb === null ? t("media.unlimited") : formatStorage(usage.plan.limits.storageGb),
          })
        : t("media.noPlan")}
      {usage.active.map((p) => t("media.packUntil", { pack: offerName(p), date: date(p.activeUntil) })).join("")}
    </>
  );
  const who = (f: MediaFile) =>
    f.status === "uploading" ? (
      <KitStatus tone="warn">{t("media.notFinished")}</KitStatus>
    ) : f.source === "chat" ? (
      <KitStatus tone="neutral">{t("media.chatFile")}</KitStatus>
    ) : isPublic(f) ? (
      <KitStatus tone="neutral">{t("media.anyone")}</KitStatus>
    ) : (
      <KitStatus tone="info">{t("media.lessonsOnly")}</KitStatus>
    );
  const count = (kind: MediaKind) => files.filter((f) => f.kind === kind && f.source !== "chat").length;

  // 132.160 A file as a row: its picture or icon, its name, its kind, size and day; who can open it at the end. The rest in its inspector.
  const rows: KitTableRow[] = files.map((f) => {
    const link = mediaLink(appUrl(), f.id);
    const open = storage && f.status === "ready" ? fileUrl(storage, f, { ttlSeconds: 3600 }).url : null;
    const line = t("media.fileLine", { kind: t(KIND_LABEL[f.kind]), size: size(f.sizeBytes), date: date(f.createdAt) });
    const copyable = f.status === "ready" && f.source !== "chat";
    const plays = f.kind === "image" || f.kind === "video" || f.kind === "audio";
    return {
      id: f.id,
      name: f.name,
      group: f.source === "chat" ? "chat" : f.kind,
      data: { "data-media": f.name },
      cells: [
        <>
          <KitThumb src={f.kind === "image" ? open : null} icon={KIND_ICON[f.kind]} size={40} />
          <span className="flex min-w-0 flex-col gap-0.5">
            <span className="truncate text-[14.5px] font-bold" dir="auto">
              {f.name}
            </span>
            <span className="truncate text-[12.5px] font-normal text-(--sp-muted)">{line}</span>
          </span>
        </>,
        <span key="d" className="text-[13px]">
          {date(f.createdAt)}
        </span>,
        <span key="w">{who(f)}</span>,
      ],
      inspector: {
        title: t("media.file"),
        actions: (
          <KitMore label={more} look="row">
            <form action={deleteMediaAction} className="flex">
              <input type="hidden" name="id" value={f.id} />
              <button type="submit" className={`${kit.menuItem} text-danger hover:text-danger`}>
                <Icon name="delete" size={18} />
                {f.status === "uploading" ? t("media.cancelUpload") : t("common.delete")}
              </button>
            </form>
          </KitMore>
        ),
        footer: copyable ? <CopyButton value={link} label={t("media.copyLink")} copiedLabel={t("common.copied")} className={`${kit.main} w-full`} /> : undefined,
        body: (
          <KitInspectorBody data-inspector-media={f.name}>
            <KitInspectorHead media={<MediaPreview kind={f.kind} src={plays ? open : null} name={f.name} icon={KIND_ICON[f.kind]} />} title={<span className="break-all">{f.name}</span>} line={line} badges={who(f)} />
            {f.status === "uploading" ? <KitCallout icon="upload">{t("media.carryOn")}</KitCallout> : null}
            <div className="flex flex-wrap items-center gap-2">
              {open && storage && plays ? (
                <a href={fileUrl(storage, f, { ttlSeconds: 3600, download: true }).url} className={kit.quiet} download>
                  <Icon name="download" size={18} />
                  {t("common.download")}
                </a>
              ) : open ? (
                <a href={open} target="_blank" rel="noopener noreferrer" className={kit.quiet}>
                  <Icon name="open_in_new" size={18} />
                  {t("media.open")}
                </a>
              ) : null}
              {f.status === "ready" && f.kind !== "image" && f.source !== "chat" ? (
                <form action={setMediaPublicAction}>
                  <input type="hidden" name="id" value={f.id} />
                  <input type="hidden" name="public" value={f.public ? "" : "on"} />
                  <SubmitButton variant="pill" className="h-[38px]">
                    {f.public ? t("media.lessonsOnly") : t("media.share")}
                  </SubmitButton>
                </form>
              ) : null}
            </div>
            <KitInspectorFacts
              facts={[
                [t("media.kind"), t(KIND_LABEL[f.kind])],
                [t("media.size"), size(f.sizeBytes)],
                [t("media.added"), date(f.createdAt)],
                [t("media.whoOpens"), who(f)],
              ]}
            />
            {copyable ? (
              <KitInspectorPart title={t("media.fileLink")}>
                <code className="block rounded-xl bg-(--sp-soft) px-3.5 py-2.5 text-[13px] break-all text-(--sp-ink)" dir="ltr">
                  {link}
                </code>
              </KitInspectorPart>
            ) : null}
            {f.status === "ready" ? <RenameForm id={f.id} name={f.name} /> : null}
          </KitInspectorBody>
        ),
      },
    };
  });

  return (
    <KitPage>
      <KitHeader
        icon="photo_library"
        title={t("media.title")}
        description={t("media.intro", { app: appLabel(app) === "Untitled app" ? k("Untitled app") : appLabel(app) })}
        help={
          <span className="flex flex-col gap-2">
            <span>{t("media.storageText")}</span>
            <span>{MEDIA_KINDS.map((m) => t(LIMIT_LABEL[m.kind]!, { size: size(m.maxBytes) })).join(" · ")}</span>
            <span>{t("media.parts")}</span>
          </span>
        }
        helpLabel={t("studioPage.help")}
        actions={
          <>
            {canBuy ? (
              <KitMore label={more}>
                <a href="#buy-storage" className={kit.menuItem}>
                  <Icon name="add_circle" size={18} />
                  {t("media.buy")}
                </a>
              </KitMore>
            ) : null}
            {disabled ? null : <UploadButton inputId={INPUT} label={t("media.upload")} className={kit.main} />}
          </>
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

      {/* The storage as the dark tile with its bar (Full or Nearly full on it), the files by kind beside it. */}
      <KitHero
        label={t("media.storage")}
        stats={
          <>
            <KitStat
              icon="cloud_done"
              label={
                <span className="flex flex-wrap items-center gap-2">
                  {t("media.storage")}
                  {limit === null ? null : usage.over ? <KitStatus tone="danger">{t("license.usageFull")}</KitStatus> : share >= 0.8 ? <KitStatus tone="warn">{t("license.usageNear")}</KitStatus> : null}
                </span>
              }
              value={size(usage.usedBytes)}
              hint={
                <span data-storage-used="">
                  {limit === null ? richText(t("media.used", { used: size(usage.usedBytes) }), plain) : richText(t("media.usedOf", { used: size(usage.usedBytes), limit: size(limit) }), plain)}
                </span>
              }
              progress={limit === null ? undefined : share}
            />
            <KitStat icon="folder" label={t("media.files")} value={num(files.length)} />
            <KitStat icon="smart_display" label={t("media.videos")} value={num(count("video"))} />
            <KitStat icon="image" label={t("media.pictures")} value={num(count("image"))} />
          </>
        }
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
          ) : (
            <KitNext
              icon="workspace_premium"
              action={
                canBuy ? (
                  <a href="#buy-storage" className={kit.quiet}>
                    {t("media.buy")}
                  </a>
                ) : undefined
              }
            >
              {planLine}
            </KitNext>
          )
        }
      />
      {limit === null ? <p className="-mt-2 m-0 px-1 text-[13px] text-(--sp-muted)">{t("media.noLimit")}</p> : null}

      <MediaUploader appId={app.id} accept={MEDIA_ACCEPT} disabled={disabled} inputId={INPUT}>
        <KitTable
          label={t("media.files")}
          title={t("media.yourFiles")}
          titleId="h-files"
          search={t("media.search")}
          noMatch={t("media.noMatch")}
          groups={{ label: t("media.show"), all: t("media.all"), items: GROUPS.map((g) => ({ id: g.id, label: t(g.label) })), initial: asked }}
          columns={[
            { label: t("media.file"), width: "minmax(0,1fr)" },
            { label: t("media.added"), width: "130px", wide: true },
            { label: t("media.whoOpens"), width: "minmax(130px,auto)", phone: "end" },
          ]}
          rows={rows}
          empty={
            <KitEmpty icon="photo_library" title={t("media.noFiles")} action={disabled ? null : <UploadButton inputId={INPUT} label={t("media.upload")} className={kit.quiet} />}>
              {disabled ?? t("media.emptyText")}
            </KitEmpty>
          }
        />
      </MediaUploader>

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
            <KitFold icon="add_circle" summary={t("media.choosePack")} open={usage.over || payment === "failed" ? true : undefined} data-buy-storage="">
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
