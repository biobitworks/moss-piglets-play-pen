import { graph, neighbors, version } from "./graph";
import type { KGNode } from "./types";

/**
 * Dependency-free vector index for retrieval (the "R" in RAG).
 * Each node becomes a hashed TF-IDF vector over word unigrams, bigrams and character trigrams,
 * L2-normalised, and queries are ranked by cosine similarity. It rebuilds whenever the graph
 * changes, so new nodes from agents are searchable immediately. Swap `embed` for a hosted
 * embedding model and this Map for a vector database without changing callers.
 */
const DIM = 2048;
const STOP = new Set("a an and are as at be by for from has have in is it its of on or that the this to was what which with how do does i we you".split(" "));

function tokens(text: string): string[] {
  const words = text.toLowerCase().normalize("NFKD").replace(/[^a-z0-9#\s-]/g, " ").split(/[\s-]+/).filter((w) => w && !STOP.has(w));
  const out = [...words];
  for (let i = 0; i + 1 < words.length; i++) out.push(`${words[i]}_${words[i + 1]}`);
  for (const w of words) if (w.length > 4) for (let i = 0; i + 3 <= w.length; i++) out.push(`#${w.slice(i, i + 3)}`);
  return out;
}

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

export function nodeText(n: KGNode): string {
  const p = n.props ?? {};
  const extra = ["language", "install", "tardigradeFit", "summary"].map((k) => (p[k] ? `${k} ${p[k]}` : "")).join(" ");
  const rel = neighbors(n.id).slice(0, 12).map((x) => `${x.edge} ${x.node.label}`).join(". ");
  return `${n.label}. ${n.type}. status ${n.status.replace("_", " ")}. ${n.description} ${extra} ${rel}`;
}

interface Index {
  v: number;
  idf: Float32Array;
  vecs: Map<string, Float32Array>;
}
const g = globalThis as unknown as { __kgIndex?: Index };

function tf(toks: string[]): Map<number, number> {
  const m = new Map<number, number>();
  for (const t of toks) {
    const h = hash(t) % DIM;
    m.set(h, (m.get(h) ?? 0) + (t.startsWith("#") ? 0.3 : t.includes("_") ? 1.5 : 1));
  }
  return m;
}

function toVec(m: Map<number, number>, idf: Float32Array): Float32Array {
  const v = new Float32Array(DIM);
  let norm = 0;
  for (const [h, c] of m) {
    v[h] = (1 + Math.log(c)) * idf[h];
    norm += v[h] * v[h];
  }
  norm = Math.sqrt(norm) || 1;
  for (let i = 0; i < DIM; i++) v[i] /= norm;
  return v;
}

function index(): Index {
  const v = version();
  if (g.__kgIndex?.v === v) return g.__kgIndex;
  const nodes = [...graph().nodes.values()];
  const tfs = nodes.map((n) => tf(tokens(nodeText(n))));
  const df = new Float32Array(DIM);
  for (const m of tfs) for (const h of m.keys()) df[h]++;
  const idf = new Float32Array(DIM);
  for (let i = 0; i < DIM; i++) idf[i] = Math.log((1 + nodes.length) / (1 + df[i])) + 1;
  const vecs = new Map<string, Float32Array>();
  nodes.forEach((n, i) => vecs.set(n.id, toVec(tfs[i], idf)));
  g.__kgIndex = { v, idf, vecs };
  return g.__kgIndex;
}

export interface SearchHit {
  id: string;
  type: string;
  label: string;
  status: string;
  score: number;
  description: string;
}

export function search(query: string, opts: { k?: number; type?: string; status?: string } = {}): SearchHit[] {
  const { idf, vecs } = index();
  const q = toVec(tf(tokens(query)), idf);
  const G = graph();
  const hits: SearchHit[] = [];
  for (const [id, v] of vecs) {
    const n = G.nodes.get(id);
    if (!n || (opts.type && n.type !== opts.type) || (opts.status && n.status !== opts.status)) continue;
    let s = 0;
    for (let i = 0; i < DIM; i++) s += q[i] * v[i];
    if (s > 0.02) hits.push({ id, type: n.type, label: n.label, status: n.status, score: Math.round(s * 1000) / 1000, description: n.description });
  }
  return hits.sort((a, b) => b.score - a.score).slice(0, opts.k ?? 8);
}
