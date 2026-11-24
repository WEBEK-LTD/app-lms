/* eslint-disable @typescript-eslint/no-unused-vars -- stubs the other areas fill in */
import type { CommunityContext } from "./http";

/**
 * 231 A member's Q&A numbers on their profile (area B fills this from its
 * questions and answers; published ones only).
 */
export interface QaStats {
  questions: number;
  answers: number;
  acceptedAnswers: number;
}

export async function qaStats(_ctx: CommunityContext, _memberId: string): Promise<QaStats> {
  return { questions: 0, answers: 0, acceptedAnswers: 0 };
}
