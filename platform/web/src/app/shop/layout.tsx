import type { Metadata } from "next";
import type { ReactNode } from "react";
import { NO_INDEX } from "@/lib/seo";

/** 32 Product pages of clients' shops stay out of search engines. */
export const metadata: Metadata = { robots: NO_INDEX };

export default function ShopLayout({ children }: { children: ReactNode }) {
  return children;
}
