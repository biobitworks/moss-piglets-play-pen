import { getDataset, tasksFor } from "@/lib/data";

export async function GET() {
  const ds = await getDataset();
  const tasks = tasksFor(ds);
  return Response.json({ source: ds.source, version: ds.version, isMock: ds.isMock, count: tasks.length, tasks });
}
