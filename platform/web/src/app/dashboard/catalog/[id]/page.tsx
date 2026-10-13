import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProductPage } from "../product-page";

export const metadata: Metadata = { title: "Edit product" };

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id);
  if (!Number.isSafeInteger(id) || id < 1) notFound();
  return <ProductPage id={id} />;
}
