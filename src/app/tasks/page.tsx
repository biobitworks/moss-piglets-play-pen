import type { Metadata } from "next";
import { getDataset, tasksFor, TASK_INFO } from "@/lib/data";
import { TaskBoard } from "@/components/TaskBoard";
import { MockBanner } from "@/components/MockBanner";

export const metadata: Metadata = { title: "Tasks · Moss Piglet Play Pen" };

export default async function TasksPage() {
  const ds = await getDataset();
  const tasks = tasksFor(ds);
  return (
    <>
      <h1>Tasks</h1>
      <p className="lede">
        Everything left to do on the tardigrade connectome, as small jobs. Pass the matching training module, then claim
        a task.
      </p>
      <MockBanner dataset={ds} />
      <div className="grid">
        {Object.entries(TASK_INFO).map(([k, info]) => (
          <div className="card" key={k}>
            <h3>{info.label}</h3>
            <p className="small muted">{info.how}</p>
            <span className="pill">{info.difficulty}</span>
          </div>
        ))}
      </div>
      <TaskBoard tasks={tasks} regions={ds.regions} isMock={ds.isMock} />
    </>
  );
}
