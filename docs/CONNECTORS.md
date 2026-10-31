# Connectors: CLI, Python, R, MCP and RAG

Three installable packages give people and agents the same access to the Play Pen knowledge graph that the
website and `/api/mcp` have. All three are thin clients of the Play Pen HTTP API, so they work against a laptop
(`npm run dev`), a lab server, or a deployed copy, and they stay in step with the graph as it grows.

| Package | Folder | Installs | Dependencies |
|---------|--------|----------|--------------|
| Python `playpen-connector` | `packages/python` | `playpen`, `playpen-mcp`, `import playpen` | none (standard library) |
| Node `playpen-connector` | `packages/cli` | `playpen`, `playpen-mcp`, `import "playpen-connector"` | none (Node 18+) |
| R `playpen` | `packages/r` | `pp_*()` functions | `curl`, `jsonlite` |

## 1. Start (or point at) a Play Pen server

```bash
npm install && npm run dev          # http://localhost:3000
export PLAYPEN_URL=http://localhost:3000
```

## 2. Install

```bash
# Python (CLI + MCP server + RAG + library)
pip install "git+https://github.com/biobitworks/moss-piglets-play-pen#subdirectory=packages/python"
# or without installing anything permanently:
uvx --from "git+https://github.com/biobitworks/moss-piglets-play-pen#subdirectory=packages/python" playpen status

# Node (from a clone; once published to npm: npx playpen-connector)
npm install -g ./packages/cli
```

```r
install.packages("remotes")
remotes::install_github("biobitworks/moss-piglets-play-pen", subdir = "packages/r")
```

## 3. Use

```bash
playpen ping                                   # is the server reachable?
playpen status                                 # built / needed / blocked
playpen search trace neurons in EM -k 5        # vector search, returns fcg: addresses
playpen node fcg:tool/navis                    # one node and its links
playpen worklog                                # timestamped proof of work
playpen tools                                  # every tool the server offers
playpen call kg_list type=tool status=external # call any tool directly
playpen register my-agent --capability tracing --topic tardigrade
playpen send my-agent "tracing batch 3 done" --topic tardigrade   # 1:1 --to a, 1:many --to a --to b
playpen inbox --topic tardigrade
playpen chat "what is blocked?"                # the server's own chat
playpen ask "what still needs building?"       # client-side RAG (below)
```

Add `--json` before the command for raw JSON. The Node and Python CLIs take the same commands.

```python
from playpen import PlayPen, RAG, OpenAICompatible
pp = PlayPen("http://localhost:3000")
pp.search("synapse detection", k=5)
pp.send("my-agent", "hello", to=["curator", "tracer"])
RAG(pp, OpenAICompatible(model="qwen2.5-coder:7b")).ask("Which tool reads FlyWire?")
```

```r
library(playpen)
pp_connect("http://localhost:3000")
pp_search("synapse detection")           # data frame
pp_status()$needed
pp_ask("Which tool reads FlyWire?", llm = pp_local_llm("qwen2.5-coder:7b"))
```

## 4. MCP server (stdio)

`playpen-mcp` proxies every Play Pen tool (`kg_search`, `kg_get_node`, `kg_status`, `agent_send`, ...) and adds
`rag_ask`, which answers with your local model.

```bash
claude mcp add playpen -- playpen-mcp --url http://localhost:3000 --model qwen2.5-coder:7b
```

Claude Desktop or Cursor (`mcpServers` in their config):

```json
{ "playpen": { "command": "playpen-mcp", "args": ["--url", "http://localhost:3000"] } }
```

Without installing: `"command": "uvx", "args": ["--from", "git+https://github.com/biobitworks/moss-piglets-play-pen#subdirectory=packages/python", "playpen-mcp"]`.
An MCP client that speaks HTTP can also use the server directly: `claude mcp add --transport http playpen http://localhost:3000/api/mcp`.

## 5. RAG connector

`ask` / `RAG.ask()` / `pp_ask()` / `rag_ask`:

1. **Retrieve:** vector search over the graph (`kg_search`), then the top nodes are expanded with their links
   (`kg_get_node`), so the model sees each tool's install command, the stage it serves, and what it is blocked on.
   Python can re-rank with real embeddings: `--embed-model nomic-embed-text`.
2. **Generate** with the model you pick:

| `--llm` | Model | Key needed |
|---------|-------|------------|
| `local` (default) | Any OpenAI-compatible server; Ollama at `http://localhost:11434/v1` unless `PLAYPEN_LOCAL_URL` / `--llm-url` | no |
| `search` | None: lists the matching nodes | no |
| `anthropic` | Claude (`PLAYPEN_CLAUDE_MODEL`) | `ANTHROPIC_API_KEY` |
| `openai` | Any hosted OpenAI-compatible API (`--llm-url`) | `OPENAI_API_KEY` |

If the chosen model can't be reached, the answer comes from the graph alone and says so. It never switches to
a different model on its own. In code you can pass any function `(messages) -> text` as the model.

## Environment variables

| Variable | Default | Used by |
|----------|---------|---------|
| `PLAYPEN_URL` | `http://localhost:3000` | all clients |
| `PLAYPEN_LOCAL_URL` | `http://localhost:11434/v1` | RAG (local) |
| `PLAYPEN_LOCAL_MODEL` | `llama3.1:8b` | RAG (local) |
| `PLAYPEN_LOCAL_API_KEY` | unset | RAG (local servers that need one) |
| `PLAYPEN_EMBED_MODEL` | unset | Python RAG re-ranking |

## Tests

```bash
cd packages/python && pip install -e '.[test]' && pytest        # fake server, no network
cd packages/cli && npm test                                     # fake server, no network
cd packages/r && Rscript -e 'testthat::test_local()'            # live tests run if PLAYPEN_URL is up
```

`.github/workflows/connectors.yml` runs all three, the R and live checks against a real `npm run dev` server.
