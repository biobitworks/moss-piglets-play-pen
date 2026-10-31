import fs from "node:fs";
import path from "node:path";
import { mockDataset } from "../data/mock-tardigrade";

/**
 * Connectome datasets the Play Pen can browse, query and hand to agents.
 *
 * Neuron-level data does not go into the knowledge graph: a whole-brain dataset is 10^5 neurons
 * and 10^7 edges, and the stress test (docs/STRESS_TEST.md) showed the in-memory graph and its
 * vector index slow down sharply past ~20k nodes. Each dataset is instead one normalised file
 * (data/datasets/<id>/neurons.json, written by scripts/fetch-datasets.mjs) loaded lazily with its
 * own indexes. The graph holds one `dataset` node per entry here (same id) so chat can find it.
 */
export interface DatasetInfo {
  id: string;
  label: string;
  species: string;
  /** Knowledge graph address of the dataset node. */
  kg: string;
  kind: "connectome" | "annotations" | "mock";
  /** What is in it, in one sentence. */
  summary: string;
  source: string;
  citation: string;
  license: string;
  /** Why it is a starter dataset for the tardigrade work. */
  why: string;
  /** Committed to the repo (true) or fetched with `npm run data:fetch` (false). */
  committed: boolean;
}

export const DATASETS: DatasetInfo[] = [
  {
    id: "tardigrade-mock",
    label: "Tardigrade (mock, until Tardimap shares Riker)",
    species: "Hypsibius exemplaris",
    kg: "fcg:dataset/tardimap-riker",
    kind: "mock",
    summary: "Seeded stand-in for the Tardimap Riker EM reconstruction: neurons with region, class, side and pipeline stage. No synapses.",
    source: "src/lib/data/mock-tardigrade.ts",
    citation: "Illustrative only. Real data: Tardimap (tardimap.org), not public yet.",
    license: "Mock data, no restrictions",
    why: "Keeps every page and tool shaped like the real tardigrade dataset, so swapping in Tardimap's export is one adapter.",
    committed: true,
  },
  {
    id: "celegans-hermaphrodite",
    label: "C. elegans hermaphrodite connectome",
    species: "Caenorhabditis elegans",
    kg: "fcg:dataset/celegans-hermaphrodite",
    kind: "connectome",
    summary: "Complete wiring diagram: ~300 neurons plus muscles and end organs, chemical and electrical connections with weights.",
    source: "https://github.com/openworm/c302/blob/master/c302/data/herm_full_edgelist.csv",
    citation: "Cook et al. 2019, Nature 571:63-71; packaged by OpenWorm c302.",
    license: "OpenWorm, MIT",
    why: "The closest public analogue to a tardigrade connectome in size (a few hundred neurons), with real edges. Every analysis we want on Riker can be built and tested here first.",
    committed: true,
  },
  {
    id: "flywire-fafb",
    label: "FlyWire whole-brain annotations",
    species: "Drosophila melanogaster",
    kg: "fcg:dataset/flywire-fafb",
    kind: "annotations",
    summary: "139,248 neurons of the adult fly brain with super class, class, cell type, hemilineage, side and predicted neurotransmitter.",
    source: "https://github.com/flyconnectome/flywire_annotations",
    citation: "Schlegel et al. 2024 and Dorkenwald et al. 2024, Nature 634.",
    license: "CC-BY 4.0",
    why: "The reference for cell typing and annotation at scale: the vocabulary and annotation table the tardigrade release should copy. Connectivity is on Codex/Zenodo (not loaded here yet).",
    committed: false,
  },
  {
    id: "hemibrain",
    label: "Hemibrain neuron metadata",
    species: "Drosophila melanogaster",
    kg: "fcg:dataset/hemibrain",
    kind: "annotations",
    summary: "25,397 hemibrain v1.2.1 neurons with type, instance, cell body fiber and pre/post synapse counts, matched to FlyWire.",
    source: "https://github.com/flyconnectome/flywire_annotations/blob/main/supplemental_files/Supplemental_file5_hemibrain_meta.csv",
    citation: "Scheffer et al. 2020, eLife 9:e57443; metadata as distributed with Schlegel et al. 2024.",
    license: "CC-BY 4.0",
    why: "A second fly dataset typed against the first: the model for cross-dataset matching (what a tardigrade-to-tardigrade or fly-to-tardigrade link table looks like).",
    committed: false,
  },
];

export interface Neuron {
  id: string;
  name?: string;
  type?: string;
  class?: string;
  super_class?: string;
  kind?: string;
  side?: string;
  nt?: string;
  [k: string]: unknown;
}

interface Loaded {
  info: DatasetInfo;
  fetchedAt?: string;
  neurons: Neuron[];
  byId: Map<string, Neuron>;
  /** Lowercased searchable text per neuron, same order as neurons. */
  text: string[];
  out: Map<string, [string, number, string][]>;
  in: Map<string, [string, number, string][]>;
  edgeCount: number;
}

const g = globalThis as unknown as { __datasets?: Map<string, Loaded | null> };
const cache = () => (g.__datasets ??= new Map());
const DIR = path.join(process.cwd(), "data", "datasets");

function readFile(id: string): { neurons: Neuron[]; edges?: [string, string, number, string][]; fetchedAt?: string } | null {
  if (id === "tardigrade-mock") return null;
  try {
    return JSON.parse(fs.readFileSync(path.join(DIR, id, "neurons.json"), "utf8"));
  } catch {
    return null;
  }
}

function mockNeurons(): Neuron[] {
  const d = mockDataset();
  return d.neurons.map((n) => ({ id: n.id, name: n.name ?? n.id, type: n.cellType, class: n.cellClass, region: n.region, side: n.side, stage: n.stage }));
}

export function load(id: string): Loaded | null {
  const c = cache();
  if (c.has(id)) return c.get(id)!;
  const info = DATASETS.find((d) => d.id === id);
  if (!info) return null;
  const file = id === "tardigrade-mock" ? { neurons: mockNeurons() } : readFile(id);
  if (!file) {
    // Not fetched yet. Don't cache the miss, so running `npm run data:fetch` works without a restart.
    return null;
  }
  const out = new Map<string, [string, number, string][]>();
  const inn = new Map<string, [string, number, string][]>();
  for (const [a, b, w, k] of file.edges ?? []) {
    (out.get(a) ?? out.set(a, []).get(a)!).push([b, w, k]);
    (inn.get(b) ?? inn.set(b, []).get(b)!).push([a, w, k]);
  }
  const L: Loaded = {
    info,
    fetchedAt: file.fetchedAt,
    neurons: file.neurons,
    byId: new Map(file.neurons.map((n) => [String(n.id), n])),
    text: file.neurons.map((n) => [n.id, n.name, n.type, n.class, n.super_class, n.sub_class, n.kind, n.nt, n.side, n.hemilineage, n.region, n.hemibrain_type].filter(Boolean).join(" ").toLowerCase()),
    out,
    in: inn,
    edgeCount: file.edges?.length ?? 0,
  };
  c.set(id, L);
  return L;
}

export function list() {
  return DATASETS.map((d) => {
    const L = load(d.id);
    return { ...d, loaded: !!L, neurons: L?.neurons.length ?? 0, edges: L?.edgeCount ?? 0, fetchedAt: L?.fetchedAt };
  });
}

const top = (xs: (string | undefined)[], k = 12) =>
  Object.entries(xs.reduce<Record<string, number>>((a, x) => (x ? ((a[x] = (a[x] ?? 0) + 1), a) : a), {}))
    .sort((a, b) => b[1] - a[1])
    .slice(0, k);

export function summary(id: string) {
  const L = load(id);
  if (!L) return null;
  const N = L.neurons;
  const degree = (n: Neuron) => (L.out.get(n.id)?.length ?? 0) + (L.in.get(n.id)?.length ?? 0);
  return {
    ...L.info,
    fetchedAt: L.fetchedAt,
    neurons: N.length,
    edges: L.edgeCount,
    types: new Set(N.map((n) => n.type).filter(Boolean)).size,
    bySuperClass: top(N.map((n) => n.super_class ?? n.kind)),
    byClass: top(N.map((n) => n.class)),
    byNt: top(N.map((n) => n.nt)),
    bySide: top(N.map((n) => n.side)),
    byStage: top(N.map((n) => n.stage as string | undefined)),
    hubs: L.edgeCount ? [...N].sort((a, b) => degree(b) - degree(a)).slice(0, 10).map((n) => ({ id: n.id, name: n.name, degree: degree(n) })) : [],
  };
}

/** Search neurons by any annotation (substring, all words must match). Exact id matches come first. */
export function searchNeurons(id: string, q = "", opts: { limit?: number; offset?: number } = {}) {
  const L = load(id);
  if (!L) return null;
  const limit = Math.max(1, Math.min(500, opts.limit ?? 50));
  const offset = Math.max(0, opts.offset ?? 0);
  const words = q.toLowerCase().split(/\s+/).filter(Boolean);
  const hits: Neuron[] = [];
  let total = 0;
  // The exact id match is position 0 of the ordering, so offset and limit page through it like any other hit.
  const exact = L.byId.get(q.trim());
  const take = (n: Neuron) => {
    if (total >= offset && hits.length < limit) hits.push(n);
    total++;
  };
  if (exact) take(exact);
  for (let i = 0; i < L.neurons.length; i++) {
    if (L.neurons[i] === exact) continue;
    if (words.every((w) => L.text[i].includes(w))) take(L.neurons[i]);
  }
  return { dataset: id, q, total, offset, limit, neurons: hits };
}

/** One neuron with its strongest upstream and downstream partners (when the dataset has edges). */
export function neuron(id: string, nid: string, k = 25) {
  const L = load(id);
  if (!L) return null;
  const n = L.byId.get(nid);
  if (!n) return undefined;
  const partners = (xs: [string, number, string][] = []) =>
    [...xs].sort((a, b) => b[1] - a[1]).slice(0, k).map(([p, w, kind]) => ({ id: p, name: L.byId.get(p)?.name ?? p, weight: w, kind }));
  const sum = (xs: [string, number, string][] = []) => xs.reduce((s, x) => s + x[1], 0);
  return {
    dataset: id,
    neuron: n,
    hasEdges: L.edgeCount > 0,
    upstream: partners(L.in.get(nid)),
    downstream: partners(L.out.get(nid)),
    totals: { inputs: sum(L.in.get(nid)), outputs: sum(L.out.get(nid)), upstreamPartners: L.in.get(nid)?.length ?? 0, downstreamPartners: L.out.get(nid)?.length ?? 0 },
  };
}
