import type { Metadata } from "next";
import localFont from "next/font/local";
import { CmDocumentLang } from "@/components/community/site/client";
import { siteContext } from "@/components/community/site/context";
import { CM_LANG_INFO } from "@/components/community/site/words";
import "./community.css";

/**
 * 231 Yallapp Community's website (community.yallapp.com.tr): the approved
 * design's type, Inter for text and Readex Pro for the wordmark and figures,
 * as files in the repository (fonts/, each with its OFL licence), Latin and
 * Latin Extended subsets only, with Google Fonts' unicode ranges (written
 * out: next/font reads them literally); Arabic text falls to the site's
 * Arabic face.
 */

const inter = localFont({ src: "../../fonts/inter/inter-latin.woff2", weight: "100 900", variable: "--font-cm-inter", display: "swap", declarations: [{ prop: "unicode-range", value: "U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD" }] });
const interExt = localFont({ src: "../../fonts/inter/inter-latin-ext.woff2", weight: "100 900", variable: "--font-cm-inter-ext", display: "swap", preload: false, declarations: [{ prop: "unicode-range", value: "U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+0304, U+0308, U+0329, U+1D00-1DBF, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C4, U+2113, U+2C60-2C7F, U+A720-A7FF" }] });
const readex = localFont({ src: "../../fonts/readex-pro/readex-pro-latin.woff2", weight: "160 700", variable: "--font-cm-readex", display: "swap", declarations: [{ prop: "unicode-range", value: "U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD" }] });
const readexExt = localFont({ src: "../../fonts/readex-pro/readex-pro-latin-ext.woff2", weight: "160 700", variable: "--font-cm-readex-ext", display: "swap", preload: false, declarations: [{ prop: "unicode-range", value: "U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+0304, U+0308, U+0329, U+1D00-1DBF, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C4, U+2113, U+2C60-2C7F, U+A720-A7FF" }] });

export const metadata: Metadata = {
  title: { default: "Yallapp Community", template: "%s · Yallapp Community" },
  description: "Learn, ask and show the apps you build with Yallapp.",
  icons: { icon: "/community/logo.svg" },
};

export default async function CommunityLayout({ children }: { children: React.ReactNode }) {
  const { lang } = await siteContext();
  return (
    <div className={`cm ${inter.variable} ${interExt.variable} ${readex.variable} ${readexExt.variable}`} lang={lang} dir={CM_LANG_INFO[lang].dir}>
      <CmDocumentLang lang={lang} />
      {children}
    </div>
  );
}
