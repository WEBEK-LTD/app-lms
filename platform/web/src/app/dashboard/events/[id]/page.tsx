import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { EventPage } from "../event-page";

export const metadata: Metadata = { title: "Edit event" };

export default async function EditEventPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string; told?: string; cancelled?: string; error?: string }>;
}) {
  const id = Number((await params).id);
  if (!Number.isSafeInteger(id) || id < 1) notFound();
  return <EventPage id={id} notice={await searchParams} />;
}
