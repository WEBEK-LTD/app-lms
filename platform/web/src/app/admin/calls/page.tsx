import type { Metadata } from "next";
import { Notice } from "@/components/ui";
import { can } from "@/lib/admin/permissions";
import { requireAdmin } from "@/lib/auth/session";
import { getStore } from "@/lib/data";
import { callRows } from "@/lib/admin/calls";
import { CallList } from "./parts";

export const metadata: Metadata = { title: "Calls" };
export const dynamic = "force-dynamic";

/** 125 VIP: every call clients asked for with their account manager, from today, soonest first; confirmed or moved here. */
export default async function CallsPage({ searchParams }: PageProps<"/admin/calls">) {
  const admin = await requireAdmin();
  const query = await searchParams;
  const store = await getStore();
  const today = new Date().toISOString().slice(0, 10);
  const calls = await store.listAccountManagerCalls({ fromDate: today, statuses: ["requested", "confirmed", "moved"], limit: 300 });
  const rows = await callRows(store, calls);
  const waiting = calls.filter((c) => c.status === "requested").length;
  return (
    <>
      <div className="flex flex-col gap-1.5">
        <h1 className="m-0 text-[28px] font-extrabold">Calls</h1>
        <span className="text-[15px] text-muted">
          Calls clients asked for with their account manager in Yallapp Business, at the manager&apos;s free times. Confirm each one, or move it and tell the client.
          {waiting ? ` ${waiting} waiting for an answer.` : ""}
        </span>
      </div>
      {query.done === "call" ? (
        <Notice tone="success" icon="check_circle" role="status">
          Saved.
        </Notice>
      ) : null}
      {typeof query.call_error === "string" ? (
        <Notice tone="danger" icon="error" role="alert">
          {query.call_error.slice(0, 300)}
        </Notice>
      ) : null}
      <section aria-label="Calls" className="rounded-2xl border border-line bg-white p-5">
        <CallList rows={rows} back="/admin/calls" edit={can(admin.adminRole, "clients.edit")} showClient />
      </section>
    </>
  );
}
