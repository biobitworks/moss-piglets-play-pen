import Anthropic from "@anthropic-ai/sdk";
import { afterToolBatch, chatTools, contextBlock, execTool, MAX_TURNS, retrieve, SYSTEM, type ChatMsg, type ChatResult } from "./common";

/** Frontier backend: Claude through the Anthropic API. */
export const claudeModel = () => process.env.PLAYPEN_CHAT_MODEL ?? "claude-opus-5-5";
export const claudeConfigured = () => !!(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);

export async function chatClaude(history: ChatMsg[]): Promise<ChatResult> {
  const last = history.at(-1)!;
  const hits = retrieve(last.content);
  const model = claudeModel();
  const client = new Anthropic();
  const tools = chatTools().map((t) => ({ name: t.name, description: t.description, input_schema: t.input_schema }));
  const messages: Anthropic.Beta.BetaMessageParam[] = [
    ...history.slice(0, -1).map((m) => ({ role: m.role, content: m.content })),
    { role: "user", content: [{ type: "text", text: contextBlock(hits) }, { type: "text", text: last.content }] },
  ];
  const toolCalls: ChatResult["toolCalls"] = [];
  const base = { backend: "claude" as const, retrieved: hits.map((h) => h.id), toolCalls };

  for (let turn = 0; turn < MAX_TURNS; turn++) {
    const res = await client.beta.messages.create({
      model,
      max_tokens: 16000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "low" },
      cache_control: { type: "ephemeral" },
      system: SYSTEM,
      tools,
      messages,
    });
    if (res.stop_reason === "refusal") return { ...base, reply: "I can't help with that one.", model: res.model };
    messages.push({ role: "assistant", content: res.content });
    const uses = res.content.filter((b): b is Anthropic.Beta.BetaToolUseBlock => b.type === "tool_use");
    if (res.stop_reason !== "tool_use" || !uses.length) {
      const reply = res.content.filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text").map((b) => b.text).join("\n").trim();
      return { ...base, reply: reply || "(no answer)", model: res.model };
    }
    const results: Anthropic.Beta.BetaToolResultBlockParam[] = uses.map((u) => {
      const r = execTool(u.name, u.input, toolCalls);
      return { type: "tool_result", tool_use_id: u.id, content: r.text, ...(r.isError ? { is_error: true } : {}) };
    });
    await afterToolBatch();
    messages.push({ role: "user", content: results });
  }
  return { ...base, reply: "That took too many steps; try a narrower question.", model };
}

export function describeClaudeError(e: unknown) {
  return e instanceof Anthropic.APIError ? `Claude API error ${e.status}: ${e.message}` : (e as Error).message;
}
