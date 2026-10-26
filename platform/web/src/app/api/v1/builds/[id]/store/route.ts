import { errorResponse, json } from "@/lib/http";
import { authorizePipeline } from "@/lib/pipeline-auth";

/** GET /api/v1/builds/{id}/store (docs/api/pipeline.yaml): the store listing snapshot, for the store assets file. */
export async function GET(request: Request, { params }: RouteContext<"/api/v1/builds/[id]/store">): Promise<Response> {
  const auth = await authorizePipeline(request);
  if ("response" in auth) return auth.response;
  const build = await auth.store.getBuild((await params).id);
  if (!build) return errorResponse(404, "build_not_found", "There's no build with this ID.");
  const listing = build.storeListing;
  return json({
    store_title: listing.storeTitle,
    short_description: listing.shortDescription,
    full_description: listing.fullDescription,
    support_email: listing.supportEmail,
    privacy_url: listing.privacyUrl,
    phone_screenshots: listing.phoneScreenshots ?? [],
    iphone_screenshots: listing.iphoneScreenshots ?? [],
    // 88.2
    language: listing.language ?? "en",
    translations: (listing.translations ?? []).map((t) => ({
      language: t.language,
      store_title: t.storeTitle,
      short_description: t.shortDescription,
      full_description: t.fullDescription,
      captions: t.captions,
    })),
    tablet_screenshots: listing.tabletScreenshots ?? [],
    ipad_screenshots: listing.ipadScreenshots ?? [],
    frame: listing.frame ? { background: listing.frame.background.toUpperCase(), text_color: listing.frame.textColor, captions: listing.frame.captions } : null,
  });
}
