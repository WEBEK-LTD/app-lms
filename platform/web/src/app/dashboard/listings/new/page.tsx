import type { Metadata } from "next";
import { ListingPage } from "../listing-page";
import { dashboardText } from "@/lib/dashboard-lang";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await dashboardText()).t("listings.newListing") };
}

export default function NewListingPage() {
  return <ListingPage id={null} />;
}
