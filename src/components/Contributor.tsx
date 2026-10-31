"use client";

import { useState } from "react";
import { MODULES } from "@/lib/training";
import { useLocalState } from "@/lib/local";

export function Contributor() {
  const [state, update] = useLocalState();
  const [draft, setDraft] = useState("");

  function save(e: React.FormEvent) {
    e.preventDefault();
    const handle = draft.trim().slice(0, 40);
    if (handle) update((s) => ({ ...s, handle }));
  }

  function exportCredits() {
    const data = {
      handle: state.handle,
      trainingPassed: state.passed,
      tasksClaimed: state.claimed,
      exportedAt: new Date().toISOString(),
    };
    const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `playpen-credits-${state.handle || "anonymous"}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="card">
      {state.handle ? (
        <>
          <h3>Signed in as {state.handle}</h3>
          <p className="small muted">
            <button className="btn secondary" onClick={() => update((s) => ({ ...s, handle: "" }))}>Change handle</button>
          </p>
        </>
      ) : (
        <form onSubmit={save}>
          <h3>Pick a handle</h3>
          <p className="small muted">This is the name your contributions are credited to.</p>
          <div className="filters">
            <input type="text" value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="e.g. waterbear42" aria-label="Handle" />
            <button className="btn" type="submit">Save</button>
          </div>
        </form>
      )}
      <h3 style={{ marginTop: 16 }}>Your contributions</h3>
      <ul>
        <li>
          Training passed: {state.passed.length} of {MODULES.length}
          {state.passed.length > 0 && ` (${MODULES.filter((m) => state.passed.includes(m.id)).map((m) => m.title.split(":")[0]).join(", ")})`}
        </li>
        <li>Tasks claimed: {state.claimed.length}</li>
      </ul>
      <button className="btn secondary" onClick={exportCredits}>Export my credits (JSON)</button>
      <p className="small muted">
        For now this lives in your browser only. Shared accounts and a public contributor list come with the real task
        queue.
      </p>
    </div>
  );
}
