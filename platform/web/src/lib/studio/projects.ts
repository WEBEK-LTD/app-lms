import { assetUrl } from "../assets";
import { kindOf } from "../app/kinds";
import { currentPlanId } from "../billing/plan-change";
import type { DataStore } from "../data/store";
import type { App, License } from "../data/types";
import { platformDefinition } from "../hosted/connectors/registry";
import { loadLayout } from "../pages/layout";
import type { LanguageCode, StudioPage } from "../pages/types";
import type { PlanInfo } from "../plans";
import type { IconName } from "@/components/icon-names";
import type { StudioLook } from "@/components/studio/view";

/**
 * 103R.3 The account's Studio projects as Studio's home and a project's
 * dashboard show them: their kind, where their content comes from, their
 * plan, whether they are published, and their home page as drawn in Studio.
 */

export type ProjectSource = { key: "catalog" | "wordpress" | "shopify" | "custom_api" | "none" } | { key: "platform"; name: string };

export interface StudioProjectCard {
  id: string;
  name: string | null;
  kindName: string;
  icon: IconName;
  source: ProjectSource;
  /** The plan's name, or null before a plan. */
  plan: string | null;
  published: boolean;
  editedAt: string;
  /** The home page (the first tab's page) as designed in Studio, with how the app looks. */
  home: { page: StudioPage; look: StudioLook; lang: LanguageCode } | null;
  /** Pages in the draft and its languages. */
  pages: number;
  languages: number;
}

/** Where a project's content comes from; "none" before its website or API is connected. */
export function projectSource(app: Pick<App, "backend" | "connector"> & { websiteDoneAt?: Date | null }): ProjectSource {
  if (app.backend !== "hosted" && app.websiteDoneAt === null) return { key: "none" };
  if (app.backend === "custom_api") return { key: "custom_api" };
  if (app.backend !== "hosted") return { key: "wordpress" };
  if (app.connector?.kind === "shopify") return { key: "shopify" };
  if (app.connector?.kind === "platform") return { key: "platform", name: platformDefinition(app.connector.platform)?.name ?? app.connector.platform };
  return { key: "catalog" };
}

export async function studioProjectCard(store: DataStore, app: App, license: License | null, plans: Record<string, PlanInfo>, now: Date): Promise<StudioProjectCard> {
  const record = await loadLayout(store, app, now);
  const draft = record.draft;
  const homeSlug = draft.tabs.map((t) => (t.target.type === "page" ? t.target.page_slug : null)).find(Boolean) ?? "home";
  const homePage = draft.pages.find((p) => p.slug === homeSlug && p.studio) ?? draft.pages.find((p) => p.studio) ?? null;
  const planId = license ? currentPlanId(license, now) : null;
  const kind = kindOf(app);
  return {
    id: app.id,
    name: app.appName,
    kindName: kind.name,
    icon: kind.icon,
    source: projectSource(app),
    plan: planId ? (plans[planId]?.name ?? null) : null,
    published: Boolean(record.published),
    editedAt: record.draftUpdatedAt.toISOString(),
    home: homePage?.studio
      ? {
          page: homePage.studio,
          lang: draft.languages.default,
          look: {
            name: app.appName ?? "",
            logoUrl: app.logoAssetId ? assetUrl(app.logoAssetId) : null,
            brand: app.primaryColor,
            font: draft.appearance.font_family ?? draft.appearance.font ?? "Cairo",
            tabs: draft.tabs,
            activeTab: draft.tabs.find((t) => t.target.type === "page" && t.target.page_slug === homePage.slug)?.id ?? null,
          },
        }
      : null,
    pages: draft.pages.length,
    languages: draft.languages.available.length,
  };
}
