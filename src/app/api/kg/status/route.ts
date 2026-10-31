import { status, sync } from "@/lib/kg/graph";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  await sync();
  return Response.json(status(new URL(req.url).searchParams.get("type") ?? undefined));
}
