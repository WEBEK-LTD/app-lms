import "server-only";
import { headers } from "next/headers";
import { handleCommunity } from "@/lib/community/api/service";
import { communityDeps } from "@/lib/community/deps";
import { ipFromHeaders } from "@/lib/http";

/**
 * 235 A client's Community app has its own community: the community engine
 * with the app's id as its tenant. The client runs it from here, as its
 * admin (`tenantAdmin`, trusted in-process only, never from HTTP): the
 * caller has checked the signed-in person may manage this app.
 */
export async function tenantAdmin<T = unknown>(appId: string, method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE", pathAndQuery: string, body?: unknown): Promise<{ status: number; body: T }> {
  const url = new URL(pathAndQuery, "http://community.local");
  const list = await headers();
  const result = await handleCommunity(await communityDeps({ ip: ipFromHeaders(list), tenant: appId }), {
    method,
    path: url.pathname.split("/").filter(Boolean),
    query: url.searchParams,
    body,
    form: null,
    token: null,
    acceptLanguage: list.get("accept-language"),
    tenantAdmin: true,
  });
  return { status: result.status, body: (result.body ?? null) as T };
}

export type TenantMember = { id: string; username: string; display_name: string; avatar_url: string | null };
export type TenantModeration = { id: string; target_type: string; cause: "first_posts" | "spam_filter" | "reports"; status: string; preview: string; author: TenantMember | null; report_count: number; created_at: string };
export type TenantReport = { id: string; reporter: TenantMember; target_type: string; reason: string; note: string; status: string; created_at: string };
export type TenantSettings = {
  groups_create_policy: "everyone" | "badge_holders" | "chosen";
  spam_filter: { enabled: boolean; blocked_domains: string[]; blocked_words: string[]; max_links: number; hide_after_reports: number };
};

type Page<T> = { items: T[]; next_cursor: string | null };
const empty = { items: [], next_cursor: null };

export async function tenantModeration(appId: string): Promise<Page<TenantModeration>> {
  const r = await tenantAdmin<Page<TenantModeration>>(appId, "GET", "/admin/moderation?status=open&limit=50");
  return r.status === 200 ? r.body : empty;
}
export async function tenantReports(appId: string): Promise<Page<TenantReport>> {
  const r = await tenantAdmin<Page<TenantReport>>(appId, "GET", "/admin/reports?status=open&limit=50");
  return r.status === 200 ? r.body : empty;
}
export async function tenantMembers(appId: string, q?: string): Promise<Page<TenantMember>> {
  const r = await tenantAdmin<Page<TenantMember>>(appId, "GET", `/admin/members?limit=50${q ? `&q=${encodeURIComponent(q)}` : ""}`);
  return r.status === 200 ? r.body : empty;
}
export async function tenantSettings(appId: string): Promise<TenantSettings | null> {
  const r = await tenantAdmin<TenantSettings>(appId, "GET", "/admin/settings");
  return r.status === 200 ? r.body : null;
}
