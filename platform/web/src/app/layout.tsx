import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque } from "next/font/google";
import localFont from "next/font/local";
import { DEFAULT_DESCRIPTION, DEFAULT_TITLE, SITE_NAME, siteUrl } from "@/lib/seo";
import "./globals.css";

const bricolage = Bricolage_Grotesque({
  subsets: ["latin", "latin-ext"],
  variable: "--font-bricolage",
  display: "swap",
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
    <html lang="en" className={`${bricolage.variable} ${icons.variable}`}>
      <body className="min-h-screen bg-ivory font-sans text-midnight antialiased">{children}</body>
    </html>
  );
}
