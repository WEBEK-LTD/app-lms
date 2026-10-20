import Link from "next/link";
import { notFound } from "next/navigation";
import { deleteProductAction } from "@/app/actions/catalog";
import { SubmitButton } from "@/components/form";
import { assetUrl } from "@/lib/assets";
import { requireClient } from "@/lib/auth/session";
import { centsToDecimal } from "@/lib/catalog/money";
import { optionGroupsOf } from "@/lib/catalog/options";
import { catalogSettings } from "@/lib/catalog/settings";
import { appUrl } from "@/lib/env";
import { productUrl } from "@/lib/hosted/connectors/catalog";
import { getStore } from "@/lib/data";
import { ProductForm, type EditorGroup, type ProductFormValues } from "./forms";
import { dashboardText } from "@/lib/dashboard-lang";
import { richText } from "@/i18n/rich";

/** Adding (id null) or editing a product. */
export async function ProductPage({ id }: { id: number | null }) {
  const { app } = await requireClient("catalog");
  if (!app || app.connector?.kind !== "catalog") notFound();
  const store = await getStore();
  const [product, categories] = await Promise.all([
    id !== null ? store.getCatalogProduct(app.id, id) : Promise.resolve(null),
    store.listCatalogCategories(app.id),
  ]);
  if (id !== null && !product) notFound();
  const restaurant = app.vertical === "restaurant";
  const { t } = await dashboardText();
  const kind = restaurant ? "restaurant" : "shop";
  // 26 The option groups as the editor shows them.
  const optionGroups: EditorGroup[] = product
    ? optionGroupsOf(product).map((g) => ({
        id: g.id,
        name: g.name,
        min: String(g.min),
        max: String(g.max),
        options: g.options.map((o) => ({ id: o.id, name: o.name, price: o.priceDeltaCents ? centsToDecimal(o.priceDeltaCents) : "" })),
      }))
    : [];
  const values: ProductFormValues = product
    ? {
        id: product.id,
        name: product.name,
        description: product.description,
        price: centsToDecimal(product.priceCents),
        salePrice: product.salePriceCents !== null ? centsToDecimal(product.salePriceCents) : "",
        stock: product.stock !== null ? String(product.stock) : "",
        sku: product.sku ?? "",
        categoryIds: product.categoryIds,
        images: product.imageAssetIds.map((a) => ({ id: a, url: assetUrl(a) })),
        digital: product.digital,
        featured: product.featured,
        active: product.active,
        optionGroups,
      }
    : { id: null, name: "", description: "", price: "", salePrice: "", stock: "", sku: "", categoryIds: [], images: [], digital: false, featured: false, active: true, optionGroups };
  return (
    <div className="flex max-w-[720px] flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Link href="/dashboard/catalog" className="text-sm font-semibold">
          {t("shop.back", { kind })}
        </Link>
        <h1 className="m-0 text-[26px] leading-tight font-extrabold tracking-[-0.5px] break-words sm:text-[30px]">{product ? product.name : t("shop.new", { kind })}</h1>
        {product?.active ? (
          <p className="m-0 text-[15px] text-ink-4">
            {richText(t("shop.shareIt"), {
              link: () => (
                <a href={productUrl(appUrl(), app.id, product.id)} className="break-all" dir="ltr">
                  {productUrl(appUrl(), app.id, product.id)}
                </a>
              ),
            })}
          </p>
        ) : null}
      </div>
      <section aria-label={t("shop.itemLabel", { kind })} className="rounded-2xl border border-line bg-white p-5 sm:p-6">
        <ProductForm
          product={values}
          categories={categories.map((c) => ({ id: c.id, name: c.name }))}
          currency={catalogSettings(app).currency}
          words={{ add: t("shop.add", { kind }), save: t("shop.save", { kind }) }}
          restaurant={restaurant}
        />
      </section>
      {product ? (
        <form action={deleteProductAction} className="flex items-center justify-between gap-3 rounded-2xl border border-line bg-white p-5 sm:p-6">
          <input type="hidden" name="id" value={product.id} />
          <span className="text-[15px] text-ink-4">{t("shop.deleteNote", { kind })}</span>
          <SubmitButton variant="secondary" className="h-10">
            {t("shop.deleteItem", { kind })}
          </SubmitButton>
        </form>
      ) : null}
    </div>
  );
}
