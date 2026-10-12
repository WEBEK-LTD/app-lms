import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque } from "next/font/google";
import localFont from "next/font/local";
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
  metadataBase: new URL(process.env.APP_URL ?? "https://yallapp.com.tr"),
  title: {
    default: "Yallapp: your WordPress academy as a mobile app",
    template: "%s · Yallapp",
  },
  description:
    "Turn your WordPress LMS site into branded Android and iOS apps. Students sign in with Digits OTP, watch protected lessons and track their progress, all synced with your website.",
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
