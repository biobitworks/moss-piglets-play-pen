import assert from "node:assert/strict";
import { PassThrough } from "node:stream";
import { after, before, test } from "node:test";
import { PlayPen, PlayPenError, RAG, makeServer, openAICompatible, serve } from "../lib/index.mjs";
import { main } from "../bin/playpen.mjs";
import { startFake } from "./fake.mjs";

let fake;
before(async () => { fake = await startFake(); });
after(() => fake.close());

test("client: search, node, status, tools", async () => {
  const pp = new PlayPen(fake.url);
  assert.equal(await pp.ping(), true);
  assert.equal((await pp.search("trace", { k: 1 }))[0].id, "fcg:tool/navis");
  assert.equal((await pp.node("tool/navis")).props.install, "pip install navis");
  assert.equal((await pp.status()).counts.needed, 1);
  assert.deepEqual((await pp.tools()).map((t) => t.name), ["kg_search", "agent_send"]);
});

test("client: tool errors and unreachable server", async () => {
  await assert.rejects(new PlayPen(fake.url).node("fcg:tool/nope"), (e) => e instanceof PlayPenError && /No node fcg:tool\/nope/.test(e.message));
  assert.equal(await new PlayPen("http://127.0.0.1:9").ping(), false);
});

test("rag: local model, fallback, search-only", async () => {
  const pp = new PlayPen(fake.url);
  const llm = openAICompatible({ url: fake.url + "/v1", model: "tiny" });
  const r = await new RAG(pp, llm).ask("what is needed?");
  assert.equal(r.answer, "LLM saw 2 nodes");
  assert.deepEqual(r.sources, ["fcg:tool/navis", "fcg:stage/tracing"]);
  fake.state.llmUp = false;
  const f = await new RAG(pp, llm).ask("what is needed?");
  fake.state.llmUp = true;
  assert.equal(f.backend, "search");
  assert.match(f.answer, /No model reachable/);
  assert.match(f.answer, /`fcg:stage\/tracing`/);
  assert.equal((await new RAG(pp, "search").ask("x")).backend, "search");
  assert.equal((await new RAG(pp, async () => "custom").ask("x")).answer, "custom");
});

test("mcp stdio: proxies tools and adds rag_ask", async () => {
  const pp = new PlayPen(fake.url);
  const input = new PassThrough(), output = new PassThrough();
  let text = ""; output.on("data", (c) => (text += c));
  const done = serve(makeServer(pp, new RAG(pp, "search")), input, output);
  for (const m of [
    { jsonrpc: "2.0", id: 1, method: "initialize", params: {} },
    { jsonrpc: "2.0", method: "notifications/initialized" },
    { jsonrpc: "2.0", id: 2, method: "tools/list" },
    { jsonrpc: "2.0", id: 3, method: "tools/call", params: { name: "kg_search", arguments: { query: "x", k: 1 } } },
    { jsonrpc: "2.0", id: 4, method: "tools/call", params: { name: "rag_ask", arguments: { question: "needed?" } } },
  ]) input.write(JSON.stringify(m) + "\n");
  input.end();
  await done;
  const replies = text.trim().split("\n").map((l) => JSON.parse(l));
  assert.deepEqual(replies.map((r) => r.id), [1, 2, 3, 4]);
  assert.equal(replies[0].result.serverInfo.name, "playpen");
  assert.deepEqual(replies[1].result.tools.map((t) => t.name), ["kg_search", "agent_send", "rag_ask"]);
  assert.match(replies[2].result.content[0].text, /fcg:tool\/navis/);
  assert.match(replies[3].result.content[0].text, /Sources: fcg:tool\/navis/);
});

test("cli: search, status, call, ask, chat, send", async () => {
  const run = async (...a) => { const lines = []; const code = await main(["--url", fake.url, ...a], (l) => lines.push(l), () => {}); return { code, out: lines.join("\n") }; };
  assert.match((await run("search", "trace", "-k", "2")).out, /fcg:stage\/tracing/);
  assert.match((await run("status")).out, /needed:/);
  assert.equal(JSON.parse((await run("call", "kg_search", "query=x", "k=1")).out)[0].id, "fcg:tool/navis");
  assert.equal(JSON.parse((await run("--json", "ask", "what", "--llm", "search")).out).backend, "search");
  assert.match((await run("chat", "hello")).out, /from server: hello/);
  assert.deepEqual(JSON.parse((await run("send", "alice", "hi", "there", "--to", "bob")).out).args, { from: "alice", body: "hi there", to: "bob" });
});
