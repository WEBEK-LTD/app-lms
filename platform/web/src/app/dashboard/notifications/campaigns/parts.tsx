import { Badge } from "@/components/ui";
import type { NotificationCampaign } from "@/lib/data/types";
import { dashboardText } from "@/lib/dashboard-lang";
import type { CampaignStats } from "@/lib/hosted/campaigns";

/** 85.2 A campaign's status, as a badge. */
export async function CampaignStatus({ campaign }: { campaign: Pick<NotificationCampaign, "status" | "repeat"> }) {
  const { t } = await dashboardText();
  switch (campaign.status) {
    case "draft":
      return <Badge tone="neutral">{t("campaigns.draft")}</Badge>;
    case "scheduled":
      return <Badge tone="info">{t(campaign.repeat === "weekly" ? "campaigns.everyWeek" : "campaigns.waiting")}</Badge>;
    case "sending":
      return <Badge tone="warn">{t("campaigns.sending")}</Badge>;
    case "sent":
      return <Badge tone="success">{t("campaigns.sent")}</Badge>;
    case "stopped":
      return <Badge tone="neutral">{t("campaigns.stopped")}</Badge>;
    default:
      return <Badge tone="danger">{t("campaigns.failed")}</Badge>;
  }
}

/** 85.2 How a campaign did: people, phones reached and missed, opens. */
export async function CampaignNumbers({ stats }: { stats: CampaignStats }) {
  const { t, lang } = await dashboardText();
  const number = new Intl.NumberFormat(lang === "en" ? "en-GB" : lang);
  const items: [string, number][] = [
    [t("campaigns.people"), stats.recipients],
    [t("campaigns.reached"), stats.pushed],
    [t("campaigns.missed"), stats.failed],
    [t("campaigns.opened"), stats.opened],
    ...(stats.sends > 1 ? ([[t("campaigns.sends"), stats.sends]] as [string, number][]) : []),
  ];
  return (
    <dl className="m-0 flex flex-wrap gap-x-5 gap-y-1 text-[14px]">
      {items.map(([label, value]) => (
        <div key={label} className="flex items-baseline gap-1.5">
          <dt className="text-muted">{label}</dt>
          <dd className="m-0 font-bold">{number.format(value)}</dd>
        </div>
      ))}
    </dl>
  );
}
