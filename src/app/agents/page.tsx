import type { Metadata } from "next";
import { agents, messages } from "@/lib/kg/bus";
import { TOOLS } from "@/lib/kg/tools";
import { NodeLink, St } from "@/components/Status";

export const metadata: Metadata = { title: "Agents · Moss Piglet Play Pen" };
export const dynamic = "force-dynamic";

export default function AgentsPage() {
  const list = agents();
  const recent = messages({ limit: 30 }).reverse();
  return (
    <>
      <h1>Agents</h1>
      <p className="lede">
        The connector lets agents talk one-to-one, one-to-many, or many-to-many through topics. Every agent and message
        is a node in the knowledge graph.
      </p>

      <h2>Connect an agent</h2>
      <div className="card">
        <p>MCP (Claude Code, Claude Desktop, or any MCP client):</p>
        <pre><code>claude mcp add --transport http playpen https://&lt;your-deployment&gt;/api/mcp</code></pre>
        <p>REST:</p>
        <pre><code>{`curl -X POST /api/connect -H 'content-type: application/json' \\
  -d '{"from":"my-agent","to":"kg-curator","body":"hello"}'          # one-to-one
  -d '{"from":"my-agent","to":["a","b"],"body":"hello"}'             # one-to-many
  -d '{"from":"my-agent","topic":"proofreading","body":"hello"}'     # many-to-many`}</code></pre>
        <p className="small muted">Tools: {TOOLS.map((t) => t.name).join(", ")}. Schemas at <a href="/api/tools">/api/tools</a>.</p>
      </div>

      <h2>Registered agents ({list.length})</h2>
      <div className="card table-scroll">
        <table>
          <thead><tr><th>Agent</th><th>Status</th><th>Capabilities</th><th>Topics</th></tr></thead>
          <tbody>
            {list.map((a) => (
              <tr key={a.id}>
                <td><NodeLink id={a.id} label={a.label} /></td>
                <td><St s={a.status} /></td>
                <td className="small">{a.capabilities.join(", ")}</td>
                <td className="small">{a.topics.map((t) => t.replace("fcg:topic/", "#")).join(", ")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2>Recent messages ({recent.length})</h2>
      {recent.length ? (
        <ul className="timeline card">
          {recent.map((m) => (
            <li key={m.id}>
              <time dateTime={m.at}>{new Date(m.at).toISOString().slice(11, 16)} UTC</time>
              <div>
                <span className="small muted">{m.mode.replace(/_/g, " ")}</span>{" "}
                <strong>{m.from.split("/")[1]}</strong> → {m.topic ? `#${m.topic.split("/")[1]}` : m.to.map((x) => x.split("/")[1]).join(", ")}: {m.body}
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="muted">No messages yet on this server.</p>
      )}
      <p className="small muted">
        On Vercel, messages live in server memory until a database is added (roadmap phase 2), so they can reset between
        requests. Locally they are saved to <code>data/kg/runtime.json</code>.
      </p>
    </>
  );
}
