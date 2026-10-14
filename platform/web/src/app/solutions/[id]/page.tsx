import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DeviceFrame } from "@/components/device-frame";
import { Icon } from "@/components/icon";
import { CheckList, MarketingPage, MoreLink, Section, SectionTitle } from "@/components/marketing";
import { getSiteContent } from "@/lib/content/get";
import { SOLUTIONS, solution } from "@/lib/marketing";

// Unknown app types get notFound() below.
export function generateStaticParams() {
  return SOLUTIONS.map((s) => ({ id: s.id }));
}

export async function generateMetadata({ params }: PageProps<"/solutions/[id]">): Promise<Metadata> {
  const s = solution((await params).id);
  if (!s) return {};
  const text = await getSiteContent(s.contentKey);
  return { title: `${s.name} apps`, description: text.intro };
}

export default async function SolutionPage({ params }: PageProps<"/solutions/[id]">) {
  const s = solution((await params).id);
  if (!s) notFound();
  const text = await getSiteContent(s.contentKey);
  const others = SOLUTIONS.filter((o) => o.id !== s.id);
  return (
    <MarketingPage current="solutions" eyebrow={text.eyebrow} title={text.title!} intro={text.intro!} aside={<DeviceFrame screen={s.screens[0]!} size="lg" priority />}>
      <Section>
        <SectionTitle title={`What makes a great ${s.name.toLowerCase()} app`} text={s.audience} />
        <div className="grid gap-5 [grid-template-columns:repeat(auto-fit,minmax(min(260px,100%),1fr))]">
          {s.highlights.map((h) => (
            <article key={h.title} className="flex flex-col gap-3 rounded-2xl border border-line p-6">
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-ivory">
                <Icon name={h.icon} size={26} />
              </span>
              <h3 className="m-0 text-lg font-bold">{h.title}</h3>
              <p className="m-0 text-[15px] leading-relaxed text-ink-4">{h.text}</p>
            </article>
          ))}
        </div>
      </Section>

      <Section tinted>
        <div className="flex flex-wrap items-start gap-10">
          <div className="flex min-w-0 flex-[1_1_420px] flex-col gap-8">
            <div className="flex flex-col gap-4">
              <h2 className="m-0 text-[26px] font-extrabold tracking-[-0.5px]">In the app</h2>
              <CheckList items={s.inTheApp} />
            </div>
            <div className="flex flex-col gap-4">
              <h2 className="m-0 text-[26px] font-extrabold tracking-[-0.5px]">For you</h2>
              <CheckList items={s.forYou} />
            </div>
          </div>
          <div className="flex min-w-0 flex-[1_1_300px] flex-wrap justify-center gap-5">
            {s.screens.slice(1).map((screen) => (
              <DeviceFrame key={screen} screen={screen} size="sm" />
            ))}
          </div>
        </div>
      </Section>

      <Section>
        <SectionTitle title="Where the content comes from" text="Choose one on the Website step of your setup. You can change it later." />
        <ul className="m-0 grid list-none gap-3 p-0 [grid-template-columns:repeat(auto-fit,minmax(min(300px,100%),1fr))]">
          {s.sources.map((source) => (
            <li key={source} className="flex gap-3 rounded-2xl border border-line p-5 text-[15px]">
              <Icon name="link" size={22} />
              {source}
            </li>
          ))}
        </ul>
        <div className="flex flex-col gap-3">
          <h3 className="m-0 text-lg font-bold">Step-by-step guides</h3>
          <ul className="m-0 flex list-none flex-wrap gap-x-6 gap-y-2 p-0">
            {s.docs.map((d) => (
              <li key={d.href}>
                <Link href={d.href} className="font-semibold">
                  {d.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <MoreLink href="/integrations">All integrations</MoreLink>
      </Section>

      <Section>
        <div className="flex flex-wrap items-center justify-between gap-6 rounded-[20px] bg-peach-soft p-6 sm:p-8">
          <div className="flex max-w-[620px] flex-col gap-2">
            <h2 className="m-0 text-[26px] font-extrabold tracking-[-0.5px]">Try a {s.name.toLowerCase()} app on your phone</h2>
            <p className="m-0 text-[16px] leading-relaxed text-ink-4">Install our {s.name.toLowerCase()} demo app with sample content and see how it works before you pay.</p>
          </div>
          <Link
            href={`/demo#${s.id}`}
            className="flex h-[50px] items-center gap-2.5 rounded-xl bg-midnight px-[22px] text-base font-bold text-white no-underline hover:bg-ink-3 hover:text-white"
          >
            <Icon name="smartphone" size={20} />
            Try the {s.name.toLowerCase()} demo
          </Link>
        </div>
      </Section>

      <Section tinted>
        <SectionTitle title="Other app types" />
        <div className="grid gap-5 [grid-template-columns:repeat(auto-fit,minmax(min(240px,100%),1fr))]">
          {others.map((o) => (
            <Link
              key={o.id}
              href={`/solutions/${o.id}`}
              className="flex items-start gap-4 rounded-2xl border border-line bg-white p-5 text-midnight no-underline hover:border-midnight hover:text-midnight"
            >
              <Icon name={o.icon} size={26} />
              <span className="flex flex-col gap-1">
                <span className="text-lg font-bold">{o.name}</span>
                <span className="text-[15px] text-ink-4">{o.summary}</span>
              </span>
            </Link>
          ))}
        </div>
      </Section>
    </MarketingPage>
  );
}
