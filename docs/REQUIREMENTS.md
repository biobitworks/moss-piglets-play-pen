# Moss Piglet Play Pen: Requirements

**Status:** Draft v0.2 for review (2026-10-31). Reframed around an open, contributor-friendly tardigrade connectome.
**Owner:** Byron
**Goal in one line:** Find and build the next step toward a tardigrade connectome that anyone can step in and help finish, the way the fly connectome was finished.

This document says what the Play Pen must do. It does not decide how. Items marked **(OQ-n)** depend on an open question in section 9. Priorities: **Must** = needed for the first usable version (MVP), **Should** = wanted soon after, **Could** = later.

---

## 1. Background

- **Tardimap** ([tardimap.org](https://tardimap.org/)) is an open-science consortium mapping the whole nervous system of the tardigrade *Hypsibius exemplaris*, which has fewer than ~600 neurons. Whole-body EM imaging (the "Riker" dataset) is complete and reconstruction is in progress. No data, tools, pipeline or contributor process is public yet.
- **The fly connectome** ([flyconnecto.me](https://flyconnecto.me/) and partners) is now finished across six public datasets: hemibrain, FAFB/FlyWire, FANC, MANC, MaleCNS and BANC. FlyWire in particular was proofread by a large, distributed community of labs and citizen scientists using shared, open infrastructure (CAVE for versioned segmentation and annotation, Neuroglancer for viewing, Codex and neuPrint for browsing and download), with analysis libraries such as navis, fafbseg and the natverse. Contributors were credited in the publications.

**The idea:** apply that recipe to the tardigrade. A connectome of under 600 neurons is small enough for a community to finish, if newcomers can be trained, given small tasks, and credited.

## 2. Goals

1. **G1. Find the next step.** Work out what currently blocks the tardigrade connectome from being finished by an open community, and write down a concrete next step.
2. **G2. Lower the barrier to contributing.** Make it possible for someone with no connectomics background to learn, pick up a task, and contribute useful proofreading or annotation.
3. **G3. Reuse the fly ecosystem.** Build on proven fly connectome tools and workflows rather than inventing new ones.
4. **G4. Make progress visible.** Show how much of the tardigrade connectome is done and what is left.
5. **G5. Credit contributors.** Every contribution is attributed.
6. **G6 (later). Compare the two animals.** Once both connectomes exist, link and compare tardigrade and fly circuits.

## 3. Non-goals (for the MVP)

- Re-imaging or hosting raw EM volumes. Tardimap owns the data.
- Building a new segmentation or proofreading engine. The Play Pen wraps existing tools.
- Publishing or redistributing Tardimap data without the consortium's agreement.
- Claiming evolutionary homology automatically.

## 4. Users

| User | What they want |
|---|---|
| **Newcomer / citizen scientist** | Learn what a connectome is, practice, then help with real tardigrade tasks. |
| **Student or lab researcher** | Contribute proofreading and cell-typing, and use the data in their own work. |
| **Tardimap consortium member** | Spread the remaining work across more people with quality control, and track progress. |
| **Fly connectomics expert** | Bring their experience to a new animal, and later compare circuits. |
| **Developer** | Extend the tools and connect new data sources. |

(OQ-1: which of these comes first?)

## 5. Functional requirements

### 5.1 Discovery: the "next step" (G1)
| ID | Requirement | Priority |
|---|---|---|
| D-1 | Write down Tardimap's current pipeline: segmentation tool, proofreading tool, data format, hosting, and who does the work today. | Must (OQ-2) |
| D-2 | Map each stage of the fly recipe (imaging, automated segmentation, proofreading, synapse detection, cell typing, release) onto Tardimap's status, and mark the gaps. | Must |
| D-3 | Agree with the consortium on whether and how outside contributors can take part, including data access, licensing and credit. | Must (OQ-3) |
| D-4 | Publish the result as a short roadmap in this repo that any newcomer can read. | Must |

### 5.2 Progress view (G4)
| ID | Requirement | Priority |
|---|---|---|
| P-1 | Show every known tardigrade neuron with its status: segmented, proofread, synapses attached, typed, named. | Must |
| P-2 | Show overall completion by body region and by cell class (sensory, motor, interneuron, and so on). | Must |
| P-3 | Record the dataset version behind every number shown. | Must |
| P-4 | Show the same view for a fly dataset as a reference for what "finished" looks like. | Could |

### 5.3 Contributor flow (G2, G5)
| ID | Requirement | Priority |
|---|---|---|
| T-1 | Turn remaining work into small tasks (for example "proofread this neuron", "check these synapses", "propose a type for this cell"), each with instructions and an example. | Must |
| T-2 | Let a contributor sign up, pick or be assigned a task, and open it straight in the proofreading viewer (Neuroglancer or whatever Tardimap uses). | Must (OQ-2) |
| T-3 | Training tasks on finished fly data (FlyWire) with known answers, plus feedback, before someone can work on tardigrade data. | Must |
| T-4 | Quality control: experienced reviewers check edits, or several people do the same task and results are compared. | Must (OQ-5) |
| T-5 | Attribute each contribution and export a contributor list for publications. | Must |
| T-6 | Discussion on each neuron or task (questions, notes, disagreements). | Should |
| T-7 | Levels or badges so contributors move from training to simple tasks to harder ones. | Could |

### 5.4 Fly ecosystem integration (G3)
| ID | Requirement | Priority |
|---|---|---|
| E-1 | Read public fly data (FlyWire through Codex or CAVE, and optionally neuPrint) for training tasks and reference views. | Must |
| E-2 | Prefer CAVE-compatible storage and Neuroglancer views for tardigrade data, if Tardimap agrees, so fly tools (CAVEclient, navis, fafbseg-style workflows) work on it. | Should (OQ-4) |
| E-3 | Provide notebook or library examples using navis or the natverse on tardigrade data. | Should |
| E-4 | Write source adapters so a new dataset (for example another tardigrade specimen) can be added without changing the rest of the app. | Should |

### 5.5 Comparison (G6, later)
| ID | Requirement | Priority |
|---|---|---|
| C-1 | Link a tardigrade neuron or group to a fly neuron or cell type, with link type, confidence, evidence and author. | Could |
| C-2 | Compare summary network statistics and small motifs between the two connectomes. | Could |
| C-3 | Use existing comparative connectomics libraries (cocoa, coconat) where possible. | Could |

## 6. Non-functional requirements

| ID | Requirement |
|---|---|
| N-1 | **Openness:** code is open source, and docs are written for non-experts. (OQ-7) |
| N-2 | **Data terms:** Tardimap data is used only as the consortium allows. Nothing is shown publicly before it is agreed. |
| N-3 | **Attribution:** every upstream dataset is cited according to its published requirements, and every contributor is credited. |
| N-4 | **Reproducibility:** every result records dataset and app versions. |
| N-5 | **Secrets:** tokens come from environment variables or a secrets store and are never committed. |
| N-6 | **Accessibility:** a newcomer can finish their first training task within 15 minutes of arriving, in a normal desktop browser. |
| N-7 | **Respect upstream services:** cache data, and use static downloads rather than heavy live queries, as Codex asks. |

## 7. Proposed next step and MVP

**Step 0: talk to Tardimap (this week).** Email contact@tardimap.org with a short pitch and the questions from D-1 and D-3. Their answers decide most of the open questions below.

**Step 1: MVP, buildable now on public fly data:**
1. A progress view and task flow that run against a small slice of FlyWire, standing in for tardigrade data (P-1, P-2, T-1, T-2).
2. Training tasks on FlyWire with known answers (T-3).
3. Contributor sign-up and attribution (T-5).
4. A short public roadmap (D-4).

**Step 2: point it at Tardimap.** Once access is agreed, switch the data source to Tardimap's segmentation and open real tasks to the first group of contributors, with review (T-4).

**MVP success:** a newcomer can arrive, complete a training task on fly data, and pick up a real task, and the progress view updates when that task is accepted.

## 8. Risks

| Risk | Mitigation |
|---|---|
| Tardimap does not want outside contributors yet, or data stays private. | Keep the Play Pen useful on fly data. Offer it as tooling the consortium can run internally. |
| Tardimap uses a pipeline that is not compatible with CAVE or Neuroglancer. | Adapter layer (E-4). Choose integration after D-1. |
| Contributions from newcomers are too low quality. | Training (T-3), review and redundancy (T-4), levels (T-7). |
| Tardigrade anatomy is unfamiliar even to fly experts. | Ask the consortium for an annotated reference set and a cell-type guide. |

## 9. Open questions

| ID | Question | Why it matters | Proposed default |
|---|---|---|---|
| OQ-1 | Who comes first: citizen scientists, students and labs, or the Tardimap consortium itself? | Sets the tone of the UI and the training depth. | Students and labs first, then the public. |
| OQ-2 | What does Tardimap use for segmentation and proofreading today, and in what format is its data? | Decides how the Play Pen connects to the real work. | Ask the consortium (Step 0). |
| OQ-3 | Does Tardimap want outside contributors, and on what terms (access, license, credit, embargo)? | Without this, the Play Pen can only work on fly data. | Ask the consortium. Treat their data as private until then. |
| OQ-4 | Should we push for a CAVE and Neuroglancer stack for Tardimap, like FlyWire? | It unlocks the whole fly toolchain, but it is a big infrastructure ask. | Propose it, but adapt to whatever they use. |
| OQ-5 | How is quality control done: expert review, redundancy (several people do the same task), or both? | Decides how trustworthy community edits are. | Expert review for the first group, adding redundancy later. |
| OQ-6 | Do you, or does anyone on the project, have a contact at Tardimap or in the fly connectome community (for example the Cambridge group at flyconnecto.me)? | A warm introduction makes Step 0 much faster. | Cold email to contact@tardimap.org. |
| OQ-7 | Which license for the code (MIT, Apache-2.0, GPL)? | Needed before outside contributions. | MIT. |
| OQ-8 | Tech stack and hosting: web app, notebooks, or both? | Shapes all implementation work. | Python backend (CAVEclient, navis), TypeScript web UI, embedded Neuroglancer. |
| OQ-9 | Is cross-species comparison (G6) part of this project's first year, or later? | Decides whether to design the data model for it now. | Later, but keep the data model ready for it. |
| OQ-10 | Is there a deadline, such as the Stranger Builds "build_anything" challenge? | Decides how much of the MVP to cut. | None assumed. |

## 10. Glossary

- **Connectome:** a complete map of neurons and the synapses between them.
- **Proofreading:** fixing errors in automated segmentation by merging pieces that belong together and splitting pieces that don't.
- **Cell typing:** grouping neurons into named types by shape, connectivity and position.
- **CAVE:** Connectome Annotation Versioning Engine, the backend behind FlyWire's live, versioned segmentation and annotation tables.
- **Neuroglancer:** a browser-based viewer for EM volumes and segmentations.
- **Codex / neuPrint:** web portals for browsing and downloading fly connectome data.
- **Moss piglet / water bear:** common names for tardigrades.

## 11. References

- Tardimap: https://tardimap.org/
- Fly Connectome (Cambridge Drosophila Connectomics Group): https://flyconnecto.me/
- The adult Drosophila connectome ecosystem: https://flyconnecto.me/2026/09/04/the-adult-drosophila-connectome-ecosystem/
- Fly connectome tools list: https://flyconnecto.me/tools/
- FlyWire Codex: https://codex.flywire.ai/ and its FAQ: https://codex.flywire.ai/faq
- neuPrint: https://neuprint.janelia.org/
- CAVEclient: https://github.com/seung-lab/CAVEclient
- Neuroglancer: https://github.com/google/neuroglancer
- navis: https://github.com/navis-org/navis
