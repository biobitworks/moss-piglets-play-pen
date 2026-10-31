import { Redis } from "@upstash/redis";
import type { KGEdge, KGNode } from "./types";

/**
 * Shared store for runtime graph additions, so they survive restarts and are seen by every
 * serverless instance on Vercel. Uses Upstash Redis (Vercel Marketplace) when its env vars are set;
 * otherwise returns null and the graph falls back to memory (plus data/kg/runtime.json locally).
 *
 * Nodes live in a hash keyed by address (last write wins per node); edges are appended to a list,
 * so concurrent writers never drop each other's edges.
 */
const NODES = "playpen:kg:nodes";
const EDGES = "playpen:kg:edges";

let client: Redis | null | undefined;
export function store(): Redis | null {
  if (client !== undefined) return client;
  const url = process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN;
  client = url && token ? new Redis({ url, token }) : null;
  return client;
}

export const storeName = () => (store() ? "redis" : process.env.VERCEL ? "memory" : "file");

export async function loadRemote(): Promise<{ nodes: KGNode[]; edges: KGEdge[] } | null> {
  const r = store();
  if (!r) return null;
  const [nodes, edges] = await Promise.all([r.hgetall<Record<string, KGNode>>(NODES), r.lrange<KGEdge>(EDGES, 0, -1)]);
  return { nodes: Object.values(nodes ?? {}), edges: edges ?? [] };
}

export async function writeRemote(nodes: KGNode[], edges: KGEdge[]) {
  const r = store();
  if (!r || (!nodes.length && !edges.length)) return;
  const p = r.pipeline();
  if (nodes.length) p.hset(NODES, Object.fromEntries(nodes.map((n) => [n.id, n])));
  if (edges.length) p.rpush(EDGES, ...edges);
  await p.exec();
}
