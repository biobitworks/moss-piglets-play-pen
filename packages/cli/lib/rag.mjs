/**
 * RAG connector: retrieve from the Play Pen graph, answer with a pluggable model.
 * Default: local OpenAI-compatible server (Ollama). No API key. Unreachable model -> graph-only answer,
 * never a different model. Frontier later: openAICompatible({ url, model, apiKey }) or anthropic().
 */
import { request } from "./client.mjs";

export const SYSTEM =
  "You answer questions about the Moss Piglets Play Pen: what exists for the fly connectome and what is built or still " +
  "needed to finish the tardigrade connectome (Tardimap). Use only the context nodes given. Cite nodes by their address " +
  "in backticks, like `fcg:tool/navis`. If the context does not say, say so.";

export function openAICompatible({ url, model, apiKey, timeout = 180000 } = {}) {
  url = (url || process.env.PLAYPEN_LOCAL_URL || "http://localhost:11434/v1").replace(/\/+$/, "");
  model = model || process.env.PLAYPEN_LOCAL_MODEL || "llama3.1:8b";
  apiKey = apiKey ?? process.env.PLAYPEN_LOCAL_API_KEY;
  const headers = apiKey ? { authorization: `Bearer ${apiKey}` } : {};
  return {
    name: "openai-compatible", model, url,
    async available() { try { await request("GET", url + "/models", { headers, timeout: 3000 }); return true; } catch { return false; } },
    async complete(messages) {
      const out = await request("POST", url + "/chat/completions", { headers, timeout, body: { model, messages, temperature: 0.2, stream: false } });
      return (out.choices?.[0]?.message?.content ?? "").trim();
    },
  };
}

export function anthropic({ model, apiKey } = {}) {
  model = model || process.env.PLAYPEN_CLAUDE_MODEL || "claude-opus-5-5";
  apiKey = apiKey || process.env.ANTHROPIC_API_KEY;
  return {
    name: "anthropic", model,
    async available() { return Boolean(apiKey); },
    async complete(messages) {
      const system = messages.filter((m) => m.role === "system").map((m) => m.content).join("\n\n");
      const out = await request("POST", "https://api.anthropic.com/v1/messages", {
        headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01" }, timeout: 180000,
        body: { model, max_tokens: 1500, system, messages: messages.filter((m) => m.role !== "system") },
      });
      return (out.content ?? []).filter((b) => b.type === "text").map((b) => b.text).join("").trim();
    },
  };
}

export function nodeText(n) {
  const lines = [`[${n.id}] ${n.label ?? ""} (type ${n.type}, status ${n.status ?? "n/a"})`];
  if (n.description) lines.push(n.description);
  for (const k of ["install", "docs", "url", "language"]) if (n.props?.[k]) lines.push(`${k}: ${n.props[k]}`);
  for (const e of (n.links ?? []).slice(0, 12)) lines.push(`  ${e.direction === "out" ? "->" : "<-"} ${e.edge} ${e.node?.id ?? ""} ${e.node?.label ?? ""}`.trimEnd());
  return lines.join("\n");
}

export function graphAnswer(question, hits, why = "") {
  const pre = why ? why + " " : "";
  if (!hits.length) return pre + "Nothing in the graph matched that. Try different words, or `playpen status`.";
  return [pre + `Closest matches in the graph for "${question}":`,
    ...hits.map((h) => `- \`${h.id}\` ${h.label ?? ""} (${h.status ?? "n/a"})${h.description ? ": " + h.description : ""}`)].join("\n");
}

export class RAG {
  /** llm: an object from openAICompatible()/anthropic(), "local" (default), "search"/null, or async (messages) => string. */
  constructor(client, llm = "local", { k = 6, expand = 3 } = {}) {
    this.client = client;
    if (llm === "local") llm = openAICompatible();
    else if (llm === "search") llm = null;
    else if (typeof llm === "function") { const fn = llm; llm = { name: "custom", model: null, available: async () => true, complete: fn }; }
    this.llm = llm; this.k = k; this.expand = expand;
  }
  async retrieve(question) {
    const hits = (await this.client.search(question, { k: this.k })) ?? [];
    await Promise.all(hits.slice(0, this.expand).map(async (h) => {
      try { const n = await this.client.node(h.id); Object.assign(h, { links: n.links, props: n.props, description: n.description ?? h.description }); } catch {}
    }));
    return hits;
  }
  messages(question, hits, history = []) {
    return [{ role: "system", content: SYSTEM }, ...history,
      { role: "user", content: `Context nodes:\n\n${hits.map(nodeText).join("\n\n")}\n\nQuestion: ${question}` }];
  }
  async ask(question, history = []) {
    const hits = await this.retrieve(question);
    const sources = hits.map((h) => h.id);
    if (!this.llm) return { answer: graphAnswer(question, hits), backend: "search", model: null, sources };
    if (!(await this.llm.available())) {
      const why = `No model reachable (${this.llm.name}${this.llm.url ? " " + this.llm.url : ""}).`;
      return { answer: graphAnswer(question, hits, why), backend: "search", model: null, sources, note: why };
    }
    try {
      return { answer: await this.llm.complete(this.messages(question, hits, history)), backend: this.llm.name, model: this.llm.model, sources };
    } catch (e) {
      return { answer: graphAnswer(question, hits, `The model failed (${e.message}).`), backend: "search", model: null, sources, error: e.message };
    }
  }
}
