"use client";

import Link from "next/link";
import { useActionState } from "react";
import { logInAction, newPasswordAction, resetAction, signUpAction } from "@/app/community/(site)/auth-actions";
import { Note } from "./forms";
import { cmLinks } from "./links";
import type { CmWords } from "./words";

export function SignUpForm({ w, next }: { w: CmWords; next: string }) {
  const [state, action, pending] = useActionState(signUpAction, undefined);
  return (
    <form action={action} id="email">
      <input type="hidden" name="next" value={next} />
      <label className="cm-field">{w.name}<input name="name" required maxLength={80} autoComplete="name" /></label>
      <label className="cm-field">{w.email}<input name="email" type="email" required maxLength={191} autoComplete="email" /></label>
      <label className="cm-field">{w.password}<input name="password" type="password" required minLength={8} maxLength={200} autoComplete="new-password" /><small>{w.passwordHint}</small></label>
      <Note state={state} />
      <button type="submit" className="cm-btn o cm-wide" disabled={pending} style={{ marginTop: 16 }}>{w.signUp}</button>
      <p className="cm-muted cm-fine">{w.agree}</p>
    </form>
  );
}

export function LogInForm({ w, next }: { w: CmWords; next: string }) {
  const [state, action, pending] = useActionState(logInAction, undefined);
  return (
    <form action={action} id="email">
      <input type="hidden" name="next" value={next} />
      <label className="cm-field">{w.email}<input name="email" type="email" required autoComplete="email" /></label>
      <label className="cm-field">{w.password}<input name="password" type="password" required autoComplete="current-password" /></label>
      <Note state={state} />
      <button type="submit" className="cm-btn o cm-wide" disabled={pending} style={{ marginTop: 16 }}>{w.logIn}</button>
      <p className="cm-fine"><Link href={cmLinks.home() + "/reset-password"} className="cm-link">{w.forgotPassword}</Link></p>
    </form>
  );
}

export function ResetForm({ w }: { w: CmWords }) {
  const [state, action, pending] = useActionState(resetAction, undefined);
  return (
    <form action={action}>
      <label className="cm-field">{w.email}<input name="email" type="email" required autoComplete="email" /></label>
      <Note state={state} />
      <button type="submit" className="cm-btn o cm-wide" disabled={pending} style={{ marginTop: 16 }}>{w.sendResetLink}</button>
    </form>
  );
}

export function NewPasswordForm({ w, token }: { w: CmWords; token: string }) {
  const [state, action, pending] = useActionState(newPasswordAction, undefined);
  return (
    <form action={action}>
      <input type="hidden" name="token" value={token} />
      <label className="cm-field">{w.newPassword}<input name="password" type="password" required minLength={8} maxLength={200} autoComplete="new-password" /><small>{w.passwordHint}</small></label>
      <Note state={state} />
      <button type="submit" className="cm-btn o cm-wide" disabled={pending} style={{ marginTop: 16 }}>{w.setPassword}</button>
    </form>
  );
}
