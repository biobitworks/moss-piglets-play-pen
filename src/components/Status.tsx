import Link from "next/link";

const LABEL: Record<string, string> = { built: "Built", in_progress: "In progress", needed: "Needed", blocked: "Blocked", external: "Exists (reuse)" };

export function St({ s }: { s: string }) {
  return <span className={`st st-${s}`}>{LABEL[s] ?? s}</span>;
}

export const href = (id: string) => `/node/${id.replace(/^fcg:/, "")}`;

export function NodeLink({ id, label }: { id: string; label?: string }) {
  return <Link href={href(id)}>{label ?? id}</Link>;
}
