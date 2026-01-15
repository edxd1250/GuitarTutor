import type { PitchClass } from "./pitch";

export const MAJOR_SCALE = [0, 2, 4, 5, 7, 9, 11];
export const NATURAL_MINOR_SCALE = [0, 2, 3, 5, 7, 8, 10];

export const MAJOR_PENTATONIC = [0, 2, 4, 7, 9];
export const MINOR_PENTATONIC = [0, 3, 5, 7, 10];

export function buildScale(root: PitchClass, type: "major" | "minor"): PitchClass[] {
  const intervals = type === "major" ? MAJOR_SCALE : NATURAL_MINOR_SCALE;
  return intervals.map((interval) => (root + interval) % 12);
}

export function buildPentatonic(root: PitchClass, type: "major" | "minor"): PitchClass[] {
  const intervals = type === "major" ? MAJOR_PENTATONIC : MINOR_PENTATONIC;
  return intervals.map((interval) => (root + interval) % 12);
}
