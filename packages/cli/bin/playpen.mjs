#!/usr/bin/env node
import { PlayPen } from "../lib/client.mjs";
import { makeServer, serve } from "../lib/mcp.mjs";
import { RAG, anthropic, openAICompatible } from "../lib/rag.mjs";

const HELP = `playpen: Moss Piglets Play Pen connector (graph, agents, RAG, MCP)

Usage: playpen [--url URL] [--json] <command> [args]

  ping                          check the server is reachable
  status [--type T]             what is built and what is still needed
  search <words> [-k N] [--type T] [--status S]
  node <fcg:type/slug>          one node and its links
  list <type> [--status S]
  worklog [--limit N]           timestamped proof of work
  tools                         tools the server offers
  call <tool> key=value ...     call any tool (values parsed as JSON when possible)
  ask <question> [--llm local|search|anthropic|openai] [--model M] [--llm-url U]
                                RAG with a local model by default (no API key)
  chat <message> [--backend claude|local|search] [--model M]   the server's own chat
  backends                      chat backends the server has
  agents | register <name> [--capability C] [--topic T]
  send <from> <body> [--to A]... [--topic T] [--about ID]...
  inbox [--agent A] [--topic T] [--since ISO]
  mcp [--model M]               run the MCP server on stdio (same as playpen-mcp)

Server: --url or PLAYPEN_URL (default http://localhost:3000).
Local model: PLAYPEN_LOCAL_URL (default Ollama http://localhost:11434/v1), PLAYPEN_LOCAL_MODEL.`;

function parse(argv) {
  const pos = [], opt = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--json" || a === "-h" || a === "--help" || a === "--version") opt[a.replace(/^-+/, "")] = true;
    else if (a.startsWith("--") || a === "-k") {
      const k = a.replace(/^-+/, ""), v = argv[++i];
      opt[k] = opt[k] === undefined ? v : [].concat(opt[k], v);
    } else pos.push(a);
  }
  return { pos, opt };
}
const one = (v) => (Array.isArray(v) ? v.at(-1) : v);
const many = (v) => (v === undefined ? undefined : [].concat(v));
const kv = (pairs) => Object.fromEntries(pairs.map((p) => { const i = p.indexOf("="); const k = p.slice(0, i), v = p.slice(i + 1); try { return [k, JSON.parse(v)]; } catch { return [k, v]; } }));
const pad = (s, n) => String(s ?? "").padEnd(n);

function makeLlm(opt) {
  const llm = one(opt.llm) ?? "local";
  if (llm === "search") return null;
  if (llm === "anthropic") return anthropic({ model: one(opt.model) });
  if (llm === "openai") return openAICompatible({ url: one(opt["llm-url"]) ?? "https://api.openai.com/v1", model: one(opt.model) ?? "gpt-4o-mini", apiKey: process.env.OPENAI_API_KEY });
  return openAICompatible({ url: one(opt["llm-url"]), model: one(opt.model) });
}

export async function main(argv = process.argv.slice(2), out = console.log, err = console.error) {
  const { pos, opt } = parse(argv);
  if (opt.version) { out("playpen 0.1.0"); return 0; }
  const [cmd, ...rest] = pos;
  if (!cmd || opt.help || opt.h) { out(HELP); return cmd ? 0 : 1; }
  const pp = new PlayPen(one(opt.url));
  const json = (x) => out(JSON.stringify(x, null, 1));
  const words = rest.join(" ");
  switch (cmd) {
    case "ping": { const up = await pp.ping(); out(`${pp.url} ${up ? "reachable" : "NOT reachable"}`); return up ? 0 : 1; }
    case "search": {
      const hits = await pp.search(words, { k: Number(one(opt.k) ?? 8), type: one(opt.type), status: one(opt.status) });
      opt.json ? json(hits) : hits.forEach((h) => out(`${String(h.score).padStart(6)}  ${pad(h.id, 42)} ${pad(h.status, 11)} ${h.label}`));
      return 0;
    }
    case "node": json(await pp.node(rest[0])); return 0;
    case "list": { const r = await pp.list(rest[0], one(opt.status)); opt.json ? json(r) : r.forEach((n) => out(`${pad(n.id, 44)} ${pad(n.status, 11)} ${n.label}`)); return 0; }
    case "status": {
      const s = await pp.status(one(opt.type));
      if (opt.json) { json(s); return 0; }
      out(Object.entries(s.counts ?? {}).map(([k, v]) => `${k}: ${v}`).join("  "));
      for (const key of ["in_progress", "needed", "blocked"]) if (s[key]?.length) { out(`\n${key.replace("_", " ")}:`); s[key].forEach((n) => out(`  ${pad(n.id, 44)} ${n.label}`)); }
      return 0;
    }
    case "worklog": {
      const r = await pp.worklog(Number(one(opt.limit) ?? 20));
      opt.json ? json(r) : (r.entries ?? []).forEach((e) => out(`${e.at}  ${pad(e.task ?? e.kind, 6)} ${pad(e.status, 11)} ${(e.commit ?? "").slice(0, 7)}  ${e.summary ?? ""}`));
      return 0;
    }
    case "tools": { const t = await pp.tools(); opt.json ? json(t) : t.forEach((x) => out(`${pad(x.name, 16)} ${x.writes ? "write" : "read "}  ${x.description.slice(0, 90)}`)); return 0; }
    case "call": json(await pp.call(rest[0], kv(rest.slice(1)))); return 0;
    case "ask": {
      const r = await new RAG(pp, makeLlm(opt), { k: Number(one(opt.k) ?? 6) }).ask(words);
      if (opt.json) json(r); else { out(r.answer); err(`\n[${r.backend}${r.model ? " " + r.model : ""}] sources: ${r.sources.join(", ")}`); }
      return 0;
    }
    case "chat": {
      const r = await pp.chat(words, { backend: one(opt.backend), model: one(opt.model) });
      if (opt.json) json(r); else { out(r.reply ?? JSON.stringify(r)); err(`\n[${r.backend}${r.model ? " " + r.model : ""}]`); }
      return 0;
    }
    case "backends": json(await pp.backends()); return 0;
    case "agents": json(await pp.agents()); return 0;
    case "register": json(await pp.registerAgent({ name: rest[0], description: one(opt.description), capabilities: many(opt.capability) ?? [], topics: many(opt.topic) ?? [] })); return 0;
    case "send": { const to = many(opt.to); json(await pp.send(rest[0], rest.slice(1).join(" "), { to: to?.length === 1 ? to[0] : to, topic: one(opt.topic), about: many(opt.about) })); return 0; }
    case "inbox": json(await pp.inbox({ agent: one(opt.agent), topic: one(opt.topic), since: one(opt.since) })); return 0;
    case "mcp": await serve(makeServer(pp, new RAG(pp, openAICompatible({ url: one(opt["llm-url"]), model: one(opt.model) })))); return 0;
    default: err(`unknown command ${cmd}\n\n${HELP}`); return 1;
  }
}

import { realpathSync } from "node:fs";
import { fileURLToPath } from "node:url";
const isMain = (() => { try { return realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url)); } catch { return false; } })();
if (isMain) {
  main().then((code) => process.exit(code), (e) => {
    const unreachable = e.cause?.code === "ECONNREFUSED" || /fetch failed/.test(e.message);
    console.error(unreachable ? `playpen: cannot reach the Play Pen server (${e.cause?.message ?? e.message}). Start it with \`npm run dev\` or set PLAYPEN_URL.` : `playpen: ${e.message}`);
    process.exit(unreachable ? 3 : 2);
  });
}
