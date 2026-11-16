import { notFound } from "next/navigation";
import { requireClient } from "@/lib/auth/session";
import { getStore } from "@/lib/data";

/**
 * 132.10 A product that isn't there is a real 404. The layout runs before the
 * product's loading screen (loading.tsx wraps only the page), so `notFound()`
 * here answers before anything is streamed. Thrown from the page, behind the
 * loading screen, the not-found page was finished in the browser instead
 * (status 200 and React's error #419 in the console).
 */
export default async function ProductLayout({ children, params }: { children: React.ReactNode; params: Promise<{ id: string }> }) {
  const id = Number((await params).id);
  if (!Number.isSafeInteger(id) || id < 1) notFound();
  const { app } = await requireClient("catalog");
  if (!app || app.connector?.kind !== "catalog") notFound();
  if (!(await (await getStore()).getCatalogProduct(app.id, id))) notFound();
  return children;
}
