import { OG_CONTENT_TYPE, OG_SIZE, ogImage } from "@/components/og-image";
import { getSiteContent } from "@/lib/content/get";

/** 32 The pricing page's share image, with its title from the admin. */
export const alt = "Yallapp pricing";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function Image() {
  const text = await getSiteContent("pricing");
  return ogImage({ eyebrow: "Pricing", title: text.title!, text: "Starter, Growth, Pro and Business: Android and iOS apps, published by you or by us." });
}
