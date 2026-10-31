import type { CellClass, DataAdapter, Dataset, Neuron, Stage } from "./types";

/**
 * A made-up tardigrade dataset that stands in for Tardimap until the
 * consortium shares real data. The regions follow the published body plan
 * of a tardigrade nervous system (brain, subpharyngeal ganglion, four trunk
 * ganglia, stomatogastric system). Neuron counts per region and every
 * status are invented and generated from a fixed seed, so the numbers are
 * stable between deploys.
 */

const REGIONS: { name: string; count: number; mix: Partial<Record<CellClass, number>> }[] = [
  { name: "Brain", count: 196, mix: { sensory: 0.3, interneuron: 0.55, neuromodulatory: 0.08, unknown: 0.07 } },
  { name: "Subpharyngeal ganglion", count: 52, mix: { motor: 0.25, interneuron: 0.6, unknown: 0.15 } },
  { name: "Trunk ganglion 1", count: 64, mix: { sensory: 0.2, motor: 0.4, interneuron: 0.35, unknown: 0.05 } },
  { name: "Trunk ganglion 2", count: 62, mix: { sensory: 0.2, motor: 0.4, interneuron: 0.35, unknown: 0.05 } },
  { name: "Trunk ganglion 3", count: 62, mix: { sensory: 0.2, motor: 0.4, interneuron: 0.35, unknown: 0.05 } },
  { name: "Trunk ganglion 4", count: 58, mix: { sensory: 0.25, motor: 0.4, interneuron: 0.3, unknown: 0.05 } },
  { name: "Stomatogastric system", count: 34, mix: { motor: 0.4, sensory: 0.2, neuromodulatory: 0.25, unknown: 0.15 } },
  { name: "Peripheral nerves", count: 40, mix: { sensory: 0.7, motor: 0.2, unknown: 0.1 } },
];

/** How far along each region is, as cumulative probabilities for each stage. */
const STAGE_WEIGHTS: Record<Stage, number> = {
  unsegmented: 0.08,
  segmented: 0.34,
  proofread: 0.2,
  synapses: 0.16,
  typed: 0.12,
  named: 0.1,
};

/** Mulberry32: a small deterministic PRNG so the mock is identical on every build. */
function prng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick<T extends string>(rand: () => number, weights: Partial<Record<T, number>>): T {
  const entries = Object.entries(weights) as [T, number][];
  const total = entries.reduce((s, [, w]) => s + w, 0);
  let r = rand() * total;
  for (const [k, w] of entries) {
    r -= w;
    if (r <= 0) return k;
  }
  return entries[entries.length - 1][0];
}

function abbrev(region: string) {
  if (region === "Brain") return "BR";
  if (region === "Subpharyngeal ganglion") return "SPG";
  if (region === "Stomatogastric system") return "STG";
  if (region === "Peripheral nerves") return "PN";
  return "TG" + region.slice(-1);
}

const CLASS_PREFIX: Record<CellClass, string> = {
  sensory: "SN",
  motor: "MN",
  interneuron: "IN",
  neuromodulatory: "NM",
  unknown: "UN",
};

function buildDataset(): Dataset {
  const rand = prng(20261031);
  const neurons: Neuron[] = [];
  for (const region of REGIONS) {
    // Regions farther from the brain are, in this mock, a little less finished.
    const regionIndex = REGIONS.indexOf(region);
    for (let i = 0; i < region.count; i++) {
      const cellClass = pick(rand, region.mix);
      let stage = pick(rand, STAGE_WEIGHTS);
      if (regionIndex >= 6 && stage === "named" && rand() < 0.6) stage = "segmented";
      const side = rand() < 0.08 ? "midline" : rand() < 0.5 ? "left" : "right";
      const id = `${abbrev(region.name)}-${String(i + 1).padStart(3, "0")}`;
      const n: Neuron = { id, region: region.name, cellClass, side, stage };
      if (stage === "typed" || stage === "named") {
        n.cellType = `${CLASS_PREFIX[cellClass]}${abbrev(region.name)}${1 + Math.floor(rand() * 9)}`;
      }
      if (stage === "named") {
        n.name = `${n.cellType}_${side === "midline" ? "M" : side === "left" ? "L" : "R"}`;
      }
      neurons.push(n);
    }
  }
  return {
    source: "mock-tardigrade",
    label: "Mock tardigrade (stand-in for Tardimap)",
    species: "Hypsibius exemplaris (mock)",
    version: "mock-2026-10-31",
    isMock: true,
    description:
      "Illustrative data generated from a fixed seed. Region names follow the tardigrade body plan; counts and statuses are invented until Tardimap shares real data.",
    regions: REGIONS.map((r) => r.name),
    neurons,
  };
}

let cached: Dataset | null = null;

export const mockTardigradeAdapter: DataAdapter = {
  id: "mock-tardigrade",
  async getDataset() {
    if (!cached) cached = buildDataset();
    return cached;
  },
};
