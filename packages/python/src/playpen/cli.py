"""``playpen`` command line."""
from __future__ import annotations

import argparse
import json
import sys
from typing import Any, List, Optional

from . import __version__
from .client import PlayPen, PlayPenError
from .http import HTTPError
from .rag import RAG, Anthropic, OpenAICompatible


def _print(obj: Any, as_json: bool) -> None:
    if as_json or not isinstance(obj, (list, dict)):
        print(json.dumps(obj, indent=1) if not isinstance(obj, str) else obj)
        return
    print(json.dumps(obj, indent=1))


def _hits(hits: list) -> None:
    for h in hits:
        print(f"{h.get('score', ''):>6}  {h['id']:<42} {h.get('status') or '':<11} {h.get('label', '')}")


def _status(s: dict) -> None:
    counts = s.get("counts", {})
    print("  ".join(f"{k}: {v}" for k, v in counts.items()))
    for key in ("in_progress", "needed", "blocked"):
        items = s.get(key) or []
        if items:
            print(f"\n{key.replace('_', ' ')}:")
            for n in items:
                print(f"  {n['id']:<44} {n.get('label', '')}")


def _kv(pairs: List[str]) -> dict:
    out = {}
    for p in pairs:
        k, _, v = p.partition("=")
        try:
            out[k] = json.loads(v)
        except ValueError:
            out[k] = v
    return out


def build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(prog="playpen", description="Moss Piglets Play Pen connector: graph, agents, RAG and MCP.")
    p.add_argument("--url", help="Play Pen server (default PLAYPEN_URL or http://localhost:3000)")
    p.add_argument("--json", action="store_true", help="Raw JSON output")
    p.add_argument("--version", action="version", version=f"playpen {__version__}")
    sub = p.add_subparsers(dest="cmd", required=True)

    sub.add_parser("ping", help="Check the server is reachable")
    s = sub.add_parser("search", help="Vector search over the graph")
    s.add_argument("query", nargs="+")
    s.add_argument("-k", type=int, default=8)
    s.add_argument("--type")
    s.add_argument("--status")
    s = sub.add_parser("node", help="One node and its links, by address (fcg:tool/navis)")
    s.add_argument("id")
    s = sub.add_parser("list", help="List nodes of a type")
    s.add_argument("type")
    s.add_argument("--status")
    s = sub.add_parser("status", help="What is built and what is still needed")
    s.add_argument("--type")
    s = sub.add_parser("worklog", help="Timestamped proof of work")
    s.add_argument("--limit", type=int, default=20)
    sub.add_parser("tools", help="List the tools the server offers")
    s = sub.add_parser("call", help="Call any tool: playpen call kg_search query=navis k=3")
    s.add_argument("name")
    s.add_argument("args", nargs="*", help="key=value (values parsed as JSON when possible)")
    s = sub.add_parser("ask", help="RAG: retrieve from the graph, answer with a local model (no API key)")
    s.add_argument("question", nargs="+")
    s.add_argument("--llm", choices=["local", "search", "anthropic", "openai"], default="local",
                   help="local = Ollama/OpenAI-compatible at PLAYPEN_LOCAL_URL (default); search = graph only; "
                        "anthropic/openai = frontier, needs a key")
    s.add_argument("--model")
    s.add_argument("--llm-url")
    s.add_argument("--embed-model", help="Re-rank with an embedding model, e.g. nomic-embed-text")
    s.add_argument("-k", type=int, default=6)
    s = sub.add_parser("chat", help="Ask the server's own chat endpoint")
    s.add_argument("message", nargs="+")
    s.add_argument("--backend", choices=["claude", "local", "search"])
    s.add_argument("--model")
    sub.add_parser("backends", help="Chat backends the server has")
    sub.add_parser("agents", help="Registered agents")
    s = sub.add_parser("register", help="Register an agent")
    s.add_argument("name")
    s.add_argument("--description")
    s.add_argument("--capability", action="append", default=[])
    s.add_argument("--topic", action="append", default=[])
    s = sub.add_parser("send", help="Send a message: --to a [--to b] or --topic t")
    s.add_argument("sender")
    s.add_argument("body")
    s.add_argument("--to", action="append")
    s.add_argument("--topic")
    s.add_argument("--about", action="append")
    s = sub.add_parser("inbox", help="Messages for an agent or topic")
    s.add_argument("--agent")
    s.add_argument("--topic")
    s.add_argument("--since")
    s = sub.add_parser("mcp", help="Run the MCP server on stdio (same as playpen-mcp)")
    s.add_argument("--model")
    s.add_argument("--llm-url")
    return p


def make_llm(a: argparse.Namespace):
    if a.llm == "search":
        return None
    if a.llm == "anthropic":
        return Anthropic(model=a.model)
    if a.llm == "openai":
        import os
        return OpenAICompatible(url=a.llm_url or "https://api.openai.com/v1", model=a.model or "gpt-4o-mini",
                                api_key=os.environ.get("OPENAI_API_KEY"), embed_model=a.embed_model)
    return OpenAICompatible(url=a.llm_url, model=a.model, embed_model=a.embed_model)


def run(argv: Optional[list] = None) -> int:
    a = build_parser().parse_args(argv)
    pp = PlayPen(a.url)
    j = a.json
    if a.cmd == "ping":
        up = pp.ping()
        print(f"{pp.url} {'reachable' if up else 'NOT reachable'}")
        return 0 if up else 1
    if a.cmd == "search":
        hits = pp.search(" ".join(a.query), k=a.k, type=a.type, status=a.status)
        _print(hits, True) if j else _hits(hits)
    elif a.cmd == "node":
        _print(pp.node(a.id), True)
    elif a.cmd == "list":
        res = pp.list(a.type, a.status)
        _print(res, True) if j else [print(f"{n['id']:<44} {n.get('status') or '':<11} {n.get('label', '')}") for n in res]
    elif a.cmd == "status":
        res = pp.status(a.type)
        _print(res, True) if j else _status(res)
    elif a.cmd == "worklog":
        res = pp.worklog(a.limit)
        if j:
            _print(res, True)
        else:
            for e in res.get("entries", []):
                print(f"{e.get('at', '')}  {e.get('task') or e.get('kind'):<6} {e.get('status') or '':<11} {(e.get('commit') or '')[:7]}  {e.get('summary') or ''}")
    elif a.cmd == "tools":
        res = pp.tools()
        _print(res, True) if j else [print(f"{t['name']:<16} {'write' if t.get('writes') else 'read ':<6} {t['description'][:90]}") for t in res]
    elif a.cmd == "call":
        _print(pp.call(a.name, **_kv(a.args)), True)
    elif a.cmd == "ask":
        res = RAG(pp, make_llm(a), k=a.k).ask(" ".join(a.question))
        if j:
            _print(res, True)
        else:
            print(res["answer"])
            print(f"\n[{res['backend']}{' ' + res['model'] if res.get('model') else ''}] sources: {', '.join(res['sources'])}", file=sys.stderr)
    elif a.cmd == "chat":
        res = pp.chat(" ".join(a.message), backend=a.backend, model=a.model)
        if j:
            _print(res, True)
        else:
            print(res.get("reply", res))
            print(f"\n[{res.get('backend')}{' ' + res['model'] if res.get('model') else ''}]", file=sys.stderr)
    elif a.cmd == "backends":
        _print(pp.backends(), True)
    elif a.cmd == "agents":
        _print(pp.agents(), True)
    elif a.cmd == "register":
        _print(pp.register_agent(a.name, a.description, a.capability, a.topic), True)
    elif a.cmd == "send":
        to = a.to[0] if a.to and len(a.to) == 1 else a.to
        _print(pp.send(a.sender, a.body, to=to, topic=a.topic, about=a.about), True)
    elif a.cmd == "inbox":
        _print(pp.inbox(a.agent, a.topic, a.since), True)
    elif a.cmd == "mcp":
        from .mcp_server import Server, serve
        serve(Server(pp, RAG(pp, OpenAICompatible(url=a.llm_url, model=a.model))))
    return 0


def main(argv: Optional[list] = None) -> None:
    try:
        sys.exit(run(argv))
    except (PlayPenError, HTTPError) as e:
        print(f"playpen: {e}", file=sys.stderr)
        sys.exit(2)
    except OSError as e:
        import os
        print(f"playpen: cannot reach the Play Pen server ({e}). Start it with `npm run dev` or set PLAYPEN_URL "
              f"(now {os.environ.get('PLAYPEN_URL', 'http://localhost:3000')}).", file=sys.stderr)
        sys.exit(3)


if __name__ == "__main__":
    main()
