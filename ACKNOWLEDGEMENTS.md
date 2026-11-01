# Acknowledgements

The Moss Piglet Play Pen stands on other people's work. Thank you to all of them. If you use the Play
Pen in research, cite the upstream datasets you touched, not only this repository.

## Data

| Source | What we use | Terms and citation |
|---|---|---|
| [Tardimap](https://tardimap.org/) | The goal: the *Hypsibius exemplaris* "Riker" connectome. No Tardimap data is used yet; the tardigrade dataset in the app is a seeded mock. | Their terms, once they publish them. Contact contact@tardimap.org. |
| [FlyWire](https://flywire.ai/) / [Fly Connectome](https://flyconnecto.me/) (Cambridge Drosophila Connectomics Group) | Whole-brain neuron annotations from [`flyconnectome/flywire_annotations`](https://github.com/flyconnectome/flywire_annotations), fetched by `npm run data:fetch`, not redistributed | Dorkenwald et al. 2024, *Nature* 634:124; Schlegel et al. 2024, *Nature* 634:139. Follow the FlyWire citation guidelines. |
| [Janelia hemibrain](https://www.janelia.org/project-team/flyem/hemibrain) (FlyEM) | v1.2.1 neuron metadata matched to FlyWire, fetched at build time, not redistributed | Scheffer et al. 2020, *eLife* 9:e57443. |
| *C. elegans* hermaphrodite connectome via [OpenWorm c302](https://github.com/openworm/c302) | The tardigrade-scale stand-in graph committed in `data/datasets/celegans-hermaphrodite/` | Cook et al. 2019, *Nature* 571:63; OpenWorm c302 (MIT). |
| [CoDA](https://coda.science/) | Design reference for a Tardimap analysis front end | Not used as data. |

## Tools and models

- [Next.js](https://nextjs.org/) and [React](https://react.dev/) (MIT) for the web app, hosted on [Vercel](https://vercel.com/).
- [Upstash Redis](https://upstash.com/) for optional shared persistence.
- [Ollama](https://ollama.com/) and the open-weight models it serves (for example Qwen2.5-Coder) for the no-key local chat.
- [Kokoro-82M](https://huggingface.co/hexgrad/Kokoro-82M) (Apache-2.0) via [kokoro-onnx](https://github.com/thewh1teagle/kokoro-onnx) for the demo narration, generated locally.
- [Playwright](https://playwright.dev/) for the demo recording and browser checks.
- The fly connectomics ecosystem the roadmap builds on: CAVE, Neuroglancer, Codex, neuPrint, CATMAID, navis and the natverse, cocoa and coconat.
- Built with help from [Claude Code](https://claude.ai/code).

## People

- **Byron ([@biobitworks](https://github.com/biobitworks))**, who started and leads the project.
- The FlyWire proofreaders and annotators, whose open, credited community model this project copies.
- The Tardimap consortium, for mapping the tardigrade nervous system.
- Every future contributor: see `/contributors` in the app.

## Licenses

Code: Apache 2.0 (`LICENSE`, `NOTICE`). Docs, data we publish and media: CC BY-NC-ND 4.0 (`LICENSE-CONTENT`). Third-party data and software: their own terms, above.
