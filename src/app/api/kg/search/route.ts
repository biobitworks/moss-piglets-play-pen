import { search } from "@/lib/kg/vector";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const u = new URL(req.url);
  const q = u.searchParams.get("q") ?? "";
  if (!q.trim()) return Response.json({ error: "add ?q=your question" }, { status: 400 });
  const k = Math.min(50, Number(u.searchParams.get("k") ?? 8) || 8);
  return Response.json({ q, hits: search(q, { k, type: u.searchParams.get("type") ?? undefined, status: u.searchParams.get("status") ?? undefined }) });
}
