# Agent connector: roadmap and design

The fly connectome is the worked example. Its data (FlyWire, hemibrain, MANC and the rest), its tools
(navis, fafbseg, neuprint-python, the natverse, CAVE, Neuroglancer) and its community process already
exist. Tardimap is where the same recipe has to be repeated for the tardigrade. The Play Pen's next step
is a **connector between agents**: a shared, addressable knowledge graph that people, chat and AI
agents can all read and write, so anyone can see what has been built and what still needs building,
in real time.

## What "FCO/FCG" means here

We could not find FCO or FCG as published names on flyconnecto.me or Virtual Fly Brain, so this is our
working definition. Please correct it if Byron meant something else.

- **FCO, the FlyConnectome Ontology.** A small vocabulary of node and edge types, modeled on how Virtual
  Fly Brain links datasets through the FBbt anatomy ontology. It covers datasets, pipeline stages,
  tools, capabilities, tasks, agents, commits and questions (full list in `data/kg/fco.json`).
- **FCG, the FlyConnectome Graph.** The instance graph built from FCO terms: the fly side as the
  reference, the tardigrade side as the work in progress, and the Play Pen's own build as proof of work.
  It lives in `data/kg/fcg.json`.

Every node has an address of the form `fcg:<type>/<slug>` (for example `fcg:tool/navis`). The same
address works in the chat, in `GET /api/kg/node/<type>/<slug>`, and as the `id` argument of the MCP
tools, so a person and an agent are always talking about the same thing.

## Architecture (MVP)

```
 people ──► /chat (Next.js page) ──► /api/chat ──► Claude API (tool use)
                                          │
 agents ──► /api/mcp (MCP, JSON-RPC) ─────┤──► tool registry (src/lib/kg/tools.ts)
 agents ──► /api/kg/* (REST) ─────────────┤        │
 agents ──► /api/connect (agent bus) ─────┘        ├─► knowledge graph (FCO + FCG JSON, plus runtime overlay)
                                                   ├─► vector index (hashed TF-IDF, cosine) for RAG
                                                   └─► worklog (task completions tied to commits)
```

- **Knowledge graph.** Seeded from JSON in the repo, so it is versioned with the code. A runtime
  overlay accepts new nodes and edges from agents. Locally the overlay is saved to
  `data/kg/runtime.json`; on Vercel it is in memory until a database is added (see the roadmap).
- **Vector search.** A dependency-free hashed TF-IDF embedding with cosine similarity, rebuilt
  whenever the graph changes. It can be swapped for a hosted embedding model and vector database
  without changing the tool interface.
- **Agent connector.** Agents register with the capabilities they offer. A message can go to one
  agent (one-to-one), to a list (one-to-many), or to a topic that many agents subscribe to
  (many-to-many). Every message is also an edge in the graph, so the conversation between agents is
  addressable too.
- **Tools for agents.** The same tool functions back the REST routes, the MCP endpoint and the chat,
  so there is one implementation. Existing R and Python packages are nodes in the graph with their
  install command, docs and which pipeline stage they serve, so an agent can answer "which tool do I
  use to do X" and "does a tardigrade equivalent exist yet".
- **Proof of work.** Each task in `docs/TASK_PLAN.md` is a `Task` node. Finishing it writes a
  timestamped `completedBy` edge to the commit that did it (`npm run log`). `npm run kg:sync` reads
  `git log` and adds commits, merges and their times. The chat and `/worklog` show the timeline.

## Roadmap

| Phase | What | Status |
|-------|------|--------|
| 0 | Contributor on-ramp on mock data (PR #2), stack review (PR #3) | Built |
| 1 | **This MVP:** FCO/FCG graph, vector search, MCP and REST tools, agent connector, chat, built-vs-needed board, worklog | In progress (31 Oct 2026) |
| 2 | Persist the graph and agent messages in a database (Postgres with pgvector, or Neo4j if the graph grows), plus real embeddings | Needed |
| 3 | Live sync from GitHub (webhooks for pushes, PRs and merges) instead of build-time `git log` | Needed |
| 4 | Python agent worker that runs navis and fafbseg jobs from graph tasks and writes results back | Needed |
| 5 | Tardimap adapter: the tardigrade side of the graph fills from real reconstruction data | Blocked on Tardimap (Step 0) |
| 6 | Cross-species links (fly cell type ↔ tardigrade cell type) through a shared vocabulary | Needed |

The live version of this table is the graph itself: ask the chat "what still needs building" or call
the `kg_status` tool.
