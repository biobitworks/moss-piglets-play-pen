import { graph, neighbors, resolveId, sync } from "@/lib/kg/graph";

export const dynamic = "force-dynamic";

/** GET /api/kg/node/tool/navis  ->  fcg:tool/navis */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string[] }> }) {
  await sync();
  const { id } = await params;
  const addr = resolveId(id.join("/"));
  const n = graph().nodes.get(addr);
  if (!n) return Response.json({ error: `no node ${addr}` }, { status: 404 });
  return Response.json({ ...n, links: neighbors(addr) });
}
