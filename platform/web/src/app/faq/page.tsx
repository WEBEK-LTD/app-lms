import type { Metadata } from "next";
import { Icon } from "@/components/icon";
import { MarketingPage, Section } from "@/components/marketing";
import { FAQ } from "@/lib/marketing";

export const metadata: Metadata = {
  title: "FAQ",
  description: "Answers about developer accounts, supported plugins, selling courses, lesson content, payment and cancellation.",
};

export default function FaqPage() {
  return (
    <MarketingPage
      current="faq"
      eyebrow="FAQ"
      title="Questions, answered"
      intro="Can't find what you're looking for? Message us on WhatsApp and we'll answer you directly."
    >
      <Section narrow>
        {FAQ.map((group, groupIndex) => (
          <div key={group.title} className="flex flex-col gap-4">
            <h2 className="m-0 text-[22px] font-extrabold">{group.title}</h2>
            {group.items.map((item, index) => (
              <details key={item.q} open={groupIndex === 0 && index === 0} className="group rounded-[14px] border border-line bg-white px-5 py-[18px]">
                <summary className="flex items-start justify-between gap-3 rounded-md text-[17px] font-bold">
                  {item.q}
                  <Icon name="expand_more" size={24} className="flex-none transition-transform group-open:rotate-180" />
                </summary>
                <p className="mt-3 mb-0 text-[15px] leading-relaxed text-ink-4">{item.a}</p>
              </details>
            ))}
          </div>
        ))}
      </Section>
    </MarketingPage>
  );
}
