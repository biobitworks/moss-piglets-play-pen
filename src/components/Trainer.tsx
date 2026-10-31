"use client";

import Link from "next/link";
import { useState } from "react";
import { MODULES, PASS_MARK, type Module } from "@/lib/training";
import { useLocalState } from "@/lib/local";
import { Figure } from "./Figure";

export function Trainer() {
  const [state] = useLocalState();
  const [active, setActive] = useState<string | null>(null);
  const mod = MODULES.find((m) => m.id === active);

  if (mod) return <Quiz module={mod} onExit={() => setActive(null)} />;

  return (
    <div className="grid">
      {MODULES.map((m) => {
        const passed = state.passed.includes(m.id);
        return (
          <div className="card" key={m.id}>
            <h3>{m.title}</h3>
            <p className="muted small">{m.questions.length} questions</p>
            <p>{passed ? <span className="pill ok">Passed</span> : <span className="pill">Not started</span>}</p>
            <button className={passed ? "btn secondary" : "btn"} onClick={() => setActive(m.id)}>
              {passed ? "Practice again" : "Start"}
            </button>
          </div>
        );
      })}
    </div>
  );
}

function Quiz({ module, onExit }: { module: Module; onExit: () => void }) {
  const [, update] = useLocalState();
  const [i, setI] = useState(-1);
  const [picked, setPicked] = useState<number | null>(null);
  const [score, setScore] = useState(0);

  if (i === -1) {
    return (
      <div className="card">
        <h2 style={{ marginTop: 0 }}>{module.title}</h2>
        <p>{module.intro}</p>
        <div className="btn-row">
          <button className="btn" onClick={() => setI(0)}>Begin</button>
          <button className="btn secondary" onClick={onExit}>Back</button>
        </div>
      </div>
    );
  }

  if (i >= module.questions.length) {
    const passed = score / module.questions.length >= PASS_MARK;
    return (
      <div className="card">
        <h2 style={{ marginTop: 0 }}>{passed ? "Module passed" : "Almost there"}</h2>
        <p>
          You got {score} of {module.questions.length} right.{" "}
          {passed
            ? "That kind of task is now unlocked on the task board."
            : "Every answer needs to be right to unlock tasks. Read the explanations and try again."}
        </p>
        <div className="btn-row">
          {passed ? (
            <Link href="/tasks" className="btn">Go to tasks</Link>
          ) : (
            <button className="btn" onClick={() => { setI(0); setScore(0); setPicked(null); }}>Try again</button>
          )}
          <button className="btn secondary" onClick={onExit}>All modules</button>
        </div>
      </div>
    );
  }

  const q = module.questions[i];
  const answered = picked !== null;

  function choose(c: number) {
    if (answered) return;
    setPicked(c);
    const right = c === q.answer;
    const nextScore = score + (right ? 1 : 0);
    setScore(nextScore);
    if (i === module.questions.length - 1 && nextScore / module.questions.length >= PASS_MARK) {
      update((s) => (s.passed.includes(module.id) ? s : { ...s, passed: [...s.passed, module.id] }));
    }
  }

  return (
    <div className="card">
      <p className="small muted">
        {module.title} · question {i + 1} of {module.questions.length}
      </p>
      <Figure id={q.figure} />
      <h3 style={{ marginTop: 14 }}>{q.prompt}</h3>
      <div className="choices">
        {q.choices.map((c, k) => (
          <button
            key={k}
            className={`choice ${answered && k === q.answer ? "right" : ""} ${answered && k === picked && k !== q.answer ? "wrong" : ""}`}
            onClick={() => choose(k)}
            disabled={answered}
          >
            {c}
          </button>
        ))}
      </div>
      {answered && (
        <>
          <p className="feedback">
            <strong>{picked === q.answer ? "Right." : "Not quite."}</strong> {q.explanation}
          </p>
          <button className="btn" onClick={() => { setI(i + 1); setPicked(null); }}>
            {i === module.questions.length - 1 ? "Finish" : "Next"}
          </button>
        </>
      )}
    </div>
  );
}
