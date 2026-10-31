export const STATUSES = ["built", "in_progress", "needed", "blocked", "external"] as const;
export type Status = (typeof STATUSES)[number];

export interface KGNode {
  /** Address: fcg:<type>/<slug> */
  id: string;
  type: string;
  label: string;
  status: Status;
  description: string;
  props?: Record<string, unknown>;
  /** Where the node came from: seed file, git history, worklog, or added at runtime. */
  origin?: "seed" | "git" | "worklog" | "runtime";
  updatedAt?: string;
}

export interface KGEdge {
  from: string;
  type: string;
  to: string;
  at?: string;
  origin?: KGNode["origin"];
}

export interface WorklogEntry {
  kind: "task" | "push";
  task?: string;
  status?: Status;
  at: string;
  commit: string;
  commitAt?: string;
  subject?: string;
  summary?: string;
  branch?: string;
}

export interface GitCommit {
  sha: string;
  at: string;
  author: string;
  isMerge: boolean;
  subject: string;
  pr?: number;
}
