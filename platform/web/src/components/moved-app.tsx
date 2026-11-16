import { Notice } from "@/components/ui";
import { appLabel } from "@/lib/app/label";
import { getStore } from "@/lib/data";
import type { App } from "@/lib/data/types";
import type { DashboardText } from "@/lib/dashboard-lang";

/**
 * 132.112 On an app that moved to another account: the record left here,
 * what it keeps to read (its invoices, and its data or plan when they
 * didn't move), and that nothing in it changes.
 */
export async function MovedAppNotice({ app, text }: { app: App | null; text: DashboardText }) {
  if (!app?.movedAt) return null;
  const { t, lang } = text;
  const requests = await (await getStore()).listAppMoveRequests({ clientId: app.clientId, limit: 50 });
  const request = requests
    .filter((r) => r.kind === "app" && r.status === "moved" && r.fromClientId === app.clientId && r.toClientId === app.movedToClientId)
    .sort((a, b) => Math.abs((a.closedAt ?? a.createdAt).getTime() - app.movedAt!.getTime()) - Math.abs((b.closedAt ?? b.createdAt).getTime() - app.movedAt!.getTime()))[0];
  const what = [t("working.movedInvoices"), ...(request && !request.moveData ? [t("working.movedData")] : []), ...(request && !request.moveSubscription ? [t("working.movedPlan")] : [])];
  const list = new Intl.ListFormat(lang, { style: "long", type: "conjunction" }).format(what);
  return (
    <Notice tone="warn" icon="lock" role="status">
      <b>{t("working.movedTitle")}</b> {t("working.movedText", { app: appLabel(app), date: text.date(app.movedAt), what: list })}
    </Notice>
  );
}
