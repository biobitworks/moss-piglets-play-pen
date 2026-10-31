import type { FigureId } from "@/lib/training";

/** Schematic drawings for the training questions. Not real EM data. */
export function Figure({ id }: { id: FigureId }) {
  return (
    <svg viewBox="0 0 320 180" className="figure" role="img" aria-label={LABELS[id]}>
      <rect x="0" y="0" width="320" height="180" rx="10" className="fig-bg" />
      {DRAW[id]}
    </svg>
  );
}

const LABELS: Record<FigureId, string> = {
  "merge-error": "One segment with two cell bodies joined by a thin bridge",
  "split-error": "Two fragments of equal thickness aligned end to end with a small gap",
  crossing: "A thick and a thin neurite crossing each other",
  "synapse-tbar": "A membrane with a T-bar and vesicles on the left side",
  "synapse-false": "A detected synapse marker on a membrane with no vesicles",
  sensory: "A neuron with endings at the body surface and an axon into a ganglion",
  motor: "A neuron in a ganglion with an axon ending on a muscle",
  "bilateral-pair": "Two mirror-image neurons on left and right sides",
};

const A = "var(--seg-a)";
const B = "var(--seg-b)";
const C = "var(--seg-c)";

const DRAW: Record<FigureId, React.ReactNode> = {
  "merge-error": (
    <g fill="none" stroke={A} strokeLinecap="round">
      <circle cx="70" cy="90" r="22" fill={A} stroke="none" />
      <circle cx="250" cy="90" r="22" fill={A} stroke="none" />
      <path d="M70 90 C 40 40, 20 30, 10 20 M70 90 C 50 140, 30 160, 15 170" strokeWidth="7" />
      <path d="M250 90 C 280 40, 300 30, 312 18 M250 90 C 270 140, 290 160, 310 172" strokeWidth="7" />
      <path d="M92 90 L 228 90" strokeWidth="2" strokeDasharray="1 0" />
      <text x="160" y="80" className="fig-label" textAnchor="middle">thin bridge</text>
    </g>
  ),
  "split-error": (
    <g fill="none" strokeLinecap="round" strokeWidth="9">
      <path d="M20 140 C 70 120, 110 100, 150 92" stroke={A} />
      <path d="M166 89 C 210 80, 260 60, 305 30" stroke={B} />
      <text x="158" y="125" className="fig-label" textAnchor="middle">gap</text>
    </g>
  ),
  crossing: (
    <g fill="none" strokeLinecap="round">
      <path d="M20 30 L 300 150" stroke={A} strokeWidth="12" />
      <path d="M30 160 L 290 20" stroke={B} strokeWidth="3" />
    </g>
  ),
  "synapse-tbar": (
    <g>
      <path d="M160 10 C 150 60, 170 120, 160 170" fill="none" stroke="var(--ink-soft)" strokeWidth="3" />
      <path d="M150 90 L 120 90 M150 70 L 150 110" stroke="var(--ink)" strokeWidth="7" strokeLinecap="round" />
      {[
        [100, 60], [92, 92], [105, 120], [80, 75], [75, 108], [115, 45], [118, 135], [60, 90],
      ].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="7" fill="none" stroke={A} strokeWidth="2.5" />
      ))}
      <text x="80" y="165" className="fig-label" textAnchor="middle">left</text>
      <text x="240" y="165" className="fig-label" textAnchor="middle">right</text>
    </g>
  ),
  "synapse-false": (
    <g>
      <path d="M160 10 C 150 60, 170 120, 160 170" fill="none" stroke="var(--ink-soft)" strokeWidth="3" />
      <circle cx="158" cy="90" r="16" fill="none" stroke={C} strokeWidth="3" strokeDasharray="5 4" />
      <text x="190" y="70" className="fig-label">detected?</text>
    </g>
  ),
  sensory: (
    <g fill="none" strokeLinecap="round">
      <rect x="10" y="10" width="300" height="14" rx="6" fill="var(--ink-soft)" opacity="0.3" stroke="none" />
      <text x="20" y="42" className="fig-label">body surface</text>
      <path d="M80 26 L 95 55 M110 26 L 100 55 M95 55 L 100 55" stroke={A} strokeWidth="3" />
      <circle cx="100" cy="68" r="10" fill={A} stroke="none" />
      <path d="M100 78 C 120 120, 200 140, 250 140" stroke={A} strokeWidth="5" />
      <ellipse cx="260" cy="140" rx="45" ry="28" fill="none" stroke="var(--ink-soft)" strokeDasharray="4 4" />
      <text x="260" y="178" className="fig-label" textAnchor="middle">ganglion</text>
    </g>
  ),
  motor: (
    <g fill="none" strokeLinecap="round">
      <ellipse cx="70" cy="90" rx="50" ry="34" stroke="var(--ink-soft)" strokeDasharray="4 4" />
      <text x="70" y="140" className="fig-label" textAnchor="middle">ganglion</text>
      <circle cx="70" cy="90" r="11" fill={B} stroke="none" />
      <path d="M81 90 C 140 90, 180 60, 240 60" stroke={B} strokeWidth="5" />
      <path d="M240 60 l 12 -10 M240 60 l 14 2 M240 60 l 10 12" stroke={B} strokeWidth="3" />
      <rect x="250" y="35" width="60" height="50" rx="12" fill={C} opacity="0.35" stroke="none" />
      <text x="280" y="105" className="fig-label" textAnchor="middle">muscle</text>
    </g>
  ),
  "bilateral-pair": (
    <g fill="none" strokeLinecap="round">
      <path d="M160 10 L 160 170" stroke="var(--ink-soft)" strokeDasharray="4 6" />
      <circle cx="120" cy="60" r="10" fill={A} stroke="none" />
      <path d="M120 70 C 110 110, 70 120, 40 150 M110 110 L 80 95" stroke={A} strokeWidth="4" />
      <circle cx="200" cy="60" r="10" fill={B} stroke="none" />
      <path d="M200 70 C 210 110, 250 120, 280 150 M210 110 L 240 95" stroke={B} strokeWidth="4" />
      <text x="60" y="30" className="fig-label">left</text>
      <text x="240" y="30" className="fig-label">right</text>
    </g>
  ),
};
