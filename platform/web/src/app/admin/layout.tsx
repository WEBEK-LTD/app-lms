import type { Metadata } from "next";
import { Logo } from "@/components/brand";
import Link from "next/link";
import { Icon } from "@/components/icon";
import { SignOutButton } from "@/components/sign-out";
import { ThemeSwitch } from "@/components/theme-switch";
import { ROLE_LABELS } from "@/lib/admin/permissions";
import { requireAdmin } from "@/lib/auth/session";
import { getStore } from "@/lib/data";
import { openPublishingCount } from "@/lib/publishing/steps";
import { AdminNav } from "./nav";

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
      <nav
        aria-label="Super admin"
        className="on-dark relative flex w-full items-center justify-between gap-3 bg-midnight px-4 py-3 md:sticky md:top-0 md:h-screen md:w-[248px] md:flex-none md:flex-col md:items-stretch md:justify-start md:gap-5 md:overflow-y-auto md:px-3 md:py-5"
      >
        <Link href="/admin" className="flex items-center gap-2.5 px-2 no-underline">
          <Logo height={24} reversed />
          <span className="rounded-md bg-night-2 px-1.5 py-0.5 text-[11px] font-bold tracking-wide text-night-text">ADMIN</span>
        </Link>
        <AdminNav
          groups={[
            {
              label: null,
              items: [
                { href: "/admin", label: "Overview", icon: "space_dashboard", exact: true },
                { href: "/admin/product", label: "Product", icon: "rocket_launch" },
                { href: "/admin/watching", label: "Watching", icon: "monitoring", badge: { count: openAlerts, label: openAlerts === 1 ? "open alert" : "open alerts" } },
              ],
            },
            {
              label: "Clients and apps",
              items: [
                { href: "/admin/clients", label: "Clients", icon: "groups" },
                { href: "/admin/builds", label: "Build queue", icon: "build" },
                { href: "/admin/crashes", label: "Crashes", icon: "warning" },
                { href: "/admin/publishing", label: "Publishing", icon: "publish", badge: { count: openPublishing, label: openPublishing === 1 ? "open request" : "open requests" } },
                { href: "/admin/account-deletion", label: "Account deletion", icon: "delete_forever", badge: { count: openDeletions, label: openDeletions === 1 ? "open request" : "open requests" } },
                { href: "/admin/deleted-apps", label: "Deleted apps", icon: "restore_from_trash", badge: { count: deletedApps, label: deletedApps === 1 ? "app to restore or delete" : "apps to restore or delete" } },
              ],
            },
            {
              label: "Money",
              items: [
                { href: "/admin/plans", label: "Plans", icon: "workspace_premium" },
                { href: "/admin/payments", label: "Payments", icon: "payments" },
                { href: "/admin/invoices", label: "Invoices", icon: "receipt_long" },
                { href: "/admin/coupons", label: "Coupons", icon: "local_offer" },
              ],
            },
            {
              label: "Content",
              items: [
                { href: "/admin/content", label: "Website content", icon: "web" },
                { href: "/admin/emails", label: "Emails", icon: "mail" },
                { href: "/admin/announcements", label: "Announcements", icon: "campaign" },
                { href: "/admin/demos", label: "Demo apps", icon: "smartphone" },
                { href: "/admin/designs", label: "Designs", icon: "palette" },
                { href: "/admin/releases", label: "App & plugin versions", icon: "upgrade" },
              ],
            },
            {
              label: "Platform",
              items: [
                { href: "/admin/switches", label: "Switches", icon: "tune" },
                { href: "/admin/team", label: "Team", icon: "group" },
                { href: "/admin/audit", label: "Audit log", icon: "list_alt" },
                { href: "/admin/settings", label: "Settings", icon: "settings" },
                { href: "/admin/account", label: "Your account", icon: "account_circle" },
              ],
            },
          ]}
          footer={
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 px-2 text-[13px] text-night-muted">
              <span className="min-w-0 break-all">
                {user.email} · {ROLE_LABELS[user.adminRole]}
              </span>
              <SignOutButton className="cursor-pointer border-0 bg-transparent p-0 font-semibold text-ivory hover:underline" />
              <ThemeSwitch label="Dark mode" className="ms-auto h-9 w-9" />
            </div>
          }
        />
      </nav>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-line bg-ivory/90 px-4 py-2.5 backdrop-blur sm:px-9">
          <form action="/admin/clients" method="get" role="search" className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-line bg-white px-3 sm:max-w-[420px]">
            <Icon name="search" size={20} className="text-muted" />
            <label htmlFor="admin-search" className="sr-only">
              Find a client
            </label>
            <input id="admin-search" name="q" type="search" placeholder="Find a client" className="h-10 min-w-0 flex-1 border-0 bg-transparent text-[14px] outline-none" />
          </form>
          <Link
            href="/admin/watching"
            className="relative ms-auto flex h-10 w-10 items-center justify-center rounded-xl border border-line bg-white text-ink no-underline hover:border-midnight hover:text-midnight"
          >
            <Icon name="notifications" size={21} />
            <span className="sr-only">{openAlerts === 1 ? "1 open alert" : `${openAlerts} open alerts`}</span>
            {openAlerts > 0 ? <span aria-hidden="true" className="absolute -top-1.5 -right-1.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-ember px-1 text-[11px] font-bold text-white">{openAlerts}</span> : null}
          </Link>
          <a href="/" target="_blank" rel="noopener noreferrer" className="hidden h-10 items-center gap-1.5 rounded-xl border border-line bg-white px-3 text-[14px] font-semibold text-ink no-underline hover:border-midnight hover:text-midnight sm:flex">
            <Icon name="open_in_new" size={18} />
            The website
          </a>
        </header>
        <main className="min-w-0 flex-1 px-4 pt-7 pb-12 sm:px-9 sm:pt-8">
          <div className="mx-auto flex max-w-[1320px] flex-col gap-5">{children}</div>
        </main>
      </div>
    </div>
  );
}
