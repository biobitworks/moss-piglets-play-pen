import Link from "next/link";
import { getDataset, summarize, tasksFor } from "@/lib/data";
import { StageBar, StageLegend } from "@/components/Bar";
import { MockBanner } from "@/components/MockBanner";

export default async function Home() {
  const ds = await getDataset();
  const { overall } = summarize(ds);
  const openTasks = tasksFor(ds).length;

  return (
    <>
      <section>
        <h1>Help finish the tardigrade connectome.</h1>
        <p className="lede">
          A tardigrade (a &ldquo;moss piglet&rdquo;) has fewer than 600 neurons, small enough for a community to map
          every one. The fly connectome was finished by hundreds of volunteers proofreading in open tools. The Play Pen
          brings that recipe to <a href="https://tardimap.org/">Tardimap</a>: learn on fly-style examples, pick up a
          small task, and get credit.
        </p>
        <div className="btn-row">
          <Link href="/train" className="btn">Start training</Link>
          <Link href="/tasks" className="btn secondary">Browse tasks</Link>
          <Link href="/roadmap" className="btn secondary">See the roadmap</Link>
          <Link href="/demo" className="btn secondary">Watch the 60-second demo</Link>
        </div>
      </section>

      <MockBanner dataset={ds} />

      <section className="card">
        <h3>Where the tardigrade connectome stands</h3>
        <StageBar byStage={overall.byStage} total={overall.total} />
        <StageLegend />
        <div className="stats">
          <div>
            <div className="stat">{overall.total}</div>
            <div className="muted">neurons known</div>
          </div>
          <div>
            <div className="stat">{Math.round(overall.done * 100)}%</div>
            <div className="muted">fully named</div>
          </div>
          <div>
            <div className="stat">{Math.round(overall.progress * 100)}%</div>
            <div className="muted">of pipeline work done</div>
          </div>
          <div>
            <div className="stat">{openTasks}</div>
            <div className="muted">open tasks</div>
          </div>
        </div>
        <p className="small muted">
          Dataset version <code>{ds.version}</code>. <Link href="/progress">Full breakdown</Link>.
        </p>
      </section>

      <h2>How it works</h2>
      <div className="grid">
        <div className="card">
          <h3>1. Train on the fly</h3>
          <p className="muted">
            Short practice rounds with known answers, based on how FlyWire proofreaders learned to spot merge errors,
            split errors and real synapses.
          </p>
        </div>
        <div className="card">
          <h3>2. Pick a small task</h3>
          <p className="muted">
            What&rsquo;s left of the tardigrade connectome is broken into bite-sized jobs: proofread a neuron, check its
            synapses, propose a cell type.
          </p>
        </div>
        <div className="card">
          <h3>3. Get credit</h3>
          <p className="muted">
            Every contribution is attributed, the way FlyWire credited its proofreaders and annotators in the papers.
          </p>
        </div>
      </div>

      <h2>Tardigrade and fly, side by side</h2>
      <div className="table-scroll card">
        <table>
          <thead>
            <tr><th /><th>Tardigrade (Tardimap)</th><th>Fly (FlyWire and partners)</th></tr>
          </thead>
          <tbody>
            <tr><td>Neurons</td><td>Fewer than ~600, whole body</td><td>~140k brain (FlyWire) to ~166k whole CNS</td></tr>
            <tr><td>Imaging</td><td>Complete (&ldquo;Riker&rdquo; EM dataset)</td><td>Complete</td></tr>
            <tr><td>Reconstruction</td><td>In progress</td><td>Finished and proofread</td></tr>
            <tr><td>How it got done</td><td>To be decided</td><td>Open community proofreading in shared tools</td></tr>
          </tbody>
        </table>
      </div>
    </>
  );
}
