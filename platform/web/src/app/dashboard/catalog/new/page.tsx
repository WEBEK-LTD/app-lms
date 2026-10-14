import type { Metadata } from "next";
import { requireClient } from "@/lib/auth/session";
import { catalogWords } from "@/lib/catalog/words";
import { ProductPage } from "../product-page";

export async function generateMetadata(): Promise<Metadata> {
  const { app } = await requireClient();
  return { title: catalogWords(app?.vertical).new };
}

export default function NewProductPage() {
  return <ProductPage id={null} />;
}
