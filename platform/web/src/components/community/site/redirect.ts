import "server-only";
import { headers } from "next/headers";
import { FORWARDED_HOST, isCommunityHost, isCommunityRequest } from "@/proxy";

/** The page's address on the community's own host: "/community/x" is "/x" there (src/proxy.ts maps it back). */
export function hostPath(path: string): string {
  if (path === "/community" || path.startsWith("/community?")) return `/${path.slice("/community".length)}`;
  return path.startsWith("/community/") ? path.slice("/community".length) : path;
}

/**
 * 231 Where a server action sends the visitor next. On the community's host
 * the address is the host's own. Through our reverse proxy it is absolute:
 * the platform's Host is Netlify's, not the visitor's, so Next doesn't
 * fetch the next page from the platform's own origin (past the proxy, with
 * the wrong host) but tells the browser to go there, through the proxy.
 * Elsewhere (yallapp.com.tr/community, the tests) the path is unchanged.
 */
export async function cmTarget(path: string): Promise<string> {
  if (!path.startsWith("/") || path.startsWith("//")) return path;
  const h = await headers();
  if (isCommunityHost(h.get("host"))) return hostPath(path);
  if (isCommunityRequest(h)) {
    const proto = h.get("x-forwarded-proto") === "http" ? "http" : "https";
    return `${proto}://${h.get(FORWARDED_HOST)}${hostPath(path)}`;
  }
  return path;
}
