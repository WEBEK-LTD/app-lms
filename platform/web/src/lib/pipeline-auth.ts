import "server-only";
import { limitByIp } from "./api";
import { getStore } from "./data";
import type { DataStore } from "./data/store";
import { buildPipelineToken } from "./env";
import { errorResponse, hasBearerToken } from "./http";
import { RATE_LIMITS } from "./rate-limit";

/** Pipeline endpoints need `Authorization: Bearer $BUILD_PIPELINE_TOKEN`. */
export async function authorizePipeline(request: Request): Promise<{ store: DataStore } | { response: Response }> {
  const store = await getStore();
  const limited = await limitByIp(store, request, RATE_LIMITS.pipelineIp);
  if (limited) return { response: limited };
  if (!hasBearerToken(request, buildPipelineToken())) {
    return {
      response: errorResponse(401, "unauthorized", "A valid pipeline token is required.", { "www-authenticate": 'Bearer realm="yallapp-pipeline"' }),
    };
  }
  return { store };
}
