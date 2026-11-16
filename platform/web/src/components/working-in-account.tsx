import { stopManagingAction } from "@/app/actions/admin";
import { SubmitButton } from "@/components/form";
import { Icon } from "@/components/icon";
import { richText } from "@/i18n/rich";
import { appLabel } from "@/lib/app/label";
import type { ClientContext } from "@/lib/auth/session";
import type { DashboardText } from "@/lib/dashboard-lang";

const bold = { b: (chunk: string) => <b>{chunk}</b> };

/**
 * 132.110 The banner our team sees on every page of a client's account
 * (the dashboard, Studio and the app picker): whose account it is, that
 * what they do is recorded with their name, and the way back to the admin.
 * Midnight in both themes, so it reads the same on Studio's dark board.
 */
export function WorkingInAccount({ context, text, app = true, className = "" }: { context: Pick<ClientContext, "staff" | "user" | "app" | "apps">; text: DashboardText; app?: boolean; className?: string }) {
  if (!context.staff) return null;
  const { t } = text;
  const current = app && context.app && context.apps.length > 1 ? context.app : null;
  return (
    <div role="status" data-working-in-account="" className={`flex flex-wrap items-center justify-between gap-3 rounded-xl bg-[#0E0D24] px-4 py-3 text-sm text-white ${className}`} style={{ color: "#FFFFFF" }}>
      <span className="flex min-w-0 items-center gap-2.5">
        <Icon name="badge" size={22} />
        <span className="flex min-w-0 flex-col">
          <span className="font-semibold">{current ? richText(t("working.bannerApp", { name: context.user.name, app: appLabel(current) }), bold) : richText(t("working.banner", { name: context.user.name }), bold)}</span>
          <span className="text-[13px] opacity-80">{t("working.bannerNote")}</span>
        </span>
      </span>
      <form action={stopManagingAction}>
        <SubmitButton variant="secondary" className="h-9 px-3 text-sm">
          {t("working.back")}
        </SubmitButton>
      </form>
    </div>
  );
}
