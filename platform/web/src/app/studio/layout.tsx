import type { Metadata } from "next";
import { Cairo } from "next/font/google";
import { DashboardI18n, DocumentLang } from "@/components/dashboard-i18n";
import { dashboardMessages, knownEnglish } from "@/i18n/dashboard";
import { dashboardText } from "@/lib/dashboard-lang";

/** 103R The approved design's font, for the editor around the phone. */
const cairo = Cairo({ subsets: ["arabic", "latin"], weight: ["400", "500", "600", "700", "800"], variable: "--font-studio", display: "swap" });

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
      <div className={cairo.variable} style={{ ["--studio-line" as string]: "#DDD8CC", ["--studio-ink" as string]: "#0E0D24", ["--studio-muted" as string]: "#5E5B70" }}>
        {children}
      </div>
    </DashboardI18n>
  );
}
