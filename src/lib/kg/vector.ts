import { graph, neighbors } from "./graph";
import type { KGNode } from "./types";

/**
 * Dependency-free vector index for retrieval (the "R" in RAG).
 * Each node becomes a sparse TF-IDF vector over word unigrams, bigrams and character trigrams,
 * L2-normalised, and queries are ranked by cosine similarity. It rebuilds whenever the graph
 * changes, so new nodes from agents are searchable immediately. Swap `embed` for a hosted
 * embedding model and this Map for a vector database without changing callers.
 */
// Every distinct token gets its own dimension (no hashing). The first version hashed into 2048 dense
// dimensions; at 20k nodes, collisions let unrelated short nodes outrank real answers (docs/STRESS_TEST.md).
const vocab = ((globalThis as unknown as { __kgVocab?: Map<string, number> }).__kgVocab ??= new Map());
const dim = (t: string) => vocab.get(t) ?? (vocab.set(t, vocab.size), vocab.size - 1);
const HISTORY = new Set(["commit", "pr", "message"]);
// Words every node's text carries (status and type). Their character trigrams matched unrelated queries
// ("starter" ~ "status", "external"), so 20k near-empty nodes outranked real answers in the stress test.
const BOILER = new Set("status built progress needed blocked external celltype capability dataset species question commit message".split(" "));
const STOP = new Set("a an and are as at be by for from has have in is it its of on or that the this to was what which with how do does i we you".split(" "));

function tokens(text: string): string[] {
  const words = text.toLowerCase().normalize("NFKD").replace(/[^a-z0-9#\s-]/g, " ").split(/[\s-]+/).filter((w) => w && !STOP.has(w));
  const out = [...words];
  for (let i = 0; i + 1 < words.length; i++) out.push(`${words[i]}_${words[i + 1]}`);
  for (const w of words) if (w.length > 4 && !BOILER.has(w)) for (let i = 0; i + 3 <= w.length; i++) out.push(`#${w.slice(i, i + 3)}`);
  return out;
}


export function nodeText(n: KGNode): string {
  const p = n.props ?? {};
  const extra = ["language", "install", "tardigradeFit", "summary"].map((k) => (p[k] ? `${k} ${p[k]}` : "")).join(" ");
  const rel = neighbors(n.id).slice(0, 12).map((x) => `${x.edge} ${x.node.label}`).join(". ");
  return `${n.label}. ${n.type}. status ${n.status.replace("_", " ")}. ${n.description} ${extra} ${rel}`;
}

/** Sparse vector: token dimensions and their weights, L2-normalised. */
interface Sparse {
  dims: Uint32Array;
  vals: Float32Array;
}
interface Index {
  /** The Graph object the index was built from; a new graph means a full rebuild. */
  v: unknown;
  /** Node count at the last full rebuild; IDF is refreshed when the graph grows by a quarter. */
  builtAt: number;
  idf: Map<number, number>;
  /** IDF for tokens no node had at the last rebuild. */
  idfMax: number;
  vecs: Map<string, Sparse>;
  /** Inverted index: for each dimension, the nodes that use it. Stale entries are skipped at query time. */
  postings: Map<number, Map<string, number>>;
}
const g = globalThis as unknown as { __kgIndex?: Index };

/** Term frequencies. Queries pass grow=false so arbitrary query words don't grow the vocabulary. */
function tf(toks: string[], grow = true): Map<number, number> {
  const m = new Map<number, number>();
  for (const t of toks) {
    const h = grow ? dim(t) : vocab.get(t);
    if (h === undefined) continue;
    m.set(h, (m.get(h) ?? 0) + (t.startsWith("#") ? 0.3 : t.includes("_") ? 1.5 : 1));
  }
  return m;
}

function toVec(m: Map<number, number>, ix: { idf: Map<number, number>; idfMax: number }): Sparse {
  const dims = new Uint32Array(m.size);
  const vals = new Float32Array(m.size);
  let norm = 0;
  let i = 0;
  for (const [h, c] of m) {
    const w = (1 + Math.log(c)) * (ix.idf.get(h) ?? ix.idfMax);
    dims[i] = h;
    vals[i++] = w;
    norm += w * w;
  }
  norm = Math.sqrt(norm) || 1;
  for (let j = 0; j < vals.length; j++) vals[j] /= norm;
  return { dims, vals };
}

function post(ix: Index, id: string, v: Sparse) {
  ix.vecs.set(id, v);
  for (let j = 0; j < v.dims.length; j++) {
    const d = v.dims[j];
    (ix.postings.get(d) ?? ix.postings.set(d, new Map()).get(d)!).set(id, v.vals[j]);
  }
}

function rebuild(G: ReturnType<typeof graph>): Index {
  const nodes = [...G.nodes.values()];
  const tfs = nodes.map((n) => tf(tokens(nodeText(n))));
  const df = new Map<number, number>();
  for (const m of tfs) for (const h of m.keys()) df.set(h, (df.get(h) ?? 0) + 1);
  const base = Math.log(1 + nodes.length) + 1;
  const idf = new Map<number, number>();
  for (const [h, c] of df) idf.set(h, base - Math.log(1 + c));
  const ix: Index = { v: G, builtAt: nodes.length, idf, idfMax: base, vecs: new Map(), postings: new Map() };
  nodes.forEach((n, i) => post(ix, n.id, toVec(tfs[i], ix)));
  G.dirty.clear();
  return ix;
}

/**
 * The index follows the graph incrementally: nodes added, edited or linked since the last query
 * are re-embedded with the current IDF, and the whole index is rebuilt only when the graph object
 * is replaced or has grown by more than a quarter. Before, every write rebuilt every vector.
 */
function index(): Index {
  const G = graph();
  let ix = g.__kgIndex;
  if (!ix || ix.v !== G || G.nodes.size > ix.builtAt * 1.25 + 50) return (g.__kgIndex = rebuild(G));
  if (G.dirty.size) {
    for (const id of G.dirty) {
      const old = ix.vecs.get(id);
      if (old) for (const d of old.dims) ix.postings.get(d)?.delete(id);
      const n = G.nodes.get(id);
      if (n) post(ix, id, toVec(tf(tokens(nodeText(n))), ix));
      else ix.vecs.delete(id);
    }
    G.dirty.clear();
  }
  return ix;
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
  const ix = index();
  const q = toVec(tf(tokens(query), false), ix);
  const G = graph();
  // Score only nodes that share at least one dimension with the query (sparse dot product).
  const scores = new Map<string, number>();
  for (let j = 0; j < q.dims.length; j++) {
    const d = q.dims[j], qv = q.vals[j];
    for (const [id, w] of ix.postings.get(d) ?? []) scores.set(id, (scores.get(id) ?? 0) + qv * w);
  }
  const hits: SearchHit[] = [];
  for (let [id, s] of scores) {
    const n = G.nodes.get(id);
    if (!n || (opts.type && n.type !== opts.type) || (opts.status && n.status !== opts.status)) continue;
    // History nodes (commits, PRs, messages) are many and noisy; rank them below the things they describe.
    if (!opts.type && HISTORY.has(n.type)) s *= 0.6;
    if (s > 0.02) hits.push({ id, type: n.type, label: n.label, status: n.status, score: Math.round(s * 1000) / 1000, description: n.description });
  }
  return hits.sort((a, b) => b.score - a.score).slice(0, opts.k ?? 8);
}
