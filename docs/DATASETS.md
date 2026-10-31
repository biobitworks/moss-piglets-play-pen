# Starter datasets, CoDA, and what is missing

Written 2026-10-31. Short version: **there is no public tardigrade connectome data yet**, so the Play
Pen loads the best real stand-ins we can get today and keeps the tardigrade slot shaped for Tardimap's
first export. Browse them at `/datasets`; agents use `ds_list`, `ds_summary`, `ds_search_neurons` and
`ds_neuron` (MCP at `/api/mcp`, REST at `/api/tools/<name>`, or `/api/datasets/...`).

## Loaded today

| Id | What | Size | How it gets here | Why it is a starter |
|---|---|---|---|---|
| `celegans-hermaphrodite` | *C. elegans* hermaphrodite connectome (Cook et al. 2019, via OpenWorm c302) | 448 cells (304 neurons plus muscles/end organs), 7,379 chemical and electrical connections with weights | Committed (`data/datasets/celegans-hermaphrodite/neurons.json`, 250 KB) | **Same scale as the tardigrade** (a few hundred neurons) and has real edges. Every analysis we want on Riker (partners, hubs, motifs, typing by connectivity) can be built and tested here first. |
| `flywire-fafb` | FlyWire whole-brain annotations (Schlegel et al. 2024; Dorkenwald et al. 2024) | 139,248 neurons, 8,847 cell types, super class / class / type / hemilineage / side / predicted neurotransmitter | `npm run data:fetch` (29 MB, gitignored) from `flyconnectome/flywire_annotations` | The reference for annotation at scale: the column set and vocabulary a tardigrade release should copy. |
| `hemibrain` | Hemibrain v1.2.1 neuron metadata, matched to FlyWire | 25,397 neurons with type, instance, cell body fiber, pre/post synapse counts | `npm run data:fetch` (3.5 MB, gitignored) | Two datasets typed against each other: the model for a cross-dataset link table. |
| `tardigrade-mock` | Seeded stand-in for Tardimap's Riker reconstruction | 568 neurons with region, class, side and pipeline stage; no synapses | Generated in code | Keeps pages and tools shaped for the real thing. Swapping in Tardimap's export is one loader. |

All datasets are normalised into one shape by `scripts/fetch-datasets.mjs`:
`{ id, fetchedAt, source, neurons: [{ id, name, type, class, super_class, side, nt, ... }], edges?: [[pre, post, weight, kind]] }`.
**This is the format to ask Tardimap for** (or anything that converts to it: CSV neurons + edge list,
Feather, a CATMAID or CAVE export).

## Found but not loadable from this environment (yet)

The container's network blocks Zenodo, Codex, neuPrint, NCBI and GEO. All are public; run the fetch
from a normal machine.

| Dataset | Where | What it adds |
|---|---|---|
| FlyWire connectivity (v783) | Codex downloads (codex.flywire.ai/api/download) and Zenodo 10676866 | The 16M-edge fly connectome; turns `flywire-fafb` into a real graph |
| MANC, MaleCNS, hemibrain connectivity | neuPrint (needs a free token) | VNC and whole-CNS edges for motor circuits |
| BANC | CAVE / Codex | Brain plus nerve cord in one animal: closest fly analogue to a whole tardigrade nervous system |
| *C. elegans* male, *Platynereis* larva, *Ciona* larva connectomes | OpenWorm, Jékely lab, Ryan et al. 2016 | More small whole-animal connectomes at tardigrade scale |
| *H. exemplaris* genome (Yoshida et al. 2017) | NCBI GCA_002082055 | Gene models for a tardigrade cell-type vocabulary |
| *H. exemplaris* bleomycin transcriptome | GEO [GSE168917](https://omicsdi.org/dataset/geo/GSE168917) | Bulk RNA-seq; not cell-resolved |
| Tardigrade nervous system patterning genes | Gross, Mayer et al. supplements ([UNF scholars](https://scholars.unf.edu/en/datasets/moesm1-of-analyses-of-nervous-system-patterning-genes-in-the-tard/)) | Anatomy and gene expression for naming regions |
| Tardimap Riker EM | tardimap.org | **The target. Not public.** No preview, API or contributor process yet. |

We did not find a public tardigrade single-cell RNA-seq atlas or any public tardigrade EM volume.

## CoDA as the model for a Tardimap version

[CoDA](https://coda.science/) is a browser-based node-graph editor for analysing public connectome
data. It reads from neuPrint (male CNS, hemibrain), CAVE (FlyWire, BANC, MICrONS) and CATMAID. You
build an analysis by wiring nodes (fetch neurons, filter, get partners, plot) instead of writing
Python. (We could only read its landing page metadata from here; the details of its node set are an
assumption to check.)

A Tardimap version of CoDA needs, in order:

1. **A data source CoDA already speaks.** Cheapest: Tardimap exports into CATMAID (<600 neurons is
   CATMAID's sweet spot, see `docs/TECH_STACK.md`), which CoDA reads today. Alternative: a static
   release in the fly data contract (neurons, connections, annotations tables) plus a small CoDA
   source adapter.
2. **A cell-type vocabulary.** CoDA's useful nodes filter by type and class. Tardigrade neurons have
   no agreed type names yet; the FlyWire table shows the columns to fill.
3. **Neuroglancer or 3D meshes** for the "look at it" nodes. Needs Tardimap's precomputed meshes.
4. **A link table to fly and worm** (`links/fly.csv`, `links/worm.csv`) for comparison nodes.
5. **Hosting**: CoDA runs in the browser; it needs CORS-enabled endpoints or files.

The Play Pen already does the agent-facing half of this: the same queries CoDA wires as nodes
(search neurons, get partners, summarise a dataset) are MCP tools here, so an LLM agent or a CoDA-like
UI can sit on the same layer.

## What we are missing for KG, RAG, chat and agent tools on real data

| Area | Have | Missing |
|---|---|---|
| Tardigrade data | Mock + C. elegans stand-in | **Any Tardimap export.** Even a partial, versioned neuron table and edge list (question `fcg:question/tardimap-preview`). |
| Fly connectivity | Annotations only | FlyWire / MANC edge tables (blocked here by network, not by licence). Then `ds_neuron` works for fly too. |
| Knowledge graph | Project graph (capabilities, tasks, tools, datasets) | Cell types as first-class nodes linked across datasets (FBbt for fly, WBbt for worm, a new vocabulary for tardigrade), and `analogOf` links between them. |
| RAG | Sparse TF-IDF over graph nodes; fast at 20k nodes | Text that is worth retrieving: paper abstracts (FlyWire, Cook 2019, tardigrade neuroanatomy), dataset READMEs, Tardimap docs. And real embeddings (hosted or local model) for paraphrase matching. |
| Chat | Retrieval-only offline answer; Claude path; local-model option in PR #6 | Chat should call the `ds_*` tools for data questions ("who are AVAL's top inputs?"). The tools are registered, so a model-backed chat can already use them; the offline answer cannot. |
| Agent tools | KG tools, agent bus, 4 dataset tools | Analysis tools: path finding, motif counts, connectivity clustering, NBLAST-like morphology (needs skeletons), and a "compare worm vs tardigrade" tool once data exists. Python workers (navis) behind MCP for anything heavier. |
| Scale | One Node process, in-memory | A real store for datasets (Parquet + DuckDB or Postgres) before loading 10^7 fly edges; version-based Redis sync. See `docs/STRESS_TEST.md`. |
