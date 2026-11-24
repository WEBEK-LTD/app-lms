/* eslint-disable @typescript-eslint/no-unused-vars -- stubs the other areas fill in */
import type { CommunityTargetType } from "../types";
import type { CommunityContext } from "./http";

/**
 * 231 Whether a question, answer, tutorial or comment exists and who wrote
 * it (area B fills this in), for reports. Members are area A's own.
 */
export async function contentTarget(_ctx: CommunityContext, _type: Exclude<CommunityTargetType, "member">, _id: string): Promise<{ authorId: string } | null> {
  return { authorId: "" };
}
