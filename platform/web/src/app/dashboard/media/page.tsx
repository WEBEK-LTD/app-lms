import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { deleteMediaAction, setMediaPublicAction } from "@/app/actions/media";
import { CopyButton } from "@/components/copy-button";
import { SubmitButton } from "@/components/form";
import { Icon } from "@/components/icon";
import { Badge, EmptyState, formatDate, Notice, PageHeader, Section } from "@/components/ui";
import { appLabel } from "@/lib/app/label";
import { requireClient } from "@/lib/auth/session";
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
import { priceView } from "@/lib/billing/display";
import { formatMoney } from "@/lib/billing/prices";
import { platformSetting, yallappPlanAccount } from "@/lib/settings/platform";
import { UpgradeHint } from "@/components/upgrade";
import { BuyStorageForm, RenameForm } from "./forms";
import { MediaUploader } from "./uploader";

export const metadata: Metadata = { title: "Media" };
export const dynamic = "force-dynamic";

const FILTERS: { id: MediaKind | "all"; label: string }[] = [
  { id: "all", label: "All" },
  { id: "video", label: "Videos" },
  { id: "image", label: "Pictures" },
  { id: "pdf", label: "PDFs" },
];

const KIND_LABEL: Record<MediaKind, string> = { video: "Video", image: "Picture", pdf: "PDF" };

/**
 * 51 Media: the app's videos, pictures and PDFs, kept on Yallapp's own
 * server. Videos used in lessons play in the app's own player (nothing shows
 * where they're hosted); pictures go in pages, products and listings.
 * Storage comes with the plan, and packs add to it.
 */
export default async function MediaPage({ searchParams }: PageProps<"/dashboard/media">) {
  const { app, client, license, state } = await requireClient();
  if (!app) redirect("/dashboard/app-type");
  const query = await searchParams;
  const filter = FILTERS.find((f) => f.id === query.kind)?.id ?? "all";
  const store = await getStore();
  const now = new Date();
  const plans = await effectivePlans(store);
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
  const disabled = !storage
    ? "Uploads aren't available right now. Message us on WhatsApp."
    : state !== "active"
      ? "Uploads start once your plan is active."
      : usage.over
        ? "Your files take more than your storage: delete some, or buy more storage, to upload again."
        : null;
  const payment = typeof query.payment === "string" ? query.payment : null;

  return (
    <>
      <PageHeader
        title="Media"
        description={
          <>
            Videos, pictures and PDFs for {appLabel(app)}, kept by Yallapp. Videos you use in lessons play in your app&apos;s own player, with nothing
            showing where they&apos;re hosted, and only for the people who may watch them.
          </>
        }
      />
      {payment === "paid" ? (
        <Notice tone="success" icon="check_circle" role="status">
          Payment received. Your extra storage is ready.
        </Notice>
      ) : payment === "failed" ? (
        <Notice tone="danger" icon="error" role="alert">
          The payment didn&apos;t go through, so no storage was added. You can try again.
        </Notice>
      ) : payment === "pending" ? (
        <Notice tone="info" role="status">
          We&apos;re waiting for the payment provider to confirm the payment. The storage is added as soon as it does.
        </Notice>
      ) : null}
      {query.deleted === "failed" ? (
        <Notice tone="danger" icon="error" role="alert">
          The file couldn&apos;t be deleted right now. Try again in a moment.
        </Notice>
      ) : null}

      <Section titleId="h-storage" title="Storage" description="What your files take of the storage your plan and storage packs give this app.">
        <div className="flex flex-col gap-1.5">
          <span className="text-2xl font-extrabold" data-storage-used="">
            {formatBytes(usage.usedBytes)}
            {limit === null ? "" : ` of ${formatBytes(limit)}`} <span className="text-base font-semibold text-muted">used</span>
          </span>
          {limit === null ? (
            <span className="text-sm text-muted">No limit on your plan.</span>
          ) : (
            <div className="h-2 rounded-full bg-ivory" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(share * 100)} aria-label={`Storage: ${formatBytes(usage.usedBytes)} of ${formatBytes(limit)}`}>
              <div className={`h-full rounded-full ${tone}`} style={{ width: `${share * 100}%` }} />
            </div>
          )}
          <span className="text-sm text-muted">
            {usage.plan ? `${usage.plan.name} plan: ${formatStorage(usage.plan.limits.storageGb)}` : "No plan yet"}
            {usage.active.map((p) => ` · ${offerName(p)} until ${formatDate(p.activeUntil)}`).join("")}
          </span>
        </div>
        {usage.over ? (
          <Notice tone="warn" icon="warning" role="alert">
            Your files take more than your storage now. Nothing has been deleted and everything keeps playing, but new uploads wait until you delete files or buy more
            storage.
          </Notice>
        ) : null}
      </Section>

      <Section titleId="h-upload" title="Upload" description={MEDIA_KINDS.map((k) => `${k.label} up to ${formatBytes(k.maxBytes)}`).join(" · ")}>
        <MediaUploader appId={app.id} accept={MEDIA_ACCEPT} disabled={disabled} />
      </Section>

      <Section
        titleId="h-files"
        title="Your files"
        flush
        actions={
          <nav aria-label="Show" className="flex flex-wrap gap-1.5">
            {FILTERS.map((f) => (
              <Link
                key={f.id}
                href={f.id === "all" ? "/dashboard/media" : `/dashboard/media?kind=${f.id}`}
                aria-current={filter === f.id ? "page" : undefined}
                className={`rounded-full border px-3 py-1 text-sm font-semibold no-underline ${filter === f.id ? "border-midnight bg-midnight text-white hover:text-white" : "border-line text-ink-3"}`}
              >
                {f.label}
              </Link>
            ))}
          </nav>
        }
      >
        {files.length === 0 ? (
          <div className="p-5 sm:p-6">
            <EmptyState icon="photo_library" title={filter === "all" ? "No files yet" : `No ${FILTERS.find((f) => f.id === filter)!.label.toLowerCase()} yet`}>
              Upload a video, then choose it for a lesson with “Choose from Media”, or copy its link.
            </EmptyState>
          </div>
        ) : (
          <ul className="m-0 flex list-none flex-col p-0" aria-label="Files">
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
                        {KIND_LABEL[f.kind]} · {formatBytes(f.sizeBytes)} · {formatDate(f.createdAt)}
                      </span>
                    </div>
                    {f.status === "uploading" ? (
                      <Badge tone="warn">Upload not finished</Badge>
                    ) : isPublic(f) ? (
                      <Badge tone="neutral">Anyone with the link</Badge>
                    ) : (
                      <Badge tone="info">Lessons only</Badge>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {f.status === "ready" ? <CopyButton value={link} label="Copy link" /> : null}
                    {open ? (
                      <a href={open} target="_blank" rel="noopener noreferrer" className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-line-strong bg-white px-3.5 text-sm font-semibold text-midnight no-underline hover:border-midnight">
                        <Icon name="open_in_new" size={18} />
                        Open
                      </a>
                    ) : null}
                    {f.status === "ready" ? <RenameForm id={f.id} name={f.name} /> : null}
                    {f.status === "ready" && f.kind !== "image" ? (
                      <form action={setMediaPublicAction}>
                        <input type="hidden" name="id" value={f.id} />
                        <input type="hidden" name="public" value={f.public ? "" : "on"} />
                        <SubmitButton variant="secondary" className="h-10 px-3 text-sm">
                          {f.public ? "Lessons only" : "Share the link"}
                        </SubmitButton>
                      </form>
                    ) : null}
                    <form action={deleteMediaAction}>
                      <input type="hidden" name="id" value={f.id} />
                      <SubmitButton variant="secondary" className="h-10 px-3 text-sm">
                        {f.status === "uploading" ? "Cancel upload" : "Delete"}
                      </SubmitButton>
                    </form>
                  </div>
                  {f.status === "uploading" ? (
                    <p className="m-0 text-[13px] text-muted">Choose the same file above to carry on. Uploads not finished in two days are cancelled.</p>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </Section>

      <Section
        id="buy-storage"
        titleId="h-buy-storage"
        title="Buy more storage"
        description={license ? `Storage packs run until your plan's period ends (${formatDate(license.expiresAt)}) and renew with it when you renew by card.` : "Storage packs come with a plan."}
      >
        {bigger ? (
          <UpgradeHint title={`${bigger.name} includes ${formatStorage(bigger.limits.storageGb)}`} to={{ id: bigger.id, name: bigger.name }} compact>
            Or move to a bigger plan.
          </UpgradeHint>
        ) : null}
        {buyBlocked ? (
          <p className="m-0 text-[15px] text-ink-4">{buyBlocked}</p>
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
                note: `${formatMoney(monthly.shown)} a month × ${price.months} ${price.months === 1 ? "month" : "months"}, until ${formatDate(license.expiresAt)}`,
                charge: price.offer.line,
              };
            })}
          />
        ) : (
          <p className="m-0 text-[15px] text-ink-4">
            Storage packs of {packOffers(packsSetting?.value).map(offerName).join(" and ")} are added by our team.{" "}
            <a href={contact.whatsappUrl} target="_blank" rel="noopener noreferrer">
              Message us on WhatsApp
            </a>
            .
          </p>
        )}
        {client.status === "suspended" ? <p className="m-0 text-sm text-danger">This account is suspended.</p> : null}
      </Section>
    </>
  );
}
