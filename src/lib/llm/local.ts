import { afterToolBatch, chatTools, contextBlock, execTool, MAX_TURNS, retrieve, SYSTEM, type ChatMsg, type ChatResult } from "./common";

/**
 * Local backend: any OpenAI-compatible chat completions server running on your machine or network,
 * e.g. Ollama (default, http://localhost:11434/v1), LM Studio, llama.cpp server or vLLM.
 * Uses tool calling when the model supports it; otherwise answers from the retrieved graph context alone.
 */
export const localUrl = () => (process.env.PLAYPEN_LOCAL_URL ?? "http://localhost:11434/v1").replace(/\/+$/, "");
export const localModel = () => process.env.PLAYPEN_LOCAL_MODEL ?? "llama3.1:8b";

function headers() {
  const h: Record<string, string> = { "content-type": "application/json" };
  if (process.env.PLAYPEN_LOCAL_API_KEY) h.authorization = `Bearer ${process.env.PLAYPEN_LOCAL_API_KEY}`;
  return h;
}

/** Quick reachability check (lists models). */
export async function localStatus(): Promise<{ available: boolean; models: string[]; error?: string }> {
  if (process.env.PLAYPEN_LOCAL_DISABLED === "1") return { available: false, models: [], error: "disabled" };
  try {
    const res = await fetch(`${localUrl()}/models`, { headers: headers(), signal: AbortSignal.timeout(1500), cache: "no-store" });
    if (!res.ok) return { available: false, models: [], error: `HTTP ${res.status}` };
    const data = (await res.json()) as { data?: { id: string }[] };
    return { available: true, models: (data.data ?? []).map((m) => m.id) };
  } catch (e) {
    return { available: false, models: [], error: (e as Error).message };
  }
}

type OAIToolCall = { id: string; type: "function"; function: { name: string; arguments: string } };
type OAIMessage =
  | { role: "system" | "user"; content: string }
  | { role: "assistant"; content: string | null; tool_calls?: OAIToolCall[] }
  | { role: "tool"; tool_call_id: string; content: string };

async function complete(model: string, messages: OAIMessage[], withTools: boolean) {
  const body: Record<string, unknown> = { model, messages, stream: false, temperature: 0.2 };
  if (withTools) {
    body.tools = chatTools().map((t) => ({ type: "function", function: { name: t.name, description: t.description, parameters: t.input_schema } }));
  }
  const res = await fetch(`${localUrl()}/chat/completions`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(Number(process.env.PLAYPEN_LOCAL_TIMEOUT_MS ?? 120000)),
  });
  const text = await res.text();
  if (!res.ok) throw Object.assign(new Error(`Local model error ${res.status}: ${text.slice(0, 300)}`), { status: res.status });
  return JSON.parse(text) as { model?: string; choices: { message: { content: string | null; tool_calls?: OAIToolCall[] }; finish_reason?: string }[] };
}

export async function chatLocal(history: ChatMsg[], modelOverride?: string): Promise<ChatResult> {
  const last = history.at(-1)!;
  const hits = retrieve(last.content);
  const model = modelOverride || localModel();
  const messages: OAIMessage[] = [
    { role: "system", content: SYSTEM },
    ...history.slice(0, -1).map((m) => ({ role: m.role, content: m.content }) as OAIMessage),
    { role: "user", content: `${contextBlock(hits)}\n\n${last.content}` },
  ];
  const toolCalls: ChatResult["toolCalls"] = [];
  const base = { backend: "local" as const, retrieved: hits.map((h) => h.id), toolCalls };
  let withTools = process.env.PLAYPEN_LOCAL_TOOLS !== "0";

  for (let turn = 0; turn < MAX_TURNS; turn++) {
    let res;
    try {
      res = await complete(model, messages, withTools);
    } catch (e) {
      // Many small local models reject the tools field; fall back to answering from the retrieved context.
      if (withTools && (e as { status?: number }).status === 400) {
        withTools = false;
        turn--;
        continue;
      }
      throw e;
    }
    const msg = res.choices?.[0]?.message;
    if (!msg) throw new Error("Local model returned no choices");
    const calls = withTools ? (msg.tool_calls ?? []) : [];
    if (!calls.length) {
      return { ...base, reply: (msg.content ?? "").trim() || "(no answer)", model: res.model ?? model };
    }
    messages.push({ role: "assistant", content: msg.content ?? null, tool_calls: calls });
    for (const c of calls) {
      let input: unknown = {};
      try {
        input = c.function.arguments ? JSON.parse(c.function.arguments) : {};
      } catch {
        messages.push({ role: "tool", tool_call_id: c.id, content: "Invalid JSON arguments; resend valid JSON." });
        toolCalls.push({ name: c.function.name, input: c.function.arguments, error: "invalid JSON" });
        continue;
      }
      messages.push({ role: "tool", tool_call_id: c.id, content: execTool(c.function.name, input, toolCalls).text });
    }
    await afterToolBatch();
  }
  return { ...base, reply: "That took too many steps; try a narrower question.", model };
}
