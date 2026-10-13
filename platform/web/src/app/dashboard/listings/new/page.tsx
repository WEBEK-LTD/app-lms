import type { Metadata } from "next";
import { ListingPage } from "../listing-page";

export const metadata: Metadata = { title: "New listing" };

export default function NewListingPage() {
  return <ListingPage id={null} />;
}
