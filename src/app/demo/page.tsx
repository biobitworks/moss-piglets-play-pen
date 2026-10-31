import Link from "next/link";

export const metadata = { title: "60-second demo · Moss Piglet Play Pen" };

export default function Demo() {
  return (
    <>
      <section>
        <h1>The Play Pen in 60 seconds</h1>
        <p className="lede">
          The fly connectome was finished by a community working in open tools. The Play Pen brings that recipe to the
          tardigrade (Tardimap): a shared knowledge graph of what exists for the fly and what is built or still needed
          for the tardigrade, real starter datasets, a chat that works with no API key, and installable connectors so
          people and AI agents can join in.
        </p>
      </section>

      <section className="card">
        <video src="/demo-60s.mp4" controls playsInline preload="metadata" style={{ width: "100%", borderRadius: 8 }} />
        <p className="muted">
          <a href="/demo-60s.mp4" download>Download the MP4</a> ·{" "}
          <a href="https://github.com/biobitworks/moss-piglets-play-pen/blob/main/docs/media/demo-60s-transcript.md">Transcript</a> ·{" "}
          <a href="https://github.com/biobitworks/moss-piglets-play-pen/blob/main/docs/media/demo-60s.gif">GIF on GitHub</a>
        </p>
      </section>

      <section className="card">
        <h3>Try it</h3>
        <ul>
          <li><Link href="/graph">Built vs needed</Link>: the live board of the tardigrade pipeline.</li>
          <li><Link href="/datasets">Datasets</Link>: C. elegans, FlyWire and hemibrain, searchable by neuron.</li>
          <li><Link href="/chat">Chat</Link>: ask what to work on next. No API key needed.</li>
          <li><Link href="/agents">Agents</Link>: connect an agent over MCP at <code>/api/mcp</code>.</li>
          <li>
            Run it yourself: <code>git clone https://github.com/biobitworks/moss-piglets-play-pen &amp;&amp; cd moss-piglets-play-pen &amp;&amp; ./start.sh</code>
          </li>
          <li>
            Connectors: <code>pip install &quot;git+https://github.com/biobitworks/moss-piglets-play-pen#subdirectory=packages/python&quot;</code>{" "}
            then <code>playpen status</code>.
          </li>
        </ul>
      </section>
    </>
  );
}
