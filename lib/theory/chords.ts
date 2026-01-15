import { formatPitchClass, toPitchClass } from "./pitch";

export type ChordQuality =
  | "maj"
  | "min"
  | "dim"
  | "aug"
  | "sus2"
  | "sus4"
  | "dom7"
  | "maj7"
  | "min7"
  | "m7b5"
  | "add9"
  | "6"
  | "9";

export type ResolvedChord = {
  root: number;
  quality: ChordQuality;
  intervals: number[];
};

export const CHORD_QUALITY_INTERVALS: Record<ChordQuality, number[]> = {
  maj: [0, 4, 7],
  min: [0, 3, 7],
  dim: [0, 3, 6],
  aug: [0, 4, 8],
  sus2: [0, 2, 7],
  sus4: [0, 5, 7],
  dom7: [0, 4, 7, 10],
  maj7: [0, 4, 7, 11],
  min7: [0, 3, 7, 10],
  m7b5: [0, 3, 6, 10],
  add9: [0, 4, 7, 14],
  6: [0, 4, 7, 9],
  9: [0, 4, 7, 10, 14]
};

const LITERAL_SUFFIXES: Array<[RegExp, ChordQuality]> = [
  [/^(?:maj7|M7|Δ7)$/i, "maj7"],
  [/^(?:m7b5|ø)$/i, "m7b5"],
  [/^(?:min7|m7)$/i, "min7"],
  [/^(?:7)$/i, "dom7"],
  [/^(?:min|m|-)$/i, "min"],
  [/^(?:dim|°)$/i, "dim"],
  [/^(?:aug|\+)$/i, "aug"],
  [/^(?:sus2)$/i, "sus2"],
  [/^(?:sus4)$/i, "sus4"],
  [/^(?:add9)$/i, "add9"],
  [/^(?:6)$/i, "6"],
  [/^(?:9)$/i, "9"],
  [/^$/i, "maj"]
];

export type ParseResult = { ok: true; chord: ResolvedChord } | { ok: false; error: string };

export function parseLiteralChord(input: string): ParseResult {
  const trimmed = input.trim();
  const match = /^([A-Ga-g])([#b]?)(.*)$/.exec(trimmed);
  if (!match) {
    return { ok: false, error: "Invalid chord root." };
  }
  const rootName = `${match[1].toUpperCase()}${match[2]}`;
  const suffix = match[3].trim();
  const root = toPitchClass(rootName);
  if (root === null) {
    return { ok: false, error: "Invalid chord root." };
  }
  const qualityEntry = LITERAL_SUFFIXES.find(([pattern]) => pattern.test(suffix));
  if (!qualityEntry) {
    return { ok: false, error: `Unsupported chord suffix: ${suffix || "(none)"}` };
  }
  const quality = qualityEntry[1];
  return { ok: true, chord: { root, quality, intervals: CHORD_QUALITY_INTERVALS[quality] } };
}

export function formatChordSummary(chord: ResolvedChord, preferFlats = false): string {
  const root = formatPitchClass(chord.root, preferFlats);
  const labelMap: Record<ChordQuality, string> = {
    maj: "major",
    min: "minor",
    dim: "diminished",
    aug: "augmented",
    sus2: "sus2",
    sus4: "sus4",
    dom7: "7",
    maj7: "maj7",
    min7: "min7",
    m7b5: "m7b5",
    add9: "add9",
    6: "6",
    9: "9"
  };
  return `${root} ${labelMap[chord.quality]}`;
}

export function chordToneSet(chord: ResolvedChord): number[] {
  return chord.intervals.map((interval) => (chord.root + interval) % 12);
}
