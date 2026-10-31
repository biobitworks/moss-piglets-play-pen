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
              <Link href="/graph">Built vs needed</Link>
              <Link href="/chat">Chat</Link>
              <Link href="/agents">Agents</Link>
              <Link href="/worklog">Worklog</Link>
              <Link href="/contributors">Contributors</Link>
            </nav>
          </div>
        </header>
        <main className="wrap">{children}</main>
        <footer className="site-footer">
          <div className="wrap footer-row">
            <span>
              Open source on{" "}
              <a href="https://github.com/biobitworks/moss-piglets-play-pen">GitHub</a>. Data:{" "}
              <a href="https://tardimap.org/">Tardimap</a> (mock until shared) ·{" "}
              <a href="https://flyconnecto.me/">Fly Connectome</a>.
            </span>
            <span className="build">{buildLabel()}</span>
          </div>
        </footer>
      </body>
    </html>
  );
}
