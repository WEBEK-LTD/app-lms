import { fileNames, fontFileUrl, isBundledFont, searchFonts, type FontCategory } from "@/lib/fonts/catalog";
import { errorResponse, json } from "@/lib/http";

const CATEGORIES: readonly FontCategory[] = ["sans", "serif", "display", "handwriting", "mono"];

/**
 * 97.1 GET /api/v1/fonts?q=&arabic=1&category= (docs/api/platform.yaml): the
 * free fonts matching a search, for the dashboard's font picker. Each comes
 * with a file to show its name in (on Yallapp, never on Google).
 */
export function GET(request: Request): Response {
  const params = new URL(request.url).searchParams;
  const category = params.get("category");
  if (category && !CATEGORIES.includes(category as FontCategory)) return errorResponse(400, "bad_request", "Unknown category.");
  const found = searchFonts({
    q: (params.get("q") ?? "").slice(0, 60),
    arabic: params.get("arabic") === "1",
    category: (category as FontCategory | null) || null,
    limit: Number(params.get("limit")) || 40,
  });
  return json(
    {
      fonts: found.map((f) => ({
        family: f.family,
        category: f.category,
        arabic: f.arabic,
        bundled: isBundledFont(f.family),
        preview_url: fontFileUrl("", f, fileNames(f)[0]!),
      })),
    },
    200,
    { "cache-control": "public, max-age=3600" },
  );
}
