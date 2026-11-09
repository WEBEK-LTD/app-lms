import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Icon } from "@/components/icon";
import { Badge, btn, Notice, PageHeader, Section } from "@/components/ui";
import { decideApplicationAction } from "@/app/actions/joining";
import type { DashKey } from "@/i18n/dashboard";
import { assetUrl } from "@/lib/assets";
import { requireClient } from "@/lib/auth/session";
import { dashboardText } from "@/lib/dashboard-lang";
import { getStore } from "@/lib/data";
import type { ApplicationField, OpeningPeriod, ShipmentPlace } from "@/lib/data/types";
import { FILE_KINDS } from "@/lib/market/joining-forms";
import { isFood } from "../../../../shipments/parts";
import { APPLICATION_TONES, NotMarket } from "../../../parts";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await dashboardText()).t("market.application") };
}

/** A file of the application: a logo is public, papers only at the dashboard's private address. */
function fileHref(q: ApplicationField, id: string): string {
  return q.kind === "logo" ? assetUrl(id) : `/dashboard/drivers/documents/${id}`;
}

function Answer({ q, value, t }: { q: ApplicationField; value: unknown; t: (key: DashKey) => string }) {
  if (value === undefined || value === null || value === "") return <span className="text-ink-4">—</span>;
  if (FILE_KINDS.includes(q.kind)) {
    const ids = Array.isArray(value) ? value.map(String) : [String(value)];
    return (
      <span className="flex flex-wrap gap-2">
        {ids.map((id, i) => (
          <a key={id} href={fileHref(q, id)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-lg border border-line px-2 py-1 text-[13px] font-semibold no-underline">
            <Icon name="attach_file" size={16} />
            {t("market.file")} {i + 1}
          </a>
        ))}
      </span>
    );
  }
  if (q.kind === "yes_no") return <span>{t(value ? "market.yes" : "market.no")}</span>;
  if (q.kind === "place") {
    const p = value as ShipmentPlace;
    return (
      <a href={`https://www.openstreetmap.org/?mlat=${p.lat}&mlon=${p.lng}#map=17/${p.lat}/${p.lng}`} target="_blank" rel="noreferrer">
        {p.address}
      </a>
    );
  }
  if (q.kind === "hours") {
    return (
      <span className="flex flex-col" dir="ltr">
        {(value as OpeningPeriod[]).map((h) => (
          <span key={`${h.day}-${h.opens}`}>
            {h.day} {h.opens}–{h.closes}
          </span>
        ))}
      </span>
    );
  }
  return <span className="whitespace-pre-wrap">{String(value)}</span>;
}

/** 115.12 Studio › Joining › an application: the answers, and accepting, asking for more or turning it down. */
export default async function ApplicationPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string }> }) {
  const { app } = await requireClient("orders");
  const { t } = await dashboardText();
  if (!isFood(app)) return <NotMarket title={t("market.application")} t={t} />;
  const store = await getStore();
  const application = await store.getMarketApplication(app.id, Number((await params).id));
  if (!application) notFound();
  const form = await store.getMarketApplicationForm(app.id, application.formId);
  const error = (await searchParams).error;
  const waiting = application.status === "new" || application.status === "more_info";

  return (
    <div className="flex flex-col gap-6">
      <Link href="/dashboard/market/joining" className="inline-flex items-center gap-1 text-sm font-semibold text-ink-3 no-underline">
        <Icon name="arrow_back" size={18} className="rtl:rotate-180" />
        {t("market.joining")}
      </Link>
      <PageHeader title={application.businessName} description={`${t(`market.vk_${application.kind}` as DashKey)} · ${application.email}`} actions={<Badge tone={APPLICATION_TONES[application.status]}>{t(`market.as_${application.status}` as DashKey)}</Badge>} />
      {error ? (
        <Notice tone="danger" icon="error">
          {error}
        </Notice>
      ) : null}
      {application.message ? (
        <Notice tone="info" icon="chat">
          {application.message}
        </Notice>
      ) : null}
      {application.vendorId ? (
        <Notice tone="success" icon="storefront">
          <Link href={`/dashboard/restaurants/${application.vendorId}`}>{t("market.openPlace")}</Link>
        </Notice>
      ) : null}

      <Section titleId="h-answers" title={t("market.answers")}>
        <dl className="m-0 grid gap-4 sm:grid-cols-2">
          {(form?.fields ?? []).map((q) => (
            <div key={q.key} className="flex flex-col gap-1">
              <dt className="text-[13px] font-semibold text-ink-4">{q.label}</dt>
              <dd className="m-0 text-[15px] text-ink-2">
                <Answer q={q} value={application.answers[q.key]} t={t} />
              </dd>
            </div>
          ))}
        </dl>
      </Section>

      {waiting ? (
        <Section titleId="h-decide" title={t("market.decideApp")} description={t("market.decideAppHint")}>
          <div className="grid gap-4 md:grid-cols-3">
            <form action={decideApplicationAction} className="flex flex-col gap-3 rounded-2xl border border-line-soft p-4">
              <input type="hidden" name="id" value={application.id} />
              <input type="hidden" name="decision" value="accept" />
              <strong>{t("market.acceptApp")}</strong>
              <span className="text-[13px] text-ink-4">{t("market.acceptAppHint")}</span>
              <button type="submit" className={`${btn.primary} mt-auto h-10 px-4 text-sm`}>
                <Icon name="check" size={18} />
                {t("market.acceptApp")}
              </button>
            </form>
            {(["more_info", "rejected"] as const).map((d) => (
              <form key={d} action={decideApplicationAction} className="flex flex-col gap-3 rounded-2xl border border-line-soft p-4">
                <input type="hidden" name="id" value={application.id} />
                <input type="hidden" name="decision" value={d} />
                <strong>{t(d === "more_info" ? "market.askMore" : "market.turnDown")}</strong>
                <textarea name="message" rows={3} maxLength={2000} required={d === "more_info"} placeholder={t(d === "more_info" ? "market.askMoreHint" : "market.turnDownHint")} className="input w-full" />
                <button type="submit" className={`${btn.secondary} mt-auto h-10 px-4 text-sm`}>
                  {t(d === "more_info" ? "market.askMore" : "market.turnDown")}
                </button>
              </form>
            ))}
          </div>
        </Section>
      ) : null}
    </div>
  );
}
