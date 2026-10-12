import type { Metadata } from "next";
import { Logo, WHATSAPP_URL } from "@/components/brand";
import { SideNavLinks } from "@/components/side-nav";
import { SignOutButton } from "@/components/sign-out";
import { requireClient } from "@/lib/auth/session";

export const metadata: Metadata = { title: { default: "Dashboard", template: "%s · Yallapp" }, robots: { index: false } };

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user } = await requireClient();
  return (
    <div className="flex min-h-screen flex-col bg-ivory md:flex-row">
      <nav
        aria-label="Dashboard"
        className="flex w-full flex-col gap-3 border-b border-line bg-white px-3.5 py-4 md:w-[240px] md:flex-none md:gap-1 md:border-r md:border-b-0 md:py-[22px]"
      >
        <div className="flex items-center justify-between gap-3 px-2 md:pb-5">
          <Logo />
        </div>
        <SideNavLinks
          items={[
            { href: "/dashboard", label: "Overview", exact: true },
            { href: "/dashboard/setup", label: "App setup", prefix: "/dashboard/app-type" },
            { href: "/dashboard/builds", label: "Builds & downloads" },
            { href: "/dashboard/license", label: "License & plugin" },
            { href: WHATSAPP_URL, label: "Support", external: true },
          ]}
        />
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 border-t border-line-soft px-2 pt-3 text-sm text-muted md:mt-auto">
          <span className="min-w-0 break-all">{user.email}</span>
          <SignOutButton className="cursor-pointer border-0 bg-transparent p-0 font-semibold text-accent hover:text-accent-hover hover:underline" />
        </div>
      </nav>
      <main className="min-w-0 flex-1 px-4 pt-7 pb-12 sm:px-9 sm:pt-8">
        <div className="flex max-w-[1000px] flex-col gap-6">{children}</div>
      </main>
    </div>
  );
}
