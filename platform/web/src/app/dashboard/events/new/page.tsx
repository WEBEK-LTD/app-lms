import type { Metadata } from "next";
import { EventPage } from "../event-page";
import { dashboardText } from "@/lib/dashboard-lang";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await dashboardText()).t("events.newEvent") };
}

export default function NewEventPage() {
  return <EventPage id={null} notice={{}} />;
}
