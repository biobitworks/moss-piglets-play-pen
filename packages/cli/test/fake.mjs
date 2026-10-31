// Fake Play Pen server + fake Ollama for tests (no network needed).
import { createServer } from "node:http";

export const NODES = {
  "fcg:tool/navis": { id: "fcg:tool/navis", type: "tool", label: "navis", status: "built", description: "Python neuron analysis.", props: { install: "pip install navis" }, links: [{ edge: "serves", direction: "out", node: { id: "fcg:stage/analysis", label: "Analysis" } }] },
  "fcg:stage/tracing": { id: "fcg:stage/tracing", type: "stage", label: "Neuron tracing", status: "needed", description: "Trace tardigrade neurons.", links: [] },
};
const TOOLS = [{ name: "kg_search", description: "search", input_schema: { type: "object" }, writes: false }, { name: "agent_send", description: "send", input_schema: { type: "object" }, writes: true }];

function tool(name, a) {
  if (name === "kg_search") return Object.values(NODES).map(({ id, type, label, status, description }, i) => ({ id, type, label, status, description, score: 0.5 - i * 0.1 })).slice(0, a.k ?? 8);
  if (name === "kg_get_node") { const id = a.id.startsWith("fcg:") ? a.id : "fcg:" + a.id; if (!NODES[id]) throw new Error(`No node ${id}`); return NODES[id]; }
  if (name === "kg_status") return { counts: { built: 1, needed: 1 }, needed: [NODES["fcg:stage/tracing"]] };
  if (name === "agent_send") return { id: "fcg:message/1", args: a };
  throw new Error(`unknown tool ${name}`);
}

export async function startFake(state = { llmUp: true, calls: [] }) {
  const srv = createServer(async (req, res) => {
    let raw = ""; for await (const c of req) raw += c;
    const body = raw ? JSON.parse(raw) : {};
    const send = (code, obj) => { res.writeHead(code, { "content-type": "application/json" }); res.end(JSON.stringify(obj)); };
    const p = req.url.split("?")[0];
    state.calls.push([req.method, p, body]);
    if (req.method === "GET" && p === "/api/tools") return send(200, { tools: TOOLS });
    if (req.method === "GET" && p === "/v1/models") return state.llmUp ? send(200, { data: [{ id: "tiny" }] }) : send(503, { error: "down" });
    if (p.startsWith("/api/tools/")) { try { return send(200, { result: tool(p.split("/").pop(), body) }); } catch (e) { return send(400, { error: e.message }); } }
    if (p === "/api/chat") return send(200, { reply: "from server: " + body.messages.at(-1).content, backend: body.backend ?? "local", model: "tiny" });
    if (p === "/api/mcp") {
      if (body.method === "tools/list") return send(200, { jsonrpc: "2.0", id: body.id, result: { tools: TOOLS.map((t) => ({ name: t.name })) } });
      return send(200, { jsonrpc: "2.0", id: body.id, result: { content: [{ type: "text", text: JSON.stringify(tool(body.params.name, body.params.arguments)) }], isError: false } });
    }
    if (p === "/v1/chat/completions") { const ctx = body.messages.at(-1).content; return send(200, { choices: [{ message: { content: `LLM saw ${ctx.split("[fcg:").length - 1} nodes` } }] }); }
    send(404, { error: "not found" });
  });
  await new Promise((r) => srv.listen(0, "127.0.0.1", r));
  return { url: `http://127.0.0.1:${srv.address().port}`, state, close: () => new Promise((r) => srv.close(r)) };
}
