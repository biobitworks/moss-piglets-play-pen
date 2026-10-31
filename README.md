# Moss Piglet Play Pen

**An open on-ramp for finishing the tardigrade connectome, built on what the fly connectome community learned.**

"Moss piglet" is a common name for tardigrades. [Tardimap](https://tardimap.org/) is mapping every neuron and synapse in the tardigrade *Hypsibius exemplaris*. The fly connectome ([flyconnecto.me](https://flyconnecto.me/), FlyWire and related datasets) was finished because hundreds of people, from lab scientists to citizen scientists, could step in, proofread neurons, and share annotations through open tools.

This project connects the two. It brings the fly connectome's tools, workflows and community model to Tardimap, so that **anyone can step in and help finish the tardigrade connectome**, and it gives people a place to practice and compare against the fly while they do.

> **Status:** MVP web app on mock data (Next.js, deployed on Vercel), now with an **agent connector**: a knowledge graph of what is built and what is needed, vector search, MCP and REST tools for agents, agent-to-agent messaging and a Claude-backed chat. See [`docs/AGENT_CONNECTOR.md`](docs/AGENT_CONNECTOR.md) for the design and roadmap, [`docs/TASK_PLAN.md`](docs/TASK_PLAN.md) for the build plan, [`docs/REQUIREMENTS.md`](docs/REQUIREMENTS.md) for the goals and open questions, and [`docs/DEPLOY.md`](docs/DEPLOY.md) for hosting.

## Why tardigrades, why now

| | Tardimap (tardigrade) | Fly Connectome (*Drosophila*) |
|---|---|---|
| Neurons | Fewer than ~600, whole body | ~140k (FlyWire brain) to ~166k (MaleCNS whole CNS) |
| Imaging | FIB-SEM / serial-section EM ("Riker" dataset), complete | ssTEM and FIB-SEM, complete |
| Reconstruction | In progress | Finished and proofread across six public datasets |
| How it got done | To be decided | Open, community proofreading with shared tools (CAVE, Neuroglancer, Codex, neuPrint) |
| Public data | Not yet (contact@tardimap.org) | Yes (Codex, neuPrint) |

A whole-animal nervous system of under 600 neurons is small enough that a motivated community could finish it. The fly shows that the hard part is less the imaging than the proofreading and annotation, and that open tools plus a low barrier to entry are what let many people help.

## What the Play Pen will do

1. **Show the state of the tardigrade connectome:** which neurons are reconstructed, proofread, typed and named, and what is left.
2. **Turn what's left into tasks anyone can pick up:** small, well-defined proofreading and annotation jobs with clear instructions.
3. **Train newcomers on finished fly data first:** practice tasks with known answers drawn from FlyWire, so people learn before they touch tardigrade data.
4. **Reuse the fly ecosystem instead of rebuilding it:** CAVE, Neuroglancer, navis and the natverse wherever they fit Tardimap's pipeline.
5. **Credit every contributor,** the way FlyWire credits proofreaders and annotators.
6. **Later, compare the two animals:** link tardigrade neurons to candidate fly counterparts and compare circuits, using comparative tools such as cocoa or coconat.

Details, priorities and acceptance criteria are in [`docs/REQUIREMENTS.md`](docs/REQUIREMENTS.md).

## The proposed next step

Tardimap's imaging is done, but its data and reconstruction pipeline aren't public yet. So the first step is to **talk to the Tardimap consortium** and find out:

- what tools they use for segmentation and proofreading, and whether those are CAVE and Neuroglancer compatible;
- whether they want outside contributors, and on what terms (data access, licensing, credit);
- which part of the work is the bottleneck today.

In parallel, the Play Pen can be built against public fly data: the training tasks, the progress view and the contributor flow. It then plugs into Tardimap once access is agreed. The full plan is in section 7 of the requirements doc.

## Sources and tools

**Tardimap**
- https://tardimap.org/ (Tardigrade Connectome Consortium, open science, *H. exemplaris*, "Riker" dataset)

**Fly Connectome**
- Drosophila Connectomics Group, Cambridge: https://flyconnecto.me/
- Dataset guide: [The adult Drosophila connectome ecosystem](https://flyconnecto.me/2026/09/04/the-adult-drosophila-connectome-ecosystem/)
- Data portals: [FlyWire Codex](https://codex.flywire.ai/) (FAFB, BANC) and [neuPrint](https://neuprint.janelia.org/) (hemibrain, MANC, MaleCNS)
- Infrastructure: [CAVEclient](https://github.com/seung-lab/CAVEclient) and [Neuroglancer](https://github.com/google/neuroglancer)
- Analysis: [navis](https://github.com/navis-org/navis), [fafbseg-py](https://github.com/navis-org/fafbseg-py), the [natverse](https://natverse.org/), [cocoa](https://github.com/flyconnectome/cocoa), [coconat](https://natverse.org/coconat/) and [Coda](https://coda.science/). More are listed at https://flyconnecto.me/tools/.
- **Which of these we'd adopt for Tardimap, and in what order:** [`docs/TECH_STACK.md`](docs/TECH_STACK.md).

## Getting started

The MVP is a Next.js app with five pages: progress dashboard, training, task board, roadmap and contributors. Tardimap data isn't public yet, so it runs on a mock tardigrade dataset behind an adapter (`src/lib/data/`).

```bash
npm install
npm run dev        # http://localhost:3000
npm run build      # production build, the same one Vercel runs
```

- **Swap the data source:** write an adapter that returns a `Dataset` (see `src/lib/data/types.ts`), register it in `src/lib/data/index.ts`, and set `PLAYPEN_DATA_SOURCE` to its id.
- **JSON endpoints:** `/api/progress` and `/api/tasks`.
- **Per-browser state:** the contributor handle, passed training and claimed tasks live in `localStorage` for now.
- **Deploying:** see [`docs/DEPLOY.md`](docs/DEPLOY.md).

## Agent connector and knowledge graph

The fly connectome is the worked example; the tardigrade is the work in progress. The Play Pen keeps both in one
knowledge graph, so people and AI agents can see what exists, what has been built and what still needs building.

- **Graph:** `data/kg/fco.json` (vocabulary: node and edge types, statuses) and `data/kg/fcg.json` (the graph:
  fly datasets and tools, tardigrade pipeline stages, capabilities, tasks, questions). Every node has an address
  `fcg:<type>/<slug>`, e.g. `fcg:tool/navis`, and a page at `/node/tool/navis`.
- **Existing R and Python packages** (navis, fafbseg, neuprint-python, CAVEclient, natverse, nat.nblast, …) are
  tool nodes with install commands, docs and how well they fit tardigrade data.
- **Pages:** `/graph` (built vs needed), `/chat`, `/agents`, `/worklog` (proof of work).
- **For agents:** MCP at `/api/mcp` (`claude mcp add --transport http playpen http://localhost:3000/api/mcp`), REST
  at `/api/tools/<name>`, the graph at `/api/kg`, search at `/api/kg/search?q=`, and messaging at `/api/connect`
  (one-to-one, one-to-many, or many-to-many by topic).
- **Chat, frontier or local:** the chat page has a model picker.
  - *Frontier:* set `ANTHROPIC_API_KEY` to answer with Claude (`claude-opus-5-5`) using the graph tools.
  - *Local:* run any OpenAI-compatible server, e.g. [Ollama](https://ollama.com): `ollama pull llama3.1:8b && ollama serve`.
    The Play Pen finds it at `http://localhost:11434/v1` by default (`PLAYPEN_LOCAL_URL`, `PLAYPEN_LOCAL_MODEL`,
    `PLAYPEN_LOCAL_API_KEY` for LM Studio, llama.cpp or vLLM). Models that support tool calling use the graph tools;
    others answer from the retrieved graph context.
  - *Neither:* the chat returns the graph search results. `PLAYPEN_CHAT_BACKEND` sets the default; `GET /api/chat`
    lists which backends are available.
- **Proof of work:** `npm run log -- T05 built "what was done"` records the time and the commit against a task;
  `npm run kg:sync` pulls commits and merges from git (also runs before every build).

## Install the connectors (CLI, Python, R, MCP, RAG)

Everything below talks to a running Play Pen (`npm run dev`, or any deployed copy) at `PLAYPEN_URL`
(default `http://localhost:3000`). None of it needs an API key: `ask` retrieves from the graph and answers with
a local model through Ollama (`PLAYPEN_LOCAL_URL`, `PLAYPEN_LOCAL_MODEL`), and answers from the graph alone if no
model is running. A frontier model plugs in later (`--llm anthropic` or `--llm openai` with a key). Full guide:
[docs/CONNECTORS.md](docs/CONNECTORS.md).

| What | Install | Try it |
|------|---------|--------|
| Python package + `playpen` CLI + `playpen-mcp` | `pip install "git+https://github.com/biobitworks/moss-piglets-play-pen#subdirectory=packages/python"` | `playpen status`, `playpen ask "what still needs building?"` |
| Node CLI + `playpen-mcp` (no dependencies) | `git clone` this repo, then `npm install -g ./packages/cli` | `playpen search synapse detection` |
| R package | `remotes::install_github("biobitworks/moss-piglets-play-pen", subdir = "packages/r")` | `library(playpen); pp_search("navis")` |
| MCP server for Claude Code, Claude Desktop, Cursor | either package above | `claude mcp add playpen -- playpen-mcp --model qwen2.5-coder:7b` |
| RAG connector | in all three: `playpen ask`, `playpen.RAG`, `pp_ask()`, MCP tool `rag_ask` | `playpen ask "which tool reads FlyWire?" --model qwen2.5-coder:7b` |

## Contributing

The point of this project is that anyone can contribute. A `CONTRIBUTING.md` will follow once the first tasks exist. For now, comments on the requirements doc are the most useful contribution.

## Citing the data

Cite every upstream dataset you use. FlyWire and the other fly datasets publish their citation requirements, and these are linked from the dataset guide above. Tardimap's citation will be added when the consortium publishes it.

## Links

- Project page: https://app.strangerbuilds.com/p/moss-piglet-play-pen
- Tardimap: https://tardimap.org/
- Fly Connectome: https://flyconnecto.me/

## License

Not chosen yet (see the open questions). Data from each source stays under that source's own terms.
