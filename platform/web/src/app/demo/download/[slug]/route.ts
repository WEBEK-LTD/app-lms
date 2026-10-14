import { getStore } from "@/lib/data";
import { demoAppOfType, demoDownloadBuild } from "@/lib/demo/apps";
import { demoTypeOfSlug } from "@/lib/demo/constants";
import { appUrl } from "@/lib/env";
import { buildFileRedirect } from "@/lib/files";

/**
 * GET /demo/download/<academy|store|restaurant|bookings|clinic|real-estate> (roadmap 16): the
 * stable public link to a demo app's Android APK (the build the team chose in
 * Admin › Demo apps), redirecting to a link signed at that moment. Without a
 * download yet it goes back to /demo.
 */
export async function GET(_: Request, { params }: RouteContext<"/demo/download/[slug]">): Promise<Response> {
  const { slug } = await params;
  const type = demoTypeOfSlug(slug);
  const store = await getStore();
  const app = type ? await demoAppOfType(store, type) : null;
  const build = app ? await demoDownloadBuild(store, app) : null;
  if (!build) {
    return new Response(null, { status: 303, headers: { location: new URL(`/demo?download=unavailable#${slug}`, appUrl()).toString(), "cache-control": "no-store" } });
  }
  return buildFileRedirect(build, "apk", `/demo`);
}
