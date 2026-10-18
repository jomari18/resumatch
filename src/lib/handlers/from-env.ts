import "server-only";
import { getServerConfig } from "@/lib/config";
import { createShareHandlers } from "@/lib/handlers/share";
import { MESSAGES, errorResponse } from "@/lib/http";
import { getStores } from "@/lib/store";

/** Builds the share handlers from the environment; a configuration problem becomes a 503, not an HTML 500. */
export async function shareHandlersFromEnv(): Promise<ReturnType<typeof createShareHandlers> | Response> {
  try {
    const config = getServerConfig(process.env, { scope: "store" });
    const { shares } = await getStores(config);
    return createShareHandlers({ shares, config });
  } catch (error) {
    console.error(JSON.stringify({ route: "share", code: "config_error", message: (error as Error).message }));
    return errorResponse(503, "service_unavailable", MESSAGES.busy);
  }
}
