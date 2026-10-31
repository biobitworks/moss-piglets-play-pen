"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { TASK_INFO, type Task, type TaskKind } from "@/lib/data/tasks";
import { useLocalState } from "@/lib/local";

const PAGE = 25;

export function TaskBoard({ tasks, regions, isMock }: { tasks: Task[]; regions: string[]; isMock: boolean }) {
  const [state, update] = useLocalState();
  const [kind, setKind] = useState<TaskKind | "all">("all");
  const [region, setRegion] = useState("all");
  const [limit, setLimit] = useState(PAGE);
  const claimed = useMemo(() => new Set(state.claimed.map((c) => c.taskId)), [state.claimed]);

  const filtered = tasks.filter(
    (t) => (kind === "all" || t.kind === kind) && (region === "all" || t.region === region),
  );

  function claim(t: Task) {
    update((s) => ({ ...s, claimed: [...s.claimed, { taskId: t.id, at: new Date().toISOString() }] }));
  }
  function release(t: Task) {
    update((s) => ({ ...s, claimed: s.claimed.filter((c) => c.taskId !== t.id) }));
  }

  return (
    <>
      <h2>Open tasks ({filtered.length})</h2>
      {!state.handle && (
        <p className="banner">
          Pick a handle on the <Link href="/contributors">Contributors</Link> page so your claims are credited to you.
        </p>
      )}
      <div className="filters">
        <select value={kind} onChange={(e) => { setKind(e.target.value as TaskKind | "all"); setLimit(PAGE); }} aria-label="Task type">
          <option value="all">All task types</option>
          {Object.entries(TASK_INFO).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <select value={region} onChange={(e) => { setRegion(e.target.value); setLimit(PAGE); }} aria-label="Region">
          <option value="all">All regions</option>
          {regions.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
      </div>
      <div className="task-list">
        {filtered.slice(0, limit).map((t) => {
          const unlocked = state.passed.includes(t.requires);
          const mine = claimed.has(t.id);
          return (
            <div className="card task" key={t.id}>
              <div>
                <strong>{t.title}</strong>
                <div className="small muted">
                  {t.region} · <span className="pill">{t.difficulty}</span>
                </div>
              </div>
              <div className="btn-row" style={{ margin: 0 }}>
                {mine ? (
                  <>
                    <button className="btn secondary" disabled title={isMock ? "The viewer opens once Tardimap data is connected" : undefined}>
                      Open in viewer
                    </button>
                    <button className="btn secondary" onClick={() => release(t)}>Release</button>
                  </>
                ) : unlocked ? (
                  <button className="btn" onClick={() => claim(t)} disabled={!state.handle}>Claim</button>
                ) : (
                  <Link href="/train" className="btn secondary">Train to unlock</Link>
                )}
              </div>
            </div>
          );
        })}
      </div>
      {filtered.length > limit && (
        <div className="btn-row">
          <button className="btn secondary" onClick={() => setLimit(limit + PAGE)}>Show more</button>
        </div>
      )}
      <p className="small muted">
        Claims are saved in this browser for now. A shared task queue with review (several people per task, plus expert
        checks) comes once Tardimap data is connected.
      </p>
    </>
  );
}
