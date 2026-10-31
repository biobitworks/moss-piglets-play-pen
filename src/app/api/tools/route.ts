import { TOOLS } from "@/lib/kg/tools";

export async function GET() {
  return Response.json({
    note: "POST JSON arguments to /api/tools/<name>. The same tools are served over MCP at /api/mcp.",
    tools: TOOLS.map((t) => ({ name: t.name, description: t.description, input_schema: t.input_schema, writes: !!t.writes })),
  });
}
