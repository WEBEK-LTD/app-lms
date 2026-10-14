import { planNamesOf } from "@/lib/plans";
import type { Metadata } from "next";
import Link from "next/link";
import { Icon } from "@/components/icon";
import { announcementFormValues, audienceOptions } from "@/lib/announcements";
import { requireAdmin } from "@/lib/auth/session";
import { getStore } from "@/lib/data";
import { getPlans } from "@/lib/settings/platform";
import { AnnouncementForm } from "../forms";

export const metadata: Metadata = { title: "New announcement" };
export const dynamic = "force-dynamic";

export default async function NewAnnouncementPage() {
  await requireAdmin("settings.edit");
  const plans = await getPlans(await getStore());
  return (
    <>
      <div className="flex flex-col gap-1.5">
        <Link href="/admin/announcements" className="flex items-center gap-1 self-start text-sm font-semibold no-underline">
          <Icon name="arrow_back" size={18} />
          Announcements
        </Link>
        <h1 className="m-0 text-[28px] font-extrabold">New announcement</h1>
      </div>
      <section aria-label="Announcement" className="max-w-[900px] rounded-2xl border border-line bg-white p-5 sm:p-6">
        <AnnouncementForm announcement={announcementFormValues(null)} {...audienceOptions(planNamesOf(plans))} />
      </section>
    </>
  );
}
