"use client";

import { useEffect, useState } from "react";
import { continueAction } from "@/app/community/(site)/auth-actions";
import type { FormState } from "@/app/community/(site)/actions";
import { GOOGLE_STATE_KEY } from "./auth-buttons";
import { Note } from "./forms";
import type { CmWords } from "./words";

/** Back from Google's page: the identity token is in the address's fragment; it is checked against the state this browser kept. */
export function GoogleReturn({ w }: { w: CmWords }) {
  const [state, setState] = useState<FormState>(undefined);
  useEffect(() => {
    void (async () => {
    const got = new URLSearchParams(window.location.hash.slice(1));
    let kept: { state: string; nonce: string; next: string } | null = null;
    try {
      kept = JSON.parse(sessionStorage.getItem(GOOGLE_STATE_KEY) ?? "null");
      sessionStorage.removeItem(GOOGLE_STATE_KEY);
    } catch {
      kept = null;
    }
    // The token never stays in the address or the history.
    history.replaceState(null, "", window.location.pathname);
    const token = got.get("id_token");
    if (!kept || !token || got.get("state") !== kept.state) {
      setState({ error: w.errorProvider, at: Date.now() });
      return;
    }
    try {
      setState(await continueAction("google", { idToken: token, nonce: kept.nonce, next: kept.next }));
    } catch {
      setState({ error: w.errorProvider, at: Date.now() });
    }
    })();
  }, [w]);
  return state ? <Note state={state} /> : <p className="cm-muted">{w.signingIn}</p>;
}
