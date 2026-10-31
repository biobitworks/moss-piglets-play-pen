# Moss Piglet Play Pen: Requirements

**Status:** Draft v0.1 for review (2026-10-31)
**Owner:** Byron
**One line:** A connector between Tardimap (the tardigrade connectome) and the Fly Connectome.

This document says what the app must do. It does not decide how. Items marked **(OQ-n)** depend on an open question listed in section 8. Priorities: **Must** = needed for the first usable version (MVP), **Should** = wanted soon after, **Could** = later or nice to have.

---

## 1. Goals

1. Put the tardigrade connectome (Tardimap) and the fruit fly connectome (FlyWire) into one place with one shared data model.
2. Let users link tardigrade neurons to fly neurons or cell types, and record why.
3. Let users compare the two wiring diagrams with numbers (network statistics, motifs) and pictures (side-by-side views).
4. Keep everything reproducible: every result names the dataset versions it came from, and both sources are cited.

## 2. Non-goals (for the MVP)

- Doing EM segmentation, proofreading or tracing. Tardimap and FlyWire own that work.
- Hosting or mirroring the raw EM image volumes.
- Claiming evolutionary homology automatically. The app records and scores proposed links, and people judge them.
- Writing data back into FlyWire or Tardimap.

## 3. Users

| User | What they want |
|---|---|
| Comparative neuroscientist | Propose and test tardigrade–fly correspondences and export results for a paper. |
| Tardimap consortium member | See how new reconstructions relate to known fly cell types while the tardigrade connectome is still being built. |
| Student or curious member of the public | Explore a whole-animal nervous system of under 600 neurons next to a fly brain. |
| Developer | Use the app's API or data model to build further tools. |

(OQ-1: which of these is the primary user for the MVP?)

## 4. Data sources

### 4.1 Tardimap
- Organism: *Hypsibius exemplaris*. Fewer than ~600 neurons. "Riker" whole-body EM dataset. Imaging is complete and reconstruction is in progress.
- No public download, API, file format or license is published yet. The site says all data will be released openly. Contact: contact@tardimap.org.
- Therefore the MVP must work against a **sample or mock dataset** behind a stable adapter interface, and swap in real data once access exists. (OQ-2, OQ-3)

### 4.2 Fly Connectome (FlyWire)
- FAFB adult brain, default snapshot **v783**. BANC (brain and nerve cord) is also served by Codex.
- Bulk access: gzipped CSV files from the Codex download portal (API token required). Key tables: `connections_princeton`, `consolidated_cell_types`, neurotransmitter predictions.
- Live access: CAVEclient (FlyWire/CAVE token required).
- Morphology: SWC skeletons from cell pages where available. Meshes through MeshParty or Neuroglancer.
- Citation requirements are listed on the Codex download portal and must be followed. (OQ-4: which fly dataset or datasets are in scope?)

## 5. Functional requirements

### 5.1 Ingestion and data model
| ID | Requirement | Priority |
|---|---|---|
| F-1 | Provide a source adapter interface with one implementation per source (Tardimap, FlyWire). Adding a source must not change the rest of the app. | Must |
| F-2 | Normalize both sources into a common model: **Neuron** (id, source, name, cell type, side, region, neurotransmitter and confidence), **Edge** (pre, post, synapse count, region), **CellType**, **Region**, **DatasetVersion**. | Must |
| F-3 | Load a FlyWire snapshot from the Codex CSV downloads, pinned to a stated version (default v783). | Must |
| F-4 | Load a tardigrade dataset from a local file (mock or sample now, real Tardimap export later). | Must |
| F-5 | Record the source, version, and download date for every loaded dataset, and attach that record to every result. | Must |
| F-6 | Cache downloaded data locally so the app does not re-download on each run, and respect Codex's request to use static downloads rather than heavy live queries. | Must |
| F-7 | Optionally query live FlyWire data through CAVEclient. | Could |
| F-8 | Support other fly connectomes (hemibrain or MANC via neuPrint, BANC). | Could |

### 5.2 Linking (cross-species mapping)
| ID | Requirement | Priority |
|---|---|---|
| L-1 | A user can create a link from a tardigrade neuron (or group) to a fly neuron, cell type, or group. | Must |
| L-2 | Each link stores: link type (for example "candidate homolog" or "functional analog"), confidence (low/medium/high), evidence note, author, and timestamp. | Must |
| L-3 | Links can be edited and deleted, with a history of changes. | Should |
| L-4 | The app can **suggest** candidate links using features available in both datasets (neurotransmitter, connectivity pattern, position in the body plan, sensory or motor role). Suggestions are clearly marked as machine-generated. | Should (OQ-5) |
| L-5 | Links can be imported and exported as CSV and JSON. | Must |
| L-6 | Several users can share and discuss a set of links. | Could (OQ-6) |

### 5.3 Comparison
| ID | Requirement | Priority |
|---|---|---|
| C-1 | Show summary statistics per graph: neuron count, edge count, degree distributions, neurotransmitter mix, density. | Must |
| C-2 | Allow comparison of a tardigrade graph against a chosen fly **subgraph** (for example a neuropil, a cell-type set, or the neighborhood of linked neurons), because the full fly brain is about 200 times larger. | Must |
| C-3 | Count small motifs (2- and 3-node) in both graphs and compare them with each other and with a random-network baseline. | Should |
| C-4 | For linked neuron pairs, compare their input and output partners: are the partners also linked? | Should |
| C-5 | Export comparison results as CSV, JSON, and GraphML. | Must |

### 5.4 Exploration UI
| ID | Requirement | Priority |
|---|---|---|
| U-1 | Search neurons by id, name, or cell type in either dataset. | Must |
| U-2 | Neuron detail page: properties, top partners, links to the other species. | Must |
| U-3 | Side-by-side network views of a tardigrade neighborhood and a fly neighborhood. | Must |
| U-4 | 3D morphology for neurons that have skeletons or meshes (for example through Neuroglancer). | Should |
| U-5 | Deep links out to FlyWire Codex and (when available) Tardimap's viewer for any neuron. | Should |
| U-6 | Works in current desktop browsers. Mobile is not required. | Must |

### 5.5 API
| ID | Requirement | Priority |
|---|---|---|
| A-1 | A read API (REST or similar) for neurons, edges, links, and comparison results. | Should |
| A-2 | A Python package or notebook examples for researchers. | Could |

## 6. Non-functional requirements

| ID | Requirement |
|---|---|
| N-1 | **Reproducibility:** every result records dataset versions and app version. |
| N-2 | **Attribution:** the UI and every export cite FlyWire per its published requirements, and cite Tardimap once it publishes a citation. |
| N-3 | **Licensing compliance:** data is used only under each source's terms. No redistribution of Tardimap data before it is public. (OQ-3) |
| N-4 | **Secrets:** API tokens come from environment variables or a secrets store and are never committed. |
| N-5 | **Performance:** loading a cached FlyWire snapshot and showing a neuron page takes no more than a few seconds on a normal laptop. Full-brain edge tables (millions of rows) must not be loaded into the browser. |
| N-6 | **Openness:** code is open source, matching the open-science aims of both projects. (OQ-7) |
| N-7 | **Testing:** adapters and the comparison engine have automated tests against small fixture datasets. |

## 7. MVP scope (proposed)

The smallest useful version:

1. FlyWire v783 loaded from Codex CSVs, cached locally (F-1 to F-6).
2. A mock tardigrade dataset of about 50 to 600 neurons in the same format we expect Tardimap to use (F-4).
3. Manual linking with import and export (L-1, L-2, L-5).
4. Summary statistics and subgraph comparison (C-1, C-2, C-5).
5. A simple web UI with search, neuron pages, and side-by-side neighborhood views (U-1 to U-3).

Success: a user can load both datasets, link a handful of tardigrade neurons to fly cell types, and export a comparison table with correct citations and versions.

## 8. Open questions

| ID | Question | Why it matters | Proposed default |
|---|---|---|---|
| OQ-1 | Who is the primary user for the MVP: researchers, the Tardimap consortium, or the public? | Sets how technical the UI is and whether an API matters early. | Researchers. |
| OQ-2 | Do we have, or can we get, early access to Tardimap data (the Riker reconstruction)? In what format (Neuroglancer precomputed, CAVE tables, CSV, SWC)? | Decides whether the MVP uses real or mock tardigrade data. | Mock data now; ask contact@tardimap.org. |
| OQ-3 | What license and embargo terms will Tardimap data have? | Decides what we can show, cache, or export. | Treat as private until published. |
| OQ-4 | Which fly dataset: FlyWire FAFB (brain only), BANC (brain and nerve cord), hemibrain, or MANC? | A whole-body tardigrade maps more naturally onto brain plus nerve cord. | FAFB v783 first, BANC next. |
| OQ-5 | How should automatic link suggestions work, and is that in scope for v1? | This is the hardest scientific part. | Manual linking first; suggestions in v2. |
| OQ-6 | Is this single-user or multi-user (accounts, shared link sets)? | Big effect on architecture and hosting. | Single-user, file-based links. |
| OQ-7 | Which license for the code (MIT, Apache-2.0, GPL)? | Needed before outside contributions. | MIT. |
| OQ-8 | Tech stack and hosting: web app, desktop app, or notebook-first? Any preference from Stranger Builds? | Shapes all implementation work. | Python backend, TypeScript web UI, static hosting. |
| OQ-9 | Does "connector" mean an interactive app, a data pipeline or library, or both? | Changes what "done" looks like. | Both: a library core with a thin web UI. |
| OQ-10 | Is there a timeline or a milestone (for example the Stranger Builds "build_anything" challenge)? | Decides how much of the MVP to cut. | None assumed. |

## 9. Glossary

- **Connectome:** a complete map of neurons and the synapses between them.
- **Moss piglet / water bear:** common names for tardigrades.
- **FAFB:** Full Adult Fly Brain, the EM volume behind FlyWire.
- **CAVE:** Connectome Annotation Versioning Engine, the backend that serves FlyWire's live tables.
- **Codex:** FlyWire's web portal for browsing and downloading the connectome.
- **Snapshot / materialization version:** a frozen, numbered release of a connectome (for example FlyWire v783).
- **Motif:** a small recurring pattern of connections among two or three neurons.

## 10. References

- Tardimap: https://tardimap.org/
- FlyWire Codex FAQ: https://codex.flywire.ai/faq
- About Codex: https://codex.flywire.ai/about_codex
- CAVEclient: https://github.com/seung-lab/CAVEclient
- FlyWire v783 data release (Zenodo): https://zenodo.org/records/10676866
