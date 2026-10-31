import type { Metadata } from "next";
import { Contributor } from "@/components/Contributor";

export const metadata: Metadata = { title: "Contributors · Moss Piglet Play Pen" };

export default function ContributorsPage() {
  return (
    <>
      <h1>Contributors</h1>
      <p className="lede">
        Every contribution is credited. FlyWire listed its proofreaders and annotators in its publications, and the
        tardigrade connectome should do the same.
      </p>
      <Contributor />
      <h2>Contribute to the code</h2>
      <p>
        The Play Pen is open source. Issues and pull requests are welcome on{" "}
        <a href="https://github.com/biobitworks/moss-piglets-play-pen">GitHub</a>. The{" "}
        <a href="https://github.com/biobitworks/moss-piglets-play-pen/graphs/contributors">contributor graph</a> lists
        everyone who has worked on it.
      </p>
    </>
  );
}
