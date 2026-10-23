import type { Metadata } from "next";
import { Logo } from "@/components/brand";
import { SideNavLinks } from "@/components/side-nav";
import { SignOutButton } from "@/components/sign-out";
import { ThemeSwitch } from "@/components/theme-switch";
import { ROLE_LABELS } from "@/lib/admin/permissions";
import { requireAdmin } from "@/lib/auth/session";
import { getStore } from "@/lib/data";
import { openPublishingCount } from "@/lib/publishing/steps";

export const metadata: Metadata = { title: { default: "Super admin", template: "%s · Yallapp admin" }, robots: { index: false } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // 70 The layout lets Your account through when two-step sign-in is required; every page checks it (requireAdmin).
  const user = await requireAdmin("view", { twoStepSetup: true });
  // 19 "Publish it for me" requests not live on both stores yet.
  const store = await getStore();
  const openPublishing = openPublishingCount(await store.listManagedPublishingRequests());
  // 66 Requests to delete an account that wait for us.
  const openDeletions = (await store.listAccountDeletionRequests(["pending"], 200)).length;
  // 73 Apps their owners deleted, still restorable.
  const deletedApps = (await store.listAppDeletions({ statuses: ["waiting"], limit: 200 })).length;
  // 78.3 The bell: open alerts of the platform's watch.
  const openAlerts = await store.countOpenTeamAlerts();
  return (
    // 73 Light or dark like the website (globals.css); the menu stays dark.
    <div data-site-theme="" className="flex min-h-screen flex-col bg-ivory md:flex-row">
      <nav aria-label="Super admin" className="on-dark flex w-full flex-col gap-3 bg-midnight px-3.5 py-4 md:w-[240px] md:flex-none md:gap-1 md:py-[22px]">
        <div className="flex flex-col items-start gap-0.5 px-2 md:pb-5">
          <Logo height={26} reversed />
          <span className="text-xs text-night-muted">Super admin</span>
        </div>
        <SideNavLinks
          dark
          items={[
            { href: "/admin", label: "Overview", exact: true },
            { href: "/admin/product", label: "Product" },
            { href: "/admin/watching", label: "Watching", badge: { count: openAlerts, label: openAlerts === 1 ? "open alert" : "open alerts" } },
            { href: "/admin/clients", label: "Clients" },
            { href: "/admin/builds", label: "Build queue" },
            { href: "/admin/crashes", label: "Crashes" },
            { href: "/admin/publishing", label: "Publishing", badge: { count: openPublishing, label: openPublishing === 1 ? "open request" : "open requests" } },
            { href: "/admin/account-deletion", label: "Account deletion", badge: { count: openDeletions, label: openDeletions === 1 ? "open request" : "open requests" } },
            { href: "/admin/deleted-apps", label: "Deleted apps", badge: { count: deletedApps, label: deletedApps === 1 ? "app to restore or delete" : "apps to restore or delete" } },
            { href: "/admin/demos", label: "Demo apps" },
            { href: "/admin/designs", label: "Designs" },
            { href: "/admin/releases", label: "App & plugin versions" },
            { href: "/admin/plans", label: "Plans" },
            { href: "/admin/payments", label: "Payments" },
            { href: "/admin/switches", label: "Switches" },
            { href: "/admin/team", label: "Team" },
            { href: "/admin/audit", label: "Audit log" },
            { href: "/admin/coupons", label: "Coupons" },
            { href: "/admin/announcements", label: "Announcements" },
            { href: "/admin/content", label: "Website content" },
            { href: "/admin/emails", label: "Emails" },
            { href: "/admin/settings", label: "Settings" },
            { href: "/admin/account", label: "Your account" },
          ]}
        />
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 border-t border-night-line px-2 pt-3 text-sm text-night-muted md:mt-auto">
          <span className="min-w-0 break-all">
            {user.email} · {ROLE_LABELS[user.adminRole]}
          </span>
          <SignOutButton className="cursor-pointer border-0 bg-transparent p-0 font-semibold text-ivory hover:underline" />
          <ThemeSwitch label="Dark mode" className="ms-auto h-9 w-9" />
        </div>
      </nav>
      <main className="min-w-0 flex-1 px-4 pt-7 pb-12 sm:px-9 sm:pt-8">
        <div className="flex flex-col gap-5">{children}</div>
      </main>
    </div>
  );
}
