import type { Metadata } from "next";
import Link from "next/link";
import { graph, sync } from "@/lib/kg/graph";
import type { KGNode } from "@/lib/kg/types";
import { NodeLink, St } from "@/components/Status";

export const metadata: Metadata = { title: "Built vs needed · Moss Piglet Play Pen" };
export const dynamic = "force-dynamic";

const COLS = ["built", "in_progress", "needed", "blocked"] as const;
/** Agents can add thousands of nodes; rendering them all made this page take seconds (docs/STRESS_TEST.md). */
const MAX = 60;

function Board({ nodes }: { nodes: KGNode[] }) {
  return (
    <div className="board">
      {COLS.map((s) => {
        const items = nodes.filter((n) => n.status === s);
        return (
          <div className="card board-col" key={s}>
            <h3>
              <St s={s} /> {items.length}
            </h3>
            <ul>
              {items.slice(0, MAX).map((n) => (
                <li key={n.id}>
                  <NodeLink id={n.id} label={n.label} />
                </li>
              ))}
              {items.length > MAX && <li className="muted">and {items.length - MAX} more (see /api/kg/status)</li>}
              {!items.length && <li className="muted">Nothing here.</li>}
            </ul>
          </div>
        );
      })}
    </div>
  );
}

export default async function GraphPage() {
  await sync();
  const G = graph();
  const all = [...G.nodes.values()];
  const of = (t: string) => all.filter((n) => n.type === t);
  const tools = of("tool");
  const counts = Object.entries(all.reduce<Record<string, number>>((a, n) => ((a[n.type] = (a[n.type] ?? 0) + 1), a), {})).sort((a, b) => b[1] - a[1]);

  return (
    <>
      <h1>Built vs needed</h1>
      <p className="lede">
        Live view of the knowledge graph: what the project has built, what is in progress, and what still needs
        building. Every item is a node with an address that the chat and agent tools use too.
      </p>
      <p className="small muted">
        {all.length} nodes, {G.edges.length} edges. {counts.map(([t, c]) => `${c} ${t}`).join(" · ")}. JSON:{" "}
        <a href="/api/kg/status">/api/kg/status</a>, <a href="/api/kg">/api/kg</a>.
      </p>

      <h2>Capabilities</h2>
      <Board nodes={of("capability")} />

      <h2>Tardigrade pipeline</h2>
      <Board nodes={of("stage")} />

      <h2>Today&rsquo;s tasks</h2>
      <Board nodes={of("task")} />
      <p className="small">
        Timestamps and commits for each task are on the <Link href="/worklog">worklog</Link>.
      </p>

      <h2>Open questions</h2>
      <Board nodes={of("question")} />

      <h2>Existing tools to reuse ({tools.length})</h2>
      <p className="muted small">Already built by the fly connectome community. &ldquo;Fit&rdquo; says whether it works on tardigrade data as is or needs an adapter.</p>
      <div className="card table-scroll">
        <table>
          <thead>
            <tr><th>Tool</th><th>Language</th><th>Install</th><th>Fit</th><th>Stages</th></tr>
          </thead>
          <tbody>
            {tools.map((t) => (
              <tr key={t.id}>
                <td><NodeLink id={t.id} label={t.label} /></td>
                <td>{String(t.props?.language ?? "")}</td>
                <td><code>{String(t.props?.install ?? "")}</code></td>
                <td>{String(t.props?.tardigradeFit ?? "")}</td>
                <td className="small">{(G.out.get(t.id) ?? []).filter((e) => e.type === "serves").map((e) => G.nodes.get(e.to)?.label).join(", ")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
