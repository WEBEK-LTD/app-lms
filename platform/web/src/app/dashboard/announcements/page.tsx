import type { Metadata } from "next";
import { AnnouncementCard, clientAnnouncements } from "@/components/announcements";
import { requireClient } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Announcements" };

/** Every announcement for this client that is on now, also the ones closed on the overview. */
export default async function AnnouncementsPage() {
  const context = await requireClient();
  const { live } = await clientAnnouncements(context);
  return (
    <>
      <div className="flex flex-col gap-1.5">
        <h1 className="m-0 text-[28px] font-extrabold">Announcements</h1>
        <span className="text-[15px] text-muted">News and notices from the Yallapp team.</span>
      </div>
      {live.length ? (
        <div className="flex flex-col gap-3">
          {live.map((a) => (
            <AnnouncementCard key={a.id} announcement={a} />
          ))}
        </div>
      ) : (
        <p className="m-0 rounded-2xl border border-line bg-white p-6 text-[15px] text-muted">No announcements right now.</p>
      )}
    </>
  );
}
