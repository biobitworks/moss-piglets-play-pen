import { agents, messages, registerAgent, send, subscribe } from "./bus";
import { addEdge, addNode, brief, fco, gitCommits, graph, neighbors, resolveId, status, worklog } from "./graph";
import { STATUSES, type Status } from "./types";
import { search } from "./vector";

/**
 * One tool registry for every caller: the chat (Claude tool use), the MCP endpoint, and REST
 * (/api/tools/<name>). Schemas are JSON Schema so they can be passed to Claude and MCP as they are.
 */
export interface ToolDef {
  name: string;
  description: string;
  input_schema: { type: "object"; properties: Record<string, unknown>; required?: string[]; additionalProperties?: boolean };
  /** Writes to the graph or the agent bus. */
  writes?: boolean;
  run: (input: Record<string, unknown>) => unknown;
}

const str = (description: string, extra: Record<string, unknown> = {}) => ({ type: "string", description, ...extra });
const statusEnum = { type: "string", enum: [...STATUSES] };

function getNode(raw: string) {
  const id = resolveId(raw);
  const n = graph().nodes.get(id);
  if (!n) throw new Error(`No node ${id}. Use kg_search to find addresses.`);
  return { ...n, links: neighbors(id) };
}

export const TOOLS: ToolDef[] = [
  {
    name: "kg_search",
    description:
      "Semantic search over the Play Pen knowledge graph (fly connectome tools, datasets, tardigrade pipeline stages, capabilities, tasks, questions, commits, agent messages). Returns node addresses (fcg:type/slug) with scores. Use this first to find what to look at.",
    input_schema: {
      type: "object",
      properties: { query: str("What to look for, in plain words."), type: str("Optional node type filter, e.g. tool, capability, task."), status: { ...statusEnum, description: "Optional status filter." }, k: { type: "integer", description: "Max results (default 8)." } },
      required: ["query"],
    },
    run: (i) => search(String(i.query), { k: Number(i.k ?? 8), type: i.type as string | undefined, status: i.status as string | undefined }),
  },
  {
    name: "kg_get_node",
    description: "Get one node by address (fcg:type/slug), with all its links in and out.",
    input_schema: { type: "object", properties: { id: str("Node address, e.g. fcg:tool/navis.") }, required: ["id"] },
    run: (i) => getNode(String(i.id)),
  },
  {
    name: "kg_list",
    description: "List nodes of one type, optionally filtered by status. Types: " + Object.keys(fco.nodeTypes).join(", ") + ".",
    input_schema: { type: "object", properties: { type: str("Node type."), status: { ...statusEnum, description: "Optional status filter." } }, required: ["type"] },
    run: (i) =>
      [...graph().nodes.values()]
        .filter((n) => n.type === i.type && (!i.status || n.status === i.status))
        .map((n) => ({ ...brief(n), description: n.description, props: n.props })),
  },
  {
    name: "kg_status",
    description: "What has been built and what still needs building: counts and lists by status for capabilities, tasks, pipeline stages and questions (or one type).",
    input_schema: { type: "object", properties: { type: str("Optional: limit to one node type.") } },
    run: (i) => status(i.type as string | undefined),
  },
  {
    name: "kg_worklog",
    description: "Proof of work: task completions with timestamps and commits, pushes, and the git history (commits and merges with times).",
    input_schema: { type: "object", properties: { limit: { type: "integer", description: "How many recent commits to include (default 20)." } } },
    run: (i) => ({ entries: worklog(), commits: gitCommits().slice(-Number(i.limit ?? 20)) }),
  },
  {
    name: "kg_add_node",
    description: "Add or update a node in the graph (for example a newly needed capability, a question, or a finished piece of work). Returns its address.",
    writes: true,
    input_schema: {
      type: "object",
      properties: {
        type: str("Node type from the FCO vocabulary."),
        label: str("Short name."),
        status: { ...statusEnum, description: "Defaults to needed." },
        description: str("One or two sentences."),
        slug: str("Optional stable slug for the address."),
      },
      required: ["type", "label"],
    },
    run: (i) => addNode({ type: String(i.type), label: String(i.label), status: i.status as Status | undefined, description: i.description as string | undefined, slug: i.slug as string | undefined }),
  },
  {
    name: "kg_add_edge",
    description: "Link two existing nodes with an FCO edge type (" + Object.keys(fco.edgeTypes).join(", ") + ").",
    writes: true,
    input_schema: { type: "object", properties: { from: str("Source address."), type: str("Edge type."), to: str("Target address.") }, required: ["from", "type", "to"] },
    run: (i) => addEdge({ from: resolveId(String(i.from)), type: String(i.type), to: resolveId(String(i.to)) }),
  },
  {
    name: "agent_register",
    description: "Register an agent with the connector, with the capabilities it offers and topics it listens to.",
    writes: true,
    input_schema: {
      type: "object",
      properties: { name: str("Agent name."), description: str("What it does."), capabilities: { type: "array", items: { type: "string" } }, topics: { type: "array", items: { type: "string" } }, endpoint: str("Optional URL where it can be reached.") },
      required: ["name"],
    },
    run: (i) => registerAgent(i as Parameters<typeof registerAgent>[0]),
  },
  {
    name: "agent_send",
    description:
      "Send a message between agents. One-to-one: to='agent'. One-to-many: to=['a','b']. Many-to-many: topic='name' (all subscribers). Optionally link it to graph nodes with about=[addresses].",
    writes: true,
    input_schema: {
      type: "object",
      properties: {
        from: str("Sending agent."),
        to: { description: "One agent name, or a list of names.", anyOf: [{ type: "string" }, { type: "array", items: { type: "string" } }] },
        topic: str("Topic for many-to-many."),
        body: str("Message text."),
        about: { type: "array", items: { type: "string" }, description: "Node addresses the message is about." },
      },
      required: ["from", "body"],
    },
    run: (i) => send(i as Parameters<typeof send>[0]),
  },
  {
    name: "agent_subscribe",
    description: "Subscribe an agent to a topic (many-to-many channel).",
    writes: true,
    input_schema: { type: "object", properties: { agent: str("Agent name."), topic: str("Topic name.") }, required: ["agent", "topic"] },
    run: (i) => subscribe(String(i.agent), String(i.topic)),
  },
  {
    name: "agent_inbox",
    description: "Read messages for an agent (sent or received), or for a topic, optionally only after a timestamp.",
    input_schema: { type: "object", properties: { agent: str("Agent name."), topic: str("Topic name."), since: str("ISO timestamp.") } },
    run: (i) => messages({ agent: i.agent as string | undefined, topic: i.topic as string | undefined, since: i.since as string | undefined }),
  },
  {
    name: "agent_list",
    description: "List registered agents, their capabilities and topics.",
    input_schema: { type: "object", properties: {} },
    run: () => agents(),
  },
];

export const toolByName = new Map(TOOLS.map((t) => [t.name, t]));

type Schema = { type?: string; enum?: unknown[]; items?: Schema; anyOf?: Schema[] };

function check(value: unknown, schema: Schema, path: string): string | null {
  if (schema.anyOf) return schema.anyOf.some((s) => check(value, s, path) === null) ? null : `${path} has the wrong type`;
  if (schema.enum && !schema.enum.includes(value)) return `${path} must be one of ${schema.enum.join(", ")}`;
  switch (schema.type) {
    case "string":
      return typeof value === "string" ? (value.length > 5000 ? `${path} is too long` : null) : `${path} must be a string`;
    case "integer":
      return Number.isInteger(typeof value === "string" ? Number(value) : value) ? null : `${path} must be an integer`;
    case "array":
      if (!Array.isArray(value)) return `${path} must be an array`;
      for (let i = 0; i < value.length; i++) {
        const e = schema.items && check(value[i], schema.items, `${path}[${i}]`);
        if (e) return e;
      }
      return null;
    default:
      return null;
  }
}

/** Validates arguments against the tool's JSON schema, so a malformed call can't store bad data. */
export function validate(t: ToolDef, input: Record<string, unknown>): string | null {
  if (typeof input !== "object" || input === null || Array.isArray(input)) return "arguments must be an object";
  for (const r of t.input_schema.required ?? []) if (input[r] === undefined || input[r] === null || input[r] === "") return `${r} is required`;
  for (const [k, v] of Object.entries(input)) {
    const s = t.input_schema.properties[k] as Schema | undefined;
    if (!s) return `unknown argument ${k}`;
    if (v === undefined) continue;
    const e = check(v, s, k);
    if (e) return e;
  }
  return null;
}

/** Writes can be switched off for public deployments with PLAYPEN_READONLY=1. */
export function runTool(name: string, input: Record<string, unknown> = {}) {
  const t = toolByName.get(name);
  if (!t) throw new Error(`Unknown tool ${name}`);
  if (t.writes && process.env.PLAYPEN_READONLY === "1") throw new Error("This deployment is read-only (PLAYPEN_READONLY=1).");
  const args = input ?? {};
  const err = validate(t, args);
  if (err) throw new Error(`Invalid arguments for ${name}: ${err}`);
  return t.run(args);
}
