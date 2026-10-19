import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { textOn } from "@/app/pay/[token]/shell";
import { MarkSvg } from "@/components/brand-marks";
import { assetUrl } from "@/lib/assets";
import { STORES } from "@/lib/brands";
import { getStore } from "@/lib/data";
import type { App } from "@/lib/data/types";
import { linkItem, storeLinks, wordpressTarget, type LinkItem } from "@/lib/links/fallback";
import { linkTarget, type LinkKind } from "@/lib/links/table";

export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

const WHAT: Record<LinkKind, string> = {
  course: "course",
  product: "product",
  service: "service",
  listing: "property",
  article: "article",
  event: "event",
  campaign: "campaign",
  page: "page",
};

async function load(appId: string, rest: string[]) {
  if (!UUID.test(appId) || rest.length !== 2) return null;
  const target = linkTarget(rest[0] ?? "", decodeURIComponent(rest[1] ?? ""));
  if (!target) return null;
  const store = await getStore();
  const app = await store.getAppById(appId);
  const name = app?.appName ?? app?.storeTitle;
  if (!app || !name) return null;
  return { store, app, target, name };
}

type Params = { params: Promise<{ appId: string; rest: string[] }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { appId, rest } = await params;
  const found = await load(appId, rest);
  if (!found) return { title: "Link" };
  const item = found.app.backend === "wordpress" ? null : await linkItem(found.store, found.app, found.target.kind, found.target.id);
  const title = item ? `${item.title} · ${found.name}` : found.name;
  return {
    title: { absolute: title },
    description: found.app.shortDescription ?? `Open it in the ${found.name} app.`,
    openGraph: { title, ...(item?.imageAssetId ? { images: [assetUrl(item.imageAssetId)] } : {}) },
    robots: { index: false },
  };
}

function StoreButton({ href, store, label, app }: { href: string; store: "google_play" | "app_store"; label: string; app: App }) {
  const info = STORES[store];
  return (
    <a
      href={href}
      data-store-link={store}
      className="flex h-12 items-center justify-center gap-2.5 rounded-xl px-5 text-[15px] font-bold no-underline"
      style={{ background: app.primaryColor, color: textOn(app.primaryColor), fill: "currentColor" }}
    >
      <MarkSvg mark={info.mark!} height={20} />
      {label}
    </a>
  );
}

/**
 * 46 A link that opens the app (`/a/<app_id>/<kind>/<id>`), seen without the
 * app: phones with the app open it there and never see this page. A
 * WordPress app's link goes on to the site, which sends it to the item's
 * own page; other apps show the item with the app's store links, in the
 * app's branding. No price and no purchase button here, on any phone.
 */
export default async function AppLinkPage({ params }: Params) {
  const { appId, rest } = await params;
  const found = await load(appId, rest);
  if (!found) notFound();
  const { store, app, target, name } = found;
  const license = await store.getLicenseForApp(app.clientId, app.id);
  const onSite = wordpressTarget(app, license ? await store.getActivation(license.id) : null, target.kind, target.id);
  if (onSite) redirect(onSite);

  const item: LinkItem | null = app.backend === "wordpress" ? null : await linkItem(store, app, target.kind, target.id);
  const links = storeLinks(app, await store.getPublishingRequest(app.id));
  const website = app.backend === "wordpress" && app.siteUrl ? app.siteUrl : null;
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-[520px] flex-col gap-5 bg-white px-4 py-6 sm:my-8 sm:min-h-0 sm:rounded-2xl sm:border sm:border-line sm:px-7">
      <header className="flex items-center gap-3">
        {app.iconAssetId ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={assetUrl(app.iconAssetId)} alt="" width={44} height={44} className="h-11 w-11 rounded-xl object-cover" />
        ) : null}
        <span className="text-[18px] font-bold">{name}</span>
      </header>
      {item?.imageAssetId ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={assetUrl(item.imageAssetId)} alt="" className="aspect-video w-full rounded-xl object-cover" />
      ) : null}
      <h1 className="m-0 text-[24px] leading-tight font-extrabold">{item?.title ?? `A ${WHAT[target.kind]} in ${name}`}</h1>
      <p className="m-0 text-[16px] leading-relaxed text-ink-4">
        {links.googlePlay || links.appStore
          ? `Get the ${name} app to open this ${WHAT[target.kind]}. If you already have it, open this link on your phone.`
          : `This ${WHAT[target.kind]} opens in the ${name} app. If you have it, open this link on your phone.`}
      </p>
      <div className="flex flex-col gap-3">
        {links.googlePlay ? <StoreButton href={links.googlePlay} store="google_play" label="Get it on Google Play" app={app} /> : null}
        {links.appStore ? <StoreButton href={links.appStore} store="app_store" label="Download on the App Store" app={app} /> : null}
        {website ? (
          <a href={website} className="text-center text-[15px] font-semibold">
            Visit the website
          </a>
        ) : null}
      </div>
    </main>
  );
}
