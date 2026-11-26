"use server";

import { redirect } from "next/navigation";
import { cmLinks } from "@/components/community/site/links";
import { communityApi } from "@/lib/community/site-client";

/** 231 The one-tap link to the Yallapp account with the member's verified email, and saying no to it. */

/** Only the community's own pages are gone back to. */
function back(form: FormData): string {
  const to = String(form.get("back") ?? "");
  return to.startsWith(cmLinks.home()) && !to.startsWith("//") ? to : cmLinks.home();
}

export async function linkSuggestedAction(): Promise<void> {
  const r = await communityApi("POST", "/me/yallapp-link/suggested");
  redirect(`${cmLinks.settings()}?link=${r.status === 200 ? "suggested" : "unavailable"}`);
}

export async function dismissSuggestionAction(form: FormData): Promise<void> {
  await communityApi("DELETE", "/me/yallapp-link/suggested");
  redirect(back(form));
}
