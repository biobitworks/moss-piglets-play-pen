import { addEdge, addNode, graph } from "./graph";

/**
 * Agent connector. Agents are graph nodes (type "agent"); messages are graph nodes too, linked with
 * sentBy / sentTo / postedIn edges, so every exchange is addressable and shows up in search.
 *
 *   one-to-one   send({ from, to: "b" })
 *   one-to-many  send({ from, to: ["b", "c"] })
 *   many-to-many send({ from, topic: "proofreading" })  -> every subscriber of the topic except the sender
 */
export type Mode = "one_to_one" | "one_to_many" | "many_to_many";

const agentId = (s: string) => (s.startsWith("fcg:") ? s : `fcg:agent/${s.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`);
const topicId = (s: string) => (s.startsWith("fcg:") ? s : `fcg:topic/${s.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`);

export function registerAgent(input: { name: string; description?: string; capabilities?: string[]; topics?: string[]; endpoint?: string }) {
  const id = agentId(input.name);
  const existing = graph().nodes.get(id);
  const node = addNode({
    type: "agent",
    slug: id.split("/")[1],
    label: existing?.label ?? input.name,
    status: "built",
    description: input.description ?? existing?.description ?? "Registered through the agent connector.",
    props: { ...existing?.props, capabilities: input.capabilities ?? existing?.props?.capabilities ?? [], endpoint: input.endpoint ?? existing?.props?.endpoint, registeredAt: new Date().toISOString() },
  });
  for (const t of input.topics ?? []) subscribe(id, t);
  return { agent: node, topics: topicsOf(id) };
}

function ensureAgent(name: string) {
  const id = agentId(name);
  if (!graph().nodes.has(id)) registerAgent({ name });
  return id;
}

export function subscribe(agent: string, topic: string) {
  const a = ensureAgent(agent);
  const t = topicId(topic);
  if (!graph().nodes.has(t)) addNode({ type: "topic", slug: t.split("/")[1], label: topic.replace(/^fcg:topic\//, ""), status: "built", description: "Many-to-many channel." });
  const already = (graph().out.get(a) ?? []).some((e) => e.type === "subscribes" && e.to === t);
  if (!already) addEdge({ from: a, type: "subscribes", to: t });
  return { agent: a, topic: t };
}

export function topicsOf(agent: string) {
  return (graph().out.get(agentId(agent)) ?? []).filter((e) => e.type === "subscribes").map((e) => e.to);
}

export function subscribers(topic: string) {
  return (graph().in.get(topicId(topic)) ?? []).filter((e) => e.type === "subscribes").map((e) => e.from);
}

export interface Message {
  id: string;
  mode: Mode;
  from: string;
  to: string[];
  topic?: string;
  body: string;
  about?: string[];
  at: string;
}

export function send(input: { from: string; to?: string | string[]; topic?: string; body: string; about?: string[] }): Message {
  if (!input.body?.trim()) throw new Error("body is required");
  const from = ensureAgent(input.from);
  let mode: Mode;
  let to: string[];
  let topic: string | undefined;
  if (input.topic) {
    mode = "many_to_many";
    topic = subscribe(from, input.topic).topic;
    to = subscribers(topic).filter((a) => a !== from);
  } else if (Array.isArray(input.to)) {
    mode = input.to.length === 1 ? "one_to_one" : "one_to_many";
    to = [...new Set(input.to.map(ensureAgent))];
  } else if (input.to) {
    mode = "one_to_one";
    to = [ensureAgent(input.to)];
  } else {
    throw new Error("give `to` (an agent or a list of agents) or `topic`");
  }
  const at = new Date().toISOString();
  const slug = `m-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
  const about = (input.about ?? []).filter((x) => graph().nodes.has(x));
  const node = addNode({
    type: "message",
    slug,
    label: `${from.split("/")[1]} → ${topic ? `#${topic.split("/")[1]}` : to.map((x) => x.split("/")[1]).join(", ")}: ${input.body.slice(0, 60)}`,
    status: "built",
    description: input.body.slice(0, 2000),
    props: { mode, from, to, topic, at, about },
  });
  addEdge({ from: node.id, type: "sentBy", to: from });
  for (const r of to) addEdge({ from: node.id, type: "sentTo", to: r });
  if (topic) addEdge({ from: node.id, type: "postedIn", to: topic });
  for (const a of about) addEdge({ from: node.id, type: "about", to: a });
  return { id: node.id, mode, from, to, topic, body: input.body, about, at };
}

export function messages(filter: { agent?: string; topic?: string; since?: string; limit?: number } = {}): Message[] {
  const a = filter.agent ? agentId(filter.agent) : undefined;
  const t = filter.topic ? topicId(filter.topic) : undefined;
  const out: Message[] = [];
  for (const n of graph().nodes.values()) {
    if (n.type !== "message") continue;
    const p = n.props as unknown as Omit<Message, "id" | "body">;
    if (a && !(p.to?.includes(a) || p.from === a)) continue;
    if (t && p.topic !== t) continue;
    if (filter.since && p.at <= filter.since) continue;
    out.push({ id: n.id, body: n.description, ...p });
  }
  return out.sort((x, y) => x.at.localeCompare(y.at)).slice(-(filter.limit ?? 50));
}

export function agents() {
  return [...graph().nodes.values()]
    .filter((n) => n.type === "agent")
    .map((n) => ({ id: n.id, label: n.label, status: n.status, capabilities: (n.props?.capabilities as string[]) ?? [], topics: topicsOf(n.id) }));
}
