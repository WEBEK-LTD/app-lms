import type { Metadata } from "next";
import Link from "next/link";
import { Notice, PageHeader, btn } from "@/components/ui";
import { KINDS } from "@/lib/app/kinds";
import { MAX_APPS_PER_CLIENT } from "@/lib/app/label";
import { requireClient } from "@/lib/auth/session";
import { asksForWebsite } from "@/lib/bot/answers";
import { isStudioKind } from "@/lib/bot/create";
import { featureStatus, featuresFor } from "@/lib/bot/features";
import { COLOURS, FEATURES, type BotColour, type BotFeature } from "@/lib/bot/intents";
import { getStore } from "@/lib/data";
import { dashboardText } from "@/lib/dashboard-lang";
import type { DashKey } from "@/i18n/dashboard";
import { appPlan, effectivePlans } from "@/lib/entitlements";
import { appLanguageName } from "@/lib/i18n/language-names";
import { LOCALES } from "@/lib/i18n/locales";
import { plansIn } from "@/lib/marketing-lang";
import { planFitsSection, type PlanFamily } from "@/lib/plans";
import { appTypeOn, getSwitches } from "@/lib/switches";
import { Builder, type BuilderKind } from "./builder";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await dashboardText()).t("bot.title") };
}
export const dynamic = "force-dynamic";

const FEATURE_KEY: Record<BotFeature, DashKey> = {
  chat: "bot.fChat",
  loyalty: "bot.fLoyalty",
  ratings: "bot.fRatings",
  notifications: "bot.fNotifications",
  payments: "bot.fPayments",
  ios: "bot.fIos",
};

const colourKey = (c: BotColour) => `bot.c${c[0]!.toUpperCase()}${c.slice(1)}` as DashKey;

/**
 * The app-builder bot: a few questions, answered with buttons or in the
 * owner's words (lib/bot), and a new app made like the chosen kind's demo,
 * opened in its editor. The kinds and features it offers follow the same
 * switches and plans as the app type step and Studio.
 */
export default async function BuilderPage() {
  const context = await requireClient("apps");
  const { t, k, lang } = await dashboardText();
  if (context.apps.length >= MAX_APPS_PER_CLIENT) {
    return (
      <div className="flex max-w-[620px] flex-col gap-4">
        <PageHeader title={t("bot.title")} />
        <Notice tone="warn" icon="warning" role="alert">
          {t("setup.maxApps", { max: MAX_APPS_PER_CLIENT })}
        </Notice>
        <Link href="/dashboard" className={`${btn.secondary} h-12 self-start`}>
          {t("common.cancel")}
        </Link>
      </div>
    );
  }
  const store = await getStore();
  const now = new Date();
  // The account's first app may have its plan already; an added app has none until it's paid.
  const license = context.apps.length ? null : context.license;
  const switches = await getSwitches(store);
  const plans = plansIn(lang, await effectivePlans(store));
  const plan = await appPlan(store, license, now);
  const planFor = (family: PlanFamily) => (plan && planFitsSection(plan.id, family) ? plans[plan.id] : null);
  const statusText = (feature: BotFeature, family: PlanFamily): string => {
    const status = featureStatus(feature, planFor(family), plans, family);
    if (status.status === "in_plan") return t("bot.inPlan");
    return status.plan ? t("bot.comesWith", { plan: plans[status.plan].name }) : t("bot.afterPlan");
  };
  const kinds: BuilderKind[] = KINDS.filter((kind) => appTypeOn(switches, kind.engine, license?.plan ?? null)).map((kind) => ({
    id: kind.id,
    intent: `kind.${kind.id}`,
    name: k(kind.name),
    icon: kind.icon,
    studio: isStudioKind(kind),
    website: asksForWebsite(kind),
    features: featuresFor(kind),
    university: false,
  }));
  const school = kinds.find((kind) => kind.id === "school");
  if (school) kinds.push({ ...school, intent: "kind.university", name: t("bot.university"), icon: "apartment", university: true });
  const languageNames = Object.fromEntries(LOCALES.map((l) => [l.code, appLanguageName(l.code, lang)]));
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t("bot.title")} description={t("bot.intro")} />
      <Builder
        kinds={kinds}
        colours={(Object.keys(COLOURS) as BotColour[]).map((c) => ({ id: c, intent: `color.${c}`, hex: COLOURS[c], name: t(colourKey(c)) }))}
        languages={{ names: languageNames, offered: [...new Set([lang, "en", "ar", "tr"])] }}
        features={FEATURES.map((f) => ({ id: f, intent: `feature.${f}`, name: t(FEATURE_KEY[f]), regular: statusText(f, "regular"), studio: statusText(f, "studio") }))}
      />
    </div>
  );
}
