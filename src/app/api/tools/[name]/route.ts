import { runTool, toolByName } from "@/lib/kg/tools";

export const dynamic = "force-dynamic";

async function call(name: string, input: Record<string, unknown>) {
  if (!toolByName.has(name)) return Response.json({ error: `unknown tool ${name}` }, { status: 404 });
  try {
    return Response.json({ tool: name, result: runTool(name, input) });
  } catch (e) {
    return Response.json({ tool: name, error: (e as Error).message }, { status: 400 });
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  let input: Record<string, unknown> = {};
  try {
    input = await req.json();
  } catch {}
  return call(name, input);
}

/** Read-only tools can also be called with query parameters. */
export async function GET(req: Request, { params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  if (toolByName.get(name)?.writes) return Response.json({ error: "use POST for tools that write" }, { status: 405 });
  return call(name, Object.fromEntries(new URL(req.url).searchParams));
}
