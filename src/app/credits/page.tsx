import type { Metadata } from "next";

export const metadata: Metadata = { title: "Credits and license · Moss Piglet Play Pen" };

const DATA = [
  {
    name: "Tardimap",
    href: "https://tardimap.org/",
    use: "The goal: the Hypsibius exemplaris “Riker” connectome. No Tardimap data is used yet; the tardigrade dataset here is a seeded mock.",
    terms: "Their terms, once published (contact@tardimap.org).",
  },
  {
    name: "FlyWire / Fly Connectome",
    href: "https://flyconnecto.me/",
    use: "Whole-brain neuron annotations (flyconnectome/flywire_annotations), fetched at build time, not redistributed.",
    terms: "Dorkenwald et al. 2024, Nature 634:124; Schlegel et al. 2024, Nature 634:139.",
  },
  {
    name: "Janelia hemibrain (FlyEM)",
    href: "https://www.janelia.org/project-team/flyem/hemibrain",
    use: "v1.2.1 neuron metadata matched to FlyWire, fetched at build time, not redistributed.",
    terms: "Scheffer et al. 2020, eLife 9:e57443.",
  },
  {
    name: "C. elegans connectome via OpenWorm c302",
    href: "https://github.com/openworm/c302",
    use: "Tardigrade-scale stand-in graph: 448 cells, 7,379 connections.",
    terms: "Cook et al. 2019, Nature 571:63; OpenWorm c302 (MIT).",
  },
];

const TOOLS = [
  "Next.js and React for the app, hosted on Vercel",
  "Upstash Redis for optional shared persistence",
  "Ollama and open-weight models (e.g. Qwen2.5-Coder) for the no-key local chat",
  "Kokoro-82M (Apache-2.0) via kokoro-onnx for the demo narration, generated locally",
  "Playwright for the demo recording and browser checks",
  "The fly connectomics ecosystem the roadmap builds on: CAVE, Neuroglancer, Codex, neuPrint, CATMAID, navis, the natverse, cocoa, coconat",
  "Built with help from Claude Code",
];

export default function CreditsPage() {
  return (
    <>
      <h1>Credits and license</h1>
      <p className="lede">
        The Play Pen is science as a service: an open app, REST and MCP tools that people and agents can call. It stands
        on other people&apos;s work. If you use it in research, cite the upstream datasets you touched.
      </p>

      <h2>Data</h2>
      <div className="card table-scroll">
        <table>
          <thead><tr><th>Source</th><th>What we use</th><th>Cite / terms</th></tr></thead>
          <tbody>
            {DATA.map((d) => (
              <tr key={d.name}>
                <td><a href={d.href}>{d.name}</a></td>
                <td>{d.use}</td>
                <td>{d.terms}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2>Tools and models</h2>
      <ul>{TOOLS.map((t) => <li key={t}>{t}</li>)}</ul>

      <h2>People</h2>
      <ul>
        <li>Byron (<a href="https://github.com/biobitworks">@biobitworks</a>), who started and leads the project.</li>
        <li>The FlyWire proofreaders and annotators, whose open, credited community model this project copies.</li>
        <li>The Tardimap consortium, for mapping the tardigrade nervous system.</li>
        <li>Every future contributor (see Contributors).</li>
      </ul>

      <h2>License</h2>
      <div className="card table-scroll">
        <table>
          <thead><tr><th>What</th><th>License</th></tr></thead>
          <tbody>
            <tr>
              <td>Code: the web app, Python, Node and R packages, MCP and RAG connectors, scripts</td>
              <td><a href="https://www.apache.org/licenses/LICENSE-2.0">Apache License 2.0</a></td>
            </tr>
            <tr>
              <td>Content: docs, knowledge graph content, datasets we publish, demo video, narration, transcripts, media</td>
              <td><a href="https://creativecommons.org/licenses/by-nc-nd/4.0/">CC BY-NC-ND 4.0</a> (share unchanged, non-commercial, with credit)</td>
            </tr>
            <tr>
              <td>Third-party data and software</td>
              <td>Each source&apos;s own terms, listed above</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p className="muted small">
        Full texts: <a href="https://github.com/biobitworks/moss-piglets-play-pen/blob/main/LICENSE">LICENSE</a>,{" "}
        <a href="https://github.com/biobitworks/moss-piglets-play-pen/blob/main/LICENSE-CONTENT">LICENSE-CONTENT</a>,{" "}
        <a href="https://github.com/biobitworks/moss-piglets-play-pen/blob/main/ACKNOWLEDGEMENTS.md">ACKNOWLEDGEMENTS.md</a>.
      </p>
    </>
  );
}
