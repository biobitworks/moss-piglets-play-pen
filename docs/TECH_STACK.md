# Tech Stack: What the Fly Connectome Uses, and What Tardimap Should Adopt

**Status:** Draft v0.1 for review (2026-10-31)
**Owner:** Byron
**Answers:** OQ-4 (CAVE and Neuroglancer for Tardimap?) and OQ-8 (stack and hosting) in [`REQUIREMENTS.md`](REQUIREMENTS.md), as far as they can be answered before we hear back from Tardimap (Step 0).

This review covers the tools on [flyconnecto.me/tools](https://flyconnecto.me/tools/) and in the [adult *Drosophila* connectome ecosystem guide](https://flyconnecto.me/2026/09/04/the-adult-drosophila-connectome-ecosystem/), plus the infrastructure behind them that those pages assume (CAVE, Neuroglancer, neuPrint, Codex), and [Virtual Fly Brain](https://virtualflybrain.org/) as the model for linking connectomes to other data such as scRNAseq (§4b). It asks three questions: what each tool does and what data it reads, how the fly datasets connect to one another, and which pieces we should adopt, adapt or skip for a tardigrade connectome of fewer than 600 neurons.

> **The short version.** Adopt the fly ecosystem's *data contract* now: Neuroglancer precomputed volumes, versioned tables of neurons, synapses and annotations, and navis-readable skeletons. Build the Play Pen on that contract, Codex style, as static versioned releases. Give every neuron a cell-type ID from a small tardigrade vocabulary, so expression data and fly links can join on it the way Virtual Fly Brain does. Don't stand up a full CAVE deployment until Tardimap tells us what proofreading engine they already use. At under 600 neurons, a lighter engine (CATMAID, or a minimal CAVE) may be the better fit, and the contract keeps either option open.

---

## 1. How the fly stack fits together

Every fly dataset goes through the same layers, even though different groups run different software at each one.

```
 ┌──────────────────────────────────────────────────────────────────────────────┐
 │ 6. Comparison across datasets   cocoa / coconat(fly), NBLAST + transforms,   │
 │                                 bigclust, shared cell-type names             │
 ├──────────────────────────────────────────────────────────────────────────────┤
 │ 5. Analysis                     navis (Py), natverse (R), Coda (browser),    │
 │                                 connecto, per-dataset packages               │
 ├──────────────────────────────────────────────────────────────────────────────┤
 │ 4. Release and browsing         Codex (FlyWire, BANC)   neuPrint (Janelia)   │
 │                                 static CSV/Feather dumps   Neo4j + Cypher    │
 ├──────────────────────────────────────────────────────────────────────────────┤
 │ 3. Annotation and versioning    CAVE: AnnotationEngine + Materialization     │
 │                                 (Janelia: DVID key-value store)              │
 ├──────────────────────────────────────────────────────────────────────────────┤
 │ 2. Proofreading                 FlyWire Neuroglancer + PyChunkedGraph        │
 │                                 (Janelia: NeuTu/neu3; older: CATMAID)        │
 ├──────────────────────────────────────────────────────────────────────────────┤
 │ 1. Images and segmentation      EM volumes in Neuroglancer precomputed,      │
 │                                 automated segmentation and synapse detection │
 └──────────────────────────────────────────────────────────────────────────────┘
```

There are two families:

- **The CAVE family** (FAFB/FlyWire, BANC, FANC) runs live, editable segmentation in PyChunkedGraph. Annotations are stored as points that are re-linked to the current neuron IDs at each "materialization", and data is released through Codex and CAVEclient.
- **The Janelia FlyEM family** (hemibrain, MANC, MaleCNS) proofreads in-house in DVID and NeuTu, then publishes frozen versions to neuPrint, a Neo4j graph database.

Both families end up in the same places: Neuroglancer for viewing, navis and the natverse for analysis, and Coda for no-code analysis. That shared ending is why one person can analyze all six datasets with the same code. **It's the part worth copying most.**

## 2. Datasets and how they're served

| Dataset | Imaging | Coverage | Neurons | Proofreading and versioning | Release / API | Viewer | Dataset package |
|---|---|---|---|---|---|---|---|
| Hemibrain | FIB-SEM 8 nm iso | ~1/3 central brain, female | ~25k | DVID / NeuTu (Janelia) | neuPrint `hemibrain:v1.2.1` | Neuroglancer | hemibrainr, connecto |
| FAFB / FlyWire | ssTEM 4×4×40 nm | Whole brain, female | ~140k | CAVE (PyChunkedGraph), community proofreading | Codex `fafb`, CAVEclient | FlyWire Neuroglancer | fafbseg (R), fafbseg-py |
| FANC | ssTEM | VNC, female | ~14.6k | CAVE, community | CAVEclient ([FANC_auto_recon](https://github.com/htem/FANC_auto_recon/wiki#collaborative-community)) | Spelunker (CAVE Neuroglancer) | fancr |
| MANC | FIB-SEM 8 nm iso | VNC, male | ~15.8k | DVID / NeuTu | neuPrint `manc:v1.2.3` | Neuroglancer | malevnc |
| MaleCNS | FIB-SEM 8 nm iso | Whole CNS, male | ~166k | DVID / NeuTu | neuPrint `male-cns:v1.0` | Neuroglancer | malecns |
| BANC | ssTEM 4×4×45 nm | Whole CNS with intact neck, female | ~142k | CAVE, community | Codex `banc`, CAVEclient | Spelunker | bancr |

Coda reads hemibrain, MANC, MaleCNS, FlyWire and BANC. connecto covers all six from Python.

**Lessons for Tardimap**

- **Every release has a version label** (`v1.2.1`, materialization `783`, and so on), and every paper cites one. Our progress view needs the same (requirement P-3).
- **Each dataset has a small, dedicated client package** (fafbseg, malevnc, bancr) that sits on top of a shared core (navis or nat). A `tardimapr` / `tardimap-py` adapter is the natural equivalent, and it's what requirement E-4 asks for.
- **Access is token-gated but free.** neuPrint uses an account token and CAVE uses a CAVEclient token. Codex also offers anonymous static downloads, and that's the lowest-friction route for newcomers.

## 3. The tools, one by one

### 3a. Infrastructure (assumed by the tools page rather than listed on it)

| Tool | Role | Data format / storage | API | Tardimap verdict |
|---|---|---|---|---|
| **Neuroglancer** ([google/neuroglancer](https://github.com/google/neuroglancer)) | WebGL viewer for EM, segmentation, meshes, skeletons and annotations. The whole view state is a JSON object that can be shared as a URL. | Reads *precomputed* (chunked images, segmentation, multi-resolution meshes, skeletons, annotations), Zarr and N5, from GCS, S3 or plain HTTP. | URL-encoded JSON state; Python `neuroglancer` package. | **Adopt.** Static hosting works, it's the common viewer across both families, and it's the obvious "open this task" target (T-2). |
| **CAVE** (Connectome Annotation Versioning Engine) | The backend behind FlyWire, BANC and FANC. Its parts are listed in the next four rows. | Kubernetes services on Google Cloud: BigTable for the graph, Postgres/PostGIS for annotations. | REST, wrapped by CAVEclient. | **Adapt or defer.** It gives you everything, but it's heavy to run (see §5). |
| ↳ **PyChunkedGraph** | Live, editable segmentation. Merges and splits are edits to a supervoxel graph, so many people can proofread at once with full edit history. An edit gives the neuron a new root ID. | Supervoxel graph in Google BigTable. | `client.chunkedgraph.*` (roots, edit history, lineage). | Defer. It earns its cost at 100k neurons and many simultaneous editors. |
| ↳ **AnnotationEngine** | Tables of point annotations: synapses, cell types, nucleus positions, proofreading status. Points are stable even when root IDs change. | Postgres/PostGIS. | `client.annotation.*`. | **Adopt the idea.** Store annotations as points in space, not as neuron IDs. |
| ↳ **Materialization engine** | Freezes annotation tables joined to the root IDs of a given moment into numbered versions, which are what gets released and cited. | Postgres snapshots. | `client.materialize.query_table`, `live_query`. | **Adopt the idea:** numbered, frozen releases. |
| ↳ **CAVEclient** ([seung-lab/CAVEclient](https://github.com/seung-lab/CAVEclient)) | Python client for all of CAVE, with token auth. | pandas DataFrames. | Python. | Use for FlyWire training data now (E-1). Use for Tardimap only if they run CAVE. |
| **cloud-volume / igneous / kimimaro** (Seung lab) | Write and transform precomputed volumes, and make meshes and skeletons at scale. | Precomputed. | Python / CLI. | **Adopt** for turning Tardimap volumes into precomputed. |
| **neuPrint** ([neuprint.janelia.org](https://neuprint.janelia.org/)) | Janelia's release database: neurons, synapse sets, ROIs and `ConnectsTo` edges as a graph. | Neo4j. | Cypher over HTTP; `neuprint-python`, `neuprintr`. | **Optional, later.** A graph database is overkill for 600 nodes, but neuPrint compatibility would make Tardimap visible to every neuPrint-aware tool, Coda included. |
| **Codex** ([codex.flywire.ai](https://codex.flywire.ai/)) | FlyWire/BANC browser: search, cell-type pages, connectivity, and *bulk static downloads* per materialization. | CSV / Feather files per version. | Web UI and file downloads (the FAQ asks for downloads instead of heavy live queries). | **Copy the pattern.** Our MVP should be "Codex for a 600-neuron animal": static, versioned files and a friendly browser. |
| **DVID + NeuTu/neu3** (Janelia) | Versioned volume store and desktop proofreading tools used for hemibrain, MANC and MaleCNS. | DVID key-value store. | DVID HTTP API. | Skip. It's built for a central, trained team, not an open community. |
| **CATMAID** | Browser-based collaborative tracing: manual skeletons and synapse ("connector") annotation on tiled image stacks. Used for early FAFB tracing and the hosted VFB data, and for small whole-animal connectomes elsewhere. | Django + PostgreSQL; image tiles. | REST; `pymaid`, `rcatmaid`. | **Strong candidate if Tardimap traces by hand.** It's light, proven and multi-user, and navis reads it. |

### 3b. General (from the tools page)

| Tool | Role | Reads | Tardimap verdict |
|---|---|---|---|
| **Coda** ([coda.science](https://coda.science/), [navis-org/coda](https://github.com/navis-org/coda)) | Browser node editor: find neurons, fetch connectivity, NBLAST, graph and path analysis, 3D views. Exports workflows as Python or R notebooks, includes an AI workflow assistant, and shares by link. | neuPrint, CAVE, CATMAID | **Integrate, don't rebuild.** If Tardimap data is served through any of those three backends, Coda works on it for free. That's a strong argument for choosing one of them (§5). It's also a great "level 2" activity for contributors. |

### 3c. R: the natverse

| Tool | Role | Data / API | Tardimap verdict |
|---|---|---|---|
| **nat** | Core neuron anatomy: read, transform, plot. | SWC, NRRD, meshes, `neuronlist`. | Works on any skeleton or mesh. Support it through file formats. |
| **nat.nblast** | NBLAST morphology similarity (Costa et al. 2016). | Dotprops in a shared space. | **Adopt within tardigrade** (left/right pairs, matching across specimens). Not across species (§4). |
| **rcatmaid** | CATMAID client. | CATMAID REST. | Free if CATMAID is used. |
| **neuprintr** | neuPrint client. | Cypher / HTTP. | Free if neuPrint is used. |
| **nat.flybrains, nat.templatebrains, elmr** | Bridging registrations between fly template brains and datasets. | Transform files (CMTK, affine, thin-plate spline). | **Copy the pattern** with a tardigrade template once there's more than one specimen. |
| **fafbseg** | FAFB/FlyWire access: segmentation, CAVE, annotations. | CAVE, precomputed. | Model for a `tardimapr` package. |
| **coconat / coconatfly** | Comparative connectomics. coconat is the general engine; coconatfly plugs in the fly datasets. | Per-dataset adapters that return connectivity and cell-type tables. | **Adapt.** Write a tardigrade adapter so tardigrade sits next to fly datasets (G6). |

### 3d. Python: navis and friends

| Tool | Role | Data / API | Tardimap verdict |
|---|---|---|---|
| **navis** ([navis-org/navis](https://github.com/navis-org/navis)) | General neuron analysis: TreeNeuron, MeshNeuron, Dotprops, NBLAST, transforms, plotting, bridges to NEURON, Blender and R. | SWC, NRRD, meshes, precomputed; CATMAID, neuPrint and CAVE through companion packages. | **Adopt as the core Python library** for Tardimap analysis and for the Play Pen's data pipeline (E-3). |
| **pymaid** | CATMAID client. | CATMAID REST. | Free if CATMAID is used. |
| **flybrains** | Fly template brains and bridging transforms for navis. | Transform registry. | Copy the pattern later. |
| **fafbseg-py** | FlyWire access: CAVE, segmentation, synapses, annotations, Codex-like helpers. | CAVEclient, precomputed. | **Use now** to pull FlyWire training tasks (T-3). It's also the model for `tardimap-py`. |
| **cocoa** ([flyconnectome/cocoa](https://github.com/flyconnectome/cocoa)) | Comparative connectomics in Python: co-clusters neurons from several datasets by connectivity, which is how cell types were matched between FlyWire and hemibrain. | Dataset classes returning connectivity and labels. | **Adapt** with a `TardimapDataset` class (G6, C-3). |
| **bigclust** | GUI for exploring and annotating very large hierarchical clusterings. | Clustering and distance matrices. | Useful for cell typing. At 600 neurons a simpler view will do, but the "annotate a cluster" interaction is worth copying. |
| **skeletor** | Turns meshes into skeletons. | Meshes in, skeletons out. | **Adopt** if Tardimap produces meshes from a voxel segmentation. |
| **connecto** ([schlegelp.github.io/connecto](https://schlegelp.github.io/connecto/)) | One Python interface to all six fly datasets (from the dataset guide). | Dataset back ends. | Watch it. A tardigrade back end would be the most direct way to put Tardimap into everyday fly workflows. |

## 4. "Higher network" connections: how datasets link to each other

The fly community links datasets at four levels. Each one tells us something different about tardigrade.

| Level | How it works in fly | Tools | Works fly↔tardigrade? | Works tardigrade↔tardigrade? |
|---|---|---|---|---|
| **1. Space** | Register each dataset to a template brain, then move neurons between spaces with bridging transforms. | nat.templatebrains, flybrains, elmr | **No.** There's no shared anatomical space between a fly and a tardigrade. | Yes, once there's a second specimen, or for mirroring left and right. |
| **2. Morphology** | NBLAST in a shared space finds the same neuron in different datasets. | nat.nblast, navis | No, it depends on level 1. | **Yes.** Left/right pairs, repeated segments, specimen to specimen. |
| **3. Connectivity** | Co-cluster neurons from several datasets by who they connect to, using already-matched partners as anchors. This is how FlyWire and hemibrain types were matched. | cocoa, coconat/coconatfly, bigclust | **Only coarsely.** There are no shared anchors, so it only works at the level of cell class (sensory, motor, interneuron) and network statistics. | Yes. |
| **4. Names and types** | A shared cell-type vocabulary and annotation tables across datasets (FlyWire, hemibrain, MANC and BANC names cross-referenced). | CAVE annotation tables, neuPrint properties, Codex | **By hand.** A curated link table with link type, confidence, evidence and author, which is requirement C-1. | Yes. |

**What this means for the Play Pen:**

- Within tardigrade, levels 1 to 4 all apply and can reuse fly tools almost unchanged.
- Between fly and tardigrade, only **level 4 (a curated link table)** and **coarse level 3 (graph statistics and motifs, C-2)** are honest. That's why REQUIREMENTS says "don't claim homology automatically", and the stack shouldn't pretend otherwise.
- The cheapest way to make Tardimap a first-class "dataset" next to the six fly ones is a **dataset adapter** for cocoa (Python) and coconat (R) that returns the same connectivity and annotation tables the fly adapters return. Then the same comparison code runs on both animals.

## 4b. Linking connectome data to other data: the Virtual Fly Brain model

Section 4 is about linking one connectome to another. [Virtual Fly Brain](https://virtualflybrain.org/) (VFB) goes a level higher. It links the connectomes to **other kinds of data**, such as single-cell transcriptomics, light-microscopy images and genetic driver lines, by hanging everything on one shared vocabulary of cell types. This is the model for a Tardimap that is more than a wiring diagram.

### How VFB does it

| Piece | What it does | Technology |
|---|---|---|
| **The hub: Drosophila Anatomy Ontology (FBbt)** | Every cell type and brain region has a stable ID (for example `FBbt_00003624` for the adult brain), with `is_a` and `part_of` relations. Every dataset maps its items to these IDs. | OWL ontology, maintained with FlyBase. |
| **Connectomes** | Eight EM datasets (BANC v888, FlyWire v783, male-CNS v1.0, MANC v1.2.1, optic lobe v1.0.1, hemibrain v1.2.1, FAFB and L1 larva via CATMAID) sit in one knowledge graph. Both ends of every edge are classified to FBbt, so "inputs to cell type X" runs across all of them. Overlapping datasets are excluded by default to avoid double counting, and unmapped neurons stay queryable on their own. ([Connectivity](https://virtualflybrain.org/docs/data/connectivity/)) | Neo4j knowledge graph. |
| **scRNAseq** | 24 published datasets (Fly Cell Atlas, Aging Fly Cell Atlas, Davie 2018, Ozel 2021, Allen 2020 VNC, and others) from embryo to aged adult, with about 15.5k genes. **Each cluster is annotated with an FBbt cell-type term.** VFB doesn't sequence anything; it curates the cluster-to-cell-type link. Genes are kept only where at least 20% of a cluster's cells express them. ([scRNAseq](https://virtualflybrain.org/docs/data/scrnaseq/)) | Data comes via FlyBase from the EBI Single Cell Expression Atlas. There's a machine-readable [TSV](https://github.com/VirtualFlyBrain/VFB_reporting_results/blob/master/scRNAseq_DataSets.tsv). |
| **Images** | Light-microscopy and EM neurons registered to template brains, shown in a 3D browser. | Template-space registration (as in §4 level 1). |
| **Reasoning** | Answers questions like "all neurons that are part of the antennal lobe", including every subregion. | [Owlery](https://virtualflybrain.org/docs/apis/owlery/): OWL description-logic queries plus SPARQL. |
| **Search** | Fast lookup of terms and images. | [Solr](https://virtualflybrain.org/docs/apis/solr/). |
| **Query orchestration** | One question fans out: Owlery finds the subregions, Neo4j finds the neurons, Solr fetches the images. | [VFBquery](https://virtualflybrain.org/docs/apis/vfbquery/), [PDB](https://virtualflybrain.org/docs/apis/pdb/) and [KB](https://virtualflybrain.org/docs/apis/kb/) APIs. |
| **Access** | A Term Info page per cell type with "connectivity", "single-cell transcriptomics data for…" and image queries, plus CSV export. The same queries are available from Python and from AI assistants. | [VFB_connect](https://vfb-connect.readthedocs.io/) (Python), [MCP server](https://virtualflybrain.org/docs/apis/mcp/), [CATMAID API](https://virtualflybrain.org/docs/apis/catmaid/). |

**The key idea:** datasets are never joined to each other directly. Each one is joined to a cell-type term, and the term is the join key. That's why a cluster from a 2018 sequencing paper and a neuron from a 2026 connectome land on the same page.

### What this means for Tardimap

| VFB piece | Tardimap equivalent | Verdict |
|---|---|---|
| FBbt ontology as the hub | A small **tardigrade cell-type vocabulary** with stable IDs (`TARDI:0000123`), `is_a` and `part_of` relations, and cross-references to [Uberon](https://obophenotype.github.io/uberon/) and the [Cell Ontology](https://obofoundry.org/ontology/cl.html) where they fit. I don't know of an existing tardigrade anatomy ontology, so check with Tardimap and the OBO Foundry before starting one. | **Adopt from day one.** It's cheap at under 600 neurons (likely tens to a couple of hundred types). Every neuron in `neurons.csv` carries a `cell_type_id`. This is the most important thing to borrow from VFB. |
| Connectome edges classified to types | `connections.csv` plus `cell_type_id` on both ends gives type-to-type connectivity directly. | **Adopt.** It's free once the vocabulary exists. |
| scRNAseq clusters annotated to types | A `links/expression.csv` table (dataset, cluster_id, cell_type_id, evidence, author), filled as tardigrade single-cell datasets for *H. exemplaris* appear. Use gene IDs from the published genome assembly. | **Design for it now, fill it later.** Ask Tardimap which molecular datasets exist or are planned (TS-5). |
| Images in a template space | Specimen templates once there's more than one EM or light-microscopy specimen (§4 level 1). | Later. |
| Cross-species bridge | Map tardigrade terms to fly FBbt terms only through curated `links/fly.csv` rows, with evidence. Uberon and CL cross-references give a neutral middle layer for broad classes such as "motor neuron" or "sensory neuron". | **Adopt, by hand.** This is the honest form of G6. |
| Neo4j + Owlery + Solr + VFBquery | For 600 neurons, **static release tables + an OWL/OBO file + in-app joins** cover it. A Neo4j or Owlery service is worth it only if Tardimap data is loaded into VFB itself, or the number of linked datasets grows large. | **Skip the servers; keep the shape.** Publish the vocabulary as OBO/OWL so it can be loaded into VFB or Owlery later. |
| VFB_connect and the MCP server | `tardimap-py` (§7) exposes the same kinds of queries: partners of a type, expression in a type, members of a region. An MCP endpoint over the release files is cheap and helps newcomers ask questions in plain language. | **Adopt the query set.** Add MCP in phase 5. |
| Term Info page | The Play Pen's neuron and cell-type pages: status, connectivity, expression, fly candidates, discussion, contributors. | **Adopt.** It's the natural centre of the contributor UI. |

**The longer-term option:** rather than building "VFB for tardigrades", ask the VFB team whether Tardimap could be hosted *in* VFB or as a sister instance using their pipeline, once a vocabulary and a release exist. That's the same "don't rebuild, plug in" argument as for Coda (TS-6).

## 5. Choosing a proofreading engine for under 600 neurons

This depends on Tardimap's answer to OQ-2, so here are the options with a default for each answer.

| Option | Good | Bad | Choose when |
|---|---|---|---|
| **A. Full CAVE** (PyChunkedGraph + Annotation + Materialization + Spelunker) | Exactly what FlyWire used. CAVEclient, fafbseg-style code and Coda work unchanged. Edit history and credit come built in. | Kubernetes on Google Cloud with BigTable: meaningful running cost and ops work. Designed for 100k+ neurons and hundreds of simultaneous editors. | Tardimap already has a CAVE-friendly voxel segmentation **and** a sponsor for hosting (for example via the Seung lab, Allen Institute or Cambridge groups). |
| **B. CATMAID** | Lightweight (one Django + Postgres server). Browser-based and multi-user, with manual skeleton and synapse tracing. Proven for small whole-animal connectomes. pymaid, rcatmaid, navis and Coda already read it. | Skeletons, not voxel segmentation. Less "fix the AI's mistakes" and more "trace". | Tardimap traces by hand or proofreads skeletons. **This is our default for 600 neurons if there's no existing pipeline.** |
| **C. What Tardimap already uses** (WebKnossos, VAST, a custom tool, and so on) | No migration. | Fly tools need an export step. | Always the first choice if it works for them. We add an **exporter to the data contract** (§6) instead. |
| **D. Neuroglancer + static precomputed + task app (no engine)** | Zero backend. The Play Pen records decisions (merge here, this synapse is wrong) as annotations, and Tardimap applies them. | Edits are suggestions, not live. | The MVP and training tasks on FlyWire data, *before* any Tardimap access exists. |

**Recommendation:** start with **D** for the MVP (it's what PR #2 already mocks). Pitch **C, then export** to Tardimap as the least disruptive path. Offer **B** if they don't have a collaborative tool. Keep **A** as the path for a large, funded community effort. Whichever engine is used, releases follow the same data contract, so the Play Pen and the analysis tools never care which one it was.

## 6. The data contract (what every Tardimap release should contain)

This is the piece to agree with Tardimap. It's small, it's built on fly conventions, and every tool above can read it.

```
release/v{N}/
  manifest.json            version, date, specimen ("Riker"), voxel size, source pipeline, citation, license
  neurons.feather|csv      neuron_id, status (segmented|proofread|synapses|typed|named), class, type, name,
                           cell_type_id (ontology term, §4b), side, region, soma_xyz, proofreader(s)
  ontology/tardi.obo|owl   tardigrade cell-type and region vocabulary with Uberon/CL cross-references (§4b)
  synapses.feather|csv     pre_id, post_id, pre_xyz, post_xyz, confidence
  connections.feather|csv  pre_id, post_id, n_synapses        (Codex-style edge list)
  annotations.feather|csv  neuron_id or point_xyz, table, value, author, timestamp   (CAVE-style)
  contributors.csv         contributor, role, tasks_accepted   (feeds T-5 credit export)
  links/fly.csv            tardigrade_id or cell_type_id, fly_dataset, fly_type / FBbt id, link_type,
                           confidence, evidence, author (C-1)
  links/expression.csv     dataset, cluster_id, cell_type_id, evidence, author   (VFB-style scRNAseq link)
  precomputed/             Neuroglancer precomputed: em/ (optional), segmentation/, meshes/, skeletons/
  swc/                     one SWC per neuron (navis, nat, everything else)
```

- **Feather and CSV** match Codex downloads, so pandas, R and the Next.js app can all read them.
- **Annotations as points** (the CAVE idea) survive re-segmentation.
- **The precomputed layout** lets one Neuroglancer state file open any neuron.
- **Numbered releases** give us P-3 and N-4 for free.
- **The ontology is the join key**, as in VFB: connectome, expression and fly links all join on `cell_type_id`, never on each other.
- **It's easy to generate from CATMAID, CAVE or WebKnossos**, so it doesn't lock Tardimap into an engine.

## 7. Recommended stack for the Play Pen

| Layer | Choice | Why |
|---|---|---|
| Web app | **Next.js (TypeScript) on Vercel**, as in PR #2 | Already built; static-first; free hosting. |
| App data | **Static versioned release files** (§6) served from the repo, Vercel Blob or a bucket; API routes read them | The Codex pattern. Cheap, cacheable, respects upstream services (N-7). |
| Viewer | **Neuroglancer**: link out first, embed later, with state JSON generated per task | Same viewer as FlyWire, BANC and MANC. Contributors learn one tool. |
| Data pipeline | **Python: navis + fafbseg-py + CAVEclient** (fly), **cloud-volume / igneous / kimimaro / skeletor** (tardigrade volumes), run as scheduled GitHub Actions jobs that write release files | Reuses fly libraries directly. No server needed. |
| Contributor state | Small hosted Postgres (for example Neon or Supabase) for accounts, tasks, submissions and reviews | The only truly dynamic data. Keep it out of the release files. |
| Auth | GitHub or ORCID OAuth | ORCID gives scientific credit (T-5) a real identifier. |
| Proofreading engine | Per §5: none (MVP) → Tardimap's own → CATMAID → CAVE | Decided by Step 0. |
| Analysis for contributors | **navis notebooks + Coda** | Coda gives no-code analysis once data is in a backend it reads. |
| Cell-type vocabulary | **OBO/OWL file in the repo**, edited by pull request (and later in ODK/Protégé), cross-referenced to Uberon and CL | The VFB hub idea at tardigrade scale (§4b). |
| Comparison (later) | **cocoa / coconat adapters** + curated `links/fly.csv` | Reuse the comparative tools rather than reinventing them. |
| Linking other data (later) | `links/expression.csv` and similar tables joined on `cell_type_id`; VFB_connect-style queries and an MCP endpoint in `tardimap-py` | The VFB model without running Neo4j, Owlery or Solr. |
| Packages we publish | `tardimap-py` (navis-based) and later `tardimapr` (nat-based) | Mirrors fafbseg / bancr and makes Tardimap a "seventh dataset". |

## 8. Phases

| Phase | What | Fly pieces used | Depends on | Maps to |
|---|---|---|---|---|
| **0. Talk** | Send Tardimap the data contract (§6), the engine options (§5) and the cell-type vocabulary idea (§4b) along with the Step 0 email. | — | Nothing | D-1, D-3, OQ-2, OQ-4 |
| **1. MVP on fly data** | Replace PR #2's mock data with a real FlyWire slice: a Python job (fafbseg-py / CAVEclient, or Codex downloads) writes release files in the §6 format, and tasks open in FlyWire Neuroglancer with known answers. | Codex, CAVEclient, fafbseg-py, navis, Neuroglancer | A free FlyWire / CAVE token | P-1, P-2, T-1 to T-3, E-1 |
| **2. Contributor state** | Accounts (ORCID), task claiming, submissions, review queue, credit export. | — | Phase 1 | T-4, T-5 |
| **3. First Tardimap release** | Start the cell-type vocabulary with Tardimap's existing names. Tardimap's pipeline exports to the contract (we write the exporter: CATMAID → contract, WebKnossos → contract, and so on), precomputed via cloud-volume / igneous, SWC via skeletor or kimimaro. The progress view switches data source. | cloud-volume, igneous, skeletor, navis, Neuroglancer | Tardimap agreement and access | D-2, E-2, E-4, Step 2 |
| **4. Live proofreading** | Tasks write to Tardimap's engine instead of being suggestions: CATMAID through its API, or a minimal CAVE if hosting is sponsored. | CATMAID / pymaid or CAVE | Phase 3 plus an engine decision | T-2 (live) |
| **5. Seventh dataset** | Publish `tardimap-py` (with VFB_connect-style queries and an MCP endpoint), a cocoa/coconat adapter and a connecto back end. Ask the Coda and VFB maintainers about adding Tardimap. | navis, cocoa, coconat, connecto, Coda, VFB | Public release + vocabulary | E-3, G3 |
| **6. Compare and link** | Curated fly link table (to FBbt terms), network statistics and motif comparison, a bigclust-style typing view, and expression links for any tardigrade single-cell data. | cocoa, coconat, bigclust, NBLAST (within tardigrade), VFB model | Phase 5 | C-1 to C-3, G6 |

## 9. Open points this review adds

- **TS-1.** Will Tardimap accept the §6 data contract as their release format? This is the single most useful thing to ask in Step 0.
- **TS-2.** Is anyone in the fly community (the Cambridge group, Seung lab or Janelia FlyEM) willing to host or advise on a small CAVE or CATMAID instance? This connects to OQ-6.
- **TS-3.** Static release hosting: the repo is fine for a 600-neuron table, but precomputed meshes and EM need a bucket. Who pays for it? A Google Cloud public-dataset or AWS Open Data application is the usual answer.
- **TS-4.** Do we want Coda support early? It's the fastest way to give non-programmers real analysis, and it requires serving data through neuPrint, CAVE or CATMAID.
- **TS-5.** Does Tardimap (or anyone) have, or plan, single-cell or spatial transcriptomics for *H. exemplaris*, and does a tardigrade anatomy vocabulary exist already? This decides whether `links/expression.csv` has anything to hold soon.
- **TS-6.** Would the Virtual Fly Brain team host Tardimap, or support a sister instance on their pipeline, once a release and a vocabulary exist?

## 10. Caveats

- The per-tool descriptions come from flyconnecto.me (tools page and dataset guide, read 2026-10-31), and the VFB section from virtualflybrain.org (scRNAseq, connectivity and Owlery API pages, read 2026-10-31), and from each project's public documentation as I understand it. The infrastructure rows (CAVE internals, DVID, cloud-volume, igneous, kimimaro) aren't on the tools page and come from those projects' own repos. Check details such as exact APIs against current docs before building on them.
- Nothing is known yet about Tardimap's own pipeline. Every "Tardimap verdict" is a recommendation to discuss with the consortium, not a decision.
