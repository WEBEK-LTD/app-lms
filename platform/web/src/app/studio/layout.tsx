import type { Metadata } from "next";
import localFont from "next/font/local";
import { DashboardI18n, DocumentLang } from "@/components/dashboard-i18n";
import { dashboardMessages, knownEnglish } from "@/i18n/dashboard";
import { dashboardText } from "@/lib/dashboard-lang";

/**
 * 103R The approved design's font, for the editor around the phone: Cairo
 * (variable, 400 to 800 in use), the files Google Fonts serves for its Latin
 * and Arabic subsets, kept in the repository (app/fonts/cairo). Latin first,
 * then Arabic with the size-matched fallback, as one stack in --font-studio.
 */
const cairoLatin = localFont({
  src: "../fonts/cairo/cairo-latin.woff2",
  weight: "400 800",
  display: "swap",
  adjustFontFallback: false,
  declarations: [{ prop: "unicode-range", value: "U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD" }],
});
const cairoArabic = localFont({
  src: "../fonts/cairo/cairo-arabic.woff2",
  weight: "400 800",
  display: "swap",
  declarations: [{ prop: "unicode-range", value: "U+0600-06FF, U+0750-077F, U+0870-0891, U+0897-08E1, U+08E3-08FF, U+200C-200E, U+2010-2011, U+204F, U+2E41, U+FB50-FDFF, U+FE70-FE74, U+FE76-FEFC, U+102E0-102FB, U+10E60-10E7E, U+10EC2-10EC7, U+10EC9-10EEE, U+10EF0-10EFF, U+1EE00-1EE03, U+1EE05-1EE1F, U+1EE21-1EE22, U+1EE24, U+1EE27, U+1EE29-1EE32, U+1EE34-1EE37, U+1EE39, U+1EE3B, U+1EE42, U+1EE47, U+1EE49, U+1EE4B, U+1EE4D-1EE4F, U+1EE51-1EE52, U+1EE54, U+1EE57, U+1EE59, U+1EE5B, U+1EE5D, U+1EE5F, U+1EE61-1EE62, U+1EE64, U+1EE67-1EE6A, U+1EE6C-1EE72, U+1EE74-1EE77, U+1EE79-1EE7C, U+1EE7E, U+1EE80-1EE89, U+1EE8B-1EE9B, U+1EEA1-1EEA3, U+1EEA5-1EEA9, U+1EEAB-1EEBB, U+1EEF0-1EEF1" }],
});
const studioFont = `${cairoLatin.style.fontFamily}, ${cairoArabic.style.fontFamily}`;

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await dashboardText();
  return { title: { default: t("studio.title"), template: "%s · Yallapp Studio" }, robots: { index: false } };
}

/**
 * 103R Yallapp Studio: its own section of the account, apart from the
 * dashboard (its own screens, without the dashboard's side menu), in the
 * dashboard's language.
 */
export default async function StudioLayout({ children }: { children: React.ReactNode }) {
  const { lang } = await dashboardText();
  return (
    <DashboardI18n lang={lang} messages={dashboardMessages(lang)} knownEnglish={lang === "en" ? {} : knownEnglish()}>
      <DocumentLang lang={lang} />
      <div style={{ ["--font-studio" as string]: studioFont, ["--studio-line" as string]: "#DDD8CC", ["--studio-ink" as string]: "#0E0D24", ["--studio-muted" as string]: "#5E5B70" }}>
        {children}
      </div>
    </DashboardI18n>
  );
}
