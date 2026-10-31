/** MCP server over stdio: proxies the Play Pen tools from <url>/api/mcp and adds rag_ask (local model). */
import { createInterface } from "node:readline";
import { RAG } from "./rag.mjs";

const PROTOCOL = "2025-06-18";
const VERSION = "0.1.0";

export const RAG_TOOL = {
  name: "rag_ask",
  description: "Ask a question in plain words. Retrieves the most relevant Play Pen graph nodes and answers with the local model (Ollama by default, no API key), or lists the matches if no model is reachable.",
  inputSchema: { type: "object", properties: { question: { type: "string", description: "The question." } }, required: ["question"] },
  annotations: { readOnlyHint: true },
};

export function makeServer(client, rag = new RAG(client)) {
  async function remote(method, params) {
    const out = await client.mcp(method, params);
    if (out.error) throw new Error(out.error.message ?? JSON.stringify(out.error));
    return out.result;
  }
  return async function handle(msg) {
    const { id, method = "", params = {} } = msg;
    if (id === undefined && method.startsWith("notifications/")) return null;
    const ok = (result) => ({ jsonrpc: "2.0", id, result });
    try {
      switch (method) {
        case "initialize":
          return ok({
            protocolVersion: params.protocolVersion ?? PROTOCOL,
            capabilities: { tools: { listChanged: false } },
            serverInfo: { name: "playpen", version: VERSION },
            instructions: `Play Pen knowledge graph at ${client.url}: fly connectome tools and data, and what is built or needed for the tardigrade connectome. Addresses look like fcg:type/slug. Start with kg_search, kg_status or rag_ask.`,
          });
        case "ping": return ok({});
        case "tools/list": {
          let tools = [];
          try { tools = (await remote("tools/list", {})).tools; } catch (e) { process.stderr.write(`playpen-mcp: cannot reach ${client.url}: ${e.message}\n`); }
          return ok({ tools: [...tools, RAG_TOOL] });
        }
        case "tools/call": {
          if (params.name === "rag_ask") {
            const r = await rag.ask(String(params.arguments?.question ?? ""));
            return ok({ content: [{ type: "text", text: `${r.answer}\n\nSources: ${r.sources.join(", ")}\n(backend: ${r.backend}, model: ${r.model})` }], isError: false });
          }
          try { return ok(await remote("tools/call", { name: params.name, arguments: params.arguments ?? {} })); }
          catch (e) { return ok({ content: [{ type: "text", text: `Play Pen server error: ${e.message}` }], isError: true }); }
        }
        default:
          return { jsonrpc: "2.0", id, error: { code: -32601, message: `Method not found: ${method}` } };
      }
    } catch (e) {
      return { jsonrpc: "2.0", id, error: { code: -32603, message: e.message } };
    }
  };
}

export async function serve(handle, input = process.stdin, output = process.stdout) {
  const rl = createInterface({ input, crlfDelay: Infinity });
  for await (const line of rl) {
    if (!line.trim()) continue;
    let reply;
    try {
      const msg = JSON.parse(line);
      reply = Array.isArray(msg) ? (await Promise.all(msg.map(handle))).filter(Boolean) : await handle(msg);
      if (Array.isArray(reply) && !reply.length) reply = null;
    } catch { reply = { jsonrpc: "2.0", id: null, error: { code: -32700, message: "Parse error" } }; }
    if (reply) output.write(JSON.stringify(reply) + "\n");
  }
}
