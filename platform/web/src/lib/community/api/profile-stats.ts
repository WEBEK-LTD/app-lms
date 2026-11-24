import { withQa } from "../qa/hooks";
import { memberStats } from "../qa/service";
import type { CommunityContext } from "./http";

/** 231 A member's Q&A numbers on their profile (published questions and answers only). */
export interface QaStats {
  questions: number;
  answers: number;
  acceptedAnswers: number;
}

export async function qaStats(ctx: CommunityContext, memberId: string): Promise<QaStats> {
  const stats = await withQa(ctx.store.qa, {}, () => memberStats(memberId));
  return { questions: stats.questions, answers: stats.answers, acceptedAnswers: stats.acceptedAnswers };
}
