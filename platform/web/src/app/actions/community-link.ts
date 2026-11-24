"use server";

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { onYallappLinkChanged } from "@/lib/community/api/trust-hooks";
import { confirmLink } from "@/lib/community/base/linking";
import { communityDeps } from "@/lib/community/deps";

/**
 * 231 "Link my account" on yallapp.com.tr/link-community: the signed-in
 * Yallapp user's account becomes the community member's (lib/community/base/linking.ts).
 * The page shows the outcome from `done` or `error`.
 */
export async function confirmCommunityLinkAction(form: FormData): Promise<void> {
  const state = String(form.get("state") ?? "");
  const back = form.get("return") === "app" ? "app" : "web";
  const user = await getCurrentUser();
  if (!user) redirect(`/api/community-link/sign-in?state=${encodeURIComponent(state)}&return=${back}`);
  const deps = await communityDeps({ ip: "" });
  const result = await confirmLink(deps, state, user.id);
  if (!result.ok) redirect(`/link-community?error=${result.code}&return=${back}`);
  await onYallappLinkChanged({ deps, store: deps.store, now: deps.now }, result.member.id);
  redirect(`/link-community?done=${encodeURIComponent(result.member.username)}&return=${back}&lang=${result.member.language}`);
}
