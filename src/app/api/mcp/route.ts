import pkg from "../../../../package.json";
import { runTool, TOOLS } from "@/lib/kg/tools";
import { flush, sync } from "@/lib/kg/graph";

/**
 * Minimal MCP server over Streamable HTTP (stateless, JSON responses).
 * Add it to an MCP client as an HTTP server at <base-url>/api/mcp, e.g.
 *   claude mcp add --transport http playpen http://localhost:3000/api/mcp
 */
export const dynamic = "force-dynamic";

type Rpc = { jsonrpc: "2.0"; id?: string | number | null; method: string; params?: Record<string, unknown> };
const PROTOCOL = "2025-06-18";

async function handle(msg: Rpc) {
  const ok = (result: unknown) => ({ jsonrpc: "2.0", id: msg.id ?? null, result });
  const err = (code: number, message: string) => ({ jsonrpc: "2.0", id: msg.id ?? null, error: { code, message } });
  switch (msg.method) {
    case "initialize":
      return ok({
        protocolVersion: (msg.params?.protocolVersion as string) ?? PROTOCOL,
        capabilities: { tools: { listChanged: false } },
        serverInfo: { name: "moss-piglets-play-pen", version: pkg.version },
        instructions:
          "Knowledge graph of what exists for the fly connectome and what is built or still needed for the tardigrade (Tardimap). Every node has an address fcg:type/slug. Start with kg_search or kg_status. Agents can message each other with agent_send.",
      });
    case "ping":
      return ok({});
    case "tools/list":
      return ok({ tools: TOOLS.map((t) => ({ name: t.name, description: t.description, inputSchema: t.input_schema, annotations: { readOnlyHint: !t.writes } })) });
    case "tools/call": {
      const name = String(msg.params?.name ?? "");
      try {
        const result = runTool(name, (msg.params?.arguments as Record<string, unknown>) ?? {});
        await flush();
        return ok({ content: [{ type: "text", text: JSON.stringify(result, null, 1) }], isError: false });
      } catch (e) {
        return ok({ content: [{ type: "text", text: (e as Error).message }], isError: true });
      }
    }
    default:
      if (msg.method?.startsWith("notifications/")) return null;
      return err(-32601, `Method not found: ${msg.method}`);
  }
}

export async function POST(req: Request) {
  let body: Rpc | Rpc[];
  try {
    body = await req.json();
  } catch {
    return Response.json({ jsonrpc: "2.0", id: null, error: { code: -32700, message: "Parse error" } }, { status: 400 });
  }
  await sync();
  const replies = [];
  for (const m of Array.isArray(body) ? body : [body]) {
    const r = await handle(m);
    if (r) replies.push(r);
  }
  if (!replies.length) return new Response(null, { status: 202 });
  return Response.json(Array.isArray(body) ? replies : replies[0]);
}

export async function GET() {
  return Response.json(
    { name: "moss-piglets-play-pen MCP", transport: "streamable-http (POST JSON-RPC to this URL)", tools: TOOLS.map((t) => t.name) },
    { status: 200 },
  );
}
