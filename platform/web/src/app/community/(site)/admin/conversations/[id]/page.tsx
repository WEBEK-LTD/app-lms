import type { Metadata } from "next";
import { AdminPage, adminContext } from "@/components/community/site/admin";
import { conversationTexts } from "@/lib/community/connect/content";
import { getCommunityStore } from "@/lib/community/store/server";
import { YALLAPP_TENANT } from "@/lib/community/types";

export const metadata: Metadata = { title: "Reported conversation", robots: { index: false } };

/** 232 A reported conversation, as the moderators see it: its last 50 messages, oldest first (moderators and admins only). */
export default async function ReportedConversationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { w } = await adminContext("reports");
  const texts = await conversationTexts(await getCommunityStore(YALLAPP_TENANT), id).catch(() => []);
  return (
    <AdminPage w={w} tab="reports">
      <div className="cm-card">
        <h2>{w.adminReports}</h2>
        {texts.length ? (
          <ol className="cm-hist">{texts.map((t, i) => <li key={i}><span>{t}</span></li>)}</ol>
        ) : (
          <p className="cm-muted">—</p>
        )}
      </div>
    </AdminPage>
  );
}
