import { BarList, DataTable } from "@/components/analytics-report";
import { Icon } from "@/components/icon";
import { QrCode } from "@/components/qr-code";
import { btn } from "@/components/ui";
import { relabel } from "@/lib/analytics/localize";
import type { SourcesReport } from "@/lib/analytics/report";
import type { DashboardText } from "@/lib/dashboard-lang";
import type { App } from "@/lib/data/types";
import { siteLinkBase, yallappLinkBase } from "@/lib/links/table";
import { encodeQr, qrSvgPath } from "@/lib/qr";

/** 86.2 A campaign name as links carry it (`utm_campaign`), the same rule the app and the contract keep. */
export const CAMPAIGN_NAME = /^[a-z0-9][a-z0-9._-]{0,39}$/;

/**
 * The app's link to share (its home page, on the website's own links for a
 * WordPress app), with the campaign; the QR code's says it came from one.
 */
export function shareLinks(app: Pick<App, "id" | "backend" | "siteUrl">, platformUrl: string, campaign: string | null): { link: string; qr: string } {
  const base = (app.backend === "wordpress" ? siteLinkBase(app.siteUrl) : null) ?? yallappLinkBase(platformUrl, app.id);
  const home = `${base}/page/home`;
  const query = (params: Record<string, string>) => `${home}?${new URLSearchParams(params)}`;
  return {
    link: campaign ? query({ utm_campaign: campaign }) : home,
    qr: query({ utm_medium: "qr", ...(campaign ? { utm_campaign: campaign } : {}) }),
  };
}

/** The QR code as an SVG file to download (drawn here, like the one on the page). */
function qrFile(value: string): string {
  const { path, side } = qrSvgPath(encodeQr(value));
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 ${side} ${side}" shape-rendering="crispEdges"><rect width="${side}" height="${side}" fill="#FFFFFF"/><path d="${path}" fill="#0E0D24"/></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function Names({ rows, head, caption, text }: { rows: { name: string; opens: number }[]; head: string; caption: string; text: DashboardText }) {
  return <DataTable caption={caption} head={[head, text.t("analytics.linkOpens")]} rows={rows.map((r) => [r.name, text.num(r.opens)])} />;
}

export function SourcesSection({ sources, text }: { sources: SourcesReport; text: DashboardText }) {
  const { t, lang } = text;
  if (sources.installs.length === 0 && sources.opens.length === 0) return <p className="m-0 text-sm text-muted">{t("analytics.noSources")}</p>;
  return (
    <div className="flex flex-col gap-5">
      <div className="grid items-start gap-6 [grid-template-columns:repeat(auto-fit,minmax(min(320px,100%),1fr))]">
        <div className="flex flex-col gap-2">
          <h3 className="m-0 text-sm font-semibold text-ink-3">{t("analytics.installStores")}</h3>
          <BarList items={relabel(sources.installs, text, "other")} label={t("analytics.installStores")} lang={lang} />
        </div>
        <div className="flex flex-col gap-2">
          <h3 className="m-0 text-sm font-semibold text-ink-3">{t("analytics.opensBy")}</h3>
          <BarList items={sources.opens.map((s) => ({ ...s, label: t(`analytics.source.${s.key}`) }))} label={t("analytics.opensBy")} lang={lang} />
        </div>
      </div>
      {sources.campaigns.length === 0 ? (
        <p className="m-0 text-sm text-muted">{t("analytics.noCampaigns")}</p>
      ) : (
        <div className="grid items-start gap-6 [grid-template-columns:repeat(auto-fit,minmax(min(320px,100%),1fr))]">
          <Names rows={sources.campaigns} head={t("analytics.campaign")} caption={t("analytics.campaigns")} text={text} />
          {sources.referrers.length > 0 ? <Names rows={sources.referrers} head={t("analytics.referrer")} caption={t("analytics.referrers")} text={text} /> : null}
        </div>
      )}
    </div>
  );
}

export function ShareCard({ links, campaign, invalid, text }: { links: { link: string; qr: string }; campaign: string; invalid: boolean; text: DashboardText }) {
  const { t } = text;
  return (
    <div className="flex flex-wrap items-start gap-5">
      <QrCode value={links.qr} label={t("analytics.qrLabel", { link: links.qr })} size={152} />
      <div className="flex min-w-0 flex-1 flex-col gap-3 [min-width:min(260px,100%)]">
        <form action="/dashboard/analytics#share" className="flex flex-wrap items-end gap-2" aria-label={t("analytics.shareTitle")}>
          <label className="flex min-w-0 flex-col gap-1 text-xs font-semibold text-muted">
            {t("analytics.campaignName")}
            <input
              name="campaign"
              defaultValue={campaign}
              maxLength={40}
              pattern="[a-z0-9][a-z0-9._\-]{0,39}"
              aria-describedby="campaign-hint"
              aria-invalid={invalid || undefined}
              className="input input-sm h-9 w-[220px] max-w-full"
              dir="ltr"
            />
          </label>
          <button type="submit" className={`${btn.secondary} h-9 px-3 text-sm`}>
            {t("analytics.makeLink")}
          </button>
        </form>
        <p id="campaign-hint" className={`m-0 text-xs ${invalid ? "font-semibold text-danger" : "text-muted"}`}>
          {invalid ? t("analytics.campaignNameInvalid") : t("analytics.campaignNameHint")}
        </p>
        <dl className="m-0 grid gap-2 text-sm">
          <div className="flex flex-col gap-0.5">
            <dt className="text-xs font-semibold text-muted">{t("analytics.appLink")}</dt>
            <dd className="m-0 break-all">
              <code dir="ltr" data-share="link">
                {links.link}
              </code>
            </dd>
          </div>
          <div className="flex flex-col gap-0.5">
            <dt className="text-xs font-semibold text-muted">{t("analytics.qrLink")}</dt>
            <dd className="m-0 break-all">
              <code dir="ltr" data-share="qr">
                {links.qr}
              </code>
            </dd>
          </div>
        </dl>
        <a href={qrFile(links.qr)} download={`qr-${campaign || "app"}.svg`} className={`${btn.secondary} h-10 self-start px-3 text-sm`}>
          <Icon name="download" size={20} />
          {t("analytics.downloadQr")}
        </a>
      </div>
    </div>
  );
}
