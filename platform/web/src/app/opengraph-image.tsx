import { OG_CONTENT_TYPE, OG_SIZE, ogImage } from "@/components/og-image";

/** 32 The share image of every page without its own. */
export const alt = "Yallapp: your business as your own mobile app";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function Image() {
  return ogImage({
    title: "Your business, as your own mobile app.",
    text: "Branded Android and iOS apps on all five app stores, from the website you already run, from Shopify and other platforms, or with no website at all.",
  });
}
