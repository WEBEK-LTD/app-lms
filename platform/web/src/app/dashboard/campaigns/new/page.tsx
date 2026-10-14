import type { Metadata } from "next";
import { CampaignPage } from "../campaign-page";

export const metadata: Metadata = { title: "New campaign" };

export default function NewCampaignPage() {
  return <CampaignPage id={null} />;
}
