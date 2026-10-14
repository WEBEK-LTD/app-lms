import Link from "next/link";
import { notFound } from "next/navigation";
import { deleteCampaignAction, setCampaignFeaturedAction, setCampaignStatusAction } from "@/app/actions/donations";
import { SubmitButton } from "@/components/form";
import { Badge, Notice, ProgressBar } from "@/components/ui";
import { assetUrl } from "@/lib/assets";
import { requireClient } from "@/lib/auth/session";
import { centsToDecimal } from "@/lib/catalog/money";
import { getStore } from "@/lib/data";
import type { Campaign } from "@/lib/data/types";
import { CAMPAIGN_IMAGE_MAX_BYTES, CAMPAIGN_IMAGES_MAX, CAMPAIGN_STORY_MAX, CAMPAIGN_SUMMARY_MAX, CAMPAIGN_TITLE_MAX, endDateValue } from "@/lib/donations/forms";
import { raisedLine } from "@/lib/donations/page-items";
import { donationSettingsOf, publicStatus } from "@/lib/donations/service";
import { NOTIFICATION_BODY_MAX, NOTIFICATION_TITLE_MAX } from "@/lib/hosted/notify";
import { CampaignForm, CampaignUpdateForm, type CampaignFormValues } from "./forms";

/** 29 Draft, Open or Ended, as the app shows it. */
export function CampaignStatusBadge({ campaign, now }: { campaign: Campaign; now: Date }) {
  const status = publicStatus(campaign, now);
  if (status === null) return <Badge tone="neutral">Draft</Badge>;
  return status === "open" ? <Badge tone="success">Open</Badge> : <Badge tone="warn">Ended</Badge>;
}

function StatusButton({ campaign, status, label, primary = false }: { campaign: Campaign; status: Campaign["status"]; label: string; primary?: boolean }) {
  return (
    <form action={setCampaignStatusAction}>
      <input type="hidden" name="id" value={campaign.id} />
      <input type="hidden" name="status" value={status} />
      <SubmitButton variant={primary ? "primary" : "secondary"} className="h-10" pendingText="Saving…">
        {label}
      </SubmitButton>
    </form>
  );
}

/** 29 Adding (id null) or editing a campaign: its status, its donors' updates and the form. */
export async function CampaignPage({ id, cannotDelete }: { id: number | null; cannotDelete?: boolean }) {
  const { app } = await requireClient();
  if (!app || app.connector?.kind !== "campaigns") notFound();
  const store = await getStore();
  const [campaign, settingsRow] = await Promise.all([id !== null ? store.getCampaign(app.id, id) : Promise.resolve(null), store.getDonationSettings(app.id)]);
  if (id !== null && !campaign) notFound();
  const { currency } = donationSettingsOf(settingsRow);
  const now = new Date();
  const money = (cents: number | null) => (cents === null ? "" : centsToDecimal(cents).replace(/\.00$/, ""));
  const values: CampaignFormValues = campaign
    ? {
        id: campaign.id,
        title: campaign.title,
        summary: campaign.summary ?? "",
        story: campaign.story,
        goal: money(campaign.goalCents),
        presets: campaign.presetCents.map(money).join(", "),
        min: money(campaign.minCents),
        allowCustom: campaign.allowCustomAmount,
        endsAt: endDateValue(campaign.endsAt),
        images: campaign.imageAssetIds.map((assetId) => ({ id: assetId, url: assetUrl(assetId) })),
        draft: campaign.status === "draft",
      }
    : { id: null, title: "", summary: "", story: "", goal: "", presets: "", min: "20", allowCustom: true, endsAt: "", images: [], draft: true };
  const status = campaign ? publicStatus(campaign, now) : null;
  return (
    <div className="flex max-w-[760px] flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Link href="/dashboard/campaigns" className="text-sm font-semibold">
          ← Campaigns
        </Link>
        <h1 className="m-0 text-[26px] leading-tight font-extrabold tracking-[-0.5px] break-words sm:text-[30px]">{campaign ? campaign.title : "New campaign"}</h1>
      </div>
      {cannotDelete ? (
        <Notice tone="warn" icon="warning" role="alert">
          This campaign has donations, so it can&apos;t be deleted: its donors keep their receipts. Close it instead.
        </Notice>
      ) : null}
      {campaign ? (
        <section aria-labelledby="h-status" className="flex flex-col gap-4 rounded-2xl border border-line bg-white p-5 sm:p-6">
          <div className="flex flex-wrap items-center gap-2">
            <h2 id="h-status" className="m-0 text-lg font-bold">
              Status
            </h2>
            <CampaignStatusBadge campaign={campaign} now={now} />
            {campaign.featured ? <Badge tone="info">Featured</Badge> : null}
          </div>
          <p className="m-0 text-[15px] text-ink-4">
            {status === null
              ? "A draft: only you see it."
              : status === "open"
                ? "Open: it's in the app and takes donations."
                : "Ended: it's still in the app, but takes no donations."}{" "}
            {raisedLine(campaign, currency)} from {campaign.donorCount} {campaign.donorCount === 1 ? "donor" : "donors"}.
          </p>
          {campaign.goalCents ? <ProgressBar value={campaign.raisedCents} max={campaign.goalCents} label="Raised so far" tone="success" /> : null}
          <div className="flex flex-wrap items-start gap-3">
            {campaign.status === "draft" ? <StatusButton campaign={campaign} status="open" label="Publish" primary /> : null}
            {campaign.status === "open" ? <StatusButton campaign={campaign} status="closed" label="Close the campaign" /> : null}
            {campaign.status === "closed" || (campaign.status === "open" && status === "closed") ? (
              <StatusButton campaign={campaign} status="open" label="Reopen" />
            ) : null}
            {campaign.status !== "draft" ? <StatusButton campaign={campaign} status="draft" label="Back to draft" /> : null}
            <form action={setCampaignFeaturedAction}>
              <input type="hidden" name="id" value={campaign.id} />
              <input type="hidden" name="featured" value={campaign.featured ? "off" : "on"} />
              <SubmitButton variant="secondary" className="h-10" pendingText="Saving…">
                {campaign.featured ? "Don't feature it" : "Feature it"}
              </SubmitButton>
            </form>
            <form action={deleteCampaignAction}>
              <input type="hidden" name="id" value={campaign.id} />
              <SubmitButton variant="secondary" className="h-10 text-danger" pendingText="Deleting…">
                Delete
              </SubmitButton>
            </form>
            <Link href={`/dashboard/donations?campaign=${campaign.id}`} className="self-center text-[15px] font-semibold">
              See its donations
            </Link>
          </div>
        </section>
      ) : null}
      {campaign && campaign.status !== "draft" ? (
        <section aria-labelledby="h-update" className="flex flex-col gap-4 rounded-2xl border border-line bg-white p-5 sm:p-6">
          <div className="flex flex-col gap-1">
            <h2 id="h-update" className="m-0 text-lg font-bold">
              Send an update to donors
            </h2>
            <p className="m-0 text-[15px] text-ink-4">Tell the people who gave what their money did, or that you reached the goal.</p>
          </div>
          <CampaignUpdateForm
            campaignId={campaign.id}
            limits={{ title: NOTIFICATION_TITLE_MAX, body: NOTIFICATION_BODY_MAX }}
            push={app.firebaseServiceAccountEncrypted !== null}
          />
        </section>
      ) : null}
      <section aria-label="Campaign" className="rounded-2xl border border-line bg-white p-5 sm:p-6">
        <CampaignForm
          campaign={values}
          currency={currency}
          limits={{
            title: CAMPAIGN_TITLE_MAX,
            summary: CAMPAIGN_SUMMARY_MAX,
            story: CAMPAIGN_STORY_MAX,
            images: CAMPAIGN_IMAGES_MAX,
            imageMb: CAMPAIGN_IMAGE_MAX_BYTES / 1024 / 1024,
          }}
        />
      </section>
    </div>
  );
}
