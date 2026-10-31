import { DATASETS, searchNeurons } from "@/lib/datasets";

export const dynamic = "force-dynamic";

/** GET /api/datasets/<id>/neurons?q=KC&limit=50&offset=0 */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!DATASETS.some((d) => d.id === id)) return Response.json({ error: `unknown dataset ${id}` }, { status: 404 });
  const u = new URL(req.url);
  const r = searchNeurons(id, u.searchParams.get("q") ?? "", { limit: Number(u.searchParams.get("limit") ?? 50) || 50, offset: Number(u.searchParams.get("offset") ?? 0) || 0 });
  if (!r) return Response.json({ error: `dataset ${id} is not fetched on this server; run npm run data:fetch` }, { status: 503 });
  return Response.json(r);
}
