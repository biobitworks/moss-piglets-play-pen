# Task plan: agent connector MVP by 4:00 PM

Target: a working local server (chat + agent tools + built-vs-needed view) that deploys to Vercel, by
**4:00 PM Pacific (23:00 UTC), 31 Oct 2026**. Timezone is assumed until Byron confirms it.

Work runs in 15-minute slots. Each task has an id (`T01`…). When a task is finished, its completion
time and commit are written to the knowledge graph (`data/kg/worklog.json`) with
`npm run log -- T0x "what was done"`. The graph then shows the task as `built`, linked to the commit
that finished it. Pushes and merges are pulled in from `git log` by `npm run kg:sync`.

| Slot (PT)   | Slot (UTC)  | Task | Deliverable | Done when |
|-------------|-------------|------|-------------|-----------|
| 1:45–2:00   | 20:45–21:00 | T01  | Merge PR #2 and #3, plan and roadmap docs | Branch builds, this file committed |
| 2:00–2:15   | 21:00–21:15 | T02  | FCO vocabulary and seeded FCG (`data/kg/*.json`) | Graph loads, every node has an address |
| 2:15–2:30   | 21:15–21:30 | T03  | Tool nodes for R and Python packages, proof-of-work logger | `npm run log` writes a task completion tied to a commit |
| 2:30–2:45   | 21:30–21:45 | T04  | Vector search over the graph (RAG retrieval) | `/api/kg/search?q=` returns ranked nodes |
| 2:45–3:00   | 21:45–22:00 | T05  | Agent tool endpoints: REST and MCP (JSON-RPC) | `tools/list` and `tools/call` work over HTTP |
| 3:00–3:15   | 22:00–22:15 | T06  | Agent connector: one-to-one, one-to-many, many-to-many | `/api/connect` routes a message all three ways |
| 3:15–3:30   | 22:15–22:30 | T07  | Chat endpoint using the Claude API, with graph tools | `/chat` answers from the graph |
| 3:30–3:45   | 22:30–22:45 | T08  | Built-vs-needed board and worklog timeline pages | `/graph` and `/worklog` render live state |
| 3:45–4:00   | 22:45–23:00 | T09  | Build check, README, PR, Vercel notes | `npm run build` passes, PR open |

T01–T09 all finished by 2:03 PM PT and PR #4 merged at 2:11 PM PT. The next slots after Byron's "proceed with next steps":

| Slot (PT)   | Slot (UTC)  | Task | Deliverable | Done when |
|-------------|-------------|------|-------------|-----------|
| 2:15–2:30   | 21:15–21:30 | T10  | Shared persistence (Upstash Redis) for graph additions and agent messages | A write on one server instance is read on another |
| 2:30–2:45   | 21:30–21:45 | T11  | Exact Vercel steps and env vars | `docs/DEPLOY.md` covers import, Redis, API key, read-only |

## Rules for the slots

- Commit at the end of every slot, even if the task is partial. A partial task is logged as
  `in_progress`, never as `built`.
- If a slot runs over, the next slot's task moves down, and the cut line is T08 (the board can fall
  back to `/api/kg/status`).
- Anything that needs a decision from Byron goes into the graph as a `Question` node, so the chat can
  answer "what is blocked on whom".

## Open questions

- **Q-TZ:** Is 4:00 PM Pacific? (Assumed.)
- **Q-MAGIC:** What are "magicpro" and "magicstudio"? Until we know, the time record lives in the repo
  and the graph, which any tool can read from `/api/kg/worklog`.
- **Q-FCO:** "FCO/FCG" is not a published name we could find on flyconnecto.me or Virtual Fly Brain.
  This plan defines it (see `docs/AGENT_CONNECTOR.md`); correct us if it means something else.
