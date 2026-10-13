import Link from "next/link";
import { notFound } from "next/navigation";
import { deleteProductAction } from "@/app/actions/catalog";
import { SubmitButton } from "@/components/form";
import { assetUrl } from "@/lib/assets";
import { requireClient } from "@/lib/auth/session";
import { centsToDecimal } from "@/lib/catalog/money";
import { catalogSettings } from "@/lib/catalog/settings";
import { appUrl } from "@/lib/env";
import { productUrl } from "@/lib/hosted/connectors/catalog";
import { getStore } from "@/lib/data";
import { ProductForm, type ProductFormValues } from "./forms";

/** Adding (id null) or editing a product. */
export async function ProductPage({ id }: { id: number | null }) {
  const { app } = await requireClient();
  if (!app || app.connector?.kind !== "catalog") notFound();
  const store = await getStore();
  const [product, categories] = await Promise.all([
    id !== null ? store.getCatalogProduct(app.id, id) : Promise.resolve(null),
    store.listCatalogCategories(app.id),
  ]);
  if (id !== null && !product) notFound();
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
      }
    : { id: null, name: "", description: "", price: "", salePrice: "", stock: "", sku: "", categoryIds: [], images: [], digital: false, featured: false, active: true };
  return (
    <div className="flex max-w-[720px] flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Link href="/dashboard/catalog" className="text-sm font-semibold">
          ← Products
        </Link>
        <h1 className="m-0 text-[28px] font-extrabold tracking-[-0.5px] sm:text-[34px]">{product ? product.name : "New product"}</h1>
        {product?.active ? (
          <p className="m-0 text-[15px] text-ink-4">
            Share it:{" "}
            <a href={productUrl(appUrl(), app.id, product.id)} className="break-all">
              {productUrl(appUrl(), app.id, product.id)}
            </a>
          </p>
        ) : null}
      </div>
      <section aria-label="Product" className="rounded-2xl border border-line bg-white p-5 sm:p-6">
        <ProductForm product={values} categories={categories.map((c) => ({ id: c.id, name: c.name }))} currency={catalogSettings(app).currency} />
      </section>
      {product ? (
        <form action={deleteProductAction} className="flex items-center justify-between gap-3 rounded-2xl border border-line bg-white p-5 sm:p-6">
          <input type="hidden" name="id" value={product.id} />
          <span className="text-[15px] text-ink-4">Past orders keep their details when you delete a product.</span>
          <SubmitButton variant="secondary" className="h-10">
            Delete product
          </SubmitButton>
        </form>
      ) : null}
    </div>
  );
}
