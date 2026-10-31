import { status } from "@/lib/kg/graph";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  return Response.json(status(new URL(req.url).searchParams.get("type") ?? undefined));
}
