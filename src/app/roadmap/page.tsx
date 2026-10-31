import type { Metadata } from "next";

export const metadata: Metadata = { title: "Roadmap · Moss Piglet Play Pen" };

type S = "done" | "open" | "unknown";
const RECIPE: { stage: string; fly: string; tardigrade: string; status: S }[] = [
  { stage: "EM imaging", fly: "Complete for six datasets", tardigrade: "Complete (“Riker” dataset)", status: "done" },
  { stage: "Automated segmentation", fly: "Done, versioned in CAVE", tardigrade: "In progress, tool not public", status: "unknown" },
  { stage: "Proofreading", fly: "Community proofreading in FlyWire", tardigrade: "Who and how not yet public", status: "open" },
  { stage: "Synapse detection", fly: "Automated, then checked", tardigrade: "Unknown", status: "unknown" },
  { stage: "Cell typing and naming", fly: "~8,000 types, community annotated", tardigrade: "Not started publicly", status: "open" },
  { stage: "Public release", fly: "Codex and neuPrint", tardigrade: "Not yet", status: "open" },
];

export default function RoadmapPage() {
  return (
    <>
      <h1>Roadmap</h1>
      <p className="lede">
        How the fly connectome got finished, where the tardigrade stands on each step, and what the Play Pen does next.
      </p>

      <h2>The fly recipe, mapped to the tardigrade</h2>
      <div className="card table-scroll">
        <table>
          <thead><tr><th>Stage</th><th>Fly</th><th>Tardigrade</th><th>Status</th></tr></thead>
          <tbody>
            {RECIPE.map((r) => (
              <tr key={r.stage}>
                <td>{r.stage}</td>
                <td>{r.fly}</td>
                <td>{r.tardigrade}</td>
                <td className={`status-${r.status}`}>{r.status === "done" ? "Done" : r.status === "open" ? "Gap" : "Ask Tardimap"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2>Next steps</h2>
      <ol className="steps">
        <li>
          <strong>Step 0: talk to Tardimap.</strong> Ask the consortium (contact@tardimap.org) what tools they use for
          segmentation and proofreading, whether they want outside contributors and on what terms, and where the
          bottleneck is today.
        </li>
        <li>
          <strong>Step 1: this MVP, on stand-in data.</strong> Progress view, training with known answers, task board,
          contributor credit. Live now with a mock dataset.
          <ul>
            <li>Swap the drawn training figures for real FlyWire neurons from Codex static downloads.</li>
            <li>Shared accounts and a real task queue, so claims and credit work across devices.</li>
            <li>Open tasks straight in Neuroglancer.</li>
          </ul>
        </li>
        <li>
          <strong>Step 2: point it at Tardimap.</strong> Once access is agreed, switch the data adapter to Tardimap&rsquo;s
          segmentation and open real tasks to a first group of contributors, with review.
        </li>
        <li>
          <strong>Later: compare the two animals.</strong> Link tardigrade neurons to candidate fly counterparts with
          tools like cocoa and coconat.
        </li>
      </ol>
      <p className="muted small">
        Full requirements and open questions:{" "}
        <a href="https://github.com/biobitworks/moss-piglets-play-pen/blob/main/docs/REQUIREMENTS.md">docs/REQUIREMENTS.md</a>.
      </p>
    </>
  );
}
