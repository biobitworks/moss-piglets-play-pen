import { CELL_CLASSES, STAGES, type CellClass, type Dataset, type Stage } from "./types";

export interface Breakdown {
  key: string;
  total: number;
  byStage: Record<Stage, number>;
  /** Fraction of neurons that have reached "named", i.e. fully done. */
  done: number;
  /** Average progress through the pipeline, 0 to 1. */
  progress: number;
}

function emptyStages(): Record<Stage, number> {
  return Object.fromEntries(STAGES.map((s) => [s, 0])) as Record<Stage, number>;
}

function breakdown(key: string, stages: Stage[]): Breakdown {
  const byStage = emptyStages();
  let progress = 0;
  for (const s of stages) {
    byStage[s]++;
    progress += STAGES.indexOf(s) / (STAGES.length - 1);
  }
  const total = stages.length;
  return {
    key,
    total,
    byStage,
    done: total ? byStage.named / total : 0,
    progress: total ? progress / total : 0,
  };
}

export function summarize(ds: Dataset) {
  const overall = breakdown("All neurons", ds.neurons.map((n) => n.stage));
  const byRegion = ds.regions.map((r) =>
    breakdown(r, ds.neurons.filter((n) => n.region === r).map((n) => n.stage)),
  );
  const byClass = CELL_CLASSES.map((c: CellClass) =>
    breakdown(c, ds.neurons.filter((n) => n.cellClass === c).map((n) => n.stage)),
  ).filter((b) => b.total > 0);
  return { overall, byRegion, byClass };
}
