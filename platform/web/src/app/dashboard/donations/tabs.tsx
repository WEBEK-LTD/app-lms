import Link from "next/link";

/** 29 Links between the Donations and Donors pages. */
export function DonationTabs({ current }: { current: "donations" | "donors" }) {
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
    <nav aria-label="Donations and donors" className="flex gap-2">
      {tab("/dashboard/donations", "donations", "Donations")}
      {tab("/dashboard/donations/donors", "donors", "Donors")}
    </nav>
  );
}
