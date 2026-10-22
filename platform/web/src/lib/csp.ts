/**
 * 69 The pages' Content-Security-Policy: no <base> or plugin content from
 * elsewhere, never framed (next.config.ts sends it on every page; kept apart
 * from the nonce's helpers, lib/csp-nonce.ts, since next.config.ts loads it).
 */
export const PAGE_CSP = "base-uri 'self'; object-src 'none'; frame-ancestors 'none'";
