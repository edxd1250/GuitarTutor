export type PitchClass = number;

const LETTER_TO_PC: Record<string, number> = {
  C: 0,
  D: 2,
  E: 4,
  F: 5,
  G: 7,
  A: 9,
  B: 11
};

const SHARP_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const FLAT_NAMES = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"];

export function normalizeNoteName(input: string): string {
  return input.trim().replace(/\s+/g, "");
}

export function toPitchClass(note: string): PitchClass | null {
  const cleaned = normalizeNoteName(note);
  const match = /^([A-Ga-g])([#b]?)/.exec(cleaned);
  if (!match) {
    return null;
  }
  const letter = match[1].toUpperCase();
  const accidental = match[2];
  const base = LETTER_TO_PC[letter];
  if (base === undefined) {
    return null;
  }
  let pc = base;
  if (accidental === "#") pc += 1;
  if (accidental === "b") pc -= 1;
  return (pc + 12) % 12;
}

export function formatPitchClass(pc: PitchClass, preferFlats = false): string {
  const index = ((pc % 12) + 12) % 12;
  return preferFlats ? FLAT_NAMES[index] : SHARP_NAMES[index];
}

export function preferFlatsForKey(keyTonic: string): boolean {
  return /b/.test(keyTonic);
}
