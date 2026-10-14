import type { Metadata } from "next";
import { EventPage } from "../event-page";

export const metadata: Metadata = { title: "New event" };

export default function NewEventPage() {
  return <EventPage id={null} notice={{}} />;
}
