import type { Metadata } from "next";
import Link from "next/link";
import { DocLayout, DocTitle, legalNav } from "@/components/doc-layout";
import { Icon } from "@/components/icon";
import { formatMessage, messagesFor, type Lang } from "@/i18n";
import { localePath } from "@/i18n/paths";
import { richText } from "@/i18n/rich";
import { DELETION_DAYS } from "@/lib/account/deletion";
import { getContact } from "@/lib/contact";
import { siteMetadata } from "@/lib/seo";

/**
 * 66 /delete-account (and /ar, /tr): how the people who run an app on
 * Yallapp delete their Yallapp account, without the app: from the dashboard,
 * or by email when they can't sign in; what is deleted, what is kept and for
 * how long. The address given to Google Play (Data safety) and the App Store.
 */

export function deleteAccountMetadata(lang: Lang): Metadata {
  const m = messagesFor(lang).meta;
  return siteMetadata(lang, { title: m.deleteAccountTitle, description: m.deleteAccountDescription, path: "/delete-account" });
}

export async function DeleteAccountPage({ lang }: { lang: Lang }) {
  const contact = await getContact();
  const m = messagesFor(lang).deleteAccount;
  const fill = (message: string, values: Record<string, string | number>) => formatMessage(lang, message, values);
  const tags = {
    b: (chunk: string) => <strong>{chunk}</strong>,
    signin: (chunk: string) => <Link href={localePath(lang, "/sign-in")}>{chunk}</Link>,
    refund: (chunk: string) => <Link href={localePath(lang, "/refund")}>{chunk}</Link>,
    privacy: (chunk: string) => <Link href={localePath(lang, "/privacy")}>{chunk}</Link>,
  };
  const email = (
    <a href={`mailto:${contact.email}`} dir="ltr">
      {contact.email}
    </a>
  );
  // The email address goes where {email} is, as a link.
  const [beforeEmail, afterEmail] = m.howEmail.split("{email}");
  return (
    <DocLayout groups={legalNav(lang)} current={localePath(lang, "/delete-account")} lang={lang}>
      <DocTitle>{m.title}</DocTitle>
      <p>{m.intro}</p>
      <p className="!m-0 flex gap-2.5 rounded-xl bg-peach px-4 py-3 text-[15px] text-ink-2">
        <Icon name="info" size={22} className="mt-0.5 text-accent" />
        <span>{m.appUsers}</span>
      </p>

      <h2>{m.howTitle}</h2>
      <ul>
        <li>{richText(m.howDashboard, tags)}</li>
        <li data-delete-email="">
          {richText(beforeEmail ?? "", tags)}
          {email}
          {richText(afterEmail ?? "", tags)}
        </li>
        <li>{richText(m.howTeam, tags)}</li>
      </ul>

      <h2>{m.whatTitle}</h2>
      <ul>
        <li>{m.whatAccount}</li>
        <li>{m.whatApps}</li>
        <li>{m.whatKeys}</li>
        <li>{m.whatTeam}</li>
      </ul>

      <h2>{m.keptTitle}</h2>
      <ul>
        <li>{m.keptBilling}</li>
        <li>{m.keptRequest}</li>
        <li>{m.keptLogs}</li>
        <li>{m.keptStores}</li>
      </ul>

      <h2>{m.whenTitle}</h2>
      <p>{fill(m.when, { days: DELETION_DAYS })}</p>
      <p>{richText(m.plans, tags)}</p>
      <p>{richText(m.more, tags)}</p>
    </DocLayout>
  );
}
