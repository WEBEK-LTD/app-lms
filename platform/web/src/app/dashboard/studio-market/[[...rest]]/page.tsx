import { redirect } from "next/navigation";

/**
 * 191 Studio Market lives in Studio (/studio/market): its templates are
 * Studio designs. Its old addresses here (emails sent before, bookmarks)
 * open the same page there, the query kept.
 */
export default async function OldStudioMarket({ params, searchParams }: PageProps<"/dashboard/studio-market/[[...rest]]">) {
  const { rest = [] } = await params;
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(await searchParams)) {
    for (const one of Array.isArray(value) ? value : value === undefined ? [] : [value]) query.append(key, one);
  }
  const path = rest.map((part) => encodeURIComponent(part)).join("/");
  const q = query.toString();
  redirect(`/studio/market${path ? `/${path}` : ""}${q ? `?${q}` : ""}`);
}
