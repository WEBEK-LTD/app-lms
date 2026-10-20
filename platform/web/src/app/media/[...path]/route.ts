import { mediaSigningSecret } from "@/lib/env";
import { handleMediaRequest } from "@/lib/media/disk";
import { localMediaDisk } from "@/lib/media/storage";

/**
 * 51 The media gate in local runs and tests ("fs" mode): the same signed
 * links as deploy/media-host/index.php on Yallapp's server, which answers
 * /media/* there before anything reaches the platform. Elsewhere: 404.
 */
export const dynamic = "force-dynamic";

async function handle(request: Request, { params }: RouteContext<"/media/[...path]">): Promise<Response> {
  const disk = localMediaDisk();
  if (!disk) return new Response("Not found.", { status: 404, headers: { "cache-control": "no-store" } });
  const { path } = await params;
  return handleMediaRequest(disk, request, `/${path.join("/")}`, mediaSigningSecret());
}

export const GET = handle;
export const HEAD = handle;
export const PUT = handle;
/** 64b Chunks by POST too: server firewalls often refuse PUT. */
export const POST = handle;
export const DELETE = handle;
