import type { Metadata } from "next";
import { AnnouncementCard, clientAnnouncements } from "@/components/announcements";
import { EmptyState, PageHeader } from "@/components/ui";
import { requireClient } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Announcements" };

/** Every announcement for this client that is on now, also the ones closed on the overview. */
export default async function AnnouncementsPage() {
  const context = await requireClient();
  const { live } = await clientAnnouncements(context);
  return (
    <>
      <PageHeader title="Announcements" description="News and notices from the Yallapp team." />
      {live.length ? (
        <div className="flex flex-col gap-3">
          {live.map((a) => (
            <AnnouncementCard key={a.id} announcement={a} />
          ))}
        </div>
      ) : (
        <EmptyState icon="campaign" title="No announcements right now.">
          When we have news about Yallapp, planned work or new features, you&apos;ll see it here and on your overview.
        </EmptyState>
      )}
    </>
  );
}
