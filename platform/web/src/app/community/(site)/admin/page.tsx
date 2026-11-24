import { redirect } from "next/navigation";
import { cmLinks } from "@/components/community/site/links";

/** 231 The admin opens on the verification requests. */
export default function AdminIndex() {
  redirect(cmLinks.admin("verifications"));
}
