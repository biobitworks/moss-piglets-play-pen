import fs from "node:fs";
import path from "node:path";
import fcg from "../../../data/kg/fcg.json";
import fco from "../../../data/kg/fco.json";
import gitData from "../../../data/kg/git.json";
import worklogData from "../../../data/kg/worklog.json";
import { loadRemote, store, writeRemote } from "./store";
import type { GitCommit, KGEdge, KGNode, Status, WorklogEntry } from "./types";

export { fco };

const RUNTIME_FILE = path.join(process.cwd(), "data", "kg", "runtime.json");
/** Persist runtime additions to disk only when running locally (Vercel's filesystem is read-only). */
const PERSIST = !process.env.VERCEL && process.env.PLAYPEN_KG_PERSIST !== "0" && !store();

interface Overlay {
  nodes: KGNode[];
  edges: KGEdge[];
}

// Keep the overlay on globalThis so Next.js dev reloads and separate route modules share it.
const g = globalThis as unknown as {
  __kgOverlay?: Overlay;
  __kgVersion?: number;
  __kgCache?: { v: number; graph: Graph };
  /** Writes not yet sent to the shared store. */
  __kgPending?: Overlay;
  /** Writes being sent right now; kept visible until the store has them. */
  __kgInflight?: Overlay[];
};
const pending = () => (g.__kgPending ??= { nodes: [], edges: [] });
const inflight = () => (g.__kgInflight ??= []);

/** Pull runtime additions from the shared store, if one is configured. Call at the start of a request. */
export async function sync() {
  const remote = await loadRemote();
  if (!remote) return;
  const o = overlay();
  // Keep local writes the store may not have yet (in flight or not yet flushed) on top of what it returned.
  const local = [...inflight(), pending()];
  const nodes = new Map(remote.nodes.map((n) => [n.id, n]));
  for (const b of local) for (const n of b.nodes) nodes.set(n.id, n);
  const key = (e: KGEdge) => `${e.from}|${e.type}|${e.to}|${e.at ?? ""}`;
  const seen = new Set(remote.edges.map(key));
  const edges = [...remote.edges];
  for (const b of local) for (const e of b.edges) if (!seen.has(key(e))) (seen.add(key(e)), edges.push(e));
  const next = { nodes: [...nodes.values()], edges };
  if (next.nodes.length !== o.nodes.length || next.edges.length !== o.edges.length || JSON.stringify(next) !== JSON.stringify(o)) {
    g.__kgOverlay = next;
    g.__kgVersion = (g.__kgVersion ?? 1) + 1;
  }
}

/** Send this request's writes to the shared store. Call after a tool that writes. */
export async function flush() {
  const p = pending();
  if (!p.nodes.length && !p.edges.length) return;
  const batch = { nodes: p.nodes.splice(0), edges: p.edges.splice(0) };
  inflight().push(batch);
  try {
    await writeRemote(batch.nodes, batch.edges);
  } catch (e) {
    p.nodes.unshift(...batch.nodes);
    p.edges.unshift(...batch.edges);
    throw e;
  } finally {
    g.__kgInflight = inflight().filter((b) => b !== batch);
  }
}
/** Position of each runtime node in the overlay, so replacing one is O(1). Rebuilt when the overlay object changes. */
const idx = globalThis as unknown as { __kgOverlayIdx?: { of: Overlay; m: Map<string, number> } };
function overlayIndex() {
  const o = overlay();
  if (idx.__kgOverlayIdx?.of !== o) idx.__kgOverlayIdx = { of: o, m: new Map(o.nodes.map((n, i) => [n.id, i])) };
  return idx.__kgOverlayIdx.m;
}

function overlay(): Overlay {
  if (!g.__kgOverlay) {
    g.__kgOverlay = { nodes: [], edges: [] };
    if (PERSIST) {
      try {
        g.__kgOverlay = JSON.parse(fs.readFileSync(RUNTIME_FILE, "utf8"));
      } catch {}
    }
    g.__kgVersion = 1;
  }
  return g.__kgOverlay!;
}

let saveTimer: ReturnType<typeof setTimeout> | null = null;
/**
 * Bump the version and write the overlay to disk. The disk write is coalesced (at most one per 250 ms):
 * writing the whole overlay synchronously on every call made bulk loads quadratic (see docs/STRESS_TEST.md).
 */
function save() {
  g.__kgVersion = (g.__kgVersion ?? 1) + 1;
  if (!PERSIST || saveTimer) return;
  saveTimer = setTimeout(() => {
    saveTimer = null;
    try {
      fs.writeFileSync(RUNTIME_FILE, JSON.stringify(overlay()) + "\n");
    } catch {}
  }, 250);
}

export function version() {
  overlay();
  return g.__kgVersion ?? 1;
}

export class Graph {
  nodes = new Map<string, KGNode>();
  edges: KGEdge[] = [];
  out = new Map<string, KGEdge[]>();
  in = new Map<string, KGEdge[]>();
  /** from|type|to of every edge, so duplicate checks are O(1) instead of a scan of all edges. */
  private keys = new Set<string>();
  /** Nodes whose text changed since the search index last looked (added, edited, or linked). */
  dirty = new Set<string>();
  /** A capability's own status, before task statuses are rolled up into it. */
  baseStatus = new Map<string, Status>();

  add(n: KGNode) {
    const prev = this.nodes.get(n.id);
    this.nodes.set(n.id, prev ? { ...prev, ...n, props: { ...prev.props, ...n.props } } : n);
    if (n.type === "capability") this.baseStatus.set(n.id, n.status);
    this.dirty.add(n.id);
  }
  link(e: KGEdge) {
    if (!this.nodes.has(e.from) || !this.nodes.has(e.to)) return;
    const k = `${e.from}|${e.type}|${e.to}`;
    if (this.keys.has(k)) return;
    this.keys.add(k);
    this.dirty.add(e.from).add(e.to);
    this.edges.push(e);
    (this.out.get(e.from) ?? this.out.set(e.from, []).get(e.from)!).push(e);
    (this.in.get(e.to) ?? this.in.set(e.to, []).get(e.to)!).push(e);
  }
}

export const commitId = (sha: string) => `fcg:commit/${sha.slice(0, 7)}`;

function build(): Graph {
  const G = new Graph();
  for (const n of fcg.nodes as KGNode[]) G.add({ ...n, origin: "seed" });
  for (const e of fcg.edges as KGEdge[]) G.link({ ...e, origin: "seed" });

  // Git history: commits and merges with their timestamps.
  for (const c of (gitData as { commits: GitCommit[] }).commits) {
    G.add({
      id: commitId(c.sha),
      type: "commit",
      label: `${c.sha.slice(0, 7)} ${c.subject}`.slice(0, 120),
      status: "built",
      description: c.isMerge ? `Merge commit at ${c.at}` : `Commit at ${c.at} by ${c.author}`,
      props: { sha: c.sha, at: c.at, author: c.author, isMerge: c.isMerge, url: `https://github.com/biobitworks/moss-piglets-play-pen/commit/${c.sha}` },
      origin: "git",
      updatedAt: c.at,
    });
    G.link({ from: commitId(c.sha), type: "partOf", to: "fcg:project/playpen", at: c.at, origin: "git" });
    const task = /^(T\d+):/.exec(c.subject)?.[1];
    if (task) {
      // A commit whose subject starts with "Tnn:" finishes that task, unless the worklog says otherwise later.
      const t = G.nodes.get(`fcg:task/${task}`);
      if (t) G.add({ ...t, status: "built", updatedAt: c.at, props: { ...t.props, completedAt: t.props?.completedAt ?? c.at, commit: t.props?.commit ?? c.sha } });
      G.link({ from: `fcg:task/${task}`, type: "completedBy", to: commitId(c.sha), at: c.at, origin: "git" });
    }
    if (c.pr) {
      const pr = G.nodes.get(`fcg:pr/${c.pr}`);
      if (pr) G.add({ ...pr, status: "built", props: { ...pr.props, mergedAt: c.at, mergeCommit: c.sha } });
      G.link({ from: `fcg:pr/${c.pr}`, type: "completedBy", to: commitId(c.sha), at: c.at, origin: "git" });
    }
  }

  // Worklog: the proof-of-work record. The latest entry per task sets its status.
  for (const w of (worklogData as { entries: WorklogEntry[] }).entries) {
    if (w.kind !== "task" || !w.task) continue;
    const id = `fcg:task/${w.task}`;
    const t = G.nodes.get(id);
    if (!t) continue;
    G.add({ ...t, status: w.status ?? "built", updatedAt: w.at, origin: t.origin, props: { ...t.props, completedAt: w.at, commit: w.commit, summary: w.summary } });
    if (!G.nodes.has(commitId(w.commit))) {
      G.add({ id: commitId(w.commit), type: "commit", label: `${w.commit.slice(0, 7)} ${w.subject ?? ""}`, status: "built", description: `Commit at ${w.commitAt}`, props: { sha: w.commit, at: w.commitAt }, origin: "worklog" });
    }
    G.link({ from: id, type: "completedBy", to: commitId(w.commit), at: w.at, origin: "worklog" });
  }

  // Runtime overlay from agents and chat.
  const o = overlay();
  for (const n of o.nodes) G.add(n);
  for (const e of o.edges) G.link(e);

  rollup(G);
  return G;
}

/** Roll task status up into the capabilities they implement. */
function rollup(G: Graph) {
  for (const [id, n] of G.nodes) {
    if (n.type !== "capability") continue;
    const tasks = (G.in.get(id) ?? []).filter((e) => e.type === "implements").map((e) => G.nodes.get(e.from)!);
    // Fall back to the capability's own status, not the last rollup, so reopened tasks reopen it.
    const base = G.baseStatus.get(id) ?? n.status;
    const done = tasks.filter((t) => t.status === "built").length;
    const status: Status = !tasks.length ? base : done === tasks.length ? "built" : done || tasks.some((t) => t.status === "in_progress") ? "in_progress" : base;
    // Set directly, not via add(), so the rolled-up value never becomes the base status.
    if (status !== n.status) G.nodes.set(id, { ...n, status });
  }
}

// The seed files are part of the key so edits show up in dev without a restart.
const cacheKey = () => version() * 1e6 + (worklogData as { entries: unknown[] }).entries.length * 1e3 + (gitData as { commits: unknown[] }).commits.length + (fcg.nodes as unknown[]).length * 7;

/**
 * Apply one runtime write to the cached graph instead of rebuilding it from the seed files.
 * Before this, every write threw the graph and the search index away, so under a write load
 * every read paid a full rebuild (seconds at 20k nodes).
 */
function applyToCache(apply: (G: Graph) => void) {
  const c = g.__kgCache;
  const before = c && c.v === cacheKey();
  save();
  if (!c || !before) return;
  apply(c.graph);
  if (c.graph.dirty.size && [...c.graph.dirty].some((id) => ["task", "capability"].includes(c.graph.nodes.get(id)?.type ?? ""))) rollup(c.graph);
  c.v = cacheKey();
}

export function graph(): Graph {
  const v = cacheKey();
  if (g.__kgCache?.v === v) return g.__kgCache.graph;
  const built = build();
  g.__kgCache = { v, graph: built };
  return built;
}

export function worklog(): WorklogEntry[] {
  return (worklogData as { entries: WorklogEntry[] }).entries;
}

export function gitCommits(): GitCommit[] {
  return (gitData as { commits: GitCommit[] }).commits;
}

/** The one canonical slug rule. Labels are lowercased; explicit slugs keep their case so seeded ids like T02 stay addressable. */
export function slugify(s: string, keepCase = false): string {
  const base = keepCase ? s : s.toLowerCase();
  return base.replace(/[^A-Za-z0-9._]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60).replace(/-+$/, "") || "item";
}

export function addNode(input: { type: string; label: string; status?: Status; description?: string; slug?: string; props?: Record<string, unknown> }): KGNode {
  const type = slugify(input.type);
  const id = `fcg:${type}/${input.slug ? slugify(input.slug.replace(/^fcg:[^/]+\//, ""), true) : slugify(input.label)}`;
  const n: KGNode = {
    id,
    type,
    label: input.label.slice(0, 200),
    status: input.status ?? "needed",
    description: (input.description ?? "").slice(0, 2000),
    props: input.props,
    origin: "runtime",
    updatedAt: new Date().toISOString(),
  };
  const o = overlay();
  const at = overlayIndex().get(id);
  if (at !== undefined && o.nodes[at]?.id === id) o.nodes[at] = n;
  else overlayIndex().set(id, o.nodes.push(n) - 1);
  if (store()) pending().nodes.push(n);
  applyToCache((G) => G.add(n));
  return n;
}

export function addEdge(e: { from: string; type: string; to: string }): KGEdge {
  const G = graph();
  if (!G.nodes.has(e.from)) throw new Error(`unknown node ${e.from}`);
  if (!G.nodes.has(e.to)) throw new Error(`unknown node ${e.to}`);
  const edge: KGEdge = { ...e, at: new Date().toISOString(), origin: "runtime" };
  overlay().edges.push(edge);
  if (store()) pending().edges.push(edge);
  applyToCache((G) => G.link(edge));
  return edge;
}

/** Status counts and the lists of what is built and what still needs building. */
export function status(type?: string) {
  const G = graph();
  const nodes = [...G.nodes.values()].filter((n) => (type ? n.type === type : ["capability", "task", "stage", "question"].includes(n.type)));
  const counts: Record<string, number> = {};
  for (const n of nodes) counts[n.status] = (counts[n.status] ?? 0) + 1;
  const pick = (s: Status) => nodes.filter((n) => n.status === s).map((n) => ({ id: n.id, type: n.type, label: n.label }));
  return { counts, built: pick("built"), in_progress: pick("in_progress"), needed: pick("needed"), blocked: pick("blocked") };
}

export function neighbors(id: string) {
  const G = graph();
  const out = (G.out.get(id) ?? []).map((e) => ({ edge: e.type, direction: "out" as const, at: e.at, node: brief(G.nodes.get(e.to)!) }));
  const inn = (G.in.get(id) ?? []).map((e) => ({ edge: e.type, direction: "in" as const, at: e.at, node: brief(G.nodes.get(e.from)!) }));
  return [...out, ...inn];
}

export const brief = (n: KGNode) => ({ id: n.id, type: n.type, label: n.label, status: n.status });

/** Accepts fcg:type/slug, type/slug or type:slug. */
export function resolveId(raw: string): string {
  const s = decodeURIComponent(raw).trim();
  if (s.startsWith("fcg:")) return s;
  return `fcg:${s.replace(":", "/")}`;
}
