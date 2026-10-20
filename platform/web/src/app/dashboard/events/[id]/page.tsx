import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { EventPage } from "../event-page";
import { dashboardText } from "@/lib/dashboard-lang";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await dashboardText()).t("events.editEvent") };
}

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
