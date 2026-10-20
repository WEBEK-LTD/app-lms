import type { Metadata } from "next";
import Link from "next/link";
import { requireClient } from "@/lib/auth/session";
import { getStore } from "@/lib/data";
import { eventSettingsOf } from "@/lib/events/service";
import { CheckIn } from "./check-in";
import { dashboardText } from "@/lib/dashboard-lang";
import { richText } from "@/i18n/rich";
import { eventWhenIn } from "../events/event-page";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await dashboardText()).t("events.checkIn") };
}

/** 28 Checking tickets at the door, on a phone: the events of today and the next days first. */
export default async function CheckInPage() {
  const { app } = await requireClient();
  const { t, lang } = await dashboardText();
  if (!app || app.connector?.kind !== "events") {
    return (
      <div className="flex max-w-[620px] flex-col gap-3">
        <h1 className="m-0 text-[26px] leading-tight font-extrabold tracking-[-0.5px] break-words sm:text-[30px]">{t("events.checkIn")}</h1>
        <p className="m-0 text-[15px] leading-relaxed text-ink-4">
          {richText(t("events.checkInNotHere"), { link: (chunk) => <Link href="/dashboard/app-type">{chunk}</Link> })}
        </p>
      </div>
    );
  }
  const store = await getStore();
  const now = new Date();
  const [events, settings] = await Promise.all([store.listEvents(app.id), eventSettingsOf(store, app.id)]);
  // Events still on (or ended in the last 12 hours, for late arrivals), soonest first.
  const open = events
    .filter((e) => e.status === "published" && e.endAt.getTime() > now.getTime() - 12 * 3_600_000)
    .slice(0, 50)
    .map((e) => ({ id: e.id, label: `${e.title} · ${eventWhenIn(lang, e.startAt, settings.timeZone)}` }));
  return (
    <div className="flex max-w-[620px] flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="m-0 text-[26px] leading-tight font-extrabold tracking-[-0.5px] break-words sm:text-[30px]">{t("events.checkIn")}</h1>
        <p className="m-0 text-[15px] leading-relaxed text-ink-4">{t("events.checkInIntro")}</p>
      </div>
      <section aria-label={t("events.checkTicket")} className="rounded-2xl border border-line bg-white p-5 sm:p-6">
        <CheckIn events={open} timeZone={settings.timeZone} />
      </section>
    </div>
  );
}
