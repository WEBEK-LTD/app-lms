import type { Metadata } from "next";
import { HomePage, homeMetadata } from "@/site/home";

/** Plans and prices come from the admin. */
export const dynamic = "force-dynamic";

export const metadata: Metadata = homeMetadata("en");

export default function LandingPage() {
  return <HomePage lang="en" />;
}
