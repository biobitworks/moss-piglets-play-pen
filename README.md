# Moss Piglet Play Pen

**An open on-ramp for finishing the tardigrade connectome, built on what the fly connectome community learned.**

"Moss piglet" is a common name for tardigrades. [Tardimap](https://tardimap.org/) is mapping every neuron and synapse in the tardigrade *Hypsibius exemplaris*. The fly connectome ([flyconnecto.me](https://flyconnecto.me/), FlyWire and related datasets) was finished because hundreds of people, from lab scientists to citizen scientists, could step in, proofread neurons, and share annotations through open tools.

This project connects the two. It brings the fly connectome's tools, workflows and community model to Tardimap, so that **anyone can step in and help finish the tardigrade connectome**, and it gives people a place to practice and compare against the fly while they do.

> **Status:** idea and requirements stage. There is no application code yet. See [`docs/REQUIREMENTS.md`](docs/REQUIREMENTS.md) for the goals, the proposed next step, and the open questions.

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

There is nothing to run yet. Once the stack is chosen, this section will cover installation, configuring data-access tokens (kept in environment variables and never committed), and running the Play Pen locally.

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
