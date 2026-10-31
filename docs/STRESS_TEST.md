# Stress test

Run on 2026-10-31 (UTC) against a local production build (`npm run build && npm start`), one Node
process, no Redis (file/memory overlay), no Claude API key (chat answers from graph search only).
Vercel is not in the loop: everything here is the local server.

Reproduce:

```bash
npm run data:fetch                  # C. elegans is committed; this adds FlyWire and hemibrain
npm run build && PLAYPEN_KG_PERSIST=0 npm start
npm run stress -- --concurrency 24 --duration 6 --bulk 20000 --out stress.json
node scripts/e2e.cjs                # headless browser walk-through (Playwright + Chromium)
```

`PLAYPEN_KG_PERSIST=0` keeps the 20k test nodes out of `data/kg/runtime.json`.

## What the test does

`scripts/stress.mjs` (no dependencies) runs four phases with 24 concurrent clients:

1. **Read mix** for 6 s: `/api/kg/status`, `/api/kg/search`, MCP `tools/list` and `tools/call kg_search`,
   offline `/api/chat`, the `/graph` page, and the new dataset endpoints (FlyWire 139k-neuron search,
   C. elegans neuron + partners).
2. **Read + write mix** for 6 s: the same reads while agents add graph nodes (`kg_add_node` over REST)
   and send messages (`agent_send` over MCP).
3. **Bulk load**: 20,000 real FlyWire cell types (from the fetched annotation table) pushed into the
   knowledge graph through MCP in JSON-RPC batches of 50, 8 batches at a time. Then 20 serial searches.
4. **Read mix again**, now on a graph of about 20,500 nodes.

## Results

rps is per endpoint (10 endpoints share the server, so total throughput is about 10x). Latencies in ms.

### Before fixes (main at PR #5)

| Phase | Endpoint | rps | p50 | p95 |
|---|---|---|---|---|
| read mix, ~150 nodes | `/api/kg/search` | 38 | 24 | 52 |
| | `/graph` | 42 | 197 | 252 |
| read + write mix | `/api/kg/search` | 24 | 39 | 78 |
| | `/graph` | 22 | 331 | 606 |
| bulk load 20k nodes | MCP batch of 50 | 54 | 111 | 432 |
| search right after bulk | `/api/kg/search` (serial) | | 93 | 934 |
| **read mix, ~22k nodes** | `/api/kg/status` | **2.3** | **310** | **2,044** |
| | `/api/kg/search` | **2.7** | **311** | **1,235** |
| | MCP `kg_search` | **2.5** | **630** | **4,009** |
| | `/api/chat` (offline) | **2.3** | **374** | **3,525** |
| | `/graph` | **3.0** | **3,078** | **5,238** |

Server memory: 449 MB RSS at 22k nodes. No 5xx errors at any point; everything just got slow.

### After fixes (this PR)

| Phase | Endpoint | rps | p50 | p95 |
|---|---|---|---|---|
| read mix, ~170 nodes | `/api/kg/search` | 23 | 49 | 113 |
| | `/api/datasets/flywire-fafb/neurons` (139k scan) | 23 | 54 | 121 |
| | `/graph` | 24 | 521 | 679 |
| read + write mix | `/api/kg/search` | 26 | 33 | 73 |
| | `kg_add_node` / `agent_send` writes | 56 | 32 | 64 |
| bulk load 20k nodes | MCP batch of 50 | 45 | 146 | 485 |
| search right after bulk | `/api/kg/search` (serial) | | 6 | 680 (one full reindex) |
| **read mix, ~20.5k nodes** | `/api/kg/status` | **22** | **51** | **109** |
| | `/api/kg/search` | **23** | **49** | **113** |
| | MCP `kg_search` | **25** | **47** | **101** |
| | `/api/chat` (offline) | **21** | **54** | **131** |
| | `/graph` | **24** | **521** | **679** |

At 20k nodes reads are about **8-10x faster in throughput and 6-30x lower at p95** than before. Zero
errors across all phases. The first-phase numbers are lower than baseline because the read mix now
also includes the dataset endpoints that 404'd before (a 404 is cheap).

### Search quality at scale

Before, with 20k short nodes in the graph, "what should we build next and which starter dataset should
I use" returned synthetic test nodes and random FlyWire cell types as the top 5. After: the C. elegans
dataset, the contributor on-ramp, the dataset browser capability, T21 and MANC.

## What broke, and what was fixed

| # | Problem | Cause | Fix |
|---|---|---|---|
| 1 | Reads 10x+ slower at 20k nodes | Dense 2048-float vector per node; every query was a full dot product over every node (40M multiplies), and the index used 8 KB per node | Sparse vectors with an inverted index: a query only touches nodes that share a token (`src/lib/kg/vector.ts`) |
| 2 | Every write threw away the graph and the search index | `save()` bumps the version, and `graph()` rebuilt from the seed files on any version change | Writes are applied to the cached graph (`applyToCache`), and the index re-embeds only the nodes marked dirty; full reindex only when the graph grows by 25% |
| 3 | Bulk loads quadratic | `addNode` filtered the whole overlay on every add; `Graph.link` scanned every edge to dedupe; `save()` wrote the whole overlay to disk synchronously on every write | Overlay position index, edge key set, disk writes coalesced to one per 250 ms |
| 4 | Junk outranked real answers at scale | Hash collisions in 2048 dimensions, and character trigrams of boilerplate words ("status", "external") matched unrelated queries | One dimension per distinct token (no hashing); no trigrams for status and type words; query words never grow the vocabulary |
| 5 | `/graph` took 3-5 s with many nodes | It rendered every node of each board, and agents can add thousands of questions | Boards show 60 per column with a count of the rest |
| 6 | (Not a bug) neuron-level data in the KG | A whole-brain dataset is 10^5 neurons and 10^7 edges; the KG is the wrong store | Datasets live in their own files with their own indexes (`src/lib/datasets`); the KG holds one node per dataset |

## Still open

- **`/graph` is the slowest page** (about 15 ms alone, 350-520 ms p50 at 24 concurrent clients). It is
  server-rendered on every request; caching it for a few seconds would fix it.
- **One Node process.** Everything is in memory in one process. With Redis configured (PR #5) every
  request first calls `sync()`, which reads the whole runtime hash; at 20k runtime nodes that is a
  multi-MB read per request. Not measured here (no Redis in this container). Next step: sync by
  version number, not by full read.
- **Memory**: about 575 MB RSS with 20k runtime nodes plus all three datasets loaded (FlyWire alone
  is a 29 MB JSON file). Fine locally; on serverless it would need the dataset files in a database or
  as Parquet behind DuckDB.
- **FlyWire search** is a linear scan of 139k rows (about 50 ms). Fine for a browser; add a prefix
  index if agents call it in loops.
- **Chat with a model** was not stress tested: no API key in this environment, and the local-model
  option is in PR #6. The offline path (retrieval only) is what was measured.
- **The first search after a large bulk load** pays one full reindex (about 0.7 s at 20k nodes).
