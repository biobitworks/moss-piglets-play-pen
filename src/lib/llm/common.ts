import { flush } from "@/lib/kg/graph";
import { runTool, TOOLS } from "@/lib/kg/tools";
import { search, type SearchHit } from "@/lib/kg/vector";
import { graphAnswer } from "./answer";

/** One chat turn's text history, as the browser sends it. */
export type ChatMsg = { role: "user" | "assistant"; content: string };

export interface ChatResult {
  reply: string;
  backend: BackendId;
  model: string | null;
  retrieved: string[];
  toolCalls: { name: string; input: unknown; error?: string }[];
  error?: string;
}

export type BackendId = "claude" | "local" | "search";

export const MAX_TURNS = 6;

// Frozen so the prefix caches across requests.
export const SYSTEM = `You are the Moss Piglet Play Pen assistant. The Play Pen connects people and agents working toward an open tardigrade connectome (Tardimap), using the finished fly connectome (FlyWire and partners) as the worked example.

You answer from the Play Pen knowledge graph. FCO is the vocabulary and FCG the graph. Every node has an address fcg:<type>/<slug>. Statuses: built, in_progress, needed, blocked, external (already built by someone else, e.g. fly tools).

- Use the tools to look things up before answering. kg_search finds nodes; kg_get_node shows one node and its links; kg_status lists what is built vs. needed; kg_worklog has task completion times and commits.
- Cite node addresses in backticks so people can open them, e.g. \`fcg:tool/navis\`.
- When asked which existing R or Python package to use, give the package, its install command, and whether it fits the tardigrade directly or needs an adapter.
- When asked about next steps, say what is needed or blocked and what it depends on.
- Be brief and plain. Say when the graph has no answer.`;

export const retrieve = (q: string): SearchHit[] => search(q, { k: 6 });

export const contextBlock = (hits: SearchHit[]) =>
  `Graph search results for this question (may be incomplete):\n${hits.map((h) => `${h.id} [${h.status}] ${h.label}: ${h.description}`).join("\n") || "(none)"}`;

export function chatTools() {
  const allowWrites = process.env.PLAYPEN_CHAT_WRITES === "1";
  return TOOLS.filter((t) => allowWrites || !t.writes);
}

/** Runs one tool call, records it, and returns the text for the model. */
export function execTool(name: string, input: unknown, log: ChatResult["toolCalls"]): { text: string; isError: boolean } {
  try {
    const out = runTool(name, (input as Record<string, unknown>) ?? {});
    log.push({ name, input });
    return { text: JSON.stringify(out).slice(0, 20000), isError: false };
  } catch (e) {
    log.push({ name, input, error: (e as Error).message });
    return { text: (e as Error).message, isError: true };
  }
}

/** Persist writes from a tool batch before the next model call. */
export const afterToolBatch = () => flush();

/** Key-free answer built from the graph structure; see answer.ts. */
export const searchOnlyAnswer = (q: string, why?: string) => graphAnswer(q, why).text;
