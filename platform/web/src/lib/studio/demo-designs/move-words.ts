/**
 * 130.7–130.12 The words of Masar Rides's, Lamha Taxi's and Safra's
 * Signature looks (`studio.w_<word>` in i18n/dashboard/studio.ts, in the
 * dashboard's English, Egyptian Arabic and Turkish): part of Studio's
 * `SectionWord` (lib/studio/sections.ts).
 */
export type MoveWord =
  // 130.7 Masar A: the districts on the living map, the driver's minutes and the pickup, the fare a class starts from.
  | "sigZamalek"
  | "sigDowntown"
  | "sigTahrir"
  | "sigThreeMin"
  | "sigPickup"
  | "sigFareFrom"
  | "sigOnTheWay"
  // 130.8 Masar B: the horizon.
  | "sigGardenCity"
  | "sigWhereToName"
  | "sigCurrency"
  | "sigFromFourSeats"
  | "sigFromSevenSeats";
