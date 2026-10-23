import type { Metadata } from "next";
import { ImportView } from "@/components/import-view";
import { requireClient } from "@/lib/auth/session";
import { dashboardText } from "@/lib/dashboard-lang";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await dashboardText()).t("imports.title") };
}

/** 81.4 Import services from a CSV file or a feed. */
export default async function ImportServicesPage() {
  return <ImportView context={await requireClient("bookings")} kind="services" />;
}
