import { THEME_SCRIPT } from "../components/theme-script";
import { PAGE_CSP } from "./csp";

let themeHash: Promise<string> | null = null;

/** The hash of the theme script, the one inline script of ours (components/theme-script.tsx). */
export function themeScriptHash(): Promise<string> {
  themeHash ??= crypto.subtle.digest("SHA-256", new TextEncoder().encode(THEME_SCRIPT)).then((digest) => `'sha256-${btoa(String.fromCharCode(...new Uint8Array(digest)))}'`);
  return themeHash;
}

/** A fresh nonce for one page: 16 random bytes, base64. */
export function newNonce(): string {
  return btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(16))));
}

/**
 * 69.12 The policy of a page rendered for each request (src/proxy.ts): scripts
 * only with this request's nonce (Next.js gives it to its own) or the theme
 * script's hash, and what those load ('strict-dynamic'). Development also
 * needs 'unsafe-eval' (React's debugging).
 */
export function noncePolicy(nonce: string, hash: string, dev = false): string {
  return `${PAGE_CSP}; script-src 'self' 'nonce-${nonce}' 'strict-dynamic' ${hash}${dev ? " 'unsafe-eval'" : ""}`;
}
