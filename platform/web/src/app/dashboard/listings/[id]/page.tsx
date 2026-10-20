import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ListingPage } from "../listing-page";
import { dashboardText } from "@/lib/dashboard-lang";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await dashboardText()).t("listings.editListing") };
}

export default async function EditListingPage({ params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id);
  if (!Number.isSafeInteger(id) || id < 1) notFound();
  return <ListingPage id={id} />;
}
