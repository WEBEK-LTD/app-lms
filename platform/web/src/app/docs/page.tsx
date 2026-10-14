import type { Metadata } from "next";
import Link from "next/link";
import { DocsShell, docsNavGroups } from "@/components/docs-shell";
import { Icon } from "@/components/icon";
import type { IconName } from "@/components/icon-names";
import type { DocSection } from "@/content/docs";
import { getContact } from "@/lib/contact";
import { getSiteContent } from "@/lib/content/get";

export async function generateMetadata(): Promise<Metadata> {
  const text = await getSiteContent("docs");
  return { title: "Documentation", description: text.intro };
}

const SECTION_ICONS: Record<DocSection, IconName> = {
  "Getting started": "explore",
  "Your content": "link",
  "Your app": "smartphone",
  Publishing: "upload",
  "Selling and bookings": "storefront",
  "Account and billing": "account_circle",
  Troubleshooting: "help",
  "For developers": "code",
};

const START_HERE = [
  { href: "/docs/getting-started", label: "Welcome to Yallapp", icon: "explore" },
  { href: "/docs/content-sources", label: "Where your content comes from", icon: "link" },
  { href: "/docs/setup-steps", label: "The setup steps", icon: "list" },
  { href: "/docs/google-play", label: "Publish on Google Play", icon: "android" },
] as const;

export default async function DocsIndexPage() {
  const [text, groups, contact] = await Promise.all([getSiteContent("docs"), docsNavGroups(), getContact()]);
  return (
    <DocsShell current="/docs">
      <div className="flex flex-col gap-3">
        {text.eyebrow ? <span className="flex h-[30px] items-center self-start rounded-[15px] bg-peach px-3 text-[13px] font-bold">{text.eyebrow}</span> : null}
        <h1 className="m-0 text-[32px] leading-[1.1] font-extrabold tracking-[-0.5px] sm:text-[42px]">{text.title}</h1>
        <p className="m-0 max-w-[640px] text-lg leading-relaxed text-ink-4">{text.intro}</p>
      </div>

      <section aria-labelledby="start-here" className="flex flex-col gap-3">
        <h2 id="start-here" className="m-0 text-xl font-bold">
          Start here
        </h2>
        <ul className="m-0 grid list-none gap-3 p-0 [grid-template-columns:repeat(auto-fit,minmax(min(200px,100%),1fr))]">
          {START_HERE.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className="flex h-full items-center gap-3 rounded-2xl border border-line bg-white p-4 font-bold text-midnight no-underline hover:border-midnight hover:text-midnight"
              >
                <Icon name={item.icon} size={24} />
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {groups.map((group) => (
        <section key={group.title} aria-labelledby={`docs-${group.title}`} className="flex flex-col gap-3 rounded-[20px] border border-line bg-white p-5 sm:p-7">
          <h2 id={`docs-${group.title}`} className="m-0 flex items-center gap-2.5 text-xl font-bold">
            <Icon name={SECTION_ICONS[group.title as DocSection]} size={24} />
            {group.title}
          </h2>
          <ul className="m-0 grid list-none gap-x-6 gap-y-4 p-0 [grid-template-columns:repeat(auto-fit,minmax(min(280px,100%),1fr))]">
            {group.links.map((link) => (
              <li key={link.href} className="flex flex-col gap-0.5">
                <Link href={link.href} className="font-bold">
                  {link.label}
                </Link>
                {link.description ? <span className="text-[15px] leading-snug text-ink-4">{link.description}</span> : null}
              </li>
            ))}
          </ul>
        </section>
      ))}

      <p className="m-0 flex flex-wrap items-center gap-2 text-[15px] text-ink-4">
        <Icon name="chat" size={20} />
        Can&apos;t find an answer? <a href={contact.whatsappUrl}>Message us on WhatsApp</a> or read the <Link href="/faq">FAQ</Link>.
      </p>
    </DocsShell>
  );
}
