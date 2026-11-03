import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { setInquiryStatusAction } from "@/app/actions/listings";
import { SubmitButton } from "@/components/form";
import { Icon } from "@/components/icon";
import { Badge, PageHeader, Section } from "@/components/ui";
import { DetailLayout } from "@/components/page-kit";
import { requireClient } from "@/lib/auth/session";
import { getStore } from "@/lib/data";
import { listingSettingsFor } from "@/lib/listings/types";
import { ReplyForm } from "../forms";
import { dashboardText } from "@/lib/dashboard-lang";
import { richText } from "@/i18n/rich";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await dashboardText()).t("listings.conversation") };
}

const WHEN: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "UTC" };

/** One conversation: opening it marks the person's messages as read. */
export default async function InquiryPage({ params }: { params: Promise<{ id: string }> }) {
  const { app } = await requireClient("messages");
  if (!app || app.connector?.kind !== "listings") notFound();
  const id = Number((await params).id);
  if (!Number.isSafeInteger(id) || id < 1) notFound();
  const store = await getStore();
  const inquiry = await store.getListingInquiry(app.id, id);
  if (!inquiry) notFound();
  await store.markListingInquiryRead(app.id, inquiry.id, "user", new Date());
  const [messages, listing, user, settings] = await Promise.all([
    store.listListingInquiryMessages(app.id, inquiry.id),
    store.getListing(app.id, inquiry.listingId),
    store.getHostedUser(app.id, inquiry.userId),
    store.getListingSettings(app.id),
  ]);
  const office = listingSettingsFor(app, settings);
  const { t, date } = await dashboardText();
  const when = (at: Date) => t("listings.utc", { time: date(at, WHEN) });
  const appUser = t("listings.appUser");

  return (
    <div className="flex flex-col gap-6">
      {/* The page kit: the header, the conversation, and at the side the listing, the person and closing it. */}
      <PageHeader
        back={{ href: "/dashboard/inquiries", label: t("listings.inquiries") }}
        title={user?.name ?? appUser}
        description={
          listing
            ? richText(t("listings.aboutListing", { title: listing.title }), { link: (chunk) => <Link href={`/dashboard/listings/${listing.id}`}>{chunk}</Link> })
            : t("listings.aboutRemoved")
        }
      />

      <DetailLayout
        main={
          <Section titleId="h-messages" title={t("listings.messagesTitle")}>
            <ol className="m-0 flex list-none flex-col gap-3 p-0">
              {messages.map((m) => (
                <li key={m.id} className={`flex flex-col gap-1 ${m.from === "office" ? "items-end" : "items-start"}`}>
                  <span className="text-[13px] text-muted">
                    {[m.from === "office" ? office.contactName : (user?.name ?? appUser), when(m.createdAt), m.from === "office" && m.readAt ? t("listings.seen") : null]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                  <p className={`m-0 max-w-[85%] rounded-2xl px-4 py-3 text-[15px] leading-relaxed whitespace-pre-wrap ${m.from === "office" ? "rounded-ee-md bg-midnight text-ivory" : "rounded-es-md bg-sand text-ink-2"}`}>
                    {m.text}
                  </p>
                </li>
              ))}
            </ol>
            <ReplyForm id={inquiry.id} />
          </Section>
        }
        side={
          <Section titleId="h-inquiry-status" title={t("common.status")} actions={inquiry.status === "open" ? <Badge tone="success">{t("listings.open")}</Badge> : <Badge tone="neutral">{t("listings.closed")}</Badge>}>
            {user ? (
              <ul className="m-0 flex list-none flex-col gap-2 p-0 text-[15px]">
                <li className="flex items-center gap-2">
                  <Icon name="call" size={18} className="text-muted" />
                  <a href={`tel:${user.phone}`} dir="ltr">
                    {user.phone}
                  </a>
                </li>
                {user.email ? (
                  <li className="flex min-w-0 items-center gap-2">
                    <Icon name="mail" size={18} className="text-muted" />
                    <a href={`mailto:${user.email}`} className="break-all">
                      {user.email}
                    </a>
                  </li>
                ) : null}
              </ul>
            ) : null}
            <form action={setInquiryStatusAction} className="flex flex-col gap-3 border-t border-line-soft pt-4">
              <input type="hidden" name="id" value={inquiry.id} />
              <input type="hidden" name="status" value={inquiry.status === "open" ? "closed" : "open"} />
              <span className="text-sm leading-relaxed text-ink-4">{inquiry.status === "open" ? t("listings.closeText") : t("listings.reopenText")}</span>
              <SubmitButton variant="secondary" className="h-10 w-full" pendingText={t("common.saving")}>
                {inquiry.status === "open" ? t("listings.closeConversation") : t("listings.reopenConversation")}
              </SubmitButton>
            </form>
          </Section>
        }
      />
    </div>
  );
}
