import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { graph, neighbors, resolveId, sync } from "@/lib/kg/graph";
import { fco } from "@/lib/kg/graph";
import { NodeLink, St } from "@/components/Status";

export const dynamic = "force-dynamic";

type P = { params: Promise<{ id: string[] }> };

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const n = graph().nodes.get(resolveId((await params).id.join("/")));
  return { title: `${n?.label ?? "Node"} · Moss Piglet Play Pen` };
}

export default async function NodePage({ params }: P) {
  await sync();
  const id = resolveId((await params).id.join("/"));
  const n = graph().nodes.get(id);
  if (!n) notFound();
  const links = neighbors(id);
  const props = Object.entries(n.props ?? {}).filter(([, v]) => v !== undefined && v !== null && v !== "");
  return (
    <>
      <p className="small muted"><code>{n.id}</code> · {n.type}: {(fco.nodeTypes as Record<string, string>)[n.type] ?? ""}</p>
      <h1>{n.label}</h1>
      <p><St s={n.status} /></p>
      <p className="lede">{n.description}</p>
      {props.length > 0 && (
        <div className="card table-scroll">
          <table>
            <tbody>
              {props.map(([k, v]) => (
                <tr key={k}>
                  <td>{k}</td>
                  <td>{typeof v === "string" && /^https?:\/\//.test(v) ? <a href={v}>{v}</a> : <code>{typeof v === "string" ? v : JSON.stringify(v)}</code>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <h2>Links ({links.length})</h2>
      <div className="card table-scroll">
        <table>
          <thead><tr><th>Relation</th><th>Node</th><th>Status</th><th>When</th></tr></thead>
          <tbody>
            {links.map((l, i) => (
              <tr key={i}>
                <td>{l.direction === "out" ? l.edge : `← ${l.edge}`}</td>
                <td><NodeLink id={l.node.id} label={l.node.label} /></td>
                <td><St s={l.node.status} /></td>
                <td className="small muted">{l.at ? new Date(l.at).toISOString().replace("T", " ").slice(0, 19) + " UTC" : ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="small muted">JSON: <a href={`/api/kg/node/${n.id.replace(/^fcg:/, "")}`}>/api/kg/node/{n.id.replace(/^fcg:/, "")}</a></p>
    </>
  );
}
