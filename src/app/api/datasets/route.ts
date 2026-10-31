import { list } from "@/lib/datasets";

export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json({ datasets: list() });
}
