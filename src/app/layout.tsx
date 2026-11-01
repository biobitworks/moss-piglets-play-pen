import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import pkg from "../../package.json";

export const metadata: Metadata = {
  title: "Moss Piglet Play Pen",
  description:
    "An open on-ramp for finishing the tardigrade connectome, built on what the fly connectome community learned.",
};

function buildLabel() {
  const sha = process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7);
  const env = process.env.VERCEL_ENV;
  return `v${pkg.version}${sha ? ` · ${sha}` : ""}${env && env !== "production" ? ` · ${env}` : ""}`;
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header className="site-header">
          <div className="wrap header-row">
            <Link href="/" className="brand">
              <span aria-hidden>🐻</span> Moss Piglet Play Pen
            </Link>
            <nav>
              <Link href="/progress">Progress</Link>
              <Link href="/train">Train</Link>
              <Link href="/tasks">Tasks</Link>
              <Link href="/roadmap">Roadmap</Link>
              <Link href="/datasets">Datasets</Link>
              <Link href="/graph">Built vs needed</Link>
              <Link href="/chat">Chat</Link>
              <Link href="/agents">Agents</Link>
              <Link href="/worklog">Worklog</Link>
              <Link href="/contributors">Contributors</Link>
              <Link href="/demo">Demo</Link>
              <Link href="/credits">Credits</Link>
            </nav>
          </div>
        </header>
        <main className="wrap">{children}</main>
        <footer className="site-footer">
          <div className="wrap footer-row">
            <span>
              <strong>Science as a Service</strong>: open app, REST and MCP tools for people and agents. Source on{" "}
              <a href="https://github.com/biobitworks/moss-piglets-play-pen">GitHub</a>. Data:{" "}
              <a href="https://tardimap.org/">Tardimap</a> (mock until shared) ·{" "}
              <a href="https://flyconnecto.me/">FlyWire / Fly Connectome</a> · Janelia hemibrain · OpenWorm{" "}
              <i>C. elegans</i>. <Link href="/credits">Acknowledgements</Link>
            </span>
            <span className="build">{buildLabel()}</span>
          </div>
          <div className="wrap footer-row footer-license">
            <span>
              © 2026 biobitworks and contributors. Code:{" "}
              <a href="https://www.apache.org/licenses/LICENSE-2.0">Apache 2.0</a>. Docs, data and media:{" "}
              <a href="https://creativecommons.org/licenses/by-nc-nd/4.0/">CC BY-NC-ND 4.0</a>. Third-party data keeps its
              own terms.
            </span>
          </div>
        </footer>
      </body>
    </html>
  );
}
