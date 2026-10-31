import { sync } from "@/lib/kg/graph";
import { chatClaude, claudeConfigured, claudeModel, describeClaudeError } from "@/lib/llm/claude";
import { retrieve, searchOnlyAnswer, type BackendId, type ChatMsg, type ChatResult } from "@/lib/llm/common";
import { chatLocal, localModel, localStatus, localUrl } from "@/lib/llm/local";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Chat with a choice of backend:
 *   claude  frontier model through the Anthropic API (needs ANTHROPIC_API_KEY)
 *   local   an OpenAI-compatible server such as Ollama (PLAYPEN_LOCAL_URL, PLAYPEN_LOCAL_MODEL)
 *   search  no model; graph search results only
 * The default is PLAYPEN_CHAT_BACKEND, else the first available of claude, local, search.
 */
async function backends() {
  const local = await localStatus();
  const list = [
    { id: "claude" as const, label: "Frontier (Claude)", available: claudeConfigured(), model: claudeModel(), note: claudeConfigured() ? undefined : "set ANTHROPIC_API_KEY" },
    { id: "local" as const, label: "Local model", available: local.available, model: localModel(), models: local.models, url: localUrl(), note: local.available ? undefined : `no server at ${localUrl()}` },
    { id: "search" as const, label: "Graph search only", available: true, model: null },
  ];
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
  const pick = (list.find((b) => b.id === wanted && b.available)?.id ?? def) as BackendId;
  const fallbackNote = wanted && wanted !== pick ? `The ${wanted} backend isn't available, so this used ${pick}. ` : "";

  const searchOnly = (why: string, error?: string): ChatResult => ({
    reply: searchOnlyAnswer(last.content, why),
    backend: "search",
    model: null,
    retrieved: retrieve(last.content).map((h) => h.id),
    toolCalls: [],
    ...(error ? { error } : {}),
  });

  try {
    if (pick === "claude") return Response.json({ ...(await chatClaude(history)), note: fallbackNote || undefined });
    if (pick === "local") return Response.json({ ...(await chatLocal(history, localModelPick)), note: fallbackNote || undefined });
    return Response.json(searchOnly(`${fallbackNote}No chat model is in use.`));
  } catch (e) {
    const msg = pick === "claude" ? describeClaudeError(e) : (e as Error).message;
    return Response.json(searchOnly(`The ${pick} model failed (${msg}).`, msg));
  }
}
