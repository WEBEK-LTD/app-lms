import type { Metadata } from "next";
import { CommunityPage, communityPageMetadata } from "@/site/community-page";

export function generateMetadata(): Metadata {
  return communityPageMetadata("en");
}

export default function Page() {
  return <CommunityPage lang="en" />;
}
