import { shareHandlersFromEnv } from "@/lib/handlers/from-env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function DELETE(req: Request, ctx: RouteContext<"/api/share/[id]">): Promise<Response> {
  const { id } = await ctx.params;
  const handlers = await shareHandlersFromEnv();
  return handlers instanceof Response ? handlers : handlers.remove(req, id);
}
