import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { MarketHeader } from "@/components/studio-market/header";
import { countryOptions } from "@/lib/account/country";
import { assetUrl } from "@/lib/assets";
import { requireClient } from "@/lib/auth/session";
import { getStore } from "@/lib/data";
import { dashboardText } from "@/lib/dashboard-lang";
import { designerChip, marketCatalog } from "@/lib/studio-market/catalog";
import { designerPath, DESIGNER_LINKS_MAX } from "@/lib/studio-market/designer-page";
import { localePath } from "@/i18n/paths";
import { ProfileForm } from "./form";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await dashboardText()).t("marketPage.title") };
}
export const dynamic = "force-dynamic";

/**
 * 106.14 Designer area › Your page: what buyers see at
 * yallapp.com.tr/designers/<handle>: the photo (looked at by the team the
 * first time, with the line about them), the name, the address, the line,
 * the country and links and whether they show, and "See my page" (once a
 * template of theirs is published and the page isn't locked).
 */
export default async function DesignerProfilePage() {
  const context = await requireClient("billing");
  const { t, lang } = await dashboardText();
  const store = await getStore();
  const designer = await store.getTemplateDesignerByClient(context.client.id);
  if (!designer) redirect("/designer/join");
  const published = (await marketCatalog(store, lang, new Date())).cards.some((c) => c.designer.id === designer.id);
  const links = [...designer.links, ...Array.from({ length: DESIGNER_LINKS_MAX }, () => "")].slice(0, DESIGNER_LINKS_MAX);
  return (
    <>
      <MarketHeader eyebrow={t("studioMarket.designerArea")} title={t("marketPage.title")} lead={t("marketPage.intro")} />
      <ProfileForm
        profile={{
          name: designer.name,
          slug: designer.slug,
          country: designer.country,
          bio: designer.bio ?? "",
          showCountry: designer.showCountry,
          showLinks: designer.showLinks,
          links,
          photoUrl: designer.photoAssetId ? assetUrl(designer.photoAssetId) : null,
          review: designer.profileReview,
          note: designer.profileNote,
          locked: designer.pageLockedAt ? (designer.pageLockedReason ?? "") : null,
        }}
        chip={designerChip(designer)}
        countries={countryOptions(lang)}
        host="yallapp.com.tr"
        pageHref={published && !designer.pageLockedAt ? localePath(lang, designerPath(designer.slug)) : null}
      />
    </>
  );
}
