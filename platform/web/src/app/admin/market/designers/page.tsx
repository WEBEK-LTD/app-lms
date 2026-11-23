import type { Metadata } from "next";
import Link from "next/link";
import { hideRatingAction, decideDesignerProfileAction, lockDesignerPageAction } from "@/app/actions/admin-market";
import { Icon } from "@/components/icon";
import { MarketHeader } from "@/components/studio-market/header";
import { formatDateTime } from "@/components/ui";
import { countryName } from "@/lib/account/country";
import { assetUrl } from "@/lib/assets";
import { adminCan, requireAdmin } from "@/lib/auth/session";
import { getStore } from "@/lib/data";
import { designerChip } from "@/lib/studio-market/catalog";
import { designerPath, RATING_LIMITS } from "@/lib/studio-market/designer-page";
import { templateText } from "@/lib/studio-market/templates";
import { safePhotoUrl } from "@/lib/studio-market/photo-url";
import { getBlobStore } from "@/lib/blobs";
import { houseTemplatesReady } from "@/lib/studio-market/house";
import { findHouseDesigner, houseLogoUrl, isHouseDesigner } from "@/lib/studio-market/house-photo";
import { HouseDesignerForm } from "./house-form";

export const metadata: Metadata = { title: "Studio Market designers" };
export const dynamic = "force-dynamic";

const DONE: Record<string, string> = {
  approved: "Approved. The photo and line show on the designer's page.",
  declined: "Declined. The designer sees your note in their profile.",
  locked: "The page is locked: it doesn't open and isn't in the sitemap. Their templates stay on the market.",
  unlocked: "The page opens again.",
  hidden: "The rating is hidden from the pages and the averages.",
  shown: "The rating shows again.",
};

/**
 * 106.14 Admin › Studio Market › Designers: the designers' photos and lines
 * waiting for the team's first look (approve, or decline with a note), the
 * buyers' latest ratings (hide an abusive one, show it again) and every
 * designer's page (lock it, open it again). Anyone on the team sees it;
 * `market.review` decides. Each decision is in the audit log.
 *
 * 218 On top, Yallapp's own page (the designer of Yallapp's free templates,
 * on the demo account nobody signs in to): its photo (the Yallapp logo until
 * one is uploaded) and line, changed here and shown at once.
 */
export default async function MarketDesignersPage({ searchParams }: PageProps<"/admin/market/designers">) {
  await requireAdmin();
  const mayDecide = await adminCan("market.review");
  const store = await getStore();
  const params = await searchParams;
  // Yallapp's own designer is made where the market is read; made here too when the demo account is there and it isn't yet.
  let house = await findHouseDesigner(store);
  if (!house) {
    await houseTemplatesReady(store, getBlobStore(), new Date());
    house = await findHouseDesigner(store);
  }
  const designers = await store.listTemplateDesigners();
  const waiting = designers.filter((d) => d.profileReview === "pending").sort((a, b) => a.updatedAt.getTime() - b.updatedAt.getTime());
  const ratings = await store.listMarketRatings({ withHidden: true, limit: 100 });
  const templates = new Map((await store.listMarketTemplates({ ids: [...new Set(ratings.map((r) => r.templateId))] })).map((x) => [x.id, x]));
  const designerOf = new Map(designers.map((d) => [d.id, d]));
  const done = typeof params.done === "string" ? DONE[params.done] : undefined;
  const disabled = mayDecide ? undefined : true;

  const avatar = (d: (typeof designers)[number], size: number) => {
    const chip = designerChip(d);
    // Waiting photos too (the chip has only approved ones), through the same check; Yallapp's own, its logo without one.
    const photo = d.photoAssetId ? safePhotoUrl(assetUrl(d.photoAssetId)) : isHouseDesigner(d) ? houseLogoUrl() : null;
    return photo ? (
      // eslint-disable-next-line @next/next/no-img-element -- The designer's uploaded photo, served by the platform's own asset route.
      <img src={photo} alt={`${d.name}'s photo`} width={size} height={size} className="flex-none rounded-full object-cover" style={{ width: size, height: size }} />
    ) : (
      <span aria-hidden="true" className="inline-flex flex-none items-center justify-center rounded-full font-extrabold" style={{ width: size, height: size, fontSize: size * 0.4, background: chip.bg, color: chip.fg }}>
        {chip.initials}
      </span>
    );
  };

  return (
    <div className="mk mk-page flex flex-col gap-6">
      <MarketHeader eyebrow="Studio Market" title="Designers" lead="Designers' photos and lines wait for our first look before they show on their public page; later changes go live. Hide an abusive rating, or lock a designer's page." />
      {done ? (
        <p role="status" className="m-0 rounded-xl bg-success-bg px-4 py-3 text-[15px] font-semibold text-success">
          {done}
        </p>
      ) : null}
      {params.error ? (
        <p role="alert" className="m-0 rounded-xl bg-danger-bg px-4 py-3 text-[15px] font-semibold text-danger">
          That changed meanwhile. Look again.
        </p>
      ) : null}

      <section aria-labelledby="h-house" className="mk-panel flex flex-col gap-3 px-[22px] py-5" data-house-page="">
        <div className="flex flex-wrap items-center gap-3">
          <h2 id="h-house" className="m-0 flex-1 text-xl font-extrabold">
            Yallapp&apos;s own page
          </h2>
          {house && !house.pageLockedAt ? (
            <a href={designerPath(house.slug)} target="_blank" rel="noopener" className="inline-flex h-9 items-center gap-1.5 rounded-[10px] border border-line-strong bg-white px-3.5 text-sm font-semibold text-midnight no-underline">
              <Icon name="open_in_new" size={18} />
              See the page
            </a>
          ) : null}
        </div>
        {house ? (
          <>
            <p className="m-0 text-sm text-muted">
              The designer of Yallapp&apos;s free templates, at <span dir="ltr">yallapp.com.tr{designerPath(house.slug)}</span>. Its photo shows on the market&apos;s cards and on its page; without an uploaded photo, the Yallapp logo shows. What you save here shows at once, with no review.
              {house.pageLockedAt ? " The page is locked: unlock it below to see it." : ""}
            </p>
            <HouseDesignerForm photoUrl={house.photoAssetId ? (safePhotoUrl(assetUrl(house.photoAssetId)) ?? houseLogoUrl()) : houseLogoUrl()} uploaded={Boolean(house.photoAssetId)} bio={house.bio ?? ""} disabled={disabled} />
          </>
        ) : (
          <p className="m-0 text-sm text-muted">
            Yallapp&apos;s own page is made with the demo apps: create them in <Link href="/admin/demos">Admin › Demo apps</Link> first.
          </p>
        )}
      </section>

      <section aria-labelledby="h-waiting" className="mk-panel flex flex-col gap-3 px-[22px] py-5">
        <h2 id="h-waiting" className="m-0 text-xl font-extrabold">
          Photos and lines to review <span className="font-medium text-muted">{waiting.length}</span>
        </h2>
        {waiting.length ? (
          waiting.map((d) => (
            <article key={d.id} className="flex flex-col gap-3 border-t border-line-soft pt-4" data-profile-review={d.slug}>
              <div className="flex flex-wrap items-center gap-3">
                {avatar(d, 72)}
                <span className="flex min-w-0 flex-col">
                  <b className="text-base">{d.name}</b>
                  <span className="text-[13px] text-muted" dir="ltr">
                    yallapp.com.tr{designerPath(d.slug)}
                  </span>
                  <span className="text-xs text-muted">Changed {formatDateTime(d.updatedAt)}</span>
                </span>
                <Link href={`/admin/clients/${d.clientId}`} className="ms-auto inline-flex h-9 items-center gap-1.5 rounded-[10px] border border-line-strong bg-white px-3.5 text-sm font-semibold text-midnight no-underline">
                  <Icon name="person" size={18} />
                  The designer&apos;s account
                </Link>
              </div>
              <p className="m-0 rounded-xl border border-line bg-sand px-4 py-3 text-sm whitespace-pre-line" dir="auto">
                {d.bio || <span className="text-muted">No line about them.</span>}
              </p>
              <form action={decideDesignerProfileAction} className="flex flex-wrap items-end gap-2.5">
                <input type="hidden" name="designer" value={d.id} />
                <label className="flex min-w-[240px] flex-1 flex-col gap-1 text-sm">
                  <span className="font-semibold">Note to the designer (if you decline)</span>
                  <input name="note" maxLength={RATING_LIMITS.note} className="input" />
                </label>
                <button type="submit" name="decision" value="approve" disabled={disabled} className="inline-flex h-11 cursor-pointer items-center gap-1.5 rounded-[10px] border-0 bg-success px-4 text-sm font-bold text-white disabled:opacity-50">
                  <Icon name="check_circle" size={18} />
                  Approve
                </button>
                <button type="submit" name="decision" value="decline" disabled={disabled} className="inline-flex h-11 cursor-pointer items-center gap-1.5 rounded-[10px] border border-line-strong bg-white px-4 text-sm font-bold text-danger disabled:opacity-50">
                  <Icon name="cancel" size={18} />
                  Decline
                </button>
              </form>
            </article>
          ))
        ) : (
          <p className="m-0 text-sm text-muted">Nothing waiting.</p>
        )}
      </section>

      <section id="ratings" aria-labelledby="h-ratings" className="mk-panel flex scroll-mt-20 flex-col gap-1 px-[22px] py-5">
        <h2 id="h-ratings" className="m-0 pb-2 text-xl font-extrabold">
          Latest ratings
        </h2>
        {ratings.length ? (
          ratings.map((r) => {
            const template = templates.get(r.templateId);
            return (
              <article key={r.id} className={`flex flex-col gap-2 border-t border-line-soft py-3.5 ${r.hiddenAt ? "opacity-75" : ""}`} data-admin-rating={r.id}>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                  <b>{"★".repeat(r.stars)}</b>
                  <span>{r.authorName || "No name"}</span>
                  <span className="text-muted">on {template ? templateText(template, "en").title : "a template"}</span>
                  <span className="text-muted">by {designerOf.get(r.designerId)?.name ?? "a designer"}</span>
                  <span className="text-xs text-muted">{formatDateTime(r.updatedAt)}</span>
                  {r.hiddenAt ? <span className="rounded-xl bg-warn-bg px-2 py-0.5 text-xs font-bold text-warn">Hidden{r.hiddenReason ? `: ${r.hiddenReason}` : ""}</span> : null}
                </div>
                {r.comment ? (
                  <p className="m-0 text-sm whitespace-pre-line" dir="auto">
                    {r.comment}
                  </p>
                ) : null}
                {r.reply ? (
                  <p className="m-0 ms-6 text-sm text-ink-3" dir="auto">
                    <b>Reply: </b>
                    {r.reply}
                  </p>
                ) : null}
                <form action={hideRatingAction} className="flex flex-wrap items-center gap-2">
                  <input type="hidden" name="rating" value={r.id} />
                  {r.hiddenAt ? (
                    <button type="submit" disabled={disabled} className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-[10px] border border-line-strong bg-white px-3 text-sm font-semibold text-midnight disabled:opacity-50">
                      <Icon name="visibility" size={17} />
                      Show again
                    </button>
                  ) : (
                    <>
                      <input type="hidden" name="hide" value="on" />
                      <input name="reason" maxLength={RATING_LIMITS.reason} placeholder="Why (team only)" aria-label="Why it is hidden (team only)" className="input h-9 w-[220px]" />
                      <button type="submit" disabled={disabled} className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-[10px] border border-line-strong bg-white px-3 text-sm font-semibold text-danger disabled:opacity-50">
                        <Icon name="visibility_off" size={17} />
                        Hide
                      </button>
                    </>
                  )}
                </form>
              </article>
            );
          })
        ) : (
          <p className="m-0 text-sm text-muted">No ratings yet.</p>
        )}
      </section>

      <section aria-labelledby="h-pages" className="mk-panel flex flex-col gap-1 px-[22px] py-5">
        <h2 id="h-pages" className="m-0 pb-2 text-xl font-extrabold">
          Designers&apos; pages <span className="font-medium text-muted">{designers.length}</span>
        </h2>
        {designers.map((d) => (
          <article key={d.id} className="flex flex-wrap items-center gap-3 border-t border-line-soft py-3" data-admin-designer={d.slug}>
            {avatar(d, 40)}
            <span className="flex min-w-0 flex-1 flex-col">
              <b className="text-sm">{d.name}</b>
              <span className="text-xs text-muted">
                <span dir="ltr">{designerPath(d.slug)}</span> · {countryName(d.country, "en")} · photo and line: {d.profileReview}
                {d.status === "suspended" ? " · suspended" : ""}
              </span>
              {d.pageLockedAt ? (
                <span className="text-xs font-bold text-danger">
                  Locked {formatDateTime(d.pageLockedAt)}
                  {d.pageLockedReason ? `: ${d.pageLockedReason}` : ""}
                </span>
              ) : null}
            </span>
            {d.pageLockedAt ? null : (
              <a href={designerPath(d.slug)} target="_blank" rel="noopener" className="text-sm font-semibold">
                Open the page
              </a>
            )}
            <form action={lockDesignerPageAction} className="flex flex-wrap items-center gap-2">
              <input type="hidden" name="designer" value={d.id} />
              {d.pageLockedAt ? (
                <button type="submit" disabled={disabled} className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-[10px] border border-line-strong bg-white px-3 text-sm font-semibold text-midnight disabled:opacity-50">
                  <Icon name="lock" size={17} />
                  Unlock
                </button>
              ) : (
                <>
                  <input type="hidden" name="lock" value="on" />
                  <input name="reason" maxLength={RATING_LIMITS.reason} placeholder="Why (the designer sees it)" aria-label={`Why the page of ${d.name} is locked (the designer sees it)`} className="input h-9 w-[220px]" />
                  <button type="submit" disabled={disabled} className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-[10px] border border-line-strong bg-white px-3 text-sm font-semibold text-danger disabled:opacity-50">
                    <Icon name="lock" size={17} />
                    Lock the page
                  </button>
                </>
              )}
            </form>
          </article>
        ))}
      </section>
    </div>
  );
}
