import io
import json

import pytest

from playpen import RAG, OpenAICompatible, PlayPen, PlayPenError
from playpen.cli import run
from playpen.mcp_server import Server, serve

from conftest import State


def test_client_search_node_status(server):
    pp = PlayPen(server)
    assert pp.ping()
    hits = pp.search("trace neurons", k=1)
    assert hits[0]["id"] == "fcg:tool/navis"
    assert pp.node("tool/navis")["props"]["install"] == "pip install navis"
    assert pp.status()["counts"]["needed"] == 1
    assert [t["name"] for t in pp.tools()] == ["kg_search", "agent_send"]


def test_client_drops_none_args_and_maps_from(server):
    PlayPen(server).send("alice", "hi", to="bob")
    post = [c for c in State.calls if c[0] == "POST"][-1]
    assert post[2] == {"from": "alice", "body": "hi", "to": "bob"}


def test_tool_error_raises(server):
    with pytest.raises(PlayPenError, match="No node fcg:tool/nope"):
        PlayPen(server).node("fcg:tool/nope")


def test_unreachable_server():
    assert PlayPen("http://127.0.0.1:9").ping() is False


def test_rag_with_local_llm(server):
    llm = OpenAICompatible(url=server + "/v1", model="tiny")
    res = RAG(PlayPen(server), llm).ask("what is needed?")
    assert res["backend"] == "openai-compatible" and res["model"] == "tiny"
    assert res["answer"] == "LLM saw 2 nodes"
    assert res["sources"] == ["fcg:tool/navis", "fcg:stage/tracing"]


def test_rag_falls_back_to_graph_when_llm_down(server):
    State.llm_up = False
    res = RAG(PlayPen(server), OpenAICompatible(url=server + "/v1", model="tiny")).ask("what is needed?")
    assert res["backend"] == "search" and res["model"] is None
    assert "`fcg:stage/tracing`" in res["answer"] and "No model reachable" in res["answer"]


def test_rag_search_only_and_callable(server):
    pp = PlayPen(server)
    assert RAG(pp, "search").ask("x")["backend"] == "search"
    seen = {}
    res = RAG(pp, lambda msgs: seen.setdefault("m", msgs) and "custom answer").ask("x")
    assert res["answer"] == "custom answer" and seen["m"][0]["role"] == "system"


def test_rag_embedding_rerank(server):
    llm = OpenAICompatible(url=server + "/v1", model="tiny", embed_model="emb")
    hits = RAG(PlayPen(server), llm, k=1).retrieve("trace")
    assert hits[0]["id"] == "fcg:stage/tracing" and hits[0]["rerank"] == 1.0


def test_mcp_stdio_proxies_and_adds_rag(server):
    pp = PlayPen(server)
    srv = Server(pp, RAG(pp, "search"))
    lines = [
        {"jsonrpc": "2.0", "id": 1, "method": "initialize", "params": {"protocolVersion": "2025-06-18"}},
        {"jsonrpc": "2.0", "method": "notifications/initialized"},
        {"jsonrpc": "2.0", "id": 2, "method": "tools/list"},
        {"jsonrpc": "2.0", "id": 3, "method": "tools/call", "params": {"name": "kg_search", "arguments": {"query": "x", "k": 1}}},
        {"jsonrpc": "2.0", "id": 4, "method": "tools/call", "params": {"name": "rag_ask", "arguments": {"question": "needed?"}}},
        {"jsonrpc": "2.0", "id": 5, "method": "nope"},
    ]
    out = io.StringIO()
    serve(srv, io.StringIO("\n".join(json.dumps(l) for l in lines) + "\n"), out)
    replies = [json.loads(l) for l in out.getvalue().splitlines()]
    assert [r["id"] for r in replies] == [1, 2, 3, 4, 5]
    assert replies[0]["result"]["serverInfo"]["name"] == "playpen"
    assert [t["name"] for t in replies[1]["result"]["tools"]] == ["kg_search", "agent_send", "rag_ask"]
    assert "fcg:tool/navis" in replies[2]["result"]["content"][0]["text"]
    assert "Sources: fcg:tool/navis" in replies[3]["result"]["content"][0]["text"]
    assert replies[4]["error"]["code"] == -32601


def test_cli(server, capsys):
    assert run(["--url", server, "search", "trace", "-k", "2"]) == 0
    assert "fcg:stage/tracing" in capsys.readouterr().out
    assert run(["--url", server, "status"]) == 0
    assert "needed:" in capsys.readouterr().out
    assert run(["--url", server, "call", "kg_search", "query=x", "k=1"]) == 0
    assert json.loads(capsys.readouterr().out)[0]["id"] == "fcg:tool/navis"
    capsys.readouterr()
    assert run(["--url", server, "--json", "ask", "what", "--llm", "search"]) == 0
    assert json.loads(capsys.readouterr().out)["backend"] == "search"
    assert run(["--url", server, "chat", "hello"]) == 0
    assert "from server: hello" in capsys.readouterr().out


def test_register_agent_name_reaches_server(server):
    PlayPen(server).register_agent("my-agent", capabilities=["tracing"])
    post = [c for c in State.calls if c[0] == "POST"][-1]
    assert post[1] == "/api/tools/agent_register"
    assert post[2] == {"name": "my-agent", "capabilities": ["tracing"], "topics": []}
