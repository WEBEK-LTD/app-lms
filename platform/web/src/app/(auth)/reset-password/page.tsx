import type { Metadata } from "next";
import { authMetadata, ResetPasswordPage } from "@/site/auth";

export const metadata: Metadata = authMetadata("en", "reset", "/reset-password");

export default async function Page({ searchParams }: PageProps<"/reset-password">) {
  return <ResetPasswordPage lang="en" token={(await searchParams).token} />;
}
