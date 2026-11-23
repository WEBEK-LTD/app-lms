import { notFound } from "next/navigation";
import { deleteProductAction } from "@/app/actions/catalog";
import { SubmitButton } from "@/components/form";
import { Icon } from "@/components/icon";
import { PageHeader, btn } from "@/components/ui";
import { assetUrl } from "@/lib/assets";
import { requireClient } from "@/lib/auth/session";
import { centsToDecimal } from "@/lib/catalog/money";
import { optionGroupsOf } from "@/lib/catalog/options";
import { catalogSettings } from "@/lib/catalog/settings";
import { appUrl } from "@/lib/env";
import { productUrl } from "@/lib/hosted/connectors/catalog";
import { getStore } from "@/lib/data";
import type { EditorGroup, EditorVariants, ProductFormValues } from "./forms";
import { ProductEditor } from "./product-editor";
import { dashboardText } from "@/lib/dashboard-lang";

/** Adding (id null) or editing a product; 132.11 in its own editor. */
export async function ProductPage({ id }: { id: number | null }) {
  const { app } = await requireClient("catalog");
  if (!app || app.connector?.kind !== "catalog") notFound();
  const store = await getStore();
  const [product, categories, all] = await Promise.all([
    id !== null ? store.getCatalogProduct(app.id, id) : Promise.resolve(null),
    store.listCatalogCategories(app.id),
    store.listCatalogProducts(app.id),
  ]);
  if (id !== null && !product) notFound();
  const restaurant = app.vertical === "restaurant";
  const { t } = await dashboardText();
  // 135.2 Prices back in the form with the currency's digits (1.250 KWD, ¥1250).
  const currency = catalogSettings(app).currency;
  const kind = restaurant ? "restaurant" : "shop";
  // 26 The option groups as the editor shows them.
  const optionGroups: EditorGroup[] = product
    ? optionGroupsOf(product).map((g) => ({
        id: g.id,
        name: g.name,
        min: String(g.min),
        max: String(g.max),
        options: g.options.map((o) => ({ id: o.id, name: o.name, price: o.priceDeltaCents ? centsToDecimal(o.priceDeltaCents, currency) : "", weight: o.weightGrams ? String(o.weightGrams / 1000) : "" })),
      }))
    : [];
  // 91.5 The variations as the editor shows them.
  const variants: EditorVariants = product?.variants
    ? {
        attributes: product.variants.attributes.map((a) => ({ name: a.name, values: a.values.join(", ") })),
        items: product.variants.items.map((v) => ({
          id: v.id,
          values: v.values,
          price: v.priceCents !== null ? centsToDecimal(v.priceCents, currency) : "",
          sale: v.salePriceCents !== null ? centsToDecimal(v.salePriceCents, currency) : "",
          stock: v.stock !== null ? String(v.stock) : "",
          sku: v.sku ?? "",
          active: v.active,
        })),
      }
    : { attributes: [], items: [] };
  const values: ProductFormValues = product
    ? {
        id: product.id,
        name: product.name,
        description: product.description,
        price: centsToDecimal(product.priceCents, currency),
        salePrice: product.salePriceCents !== null ? centsToDecimal(product.salePriceCents, currency) : "",
        stock: product.stock !== null ? String(product.stock) : "",
        sku: product.sku ?? "",
        // 131 Its weight in kg.
        weight: product.weightGrams ? String(product.weightGrams / 1000) : "",
        // 131 A gift add-on, and what it goes with.
        addon: Boolean(product.addon),
        addonOfferWith: product.addonFor?.offerWith ?? "all",
        addonCategoryIds: product.addonFor?.categoryIds ?? [],
        addonProductIds: product.addonFor?.productIds ?? [],
        categoryIds: product.categoryIds,
        images: product.imageAssetIds.map((a) => ({ id: a, url: assetUrl(a) })),
        digital: product.digital,
        featured: product.featured,
        active: product.active,
        optionGroups,
        variants,
        // 212 Its other languages and brand.
        translations: product.translations ?? null,
        brand: product.brand ?? "",
      }
    : { id: null, name: "", description: "", price: "", salePrice: "", stock: "", sku: "", categoryIds: [], images: [], digital: false, featured: false, active: true, optionGroups, variants };
  // Its own page, while it's shown in the app.
  const shown = product?.active ? productUrl(appUrl(), app.id, product.id) : null;
  return (
    <div className="flex flex-col gap-5">
      {/* 132.11 The editor's cards beside its place in the app and its categories; deleting it under them. */}
      <PageHeader
        back={{ href: "/dashboard/catalog", label: t("shop.page", { kind }) }}
        title={product ? product.name : t("shop.new", { kind })}
        description={product ? undefined : t("shop.intro", { kind })}
        actions={
          product && shown ? (
            <a href={shown} target="_blank" rel="noreferrer" className={`${btn.secondary} h-11`}>
              <Icon name="open_in_new" size={20} />
              {t("manage.openPage")}
            </a>
          ) : null
        }
      />
      <section aria-label={t("shop.itemLabel", { kind })} className="flex min-w-0 flex-col">
        <ProductEditor
          product={values}
          categories={categories.map((c) => ({ id: c.id, name: c.name }))}
          currency={catalogSettings(app).currency}
          restaurant={restaurant}
          products={all.filter((p) => !p.addon && p.id !== product?.id).map((p) => ({ id: p.id, name: p.name }))}
          share={shown}
        />
      </section>
      {product ? (
        <form action={deleteProductAction} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-white p-5">
          <input type="hidden" name="id" value={product.id} />
          <span className="flex min-w-0 flex-[1_1_260px] flex-col gap-0.5">
            <span className="text-[15px] font-bold">{t("shop.deleteItem", { kind })}</span>
            <span className="text-sm leading-relaxed text-ink-4">{t("shop.deleteNote", { kind })}</span>
          </span>
          <SubmitButton variant="danger" className="h-10">
            <Icon name="delete" size={18} />
            {t("shop.deleteItem", { kind })}
          </SubmitButton>
        </form>
      ) : null}
    </div>
  );
}
