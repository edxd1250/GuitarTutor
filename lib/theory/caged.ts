export type CagedRegionId = "C" | "A" | "G" | "E" | "D";

export type CagedRegion = {
  id: CagedRegionId;
  label: string;
  fretStart: number;
  fretEnd: number;
};

type CagedTemplate = {
  id: CagedRegionId;
  label: string;
  anchorFret: number;
  startOffset: number;
  endOffset: number;
};

const C_MAJOR_TEMPLATES: CagedTemplate[] = [
  { id: "C", label: "C shape", anchorFret: 3, startOffset: -3, endOffset: 1 },
  { id: "A", label: "A shape", anchorFret: 3, startOffset: -1, endOffset: 3 },
  { id: "G", label: "G shape", anchorFret: 3, startOffset: -1, endOffset: 3 },
  { id: "E", label: "E shape", anchorFret: 8, startOffset: -1, endOffset: 3 },
  { id: "D", label: "D shape", anchorFret: 10, startOffset: -2, endOffset: 2 }
];

const A_MINOR_TEMPLATES: CagedTemplate[] = [
  { id: "A", label: "A shape", anchorFret: 0, startOffset: 0, endOffset: 3 },
  { id: "G", label: "G shape", anchorFret: 5, startOffset: -2, endOffset: 2 },
  { id: "E", label: "E shape", anchorFret: 5, startOffset: -1, endOffset: 3 },
  { id: "D", label: "D shape", anchorFret: 10, startOffset: -2, endOffset: 2 },
  { id: "C", label: "C shape", anchorFret: 12, startOffset: -3, endOffset: 1 }
];

function clampWindow(fretStart: number, fretEnd: number, min: number, max: number) {
  const start = Math.max(min, fretStart);
  const end = Math.min(max, fretEnd);
  if (end < min || start > max || start > end) return null;
  return { start, end };
}

function chooseShift(
  baseStart: number,
  baseEnd: number,
  diff: number,
  min: number,
  max: number
) {
  const shifts = [diff, diff - 12];
  let bestShift = shifts[0];
  let bestOverlap = -1;
  shifts.forEach((shift) => {
    const window = clampWindow(baseStart + shift, baseEnd + shift, min, max);
    if (!window) return;
    const overlap = window.end - window.start;
    if (overlap > bestOverlap) {
      bestOverlap = overlap;
      bestShift = shift;
    }
  });
  return bestShift;
}

export function getCagedRegionsForKey(
  keyTonicPc: number,
  keyType: "major" | "minor",
  fretMin: number,
  fretMax: number
): CagedRegion[] {
  const baseKeyPc = keyType === "major" ? 0 : 9;
  const diff = (keyTonicPc - baseKeyPc + 12) % 12;
  const templates = keyType === "major" ? C_MAJOR_TEMPLATES : A_MINOR_TEMPLATES;

  return templates
    .map((template) => {
      const baseStart = template.anchorFret + template.startOffset;
      const baseEnd = template.anchorFret + template.endOffset;
      const shift = chooseShift(baseStart, baseEnd, diff, fretMin, fretMax);
      const window = clampWindow(baseStart + shift, baseEnd + shift, fretMin, fretMax);
      if (!window) return null;
      return {
        id: template.id,
        label: template.label,
        fretStart: window.start,
        fretEnd: window.end
      };
    })
    .filter((region): region is CagedRegion => region !== null);
}

export function getRegionWindow(regions: CagedRegion[], id: CagedRegionId) {
  const region = regions.find((item) => item.id === id);
  if (!region) return null;
  return { fretStart: region.fretStart, fretEnd: region.fretEnd };
}

export function getRegionsForFret(regions: CagedRegion[], fret: number): CagedRegionId[] {
  return regions
    .filter((region) => fret >= region.fretStart && fret <= region.fretEnd)
    .map((region) => region.id);
}
