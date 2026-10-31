import type { Metadata } from "next";
import { gitCommits, graph, worklog, sync } from "@/lib/kg/graph";
import { NodeLink, St } from "@/components/Status";

export const metadata: Metadata = { title: "Worklog · Moss Piglet Play Pen" };
export const dynamic = "force-dynamic";

const fmt = (iso?: unknown) => (typeof iso === "string" ? new Date(iso).toISOString().slice(11, 16) + " UTC" : "");
const pt = (iso?: unknown) =>
  typeof iso === "string" ? new Date(iso).toLocaleTimeString("en-US", { timeZone: "America/Los_Angeles", hour: "numeric", minute: "2-digit" }) + " PT" : "";

export default async function WorklogPage() {
  await sync();
  const tasks = [...graph().nodes.values()].filter((n) => n.type === "task");
  const entries = worklog();
  const commits = gitCommits().slice().reverse();
  return (
    <>
      <h1>Worklog</h1>
      <p className="lede">
        Proof of work. Each task has a planned 15-minute slot; when it is finished, the time and the commit that did it
        are written into the knowledge graph. Times are shown in UTC and Pacific.
      </p>

      <h2>Tasks: plan vs actual</h2>
      <div className="card table-scroll">
        <table>
          <thead><tr><th>Task</th><th>Slot</th><th>Finished</th><th>Commit</th><th>Status</th></tr></thead>
          <tbody>
            {tasks.map((t) => {
              const sha = t.props?.commit as string | undefined;
              return (
                <tr key={t.id}>
                  <td><NodeLink id={t.id} label={t.label} /></td>
                  <td className="small">{pt(t.props?.slotStart).replace(/ [AP]M PT$/, "")}–{pt(t.props?.slotEnd)}</td>
                  <td className="small">{t.props?.completedAt ? `${pt(t.props.completedAt)} (${fmt(t.props.completedAt)})` : ""}</td>
                  <td>{sha ? <NodeLink id={`fcg:commit/${sha.slice(0, 7)}`} label={sha.slice(0, 7)} /> : ""}</td>
                  <td><St s={t.status} /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <h2>Log entries ({entries.length})</h2>
      <ul className="timeline card">
        {entries.slice().reverse().map((e, i) => (
          <li key={i}>
            <time dateTime={e.at}>{pt(e.at)}<br />{fmt(e.at)}</time>
            <div>
              {e.kind === "push" ? <>Pushed <code>{e.commit.slice(0, 7)}</code> to <code>{e.branch}</code></> : <><strong>{e.task}</strong> {e.status}: {e.summary} <span className="small muted">(commit <code>{e.commit.slice(0, 7)}</code>)</span></>}
            </div>
          </li>
        ))}
      </ul>

      <h2>Commits and merges ({commits.length})</h2>
      <ul className="timeline card">
        {commits.map((c) => (
          <li key={c.sha}>
            <time dateTime={c.at}>{pt(c.at)}<br />{fmt(c.at)}</time>
            <div>
              {c.isMerge ? <strong>Merge </strong> : null}
              <NodeLink id={`fcg:commit/${c.sha.slice(0, 7)}`} label={c.sha.slice(0, 7)} /> {c.subject}
            </div>
          </li>
        ))}
      </ul>
      <p className="small muted">JSON: <a href="/api/kg/worklog">/api/kg/worklog</a>. Times come from git and from <code>npm run log</code>.</p>
    </>
  );
}
