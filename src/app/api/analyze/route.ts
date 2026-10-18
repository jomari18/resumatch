import { getProvider } from "@/lib/ai";
import { getServerConfig } from "@/lib/config";
import { createAnalyzeHandler } from "@/lib/handlers/analyze";
import { MESSAGES, errorResponse } from "@/lib/http";
import { getStores } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request): Promise<Response> {
  let handler: (req: Request) => Promise<Response>;
  try {
    const config = getServerConfig();
    const [provider, stores] = await Promise.all([getProvider(config), getStores(config)]);
    handler = createAnalyzeHandler({ provider, rateLimits: stores.rateLimits, config });
  } catch (error) {
    console.error(JSON.stringify({ route: "analyze", code: "config_error", message: (error as Error).message }));
    return errorResponse(503, "service_unavailable", MESSAGES.busy);
  }
  return handler(req);
}
