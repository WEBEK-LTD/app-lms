import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/ui";
import { requireClient } from "@/lib/auth/session";
import { dashboardText } from "@/lib/dashboard-lang";
import { richText } from "@/i18n/rich";
import { appLanguageName } from "@/lib/i18n/language-names";
import { currentPlanId } from "@/lib/billing/plan-change";
import { getStore } from "@/lib/data";
import { effectivePlans } from "@/lib/entitlements";
import { isBuiltInLanguage, isRtl, localeInfo } from "@/lib/i18n/locales";
import { contentRows, interfaceRows, progress } from "@/lib/i18n/translations";
import { hasUnpublishedChanges, loadLayout } from "@/lib/pages/layout";
import { draftPreviewSupported } from "@/lib/preview/config";
import { lowestPlanWith } from "@/lib/plans";
import { LanguagesEditor } from "./editor";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await dashboardText()).t("languages.title") };
}
export const dynamic = "force-dynamic";

/**
 * 43 Languages and translations: the app's languages (any of the languages
 * the app's system screens come in), and every text the app shows in each:
 * the owner's pages, tabs and blocks, and the app's own interface. Yallapp
 * ships English, Arabic and Turkish; the owner translates the others, and
 * may change any of Yallapp's. Saved to the Pages & look draft and
 * published with it.
 */
export default async function LanguagesPage({ searchParams }: PageProps<"/dashboard/languages">) {
  const { app, license } = await requireClient();
  const { t, lang: dashLang } = await dashboardText();
  const languageName = (code: string) => appLanguageName(code, dashLang);
  if (!app) {
    return (
      <div className="flex max-w-[620px] flex-col gap-3">
        <h1 className="m-0 text-[26px] leading-tight font-extrabold tracking-[-0.5px] break-words sm:text-[30px]">{t("languages.title")}</h1>
        <p className="m-0 text-[15px] leading-relaxed text-ink-4">
          {richText(t("languages.chooseTypeFirst"), { link: (chunk) => <Link href="/dashboard/app-type">{chunk}</Link> })}
        </p>
      </div>
    );
  }
  const store = await getStore();
  const now = new Date();
  const record = await loadLayout(store, app, now);
  const draft = record.draft;
  const plans = await effectivePlans(store);
  const planId = license ? currentPlanId(license, now) : null;
  const plan = planId ? plans[planId] : null;
  const languages = draft.languages;
  const params = await searchParams;
  const asked = typeof params.lang === "string" ? params.lang : null;
  // The first language to translate: the one asked for, else the first besides the default.
  const lang = asked && languages.available.includes(asked) ? asked : (languages.available.find((l) => l !== languages.default) ?? languages.default);
  const rows = [...contentRows(draft, lang), ...interfaceRows(draft, lang)];
  const summaries = languages.available.map((code) => {
    const p = progress([...contentRows(draft, code), ...interfaceRows(draft, code)]);
    return { code, name: languageName(code), nativeName: localeInfo(code)?.nativeName ?? code, done: p.done, total: p.total };
  });
  const hosted = draftPreviewSupported(app);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t("languages.title")}
        description={t("languages.intro")}
      />
      <LanguagesEditor
        languages={{ default: languages.default, available: languages.available }}
        lang={{ code: lang, name: languageName(lang), rtl: isRtl(lang), builtIn: isBuiltInLanguage(lang), isDefault: lang === languages.default }}
        defaultName={languageName(languages.default)}
        rows={rows}
        summaries={summaries}
        published={record.published?.version ?? null}
        changes={hasUnpublishedChanges(record)}
        savedAt={record.draftUpdatedAt.toISOString()}
        previewHref={`/dashboard/preview?${hosted ? "pages=draft&" : ""}lang=${encodeURIComponent(lang)}`}
        previewDraft={hosted}
        plan={{
          name: plan?.name ?? "",
          languages: plan?.limits.languages ?? null,
          upgrade: plan ? lowestPlanWith(plans, (p) => p.limits.languages === null || p.limits.languages > (plan.limits.languages ?? 0), planId) : null,
        }}
      />
    </div>
  );
}
