"use client";

import Link from "next/link";
import { useState } from "react";
import { continueAction } from "@/app/community/(site)/auth-actions";
import type { FormState } from "@/app/community/(site)/actions";
import { Note } from "./forms";
import { cmHref, cmLinks } from "./links";
import type { CmWords } from "./words";

/**
 * 231 Continue with Apple, then Continue with Google (styled as Apple's,
 * with the G mark), then email. Apple's sign-in opens in Apple's window
 * (Sign in with Apple JS); Google's is its OpenID page, which comes back to
 * /community/auth/google with the identity token. The ids come from the
 * environment; without them the buttons say sign-in that way isn't ready.
 */

type Providers = { apple: { clientId: string; redirectUri: string } | null; google: { clientId: string } | null };

declare global {
  interface Window {
    AppleID?: { auth: { init(o: Record<string, unknown>): void; signIn(): Promise<{ authorization: { id_token: string }; user?: { name?: { firstName?: string; lastName?: string } } }> } };
  }
}

const APPLE_JS = "https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/en_US/appleid.auth.js";
export const GOOGLE_STATE_KEY = "yc-google-auth";

function randomToken(): string {
  const a = new Uint8Array(24);
  crypto.getRandomValues(a);
  return Array.from(a, (b) => b.toString(16).padStart(2, "0")).join("");
}

async function sha256(text: string): Promise<string> {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(d), (b) => b.toString(16).padStart(2, "0")).join("");
}

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) return resolve();
    const s = document.createElement("script");
    s.src = src;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("load"));
    document.head.appendChild(s);
  });
}

export function GoogleMark() {
  return (
    <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  );
}

export function AppleMark() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="currentColor" d="M16.4 12.6c0-2.6 2.1-3.8 2.2-3.9-1.2-1.8-3.1-2-3.7-2-1.6-.2-3.1.9-3.9.9-.8 0-2-.9-3.4-.9-1.7 0-3.3 1-4.2 2.6-1.8 3.1-.5 7.7 1.3 10.2.9 1.2 1.9 2.6 3.2 2.6 1.3-.1 1.8-.8 3.3-.8 1.6 0 2 .8 3.4.8 1.4 0 2.3-1.3 3.1-2.5 1-1.4 1.4-2.8 1.4-2.9-.1 0-2.7-1-2.7-4.1zM13.9 5c.7-.9 1.2-2 1.1-3.2-1 0-2.3.7-3 1.6-.7.8-1.3 2-1.1 3.1 1.1.1 2.3-.6 3-1.5z" />
    </svg>
  );
}

/** Yallapp's own mark (its rounded app icon). */
export function YallappMark() {
  // eslint-disable-next-line @next/next/no-img-element -- a tiny SVG
  return <img src="/brand/yallapp-icon-dark-rounded.svg" alt="" width={20} height={20} aria-hidden="true" />;
}

export function ProviderButtons({ w, providers, next, emailHref, emailLabel }: { w: CmWords; providers: Providers; next: string; emailHref?: string; emailLabel?: string }) {
  const [state, setState] = useState<FormState>(undefined);
  const [busy, setBusy] = useState(false);
  const notReady = () => setState({ error: w.errorNotReady, at: Date.now() });

  const apple = async () => {
    if (!providers.apple) return notReady();
    setBusy(true);
    try {
      await loadScript(APPLE_JS);
      const nonce = randomToken();
      window.AppleID?.auth.init({ clientId: providers.apple.clientId, scope: "name email", redirectURI: providers.apple.redirectUri, usePopup: true, nonce: await sha256(nonce) });
      const r = await window.AppleID!.auth.signIn();
      const name = [r.user?.name?.firstName, r.user?.name?.lastName].filter(Boolean).join(" ") || undefined;
      setState(await continueAction("apple", { idToken: r.authorization.id_token, nonce, name, next }));
    } catch {
      // Closed Apple's window, or Apple's script didn't load.
      setState({ error: w.errorProvider, at: Date.now() });
    } finally {
      setBusy(false);
    }
  };

  const google = () => {
    if (!providers.google) return notReady();
    const nonce = randomToken();
    const stateToken = randomToken();
    try {
      sessionStorage.setItem(GOOGLE_STATE_KEY, JSON.stringify({ state: stateToken, nonce, next }));
    } catch {
      return setState({ error: w.errorProvider, at: Date.now() });
    }
    const q = new URLSearchParams({
      client_id: providers.google.clientId,
      redirect_uri: `${window.location.origin}${cmLinks.home()}/auth/google`,
      response_type: "id_token",
      scope: "openid email profile",
      nonce,
      state: stateToken,
      prompt: "select_account",
    });
    window.location.assign(`https://accounts.google.com/o/oauth2/v2/auth?${q}`);
  };

  return (
    <div className="cm-auth-btns">
      <button type="button" className="cm-abtn w" onClick={apple} disabled={busy}>
        <AppleMark />
        {w.continueApple}
      </button>
      <button type="button" className="cm-abtn w" onClick={google} disabled={busy}>
        <GoogleMark />
        {w.continueGoogle}
      </button>
      {/* 231 A link, not a script: the site's own route keeps the PKCE verifier and sends the browser to Yallapp. */}
      <a href={`${cmHref("/auth/yallapp")}?${new URLSearchParams({ next })}`} className="cm-abtn w">
        <YallappMark />
        {w.continueYallapp}
      </a>
      {emailHref ? (
        <Link href={emailHref} className="cm-abtn o">
          <span className="ms" aria-hidden="true">mail</span>
          {emailLabel ?? w.signUpEmail}
        </Link>
      ) : null}
      <Note state={state} />
    </div>
  );
}
