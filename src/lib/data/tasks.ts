import type { Dataset, Neuron, Stage } from "./types";

export type TaskKind = "proofread" | "synapses" | "type" | "name";

export interface Task {
  id: string;
  kind: TaskKind;
  neuronId: string;
  region: string;
  title: string;
  difficulty: "starter" | "intermediate" | "advanced";
  /** Training module that must be passed before this task can be claimed. */
  requires: TaskKind;
}

export const TASK_INFO: Record<TaskKind, { label: string; how: string; difficulty: Task["difficulty"] }> = {
  proofread: {
    label: "Proofread",
    how: "Walk the neuron in the viewer. Merge fragments that belong to it and split off pieces that don't.",
    difficulty: "starter",
  },
  synapses: {
    label: "Check synapses",
    how: "Review the automatically detected synapses on this neuron and flag false positives.",
    difficulty: "intermediate",
  },
  type: {
    label: "Propose a cell type",
    how: "Compare shape, position and partners with similar neurons, then propose a type with a short reason.",
    difficulty: "advanced",
  },
  name: {
    label: "Suggest a name",
    how: "Typed neurons get a stable name. Check the left-right pair and suggest a name that follows the naming guide.",
    difficulty: "intermediate",
  },
};

/** The next piece of work for a neuron, based on the stage it has reached. */
const NEXT: Partial<Record<Stage, TaskKind>> = {
  segmented: "proofread",
  proofread: "synapses",
  synapses: "type",
  typed: "name",
};

export function tasksFor(ds: Dataset): Task[] {
  const tasks: Task[] = [];
  for (const n of ds.neurons) {
    const kind = NEXT[n.stage];
    if (!kind) continue;
    tasks.push(makeTask(n, kind));
  }
  return tasks;
}

function makeTask(n: Neuron, kind: TaskKind): Task {
  return {
    id: `${kind}-${n.id}`,
    kind,
    neuronId: n.id,
    region: n.region,
    title: `${TASK_INFO[kind].label} ${n.id}`,
    difficulty: TASK_INFO[kind].difficulty,
    requires: kind === "name" ? "type" : kind,
  };
}
