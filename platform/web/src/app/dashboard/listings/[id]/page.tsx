import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ListingPage } from "../listing-page";

export const metadata: Metadata = { title: "Edit listing" };

export default async function EditListingPage({ params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id);
  if (!Number.isSafeInteger(id) || id < 1) notFound();
  return <ListingPage id={id} />;
}
