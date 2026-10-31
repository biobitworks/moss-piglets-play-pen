#!/usr/bin/env node
// Play Pen MCP server on stdio. Options: --url <play pen> --model <local model> --llm-url <openai-compatible url>
import { PlayPen } from "../lib/client.mjs";
import { makeServer, serve } from "../lib/mcp.mjs";
import { RAG, openAICompatible } from "../lib/rag.mjs";

const arg = (name) => { const i = process.argv.indexOf(`--${name}`); return i > 0 ? process.argv[i + 1] : undefined; };
const client = new PlayPen(arg("url"));
await serve(makeServer(client, new RAG(client, openAICompatible({ url: arg("llm-url"), model: arg("model") }))));
