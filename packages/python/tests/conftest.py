"""A fake Play Pen server and a fake Ollama in one thread, so tests need no network."""
import json
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

import pytest

NODES = {
    "fcg:tool/navis": {"id": "fcg:tool/navis", "type": "tool", "label": "navis", "status": "built",
                       "description": "Python neuron analysis.", "props": {"install": "pip install navis"},
                       "links": [{"edge": "serves", "direction": "out", "node": {"id": "fcg:stage/analysis", "label": "Analysis"}}]},
    "fcg:stage/tracing": {"id": "fcg:stage/tracing", "type": "stage", "label": "Neuron tracing", "status": "needed",
                          "description": "Trace tardigrade neurons.", "links": []},
}
TOOLS = [{"name": "kg_search", "description": "search", "input_schema": {"type": "object"}, "writes": False},
         {"name": "agent_send", "description": "send", "input_schema": {"type": "object"}, "writes": True}]


class State:
    calls = []
    llm_up = True
    embed = False


def tool(name, args):
    if name == "kg_search":
        hits = [{k: n[k] for k in ("id", "type", "label", "status", "description")} | {"score": 0.5 - i * 0.1}
                for i, n in enumerate(NODES.values())]
        return hits[: int(args.get("k", 8))]
    if name == "kg_get_node":
        nid = args["id"] if args["id"].startswith("fcg:") else "fcg:" + args["id"]
        if nid not in NODES:
            raise KeyError(f"No node {nid}")
        return NODES[nid]
    if name == "kg_status":
        return {"counts": {"built": 1, "needed": 1}, "needed": [NODES["fcg:stage/tracing"]]}
    if name == "agent_register":
        return {"id": "fcg:agent/" + args["name"]}
    if name == "agent_send":
        return {"id": "fcg:message/1", "delivered": [args.get("to")] if isinstance(args.get("to"), str) else args.get("to")}
    raise KeyError(f"unknown tool {name}")


class H(BaseHTTPRequestHandler):
    def log_message(self, *a):
        pass

    def _json(self, code, obj):
        b = json.dumps(obj).encode()
        self.send_response(code)
        self.send_header("content-type", "application/json")
        self.send_header("content-length", str(len(b)))
        self.end_headers()
        self.wfile.write(b)

    def _body(self):
        n = int(self.headers.get("content-length") or 0)
        return json.loads(self.rfile.read(n) or b"{}")

    def do_GET(self):
        p = self.path.split("?")[0]
        State.calls.append(("GET", self.path))
        if p == "/api/tools":
            return self._json(200, {"tools": TOOLS})
        if p == "/api/chat":
            return self._json(200, {"default": "local", "backends": [{"id": "local", "available": True}]})
        if p == "/v1/models":
            return self._json(200, {"data": [{"id": "tiny"}]}) if State.llm_up else self._json(503, {"error": "down"})
        self._json(404, {"error": "not found"})

    def do_POST(self):
        p, body = self.path, self._body()
        State.calls.append(("POST", p, body))
        if p.startswith("/api/tools/"):
            try:
                return self._json(200, {"tool": p.rsplit("/", 1)[1], "result": tool(p.rsplit("/", 1)[1], body)})
            except KeyError as e:
                return self._json(400, {"error": str(e).strip("'")})
        if p == "/api/chat":
            return self._json(200, {"reply": "from server: " + body["messages"][-1]["content"], "backend": body.get("backend", "local"), "model": "tiny"})
        if p == "/api/mcp":
            if body["method"] == "tools/list":
                return self._json(200, {"jsonrpc": "2.0", "id": body["id"], "result": {"tools": [{"name": t["name"]} for t in TOOLS]}})
            if body["method"] == "tools/call":
                r = tool(body["params"]["name"], body["params"]["arguments"])
                return self._json(200, {"jsonrpc": "2.0", "id": body["id"], "result": {"content": [{"type": "text", "text": json.dumps(r)}], "isError": False}})
        if p == "/v1/chat/completions":
            ctx = body["messages"][-1]["content"]
            return self._json(200, {"choices": [{"message": {"content": f"LLM saw {ctx.count('[fcg:')} nodes"}}]})
        if p == "/v1/embeddings":
            vecs = [[1.0, 0.0] if "tracing" in t.lower() or "trace" in t.lower() else [0.0, 1.0] for t in body["input"]]
            return self._json(200, {"data": [{"index": i, "embedding": v} for i, v in enumerate(vecs)]})
        self._json(404, {"error": "not found"})


@pytest.fixture()
def server():
    State.calls, State.llm_up = [], True
    srv = ThreadingHTTPServer(("127.0.0.1", 0), H)
    t = threading.Thread(target=srv.serve_forever, daemon=True)
    t.start()
    yield f"http://127.0.0.1:{srv.server_address[1]}"
    srv.shutdown()
