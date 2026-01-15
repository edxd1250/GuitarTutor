import type { ChordQuality } from "../theory/chords";
import { formatPitchClass } from "../theory/pitch";

export type VoicingShape = {
  id: string;
  name: string;
  quality: ChordQuality;
  baseRoot: "E" | "A" | "C" | "D" | "G";
  frets: number[];
  movable: boolean;
};

export const VOICINGS: VoicingShape[] = [
  {
    id: "open-c-maj",
    name: "Open C",
    quality: "maj",
    baseRoot: "C",
    frets: [-1, 3, 2, 0, 1, 0],
    movable: false
  },
  {
    id: "open-c-min",
    name: "Open Cm (alt)",
    quality: "min",
    baseRoot: "C",
    frets: [-1, 3, 1, 0, 1, 3],
    movable: false
  },
  {
    id: "open-d-maj",
    name: "Open D",
    quality: "maj",
    baseRoot: "D",
    frets: [-1, -1, 0, 2, 3, 2],
    movable: false
  },
  {
    id: "open-d-min",
    name: "Open Dm",
    quality: "min",
    baseRoot: "D",
    frets: [-1, -1, 0, 2, 3, 1],
    movable: false
  },
  {
    id: "open-e-maj",
    name: "Open E",
    quality: "maj",
    baseRoot: "E",
    frets: [0, 2, 2, 1, 0, 0],
    movable: false
  },
  {
    id: "open-e-min",
    name: "Open Em",
    quality: "min",
    baseRoot: "E",
    frets: [0, 2, 2, 0, 0, 0],
    movable: false
  },
  {
    id: "open-g-maj",
    name: "Open G",
    quality: "maj",
    baseRoot: "G",
    frets: [3, 2, 0, 0, 0, 3],
    movable: false
  },
  {
    id: "open-a-maj",
    name: "Open A",
    quality: "maj",
    baseRoot: "A",
    frets: [-1, 0, 2, 2, 2, 0],
    movable: false
  },
  {
    id: "open-a-min",
    name: "Open Am",
    quality: "min",
    baseRoot: "A",
    frets: [-1, 0, 2, 2, 1, 0],
    movable: false
  },
  {
    id: "e-shape-maj",
    name: "E-shape Maj",
    quality: "maj",
    baseRoot: "E",
    frets: [0, 2, 2, 1, 0, 0],
    movable: true
  },
  {
    id: "e-shape-min",
    name: "E-shape Min",
    quality: "min",
    baseRoot: "E",
    frets: [0, 2, 2, 0, 0, 0],
    movable: true
  },
  {
    id: "e-shape-dom7",
    name: "E-shape 7",
    quality: "dom7",
    baseRoot: "E",
    frets: [0, 2, 0, 1, 0, 0],
    movable: true
  },
  {
    id: "e-shape-maj7",
    name: "E-shape Maj7",
    quality: "maj7",
    baseRoot: "E",
    frets: [0, 2, 1, 1, 0, 0],
    movable: true
  },
  {
    id: "e-shape-min7",
    name: "E-shape Min7",
    quality: "min7",
    baseRoot: "E",
    frets: [0, 2, 0, 0, 0, 0],
    movable: true
  },
  {
    id: "a-shape-maj",
    name: "A-shape Maj",
    quality: "maj",
    baseRoot: "A",
    frets: [-1, 0, 2, 2, 2, 0],
    movable: true
  },
  {
    id: "a-shape-min",
    name: "A-shape Min",
    quality: "min",
    baseRoot: "A",
    frets: [-1, 0, 2, 2, 1, 0],
    movable: true
  },
  {
    id: "a-shape-dom7",
    name: "A-shape 7",
    quality: "dom7",
    baseRoot: "A",
    frets: [-1, 0, 2, 0, 2, 0],
    movable: true
  },
  {
    id: "a-shape-maj7",
    name: "A-shape Maj7",
    quality: "maj7",
    baseRoot: "A",
    frets: [-1, 0, 2, 1, 2, 0],
    movable: true
  },
  {
    id: "a-shape-min7",
    name: "A-shape Min7",
    quality: "min7",
    baseRoot: "A",
    frets: [-1, 0, 2, 0, 1, 0],
    movable: true
  }
];

const BASE_ROOT_PC: Record<VoicingShape["baseRoot"], number> = {
  C: 0,
  D: 2,
  E: 4,
  G: 7,
  A: 9
};

export function resolveVoicingFrets(shape: VoicingShape, targetRoot: number): number[] {
  if (!shape.movable) return shape.frets;
  const basePc = BASE_ROOT_PC[shape.baseRoot];
  const offset = (targetRoot - basePc + 12) % 12;
  return shape.frets.map((fret) => (fret < 0 ? -1 : fret + offset));
}

export function voicingLabel(shape: VoicingShape, targetRoot: number, preferFlats: boolean): string {
  if (!shape.movable) return shape.name;
  const basePc = BASE_ROOT_PC[shape.baseRoot];
  const offset = (targetRoot - basePc + 12) % 12;
  const rootName = formatPitchClass(targetRoot, preferFlats);
  return `${rootName} ${shape.name} (fret ${offset})`;
}
