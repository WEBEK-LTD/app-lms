import type { Metadata } from "next";
import { revalidatePath } from "next/cache";
import { AuthShell } from "@/components/auth-shell";
import { DocumentLang } from "@/components/dashboard-i18n";
import { btn } from "@/components/ui";
import { getStore } from "@/lib/data";
import { signingSecret } from "@/lib/env";
import { recipientOfToken, resubscribe, UNSUBSCRIBE_TEXT, unsubscribeRecipient } from "@/lib/mailing/consent";
import type { MailLang } from "@/lib/mailing/types";

/**
 * 114 /unsubscribe/<token>: a campaign email's unsubscribe page, in the
 * recipient's language (English, Arabic or Turkish). One button stops the
 * marketing emails; a second one undoes it. The page doesn't unsubscribe on
 * its own when opened, because mail scanners open links; the inbox's own
 * button (List-Unsubscribe) does it in one click.
 */
export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Unsubscribe", robots: { index: false, follow: false } };

function fill(text: string, email: string): string {
  return text.replace("{email}", email);
}

export default async function UnsubscribePage({ params, searchParams }: PageProps<"/unsubscribe/[token]">) {
  const { token } = await params;
  const query = await searchParams;
  const store = await getStore();
  const found = token === "test" ? null : await recipientOfToken(store, token, signingSecret());
  const lang: MailLang = found?.lang ?? (query.lang === "ar" || query.lang === "tr" ? query.lang : "en");
  const t = UNSUBSCRIBE_TEXT[lang];
  const dir = lang === "ar" ? "rtl" : "ltr";
  const suppression = found ? await store.getMailSuppression(found.recipient.email) : null;
  const state = query.done === "again" ? "again" : suppression ? "out" : "ask";
  // One of the admin's contacts has no account: nothing about account emails or settings.
  const contact = Boolean(found?.recipient.contactId && !found.recipient.userId);

  async function unsubscribe() {
    "use server";
    const s = await getStore();
    const r = await recipientOfToken(s, token, signingSecret());
    if (r) await unsubscribeRecipient(s, r.recipient, new Date());
    revalidatePath(`/unsubscribe/${token}`);
  }

  async function subscribeAgain() {
    "use server";
    const s = await getStore();
    const r = await recipientOfToken(s, token, signingSecret());
    if (r) await resubscribe(s, r.recipient.email);
    const { redirect } = await import("next/navigation");
    redirect(`/unsubscribe/${token}?done=again`);
  }

  return (
    <AuthShell footer={false} lang={lang}>
      <DocumentLang lang={lang} />
      <main lang={lang} dir={dir} className="flex flex-1 items-center justify-center px-4 pt-6 pb-14 sm:px-6">
        <section className="flex w-full max-w-[520px] flex-col gap-5 rounded-[20px] border border-line bg-white px-5 py-10 sm:px-9">
          {token === "test" ? (
            <>
              <h1 className="m-0 text-[26px] font-extrabold tracking-[-0.5px]">{t.title}</h1>
              <p className="m-0 text-base leading-relaxed text-ink-4">{t.test}</p>
            </>
          ) : !found ? (
            <>
              <h1 className="m-0 text-[26px] font-extrabold tracking-[-0.5px]">{t.title}</h1>
              <p className="m-0 text-base leading-relaxed text-ink-4">{t.invalid}</p>
            </>
          ) : state === "ask" || state === "again" ? (
            <>
              <h1 className="m-0 text-[26px] font-extrabold tracking-[-0.5px]">{state === "again" ? t.againDone : t.title}</h1>
              {state === "ask" ? <p className="m-0 text-base leading-relaxed text-ink-4">{fill(t.ask, found.recipient.email)}</p> : null}
              <form action={unsubscribe}>
                <button type="submit" className={`${btn.primary} h-[50px] w-full cursor-pointer`} data-testid="unsubscribe">
                  {t.button}
                </button>
              </form>
              <p className="m-0 text-sm text-ink-4">{contact ? t.noteContact : t.note}</p>
            </>
          ) : (
            <>
              <h1 className="m-0 text-[26px] font-extrabold tracking-[-0.5px]">{t.done}</h1>
              <p className="m-0 text-base leading-relaxed text-ink-4">{fill(contact ? t.doneBodyContact : t.doneBody, found.recipient.email)}</p>
              {suppression?.reason === "unsubscribed" ? (
                <form action={subscribeAgain}>
                  <button type="submit" className={`${btn.secondary} h-[50px] w-full cursor-pointer`} data-testid="resubscribe">
                    {t.again}
                  </button>
                </form>
              ) : null}
            </>
          )}
        </section>
      </main>
    </AuthShell>
  );
}
