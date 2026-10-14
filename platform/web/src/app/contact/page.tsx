import type { Metadata } from "next";
import Link from "next/link";
import { Icon } from "@/components/icon";
import type { IconName } from "@/components/icon-names";
import { getSiteContent } from "@/lib/content/get";
import { MarketingPage, Section } from "@/components/marketing";
import { getContact, type Contact } from "@/lib/contact";

export const metadata: Metadata = {
  title: "Contact",
  description: "Talk to the Yallapp team on WhatsApp or by email.",
};

const channels = (contact: Contact): { icon: IconName; title: string; text: string; href: string; label: string }[] => [
  {
    icon: "chat",
    title: "WhatsApp",
    text: "The fastest way to reach us: plans, payment, account activation and support.",
    href: contact.whatsappUrl,
    label: contact.whatsappDisplay,
  },
  {
    icon: "mail",
    title: "Email",
    text: "For anything you'd rather put in writing, including refund requests.",
    href: `mailto:${contact.email}`,
    label: contact.email,
  },
];

export default async function ContactPage() {
  const CHANNELS = channels(await getContact());
  const text = await getSiteContent("contact");
  return (
    <MarketingPage
      current="contact"
      eyebrow={text.eyebrow}
      title={text.title!}
      intro={text.intro!}
    >
      <Section>
        <div className="grid max-w-[900px] gap-5 [grid-template-columns:repeat(auto-fit,minmax(min(320px,100%),1fr))]">
          {CHANNELS.map((channel) => (
            <div key={channel.title} className="flex flex-col gap-3 rounded-2xl border border-line p-6 sm:p-7">
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-ivory text-midnight">
                <Icon name={channel.icon} size={26} />
              </span>
              <h2 className="m-0 text-xl font-bold">{channel.title}</h2>
              <p className="m-0 text-[15px] leading-relaxed text-ink-4">{channel.text}</p>
              <a href={channel.href} className="mt-auto text-lg font-bold">
                {channel.label}
              </a>
            </div>
          ))}
        </div>
      </Section>
      <Section tinted>
        <div className="flex max-w-[900px] flex-wrap gap-5">
          <div className="flex flex-[1_1_320px] gap-4 rounded-2xl border border-line bg-white p-6">
            <Icon name="apartment" size={26} className="flex-none" />
            <div className="flex flex-col gap-1 text-[15px]">
              <h2 className="m-0 text-lg font-bold">WEBEK LTD</h2>
              <span>Registered in England and Wales</span>
              <span>Company no. 16326894</span>
            </div>
          </div>
          <div className="flex flex-[1_1_320px] gap-4 rounded-2xl border border-line bg-white p-6">
            <Icon name="location_on" size={26} className="flex-none" />
            <div className="flex flex-col gap-1 text-[15px]">
              <h2 className="m-0 text-lg font-bold">Registered office</h2>
              <span>71-75 Shelton Street, Covent Garden</span>
              <span>London, United Kingdom, WC2H 9JQ</span>
            </div>
          </div>
        </div>
        <p className="m-0 max-w-[900px] text-[15px] text-ink-4">
          Already a client? <Link href="/sign-in">Sign in</Link> to your dashboard for your app, builds and downloads, or read the{" "}
          <Link href="/docs">documentation</Link>.
        </p>
      </Section>
    </MarketingPage>
  );
}
