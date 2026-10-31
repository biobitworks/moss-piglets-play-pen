# Deploying on Vercel

The Play Pen is a standard Next.js app, so Vercel builds it with no extra settings (`vercel.json` only pins the framework and build commands).

## One-time setup

1. Sign in at [vercel.com](https://vercel.com) with your GitHub account.
2. Click **Add New → Project**, then **Import** `biobitworks/moss-piglets-play-pen`. If the repo isn't listed, click **Adjust GitHub App Permissions** and give Vercel access to it.
3. Keep the defaults: framework **Next.js**, root directory `./`. Keep the project name `moss-piglets-play-pen` so the URL below works.
4. Click **Deploy**. The first build takes about a minute. Every page works at this point; the chat answers
   with graph search results until step 6.

## Turn on the chat and shared storage (about 5 minutes)

5. **Shared storage for agents.** In the project, open **Storage → Create Database → Upstash (Redis)**, accept
   the free plan, and connect it to the project for all environments. Vercel adds `KV_REST_API_URL` and
   `KV_REST_API_TOKEN` (or the `UPSTASH_REDIS_REST_*` pair); the app reads either. Without this, graph additions
   and agent messages live in one server's memory and disappear when it restarts.
6. **Chat.** Create an API key at [platform.claude.com](https://platform.claude.com) → **API Keys**, then in Vercel open
   **Settings → Environment Variables**, add `ANTHROPIC_API_KEY` with the key, and tick Production and Preview.
7. **Read-only (recommended while the URL is public).** Add `PLAYPEN_READONLY` = `1`. Agents and the chat can still
   read and search everything; nobody can write to the graph. Remove it, or set it only on Preview, when you want
   agents to write.
8. Open **Deployments**, click the menu on the latest deployment and choose **Redeploy**, so the new variables
   take effect.

## Check it works

- `https://<your-url>/graph` shows the built vs needed board.
- `https://<your-url>/api/kg` returns JSON with `"store": "redis"` once step 5 is done.
- `https://<your-url>/chat`: answers that end with "Model: claude-opus-5-5" mean step 6 worked.
- Connect an agent: `claude mcp add --transport http playpen https://<your-url>/api/mcp`.

## The permalink

- **Production:** `https://moss-piglets-play-pen.vercel.app`. This is the link for the video and the submission. Every merge or push to `main` redeploys to this same URL.
- **Previews:** every pull request gets its own preview URL, posted on the PR, so changes can be checked before they reach the permalink.
- **Version check:** the footer shows the app version and the short commit hash of the build, so you can see which version is live.
- **Custom domain (optional):** Project → Settings → Domains, for example `playpen.strangerbuilds.com`. The `.vercel.app` URL keeps working alongside it.

If the name `moss-piglets-play-pen` is already taken on Vercel, it picks a variant. The real URL is shown on the project's dashboard under **Domains**.

## Environment variables

| Variable | Needed? | What it does |
|---|---|---|
| `ANTHROPIC_API_KEY` | For the chat | Lets `/api/chat` answer with Claude (`claude-opus-5-5`) using the graph tools. Without it, the chat shows graph search results only. |
| `PLAYPEN_CHAT_MODEL` | No | Override the chat model. |
| `PLAYPEN_CHAT_WRITES` | No | `1` lets the chat add nodes and send agent messages. Off by default. |
| `PLAYPEN_READONLY` | Recommended on public deployments | `1` turns off every tool that writes (graph edits, agent messages). |

Graph edits and agent messages made at runtime are kept in server memory on Vercel, so they can reset between
requests until a database is added (roadmap phase 2 in `docs/AGENT_CONNECTOR.md`). Locally they are saved to
`data/kg/runtime.json`.

`PLAYPEN_DATA_SOURCE` selects the data adapter and defaults to `mock-tardigrade`. Data-access tokens added later (CAVE, Codex) go in Project → Settings → Environment Variables and are never committed.
