import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireClient } from "@/lib/auth/session";
import { dashboardText } from "@/lib/dashboard-lang";
import { getStore } from "@/lib/data";
import { effectivePlans } from "@/lib/entitlements";
import { hasReviewSignIn } from "@/lib/publishing/review-account";
import { studioProjectCard } from "@/lib/studio/projects";
import { isStudioProject } from "@/lib/studio/section";
import { ago, C, Glyph, ProjectPhone, StateBadge } from "../chrome";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await dashboardText();
  return { title: t("studio.overview") };
}
export const dynamic = "force-dynamic";

/** 103R.3 A Studio project's overview: the project, what's left before publishing, and its numbers. */
export default async function StudioProjectPage() {
  const context = await requireClient();
  const { app, license } = context;
  if (!app || !isStudioProject(app)) redirect("/studio");
  const { t, k, lang } = await dashboardText();
  const store = await getStore();
  const now = new Date();
  const card = await studioProjectCard(store, app, license, await effectivePlans(store), now);
  const source =
    card.source.key === "platform"
      ? card.source.name
      : t(({ catalog: "studio.srcCatalogShort", wordpress: "studio.srcWordpress", shopify: "studio.srcShopify", custom_api: "studio.srcApi" } as const)[card.source.key]);
  const steps = [
    { done: card.home !== null, label: t("studio.checkDesign"), href: "/studio/editor", link: t("studio.continue") },
    { done: Boolean(app.brandingDoneAt), label: t("studio.checkIdentity"), href: "/studio/project/setup?step=branding", link: t("studio.continue") },
    { done: Boolean(app.websiteDoneAt), label: t("studio.checkSource"), href: "/studio/project/setup?step=website", link: t("studio.continue") },
    { done: hasReviewSignIn(app), label: t("studio.checkReview"), href: "/studio/project/publishing", link: t("studio.continue") },
    { done: card.plan !== null, label: t("studio.checkPlan"), href: "/studio/project/license", link: t("studio.plansLink") },
  ];
  const words = { price: t("studio.price"), addPicture: t("studio.addPicture"), addVideo: t("studio.addVideo"), send: t("studio.send"), search: t("studio.search") };
  const box = { background: "#FFFFFF", border: `1px solid ${C.line}` };
  return (
    <>
      <section aria-labelledby="h-project" className="flex flex-wrap items-center gap-6 rounded-[18px] p-5" style={box}>
        <ProjectPhone home={card.home} size="whole" words={words} />
        <div className="flex flex-[1_1_320px] flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 id="h-project" className="m-0 text-[26px] font-extrabold">
              {card.name ?? t("studio.untitledProject")}
            </h1>
            <StateBadge published={card.published} label={t(card.published ? "studio.statePublished" : "studio.stateDraft")} />
          </div>
          <div className="text-sm" style={{ color: C.muted }}>
            {[k(card.kindName), source, t("studio.pageCount", { count: card.pages }), t("studio.lastSaved", { time: ago(card.editedAt, now, lang) })].join(" · ")}
          </div>
          <div className="mt-1.5 flex flex-wrap gap-2">
            <Link href="/studio/editor" className="flex h-[42px] items-center gap-2 rounded-xl px-[18px] text-sm font-extrabold no-underline" style={{ background: C.ink, color: C.ivory }}>
              <Glyph name="draw" size={18} />
              {t("studio.openEditor")}
            </Link>
            <Link href="/studio/project/preview" className="flex h-[42px] items-center gap-2 rounded-xl px-4 text-sm font-bold no-underline" style={{ border: `1px solid ${C.line}`, color: C.ink }}>
              <Glyph name="qr_code_2" size={18} />
              {t("studio.tryOnPhone")}
            </Link>
          </div>
        </div>
      </section>

      <section aria-labelledby="h-steps" className="flex flex-col gap-3 rounded-[18px] p-5" style={box}>
        <h2 id="h-steps" className="m-0 text-[17px] font-extrabold">
          {t("studio.beforePublish")}
        </h2>
        <ol className="m-0 flex list-none flex-col gap-2 p-0 text-sm">
          {steps.map((step) => (
            <li key={step.label} className="flex items-center gap-2.5">
              <Glyph name={step.done ? "check_circle" : "radio_button_unchecked"} className={step.done ? "text-[#1F8A4C]" : "text-[#B9B3A5]"} />
              {step.label}
              {step.done ? null : (
                <Link href={step.href} className="ms-auto font-bold" style={{ color: C.ink }}>
                  {step.link}
                </Link>
              )}
            </li>
          ))}
        </ol>
      </section>

      <div className="grid gap-3.5" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))" }}>
        <div className="flex flex-col gap-1 rounded-2xl p-4" style={box}>
          <span className="text-[13px]" style={{ color: C.muted }}>
            {t("studio.statPages")}
          </span>
          <span className="text-[26px] font-extrabold">{card.pages.toLocaleString(lang === "ar" ? "ar-EG" : lang)}</span>
        </div>
        <div className="flex flex-col gap-1 rounded-2xl p-4" style={box}>
          <span className="text-[13px]" style={{ color: C.muted }}>
            {t("studio.statLanguages")}
          </span>
          <span className="text-[26px] font-extrabold">{card.languages.toLocaleString(lang === "ar" ? "ar-EG" : lang)}</span>
        </div>
        <div className="flex flex-col gap-1 rounded-2xl p-4" style={box}>
          <span className="text-[13px]" style={{ color: C.muted }}>
            {t("studio.statPlan")}
          </span>
          <span className="text-lg font-extrabold">{card.plan ?? t("studio.notChosen")}</span>
        </div>
      </div>
    </>
  );
}
