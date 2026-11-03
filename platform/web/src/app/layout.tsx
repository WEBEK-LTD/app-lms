import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { HtmlShell } from "@/components/html-shell";
import { ThemeScript } from "@/components/theme-script";
import { KeepCampaign } from "@/components/campaign";
import { DEFAULT_DESCRIPTION, DEFAULT_TITLE, SITE_ICONS, SITE_NAME, siteUrl } from "@/lib/seo";
import "./globals.css";

/**
 * The site's fonts are files in the repository (fonts/, each with its OFL
 * licence), so builds never download them from Google Fonts. They are the
 * files Google Fonts serves for the subsets in use, with the same Unicode
 * ranges, so a page loads only the subsets its text needs.
 *
 * Bricolage Grotesque (variable, 200 to 800): its Latin and Latin Extended
 * subsets are two faces; the CSS stack (globals.css, --font-sans) names the
 * Latin one, then the extended one with the size-matched fallback.
 */
const bricolage = localFont({
  src: "./fonts/bricolage-grotesque/bricolage-grotesque-latin.woff2",
  weight: "200 800",
  variable: "--font-bricolage",
  display: "swap",
  adjustFontFallback: false,
  declarations: [{ prop: "unicode-range", value: "U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD" }],
});
const bricolageExt = localFont({
  src: "./fonts/bricolage-grotesque/bricolage-grotesque-latin-ext.woff2",
  weight: "200 800",
  variable: "--font-bricolage-ext",
  display: "swap",
  declarations: [{ prop: "unicode-range", value: "U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+0304, U+0308, U+0329, U+1D00-1DBF, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C4, U+2113, U+2C60-2C7F, U+A720-A7FF" }],
});

/**
 * 55 Arabic text: Bricolage Grotesque has no Arabic letters. Only the Arabic
 * subset is loaded (the browser fetches it only for Arabic text), without a
 * fallback face, so Latin text stays in Bricolage (globals.css, `:lang(ar)`).
 */
const plexArabic = localFont({
  src: [
    { path: "./fonts/ibm-plex-sans-arabic/ibm-plex-sans-arabic-arabic-400.woff2", weight: "400" },
    { path: "./fonts/ibm-plex-sans-arabic/ibm-plex-sans-arabic-arabic-500.woff2", weight: "500" },
    { path: "./fonts/ibm-plex-sans-arabic/ibm-plex-sans-arabic-arabic-600.woff2", weight: "600" },
    { path: "./fonts/ibm-plex-sans-arabic/ibm-plex-sans-arabic-arabic-700.woff2", weight: "700" },
  ],
  variable: "--font-arabic",
  display: "swap",
  preload: false,
  adjustFontFallback: false,
  declarations: [{ prop: "unicode-range", value: "U+0600-06FF, U+0750-077F, U+0870-0891, U+0897-08E1, U+08E3-08FF, U+200C-200E, U+2010-2011, U+204F, U+2E41, U+FB50-FDFF, U+FE70-FE74, U+FE76-FEFC, U+102E0-102FB, U+10E60-10E7E, U+10EC2-10EC7, U+10EC9-10EEE, U+10EF0-10EFF, U+1EE00-1EE03, U+1EE05-1EE1F, U+1EE21-1EE22, U+1EE24, U+1EE27, U+1EE29-1EE32, U+1EE34-1EE37, U+1EE39, U+1EE3B, U+1EE42, U+1EE47, U+1EE49, U+1EE4B, U+1EE4D-1EE4F, U+1EE51-1EE52, U+1EE54, U+1EE57, U+1EE59, U+1EE5B, U+1EE5D, U+1EE5F, U+1EE61-1EE62, U+1EE64, U+1EE67-1EE6A, U+1EE6C-1EE72, U+1EE74-1EE77, U+1EE79-1EE7C, U+1EE7E, U+1EE80-1EE89, U+1EE8B-1EE9B, U+1EEA1-1EEA3, U+1EEA5-1EEA9, U+1EEAB-1EEBB, U+1EEF0-1EEF1" }],
});

const icons = localFont({
  src: "./fonts/material-symbols-rounded.woff2",
  variable: "--font-icons",
  display: "block",
  weight: "400",
  adjustFontFallback: false,
  preload: true,
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: {
    default: DEFAULT_TITLE,
    template: "%s · Yallapp",
  },
  description: DEFAULT_DESCRIPTION,
  applicationName: SITE_NAME,
  // 32 Link previews everywhere; public pages add their own title, address and canonical (lib/seo.ts).
  openGraph: { type: "website", siteName: SITE_NAME, locale: "en_US", title: DEFAULT_TITLE, description: DEFAULT_DESCRIPTION },
  twitter: { card: "summary_large_image", title: DEFAULT_TITLE, description: DEFAULT_DESCRIPTION },
  // 67 PNG favicons of 48, 96 and 192 px for Google Search, /favicon.ico, the SVG and the Apple touch icon.
  icons: SITE_ICONS,
  manifest: "/site.webmanifest",
};

export const viewport: Viewport = {
  themeColor: "#0E0D24",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <HtmlShell className={`${bricolage.variable} ${bricolageExt.variable} ${plexArabic.variable} ${icons.variable}`}>
      {/* 73 The light or dark choice this browser made, before the page paints. */}
      <head>
        <ThemeScript />
      </head>
      <body className="min-h-screen bg-ivory font-sans text-midnight antialiased">
        {/* 78 Where a visitor came from, for the sign-up (kept in the page's memory only). */}
        <KeepCampaign />
        {children}
      </body>
    </HtmlShell>
  );
}
