import type { Metadata } from "next";
import type { DashKey } from "@/i18n/dashboard";
import { dashboardText } from "@/lib/dashboard-lang";
import { DEMO_BRANDS } from "@/lib/demo/content";
import { demoFacts, demoOfSlug, pickerPath, productOf, slugOf } from "@/lib/demo/picker";
import { DEMO_NAME_MAX } from "@/lib/demo/start";
import { swatchesFor } from "@/lib/brand-colour";
import { appLanguageName } from "@/lib/i18n/language-names";
import { pickerContext } from "../../context";
import { BackLink, demoScreens, PickerShell } from "../../parts";
import { MakeForm } from "./form";

export async function generateMetadata({ params }: PageProps<"/start/[demo]/make">): Promise<Metadata> {
  const demo = demoOfSlug((await params).demo);
  const { t } = await dashboardText();
  return { title: demo ? `${t("start.makeTitle")} · ${DEMO_BRANDS[demo].appName}` : t("start.makeTitle"), robots: { index: false } };
}
export const dynamic = "force-dynamic";

const ERRORS = ["name", "limit", "unavailable", "failed", "logo"] as const;

/**
 * 127 Step 3, make it yours: the app's name, the logo (the icon is made
 * from it, or from the name without one), the colour taken from the logo
 * with five swatches and more, a live preview phone and what comes with the
 * app, counted from the demo. "Create my app" makes it (app/actions/start.ts).
 */
export default async function MakePage({ params, searchParams }: PageProps<"/start/[demo]/make">) {
  const { demo, adding } = await pickerContext((await params).demo);
  const text = await dashboardText();
  const { t, lang } = text;
  const query = await searchParams;
  const brand = DEMO_BRANDS[demo];
  const facts = demoFacts(demo);
  const product = productOf(demo);
  const error = ERRORS.find((e) => e === query.error) ?? null;
  const list = new Intl.ListFormat(lang === "ar" ? "ar" : lang, { style: "long", type: "conjunction" });
  const swatches = swatchesFor(brand.primaryColor);
  const colourNames: Record<string, string> = {
    "#1F5C4A": t("start.colours.forest"),
    "#FF5A1F": t("start.colours.ember"),
    "#34336B": t("start.colours.midnight"),
    "#B4235A": t("start.colours.rose"),
    "#B8913A": t("start.colours.gold"),
  };
  return (
    <PickerShell step={3} back={<BackLink href={pickerPath({ demo, adding })} label={brand.appName} />}>
      <MakeForm
        demo={{ slug: slugOf(demo), name: brand.appName, colour: brand.primaryColor, product }}
        screen={demoScreens(text, demo)[0]!.src}
        swatches={swatches.map((hex, i) => ({ hex, name: i === 0 ? t("start.colours.demo") : (colourNames[hex] ?? hex) }))}
        maxName={DEMO_NAME_MAX}
        error={error ? t(`start.errors.${error}` as DashKey) : null}
        comes={[
          t("start.comesPages", { count: facts.pages }),
          t(`start.items.${facts.items.noun}.count` as DashKey, { count: facts.items.count }),
          t("start.comesPhotos"),
          t("start.comesSignIn"),
          list.format(facts.languages.map((code) => appLanguageName(code, lang))),
          t("start.comesDark"),
        ]}
      />
    </PickerShell>
  );
}
