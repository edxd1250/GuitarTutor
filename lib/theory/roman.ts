import { buildScale } from "./scales";
import { CHORD_QUALITY_INTERVALS, type ChordQuality, type ParseResult, type ResolvedChord } from "./chords";
import { toPitchClass } from "./pitch";

const ROMAN_DEGREES: Record<string, number> = {
  I: 1,
  II: 2,
  III: 3,
  IV: 4,
  V: 5,
  VI: 6,
  VII: 7
};

type RomanParts = {
  accidental: number;
  degree: number;
  isLower: boolean;
  suffix: string;
};

function parseRomanPart(input: string): RomanParts | null {
  const match = /^([b#]?)([ivIV]+)(.*)$/.exec(input);
  if (!match) return null;
  const accidental = match[1] === "b" ? -1 : match[1] === "#" ? 1 : 0;
  const roman = match[2];
  const degree = ROMAN_DEGREES[roman.toUpperCase()];
  if (!degree) return null;
  return {
    accidental,
    degree,
    isLower: roman === roman.toLowerCase(),
    suffix: match[3]
  };
}

function qualityFromRoman(parts: RomanParts): ChordQuality | null {
  const suffix = parts.suffix;
  if (/ø/.test(suffix)) return "m7b5";
  if (/°|dim|o/i.test(suffix)) return "dim";
  if (/\+|aug/i.test(suffix)) return "aug";
  return parts.isLower ? "min" : "maj";
}

export function parseRomanNumeral(
  input: string,
  keyTonic: string,
  keyType: "major" | "minor"
): ParseResult {
  const trimmed = input.trim().replace(/\s+/g, "");
  if (!trimmed) return { ok: false, error: "Empty roman numeral." };

  const pieces = trimmed.split("/");
  if (pieces.length > 2) {
    return { ok: false, error: "Too many secondary dominants." };
  }

  const main = parseRomanPart(pieces[0]);
  if (!main) {
    return { ok: false, error: "Invalid roman numeral." };
  }

  const keyRoot = toPitchClass(keyTonic);
  if (keyRoot === null) {
    return { ok: false, error: "Invalid key tonic." };
  }

  const keyScale = buildScale(keyRoot, keyType);
  const mainQuality = qualityFromRoman(main);
  if (!mainQuality) {
    return { ok: false, error: "Unsupported roman numeral quality." };
  }

  const resolveDegree = (degree: number, accidental: number) => {
    const base = keyScale[degree - 1];
    return (base + accidental + 12) % 12;
  };

  let root: number;

  if (pieces.length === 2) {
    const target = parseRomanPart(pieces[1]);
    if (!target) {
      return { ok: false, error: "Invalid secondary target." };
    }
    const targetRoot = resolveDegree(target.degree, target.accidental);
    const baseRoman = pieces[0].replace(/^[b#]?/i, "").toUpperCase();

    if (baseRoman.startsWith("V")) {
      root = (targetRoot + 7) % 12;
    } else if (baseRoman.startsWith("VII")) {
      root = (targetRoot + 11) % 12;
    } else {
      return { ok: false, error: "Only V/x or VII°/x supported in MVP." };
    }
  } else {
    root = resolveDegree(main.degree, main.accidental);
  }

  const intervals = CHORD_QUALITY_INTERVALS[mainQuality];
  const chord: ResolvedChord = { root, quality: mainQuality, intervals };
  return { ok: true, chord };
}
