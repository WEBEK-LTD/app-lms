import Link from "next/link";
import { btn, EmptyState } from "@/components/ui";
import { dashboardText } from "@/lib/dashboard-lang";
import { Icon } from "./icon";

/**
 * 132.68 A page of the dashboard or of a Studio project that isn't there (a
 * deleted product, an old link): said in the dashboard's language, inside
 * its own menu, with the way back to the overview, instead of the website's
 * English "page not found".
 */
export async function DashboardNotFound({ home }: { home: "/dashboard" | "/studio/project" }) {
  const { t } = await dashboardText();
  return (
    <div className="flex flex-col gap-6" data-dashboard-not-found="">
      <h1 className="m-0 text-[28px] leading-tight font-extrabold tracking-[-0.5px]">{t("studioKit.notFoundTitle")}</h1>
      <EmptyState
        icon="link_off"
        title={t("studioKit.notFoundTitle")}
        action={
          <Link href={home} className={`${btn.secondary} h-10`}>
            <Icon name="arrow_back" size={18} />
            {t("studioKit.notFoundBack")}
          </Link>
        }
      >
        {t("studioKit.notFoundText")}
      </EmptyState>
    </div>
  );
}
