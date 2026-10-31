import { DATASETS, neuron } from "@/lib/datasets";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string; nid: string }> }) {
  const { id, nid } = await params;
  if (!DATASETS.some((d) => d.id === id)) return Response.json({ error: `unknown dataset ${id}` }, { status: 404 });
  const r = neuron(id, decodeURIComponent(nid));
  if (r === null) return Response.json({ error: `dataset ${id} is not fetched on this server; run npm run data:fetch` }, { status: 503 });
  if (r === undefined) return Response.json({ error: `no neuron ${nid} in ${id}` }, { status: 404 });
  return Response.json(r);
}
