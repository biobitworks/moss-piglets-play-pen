import type { TaskKind } from "./data/tasks";

export type FigureId =
  | "merge-error"
  | "split-error"
  | "crossing"
  | "synapse-tbar"
  | "synapse-false"
  | "sensory"
  | "motor"
  | "bilateral-pair";

export interface Question {
  id: string;
  figure: FigureId;
  prompt: string;
  choices: string[];
  answer: number;
  explanation: string;
}

export interface Module {
  id: Exclude<TaskKind, "name">;
  title: string;
  intro: string;
  questions: Question[];
}

/**
 * Practice modules with known answers (requirement T-3). The figures are
 * drawn illustrations of the patterns FlyWire proofreaders learned to spot.
 * The next step is to swap them for real FlyWire neurons from Codex static
 * downloads, through the same Question shape.
 */
export const MODULES: Module[] = [
  {
    id: "proofread",
    title: "Proofreading: merges and splits",
    intro:
      "Automatic segmentation colors each neuron, but it makes two kinds of mistakes: it glues two neurons together (a merge error) or cuts one neuron into pieces (a split error). FlyWire's community fixed millions of these by eye.",
    questions: [
      {
        id: "p1",
        figure: "merge-error",
        prompt: "This single colored segment has two cell bodies joined by a very thin bridge. What should you do?",
        choices: ["Leave it, it's one neuron", "Split it at the thin bridge", "Merge it with a neighbor"],
        answer: 1,
        explanation:
          "A neuron has one cell body. Two somata joined by a thin, abrupt bridge is the classic merge error, so you split at the bridge.",
      },
      {
        id: "p2",
        figure: "split-error",
        prompt: "Two fragments in different colors line up end to end, with the same thickness and a tiny gap. What should you do?",
        choices: ["Merge them", "Split them further", "Delete the smaller one"],
        answer: 0,
        explanation:
          "Same caliber, same direction and a small gap usually mean the segmentation lost the neurite for a few slices. Merge the fragments.",
      },
      {
        id: "p3",
        figure: "crossing",
        prompt: "Two neurites of very different thickness cross, and each keeps going straight in its own direction. What should you do?",
        choices: ["Merge them at the crossing", "Split both at the crossing", "Nothing, they are separate neurons"],
        answer: 2,
        explanation:
          "Neurites cross all the time. Different thickness and straight paths through the crossing mean these are two separate, correctly segmented neurons.",
      },
    ],
  },
  {
    id: "synapses",
    title: "Synapses: real or not",
    intro:
      "Synapses are detected automatically too. In the fly, a presynaptic site has a dark T-shaped density (a T-bar) surrounded by small round vesicles. Checking detections is a quick, high-value task.",
    questions: [
      {
        id: "s1",
        figure: "synapse-tbar",
        prompt: "Which side of this membrane is presynaptic (sending the signal)?",
        choices: ["The side with the T-bar and vesicles (left)", "The empty side (right)", "You can't tell"],
        answer: 0,
        explanation:
          "Vesicles hold neurotransmitter and cluster around the T-bar on the sending side. The partner on the other side is postsynaptic.",
      },
      {
        id: "s2",
        figure: "synapse-false",
        prompt: "The detector marked a synapse here, but there are no vesicles and no dark density at the contact. Is it real?",
        choices: ["Yes, keep it", "No, flag it as a false positive"],
        answer: 1,
        explanation:
          "Two membranes touching isn't a synapse. Without vesicles or a presynaptic density, flag the detection as a false positive.",
      },
    ],
  },
  {
    id: "type",
    title: "Cell typing: what kind of neuron",
    intro:
      "Once a neuron is proofread and its synapses attached, it gets a type. Shape, where it sends its axon, and who it talks to are the main clues, the same clues used to type the fly's ~8,000 cell types.",
    questions: [
      {
        id: "t1",
        figure: "sensory",
        prompt: "This neuron has fine endings at the body surface and sends its axon into a ganglion. What class is it most likely?",
        choices: ["Sensory", "Motor", "Interneuron"],
        answer: 0,
        explanation:
          "Endings at the surface collect information from the outside world and carry it inward. That's a sensory neuron.",
      },
      {
        id: "t2",
        figure: "motor",
        prompt: "This neuron's cell body sits in a ganglion and its axon leaves through a nerve to end on a muscle. What class is it?",
        choices: ["Sensory", "Motor", "Neuromodulatory"],
        answer: 1,
        explanation: "Output onto muscle makes it a motor neuron.",
      },
      {
        id: "t3",
        figure: "bilateral-pair",
        prompt: "These two neurons are mirror images on the left and right sides and connect to matching partners. How should they be typed?",
        choices: ["As two different types", "As the same type, a left-right pair", "Leave them untyped"],
        answer: 1,
        explanation:
          "Most neurons come in mirror-image pairs. Matching shape and partners on both sides means one cell type, with names ending in _L and _R.",
      },
    ],
  },
];

export const PASS_MARK = 1; // fraction of questions that must be right
