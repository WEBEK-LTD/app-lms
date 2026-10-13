import type { Metadata } from "next";
import Link from "next/link";
import { deleteCategoryAction, removePaymentKeysAction, renameCategoryAction } from "@/app/actions/catalog";
import { SubmitButton } from "@/components/form";
import { Icon } from "@/components/icon";
import { Badge, btn } from "@/components/ui";
import { assetUrl } from "@/lib/assets";
import { requireClient } from "@/lib/auth/session";
import { CATALOG_CURRENCIES, centsToDecimal, formatCents } from "@/lib/catalog/money";
import { catalogSettings } from "@/lib/catalog/settings";
import { getStore } from "@/lib/data";
import { priceOf } from "@/lib/hosted/connectors/catalog";
import { AddCategoryForm, PaymentKeysForm, ShopSettingsForm } from "./forms";

export const metadata: Metadata = { title: "Products" };

/** Products, categories and shop settings for apps without a website. */
export default async function CatalogPage({ searchParams }: { searchParams: Promise<{ saved?: string }> }) {
  const { app } = await requireClient();
  if (!app || app.connector?.kind !== "catalog") {
    return (
      <div className="flex max-w-[620px] flex-col gap-3">
        <h1 className="m-0 text-[28px] font-extrabold">Products</h1>
        <p className="m-0 text-[17px] leading-relaxed text-ink-4">
          Your app gets its products from your website. To add products here instead, choose &quot;I don&apos;t have a website&quot; on the{" "}
          <Link href="/dashboard/setup?step=website">Website step</Link>.
        </p>
      </div>
    );
  }
  const { saved } = await searchParams;
  const store = await getStore();
  const [products, categories] = await Promise.all([store.listCatalogProducts(app.id), store.listCatalogCategories(app.id)]);
  const settings = catalogSettings(app);
  const money = (cents: number) => formatCents(cents, settings.currency);
  const categoryName = new Map(categories.map((c) => [c.id, c.name]));

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex max-w-[620px] flex-col gap-2">
          <h1 className="m-0 text-[28px] font-extrabold tracking-[-0.5px] sm:text-[34px]">Products</h1>
          <p className="m-0 text-[17px] leading-relaxed text-ink-4">What your app sells. Changes show in the app right away.</p>
        </div>
        <Link href="/dashboard/catalog/new" className={`${btn.primary} h-[46px]`}>
          <Icon name="add" size={20} />
          Add product
        </Link>
      </div>

      {saved ? (
        <p role="status" className="m-0 rounded-xl bg-success-bg px-4 py-3 text-[15px] font-semibold text-success">
          Saved “{saved}”.
        </p>
      ) : null}
      {!settings.payment ? (
        <p className="m-0 flex items-start gap-2 rounded-xl bg-warn-bg px-4 py-3 text-[15px] text-warn">
          <Icon name="warning" size={20} />
          <span>
            Your app can&apos;t take orders until you add your iyzico keys in <a href="#h-payments">Card payments</a> below.
          </span>
        </p>
      ) : null}

      <section aria-labelledby="h-products" className="flex flex-col gap-3 rounded-2xl border border-line bg-white p-5 sm:p-6">
        <h2 id="h-products" className="m-0 text-[19px] font-bold">
          {products.length} {products.length === 1 ? "product" : "products"}
        </h2>
        {products.length === 0 ? (
          <p className="m-0 text-[15px] text-muted">No products yet. Add your first one.</p>
        ) : (
          <ul className="m-0 flex list-none flex-col p-0">
            {products.map((p) => (
              <li key={p.id} className="border-t border-line-soft first:border-t-0">
                <Link href={`/dashboard/catalog/${p.id}`} className="flex items-center gap-3 py-3 text-midnight no-underline hover:bg-sand">
                  {p.imageAssetIds[0] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={assetUrl(p.imageAssetIds[0])} alt="" className="h-12 w-12 shrink-0 rounded-lg object-cover" />
                  ) : (
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-sand text-muted">
                      <Icon name="shopping_bag" size={22} />
                    </span>
                  )}
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="truncate text-[15px] font-bold">{p.name}</span>
                    <span className="truncate text-[13px] text-muted">
                      {[money(priceOf(p)), p.stock === null ? null : `${p.stock} in stock`, ...p.categoryIds.map((c) => categoryName.get(c))]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                  </span>
                  {!p.active ? <Badge tone="neutral">Hidden</Badge> : p.stock === 0 ? <Badge tone="warn">Out of stock</Badge> : null}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="flex flex-wrap items-start gap-6">
        <section aria-labelledby="h-categories" className="flex min-w-0 flex-[1_1_380px] flex-col gap-4 rounded-2xl border border-line bg-white p-5 sm:p-6">
          <h2 id="h-categories" className="m-0 text-[19px] font-bold">
            Categories
          </h2>
          {categories.length === 0 ? <p className="m-0 text-[15px] text-muted">Group your products, like &quot;Bouquets&quot; or &quot;Gifts&quot;.</p> : null}
          <ul className="m-0 flex list-none flex-col gap-2 p-0">
            {categories.map((c) => (
              <li key={c.id} className="flex items-center gap-2">
                <form action={renameCategoryAction} className="flex flex-1 items-center gap-2">
                  <input type="hidden" name="id" value={c.id} />
                  <label htmlFor={`cat-${c.id}`} className="sr-only">
                    Category name
                  </label>
                  <input id={`cat-${c.id}`} name="name" defaultValue={c.name} maxLength={80} className="input input-sm flex-1" />
                  <SubmitButton variant="secondary" className="h-9 px-3 text-sm">
                    Rename
                  </SubmitButton>
                </form>
                <form action={deleteCategoryAction}>
                  <input type="hidden" name="id" value={c.id} />
                  <SubmitButton variant="secondary" className="h-9 px-3 text-sm">
                    Delete
                  </SubmitButton>
                </form>
              </li>
            ))}
          </ul>
          <AddCategoryForm />
        </section>

        <section aria-labelledby="h-shop" className="flex min-w-0 flex-[1_1_320px] flex-col gap-4 rounded-2xl border border-line bg-white p-5 sm:p-6">
          <h2 id="h-shop" className="m-0 text-[19px] font-bold">
            Shop settings
          </h2>
          <ShopSettingsForm
            currency={settings.currency}
            currencies={CATALOG_CURRENCIES}
            shipping={settings.shippingCents ? centsToDecimal(settings.shippingCents) : ""}
            freeOver={settings.freeShippingOverCents !== null ? centsToDecimal(settings.freeShippingOverCents) : ""}
          />
        </section>
      </div>

      <section aria-labelledby="h-payments" className="flex max-w-[640px] flex-col gap-4 rounded-2xl border border-line bg-white p-5 sm:p-6">
        <h2 id="h-payments" className="m-0 text-[19px] font-bold">
          Card payments
        </h2>
        <p className="m-0 text-[15px] leading-relaxed text-ink-4">
          Customers pay by card on a secure iyzico page, and the money goes to your own iyzico merchant account. Find your keys in the iyzico
          merchant panel, under Settings. They stay encrypted on our servers.
        </p>
        {settings.payment ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="m-0 flex items-center gap-2 text-[15px] font-semibold text-success">
              <Icon name="check_circle" size={20} filled />
              On · {settings.payment.sandbox ? "sandbox (test payments)" : "live"}
            </p>
            <form action={removePaymentKeysAction}>
              <SubmitButton variant="secondary" className="h-10">
                Remove keys
              </SubmitButton>
            </form>
          </div>
        ) : null}
        <PaymentKeysForm sandbox={settings.payment?.sandbox ?? false} />
      </section>
    </div>
  );
}
