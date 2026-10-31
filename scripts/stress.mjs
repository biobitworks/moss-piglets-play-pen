// Stress test for a running Play Pen server. No dependencies.
//   npm run stress                       # against http://localhost:3000
//   BASE=http://host:port npm run stress -- --bulk 5000 --concurrency 32 --duration 10
// Phases:
//   1. read mix: status, search, MCP tools/call, offline chat, pages, dataset APIs, all at once
//   2. write mix: agents add nodes/edges while others search (each write invalidates the index)
//   3. bulk load: N real FlyWire cell types as KG nodes through MCP, then search latency at that size
// Prints p50/p95/max per endpoint and every error. Writes a JSON report with --out file.json.
import { readFileSync, existsSync, writeFileSync } from "node:fs";

const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, a, i, arr) => (a.startsWith("--") ? [...acc, [a.slice(2), arr[i + 1]?.startsWith("--") || arr[i + 1] === undefined ? "1" : arr[i + 1]]] : acc), []),
);
const BASE = process.env.BASE ?? "http://localhost:3000";
const C = Number(args.concurrency ?? 24);
const DURATION = Number(args.duration ?? 8) * 1000;
const BULK = Number(args.bulk ?? 2000);
const report = { base: BASE, at: new Date().toISOString(), concurrency: C, phases: {} };

const QUESTIONS = ["what is needed next for the tardigrade connectome", "which python package reads FlyWire", "proofreading tools", "neurotransmitter prediction", "Kenyon cell", "motor neurons of the ventral nerve cord", "what is blocked on Tardimap", "cell type vocabulary", "C. elegans connectome", "DNa02"];
const pick = (a) => a[Math.floor(Math.random() * a.length)];
let seq = 0;

const rpc = (method, params) => ({ jsonrpc: "2.0", id: ++seq, method, params });
const READS = [
  ["GET /api/kg/status", () => fetch(`${BASE}/api/kg/status`)],
  ["GET /api/kg/search", () => fetch(`${BASE}/api/kg/search?q=${encodeURIComponent(pick(QUESTIONS))}`)],
  ["POST /api/mcp kg_search", () => post("/api/mcp", rpc("tools/call", { name: "kg_search", arguments: { query: pick(QUESTIONS) } }))],
  ["POST /api/mcp tools/list", () => post("/api/mcp", rpc("tools/list", {}))],
  ["POST /api/chat (offline)", () => post("/api/chat", { messages: [{ role: "user", content: pick(QUESTIONS) }] })],
  ["GET /graph", () => fetch(`${BASE}/graph`)],
  ["GET /api/datasets", () => fetch(`${BASE}/api/datasets`)],
  ["GET /api/datasets/celegans-hermaphrodite/neurons", () => fetch(`${BASE}/api/datasets/celegans-hermaphrodite/neurons?q=${pick(["AVA", "motor", "ASE", "DD", "sensory", ""])}`)],
  ["GET /api/datasets/flywire-fafb/neurons", () => fetch(`${BASE}/api/datasets/flywire-fafb/neurons?q=${pick(["KC", "DNa02", "olfactory", "visual", "MBON", ""])}`)],
  ["GET /api/datasets/celegans-hermaphrodite/neuron", () => fetch(`${BASE}/api/datasets/celegans-hermaphrodite/neurons/${pick(["AVAL", "AVAR", "ASEL", "DB01", "PVCL"])}`)],
];
const WRITES = [
  ["POST /api/tools/kg_add_node", () => post("/api/tools/kg_add_node", { type: "question", label: `stress question ${++seq} ${Math.random().toString(36).slice(2, 8)}`, description: "Added by scripts/stress.mjs" })],
  ["POST /api/mcp agent_send", () => post("/api/mcp", rpc("tools/call", { name: "agent_send", arguments: { from: "stress-a", to: "stress-b", body: `ping ${seq}` } }))],
];

function post(path, body) {
  return fetch(`${BASE}${path}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
}

async function timed(name, fn, stats) {
  const t = performance.now();
  let err = null;
  try {
    const r = await fn();
    const text = await r.text();
    if (r.status >= 400) err = `${r.status} ${text.slice(0, 160)}`;
    else if (text.includes('"isError":true')) err = `MCP isError ${text.slice(0, 160)}`;
  } catch (e) {
    err = e.cause?.code ?? e.message;
  }
  const s = (stats[name] ??= { ms: [], errors: [] });
  s.ms.push(performance.now() - t);
  if (err) s.errors.push(err);
}

async function run(label, mix, ms = DURATION, conc = C) {
  const stats = {};
  const end = Date.now() + ms;
  await Promise.all(Array.from({ length: conc }, async () => { while (Date.now() < end) { const [n, f] = pick(mix); await timed(n, f, stats); } }));
  return summarize(label, stats, ms);
}

function summarize(label, stats, ms) {
  const rows = Object.entries(stats).map(([name, s]) => {
    const a = s.ms.sort((x, y) => x - y);
    const q = (p) => Math.round(a[Math.min(a.length - 1, Math.floor(p * a.length))]);
    return { name, n: a.length, rps: +(a.length / (ms / 1000)).toFixed(1), p50: q(0.5), p95: q(0.95), max: Math.round(a.at(-1)), errors: s.errors.length, sampleError: s.errors[0] };
  });
  console.log(`\n== ${label}`);
  console.table(rows.map(({ sampleError, ...r }) => r));
  for (const r of rows) if (r.sampleError) console.log(`  ${r.name}: ${r.errors} errors, e.g. ${r.sampleError}`);
  report.phases[label] = rows;
  return rows;
}

async function bulk() {
  // Real FlyWire cell types, if the dataset has been fetched; synthetic labels otherwise.
  const file = new URL("../data/datasets/flywire-fafb/neurons.json", import.meta.url);
  let labels = [];
  if (existsSync(file)) {
    const ds = JSON.parse(readFileSync(file, "utf8"));
    const types = new Map();
    for (const n of ds.neurons) if (n.type) types.set(n.type, n);
    labels = [...types.values()].slice(0, BULK).map((n) => ({ label: `FlyWire cell type ${n.type}`, description: `${n.super_class ?? ""} ${n.class ?? ""} ${n.nt ?? ""} neuron type from FlyWire FAFB (${n.side ?? ""}).` }));
  }
  while (labels.length < BULK) labels.push({ label: `synthetic node ${labels.length}`, description: "synthetic" });
  console.log(`\n== bulk load ${labels.length} nodes through MCP (batches of 50, ${Math.min(C, 8)} at a time)`);
  const stats = {};
  const t0 = performance.now();
  const batches = [];
  for (let i = 0; i < labels.length; i += 50) batches.push(labels.slice(i, i + 50));
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(C, 8) }, async () => {
    while (next < batches.length) {
      const b = batches[next++];
      await timed("POST /api/mcp kg_add_node x50 (batch)", () => post("/api/mcp", b.map((x) => rpc("tools/call", { name: "kg_add_node", arguments: { type: "celltype", ...x, status: "external" } }))), stats);
    }
  }));
  const ms = performance.now() - t0;
  summarize(`bulk load ${labels.length} nodes`, stats, ms);
  console.log(`  total ${Math.round(ms)} ms, ${Math.round(labels.length / (ms / 1000))} nodes/s`);
  const after = {};
  for (let i = 0; i < 20; i++) await timed("GET /api/kg/search after bulk (serial)", () => fetch(`${BASE}/api/kg/search?q=${encodeURIComponent(pick(QUESTIONS))}`), after);
  summarize("search after bulk load", after, 1000);
}

const phases = (args.phases ?? "read,write,bulk,read").split(",");
for (const p of phases) {
  if (p === "read") await run(`read mix (${C} concurrent, ${DURATION / 1000}s)`, READS);
  if (p === "write") await run(`read+write mix (${C} concurrent, ${DURATION / 1000}s)`, [...READS, ...WRITES, ...WRITES]);
  if (p === "bulk") await bulk();
}
if (args.out) writeFileSync(args.out, JSON.stringify(report, null, 1));
