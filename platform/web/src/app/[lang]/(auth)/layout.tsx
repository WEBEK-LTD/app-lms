import type { Metadata } from "next";
import type { ReactNode } from "react";
import { NO_INDEX } from "@/lib/seo";

/** 32 Sign-in and account pages stay out of search engines (55 in every language). */
export const metadata: Metadata = { robots: NO_INDEX };

export default function AuthLayout({ children }: { children: ReactNode }) {
  return children;
}
