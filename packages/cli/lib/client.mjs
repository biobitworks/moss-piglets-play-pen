/** Client for the Play Pen REST, chat and MCP endpoints. Node 18+ (global fetch), no dependencies. */
export const DEFAULT_URL = "http://localhost:3000";

export class PlayPenError extends Error {}

export async function request(method, url, { body, params, headers = {}, timeout = 30000 } = {}) {
  if (params) {
    const q = new URLSearchParams(Object.entries(params).filter(([, v]) => v != null).map(([k, v]) => [k, String(v)]));
    if ([...q].length) url += (url.includes("?") ? "&" : "?") + q;
  }
  const res = await fetch(url, {
    method,
    headers: { accept: "application/json", ...(body !== undefined ? { "content-type": "application/json" } : {}), ...headers },
    body: body !== undefined ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(timeout),
  });
  const text = await res.text();
  let data;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if (!res.ok) {
    const e = new PlayPenError(`HTTP ${res.status} from ${url}: ${data?.error ?? text.slice(0, 200)}`);
    e.status = res.status; e.body = data;
    throw e;
  }
  return data;
}

const clean = (o) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined && v !== null));

export class PlayPen {
  constructor(url, { timeout = 30000 } = {}) {
    this.url = (url || process.env.PLAYPEN_URL || DEFAULT_URL).replace(/\/+$/, "");
    this.timeout = timeout;
  }
  get(path, params, timeout) { return request("GET", this.url + path, { params, timeout: timeout ?? this.timeout }); }
  post(path, body, timeout) { return request("POST", this.url + path, { body, timeout: timeout ?? this.timeout }); }

  async ping() { try { await this.get("/api/tools", undefined, 5000); return true; } catch { return false; } }
  async tools() { return (await this.get("/api/tools")).tools; }
  async call(name, args = {}) {
    let out;
    try { out = await this.post(`/api/tools/${name}`, clean(args)); }
    catch (e) { if (e.body?.error) throw new PlayPenError(e.body.error); throw e; }
    if (out?.error) throw new PlayPenError(out.error);
    return out?.result ?? out;
  }

  search(query, { k = 8, type, status } = {}) { return this.call("kg_search", { query, k, type, status }); }
  node(id) { return this.call("kg_get_node", { id }); }
  list(type, status) { return this.call("kg_list", { type, status }); }
  status(type) { return this.call("kg_status", { type }); }
  worklog(limit = 20) { return this.call("kg_worklog", { limit }); }
  addNode(n) { return this.call("kg_add_node", n); }
  addEdge(from, type, to) { return this.call("kg_add_edge", { from, type, to }); }
  registerAgent(a) { return this.call("agent_register", a); }
  send(from, body, { to, topic, about } = {}) { return this.call("agent_send", { from, body, to, topic, about }); }
  subscribe(agent, topic) { return this.call("agent_subscribe", { agent, topic }); }
  inbox({ agent, topic, since } = {}) { return this.call("agent_inbox", { agent, topic, since }); }
  agents() { return this.call("agent_list"); }

  backends() { return this.get("/api/chat"); }
  chat(message, { backend, model, history = [] } = {}) {
    return this.post("/api/chat", clean({ messages: [...history, { role: "user", content: message }], backend, model }), 180000);
  }
  mcp(method, params, id = 1) { return this.post("/api/mcp", clean({ jsonrpc: "2.0", id, method, params })); }
}
