import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { CampaignEditor } from "@/components/mailing/editor";
import { countryOptions } from "@/lib/account/country";
import { can } from "@/lib/admin/permissions";
import { requireAdmin } from "@/lib/auth/session";
import { getStore } from "@/lib/data";
import { appUrl } from "@/lib/env";
import { PLANS } from "@/lib/plans";
import { getPlans } from "@/lib/settings/platform";
import { APP_TYPE_SWITCHES } from "@/lib/switches";

export const metadata: Metadata = { title: "Email campaign" };
export const dynamic = "force-dynamic";

const STEPS = ["audience", "details", "design", "review"] as const;

/** 114 A draft or scheduled campaign, step by step; one that started has its report instead. */
export default async function CampaignPage({ params, searchParams }: PageProps<"/admin/email-campaigns/[id]">) {
  const admin = await requireAdmin();
  const { id } = await params;
  const query = await searchParams;
  const store = await getStore();
  const campaign = await store.getMailCampaign(id);
  if (!campaign) notFound();
  if (campaign.status !== "draft" && campaign.status !== "scheduled") redirect(`/admin/email-campaigns/${id}/report`);
  const [segments, plans, contactTags] = await Promise.all([store.listMailSegments(), getPlans(store), store.listMailContactTags()]);
  const step = STEPS.find((s) => s === query.step) ?? "audience";
  return (
    <CampaignEditor
      initial={{
        id: campaign.id,
        name: campaign.name,
        status: campaign.status,
        audience: campaign.audience,
        segmentId: campaign.segmentId,
        fromName: campaign.fromName,
        replyTo: campaign.replyTo,
        contents: campaign.contents,
        defaultLang: campaign.defaultLang,
        track: campaign.track,
        perMinute: campaign.perMinute,
        scheduledAt: campaign.scheduledAt?.toISOString() ?? null,
        timeZone: campaign.timeZone,
      }}
      segments={segments}
      options={{ plans: PLANS.map((p) => ({ id: p, name: plans[p].name })), appTypes: APP_TYPE_SWITCHES, countries: countryOptions("en"), contactTags }}
      assetBase={appUrl()}
      canEdit={can(admin.adminRole, "marketing.edit")}
      canSend={can(admin.adminRole, "marketing.send")}
      step={step}
    />
  );
}
