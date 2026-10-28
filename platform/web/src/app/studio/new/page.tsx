import type { Metadata } from "next";
import type { DashKey } from "@/i18n/dashboard";
import { KINDS, kindById } from "@/lib/app/kinds";
import { requireClient } from "@/lib/auth/session";
import { dashboardText } from "@/lib/dashboard-lang";
import { getStore } from "@/lib/data";
import { platformDefinitions } from "@/lib/hosted/connectors/registry";
import { STUDIO_ONLY_KINDS, studioSourcesFor } from "@/lib/studio/section";
import { appTypeOn, getSwitches } from "@/lib/switches";
import { StudioScreen } from "../chrome";
import { NewProjectForm, type KindChoice } from "./form";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await dashboardText();
  return { title: t("studio.newProject") };
}
export const dynamic = "force-dynamic";

const ERRORS: Record<string, DashKey> = {
  kind: "studio.errKind",
  limit: "studio.errLimit",
  unavailable: "studio.errUnavailable",
};

/** 103R.3 A new Studio project in three steps: what it is, where its content comes from, and how its home starts. */
export default async function NewStudioProjectPage({ searchParams }: PageProps<"/studio/new">) {
  await requireClient("apps");
  const { t, k, lang, dir } = await dashboardText();
  const switches = await getSwitches(await getStore());
  const query = await searchParams;
  const platforms = platformDefinitions();
  const choiceOf = (kind: (typeof KINDS)[number]): KindChoice => ({
    id: kind.id,
    name: k(kind.name),
    icon: kind.icon,
    sources: studioSourcesFor(kind).map((source) => ({
      value: source,
      label:
        source === "platform"
          ? platforms
              .filter((p) => p.appType === kind.engine)
              .map((p) => p.name)
              .join(" · ")
          : t(({ catalog: "studio.srcCatalog", wordpress: "studio.srcWordpress", shopify: "studio.srcShopify", custom_api: "studio.srcApi" } as const)[source]),
      short: source === "catalog" ? t("studio.srcCatalogShort") : null,
    })),
  });
  const offered = KINDS.filter((kind) => appTypeOn(switches, kind.engine, null));
  // 104 Kinds only Studio offers; the ones still being made show as soon.
  const delivery = kindById("delivery");
  const food = kindById("food");
  const studioKinds = [
    delivery && offered.includes(delivery)
      ? { ...choiceOf(delivery), name: t("studio.kindDelivery"), text: t("studio.kindDeliveryText"), soon: false }
      : { id: "delivery", name: t("studio.kindDelivery"), icon: "local_shipping", sources: [], text: t("studio.soon"), soon: true },
    food && offered.includes(food)
      ? { ...choiceOf(food), name: t("studio.kindFood"), icon: "delivery_dining", text: t("studio.kindFoodText"), soon: false }
      : { id: "food", name: t("studio.kindFood"), icon: "delivery_dining", sources: [], text: t("studio.soon"), soon: true },
    { id: "cars", name: t("studio.kindCars"), icon: "directions_car", sources: [], text: t("studio.soon"), soon: true },
  ];
  const problem = typeof query.error === "string" ? query.error : null;
  const error = problem === "name" ? k("Give the project a name of up to 30 characters.") : problem && ERRORS[problem] ? t(ERRORS[problem]) : null;
  return (
    <StudioScreen dir={dir} lang={lang}>
      <NewProjectForm
        studioKinds={studioKinds}
        kinds={offered.filter((kind) => !STUDIO_ONLY_KINDS.has(kind.id)).map(choiceOf)}
        error={error}
      />
    </StudioScreen>
  );
}
