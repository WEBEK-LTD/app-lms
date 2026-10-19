import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, IBM_Plex_Sans_Arabic } from "next/font/google";
import localFont from "next/font/local";
import { HtmlShell } from "@/components/html-shell";
import { DEFAULT_DESCRIPTION, DEFAULT_TITLE, SITE_NAME, siteUrl } from "@/lib/seo";
import "./globals.css";

const bricolage = Bricolage_Grotesque({
  subsets: ["latin", "latin-ext"],
  variable: "--font-bricolage",
  display: "swap",
});

/**
 * 55 Arabic text: Bricolage Grotesque has no Arabic letters. Only the Arabic
 * subset is loaded (the browser fetches it only for Arabic text), without a
 * fallback face, so Latin text stays in Bricolage (globals.css, `:lang(ar)`).
 */
const plexArabic = IBM_Plex_Sans_Arabic({
  subsets: ["arabic"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-arabic",
  display: "swap",
  preload: false,
  adjustFontFallback: false,
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
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon.svg", type: "image/svg+xml" },
    ],
    apple: "/apple-touch-icon.png",
  },
  manifest: "/site.webmanifest",
};

export const viewport: Viewport = {
  themeColor: "#0E0D24",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <HtmlShell className={`${bricolage.variable} ${plexArabic.variable} ${icons.variable}`}>
      <body className="min-h-screen bg-ivory font-sans text-midnight antialiased">{children}</body>
    </HtmlShell>
  );
}
