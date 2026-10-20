import type { Metadata } from "next";
import { CampaignPage } from "../campaign-page";
import { dashboardText } from "@/lib/dashboard-lang";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await dashboardText()).t("donations.newCampaign") };
}

export default function NewCampaignPage() {
  return <CampaignPage id={null} />;
}
