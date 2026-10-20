import { contextCan, getClientContext } from "@/lib/auth/session";
import { dashboardText } from "@/lib/dashboard-lang";
import type { TeamPermission } from "@/lib/team/permissions";
import { Icon } from "./icon";

/** 60 Whether the person signed in to the dashboard may do `permission` on the current app (for server components). */
export async function mayDo(permission: TeamPermission): Promise<boolean> {
  const context = await getClientContext();
  return context !== null && contextCan(context, permission);
}

/**
 * 60 In place of a part of a page only the owner uses (where money goes,
 * storage packs): its heading and "Only the owner of this business can do
 * this", so someone on the team knows to ask.
 */
export async function OwnerOnly({ title, id }: { title: string; id: string }) {
  const { t } = await dashboardText();
  return (
    <section aria-labelledby={id} className="flex max-w-[640px] flex-col gap-2 rounded-2xl border border-line bg-white p-5 sm:p-6">
      <h2 id={id} className="m-0 text-lg font-bold">
        {title}
      </h2>
      <p className="m-0 flex items-center gap-2 text-[15px] text-ink-4">
        <Icon name="lock" size={20} className="text-muted" />
        {t("team.ownerOnly")}
      </p>
    </section>
  );
}
