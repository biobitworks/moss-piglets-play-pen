import { STAGES, STAGE_LABELS, type Stage } from "@/lib/data/types";

/** A stacked bar of neurons by pipeline stage. */
export function StageBar({ byStage, total }: { byStage: Record<Stage, number>; total: number }) {
  return (
    <div className="stagebar" role="img" aria-label={STAGES.map((s) => `${STAGE_LABELS[s]}: ${byStage[s]}`).join(", ")}>
      {STAGES.map((s) =>
        byStage[s] ? (
          <span
            key={s}
            className={`seg stage-${s}`}
            style={{ width: `${(byStage[s] / total) * 100}%` }}
            title={`${STAGE_LABELS[s]}: ${byStage[s]}`}
          />
        ) : null,
      )}
    </div>
  );
}

export function StageLegend() {
  return (
    <ul className="legend">
      {STAGES.map((s) => (
        <li key={s}>
          <span className={`swatch stage-${s}`} /> {STAGE_LABELS[s]}
        </li>
      ))}
    </ul>
  );
}
