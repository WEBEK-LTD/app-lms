/**
 * 178 / 220 The words of the store review driver's sample ride and car. They
 * are kept in English (as made, and as the phones' review flow has always
 * read them); the dashboard writes them in its own language
 * (`sampleWords`, the rides dictionary's `known` texts), never the owner's
 * own addresses or cars.
 */

/**
 * 178 The rider of the review driver's sample rides. They are the review
 * account's, so the riders' app (the same review number) leaves them out of
 * its rides and of "You already have a ride on the way"; 220 the drivers'
 * statements leave them out too.
 */
export const SAMPLE_RIDER_NAME = "App Review (sample)";

export const SAMPLE_CAR = "Sample car";
export const SAMPLE_PICKUP = "Sample pickup, 1 Example Street";
export const SAMPLE_DROPOFF = "Sample drop-off, 2 Example Street";
export const SAMPLE_NOTE = "Sample ride for the store review";

/** 220 What a sample ride covers, kilometres and minutes. */
export const SAMPLE_KM = 3;
export const SAMPLE_MINUTES = 10;

/** 220 The sample's fare when the company has no fares set yet: 50 of its currency (₺50.00, E£50.00, 50.00 د.م.), not 0.00. */
export const SAMPLE_FALLBACK_CENTS = 50_00;

const WORDS = new Set([SAMPLE_RIDER_NAME, SAMPLE_CAR, SAMPLE_PICKUP, SAMPLE_DROPOFF, SAMPLE_NOTE]);

/** A sample's own words in the dashboard's language (`k`); anything else as written. */
export function sampleWords(text: string, k: (english: string) => string): string;
export function sampleWords(text: string | null, k: (english: string) => string): string | null;
export function sampleWords(text: string | null, k: (english: string) => string): string | null {
  return text !== null && WORDS.has(text) ? k(text) : text;
}
