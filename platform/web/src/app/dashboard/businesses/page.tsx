import type { Metadata } from "next";
import { switchBusinessAction } from "@/app/actions/team";
import { SubmitButton } from "@/components/form";
import { Icon } from "@/components/icon";
import { Badge, PageHeader } from "@/components/ui";
import type { DashKey } from "@/i18n/dashboard";
import { requireClient } from "@/lib/auth/session";
import { dashboardText } from "@/lib/dashboard-lang";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await dashboardText()).t("team.business.title") };
}

/**
 * 60 Where someone on more than one business lands after signing in: their
 * own and the teams they joined, each with its role, to open one. The
 * switcher in the sidebar does the same later.
 */
export default async function BusinessesPage() {
  const { businesses } = await requireClient("dashboard");
  const { t, k } = await dashboardText();
  return (
    <>
      <PageHeader title={t("team.business.title")} description={t("team.business.intro")} />
      <ul className="m-0 grid max-w-[720px] list-none gap-3 p-0" data-testid="businesses">
        {businesses.map((b) => {
          const name = b.name === "Untitled app" ? k(b.name) : b.name;
          return (
            <li key={b.clientId} className="flex flex-wrap items-center gap-3 rounded-2xl border border-line bg-white px-5 py-4">
              <span className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-peach text-accent" aria-hidden="true">
                <Icon name="storefront" size={20} />
              </span>
              <span className="flex min-w-0 flex-1 flex-col gap-1">
                <span className="font-semibold break-words">{name}</span>
                <span>
                  <Badge tone={b.role === "owner" ? "info" : "neutral"}>{t(`team.roles.${b.role}` as DashKey)}</Badge>
                </span>
              </span>
              {b.current ? (
                <form action={switchBusinessAction}>
                  <input type="hidden" name="clientId" value={b.clientId} />
                  <SubmitButton className="h-10 px-4 text-sm">{t("team.business.openNow")}</SubmitButton>
                </form>
              ) : (
                <form action={switchBusinessAction}>
                  <input type="hidden" name="clientId" value={b.clientId} />
                  <SubmitButton variant="secondary" className="h-10 px-4 text-sm" aria-label={t("team.business.openNamed", { name })}>
                    {t("team.business.open")}
                  </SubmitButton>
                </form>
              )}
            </li>
          );
        })}
      </ul>
    </>
  );
}
