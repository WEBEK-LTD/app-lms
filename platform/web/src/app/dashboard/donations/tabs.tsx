import Link from "next/link";
import type { DashboardText } from "@/lib/dashboard-lang";

/** 29 Links between the Donations and Donors pages. */
export function DonationTabs({ current, t }: { current: "donations" | "donors"; t: DashboardText["t"] }) {
  const tab = (href: string, id: typeof current, label: string) => (
    <Link
      href={href}
      aria-current={current === id ? "page" : undefined}
      className={`rounded-full border border-line px-4 py-2 text-[15px] font-semibold no-underline ${current === id ? "bg-midnight text-white hover:text-white" : "bg-white text-midnight"}`}
    >
      {label}
    </Link>
  );
  return (
    <nav aria-label={t("donations.tabs")} className="flex gap-2">
      {tab("/dashboard/donations", "donations", t("donations.donations"))}
      {tab("/dashboard/donations/donors", "donors", t("donations.donorsTitle"))}
    </nav>
  );
}
