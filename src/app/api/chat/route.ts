import Anthropic from "@anthropic-ai/sdk";
import { status } from "@/lib/kg/graph";
import { runTool, TOOLS } from "@/lib/kg/tools";
import { search } from "@/lib/kg/vector";
import { flush, sync } from "@/lib/kg/graph";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MODEL = process.env.PLAYPEN_CHAT_MODEL ?? "claude-opus-5-5";
const MAX_TURNS = 6;

// Frozen system prompt so the prefix caches across requests.
const SYSTEM = `You are the Moss Piglet Play Pen assistant. The Play Pen connects people and agents working toward an open tardigrade connectome (Tardimap), using the finished fly connectome (FlyWire and partners) as the worked example.

You answer from the Play Pen knowledge graph. FCO is the vocabulary and FCG the graph. Every node has an address fcg:<type>/<slug>. Statuses: built, in_progress, needed, blocked, external (already built by someone else, e.g. fly tools).

- Use the tools to look things up before answering. kg_search finds nodes; kg_get_node shows one node and its links; kg_status lists what is built vs. needed; kg_worklog has task completion times and commits.
- Cite node addresses in backticks so people can open them, e.g. \`fcg:tool/navis\`.
- When asked which existing R or Python package to use, give the package, its install command, and whether it fits the tardigrade directly or needs an adapter.
- Be brief and plain. Say when the graph has no answer.`;

type ChatMsg = { role: "user" | "assistant"; content: string };

function retrieve(q: string) {
  return search(q, { k: 6 });
}

function offlineAnswer(q: string) {
  const hits = retrieve(q);
  const s = status();
  const lines = hits.map((h) => `- \`${h.id}\` (${h.status}): ${h.label}. ${h.description}`);
  return [
    "The chat model isn't configured on this server (set ANTHROPIC_API_KEY), so here is what the graph search found:",
    "",
    ...(lines.length ? lines : ["- Nothing matched."]),
    "",
    `Overall: ${s.counts.built ?? 0} built, ${s.counts.in_progress ?? 0} in progress, ${s.counts.needed ?? 0} needed, ${s.counts.blocked ?? 0} blocked.`,
  ].join("\n");
}

export async function POST(req: Request) {
  let history: ChatMsg[] = [];
  try {
    history = ((await req.json()).messages ?? []).filter((m: ChatMsg) => m && typeof m.content === "string" && (m.role === "user" || m.role === "assistant"));
  } catch {}
  const last = history.at(-1);
  if (!last || last.role !== "user") return Response.json({ error: "send { messages: [{ role: 'user', content }] }" }, { status: 400 });

  await sync();
  const hits = retrieve(last.content);
  if (!process.env.ANTHROPIC_API_KEY && !process.env.ANTHROPIC_AUTH_TOKEN) {
    return Response.json({ reply: offlineAnswer(last.content), retrieved: hits.map((h) => h.id), toolCalls: [], model: null });
  }

  const allowWrites = process.env.PLAYPEN_CHAT_WRITES === "1";
  const tools = TOOLS.filter((t) => allowWrites || !t.writes).map((t) => ({ name: t.name, description: t.description, input_schema: t.input_schema }));

  const client = new Anthropic();
  const context = hits.map((h) => `${h.id} [${h.status}] ${h.label}: ${h.description}`).join("\n");
  const messages: Anthropic.Beta.BetaMessageParam[] = [
    ...history.slice(0, -1).map((m) => ({ role: m.role, content: m.content })),
    {
      role: "user",
      content: [
        { type: "text", text: `Graph search results for this question (may be incomplete):\n${context || "(none)"}` },
        { type: "text", text: last.content },
      ],
    },
  ];

  const toolCalls: { name: string; input: unknown; error?: string }[] = [];
  try {
    for (let turn = 0; turn < MAX_TURNS; turn++) {
      const res = await client.beta.messages.create({
        model: MODEL,
        max_tokens: 16000,
        betas: ["server-side-fallback-2026-07-01"],
        fallbacks: "default",
        output_config: { effort: "low" },
        cache_control: { type: "ephemeral" },
        system: SYSTEM,
        tools,
        messages,
      });
      if (res.stop_reason === "refusal") {
        return Response.json({ reply: "I can't help with that one.", retrieved: hits.map((h) => h.id), toolCalls, model: res.model });
      }
      messages.push({ role: "assistant", content: res.content });
      const uses = res.content.filter((b): b is Anthropic.Beta.BetaToolUseBlock => b.type === "tool_use");
      if (res.stop_reason !== "tool_use" || !uses.length) {
        const reply = res.content.filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text").map((b) => b.text).join("\n").trim();
        return Response.json({ reply: reply || "(no answer)", retrieved: hits.map((h) => h.id), toolCalls, model: res.model });
      }
      const results: Anthropic.Beta.BetaToolResultBlockParam[] = uses.map((u) => {
        try {
          const out = runTool(u.name, (u.input as Record<string, unknown>) ?? {});
          toolCalls.push({ name: u.name, input: u.input });
          return { type: "tool_result", tool_use_id: u.id, content: JSON.stringify(out).slice(0, 20000) };
        } catch (e) {
          toolCalls.push({ name: u.name, input: u.input, error: (e as Error).message });
          return { type: "tool_result", tool_use_id: u.id, content: (e as Error).message, is_error: true };
        }
      });
      // Persist this batch's writes now, so they survive even if a later model call fails.
      await flush();
      messages.push({ role: "user", content: results });
    }
    return Response.json({ reply: "That took too many steps; try a narrower question.", retrieved: hits.map((h) => h.id), toolCalls, model: MODEL });
  } catch (e) {
    const msg = e instanceof Anthropic.APIError ? `Claude API error ${e.status}: ${e.message}` : (e as Error).message;
    return Response.json({ reply: `${offlineAnswer(last.content)}\n\n(${msg})`, retrieved: hits.map((h) => h.id), toolCalls, model: null, error: msg }, { status: 200 });
  }
}
