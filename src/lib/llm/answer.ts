import { graph, status, worklog } from "@/lib/kg/graph";
import type { KGNode } from "@/lib/kg/types";
import { search } from "@/lib/kg/vector";

/**
 * Answers from the graph alone, with no model and no API key.
 * It picks an intent from the question (next steps, blockers, packages, timeline)
 * and reads the graph structure for it, then adds the closest search hits.
 */

const DONE = new Set(["built", "external"]);
const WORK_TYPES = new Set(["task", "capability", "stage", "question"]);
const HISTORY = new Set(["commit", "pr", "message"]);
const code = (id: string) => `\`${id}\``;

type Intent = "next" | "blocked" | "tools" | "timeline" | "lookup";

export function intentOf(q: string): Intent {
  const s = q.toLowerCase();
  if (/\b(block|blocked|blocker|stuck|waiting|on whom|who owes)\b/.test(s)) return "blocked";
  if (/\b(when|timeline|worklog|commit|commits|finished|completed|proof|history)\b/.test(s)) return "timeline";
  if (/\b(package|packages|library|libraries|tool|tools|install|python|r package|pip|cran|which .* use)\b/.test(s)) return "tools";
  if (/\b(next|need|needs|needed|todo|to do|missing|remain|remaining|left|build|roadmap|plan|start|contribute|help)\b/.test(s)) return "next";
  return "lookup";
}

/** What a work node is waiting on: unfinished dependencies and open questions that block it. */
function waitingOn(n: KGNode): KGNode[] {
  const G = graph();
  const deps = (G.out.get(n.id) ?? []).filter((e) => e.type === "dependsOn" || e.type === "needs").map((e) => G.nodes.get(e.to)!);
  const blockers = (G.in.get(n.id) ?? []).filter((e) => e.type === "blocks").map((e) => G.nodes.get(e.from)!);
  return [...deps, ...blockers].filter((d) => d && !DONE.has(d.status));
}

function openWork(): KGNode[] {
  return [...graph().nodes.values()].filter((n) => WORK_TYPES.has(n.type) && !DONE.has(n.status));
}

const order = (n: KGNode) => ({ in_progress: 0, needed: 1, blocked: 2 })[n.status as "needed"] ?? 3;
const byOrder = (a: KGNode, b: KGNode) => order(a) - order(b) || a.type.localeCompare(b.type) || a.id.localeCompare(b.id);

function nextSteps(): string[] {
  const open = openWork().filter((n) => n.type !== "question").sort(byOrder);
  const ready = open.filter((n) => n.status !== "blocked" && waitingOn(n).length === 0);
  const waiting = open.filter((n) => !ready.includes(n));
  const lines = ["Ready to start now (nothing unfinished in the way):"];
  lines.push(...(ready.length ? ready.slice(0, 8).map((n) => `- ${code(n.id)} ${n.label} (${n.status}). ${n.description}`) : ["- Nothing is unblocked right now."]));
  if (waiting.length) {
    lines.push("", "Waiting on something else first:");
    lines.push(...waiting.slice(0, 8).map((n) => `- ${code(n.id)} ${n.label}, ${waitingOn(n).length ? `waiting on ${waitingOn(n).map((d) => code(d.id)).join(", ")}` : `marked blocked: ${n.description}`}`));
  }
  return lines;
}

function blockers(): string[] {
  const G = graph();
  const questions = openWork().filter((n) => n.type === "question");
  const blocked = openWork().filter((n) => n.status === "blocked" && n.type !== "question");
  const lines = ["Open questions holding work up:"];
  lines.push(
    ...(questions.length
      ? questions.map((q) => {
          const who = (G.out.get(q.id) ?? []).filter((e) => e.type === "askedOf").map((e) => code(e.to));
          const what = (G.out.get(q.id) ?? []).filter((e) => e.type === "blocks").map((e) => code(e.to));
          return `- ${code(q.id)} ${q.label}${who.length ? `, asked of ${who.join(", ")}` : ""}${what.length ? `; blocks ${what.join(", ")}` : ""}`;
        })
      : ["- None."]),
  );
  if (blocked.length) {
    lines.push("", "Marked blocked:");
    lines.push(...blocked.map((n) => `- ${code(n.id)} ${n.label}${waitingOn(n).length ? `, waiting on ${waitingOn(n).map((d) => code(d.id)).join(", ")}` : ""}. ${n.description}`));
  }
  return lines;
}

function tools(q: string): string[] {
  const s = q.toLowerCase();
  const lang = /\bpython\b|\bpip\b/.test(s) ? "python" : /\br\b|\bcran\b|\br package/.test(s) ? "r" : undefined;
  let hits = search(q, { k: 8, type: "tool" }).map((h) => graph().nodes.get(h.id)!).filter(Boolean);
  if (lang) hits = hits.filter((n) => String(n.props?.language ?? "").toLowerCase() === lang);
  if (!hits.length) hits = [...graph().nodes.values()].filter((n) => n.type === "tool" && (!lang || String(n.props?.language).toLowerCase() === lang));
  const lines = ["Existing packages that fit:"];
  lines.push(
    ...hits.slice(0, 6).map((n) => {
      const p = n.props ?? {};
      const fit = p.tardigradeFit ? `; tardigrade fit: ${p.tardigradeFit}` : "";
      return `- ${code(n.id)} ${n.label} (${p.language ?? "?"}): ${n.description}${p.install ? ` Install: \`${p.install}\`` : ""}${fit}.`;
    }),
  );
  return lines;
}

function timeline(): string[] {
  const entries = worklog().filter((e) => e.kind === "task");
  const lines = ["Proof of work (task, when, commit):"];
  lines.push(...(entries.length ? entries.slice(-12).map((e) => `- ${code(`fcg:task/${e.task}`)} ${e.status} at ${e.at.slice(11, 16)} UTC, commit \`${e.commit.slice(0, 7)}\`${e.summary ? `: ${e.summary}` : ""}`) : ["- No worklog entries yet."]));
  return lines;
}

export function graphAnswer(q: string, why?: string): { text: string; retrieved: string[] } {
  const intent = intentOf(q);
  const hits = search(q, { k: 12 });
  const body = intent === "next" ? nextSteps() : intent === "blocked" ? blockers() : intent === "tools" ? tools(q) : intent === "timeline" ? timeline() : [];
  const shown = new Set(body.join("\n").match(/fcg:[a-z-]+\/[A-Za-z0-9._-]+/g) ?? []);
  const related = hits
    .filter((h) => !shown.has(h.id) && !(body.length && HISTORY.has(h.type)))
    .slice(0, body.length ? 4 : 6)
    .map((h) => `- ${code(h.id)} (${h.status}): ${h.label}. ${h.description}`);
  const s = status();
  const lines = [
    ...(why ? [why, ""] : []),
    ...body,
    ...(related.length ? [...(body.length ? ["", "Related in the graph:"] : ["Closest matches in the graph:"]), ...related] : body.length ? [] : ["Nothing in the graph matched."]),
    "",
    `Overall: ${s.counts.built ?? 0} built, ${s.counts.in_progress ?? 0} in progress, ${s.counts.needed ?? 0} needed, ${s.counts.blocked ?? 0} blocked. Open any address above to see its links.`,
  ];
  return { text: lines.join("\n"), retrieved: hits.map((h) => h.id) };
}
