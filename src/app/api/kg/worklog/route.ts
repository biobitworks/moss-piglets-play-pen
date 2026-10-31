import { gitCommits, graph, worklog } from "@/lib/kg/graph";

export const dynamic = "force-dynamic";

export async function GET() {
  const tasks = [...graph().nodes.values()].filter((n) => n.type === "task");
  return Response.json({
    timezone: "UTC",
    tasks: tasks.map((t) => ({ id: t.id, label: t.label, status: t.status, slotStart: t.props?.slotStart, slotEnd: t.props?.slotEnd, completedAt: t.props?.completedAt, commit: t.props?.commit })),
    entries: worklog(),
    commits: gitCommits(),
  });
}
