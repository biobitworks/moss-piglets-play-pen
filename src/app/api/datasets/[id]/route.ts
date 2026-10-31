import { DATASETS, summary } from "@/lib/datasets";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!DATASETS.some((d) => d.id === id)) return Response.json({ error: `unknown dataset ${id}` }, { status: 404 });
  const s = summary(id);
  if (!s) return Response.json({ error: `dataset ${id} is not fetched on this server; run npm run data:fetch` }, { status: 503 });
  return Response.json(s);
}
