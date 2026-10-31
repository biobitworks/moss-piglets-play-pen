import { sync } from "@/lib/kg/graph";
import { chatClaude, claudeConfigured, claudeModel, describeClaudeError } from "@/lib/llm/claude";
import { graphAnswer } from "@/lib/llm/answer";
import { type BackendId, type ChatMsg, type ChatResult } from "@/lib/llm/common";
import { chatLocal, localModel, localStatus, localUrl } from "@/lib/llm/local";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Chat with a choice of backend. No API key is needed:
 *   local   an OpenAI-compatible server such as Ollama (PLAYPEN_LOCAL_URL, PLAYPEN_LOCAL_MODEL)
 *   search  no model; answers from the graph structure and search
 *   claude  optional frontier model, listed only when ANTHROPIC_API_KEY is set
 * The default is PLAYPEN_CHAT_BACKEND if available, else local if reachable, else search.
 * Claude is never the default unless PLAYPEN_CHAT_BACKEND=claude.
 */
async function backends() {
  const local = await localStatus();
  const list: { id: BackendId; label: string; available: boolean; model: string | null; models?: string[]; url?: string; note?: string; optional?: boolean }[] = [
    { id: "local", label: "Local model", available: local.available, model: localModel(), models: local.models, url: localUrl(), note: local.available ? undefined : `start Ollama at ${localUrl()}` },
    { id: "search", label: "Graph only (no model)", available: true, model: null },
  ];
  if (claudeConfigured()) list.push({ id: "claude", label: "Frontier (optional)", available: true, model: claudeModel(), optional: true });
  const pref = process.env.PLAYPEN_CHAT_BACKEND as BackendId | undefined;
  const def = list.find((b) => b.id === pref && b.available) ?? list.find((b) => b.available)!;
  return { default: def.id, backends: list };
}

export async function GET() {
  return Response.json(await backends());
}

export async function POST(req: Request) {
  let history: ChatMsg[] = [];
  let wanted: string | undefined;
  let localModelPick: string | undefined;
  try {
    const body = await req.json();
    wanted = body.backend;
    localModelPick = typeof body.model === "string" ? body.model : undefined;
    history = (body.messages ?? []).filter((m: ChatMsg) => m && typeof m.content === "string" && (m.role === "user" || m.role === "assistant"));
  } catch {}
  const last = history.at(-1);
  if (!last || last.role !== "user") return Response.json({ error: "send { messages: [{ role: 'user', content }], backend? }" }, { status: 400 });

  await sync();
  const { default: def, backends: list } = await backends();
  // An explicit choice is never silently sent to a different model (e.g. local -> Claude); it falls back to search.
  const requested = list.find((b) => b.id === wanted);
  // "claude" without a key is not in the list; treat it as an unavailable choice, not as "use the default".
  const unknownChoice = !requested && wanted === "claude";
  const pick = (requested ? (requested.available ? requested.id : "search") : unknownChoice ? "search" : def) as BackendId;
  const fallbackNote = wanted && wanted !== pick ? `The ${wanted} backend isn't available, so this used ${pick}. ` : "";

  const searchOnly = (why: string | undefined, error?: string): ChatResult => {
    const a = graphAnswer(last.content, why);
    return { reply: a.text, backend: "search", model: null, retrieved: a.retrieved, toolCalls: [], ...(error ? { error } : {}) };
  };

  try {
    if (pick === "claude") return Response.json({ ...(await chatClaude(history)), note: fallbackNote || undefined });
    if (pick === "local") return Response.json({ ...(await chatLocal(history, localModelPick)), note: fallbackNote || undefined });
    return Response.json(searchOnly(fallbackNote.trim() || undefined));
  } catch (e) {
    const msg = pick === "claude" ? describeClaudeError(e) : (e as Error).message;
    return Response.json(searchOnly(`The ${pick} model failed (${msg}).`, msg));
  }
}
