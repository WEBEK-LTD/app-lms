"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { siteContext } from "@/components/community/site/context";
import { cmLinks } from "@/components/community/site/links";
import * as source from "@/components/community/site/source";
import type { FormState } from "./actions";

/** 231 Follow, friends, block and the member's own profile. */

function text(form: FormData, name: string): string {
  const v = form.get(name);
  return typeof v === "string" ? v.trim() : "";
}

async function member(back: string) {
  const { viewer, w } = await siteContext();
  if (!viewer) redirect(cmLinks.signIn(back));
  return { viewer, w };
}

export async function followAction(form: FormData): Promise<void> {
  const back = text(form, "back");
  const { viewer } = await member(back);
  await source.follow(viewer.id, text(form, "memberId"), text(form, "on") === "1").catch(() => undefined);
  revalidatePath(back);
}

const FRIEND_ACTS = ["request", "accept", "decline", "cancel", "remove"] as const;

export async function friendAction(form: FormData): Promise<void> {
  const back = text(form, "back");
  const { viewer } = await member(back);
  const act = FRIEND_ACTS.find((a) => a === text(form, "act"));
  if (act) await source.friend(viewer.id, text(form, "memberId"), act).catch(() => undefined);
  revalidatePath(back);
}

export async function blockAction(form: FormData): Promise<void> {
  const back = text(form, "back");
  const { viewer } = await member(back);
  await source.block(viewer.id, text(form, "memberId"), text(form, "on") === "1").catch(() => undefined);
  revalidatePath(back);
}

const HANDLE = /^[a-z0-9_]{3,24}$/;

export async function profileAction(_prev: FormState, form: FormData): Promise<FormState> {
  const { viewer, w } = await member(cmLinks.editProfile());
  const name = text(form, "name").slice(0, 60);
  const handle = text(form, "handle").toLowerCase();
  const bio = text(form, "bio").slice(0, 300);
  const skills = text(form, "skills").split(",").map((s) => s.trim()).filter(Boolean).slice(0, 12).map((s) => s.slice(0, 30));
  if (name.length < 2) return { error: w.errorName, at: Date.now() };
  if (!HANDLE.test(handle)) return { error: w.errorHandle, at: Date.now() };
  try {
    await source.updateProfile(viewer.id, { name, handle, bio, skills });
    const avatar = form.get("avatar");
    if (avatar instanceof File && avatar.size > 0) {
      if (avatar.size > 5 * 1024 * 1024 || !/^image\/(png|jpeg|webp)$/.test(avatar.type)) return { error: w.errorAvatar, at: Date.now() };
      await source.setAvatar(viewer.id, avatar);
    } else if (text(form, "removeAvatar") === "1") {
      await source.setAvatar(viewer.id, null);
    }
  } catch (e) {
    const code = e instanceof Error ? e.message : "";
    return { error: code === "handle_taken" ? w.errorHandleTaken : code === "not_ready" ? w.errorNotReady : w.errorGeneric, at: Date.now() };
  }
  revalidatePath(cmLinks.member(handle));
  return { ok: w.profileSaved, at: Date.now() };
}
