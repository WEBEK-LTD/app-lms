import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/brand";
import { stopManagingAction } from "@/app/actions/admin";
import { SubmitButton } from "@/components/form";
import { Icon } from "@/components/icon";
import { DashboardSidebar, type DashboardNavGroup } from "@/components/dashboard-nav";
import { SignOutButton } from "@/components/sign-out";
import { AppSwitcher } from "@/components/app-switcher";
import { appLabel, licensePageName, MAX_APPS_PER_CLIENT } from "@/lib/app/label";
import { appTypeName, contentNavOf, kindOf, usersLabelOf } from "@/lib/app/kinds";
import { requireClient } from "@/lib/auth/session";
import { getContact } from "@/lib/contact";
import type { App } from "@/lib/data/types";
import { ACCOUNT_STATE_LABEL, appState } from "@/lib/license/status";

export const metadata: Metadata = { title: { default: "Dashboard", template: "%s · Yallapp" }, robots: { index: false } };

/** What the app's content and customers pages are, for apps whose content is managed here (lib/app/kinds.ts; 21 in the kind's words). */
function contentNav(app: App | null): { label: string; items: DashboardNavGroup["items"] } | null {
  return app ? contentNavOf(app) : null;
}

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const contact = await getContact();
  const { user, staff, app, apps, client, licenses, state } = await requireClient();
  const now = new Date();
  // Every app of the account, each on its own plan: the switcher shows which one the dashboard works on.
  const switcherApps = apps.map((a) => ({
    id: a.id,
    label: appLabel(a),
    detail: `${appTypeName(a)} · ${ACCOUNT_STATE_LABEL[appState(client, licenses.find((l) => l.appId === a.id) ?? null, now)]}`,
  }));
  const currentApp = app
    ? {
        label: appLabel(app),
        typeName: kindOf(app).name,
        typeIcon: kindOf(app).icon,
        iconUrl: app.iconAssetId ? `/api/v1/assets/${app.iconAssetId}` : null,
        state,
        // An app whose plan ended is paused for its users.
        stateLabel: state === "expired" ? "Paused" : ACCOUNT_STATE_LABEL[state],
      }
    : null;

  // Only what the current app uses: its content pages, and the app users pages on the hosted API.
  const content = contentNav(app);
  const groups: DashboardNavGroup[] = [
    {
      items: [
        { href: "/dashboard", label: "Overview", icon: "dashboard", exact: true },
        { href: "/dashboard/setup", label: "App setup", icon: "tune", prefix: "/dashboard/app-type" },
        { href: "/dashboard/pages", label: "Pages & look", icon: "palette" },
        // 43 The app's languages and every text in them.
        { href: "/dashboard/languages", label: "Languages", icon: "language" },
        { href: "/dashboard/preview", label: "Preview your app", icon: "visibility" },
        // 44 How people use the app.
        { href: "/dashboard/analytics", label: "Analytics", icon: "monitoring" },
      ],
    },
    ...(content ? [{ label: content.label, items: content.items }] : []),
    ...(app?.backend === "hosted"
      ? [
          {
            label: usersLabelOf(app),
            items: [
              { href: "/dashboard/notifications", label: "App notifications", icon: "notifications" as const },
              { href: "/dashboard/app-sign-in", label: "App sign-in", icon: "login" as const },
            ],
          },
        ]
      : app?.backend === "wordpress" || app?.backend === "setup_requested" || app?.backend === "custom_api"
        ? // 18 WordPress apps choose how people sign in, and the WhatsApp number that sends their codes (19: also while our team sets up the site).
          // 19 Own API apps see how their API signs people in.
          [{ label: usersLabelOf(app), items: [{ href: "/dashboard/app-sign-in", label: "App sign-in", icon: "login" as const }] }]
        : []),
    {
      label: "Publish",
      items: [
        { href: "/dashboard/builds", label: "Builds & downloads", icon: "build" },
        { href: "/dashboard/publishing", label: "Publishing", icon: "publish" },
      ],
    },
    {
      label: "Account",
      items: [
        { href: "/dashboard/license", label: licensePageName(app), icon: "workspace_premium" },
        { href: "/dashboard/announcements", label: "Announcements", icon: "campaign" },
        { href: contact.whatsappUrl, label: "Support", icon: "support_agent", external: true },
      ],
    },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-ivory md:flex-row">
      <a
        href="#main"
        className="sr-only z-50 rounded-[10px] bg-midnight px-4 py-2.5 font-semibold text-white focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:text-white"
      >
        Skip to content
      </a>
      <DashboardSidebar
        logo={
          <Link href="/dashboard" className="flex rounded-md">
            <Logo height={28} alt="Yallapp dashboard" />
          </Link>
        }
        switcher={
          apps.length ? (
            <AppSwitcher apps={switcherApps} current={app?.id ?? null} currentApp={currentApp} canAdd={apps.length < MAX_APPS_PER_CLIENT} />
          ) : null
        }
        groups={groups}
        footer={
          <div className="flex flex-col gap-2.5">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-ivory text-sm font-bold text-ink-3" aria-hidden="true">
                {(user.name.trim()[0] ?? "?").toUpperCase()}
              </span>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-sm font-semibold">{user.name}</span>
                <span className="truncate text-xs text-muted" title={user.email}>
                  {user.email}
                </span>
              </span>
            </div>
            <SignOutButton className="inline-flex h-9 w-full cursor-pointer items-center justify-center gap-1.5 rounded-[10px] border border-line-strong bg-white px-3 text-sm font-semibold text-midnight hover:border-midnight">
              <Icon name="logout" size={18} />
              Sign out
            </SignOutButton>
          </div>
        }
      />
      <main id="main" tabIndex={-1} className="min-w-0 flex-1 px-4 pt-6 pb-16 outline-none sm:px-8 sm:pt-8 lg:px-10">
        <div className="mx-auto flex max-w-[1120px] flex-col gap-6">
          {staff ? (
            <div role="status" className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-midnight px-4 py-3 text-sm text-white">
              <span className="flex items-center gap-2">
                <Icon name="key" size={20} />
                <span>
                  You&apos;re managing <strong>{user.name}</strong>&apos;s dashboard as Yallapp staff. Changes apply to their app
                  {app && apps.length > 1 ? (
                    <>
                      {" "}
                      <strong>{appLabel(app)}</strong>
                    </>
                  ) : null}
                  .
                </span>
              </span>
              <form action={stopManagingAction}>
                <SubmitButton variant="secondary" className="h-9 px-3 text-sm">
                  Back to admin
                </SubmitButton>
              </form>
            </div>
          ) : null}
          {children}
        </div>
      </main>
    </div>
  );
}
