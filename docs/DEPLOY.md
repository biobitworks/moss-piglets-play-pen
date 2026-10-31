# Deploying on Vercel

The Play Pen is a standard Next.js app, so Vercel builds it with no extra settings (`vercel.json` only pins the framework and build commands).

## One-time setup

1. Sign in at [vercel.com](https://vercel.com) with your GitHub account.
2. Click **Add New → Project**, then **Import** `biobitworks/moss-piglets-play-pen`. If the repo isn't listed, click **Adjust GitHub App Permissions** and give Vercel access to it.
3. Keep the defaults: framework **Next.js**, root directory `./`. Keep the project name `moss-piglets-play-pen` so the URL below works.
4. Click **Deploy**.

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
