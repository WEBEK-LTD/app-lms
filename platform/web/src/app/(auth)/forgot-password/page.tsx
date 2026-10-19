import type { Metadata } from "next";
import { authMetadata, ForgotPasswordPage } from "@/site/auth";

export const metadata: Metadata = authMetadata("en", "forgot", "/forgot-password");

export default function Page() {
  return <ForgotPasswordPage lang="en" />;
}
