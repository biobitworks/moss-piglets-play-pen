"""Client for the Play Pen REST, chat and MCP endpoints."""
from __future__ import annotations

import os
from typing import Any, Iterable, Optional, Union

from .http import HTTPError, request

DEFAULT_URL = "http://localhost:3000"


class PlayPenError(Exception):
    """A tool or endpoint returned an error."""


class PlayPen:
    """Talks to a running Play Pen server (the Next.js app in this repo).

    Every node has an address ``fcg:<type>/<slug>``; the same address works here, in the chat,
    in MCP tools and in ``/node/<type>/<slug>`` on the website.
    """

    def __init__(self, url: Optional[str] = None, timeout: float = 30):
        self.url = (url or os.environ.get("PLAYPEN_URL") or DEFAULT_URL).rstrip("/")
        self.timeout = timeout

    def __repr__(self) -> str:
        return f"PlayPen({self.url!r})"

    # -- transport -------------------------------------------------------------------------
    def _get(self, path: str, params: Optional[dict] = None, timeout: Optional[float] = None) -> Any:
        return request("GET", self.url + path, params=params, timeout=timeout or self.timeout)

    def _post(self, path: str, body: Any, timeout: Optional[float] = None) -> Any:
        return request("POST", self.url + path, body=body, timeout=timeout or self.timeout)

    def ping(self) -> bool:
        try:
            self._get("/api/tools", timeout=5)
            return True
        except Exception:
            return False

    # -- generic tool access ---------------------------------------------------------------
    def tools(self) -> list:
        """Tool definitions (name, description, input_schema, writes)."""
        return self._get("/api/tools")["tools"]

    def call(self, name: str, **args: Any) -> Any:
        """Call any graph or agent tool by name and return its result."""
        args = {k: v for k, v in args.items() if v is not None}
        try:
            out = self._post(f"/api/tools/{name}", args)
        except HTTPError as e:
            raise PlayPenError(e.body.get("error") if isinstance(e.body, dict) else str(e)) from None
        if isinstance(out, dict) and "error" in out:
            raise PlayPenError(out["error"])
        return out["result"] if isinstance(out, dict) and "result" in out else out

    # -- knowledge graph -------------------------------------------------------------------
    def search(self, query: str, k: int = 8, type: Optional[str] = None, status: Optional[str] = None) -> list:
        """Vector search over the graph. Returns hits with id, type, label, status, score."""
        return self.call("kg_search", query=query, k=k, type=type, status=status)

    def node(self, id: str) -> dict:
        """One node by address (``fcg:tool/navis`` or ``tool/navis``) with its links."""
        return self.call("kg_get_node", id=id)

    def list(self, type: str, status: Optional[str] = None) -> list:
        return self.call("kg_list", type=type, status=status)

    def status(self, type: Optional[str] = None) -> dict:
        """What is built, in progress, needed and blocked."""
        return self.call("kg_status", type=type)

    def worklog(self, limit: int = 20) -> dict:
        return self.call("kg_worklog", limit=limit)

    def add_node(self, type: str, label: str, status: Optional[str] = None,
                 description: Optional[str] = None, slug: Optional[str] = None) -> Any:
        return self.call("kg_add_node", type=type, label=label, status=status, description=description, slug=slug)

    def add_edge(self, src: str, type: str, dst: str) -> Any:
        return self.call("kg_add_edge", **{"from": src, "type": type, "to": dst})

    # -- agent connector -------------------------------------------------------------------
    def register_agent(self, name: str, description: Optional[str] = None, capabilities: Iterable[str] = (),
                       topics: Iterable[str] = (), endpoint: Optional[str] = None) -> Any:
        return self.call("agent_register", name=name, description=description, capabilities=list(capabilities),
                         topics=list(topics), endpoint=endpoint)

    def send(self, sender: str, body: str, to: Union[str, list, None] = None, topic: Optional[str] = None,
             about: Optional[list] = None) -> Any:
        """One-to-one (to='a'), one-to-many (to=['a','b']) or many-to-many (topic='t')."""
        return self.call("agent_send", **{"from": sender, "body": body, "to": to, "topic": topic, "about": about})

    def subscribe(self, agent: str, topic: str) -> Any:
        return self.call("agent_subscribe", agent=agent, topic=topic)

    def inbox(self, agent: Optional[str] = None, topic: Optional[str] = None, since: Optional[str] = None) -> Any:
        return self.call("agent_inbox", agent=agent, topic=topic, since=since)

    def agents(self) -> Any:
        return self.call("agent_list")

    # -- server-side chat ------------------------------------------------------------------
    def backends(self) -> dict:
        """Which chat backends the server has (claude, local, search) and the default."""
        return self._get("/api/chat")

    def chat(self, message: str, backend: Optional[str] = None, model: Optional[str] = None,
             history: Optional[list] = None, timeout: float = 180) -> dict:
        """Ask the server's chat (it does its own retrieval). No API key needed: the server uses
        a local model if it can reach one, else answers from the graph."""
        msgs = list(history or []) + [{"role": "user", "content": message}]
        body = {"messages": msgs}
        if backend:
            body["backend"] = backend
        if model:
            body["model"] = model
        return self._post("/api/chat", body, timeout=timeout)

    # -- raw MCP ---------------------------------------------------------------------------
    def mcp(self, method: str, params: Optional[dict] = None, id: Any = 1) -> Any:
        msg = {"jsonrpc": "2.0", "id": id, "method": method}
        if params is not None:
            msg["params"] = params
        return self._post("/api/mcp", msg)
