# Moss Piglet Play Pen

**A connector between [Tardimap](https://tardimap.org/) (the tardigrade connectome) and the Fly Connectome ([FlyWire](https://codex.flywire.ai/)).**

"Moss piglet" is a common name for tardigrades. This app is a play pen where tardigrade neurons and fruit fly neurons can be loaded side by side, linked, and compared.

> **Status:** idea / requirements stage. There is no application code yet. See [`docs/REQUIREMENTS.md`](docs/REQUIREMENTS.md) for what the app needs to do and the open questions that still need answers.

## Why connect these two datasets?

Tardigrades and insects are both panarthropods, so their nervous systems share a deep common ancestry, but they sit at opposite ends of the size scale:

| | Tardimap | Fly Connectome (FlyWire FAFB) |
|---|---|---|
| Organism | *Hypsibius exemplaris* (tardigrade) | *Drosophila melanogaster* (fruit fly) |
| Scope | Whole animal (planned) | Whole adult brain (BANC adds the nerve cord) |
| Neurons | Fewer than ~600 | ~139,000 |
| Imaging | FIB-SEM / serial-section EM ("Riker" dataset) | Serial-section TEM |
| Status | Imaging complete, reconstruction in progress | Released; default snapshot v783 |
| Access | Not yet public (contact@tardimap.org) | Codex downloads (CSV, token required) and the CAVE API |

A connector lets researchers, students and curious people ask questions such as:

- Which fly cell types are candidate counterparts of a given tardigrade neuron?
- Do small circuit motifs (feed-forward loops, reciprocal pairs) show up at similar rates in both animals?
- How does a tiny, whole-body nervous system compare with one region of a much larger brain?

## What the app will do

1. **Ingest** connectome data from both sources into one common data model (neurons, synapses/edges, cell types, neurotransmitters, regions).
2. **Link** tardigrade neurons to fly neurons or cell types through user-made or suggested mappings, each with a confidence level and a note on the evidence.
3. **Compare** network statistics and motifs across the two graphs.
4. **Explore** both connectomes side by side in a browser, with search, neighborhood views and 3D morphology where available.
5. **Export** mappings and comparison results in open formats (CSV, JSON, GraphML) with full citations for both sources.

Details, priorities and acceptance criteria are in [`docs/REQUIREMENTS.md`](docs/REQUIREMENTS.md).

## Data sources

### Tardimap
- Website: https://tardimap.org/
- Run by the Tardigrade Connectome Consortium as an open-science project. The site says all data, tools and results will be released openly, but no download, API or file format is published yet.
- Until Tardimap publishes data, the app will use a small sample or mock tardigrade dataset behind the same interface, so the rest of the app can be built now.

### Fly Connectome
- FlyWire Codex: https://codex.flywire.ai/ (bulk downloads at the Codex download portal; an account API token is required).
- Live, versioned queries: [CAVEclient](https://github.com/seung-lab/CAVEclient).
- Main tables: `connections_princeton` (synaptic connections) and `consolidated_cell_types`, plus neurotransmitter predictions and SWC skeletons where available.
- Other fly datasets (the hemibrain or MANC via neuPrint, or BANC) could be added later through the same adapter pattern.

## Planned architecture (proposal)

```
 ┌──────────────┐     ┌──────────────┐
 │  Tardimap    │     │  FlyWire     │
 │  adapter     │     │  adapter     │
 └──────┬───────┘     └──────┬───────┘
        │  normalize          │  normalize
        ▼                     ▼
 ┌────────────────────────────────────┐
 │  Common connectome model           │
 │  (neurons, edges, types, versions) │
 └──────────────┬─────────────────────┘
                │
   ┌────────────┼──────────────┐
   ▼            ▼              ▼
 Mapping     Comparison      Web UI / API
 store       engine          (explore, export)
```

The stack is not decided yet (see the open questions in the requirements doc). A likely default is a Python backend (CAVEclient, pandas, NetworkX) with a TypeScript web front end and Neuroglancer for 3D views.

## Getting started

There is nothing to run yet. Once the stack is chosen, this section will cover:

- prerequisites and installation
- configuring a FlyWire / Codex API token (kept in environment variables and never committed)
- loading the sample tardigrade dataset
- running the app locally

## Citing the data

Any use of this app must cite both upstream datasets. FlyWire publishes its citation requirements on the Codex download portal. Tardimap's citation will be added when the consortium publishes it.

## Links

- Project page: https://app.strangerbuilds.com/p/moss-piglet-play-pen
- Tardimap: https://tardimap.org/
- FlyWire Codex: https://codex.flywire.ai/

## License

Not chosen yet (see the open questions in the requirements doc). Data from each source stays under that source's own terms.
