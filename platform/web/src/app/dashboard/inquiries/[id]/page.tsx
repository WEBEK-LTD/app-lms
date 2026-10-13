import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { setInquiryStatusAction } from "@/app/actions/listings";
import { SubmitButton } from "@/components/form";
import { Badge } from "@/components/ui";
import { requireClient } from "@/lib/auth/session";
import { getStore } from "@/lib/data";
import { listingSettingsFor } from "@/lib/listings/types";
import { ReplyForm } from "../forms";

export const metadata: Metadata = { title: "Conversation" };

const when = (date: Date) =>
  date.toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "UTC" }) + " UTC";

/** One conversation: opening it marks the person's messages as read. */
export default async function InquiryPage({ params }: { params: Promise<{ id: string }> }) {
  const { app } = await requireClient();
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

  return (
    <div className="flex max-w-[760px] flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Link href="/dashboard/inquiries" className="text-sm font-semibold">
          ← Inquiries
        </Link>
        <h1 className="m-0 text-[28px] font-extrabold tracking-[-0.5px] sm:text-[34px]">{user?.name ?? "App user"}</h1>
        <p className="m-0 flex flex-wrap items-center gap-2 text-[15px] text-ink-4">
          <span>
            About{" "}
            {listing ? <Link href={`/dashboard/listings/${listing.id}`}>{listing.title}</Link> : "a listing that was removed"}
            {user ? (
              <>
                {" · "}
                <a href={`tel:${user.phone}`}>{user.phone}</a>
                {user.email ? (
                  <>
                    {" · "}
                    <a href={`mailto:${user.email}`}>{user.email}</a>
                  </>
                ) : null}
              </>
            ) : null}
          </span>
          {inquiry.status === "open" ? <Badge tone="success">Open</Badge> : <Badge tone="neutral">Closed</Badge>}
        </p>
      </div>

      <section aria-labelledby="h-messages" className="flex flex-col gap-4 rounded-2xl border border-line bg-white p-5 sm:p-6">
        <h2 id="h-messages" className="m-0 text-[19px] font-bold">
          Messages
        </h2>
        <ol className="m-0 flex list-none flex-col gap-3 p-0">
          {messages.map((m) => (
            <li key={m.id} className={`flex flex-col gap-1 ${m.from === "office" ? "items-end" : "items-start"}`}>
              <span className="text-[13px] text-muted">
                {m.from === "office" ? office.contactName : (user?.name ?? "App user")} · {when(m.createdAt)}
                {m.from === "office" ? (m.readAt ? " · Seen" : "") : ""}
              </span>
              <p className={`m-0 max-w-[85%] rounded-2xl px-4 py-3 text-[15px] leading-relaxed whitespace-pre-wrap ${m.from === "office" ? "bg-midnight text-white" : "bg-sand text-ink-2"}`}>
                {m.text}
              </p>
            </li>
          ))}
        </ol>
        <ReplyForm id={inquiry.id} />
      </section>

      <form action={setInquiryStatusAction} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-white p-5 sm:p-6">
        <input type="hidden" name="id" value={inquiry.id} />
        <input type="hidden" name="status" value={inquiry.status === "open" ? "closed" : "open"} />
        <span className="text-[15px] text-ink-4">
          {inquiry.status === "open"
            ? "Close the conversation when it's done. A new message from them opens it again."
            : "This conversation is closed. Reopen it to keep it with the open ones."}
        </span>
        <SubmitButton variant="secondary" className="h-10" pendingText="Saving…">
          {inquiry.status === "open" ? "Close conversation" : "Reopen conversation"}
        </SubmitButton>
      </form>
    </div>
  );
}
