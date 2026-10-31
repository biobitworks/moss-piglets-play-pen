"""RAG connector: retrieve from the Play Pen graph, then answer with a pluggable model.

Default is a local model through any OpenAI-compatible server (Ollama on localhost:11434).
No API key is needed. If no model is reachable, it answers from the retrieved graph nodes.
A frontier model plugs in later with ``OpenAICompatible(url, model, api_key)`` or ``Anthropic()``,
or any callable ``(messages) -> str``.
"""
from __future__ import annotations

import math
import os
from typing import Any, Callable, Dict, List, Optional, Sequence

from .client import PlayPen
from .http import request

Messages = List[Dict[str, str]]

SYSTEM = (
    "You answer questions about the Moss Piglets Play Pen: what exists for the fly connectome and what is "
    "built or still needed to finish the tardigrade connectome (Tardimap). Use only the context nodes given. "
    "Cite nodes by their address in backticks, like `fcg:tool/navis`. If the context does not say, say so."
)


class LLM:
    """Base class for a chat model. Subclasses implement ``complete``."""

    name = "llm"
    model: Optional[str] = None

    def complete(self, messages: Messages) -> str:  # pragma: no cover - interface
        raise NotImplementedError

    def available(self) -> bool:
        return True

    def embed(self, texts: Sequence[str]) -> Optional[List[List[float]]]:
        return None


class OpenAICompatible(LLM):
    """Ollama, LM Studio, llama.cpp, vLLM, or any hosted OpenAI-compatible API."""

    name = "openai-compatible"

    def __init__(self, url: Optional[str] = None, model: Optional[str] = None, api_key: Optional[str] = None,
                 embed_model: Optional[str] = None, timeout: float = 180):
        self.url = (url or os.environ.get("PLAYPEN_LOCAL_URL") or "http://localhost:11434/v1").rstrip("/")
        self.model = model or os.environ.get("PLAYPEN_LOCAL_MODEL") or "llama3.1:8b"
        self.api_key = api_key if api_key is not None else os.environ.get("PLAYPEN_LOCAL_API_KEY")
        self.embed_model = embed_model or os.environ.get("PLAYPEN_EMBED_MODEL")
        self.timeout = timeout

    def _headers(self) -> dict:
        return {"authorization": f"Bearer {self.api_key}"} if self.api_key else {}

    def models(self) -> List[str]:
        out = request("GET", self.url + "/models", headers=self._headers(), timeout=3)
        return [m.get("id") for m in out.get("data", [])]

    def available(self) -> bool:
        try:
            self.models()
            return True
        except Exception:
            return False

    def complete(self, messages: Messages) -> str:
        out = request("POST", self.url + "/chat/completions", headers=self._headers(), timeout=self.timeout,
                      body={"model": self.model, "messages": messages, "temperature": 0.2, "stream": False})
        return (out["choices"][0]["message"].get("content") or "").strip()

    def embed(self, texts: Sequence[str]) -> Optional[List[List[float]]]:
        if not self.embed_model:
            return None
        out = request("POST", self.url + "/embeddings", headers=self._headers(), timeout=self.timeout,
                      body={"model": self.embed_model, "input": list(texts)})
        return [d["embedding"] for d in sorted(out["data"], key=lambda d: d.get("index", 0))]


class Anthropic(LLM):
    """Optional frontier model through the Anthropic Messages API (needs ANTHROPIC_API_KEY)."""

    name = "anthropic"

    def __init__(self, model: Optional[str] = None, api_key: Optional[str] = None, timeout: float = 180):
        self.model = model or os.environ.get("PLAYPEN_CLAUDE_MODEL") or "claude-opus-5-5"
        self.api_key = api_key or os.environ.get("ANTHROPIC_API_KEY")
        self.timeout = timeout

    def available(self) -> bool:
        return bool(self.api_key)

    def complete(self, messages: Messages) -> str:
        system = "\n\n".join(m["content"] for m in messages if m["role"] == "system")
        rest = [m for m in messages if m["role"] != "system"]
        out = request("POST", "https://api.anthropic.com/v1/messages", timeout=self.timeout,
                      headers={"x-api-key": self.api_key or "", "anthropic-version": "2023-06-01"},
                      body={"model": self.model, "max_tokens": 1500, "system": system, "messages": rest})
        return "".join(b.get("text", "") for b in out.get("content", []) if b.get("type") == "text").strip()


class _Callable(LLM):
    name = "custom"

    def __init__(self, fn: Callable[[Messages], str]):
        self.fn = fn

    def complete(self, messages: Messages) -> str:
        return self.fn(messages)


def local_llm(**kw: Any) -> OpenAICompatible:
    """The default local model (Ollama unless PLAYPEN_LOCAL_URL says otherwise)."""
    return OpenAICompatible(**kw)


def _cos(a: Sequence[float], b: Sequence[float]) -> float:
    na = math.sqrt(sum(x * x for x in a)) or 1.0
    nb = math.sqrt(sum(x * x for x in b)) or 1.0
    return sum(x * y for x, y in zip(a, b)) / (na * nb)


def node_text(n: dict) -> str:
    """One context block for a node: address, status, description and its links."""
    lines = [f"[{n.get('id')}] {n.get('label', '')} (type {n.get('type')}, status {n.get('status', 'n/a')})"]
    if n.get("description"):
        lines.append(n["description"])
    props = n.get("props") or {}
    for k in ("install", "docs", "url", "language"):
        if props.get(k):
            lines.append(f"{k}: {props[k]}")
    for e in (n.get("links") or [])[:12]:
        other = e.get("node") or {}
        arrow = "->" if e.get("direction") == "out" else "<-"
        lines.append(f"  {arrow} {e.get('edge')} {other.get('id', '')} {other.get('label', '')}".rstrip())
    return "\n".join(lines)


class RAG:
    """Retrieve-then-generate over the Play Pen graph.

    ``llm`` may be an LLM, a callable ``(messages) -> str``, ``"local"`` (default), or
    ``"search"``/``None`` for graph-only answers. An LLM that is unreachable falls back to
    graph-only answers; it is never swapped for a different model.
    """

    def __init__(self, client: Optional[PlayPen] = None, llm: Any = "local", k: int = 6, expand: int = 3):
        self.client = client or PlayPen()
        if llm == "local":
            llm = local_llm()
        elif callable(llm) and not isinstance(llm, LLM):
            llm = _Callable(llm)
        elif llm == "search":
            llm = None
        self.llm: Optional[LLM] = llm
        self.k, self.expand = k, expand

    def retrieve(self, question: str, k: Optional[int] = None) -> List[dict]:
        k = k or self.k
        hits = self.client.search(question, k=max(k * 2, k)) or []
        # Optional re-rank with real embeddings (e.g. Ollama nomic-embed-text) when configured.
        if self.llm is not None and hits:
            try:
                vecs = self.llm.embed([question] + [f"{h.get('label', '')}. {h.get('description') or ''}" for h in hits])
            except Exception:
                vecs = None
            if vecs:
                q = vecs[0]
                for h, v in zip(hits, vecs[1:]):
                    h["rerank"] = round(_cos(q, v), 4)
                hits.sort(key=lambda h: h["rerank"], reverse=True)
        hits = hits[:k]
        # Pull full nodes (with links) for the top few so the model sees the graph around them.
        for h in hits[: self.expand]:
            try:
                full = self.client.node(h["id"])
                h.update({kk: full.get(kk) for kk in ("links", "props", "description") if full.get(kk) is not None})
            except Exception:
                pass
        return hits

    def context(self, hits: List[dict]) -> str:
        return "\n\n".join(node_text(h) for h in hits)

    def messages(self, question: str, hits: List[dict], history: Optional[Messages] = None) -> Messages:
        return [{"role": "system", "content": SYSTEM},
                *(history or []),
                {"role": "user", "content": f"Context nodes:\n\n{self.context(hits)}\n\nQuestion: {question}"}]

    @staticmethod
    def graph_answer(question: str, hits: List[dict], why: str = "") -> str:
        if not hits:
            return (why + " " if why else "") + "Nothing in the graph matched that. Try different words, or `playpen status`."
        head = (why + " " if why else "") + f"Closest matches in the graph for \"{question}\":"
        rows = [f"- `{h['id']}` {h.get('label', '')} ({h.get('status', 'n/a')})" + (f": {h['description']}" if h.get("description") else "") for h in hits]
        return "\n".join([head, *rows])

    def ask(self, question: str, history: Optional[Messages] = None) -> dict:
        hits = self.retrieve(question)
        sources = [h["id"] for h in hits]
        if self.llm is None:
            return {"answer": self.graph_answer(question, hits), "backend": "search", "model": None, "sources": sources}
        if not self.llm.available():
            why = f"No model reachable ({self.llm.name} {getattr(self.llm, 'url', '')}).".replace(" )", ")")
            return {"answer": self.graph_answer(question, hits, why), "backend": "search", "model": None,
                    "sources": sources, "note": why}
        try:
            text = self.llm.complete(self.messages(question, hits, history))
        except Exception as e:  # model failed mid-call: still answer from the graph
            why = f"The model failed ({e})."
            return {"answer": self.graph_answer(question, hits, why), "backend": "search", "model": None,
                    "sources": sources, "error": str(e)}
        return {"answer": text, "backend": self.llm.name, "model": self.llm.model, "sources": sources}
