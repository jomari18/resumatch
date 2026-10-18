import { shareHandlersFromEnv } from "@/lib/handlers/from-env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request): Promise<Response> {
  const handlers = await shareHandlersFromEnv();
  return handlers instanceof Response ? handlers : handlers.create(req);
}
