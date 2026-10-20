import type { Metadata } from "next";
import { DeleteAccountPage, deleteAccountMetadata } from "@/site/delete-account";

export const metadata: Metadata = deleteAccountMetadata("en");

export default function Page() {
  return <DeleteAccountPage lang="en" />;
}
