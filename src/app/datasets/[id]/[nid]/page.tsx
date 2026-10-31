import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DATASETS, neuron } from "@/lib/datasets";

export const metadata: Metadata = { title: "Neuron · Moss Piglet Play Pen" };
export const dynamic = "force-dynamic";

type P = { id: string; name: string; weight: number; kind: string };

function Partners({ ds, title, rows }: { ds: string; title: string; rows: P[] }) {
  return (
    <div className="card">
      <h3>{title}</h3>
      <table>
        <thead><tr><th>Partner</th><th>Kind</th><th style={{ textAlign: "right" }}>Weight</th></tr></thead>
        <tbody>
          {rows.map((p) => (
            <tr key={p.id + p.kind}>
              <td><Link href={`/datasets/${ds}/${encodeURIComponent(p.id)}`}>{p.name}</Link></td>
              <td>{p.kind}</td>
              <td style={{ textAlign: "right" }}>{p.weight}</td>
            </tr>
          ))}
          {!rows.length && <tr><td colSpan={3} className="muted">None.</td></tr>}
        </tbody>
      </table>
    </div>
  );
}

export default async function NeuronPage({ params }: { params: Promise<{ id: string; nid: string }> }) {
  const { id, nid } = await params;
  const info = DATASETS.find((d) => d.id === id);
  if (!info) notFound();
  const r = neuron(id, decodeURIComponent(nid));
  if (!r) notFound();
  const { neuron: n } = r;
  return (
    <>
      <p className="small"><Link href={`/datasets/${id}`}>← {info.label}</Link></p>
      <h1>{n.name ?? n.id}</h1>
      <div className="card table-scroll">
        <table>
          <tbody>
            {Object.entries(n).map(([k, v]) => (
              <tr key={k}><th style={{ textAlign: "left" }}>{k}</th><td>{Array.isArray(v) ? v.join(", ") : String(v)}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
      {r.hasEdges ? (
        <>
          <p className="small muted">
            {r.totals.upstreamPartners} upstream partners ({r.totals.inputs} synapses or contacts in), {r.totals.downstreamPartners} downstream ({r.totals.outputs} out). Strongest 25 shown.
          </p>
          <div className="grid">
            <Partners ds={id} title="Upstream (inputs)" rows={r.upstream} />
            <Partners ds={id} title="Downstream (outputs)" rows={r.downstream} />
          </div>
        </>
      ) : (
        <p className="small muted">This dataset has no connectivity loaded, only annotations.</p>
      )}
    </>
  );
}
