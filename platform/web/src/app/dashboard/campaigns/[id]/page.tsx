import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CampaignPage } from "../campaign-page";
import { dashboardText } from "@/lib/dashboard-lang";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await dashboardText()).t("donations.editCampaign") };
}

export default async function EditCampaignPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ cannotDelete?: string }> }) {
  const id = Number((await params).id);
  if (!Number.isSafeInteger(id) || id < 1) notFound();
  const { cannotDelete } = await searchParams;
  return <CampaignPage id={id} cannotDelete={cannotDelete === "1"} />;
}
