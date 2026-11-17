import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { KitHeader, KitPage, KitStatus, kit } from "@/components/studio-page";
import { requireClient } from "@/lib/auth/session";
import { chatAvailable } from "@/lib/chat/access";
import { dashboardChatDeps } from "@/lib/chat/dashboard";
import { getStore } from "@/lib/data";
import { dashboardText } from "@/lib/dashboard-lang";
import { appPlan } from "@/lib/entitlements";
import { AutoRefresh } from "../../orders/refresh";
import { chatThread } from "../thread";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await dashboardText()).t("chat.title") };
}
export const dynamic = "force-dynamic";

/**
 * 77 One conversation: opening it marks it read for the business. New
 * messages show every few seconds. 132.160 In the console's look, the same
 * thread as the list's inspector shows; here for its older messages and
 * for a link to it.
 */
export default async function ChatConversationPage({ params, searchParams }: PageProps<"/dashboard/chat/[id]">) {
  const { app, license } = await requireClient("chat");
  if (!app) redirect("/dashboard/app-type");
  const store = await getStore();
  const now = new Date();
  const plan = await appPlan(store, license, now);
  if (!chatAvailable(app, plan)) redirect("/dashboard/chat");
  const { id } = await params;
  const query = await searchParams;
  const before = typeof query.before === "string" && /^[1-9][0-9]{0,15}$/.test(query.before) ? query.before : null;
  const text = await dashboardText();
  const thread = await chatThread({ deps: dashboardChatDeps(store, app, plan, now), app, id, before, text, inList: false });
  if (!thread) notFound();
  const { t } = text;

  return (
    <KitPage>
      {!before ? <AutoRefresh seconds={5} /> : null}
      <KitHeader
        back={{ href: "/dashboard/chat", label: t("chat.back") }}
        title={
          <span className="flex flex-wrap items-center gap-2.5">
            {thread.title}
            {thread.blocked ? <KitStatus tone="neutral">{t("chat.blocked")}</KitStatus> : null}
          </span>
        }
        description={thread.line}
      />
      <section aria-label={thread.title} className={`${kit.card} max-w-[760px] p-5 sm:p-6`}>
        {thread.body}
      </section>
    </KitPage>
  );
}
