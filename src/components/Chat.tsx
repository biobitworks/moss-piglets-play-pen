"use client";

import Link from "next/link";
import { Fragment, useEffect, useState } from "react";

type Msg = {
  role: "user" | "assistant";
  content: string;
  meta?: { toolCalls?: { name: string }[]; retrieved?: string[]; model?: string | null; backend?: string; note?: string };
};
type Backend = { id: string; label: string; available: boolean; model: string | null; models?: string[]; note?: string };

const EXAMPLES = [
  "What still needs building for the tardigrade?",
  "Which Python package reads FlyWire segmentation, and does it fit Tardimap?",
  "When was each task finished, and by which commit?",
  "What is blocked, and on whom?",
];

export const nodeHref = (id: string) => `/node/${id.replace(/^fcg:/, "")}`;

/** Turns `fcg:type/slug` addresses into links and keeps the rest as text. */
export function Linkify({ text }: { text: string }) {
  const parts = text.split(/(`?fcg:[a-z-]+\/[A-Za-z0-9._-]+`?)/g);
  return (
    <>
      {parts.map((p, i) => {
        const m = /^`?(fcg:[a-z-]+\/[A-Za-z0-9._-]+)`?$/.exec(p);
        return m ? (
          <Link key={i} href={nodeHref(m[1])}>
            <code>{m[1]}</code>
          </Link>
        ) : (
          <Fragment key={i}>{p}</Fragment>
        );
      })}
    </>
  );
}

export function Chat() {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [backends, setBackends] = useState<Backend[]>([]);
  const [backend, setBackend] = useState("");
  const [localPick, setLocalPick] = useState("");

  useEffect(() => {
    fetch("/api/chat")
      .then((r) => r.json())
      .then((d: { default: string; backends: Backend[] }) => {
        setBackends(d.backends);
        setBackend(d.default);
      })
      .catch(() => {});
  }, []);
  const current = backends.find((b) => b.id === backend);

  async function ask(q: string) {
    if (!q.trim() || busy) return;
    const next: Msg[] = [...msgs, { role: "user", content: q.trim() }];
    setMsgs(next);
    setDraft("");
    setBusy(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          backend: backend || undefined,
          model: backend === "local" && localPick ? localPick : undefined,
          messages: next.map(({ role, content }) => ({ role, content })),
        }),
      });
      const data = await res.json();
      setMsgs([...next, { role: "assistant", content: data.reply ?? data.error ?? "No answer.", meta: data }]);
    } catch (e) {
      setMsgs([...next, { role: "assistant", content: `Request failed: ${(e as Error).message}` }]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card chat">
      <div className="filters" style={{ marginTop: 0 }}>
        <label className="small" htmlFor="backend">Model</label>
        <select id="backend" value={backend} onChange={(e) => setBackend(e.target.value)} aria-label="Chat model">
          {backends.map((b) => (
            <option key={b.id} value={b.id} disabled={!b.available}>
              {b.label}
              {b.model ? ` · ${b.model}` : ""}
              {!b.available && b.note ? ` (${b.note})` : ""}
            </option>
          ))}
        </select>
        {backend === "local" && current?.models && current.models.length > 0 && (
          <select value={localPick} onChange={(e) => setLocalPick(e.target.value)} aria-label="Local model">
            <option value="">{current.model} (default)</option>
            {current.models.filter((m) => m !== current.model).map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        )}
      </div>
      {msgs.length === 0 && (
        <div className="btn-row" style={{ marginTop: 0 }}>
          {EXAMPLES.map((e) => (
            <button key={e} className="btn secondary small" onClick={() => ask(e)}>
              {e}
            </button>
          ))}
        </div>
      )}
      <div className="chat-log">
        {msgs.map((m, i) => (
          <div key={i} className={`bubble ${m.role}`}>
            <div className="bubble-text">
              <Linkify text={m.content} />
            </div>
            {m.meta && (m.meta.toolCalls?.length || m.meta.retrieved?.length) ? (
              <div className="small muted">
                {m.meta.toolCalls?.length ? `Tools: ${m.meta.toolCalls.map((t) => t.name).join(", ")}. ` : ""}
                {m.meta.retrieved?.length ? `Retrieved ${m.meta.retrieved.length} nodes.` : ""}
                {m.meta.backend ? ` Backend: ${m.meta.backend}.` : ""}
                {m.meta.model ? ` Model: ${m.meta.model}.` : ""}
                {m.meta.note ? ` ${m.meta.note}` : ""}
              </div>
            ) : null}
          </div>
        ))}
        {busy && <div className="bubble assistant muted">Looking in the graph…</div>}
      </div>
      <form
        className="filters"
        onSubmit={(e) => {
          e.preventDefault();
          ask(draft);
        }}
      >
        <input type="text" value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Ask about what's built, what's needed, or which tool to use" aria-label="Message" style={{ flex: 1 }} />
        <button className="btn" type="submit" disabled={busy || !draft.trim()}>
          Send
        </button>
      </form>
    </div>
  );
}
