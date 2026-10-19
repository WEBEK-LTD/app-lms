import type { Metadata } from "next";
import { COMPANY } from "./company";
import { inlineText, type Block } from "./content/markdown";
import type { PlanInfo } from "./plans";

/**
 * 32 What search engines and link previews read: canonical addresses, Open
 * Graph and Twitter cards and structured data (JSON-LD). The sitemap and
 * robots.txt are in lib/sitemap.ts.
 */

export const SITE_NAME = COMPANY.name;
export const DEFAULT_TITLE = "Yallapp: your business as your own mobile app";
export const DEFAULT_DESCRIPTION =
  "Branded Android and iOS apps for academies, shops, restaurants, clinics, gyms, events, charities and more, on Google Play, the App Store, Galaxy Store, AppGallery and GetApps, from your WordPress site, Shopify and other platforms, your own API, or no website at all.";

/** The public site's address without a trailing slash: APP_URL, else the host's URL, else yallapp.com.tr. */
export function siteUrl(): string {
  const raw = process.env.APP_URL?.trim() || process.env.URL?.trim() || COMPANY.website;
  return raw.replace(/\/+$/, "");
}

/**
 * The site's share image (app/opengraph-image.tsx). A page's own `openGraph`
 * replaces its layout's, image included, so pages name their image: this one,
 * or their section's opengraph-image (pricing, solutions, docs).
 */
export const DEFAULT_SHARE_IMAGE = { url: "/opengraph-image", width: 1200, height: 630, alt: DEFAULT_TITLE };

/** A public page's metadata: its title and description, its canonical address, and the Open Graph and Twitter cards. */
export function pageMetadata({ title, description, path, image }: { title?: string; description: string; path: string; image?: string }): Metadata {
  const shared = title ? `${title} · ${SITE_NAME}` : DEFAULT_TITLE;
  const images = [image ? { ...DEFAULT_SHARE_IMAGE, url: image, alt: shared } : DEFAULT_SHARE_IMAGE];
  return {
    title: title ?? { absolute: DEFAULT_TITLE },
    description,
    alternates: { canonical: path },
    openGraph: { type: "website", siteName: SITE_NAME, locale: "en_US", url: path, title: shared, description, images },
    twitter: { card: "summary_large_image", title: shared, description, images },
  };
}

/** Metadata for pages search engines must leave out (dashboard, sign-in, payment pages). */
export const NO_INDEX: Metadata["robots"] = { index: false, follow: false };

// ---------------------------------------------------------------------------
// Structured data (schema.org JSON-LD)

export type JsonLd = Record<string, unknown>;

const CONTEXT = "https://schema.org";

/** JSON for a <script type="application/ld+json">: "<", ">" and "&" are escaped so the text can't close the script. */
export function jsonLdText(data: JsonLd | JsonLd[]): string {
  return JSON.stringify(data)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

/** Yallapp, with its city and the contact details from the admin's Settings. */
export function organizationLd(base: string, contact: { email: string; whatsapp: string }): JsonLd {
  return {
    "@context": CONTEXT,
    "@type": "Organization",
    "@id": `${base}/#organization`,
    name: SITE_NAME,
    url: `${base}/`,
    logo: `${base}/android-chrome-512x512.png`,
    address: { "@type": "PostalAddress", addressLocality: COMPANY.city, addressCountry: COMPANY.countryCode },
    contactPoint: [
      {
        "@type": "ContactPoint",
        contactType: "customer support",
        email: contact.email,
        telephone: contact.whatsapp,
        url: `${base}/contact`,
        availableLanguage: ["English"],
      },
    ],
  };
}

export function websiteLd(base: string): JsonLd {
  return {
    "@context": CONTEXT,
    "@type": "WebSite",
    "@id": `${base}/#website`,
    name: SITE_NAME,
    url: `${base}/`,
    inLanguage: "en",
    publisher: { "@id": `${base}/#organization` },
  };
}

/** Yallapp as a product, with an offer for each plan that has a price (plans "On request" have none). */
export function softwareLd(base: string, plans: PlanInfo[]): JsonLd {
  const offers = plans
    .filter((plan) => plan.priceCents !== null)
    .map((plan) => {
      const price = (plan.priceCents! / 100).toFixed(2);
      return {
        "@type": "Offer",
        name: plan.name,
        description: plan.tagline,
        price,
        priceCurrency: plan.currency,
        url: `${base}/pricing`,
        category: "subscription",
        priceSpecification: {
          "@type": "UnitPriceSpecification",
          price,
          priceCurrency: plan.currency,
          billingDuration: plan.billingMonths === 1 ? "P1M" : "P1Y",
        },
      };
    });
  return {
    "@context": CONTEXT,
    "@type": "SoftwareApplication",
    name: SITE_NAME,
    url: `${base}/`,
    description: DEFAULT_DESCRIPTION,
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web, Android, iOS",
    publisher: { "@id": `${base}/#organization` },
    ...(offers.length ? { offers } : {}),
  };
}

/** Markdown blocks as plain text, for answers in structured data. */
export function blocksText(blocks: Block[]): string {
  const text = (block: Block): string => {
    switch (block.t) {
      case "p":
      case "h":
        return inlineText(block.c);
      case "ul":
      case "ol":
        return block.items.map((item) => inlineText(item)).join("\n");
      case "quote":
        return block.blocks.map(text).join("\n\n");
      case "pre":
        return block.v;
      default:
        return "";
    }
  };
  return blocks.map(text).filter(Boolean).join("\n\n");
}

export function faqLd(items: { question: string; answer: string }[]): JsonLd {
  return {
    "@context": CONTEXT,
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.answer },
    })),
  };
}

/** The trail to a page, home first: [{ name: "Solutions", path: "/solutions" }, …]. */
export function breadcrumbLd(base: string, trail: { name: string; path: string }[]): JsonLd {
  return {
    "@context": CONTEXT,
    "@type": "BreadcrumbList",
    itemListElement: [{ name: "Home", path: "/" }, ...trail].map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: `${base}${item.path === "/" ? "/" : item.path}`,
    })),
  };
}
