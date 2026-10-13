import type { Metadata } from "next";
import { ProductPage } from "../product-page";

export const metadata: Metadata = { title: "New product" };

export default function NewProductPage() {
  return <ProductPage id={null} />;
}
