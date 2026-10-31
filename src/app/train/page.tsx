import type { Metadata } from "next";
import { Trainer } from "@/components/Trainer";

export const metadata: Metadata = { title: "Train · Moss Piglet Play Pen" };

export default function TrainPage() {
  return (
    <>
      <h1>Train</h1>
      <p className="lede">
        Three short modules, each a few minutes. Pass a module to unlock that kind of task on the task board.
      </p>
      <p className="banner">
        These are drawn illustrations of the patterns FlyWire proofreaders learned to spot. Practice on real FlyWire
        neurons, from Codex&rsquo;s public downloads, is the next step on the roadmap.
      </p>
      <Trainer />
    </>
  );
}
