import { formatPitchClass } from "./pitch";
import { MAJOR_SCALE, NATURAL_MINOR_SCALE } from "./scales";

export function getNoteLetter(pc: number, preferFlats: boolean): string {
  return formatPitchClass(pc, preferFlats);
}

export function getScaleDegreeLabel(
  pc: number,
  keyTonicPc: number,
  keyType: "major" | "minor"
): string {
  const intervals = keyType === "major" ? MAJOR_SCALE : NATURAL_MINOR_SCALE;
  const degreeIntervals = intervals.map((interval) => (interval + 12) % 12);
  const semitoneFromTonic = (pc - keyTonicPc + 12) % 12;
  const degreeIndex = degreeIntervals.indexOf(semitoneFromTonic);
  if (degreeIndex >= 0) {
    return String(degreeIndex + 1);
  }

  for (let i = 0; i < degreeIntervals.length; i += 1) {
    const interval = degreeIntervals[i];
    if (semitoneFromTonic === (interval + 1) % 12) {
      return `#${i + 1}`;
    }
    if (semitoneFromTonic === (interval + 11) % 12) {
      return `b${i + 1}`;
    }
  }

  return "?";
}
