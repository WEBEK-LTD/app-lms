import { freeFontFile } from "@/lib/fonts/files";
import { errorResponse } from "@/lib/http";

/**
 * 97.1 GET /api/v1/fonts/{licence}/{folder}/{file} (docs/api/platform.yaml):
 * a free font's file, for the apps and the dashboard's font previews. Public
 * and never changing, like the fonts themselves (open font licences).
 */
export async function GET(_request: Request, { params }: RouteContext<"/api/v1/fonts/[...path]">): Promise<Response> {
  const { path } = await params;
  if (path.length !== 3) return errorResponse(404, "not_found", "Not found.");
  const [licence, folder, file] = path;
  const font = await freeFontFile(`${licence}/${folder}`, file!);
  if (!font) return errorResponse(404, "not_found", "Not found.");
  if (font === "unavailable") return errorResponse(503, "font_unavailable", "This font can't be loaded right now. Try again in a minute.", { "retry-after": "60" });
  return new Response(new Uint8Array(font.data), {
    headers: {
      "content-type": font.contentType,
      "content-length": String(font.data.length),
      "cache-control": "public, max-age=31536000, immutable",
      "access-control-allow-origin": "*",
      "x-content-type-options": "nosniff",
    },
  });
}
