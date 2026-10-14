import { DocLayout, DocTitle, LEGAL_NAV, LastUpdated } from "./doc-layout";
import { Markdown } from "./markdown";
import { getContact } from "@/lib/contact";
import { getSiteContent } from "@/lib/content/get";
import { fillValues } from "@/lib/content/markdown";

/** Terms, privacy and refund pages: their text from the admin (Website content), with the contact details filled in. */
export async function LegalPage({ contentKey, path }: { contentKey: "privacy" | "terms" | "refund"; path: string }) {
  const [contact, text] = await Promise.all([getContact(), getSiteContent(contentKey)]);
  const body = fillValues(text.body!, {
    contact_email: contact.email,
    contact_whatsapp: contact.whatsappDisplay,
    contact_whatsapp_url: contact.whatsappUrl,
  });
  return (
    <DocLayout groups={LEGAL_NAV} current={path}>
      <DocTitle>{text.title}</DocTitle>
      <LastUpdated date={text.updated!} />
      <Markdown source={body} />
    </DocLayout>
  );
}
