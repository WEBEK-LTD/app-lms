import type { MySql2Database } from "drizzle-orm/mysql2";
import type * as communitySchema from "../../db/community-schema";

/** 231 The community's tables through drizzle, on the same database as the rest of Yallapp. */
export type CommunityDb = MySql2Database<typeof communitySchema>;

/** MySQL's code for a unique key already taken. */
export function isDuplicate(error: unknown): boolean {
  let e: unknown = error;
  for (let i = 0; i < 4 && e && typeof e === "object"; i++) {
    if ((e as { code?: unknown }).code === "ER_DUP_ENTRY") return true;
    e = (e as { cause?: unknown }).cause;
  }
  return false;
}
