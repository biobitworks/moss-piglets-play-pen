#!/usr/bin/env bash
# Launch the Moss Piglets Play Pen website locally. No API keys needed.
#
#   ./start.sh                 dev server on http://localhost:3000
#   ./start.sh --prod          production build, then serve
#   ./start.sh --lan           listen on all interfaces (reachable from your network)
#   ./start.sh --port 3100     another port
#   ./start.sh --model qwen2.5-coder:7b   pick the local chat model
#   ./start.sh --connectors    also install the Python CLI/MCP/RAG connector into .venv-connector
#
# Chat uses a local model if one is running (Ollama at http://localhost:11434, or PLAYPEN_LOCAL_URL),
# otherwise it answers from the knowledge graph. A frontier model is used only if you set its key yourself.
set -euo pipefail
cd "$(dirname "$0")"

PORT="${PORT:-3000}"
HOST="localhost"
MODE="dev"
CONNECTORS=0
MODEL="${PLAYPEN_LOCAL_MODEL:-}"
while [ $# -gt 0 ]; do
  case "$1" in
    --prod) MODE="prod" ;;
    --lan) HOST="0.0.0.0" ;;
    --port) PORT="$2"; shift ;;
    --model) MODEL="$2"; shift ;;
    --connectors) CONNECTORS=1 ;;
    -h|--help) sed -n '2,12p' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
    *) echo "unknown option $1 (try --help)"; exit 1 ;;
  esac
  shift
done

say() { printf '\033[1;32m==>\033[0m %s\n' "$*"; }
warn() { printf '\033[1;33m==>\033[0m %s\n' "$*"; }

# 1. Node
if ! command -v node >/dev/null 2>&1; then
  echo "Node.js 20.9+ is required: https://nodejs.org (or: brew install node)"; exit 1
fi
NODE_MAJOR=$(node -p 'process.versions.node.split(".")[0]')
NODE_MINOR=$(node -p 'process.versions.node.split(".")[1]')
if [ "$NODE_MAJOR" -lt 20 ] || { [ "$NODE_MAJOR" -eq 20 ] && [ "$NODE_MINOR" -lt 9 ]; }; then
  echo "Node.js 20.9+ is required (found $(node -v))"; exit 1
fi

# 2. Dependencies (only when missing or the lockfile changed)
if [ ! -d node_modules ] || [ package-lock.json -nt node_modules/.package-lock.json ]; then
  say "Installing dependencies (npm ci)"
  npm ci --no-audit --no-fund
fi

# 3. Datasets: fetch the starter datasets once if the repo has a fetch script and they are missing
if node -e 'process.exit(require("./package.json").scripts?.["data:fetch"] ? 0 : 1)' && [ ! -f data/datasets/.fetched ]; then
  say "Fetching starter datasets (npm run data:fetch)"
  if npm run -s data:fetch; then mkdir -p data/datasets && touch data/datasets/.fetched
  else warn "Dataset fetch failed (network?). The site still runs with the datasets committed to the repo."; fi
fi

# 4. Local model (optional)
LOCAL_URL="${PLAYPEN_LOCAL_URL:-http://localhost:11434/v1}"
LOCAL_URL="${LOCAL_URL%/}"
if MODELS=$(curl -sf -m 3 "$LOCAL_URL/models" 2>/dev/null); then
  AVAILABLE=$(printf '%s' "$MODELS" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{try{console.log(JSON.parse(s).data.map(m=>m.id).join("\n"))}catch{}})')
  if [ -z "$MODEL" ]; then
    for m in llama3.1:8b qwen2.5-coder:7b qwen2.5:7b qwen3:8b qwen3:4b llama3.2:3b qwen3:1.7b; do
      if printf '%s\n' "$AVAILABLE" | grep -qx "$m"; then MODEL="$m"; break; fi
    done
    [ -z "$MODEL" ] && MODEL=$(printf '%s\n' "$AVAILABLE" | grep -viE 'embed|bge|minilm' | head -1 || true)
  fi
  if [ -n "$MODEL" ]; then
    say "Local model found at $LOCAL_URL: chat will use $MODEL"
    export PLAYPEN_LOCAL_URL="$LOCAL_URL" PLAYPEN_LOCAL_MODEL="$MODEL"
  else
    warn "A model server is running at $LOCAL_URL but has no chat model. Try: ollama pull llama3.1:8b"
  fi
else
  warn "No local model at $LOCAL_URL. Chat will answer from the knowledge graph (no API key needed)."
  warn "For model answers: install Ollama (https://ollama.com), then: ollama pull llama3.1:8b"
fi

# 5. Connectors (optional)
if [ "$CONNECTORS" = 1 ]; then
  say "Installing the Python connector into .venv-connector"
  python3 -m venv .venv-connector
  .venv-connector/bin/pip install -q --upgrade pip >/dev/null 2>&1 || true
  .venv-connector/bin/pip install -q ./packages/python
  say "Try: PLAYPEN_URL=http://localhost:$PORT .venv-connector/bin/playpen status"
fi

# 6. Port check
if (exec 3<>"/dev/tcp/127.0.0.1/$PORT") 2>/dev/null; then
  echo "Port $PORT is already in use. Stop that server or run: ./start.sh --port 3100"; exit 1
fi

# 7. Launch
URL="http://localhost:$PORT"
if [ "$HOST" = "0.0.0.0" ]; then
  IP=$( (ipconfig getifaddr en0 || hostname -I | awk '{print $1}') 2>/dev/null || true)
  if [ -n "$IP" ]; then
    URL="$URL (and http://$IP:$PORT on your network)"
    export PLAYPEN_DEV_ORIGINS="${PLAYPEN_DEV_ORIGINS:+$PLAYPEN_DEV_ORIGINS,}$IP,$(hostname)"
  fi
fi
if [ "$MODE" = "prod" ]; then
  say "Building"
  npm run -s build
  say "Play Pen at $URL"
  exec npx next start -H "$HOST" -p "$PORT"
else
  say "Play Pen at $URL  (Ctrl+C to stop)"
  exec npx next dev -H "$HOST" -p "$PORT"
fi
