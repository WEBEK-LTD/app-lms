import type { Metadata } from "next";
import Link from "next/link";
import { openRegularAppsAction } from "@/app/actions/studio-projects";
import { localePath } from "@/i18n/paths";
import { requireClient } from "@/lib/auth/session";
import { dashboardText } from "@/lib/dashboard-lang";
import { getStore } from "@/lib/data";
import { effectivePlans } from "@/lib/entitlements";
import { studioProjectCard } from "@/lib/studio/projects";
import { isStudioProject } from "@/lib/studio/section";
import { ago, C, Glyph, StudioBar, StudioScreen } from "./chrome";
import { ProjectsGrid, type ProjectCardView } from "./projects-grid";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await dashboardText();
  return { title: t("studio.homeTitle") };
}
export const dynamic = "force-dynamic";

/** 103R.3 Yallapp Studio's home: the account's Studio projects, apart from its regular apps. */
export default async function StudioHomePage() {
  const context = await requireClient();
  const { t, k, lang, dir } = await dashboardText();
  const store = await getStore();
  const now = new Date();
  const plans = await effectivePlans(store);
  const me = context.member ?? context.user;
  const projects = context.apps.filter(isStudioProject);
  const sourceWord = (card: Awaited<ReturnType<typeof studioProjectCard>>) =>
    card.source.key === "platform"
      ? card.source.name
      : t(({ catalog: "studio.srcCatalogShort", wordpress: "studio.srcWordpress", shopify: "studio.srcShopify", custom_api: "studio.srcApi", none: "studio.srcNone" } as const)[card.source.key]);
  const cards: ProjectCardView[] = await Promise.all(
    projects.map(async (app) => {
      const card = await studioProjectCard(store, app, context.licenses.find((l) => l.appId === app.id) ?? null, plans, now);
      return {
        id: card.id,
        name: card.name ?? t("studio.untitledProject"),
        icon: card.icon,
        meta: [k(card.kindName), sourceWord(card), card.plan ? t("studio.planNamed", { plan: card.plan }) : t("studio.noPlanYet")].join(" · "),
        published: card.published,
        edited: t("studio.editedAt", { time: ago(card.editedAt, now, lang) }),
        home: card.home,
      };
    }),
  );
  const current = context.app && isStudioProject(context.app) ? context.app : null;
  const words = { price: t("studio.price"), addPicture: t("studio.addPicture"), addVideo: t("studio.addVideo"), send: t("studio.send"), search: t("studio.search") };
  return (
    <StudioScreen dir={dir} lang={lang}>
      <StudioBar>
        <nav aria-label={t("studio.section")} className="flex items-center gap-1 rounded-[10px] p-1" style={{ background: C.barSoft }}>
          <form action={openRegularAppsAction}>
            <button type="submit" className="flex h-8 cursor-pointer items-center gap-1.5 rounded-lg border-0 bg-transparent px-3 text-[13px]" style={{ color: C.barMuted, fontFamily: "inherit" }}>
              <Glyph name="apps" size={18} />
              {t("studio.regularApps")}
            </button>
          </form>
          <Link href="/studio" aria-current="page" className="flex h-8 items-center gap-1.5 rounded-lg px-3 text-[13px] font-bold no-underline" style={{ background: C.ivory, color: C.ink }}>
            <Glyph name="draw" size={18} />
            {t("studio.studioSection")}
          </Link>
        </nav>
        <div className="flex-[1_1_20px]" />
        <a href={localePath(lang, "/docs")} className="flex items-center gap-1.5 text-sm no-underline" style={{ color: C.ivory }}>
          <Glyph name="help" size={18} />
          {t("studio.help")}
        </a>
        <div className="flex items-center gap-2 text-sm">
          <span className="flex h-8 w-8 items-center justify-center rounded-full font-bold" style={{ background: C.barLine }} aria-hidden="true">
            {(me.name.trim()[0] ?? "?").toUpperCase()}
          </span>
          {me.name}
        </div>
      </StudioBar>

      <main id="main" className="mx-auto box-border flex w-full max-w-[1200px] flex-1 flex-col gap-6 px-6 pt-8 pb-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex flex-col gap-1.5">
            <h1 className="m-0 text-[30px] font-extrabold">{t("studio.homeTitle")}</h1>
            <p className="m-0 text-[15px]" style={{ color: C.muted }}>
              {t("studio.homeIntro")}
            </p>
          </div>
          <Link href="/studio/new" className="flex h-11 items-center gap-2 rounded-xl px-5 text-[15px] font-extrabold no-underline" style={{ background: C.accent, color: C.ink }}>
            <Glyph name="add" />
            {t("studio.newProject")}
          </Link>
        </div>

        <ProjectsGrid cards={cards} words={words} />

        <section aria-labelledby="h-studio-plans" className="flex flex-wrap items-center gap-4 rounded-[18px] px-6 py-5" style={{ background: C.ink, color: C.ivory }}>
          <Glyph name="workspace_premium" size={32} className="text-[#FF5A1F]" />
          <div className="flex flex-[1_1_320px] flex-col gap-1">
            <h2 id="h-studio-plans" className="m-0 text-[17px] font-extrabold">
              {t("studio.plansTitle")}
            </h2>
            <p className="m-0 text-sm" style={{ color: "#C9C6DD" }}>
              {t("studio.plansText")}
            </p>
          </div>
          <Link
            href={current ? "/studio/project/license" : "/studio/new"}
            className="flex h-10 items-center gap-1.5 rounded-[10px] px-4 text-sm font-bold no-underline"
            style={{ border: `1px solid ${C.barLine}`, color: C.ivory }}
          >
            {t("studio.seePlans")}
            <Glyph name="arrow_forward" size={18} flip />
          </Link>
        </section>
      </main>
    </StudioScreen>
  );
}
