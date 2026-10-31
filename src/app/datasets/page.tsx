import type { Metadata } from "next";
import Link from "next/link";
import { list } from "@/lib/datasets";
import { NodeLink } from "@/components/Status";

export const metadata: Metadata = { title: "Datasets · Moss Piglet Play Pen" };
export const dynamic = "force-dynamic";

export default async function DatasetsPage() {
  const ds = list();
  return (
    <>
      <h1>Datasets</h1>
      <p className="lede">
        Connectome data you can browse here and query from chat, MCP and REST. Tardimap has not released the tardigrade
        data yet, so the tardigrade entry is a mock; the C. elegans connectome is the real stand-in at tardigrade scale.
      </p>
      <div className="grid">
        {ds.map((d) => (
          <div className="card" key={d.id} data-testid={`dataset-${d.id}`}>
            <h3>
              <Link href={`/datasets/${d.id}`}>{d.label}</Link>
            </h3>
            <p className="small muted">
              <em>{d.species}</em> · {d.kind}
            </p>
            <p className="small">{d.summary}</p>
            <p className="small">
              {d.loaded ? (
                <strong>
                  {d.neurons.toLocaleString()} cells{d.edges ? `, ${d.edges.toLocaleString()} connections` : ""}
                </strong>
              ) : (
                <span className="muted">
                  Not fetched on this server. Run <code>npm run data:fetch</code>.
                </span>
              )}
            </p>
            <p className="small muted">
              Graph node: <NodeLink id={d.kg} label={d.kg} />
            </p>
          </div>
        ))}
      </div>
      <p className="small muted">
        JSON: <a href="/api/datasets">/api/datasets</a>, <code>/api/datasets/&lt;id&gt;/neurons?q=</code>,{" "}
        <code>/api/datasets/&lt;id&gt;/neurons/&lt;neuron&gt;</code>. Sources and licences are in <code>docs/DATASETS.md</code>.
      </p>
    </>
  );
}
