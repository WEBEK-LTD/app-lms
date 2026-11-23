import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { BUSINESS_APP_LINKS, BUSINESS_APP_PLAY_URL, BUSINESS_APP_STORE_URL } from "@/lib/business-app";
import { BusinessAppButtons } from "@/components/business-app";
import { ICON_NAMES } from "@/components/icon-names";
import { BusinessAppSection } from "@/site/business-app";
import { LANGS, messagesFor } from "@/i18n";
import { dashboardTextFor } from "@/lib/dashboard-words";

const read = (file: string) => readFileSync(new URL(`../../${file}`, import.meta.url), "utf8");

describe("203 Yallapp Business on the App Store and Google Play", () => {
  it("links to the two stores, without a country or tracking", () => {
    expect(BUSINESS_APP_STORE_URL).toBe("https://apps.apple.com/app/yallapp-business/id6827042925");
    expect(BUSINESS_APP_PLAY_URL).toBe("https://play.google.com/store/apps/details?id=tr.com.yallapp.business");
    expect(BUSINESS_APP_LINKS.map((link) => link.url)).toEqual([BUSINESS_APP_STORE_URL, BUSINESS_APP_PLAY_URL]);
    for (const link of BUSINESS_APP_LINKS) expect(ICON_NAMES as readonly string[]).toContain(link.icon);
  });

  it("renders both buttons, opening in a new tab", () => {
    const html = renderToStaticMarkup(createElement(BusinessAppButtons, { labels: messagesFor("en").businessApp, label: "Get Yallapp Business" }));
    expect(html).toContain(`href="${BUSINESS_APP_STORE_URL}"`);
    expect(html).toContain(`href="${BUSINESS_APP_PLAY_URL}"`);
    expect(html.match(/target="_blank" rel="noopener"/g)).toHaveLength(2);
    expect(html).toContain("Download on the");
    expect(html).toContain("Get it on");
    expect(html).toContain("(opens in a new tab)");
  });

  it("has the home page's section in every language, with the links", () => {
    for (const lang of LANGS) {
      const html = renderToStaticMarkup(createElement(BusinessAppSection, { lang }));
      expect(html, lang).toContain('id="business-app-title"');
      expect(html, lang).toContain(messagesFor(lang).businessApp.title);
      expect(html, lang).toContain(`href="${BUSINESS_APP_STORE_URL}"`);
      expect(html, lang).toContain(`href="${BUSINESS_APP_PLAY_URL}"`);
    }
    expect(read("src/site/home.tsx")).toContain("<BusinessAppSection lang={lang} />");
  });

  it("puts the links in the footer, the docs article, Your phones and Studio's account menu, from the one module", () => {
    expect(read("src/components/site-chrome.tsx")).toContain('<BusinessAppButtons labels={b} label={b.storesLabel} tone="night"');
    expect(read("src/site/docs.tsx")).toContain('article.slug === "yallapp-business" ? <BusinessAppDownload');
    expect(read("src/app/dashboard/phones/page.tsx")).toContain("<BusinessAppButtons labels={storeLabels}");
    expect(read("src/app/studio/account-menu.tsx")).toContain("BUSINESS_APP_LINKS.map");
    for (const file of ["src/components/site-chrome.tsx", "src/site/business-app.tsx", "src/app/dashboard/phones/page.tsx", "src/app/studio/account-menu.tsx", "src/site/docs.tsx"]) {
      expect(read(file), file).not.toContain("apps.apple.com");
      expect(read(file), file).not.toContain("play.google.com");
    }
  });

  it("words the dashboard's links in each language", () => {
    expect(dashboardTextFor("en").t("owner.getApp")).toBe("Get Yallapp Business");
    expect(dashboardTextFor("ar").t("owner.getApp")).toBe("نزّل Yallapp Business");
    expect(dashboardTextFor("tr").t("owner.getApp")).toBe("Yallapp Business'ı indirin");
  });
});
