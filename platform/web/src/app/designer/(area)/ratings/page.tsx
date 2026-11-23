import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { MarketHeader } from "@/components/studio-market/header";
import { RatingLine, Stars } from "@/components/studio-market/parts";
import { formatDate } from "@/components/ui";
import { requireClient } from "@/lib/auth/session";
import { getStore } from "@/lib/data";
import { dashboardText } from "@/lib/dashboard-lang";
import { ratingStats } from "@/lib/studio-market/designer-page";
import { templateText } from "@/lib/studio-market/templates";
import { ReplyForm } from "./form";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await dashboardText()).t("marketPage.ratingsTitle") };
}
export const dynamic = "force-dynamic";

/**
 * 106.14 Designer area › Ratings: what buyers said about the designer's
 * templates, newest first, the overall rating and the buyers, and one
 * answer under each rating (changed or taken away later). A rating the
 * team hid is marked so and doesn't count.
 */
export default async function DesignerRatingsPage() {
  const context = await requireClient("billing");
  const { t, lang } = await dashboardText();
  const store = await getStore();
  const designer = await store.getTemplateDesignerByClient(context.client.id);
  if (!designer) redirect("/designer/join");
  const templates = await store.listMarketTemplates({ designerId: designer.id });
  const ids = templates.map((x) => x.id);
  const [ratings, summaries, buyers] = await Promise.all([store.listMarketRatings({ designerId: designer.id, withHidden: true, limit: 500 }), store.marketRatingSummaries(ids), store.countDesignerBuyers(designer.id)]);
  const overall = ratingStats(summaries);
  const titleOf = new Map(templates.map((x) => [x.id, { title: templateText(x, lang).title, slug: x.slug }]));

  return (
    <>
      <MarketHeader
        eyebrow={t("studioMarket.designerArea")}
        title={t("marketPage.ratingsTitle")}
        lead={t("marketPage.ratingsIntro")}
        actions={
          <div className="mk-panel flex flex-col gap-1 rounded-2xl px-5 py-3.5" data-overall={overall.average ?? ""}>
            <span className="mk-small">{t("marketPage.overall")}</span>
            <RatingLine rating={overall} size={18} className="text-[14px]" />
            <span className="text-[13px] text-muted">{t("marketPage.buyers", { count: buyers })}</span>
          </div>
        }
      />
      {ratings.length ? (
        <ul className="mk-panel m-0 flex list-none flex-col rounded-[28px] px-5 py-2 sm:px-8">
          {ratings.map((r, i) => {
            const on = titleOf.get(r.templateId);
            return (
              <li key={r.id} className={`flex flex-col gap-3 py-5 ${i ? "border-t border-[var(--mk-hair)]" : ""}`} data-designer-rating={r.id}>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <Stars rating={r.stars} size={18} />
                  <b dir="auto">{r.authorName || t("marketPage.someone")}</b>
                  <span className="text-[13px] text-muted">{formatDate(r.updatedAt, lang)}</span>
                  {on ? (
                    <Link href={`/studio/market/t/${on.slug}`} dir="auto" className="text-[13px] font-semibold">
                      {t("marketPage.onTemplate", { title: on.title })}
                    </Link>
                  ) : null}
                </div>
                {r.hiddenAt ? <p className="m-0 rounded-xl bg-warn-bg px-3.5 py-2 text-sm text-ink-2">{t("marketPage.hiddenByTeam")}</p> : null}
                {r.comment ? (
                  <p dir="auto" className="m-0 text-[15px] leading-relaxed whitespace-pre-line">
                    {r.comment}
                  </p>
                ) : null}
                <ReplyForm rating={r.id} reply={r.reply ?? ""} />
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="mk-panel flex flex-col items-center gap-2 px-6 py-12 text-center">
          <b className="text-lg">{t("marketPage.ratingsTitle")}</b>
          <span className="text-sm text-muted">{t("marketPage.noRatings")}</span>
        </div>
      )}
    </>
  );
}
