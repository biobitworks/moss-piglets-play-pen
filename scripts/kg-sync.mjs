// Reads git history into data/kg/git.json (commits, merges, timestamps) so the graph can show them.
// Runs before `next build`; if git is unavailable (for example a shallow deploy clone), the committed file is kept.
import { execSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";

const out = new URL("../data/kg/git.json", import.meta.url);
let prev = { commits: [] };
try { prev = JSON.parse(readFileSync(out, "utf8")); } catch {}

try {
  const raw = execSync("git log --all --date=iso-strict --pretty=format:%H%x1f%cd%x1f%an%x1f%P%x1f%s%x1e", { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
  const seen = new Map(prev.commits.map((c) => [c.sha, c]));
  for (const rec of raw.split("\x1e")) {
    const [sha, at, author, parents, subject] = rec.trim().split("\x1f");
    if (!sha) continue;
    const pr = /Merge pull request #(\d+)/.exec(subject ?? "")?.[1];
    seen.set(sha, { sha, at: new Date(at).toISOString(), author, isMerge: (parents ?? "").split(" ").length > 1, subject, ...(pr ? { pr: Number(pr) } : {}) });
  }
  const commits = [...seen.values()].sort((a, b) => a.at.localeCompare(b.at));
  writeFileSync(out, JSON.stringify({ syncedAt: new Date().toISOString(), commits }, null, 1) + "\n");
  console.log(`kg-sync: ${commits.length} commits`);
} catch (e) {
  console.log("kg-sync: git not available, keeping committed data/kg/git.json");
}
