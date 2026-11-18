import "server-only";
import { payoutTestDays } from "../env";

/**
 * 106.11 The clock of Studio Market's payouts: which month's run it is, its
 * cut-off, and the days the team records (prepared, sent). The real time,
 * except in end-to-end tests, where STUDIO_MARKET_PAYOUT_TEST_DAYS moves it
 * on (refused on Netlify) so a sale paid during the test is before a 1st.
 * The ledger keeps each sale's real payment time.
 */
export function payoutNow(): Date {
  return new Date(Date.now() + payoutTestDays() * 86_400_000);
}
