import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ProviderButtons } from "@/components/community/site/auth-buttons";
import { LogInForm } from "@/components/community/site/auth-forms";
import { AuthShell } from "@/components/community/site/auth-shell";
import { siteContext } from "@/components/community/site/context";
import { cmLinks } from "@/components/community/site/links";
import { authProviders } from "@/components/community/site/source";

export const metadata: Metadata = { title: "Log in", robots: { index: false } };

function nextOf(v: string | undefined): string {
  return v && v.startsWith(cmLinks.home()) && !v.startsWith("//") ? v : cmLinks.home();
}

/** 231 Log in: Apple, Google, then email and password. */
export default async function SignInPage({ searchParams }: { searchParams: Promise<{ next?: string; reset?: string }> }) {
  const sp = await searchParams;
  const next = nextOf(sp.next);
  const { lang, w, viewer } = await siteContext();
  if (viewer) redirect(next);
  return (
    <AuthShell w={w} lang={lang}>
      <h1>{w.logIn}</h1>
      {sp.reset ? <div className="cm-note ok" role="status" style={{ marginBottom: 14 }}><span className="ms f">check_circle</span>{w.passwordChanged}</div> : null}
      <ProviderButtons w={w} providers={authProviders()} next={next} />
      <div className="cm-or"><span>{w.or}</span></div>
      <LogInForm w={w} next={next} />
      <p className="cm-fine">{w.newHere} <Link href={cmLinks.signUp(next)} className="cm-strong">{w.signUp}</Link></p>
    </AuthShell>
  );
}
