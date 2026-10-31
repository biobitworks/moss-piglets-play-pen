import { fco, graph, status, version } from "@/lib/kg/graph";

export const dynamic = "force-dynamic";

/** The whole graph as JSON (FCO vocabulary + FCG nodes and edges). */
export async function GET(req: Request) {
  const G = graph();
  const type = new URL(req.url).searchParams.get("type");
  const nodes = [...G.nodes.values()].filter((n) => !type || n.type === type);
  const ids = new Set(nodes.map((n) => n.id));
  return Response.json({
    version: version(),
    fco: { name: fco.name, version: fco.version, statuses: fco.statuses, nodeTypes: fco.nodeTypes, edgeTypes: fco.edgeTypes },
    summary: status(),
    nodes,
    edges: G.edges.filter((e) => ids.has(e.from) || ids.has(e.to)),
  });
}
