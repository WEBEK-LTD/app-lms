import { redirect } from "next/navigation";

/** The guides start with the publishing guide most clients look for first. */
export default function GuidesIndex() {
  redirect("/guides/google-play");
}
