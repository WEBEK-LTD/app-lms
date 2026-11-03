import Link from "next/link";
import type { DashboardText } from "@/lib/dashboard-lang";

/** 29 Links between the Donations and Donors pages. */
export function DonationTabs({ current, t }: { current: "donations" | "donors"; t: DashboardText["t"] }) {
  const tab = (href: string, id: typeof current, label: string) => (
    <Link
      href={href}
      aria-current={current === id ? "page" : undefined}
      className={`inline-flex h-10 items-center rounded-full border px-4 text-sm no-underline ${current === id ? "border-midnight bg-midnight font-bold text-ivory hover:text-ivory" : "border-line bg-white font-semibold text-midnight hover:border-line-strong hover:text-midnight"}`}
    >
      {label}
    </Link>
  );
  return (
    <nav aria-label={t("donations.tabs")} className="flex flex-wrap gap-2">
      {tab("/dashboard/donations", "donations", t("donations.donations"))}
      {tab("/dashboard/donations/donors", "donors", t("donations.donorsTitle"))}
    </nav>
  );
}
