import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireClient } from "@/lib/auth/session";
import { dashboardText } from "@/lib/dashboard-lang";
import { getStore } from "@/lib/data";
import { effectivePlans } from "@/lib/entitlements";
import { hasReviewSignIn } from "@/lib/publishing/review-account";
import { deliveryOverview, studioProjectCard } from "@/lib/studio/projects";
import { isStudioProject } from "@/lib/studio/section";
import { Icon } from "@/components/icon";
import { AllSamples } from "@/components/samples";
import type { IconName } from "@/components/icon-names";
import { Stat, StatRow } from "@/components/page-kit";
import { Badge, ProgressBar, Section, btn } from "@/components/ui";
import { ago, ProjectPhone, StateBadge } from "../chrome";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await dashboardText();
  return { title: t("studio.overview") };
}
export const dynamic = "force-dynamic";

/** 103R.3 A Studio project's overview: the project, what's left before publishing, and its numbers. */
export default async function StudioProjectPage({ searchParams }: PageProps<"/studio/project">) {
  const context = await requireClient();
  const { app, license } = context;
  if (!app || !isStudioProject(app)) redirect("/studio");
  const { t, k, lang } = await dashboardText();
  const store = await getStore();
  const now = new Date();
  const query = await searchParams;
  const card = await studioProjectCard(store, app, license, await effectivePlans(store), now);
  const source =
    card.source.key === "platform"
      ? card.source.name
      : t(({ catalog: "studio.srcCatalogShort", wordpress: "studio.srcWordpress", shopify: "studio.srcShopify", custom_api: "studio.srcApi", none: "studio.srcNone" } as const)[card.source.key]);
  // 104 A delivery company: its prices and payment instead of a content source, and today's shipments and couriers.
  const delivery = app.appType === "delivery" ? await deliveryOverview(store, app, now) : null;
  const steps = [
    { done: card.home !== null, label: t("studio.checkDesign"), href: "/studio/editor", link: t("studio.continue") },
    { done: Boolean(app.brandingDoneAt), label: t("studio.checkIdentity"), href: "/studio/project/setup?step=branding", link: t("studio.continue") },
    delivery
      ? { done: delivery.pricesSet, label: t("studio.checkDeliveryPrices"), href: "/studio/project/delivery", link: t("studio.continue") }
      : { done: Boolean(app.websiteDoneAt), label: t("studio.checkSource"), href: "/studio/project/setup?step=website", link: t("studio.continue") },
    { done: hasReviewSignIn(app), label: t(delivery ? "studio.checkReviewBoth" : "studio.checkReview"), href: "/studio/project/publishing", link: t("studio.continue") },
    { done: card.plan !== null, label: t("studio.checkPlan"), href: "/studio/project/license", link: t("studio.plansLink") },
  ];
  const number = (n: number) => n.toLocaleString(lang === "ar" ? "ar-EG" : lang);
  const stats: { label: string; value: string; icon: IconName }[] = delivery
    ? [
        { label: t("studio.statShipmentsToday"), value: number(delivery.shipmentsToday), icon: "package_2" },
        { label: t("studio.statCouriersOnDuty"), value: number(delivery.couriersOnDuty), icon: "two_wheeler" },
      ]
    : [
        { label: t("studio.statPages"), value: number(card.pages), icon: "description" },
        { label: t("studio.statLanguages"), value: number(card.languages), icon: "translate" },
      ];
  const done = steps.filter((step) => step.done).length;
  const words = { price: t("studio.price"), addPicture: t("studio.addPicture"), addVideo: t("studio.addVideo"), send: t("studio.send"), search: t("studio.search"), days: t("studio.days"), hours: t("studio.hours"), minutes: t("studio.minutes"), seconds: t("studio.seconds"), copy: t("studio.copyCode") };
  return (
    <div className="flex flex-col gap-6">
      {/* The page kit: the project and its one main action, the numbers, then what's left before publishing. */}
      <section aria-labelledby="h-project" className="flex flex-wrap items-center gap-6 rounded-[18px] border border-line bg-white p-5 sm:p-6">
        <ProjectPhone home={card.home} size="whole" words={words} />
        <div className="flex min-w-0 flex-[1_1_300px] flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 id="h-project" className="m-0 text-[26px] leading-tight font-extrabold tracking-[-0.5px] break-words sm:text-[30px]">
              {card.name ?? t("studio.untitledProject")}
            </h1>
            <StateBadge published={card.published} label={t(card.published ? "studio.statePublished" : "studio.stateDraft")} />
          </div>
          <div className="text-[15px] leading-relaxed text-ink-4">
            {[k(card.kindName), source, t("studio.pageCount", { count: card.pages }), t("studio.lastSaved", { time: ago(card.editedAt, now, lang) })].join(" · ")}
          </div>
          <div className="mt-2 flex flex-wrap gap-3">
            <Link href="/studio/editor" className={`${btn.main} h-11`}>
              <Icon name="draw" size={20} />
              {t("studio.openEditor")}
            </Link>
            <Link href="/studio/project/preview" className={`${btn.secondary} h-11`}>
              <Icon name="qr_code_2" size={20} />
              {t("studio.tryOnPhone")}
            </Link>
          </div>
        </div>
      </section>

      {/* Templates = demos: the demo's entries a project started from it has, removed in one click. */}
      <AllSamples app={app} back="/studio/project" removed={query.samplesRemoved} />

      <StatRow label={t("studio.numbersLabel")}>
        {stats.map((stat) => (
          <Stat key={stat.label} icon={stat.icon} label={stat.label} value={stat.value} />
        ))}
        <Stat icon="workspace_premium" tone={card.plan ? "success" : "warn"} label={t("studio.statPlan")} value={<span className="text-lg">{card.plan ?? t("studio.notChosen")}</span>} href="/studio/project/license" />
      </StatRow>

      <Section
        titleId="h-steps"
        title={t("studio.beforePublish")}
        description={
          <span className="flex flex-col gap-2 pt-1">
            <span className="font-semibold text-midnight">{done === steps.length ? t("studio.allStepsDone") : t("studio.stepsDone", { done, total: steps.length })}</span>
            <ProgressBar value={done} max={steps.length} label={t("studio.beforePublish")} tone={done === steps.length ? "success" : "accent"} />
          </span>
        }
        flush
      >
        <ol className="m-0 flex list-none flex-col p-0">
          {steps.map((step) => (
            <li key={step.label} className="flex flex-wrap items-center gap-x-3.5 gap-y-2 border-t border-line-soft px-5 py-3.5 first:border-t-0 sm:px-6">
              <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] ${step.done ? "bg-success-bg text-success" : "bg-sand text-faint"}`}>
                <Icon name={step.done ? "check_circle" : "radio_button_unchecked"} size={22} />
              </span>
              <span className={`min-w-0 flex-[1_1_200px] text-[15px] ${step.done ? "text-muted" : "font-bold text-midnight"}`}>{step.label}</span>
              {step.done ? (
                <Badge tone="success">{t("studio.stepDone")}</Badge>
              ) : (
                <Link href={step.href} className={`${btn.secondary} h-9 px-3.5 text-sm`}>
                  {step.link}
                  <Icon name="chevron_right" size={18} />
                </Link>
              )}
            </li>
          ))}
        </ol>
      </Section>
    </div>
  );
}
