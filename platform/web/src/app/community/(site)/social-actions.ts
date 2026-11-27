"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { cmTarget } from "@/components/community/site/redirect";
import { siteContext } from "@/components/community/site/context";
import { cmLinks } from "@/components/community/site/links";
import * as source from "@/components/community/site/source";
import type { FormState } from "./actions";
import { profileLinks } from "@/components/community/site/profile-links";

/** 231 Follow, friends, block and the member's own profile. */

function text(form: FormData, name: string): string {
  const v = form.get(name);
  return typeof v === "string" ? v.trim() : "";
}

async function member(back: string) {
  const { viewer, w } = await siteContext();
  if (!viewer) redirect(await cmTarget(cmLinks.signIn(back)));
  return { viewer, w };
}

export async function followAction(form: FormData): Promise<void> {
  const back = text(form, "back");
  await member(back);
  await source.follow(text(form, "memberId"), text(form, "on") === "1").catch(() => undefined);
  revalidatePath(back);
}

const FRIEND_ACTS = ["request", "accept", "decline", "cancel", "remove"] as const;

export async function friendAction(form: FormData): Promise<void> {
  const back = text(form, "back");
  await member(back);
  const act = FRIEND_ACTS.find((a) => a === text(form, "act"));
  if (act) await source.friend(text(form, "memberId"), act, text(form, "requestId") || undefined).catch(() => undefined);
  revalidatePath(back);
}

export async function blockAction(form: FormData): Promise<void> {
  const back = text(form, "back");
  await member(back);
  await source.block(text(form, "memberId"), text(form, "on") === "1").catch(() => undefined);
  revalidatePath(back);
}

const HANDLE = /^[a-z0-9_.]{3,30}$/;


export async function profileAction(_prev: FormState, form: FormData): Promise<FormState> {
  const { w } = await member(cmLinks.editProfile());
  const name = text(form, "name").slice(0, 60);
  const handle = text(form, "handle").toLowerCase();
  const bio = text(form, "bio").slice(0, 300);
  const skills = text(form, "skills").split(",").map((s) => s.trim()).filter(Boolean).slice(0, 12).map((s) => s.slice(0, 30));
  const links = profileLinks(text(form, "links"));
  if (!links) return { error: w.errorLinks, at: Date.now() };
  if (name.length < 2) return { error: w.errorName, at: Date.now() };
  if (!HANDLE.test(handle)) return { error: w.errorHandle, at: Date.now() };
  const avatar = form.get("avatar");
  if (avatar instanceof File && avatar.size > 0 && (avatar.size > 5 * 1024 * 1024 || !/^image\/(png|jpeg|webp)$/.test(avatar.type))) return { error: w.errorAvatar, at: Date.now() };
  const saved = await source.updateProfile({ name, handle, bio, skills, links });
  if (!saved.ok) return { error: saved.code === "username_taken" ? w.errorHandleTaken : saved.code === "invalid_request" && saved.errors?.username ? w.errorHandle : w.errorGeneric, at: Date.now() };
  const pic = avatar instanceof File && avatar.size > 0 ? await source.setAvatar(avatar) : text(form, "removeAvatar") === "1" ? await source.setAvatar(null) : { ok: true as const };
  if (!pic.ok) return { error: w.errorAvatar, at: Date.now() };
  revalidatePath(cmLinks.member(handle));
  return { ok: w.profileSaved, at: Date.now() };
}
