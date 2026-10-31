import { agents, messages, send } from "@/lib/kg/bus";

export const dynamic = "force-dynamic";

/** GET: agents and messages (?agent=, ?topic=, ?since=). POST: send { from, to | to[] | topic, body, about? }. */
export async function GET(req: Request) {
  const p = new URL(req.url).searchParams;
  return Response.json({
    agents: agents(),
    messages: messages({ agent: p.get("agent") ?? undefined, topic: p.get("topic") ?? undefined, since: p.get("since") ?? undefined }),
  });
}

export async function POST(req: Request) {
  if (process.env.PLAYPEN_READONLY === "1") return Response.json({ error: "read-only deployment" }, { status: 403 });
  try {
    return Response.json(send(await req.json()));
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 400 });
  }
}
