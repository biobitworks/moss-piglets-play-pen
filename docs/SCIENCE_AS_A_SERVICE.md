# Science as a Service: how the Play Pen plugs in

The Moss Piglet Play Pen is one module of **Cellico Science-as-a-Service**, the research portfolio at
[cellico.bio](https://cellico.bio) (source: `biobitworks/bioviz-tech`, routes under `app/cellico`).
Science-as-a-Service means making scientific information addressable: every source, task, dataset and
result gets a stable address, a license context and a record of how it was produced, so people and agents
can build on it.

## Where it appears

| Cellico surface | What it shows |
|---|---|
| `/cellico` research portfolio | A card, "Moss Piglet Play Pen · Tardigrade connectome", next to the knot MVP, virtual cells and BaeBugs |
| `/cellico/research/moss-piglet-play-pen` | The module page: what the service does, its six interfaces, the 0D→M loop, rights and source boundaries, links back here |
| `/cellico/model-cards/moss-piglet-play-pen-service-v01.json` | A candidate service card (status `CANDIDATE_NOT_ADMITTED`) listing interfaces, data, KG and custody status |

## The service interfaces

All of them read the same FCO/FCG knowledge graph (`data/kg/`), so a change made through one is visible through the others.

| Interface | Entry point | Docs |
|---|---|---|
| Web app | https://moss-piglets-play-pen.vercel.app (`/progress`, `/train`, `/tasks`, `/datasets`, `/graph`, `/chat`, `/agents`, `/worklog`, `/demo`) | [README](../README.md) |
| MCP (HTTP) | `POST /api/mcp` | [AGENT_CONNECTOR.md](AGENT_CONNECTOR.md) |
| MCP (stdio) | `playpen-mcp` from the Python or Node package | [CONNECTORS.md](CONNECTORS.md) |
| REST | `/api/kg`, `/api/kg/search`, `/api/kg/status`, `/api/kg/worklog`, `/api/tools/<name>`, `/api/connect`, `/api/chat`, `/api/progress`, `/api/tasks` | [AGENT_CONNECTOR.md](AGENT_CONNECTOR.md) |
| Python, Node, R | `playpen-connector` (Python, Node) and the R `playpen` package | [CONNECTORS.md](CONNECTORS.md) |
| Datasets | C. elegans stand-in, FlyWire and hemibrain annotations behind one adapter | [DATASETS.md](DATASETS.md) |

No API key is needed for any of them. Chat uses a local model when one is reachable and otherwise answers from the graph.

## Boundaries the Cellico page keeps

- **Tardigrade data** is not public yet (Tardimap, Riker dataset). Tardigrade views run on mock data.
- **Fly and worm data** keep their own source licenses and citation requirements; they are linked or summarised, never relicensed.
- **Play Pen code and docs** use the license and acknowledgments declared in this repository. The Cellico page points here instead of restating them, so they only need updating in one place.
- **Custody:** worklog entries are tied to git commits but unsigned. The Play Pen graph and Cellico's SeedGraph/FCO records are not yet joined by verified roots, so cross-graph links are `NOT_ESTABLISHED`.

## Keeping the two in step

When an interface, route or dataset here changes, update the module page and service card in `bioviz-tech`
(`app/cellico/research/moss-piglet-play-pen/page.tsx` and `public/cellico/model-cards/moss-piglet-play-pen-service-v01.json`).
The contract test `tests/cellico-moss-piglet-play-pen.test.ts` there checks that the card stays listed and that the boundaries stay visible.

## Next steps

1. Export a Play Pen graph snapshot with a root hash so Cellico can reference an exact version (turns `NOT_ESTABLISHED` into a checkable link).
2. Register the Play Pen MCP endpoint in Cellico's service list once that list exists as data rather than page copy.
3. Replace the mock tardigrade dataset with Tardimap data when the consortium agrees access.
