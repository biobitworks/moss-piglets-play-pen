import type { Metadata } from "next";
import { getDataset, summarize, STAGES, STAGE_LABELS, type Breakdown } from "@/lib/data";
import { StageBar, StageLegend } from "@/components/Bar";
import { MockBanner } from "@/components/MockBanner";

export const metadata: Metadata = { title: "Progress · Moss Piglet Play Pen" };

function Rows({ items }: { items: Breakdown[] }) {
  return (
    <div className="rows">
      {items.map((b) => (
        <div className="row" key={b.key}>
          <div>
            <strong style={{ textTransform: b.key === b.key.toLowerCase() ? "capitalize" : undefined }}>{b.key}</strong>
            <div className="small muted">{b.total} neurons</div>
          </div>
          <StageBar byStage={b.byStage} total={b.total} />
          <div className="pct">{Math.round(b.progress * 100)}%</div>
        </div>
      ))}
    </div>
  );
}

export default async function ProgressPage() {
  const ds = await getDataset();
  const { overall, byRegion, byClass } = summarize(ds);
  return (
    <>
      <h1>Progress</h1>
      <p className="lede">
        Every known neuron moves through the same pipeline the fly connectome used: segmented, proofread, synapses
        attached, typed, then named.
      </p>
      <MockBanner dataset={ds} />
      <div className="card">
        <StageLegend />
        <Rows items={[overall]} />
      </div>

      <h2>By body region</h2>
      <div className="card"><Rows items={byRegion} /></div>

      <h2>By cell class</h2>
      <div className="card"><Rows items={byClass} /></div>

      <h2>Counts by stage</h2>
      <div className="card table-scroll">
        <table>
          <thead>
            <tr>
              <th>Region</th>
              {STAGES.map((s) => <th key={s}>{STAGE_LABELS[s]}</th>)}
            </tr>
          </thead>
          <tbody>
            {[...byRegion, overall].map((b) => (
              <tr key={b.key}>
                <td>{b.key}</td>
                {STAGES.map((s) => <td key={s}>{b.byStage[s]}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="small muted">
        Source <code>{ds.source}</code>, version <code>{ds.version}</code>. Percentages are average progress through the
        pipeline. Machine-readable: <a href="/api/progress">/api/progress</a>.
      </p>
    </>
  );
}
