"""One-off generator for the initial FCG seed. After seeding, data/kg/fcg.json is the source of truth; edit it directly."""
import json, sys

N, E = [], []
def node(t, slug, label, status, desc, **props):
    N.append({"id": f"fcg:{t}/{slug}", "type": t, "label": label, "status": status, "description": desc, **({"props": props} if props else {})})
def edge(a, rel, b): E.append({"from": a, "type": rel, "to": b})

node("project", "playpen", "Moss Piglet Play Pen", "in_progress", "Open on-ramp and agent connector for finishing the tardigrade connectome, using the fly connectome as the worked example.", repo="https://github.com/biobitworks/moss-piglets-play-pen")
node("species", "drosophila", "Drosophila melanogaster", "external", "Fruit fly. Reference organism: several complete, proofread connectomes.")
node("species", "hypsibius", "Hypsibius exemplaris", "in_progress", "Tardigrade (moss piglet). Fewer than ~600 neurons; Tardimap is mapping it.")

for slug, label, desc, url in [
  ("flywire-fafb", "FlyWire / FAFB", "Whole adult female brain, ~140k neurons, community proofread.", "https://codex.flywire.ai/"),
  ("hemibrain", "Hemibrain", "Janelia partial adult brain connectome, served in neuPrint.", "https://neuprint.janelia.org/"),
  ("manc", "MANC", "Male adult nerve cord connectome.", "https://neuprint.janelia.org/"),
  ("fanc", "FANC", "Female adult nerve cord, CAVE-based proofreading.", "https://flyconnecto.me/"),
  ("malecns", "MaleCNS", "Whole male central nervous system.", "https://flyconnecto.me/"),
  ("banc", "BANC", "Brain and nerve cord connectome.", "https://flyconnecto.me/"),
]:
    node("dataset", slug, label, "external", desc, url=url); edge(f"fcg:dataset/{slug}", "ofSpecies", "fcg:species/drosophila")
node("dataset", "tardimap-riker", "Tardimap Riker EM", "in_progress", "Whole-animal EM of Hypsibius exemplaris. Imaging complete; reconstruction in progress; not public yet.", url="https://tardimap.org/")
edge("fcg:dataset/tardimap-riker", "ofSpecies", "fcg:species/hypsibius")

stages = [("imaging", "EM imaging", "built"), ("segmentation", "Automated segmentation", "blocked"), ("proofreading", "Proofreading", "needed"),
          ("synapses", "Synapse detection", "blocked"), ("typing", "Cell typing and naming", "needed"), ("release", "Public release", "needed")]
for i, (slug, label, tstat) in enumerate(stages):
    node("stage", slug, label, tstat, f"Pipeline stage {i+1} of 6. Status shown is the tardigrade side; the fly side is complete.", order=i+1)
    edge("fcg:stage/" + slug, "partOf", "fcg:project/playpen")
    if i: edge("fcg:stage/" + slug, "dependsOn", "fcg:stage/" + stages[i-1][0])

tools = [
  ("navis", "navis", "python", "pip install navis", "https://navis-org.github.io/navis/", ["proofreading", "typing"], "direct", "Neuron analysis and visualisation: skeletons, meshes, NBLAST, transforms."),
  ("fafbseg-py", "fafbseg (Python)", "python", "pip install fafbseg", "https://fafbseg-py.readthedocs.io/", ["segmentation", "proofreading"], "adapter", "Access to FlyWire/FAFB segmentation, annotations and connectivity."),
  ("neuprint-python", "neuprint-python", "python", "pip install neuprint-python", "https://connectome-neuprint.github.io/neuprint-python/", ["release"], "adapter", "Client for neuPrint connectome databases (hemibrain, MANC)."),
  ("caveclient", "CAVEclient", "python", "pip install caveclient", "https://caveclient.readthedocs.io/", ["proofreading", "synapses"], "adapter", "Client for CAVE: versioned segmentation, proofreading edits and annotation tables."),
  ("cloud-volume", "CloudVolume", "python", "pip install cloud-volume", "https://github.com/seung-lab/cloud-volume", ["imaging", "segmentation"], "direct", "Read and write Neuroglancer precomputed volumes and meshes."),
  ("pymaid", "pymaid", "python", "pip install python-catmaid", "https://pymaid.readthedocs.io/", ["proofreading"], "direct", "Python client for CATMAID, the likely engine for a <600-neuron animal."),
  ("cocoa", "cocoa", "python", "pip install cocoa (from github.com/flyconnectome/cocoa)", "https://github.com/flyconnectome/cocoa", ["typing"], "adapter", "Comparative connectomics: co-cluster neurons across datasets."),
  ("natverse", "natverse", "r", "natmanager::install('natverse')", "https://natverse.org/", ["proofreading", "typing"], "direct", "R suite for neuroanatomy: nat, nat.nblast, neuprintr, fafbseg, rcatmaid."),
  ("nat-nblast", "nat.nblast", "r", "install.packages('nat.nblast')", "https://natverse.org/nat.nblast/", ["typing"], "direct", "NBLAST morphological similarity, used for cell typing."),
  ("fafbseg-r", "fafbseg (R)", "r", "natmanager::install(pkgs='fafbseg')", "https://natverse.org/fafbseg/", ["proofreading"], "adapter", "R access to FlyWire segmentation and annotations."),
  ("neuprintr", "neuprintr", "r", "natmanager::install(pkgs='neuprintr')", "https://natverse.org/neuprintr/", ["release"], "adapter", "R client for neuPrint."),
  ("rcatmaid", "rcatmaid", "r", "natmanager::install(pkgs='rcatmaid')", "https://natverse.org/rcatmaid/", ["proofreading"], "direct", "R client for CATMAID."),
  ("coconatfly", "coconatfly", "r", "natmanager::install(pkgs='coconatfly')", "https://natverse.org/coconatfly/", ["typing"], "adapter", "Cross-dataset connectome comparison for the fly datasets."),
  ("neuroglancer", "Neuroglancer", "web", "pip install neuroglancer (or hosted)", "https://github.com/google/neuroglancer", ["imaging", "proofreading"], "direct", "Web viewer for EM, segmentation and meshes."),
  ("cave", "CAVE", "platform", "self-hosted (Kubernetes)", "https://github.com/CAVEconnectome", ["proofreading", "synapses"], "adapter", "Connectome Annotation Versioning Engine behind FlyWire proofreading."),
  ("catmaid", "CATMAID", "platform", "self-hosted (Docker)", "https://catmaid.org/", ["proofreading", "synapses"], "direct", "Collaborative tracing and annotation; good fit for small whole animals."),
  ("codex", "FlyWire Codex", "web", "hosted", "https://codex.flywire.ai/", ["release"], "n/a", "Browse and download FlyWire data releases."),
]
for slug, label, lang, install, url, serves, fit, desc in tools:
    node("tool", slug, label, "external", desc, language=lang, install=install, url=url, tardigradeFit=fit)
    for s in serves: edge(f"fcg:tool/{slug}", "serves", f"fcg:stage/{s}")
for s in ["flywire-fafb", "fanc", "banc"]: edge("fcg:tool/cave", "hosts", f"fcg:dataset/{s}")
for s in ["hemibrain", "manc"]: edge("fcg:tool/neuprint-python", "reads", f"fcg:dataset/{s}")
edge("fcg:tool/fafbseg-py", "reads", "fcg:dataset/flywire-fafb")
edge("fcg:tool/nat-nblast", "partOf", "fcg:tool/natverse")
for t in ["fafbseg-r", "neuprintr", "rcatmaid"]: edge(f"fcg:tool/{t}", "partOf", "fcg:tool/natverse")

caps = [
  ("contributor-onramp", "Contributor on-ramp (progress, train, tasks, credit)", "built", "Next.js pages on mock data.", "pr/2", []),
  ("stack-review", "Fly tool review and recommended stack", "built", "docs/TECH_STACK.md.", "pr/3", []),
  ("knowledge-graph", "FCO/FCG knowledge graph", "in_progress", "Addressable graph of what exists and what is needed.", "pr/4", ["T02", "T03"]),
  ("vector-search", "Vector search (RAG retrieval)", "needed", "Embeds every node for semantic lookup.", "pr/4", ["T04"]),
  ("agent-tools", "Agent tools over MCP and REST", "needed", "One tool registry exposed to agents.", "pr/4", ["T05"]),
  ("agent-connector", "Agent connector (1:1, 1:n, n:m)", "needed", "Message bus between registered agents.", "pr/4", ["T06"]),
  ("chat", "Chat interface", "needed", "Claude-backed chat that answers from the graph.", "pr/4", ["T07"]),
  ("status-board", "Built-vs-needed board and worklog", "needed", "Live view of graph status and proof of work.", "pr/4", ["T08"]),
  ("deploy", "Vercel deployment", "needed", "Same app runs locally and on Vercel.", "pr/4", ["T09"]),
  ("persistence", "Database persistence for graph and messages", "needed", "Postgres + pgvector or Neo4j. Roadmap phase 2.", None, []),
  ("github-sync", "Live GitHub sync (webhooks)", "needed", "Pushes, PRs and merges arrive as they happen. Phase 3.", None, []),
  ("python-worker", "Python agent worker (navis, fafbseg)", "needed", "Runs analysis jobs from graph tasks. Phase 4.", None, []),
  ("tardimap-adapter", "Tardimap data adapter", "blocked", "Needs access to Tardimap reconstruction. Phase 5.", None, []),
  ("cross-species", "Fly ↔ tardigrade cell-type links", "needed", "Shared vocabulary as join key. Phase 6.", None, []),
  ("celltype-vocab", "Tardigrade cell-type vocabulary", "needed", "Small OBO/OWL vocabulary, cross-referenced to CL/Uberon.", None, []),
]
for slug, label, status, desc, pr, tasks in caps:
    node("capability", slug, label, status, desc); edge(f"fcg:capability/{slug}", "partOf", "fcg:project/playpen")
    if pr: edge(f"fcg:capability/{slug}", "deliveredIn", f"fcg:pr/{pr.split('/')[1]}")
    for t in tasks: edge(f"fcg:task/{t}", "implements", f"fcg:capability/{slug}")
for a, b in [("vector-search", "knowledge-graph"), ("agent-tools", "knowledge-graph"), ("agent-tools", "vector-search"), ("agent-connector", "agent-tools"),
             ("chat", "agent-tools"), ("status-board", "knowledge-graph"), ("deploy", "chat"), ("persistence", "knowledge-graph"), ("github-sync", "persistence"),
             ("python-worker", "agent-connector"), ("tardimap-adapter", "contributor-onramp"), ("cross-species", "celltype-vocab"), ("cross-species", "tardimap-adapter")]:
    edge(f"fcg:capability/{a}", "dependsOn", f"fcg:capability/{b}")
edge("fcg:capability/python-worker", "uses", "fcg:tool/navis"); edge("fcg:capability/python-worker", "uses", "fcg:tool/fafbseg-py")
edge("fcg:capability/tardimap-adapter", "reads", "fcg:dataset/tardimap-riker")
edge("fcg:capability/contributor-onramp", "analogOf", "fcg:dataset/flywire-fafb")
edge("fcg:stage/proofreading", "needs", "fcg:capability/tardimap-adapter")
edge("fcg:stage/typing", "needs", "fcg:capability/celltype-vocab")

plan = [("T01", "Merge PR #2/#3, roadmap and task plan", "20:45", "21:00"), ("T02", "FCO vocabulary and seeded FCG", "21:00", "21:15"),
        ("T03", "Tool nodes and proof-of-work logger", "21:15", "21:30"), ("T04", "Vector search over the graph", "21:30", "21:45"),
        ("T05", "Agent tool endpoints (REST + MCP)", "21:45", "22:00"), ("T06", "Agent connector 1:1, 1:n, n:m", "22:00", "22:15"),
        ("T07", "Chat endpoint (Claude API)", "22:15", "22:30"), ("T08", "Built-vs-needed board and worklog pages", "22:30", "22:45"),
        ("T09", "Build check, README, PR, Vercel", "22:45", "23:00")]
for tid, label, a, b in plan:
    node("task", tid, f"{tid}: {label}", "needed", f"15-minute slot {a}–{b} UTC on 2026-10-31.", slotStart=f"2026-10-31T{a}:00Z", slotEnd=f"2026-10-31T{b}:00Z")
    edge(f"fcg:task/{tid}", "partOf", "fcg:project/playpen")

for n, title, st in [("1", "README and requirements draft", "built"), ("2", "Next.js MVP on Vercel", "in_progress"), ("3", "Fly tools review and stack", "in_progress"), ("4", "Agent connector MVP", "in_progress")]:
    node("pr", n, f"PR #{n}: {title}", st, f"Pull request #{n}.", url=f"https://github.com/biobitworks/moss-piglets-play-pen/pull/{n}")
for slug, path in [("readme", "README.md"), ("requirements", "docs/REQUIREMENTS.md"), ("tech-stack", "docs/TECH_STACK.md"), ("deploy", "docs/DEPLOY.md"),
                   ("agent-connector", "docs/AGENT_CONNECTOR.md"), ("task-plan", "docs/TASK_PLAN.md")]:
    node("doc", slug, path, "built", f"Repository document {path}.", path=path, url=f"https://github.com/biobitworks/moss-piglets-play-pen/blob/main/{path}")
edge("fcg:capability/stack-review", "documentedIn", "fcg:doc/tech-stack"); edge("fcg:capability/knowledge-graph", "documentedIn", "fcg:doc/agent-connector")
edge("fcg:project/playpen", "documentedIn", "fcg:doc/task-plan")

for slug, label, status, desc, caps_ in [
  ("playpen-chat", "Play Pen chat", "needed", "Claude-backed chat agent with the graph tools.", ["kg_search", "kg_status", "kg_get_node"]),
  ("kg-curator", "Graph curator", "needed", "Agent that proposes new nodes and edges and logs work.", ["kg_add_node", "kg_add_edge", "worklog_add"]),
  ("navis-worker", "navis worker", "needed", "Planned Python agent that runs navis/fafbseg jobs.", ["run_navis", "run_fafbseg"]),
]:
    node("agent", slug, label, status, desc, capabilities=caps_)
node("person", "byron", "Byron", "external", "Project owner (GitHub biobitworks).")
edge("fcg:project/playpen", "ownedBy", "fcg:person/byron")

for slug, label, status, desc, blocks in [
  ("tz", "Is the 4:00 PM deadline Pacific time?", "needed", "Assumed Pacific (23:00 UTC).", "fcg:task/T09"),
  ("magic", "What are magicpro and magicstudio?", "needed", "Byron wants task times captured there; until known, times live in the worklog.", "fcg:capability/status-board"),
  ("fco", "Does FCO/FCG mean something specific?", "needed", "Not found on flyconnecto.me or VFB; defined in docs/AGENT_CONNECTOR.md.", "fcg:capability/knowledge-graph"),
  ("tardimap-step0", "Step 0: what does Tardimap use and want?", "blocked", "Contact contact@tardimap.org about tools, access and contributors.", "fcg:capability/tardimap-adapter"),
]:
    node("question", slug, label, status, desc); edge(f"fcg:question/{slug}", "blocks", blocks); edge(f"fcg:question/{slug}", "askedOf", "fcg:person/byron" if slug != "tardimap-step0" else "fcg:dataset/tardimap-riker")

ids = {n["id"] for n in N}
bad = [e for e in E if e["from"] not in ids or e["to"] not in ids]
assert not bad, bad
json.dump({"version": "fcg-0.1.0", "generated": "2026-10-31", "nodes": N, "edges": E}, open(sys.argv[1], "w"), indent=1, ensure_ascii=False)
print(len(N), "nodes", len(E), "edges")
