import { notFound } from "next/navigation";
import { deleteProductAction } from "@/app/actions/catalog";
import { SubmitButton } from "@/components/form";
import { Icon } from "@/components/icon";
import { PageHeader, Section } from "@/components/ui";
import { DetailLayout } from "@/components/page-kit";
import { assetUrl } from "@/lib/assets";
import { requireClient } from "@/lib/auth/session";
import { centsToDecimal } from "@/lib/catalog/money";
import { optionGroupsOf } from "@/lib/catalog/options";
import { catalogSettings } from "@/lib/catalog/settings";
import { appUrl } from "@/lib/env";
import { productUrl } from "@/lib/hosted/connectors/catalog";
import { getStore } from "@/lib/data";
import { ProductForm, type EditorGroup, type EditorVariants, type ProductFormValues } from "./forms";
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
  // 91.5 The variations as the editor shows them.
  const variants: EditorVariants = product?.variants
    ? {
        attributes: product.variants.attributes.map((a) => ({ name: a.name, values: a.values.join(", ") })),
        items: product.variants.items.map((v) => ({
          id: v.id,
          values: v.values,
          price: v.priceCents !== null ? centsToDecimal(v.priceCents) : "",
          sale: v.salePriceCents !== null ? centsToDecimal(v.salePriceCents) : "",
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
        variants,
      }
    : { id: null, name: "", description: "", price: "", salePrice: "", stock: "", sku: "", categoryIds: [], images: [], digital: false, featured: false, active: true, optionGroups, variants };
  const form = (
    <section aria-label={t("shop.itemLabel", { kind })} className="flex min-w-0 flex-col rounded-2xl border border-line bg-white p-5 sm:p-6">
      <ProductForm
        product={values}
        categories={categories.map((c) => ({ id: c.id, name: c.name }))}
        currency={catalogSettings(app).currency}
        words={{ add: t("shop.add", { kind }), save: t("shop.save", { kind }) }}
        restaurant={restaurant}
      />
    </section>
  );
  const header = <PageHeader back={{ href: "/dashboard/catalog", label: t("shop.page", { kind }) }} title={product ? product.name : t("shop.new", { kind })} description={product ? undefined : t("shop.intro", { kind })} />;
  if (!product) {
    return (
      <div className="flex max-w-[760px] flex-col gap-6">
        {header}
        {form}
      </div>
    );
  }
  const share = productUrl(appUrl(), app.id, product.id);
  return (
    <div className="flex flex-col gap-6">
      {/* The page kit: the form, and at the side where it shows, its link and deleting it. */}
      {header}
      <DetailLayout
        main={form}
        side={
          <>
            <Section titleId="h-product-status" title={t("shop.sideStatus")}>
              <p className={`m-0 flex items-center gap-2 text-[15px] font-semibold ${product.active ? "text-success" : "text-muted"}`}>
                <Icon name={product.active ? "visibility" : "visibility_off"} size={20} />
                {t(product.active ? "shop.sideShown" : "shop.sideHidden")}
              </p>
              {product.active ? (
                <p className="m-0 text-sm leading-relaxed text-ink-4">
                  {richText(t("shop.shareIt"), {
                    link: () => (
                      <a href={share} className="break-all" dir="ltr">
                        {share}
                      </a>
                    ),
                  })}
                </p>
              ) : null}
            </Section>
            <form action={deleteProductAction} className="flex flex-col gap-3 rounded-2xl border border-line bg-white p-5">
              <input type="hidden" name="id" value={product.id} />
              <span className="text-sm leading-relaxed text-ink-4">{t("shop.deleteNote", { kind })}</span>
              <SubmitButton variant="danger" className="h-10 self-start">
                {t("shop.deleteItem", { kind })}
              </SubmitButton>
            </form>
          </>
        }
      />
    </div>
  );
}
