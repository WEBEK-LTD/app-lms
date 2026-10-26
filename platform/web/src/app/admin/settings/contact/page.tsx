import type { Metadata } from "next";
import { ReadOnly } from "@/components/read-only";
import { can } from "@/lib/admin/permissions";
import { requireAdmin } from "@/lib/auth/session";
import { DEFAULT_CONTACT } from "@/lib/contact";
import { getStore } from "@/lib/data";
import type { PlatformSetting } from "@/lib/data/types";
import { platformSettings } from "@/lib/settings/platform";
import { ContactForm, PublishingSettingForm } from "../forms";
import { SavedBy, Section } from "../parts";

export const metadata: Metadata = { title: "Contact & publishing · Settings" };
export const dynamic = "force-dynamic";

/** 95.1 Settings › Contact & publishing: how clients reach Yallapp, and where "Publish it for me" requests go. */
export default async function ContactSettingsPage() {
  const { adminRole } = await requireAdmin();
  const settings = await platformSettings(await getStore(), { fresh: true });
  const contact = settings.get("contact") as PlatformSetting<"contact"> | undefined;
  const publishing = settings.get("publishing") as PlatformSetting<"publishing"> | undefined;
  return (
    <ReadOnly when={!can(adminRole, "settings.edit")} what="change platform settings">
      <Section
        id="h-contact"
        title="Contact details"
        text="How clients reach Yallapp: shown on every page of the website, in the dashboard and in emails. People in Egypt get the Egyptian WhatsApp number, everyone else the other one; where there's room both are shown with their labels."
      >
        <SavedBy setting={contact} settingKey="contact" reset="Use the defaults" fallback="the defaults." />
        <ContactForm
          whatsapp={contact?.value.whatsapp ?? DEFAULT_CONTACT.whatsapp}
          whatsappEgypt={contact?.value.whatsappEgypt || DEFAULT_CONTACT.whatsappEgypt}
          email={contact?.value.email ?? DEFAULT_CONTACT.email}
        />
      </Section>

      <Section
        id="h-publishing"
        title="Publishing service"
        text="“Publish it for me”: clients invite this email to their Google Play Console, App Store Connect and Firebase accounts, and new requests are sent to it."
      >
        <SavedBy
          setting={publishing}
          settingKey="publishing"
          reset="Use the contact email"
          fallback={`the contact email, ${contact?.value.email ?? DEFAULT_CONTACT.email}.`}
        />
        <PublishingSettingForm teamEmail={publishing?.value.teamEmail ?? contact?.value.email ?? DEFAULT_CONTACT.email} />
      </Section>
    </ReadOnly>
  );
}
