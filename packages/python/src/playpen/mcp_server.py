"""MCP server over stdio for any MCP client (Claude Desktop, Claude Code, Cursor, ...).

It proxies the Play Pen's graph and agent tools from ``<PLAYPEN_URL>/api/mcp`` and adds one local
tool, ``rag_ask``, that answers with your local model (Ollama by default) using graph retrieval.

    playpen-mcp --url http://localhost:3000
    claude mcp add playpen -- playpen-mcp
"""
from __future__ import annotations

import argparse
import json
import sys
from typing import Any, Optional

from . import __version__
from .client import PlayPen
from .rag import RAG, OpenAICompatible

PROTOCOL = "2025-06-18"

RAG_TOOL = {
    "name": "rag_ask",
    "description": "Ask a question in plain words. Retrieves the most relevant Play Pen graph nodes and answers "
                   "with the local model (Ollama by default, no API key), or lists the matches if no model is reachable.",
    "inputSchema": {"type": "object", "properties": {
        "question": {"type": "string", "description": "The question."},
        "k": {"type": "integer", "description": "How many graph nodes to retrieve (default 6)."},
    }, "required": ["question"]},
    "annotations": {"readOnlyHint": True},
}


class Server:
    def __init__(self, client: PlayPen, rag: Optional[RAG] = None):
        self.client = client
        self.rag = rag or RAG(client)

    def _remote(self, method: str, params: Optional[dict]) -> Any:
        out = self.client.mcp(method, params)
        if "error" in out:
            raise RuntimeError(out["error"].get("message", str(out["error"])))
        return out["result"]

    def handle(self, msg: dict) -> Optional[dict]:
        mid, method, params = msg.get("id"), msg.get("method", ""), msg.get("params") or {}
        if mid is None and method.startswith("notifications/"):
            return None

        def ok(result: Any) -> dict:
            return {"jsonrpc": "2.0", "id": mid, "result": result}

        try:
            if method == "initialize":
                return ok({
                    "protocolVersion": params.get("protocolVersion", PROTOCOL),
                    "capabilities": {"tools": {"listChanged": False}},
                    "serverInfo": {"name": "playpen", "version": __version__},
                    "instructions": f"Play Pen knowledge graph at {self.client.url}: fly connectome tools and data, and what is "
                                    "built or needed for the tardigrade connectome. Addresses look like fcg:type/slug. "
                                    "Start with kg_search, kg_status or rag_ask.",
                })
            if method == "ping":
                return ok({})
            if method == "tools/list":
                try:
                    tools = self._remote("tools/list", {})["tools"]
                except Exception as e:  # server down: still offer rag_ask so the client sees why
                    sys.stderr.write(f"playpen-mcp: cannot reach {self.client.url}: {e}\n")
                    tools = []
                return ok({"tools": tools + [RAG_TOOL]})
            if method == "tools/call":
                name, args = params.get("name"), params.get("arguments") or {}
                if name == "rag_ask":
                    rag = self.rag
                    if args.get("k"):
                        rag = RAG(self.client, rag.llm, k=int(args["k"]))
                    res = rag.ask(str(args.get("question", "")))
                    text = res["answer"] + "\n\nSources: " + ", ".join(res["sources"]) + f"\n(backend: {res['backend']}, model: {res['model']})"
                    return ok({"content": [{"type": "text", "text": text}], "isError": False})
                try:
                    return ok(self._remote("tools/call", {"name": name, "arguments": args}))
                except Exception as e:
                    return ok({"content": [{"type": "text", "text": f"Play Pen server error: {e}"}], "isError": True})
            return {"jsonrpc": "2.0", "id": mid, "error": {"code": -32601, "message": f"Method not found: {method}"}}
        except Exception as e:
            return {"jsonrpc": "2.0", "id": mid, "error": {"code": -32603, "message": str(e)}}


def serve(server: Server, stdin=None, stdout=None) -> None:
    stdin, stdout = stdin or sys.stdin, stdout or sys.stdout
    for line in stdin:
        line = line.strip()
        if not line:
            continue
        try:
            msg = json.loads(line)
        except ValueError:
            reply: Any = {"jsonrpc": "2.0", "id": None, "error": {"code": -32700, "message": "Parse error"}}
        else:
            if isinstance(msg, list):
                reply = [r for r in (server.handle(m) for m in msg) if r] or None
            else:
                reply = server.handle(msg)
        if reply:
            stdout.write(json.dumps(reply) + "\n")
            stdout.flush()


def main(argv: Optional[list] = None) -> None:
    p = argparse.ArgumentParser(prog="playpen-mcp", description="Play Pen MCP server (stdio).")
    p.add_argument("--url", help="Play Pen server (default PLAYPEN_URL or http://localhost:3000)")
    p.add_argument("--model", help="Local model for rag_ask (default PLAYPEN_LOCAL_MODEL or llama3.1:8b)")
    p.add_argument("--llm-url", help="OpenAI-compatible URL (default PLAYPEN_LOCAL_URL or Ollama)")
    a = p.parse_args(argv)
    client = PlayPen(a.url)
    serve(Server(client, RAG(client, OpenAICompatible(url=a.llm_url, model=a.model))))


if __name__ == "__main__":
    main()
