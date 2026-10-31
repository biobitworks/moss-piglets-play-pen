import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DATASETS, searchNeurons, summary } from "@/lib/datasets";

export const metadata: Metadata = { title: "Dataset · Moss Piglet Play Pen" };
export const dynamic = "force-dynamic";

const COLS = ["name", "type", "class", "super_class", "kind", "nt", "side", "region", "stage", "hemilineage", "pre", "post"];

function Counts({ title, rows }: { title: string; rows: [string, number][] }) {
  if (!rows.length) return null;
  return (
    <div className="card">
      <h3>{title}</h3>
      <table>
        <tbody>
          {rows.map(([k, v]) => (
            <tr key={k}>
              <td>{k}</td>
              <td style={{ textAlign: "right" }}>{v.toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default async function DatasetPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ q?: string; offset?: string }> }) {
  const { id } = await params;
  const { q = "", offset = "0" } = await searchParams;
  const info = DATASETS.find((d) => d.id === id);
  if (!info) notFound();
  const s = summary(id);
  if (!s) {
    return (
      <>
        <h1>{info.label}</h1>
        <p className="lede">This dataset is not fetched on this server yet. Run <code>npm run data:fetch</code> and reload.</p>
        <p className="small">Source: <a href={info.source}>{info.source}</a></p>
      </>
    );
  }
  const r = (searchNeurons(id, q, { limit: 50, offset: Number(offset) || 0 }))!;
  const cols = COLS.filter((c) => r.neurons.some((n) => n[c] !== undefined));
  const next = r.offset + r.limit < r.total ? `/datasets/${id}?q=${encodeURIComponent(q)}&offset=${r.offset + r.limit}` : null;
  return (
    <>
      <p className="small"><Link href="/datasets">← Datasets</Link></p>
      <h1>{s.label}</h1>
      <p className="lede">{s.summary}</p>
      <p className="small muted">
        <em>{s.species}</em> · {s.neurons.toLocaleString()} cells · {s.types.toLocaleString()} cell types
        {s.edges ? ` · ${s.edges.toLocaleString()} connections` : " · no connectivity loaded"} · {s.citation} · {s.license}
      </p>
      <p className="small"><strong>Why it is here:</strong> {s.why}</p>

      <form method="get" className="card" style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <input type="text" name="q" defaultValue={q} placeholder="Search by name, type, class, transmitter, side…" style={{ flex: 1, minWidth: 220 }} aria-label="Search neurons" />
        <button className="btn" type="submit">Search</button>
        <span className="small muted" data-testid="match-count">{r.total.toLocaleString()} match{r.total === 1 ? "" : "es"}</span>
      </form>

      <div className="card table-scroll">
        <table data-testid="neuron-table">
          <thead>
            <tr><th>id</th>{cols.map((c) => <th key={c}>{c.replace("_", " ")}</th>)}</tr>
          </thead>
          <tbody>
            {r.neurons.map((n) => (
              <tr key={n.id}>
                <td><Link href={`/datasets/${id}/${encodeURIComponent(n.id)}`}>{n.id}</Link></td>
                {cols.map((c) => <td key={c}>{String(n[c] ?? "")}</td>)}
              </tr>
            ))}
            {!r.neurons.length && <tr><td colSpan={cols.length + 1} className="muted">No matches.</td></tr>}
          </tbody>
        </table>
        {next && <p className="small"><Link href={next}>Next 50 →</Link></p>}
      </div>

      {s.hubs.length > 0 && (
        <>
          <h2>Most connected</h2>
          <p className="small">
            {s.hubs.map((h, i) => (
              <span key={h.id}>
                {i ? " · " : ""}
                <Link href={`/datasets/${id}/${encodeURIComponent(h.id)}`}>{h.name ?? h.id}</Link> ({h.degree})
              </span>
            ))}
          </p>
        </>
      )}
      <h2>Composition</h2>
      <div className="grid">
        <Counts title="Super class / kind" rows={s.bySuperClass} />
        <Counts title="Class" rows={s.byClass} />
        <Counts title="Neurotransmitter" rows={s.byNt} />
        <Counts title="Pipeline stage" rows={s.byStage} />
        <Counts title="Side" rows={s.bySide} />
      </div>
    </>
  );
}
