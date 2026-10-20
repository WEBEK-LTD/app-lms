import type { Metadata } from "next";
import { requireClient } from "@/lib/auth/session";
import { dashboardText } from "@/lib/dashboard-lang";
import { ProductPage } from "../product-page";

export async function generateMetadata(): Promise<Metadata> {
  const { app } = await requireClient("catalog");
  return { title: (await dashboardText()).t("shop.new", { kind: app?.vertical === "restaurant" ? "restaurant" : "shop" }) };
}

export default function NewProductPage() {
  return <ProductPage id={null} />;
}
