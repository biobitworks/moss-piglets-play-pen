import type { Metadata } from "next";
import { Chat } from "@/components/Chat";

export const metadata: Metadata = { title: "Chat · Moss Piglet Play Pen" };

export default function ChatPage() {
  return (
    <>
      <h1>Chat</h1>
      <p className="lede">
        Ask the knowledge graph what has been built, what still needs building, and which fly connectome tools to reuse.
        Answers cite node addresses you can open.
      </p>
      <Chat />
      <p className="small muted">
        Agents can use the same tools directly: MCP at <code>/api/mcp</code>, REST at <a href="/api/tools">/api/tools</a>.
      </p>
    </>
  );
}
