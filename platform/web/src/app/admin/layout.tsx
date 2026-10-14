import type { Metadata } from "next";
import { Logo } from "@/components/brand";
import { SideNavLinks } from "@/components/side-nav";
import { SignOutButton } from "@/components/sign-out";
import { requireAdmin } from "@/lib/auth/session";

export const metadata: Metadata = { title: { default: "Super admin", template: "%s · Yallapp admin" }, robots: { index: false } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAdmin();
  return (
    <div className="flex min-h-screen flex-col bg-ivory md:flex-row">
      <nav aria-label="Super admin" className="on-dark flex w-full flex-col gap-3 bg-midnight px-3.5 py-4 md:w-[240px] md:flex-none md:gap-1 md:py-[22px]">
        <div className="flex flex-col items-start gap-0.5 px-2 md:pb-5">
          <Logo height={26} reversed />
          <span className="text-xs text-night-muted">Super admin</span>
        </div>
        <SideNavLinks
          dark
          items={[
            { href: "/admin", label: "Clients", exact: true },
            { href: "/admin/builds", label: "Build queue" },
            { href: "/admin/releases", label: "App & plugin versions" },
            { href: "/admin/plans", label: "Plans" },
            { href: "/admin/payments", label: "Payments" },
            { href: "/admin/coupons", label: "Coupons" },
            { href: "/admin/announcements", label: "Announcements" },
            { href: "/admin/content", label: "Website content" },
            { href: "/admin/emails", label: "Emails" },
            { href: "/admin/settings", label: "Settings" },
          ]}
        />
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 border-t border-night-line px-2 pt-3 text-sm text-night-muted md:mt-auto">
          <span className="min-w-0 break-all">{user.email}</span>
          <SignOutButton className="cursor-pointer border-0 bg-transparent p-0 font-semibold text-ivory hover:underline" />
        </div>
      </nav>
      <main className="min-w-0 flex-1 px-4 pt-7 pb-12 sm:px-9 sm:pt-8">
        <div className="flex flex-col gap-5">{children}</div>
      </main>
    </div>
  );
}
