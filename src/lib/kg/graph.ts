import fs from "node:fs";
import path from "node:path";
import fcg from "../../../data/kg/fcg.json";
import fco from "../../../data/kg/fco.json";
import gitData from "../../../data/kg/git.json";
import worklogData from "../../../data/kg/worklog.json";
import type { GitCommit, KGEdge, KGNode, Status, WorklogEntry } from "./types";

export { fco };

const RUNTIME_FILE = path.join(process.cwd(), "data", "kg", "runtime.json");
/** Persist runtime additions to disk only when running locally (Vercel's filesystem is read-only). */
const PERSIST = !process.env.VERCEL && process.env.PLAYPEN_KG_PERSIST !== "0";

interface Overlay {
  nodes: KGNode[];
  edges: KGEdge[];
}

// Keep the overlay on globalThis so Next.js dev reloads and separate route modules share it.
const g = globalThis as unknown as { __kgOverlay?: Overlay; __kgVersion?: number; __kgCache?: { v: number; graph: Graph } };
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

function save() {
  g.__kgVersion = (g.__kgVersion ?? 1) + 1;
  if (!PERSIST) return;
  try {
    fs.writeFileSync(RUNTIME_FILE, JSON.stringify(overlay(), null, 1) + "\n");
  } catch {}
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

  add(n: KGNode) {
    const prev = this.nodes.get(n.id);
    this.nodes.set(n.id, prev ? { ...prev, ...n, props: { ...prev.props, ...n.props } } : n);
  }
  link(e: KGEdge) {
    if (!this.nodes.has(e.from) || !this.nodes.has(e.to)) return;
    if (this.edges.some((x) => x.from === e.from && x.to === e.to && x.type === e.type)) return;
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

  // Roll task status up into the capabilities they implement.
  for (const [id, n] of G.nodes) {
    if (n.type !== "capability") continue;
    const tasks = (G.in.get(id) ?? []).filter((e) => e.type === "implements").map((e) => G.nodes.get(e.from)!);
    if (!tasks.length) continue;
    const done = tasks.filter((t) => t.status === "built").length;
    const status: Status = done === tasks.length ? "built" : done || tasks.some((t) => t.status === "in_progress") ? "in_progress" : n.status;
    G.add({ ...n, status });
  }
  return G;
}

export function graph(): Graph {
  // The seed files are part of the key so edits show up in dev without a restart.
  const v = version() * 1e6 + (worklogData as { entries: unknown[] }).entries.length * 1e3 + (gitData as { commits: unknown[] }).commits.length + (fcg.nodes as unknown[]).length * 7;
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

const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60) || "item";

export function addNode(input: { type: string; label: string; status?: Status; description?: string; slug?: string; props?: Record<string, unknown> }): KGNode {
  const type = slugify(input.type);
  const id = `fcg:${type}/${input.slug ? slugify(input.slug) : slugify(input.label)}`;
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
  o.nodes = o.nodes.filter((x) => x.id !== id).concat(n);
  save();
  return n;
}

export function addEdge(e: { from: string; type: string; to: string }): KGEdge {
  const G = graph();
  if (!G.nodes.has(e.from)) throw new Error(`unknown node ${e.from}`);
  if (!G.nodes.has(e.to)) throw new Error(`unknown node ${e.to}`);
  const edge: KGEdge = { ...e, at: new Date().toISOString(), origin: "runtime" };
  overlay().edges.push(edge);
  save();
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
