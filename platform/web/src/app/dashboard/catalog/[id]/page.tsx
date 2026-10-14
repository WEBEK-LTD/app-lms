import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireClient } from "@/lib/auth/session";
import { catalogWords } from "@/lib/catalog/words";
import { ProductPage } from "../product-page";

export async function generateMetadata(): Promise<Metadata> {
  const { app } = await requireClient();
  return { title: `Edit ${catalogWords(app?.vertical).item}` };
}

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id);
  if (!Number.isSafeInteger(id) || id < 1) notFound();
  return <ProductPage id={id} />;
}
