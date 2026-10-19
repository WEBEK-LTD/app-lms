import type { DataStore } from "../data/store";
import type { Activation, App, PublishingRequest } from "../data/types";
import { compareVersions, parseVersion } from "../semver";
import { siteLinkBase, type LinkKind } from "./table";

/**
 * 46 The page a link on Yallapp's domain shows when the app isn't installed
 * (`/a/<app_id>/<kind>/<id>`): the item's name and picture in the app's
 * branding, with the store links. Never a price or a purchase button, on any
 * phone (the iPhone rule for paid content holds everywhere here).
 */

/** The first plugin version that serves `/a/…` and the link files. The lead sets it with the release that has them. */
export const LINKS_PLUGIN_VERSION = "0.4.2";

export interface LinkItem {
  title: string;
  imageAssetId: string | null;
}

/** A visible item of an app without WordPress (hidden, draft and unknown items are null). */
export async function linkItem(store: DataStore, app: App, kind: LinkKind, id: string): Promise<LinkItem | null> {
  const n = Number(id);
  const numeric = Number.isSafeInteger(n) && n > 0;
  switch (kind) {
    case "course": {
      const course = numeric ? app.courseSetup?.courses.find((c) => c.id === n && c.active) : undefined;
      return course ? { title: course.title, imageAssetId: course.imageAssetId } : null;
    }
    case "service": {
      const service = numeric ? app.bookingSetup?.services.find((s) => s.id === n && s.active) : undefined;
      return service ? { title: service.name, imageAssetId: service.imageAssetId } : null;
    }
    case "product": {
      const product = numeric && app.connector?.kind === "catalog" ? await store.getCatalogProduct(app.id, n) : null;
      return product?.active ? { title: product.name, imageAssetId: product.imageAssetIds[0] ?? null } : null;
    }
    case "listing": {
      const listing = numeric ? await store.getListing(app.id, n) : null;
      return listing?.status === "published" ? { title: listing.title, imageAssetId: listing.imageAssetIds[0] ?? null } : null;
    }
    case "article": {
      const article = numeric ? await store.getArticle(app.id, n) : null;
      return article?.status === "published" ? { title: article.title, imageAssetId: article.imageAssetId } : null;
    }
    case "event": {
      const event = numeric ? await store.getEvent(app.id, n) : null;
      return event && event.status !== "draft" ? { title: event.title, imageAssetId: event.imageAssetIds[0] ?? null } : null;
    }
    case "campaign": {
      const campaign = numeric ? await store.getCampaign(app.id, n) : null;
      return campaign && campaign.status !== "draft" ? { title: campaign.title, imageAssetId: campaign.imageAssetIds[0] ?? null } : null;
    }
    default:
      return null;
  }
}

/**
 * Where a WordPress app's link goes without the app: the same link on the
 * site, whose plugin sends the visitor on to the item's own page. Only when
 * the site's plugin is recent enough to answer it; else null (the page here).
 */
export function wordpressTarget(app: App, activation: Activation | null, kind: LinkKind, id: string): string | null {
  if (app.backend !== "wordpress" || !activation) return null;
  const base = siteLinkBase(app.siteUrl);
  const version = parseVersion(activation.pluginVersion) ? activation.pluginVersion : null;
  if (!base || !version || compareVersions(version, LINKS_PLUGIN_VERSION) < 0) return null;
  return `${base}/${kind}/${encodeURIComponent(id)}`;
}

/** The app's store pages: Google Play from its package, the others once our team marked them live. */
export function storeLinks(app: App, request: PublishingRequest | null): { googlePlay: string | null; appStore: string | null } {
  const live = (track: { status: string; storeUrl?: string | null } | null | undefined) => (track?.status === "live" && track.storeUrl ? track.storeUrl : null);
  return {
    googlePlay: app.androidPackage ? `https://play.google.com/store/apps/details?id=${encodeURIComponent(app.androidPackage)}` : null,
    appStore: live(request?.ios ?? null),
  };
}
