// Proof of work: `npm run log -- T02 [built|in_progress|blocked] "what was done"`
// Records the current time and the HEAD commit against a task in data/kg/worklog.json.
// `npm run log -- push` records a push of HEAD instead.
import { execSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";

const file = new URL("../data/kg/worklog.json", import.meta.url);
const log = JSON.parse(readFileSync(file, "utf8"));
const args = process.argv.slice(2);
const git = (c) => execSync(`git ${c}`, { encoding: "utf8" }).trim();
const sha = git("rev-parse HEAD");
const commitAt = new Date(git("show -s --format=%cI HEAD")).toISOString();
const at = new Date().toISOString();

let entry;
if (args[0] === "push") {
  entry = { kind: "push", at, commit: sha, branch: git("rev-parse --abbrev-ref HEAD") };
} else {
  const [task, maybeStatus, ...rest] = args;
  if (!/^T\d+$/.test(task ?? "")) { console.error("usage: npm run log -- T02 [built|in_progress|blocked] \"summary\""); process.exit(1); }
  const statuses = ["built", "in_progress", "blocked"];
  const status = statuses.includes(maybeStatus) ? maybeStatus : "built";
  const summary = (statuses.includes(maybeStatus) ? rest : [maybeStatus, ...rest]).filter(Boolean).join(" ");
  entry = { kind: "task", task, status, at, commit: sha, commitAt, subject: git("show -s --format=%s HEAD"), summary };
}
log.entries.push(entry);
writeFileSync(file, JSON.stringify(log, null, 1) + "\n");
console.log(`worklog: ${entry.kind} ${entry.task ?? ""} ${entry.status ?? ""} at ${at} (commit ${sha.slice(0, 7)})`);
