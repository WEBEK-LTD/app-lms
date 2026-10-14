import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PayShell } from "@/app/pay/[token]/shell";
import { assetUrl } from "@/lib/assets";
import { formatCents } from "@/lib/catalog/money";
import { catalogSettings } from "@/lib/catalog/settings";
import { getStore } from "@/lib/data";
import { descriptionHtml, priceOf } from "@/lib/hosted/connectors/catalog";

export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function load(appId: string, productId: string) {
  const id = Number(productId);
  if (!UUID.test(appId) || !Number.isSafeInteger(id) || id < 1) return null;
  const store = await getStore();
  const app = await store.getAppById(appId);
  if (!app || app.connector?.kind !== "catalog") return null;
  const product = await store.getCatalogProduct(appId, id);
  return product?.active ? { app, product } : null;
}

export async function generateMetadata({ params }: { params: Promise<{ appId: string; productId: string }> }): Promise<Metadata> {
  const { appId, productId } = await params;
  const found = await load(appId, productId);
  return { title: found ? `${found.product.name} · ${found.app.appName ?? "Shop"}` : "Product" };
}

/** A product's shareable page, for shops without a website (the app links to it). */
export default async function ProductPage({ params }: { params: Promise<{ appId: string; productId: string }> }) {
  const { appId, productId } = await params;
  const found = await load(appId, productId);
  if (!found) notFound();
  const { app, product } = found;
  const currency = catalogSettings(app).currency;
  const price = priceOf(product);
  return (
    <PayShell app={app}>
      {product.imageAssetIds[0] ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={assetUrl(product.imageAssetIds[0])} alt={product.name} className="aspect-square w-full rounded-xl object-cover" />
      ) : null}
      <h1 className="m-0 text-[24px] font-extrabold">{product.name}</h1>
      <p className="m-0 flex items-baseline gap-2 text-[20px] font-bold">
        {formatCents(price, currency)}
        {price < product.priceCents ? <s className="text-[16px] font-normal text-muted">{formatCents(product.priceCents, currency)}</s> : null}
      </p>
      <div className="text-[16px] leading-relaxed text-ink-4 [&_p]:m-0 [&_p+p]:mt-3" dangerouslySetInnerHTML={{ __html: descriptionHtml(product.description) }} />
      <p className="m-0 text-[15px] text-muted">Order it in the {app.appName ?? "shop's"} app.</p>
    </PayShell>
  );
}
