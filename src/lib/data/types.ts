/**
 * Data model for the Play Pen. Every data source (the mock tardigrade
 * dataset today, Tardimap or a FlyWire slice later) is turned into this
 * shape by an adapter, so the rest of the app never changes.
 */

/** Pipeline stages, in order. A neuron at a stage has finished every earlier one. */
export const STAGES = [
  "unsegmented",
  "segmented",
  "proofread",
  "synapses",
  "typed",
  "named",
] as const;

export type Stage = (typeof STAGES)[number];

export const STAGE_LABELS: Record<Stage, string> = {
  unsegmented: "Not yet segmented",
  segmented: "Segmented",
  proofread: "Proofread",
  synapses: "Synapses attached",
  typed: "Cell type assigned",
  named: "Named (done)",
};

export const CELL_CLASSES = [
  "sensory",
  "motor",
  "interneuron",
  "neuromodulatory",
  "unknown",
] as const;

export type CellClass = (typeof CELL_CLASSES)[number];

export interface Neuron {
  id: string;
  region: string;
  cellClass: CellClass;
  side: "left" | "right" | "midline";
  stage: Stage;
  cellType?: string;
  name?: string;
}

export interface Dataset {
  /** Stable id of the data source, e.g. "mock-tardigrade". */
  source: string;
  label: string;
  species: string;
  /** Version of the data behind every number shown (requirement P-3). */
  version: string;
  /** True when the numbers are illustrative rather than real. */
  isMock: boolean;
  description: string;
  regions: string[];
  neurons: Neuron[];
}

export interface DataAdapter {
  id: string;
  getDataset(): Promise<Dataset>;
}
