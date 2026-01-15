"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  buildPentatonic,
  buildScale,
  chordToneSet,
  formatChordSummary,
  formatPitchClass,
  getCagedRegionsForKey,
  getNoteLetter,
  getRegionWindow,
  getRegionsForFret,
  getScaleDegreeLabel,
  parseLiteralChord,
  parseRomanNumeral,
  preferFlatsForKey,
  toPitchClass,
  type CagedRegionId,
  type ParseResult,
  type ResolvedChord
} from "../lib/theory";
import { MetronomeScheduler } from "../lib/audio/metronome";
import { resolveVoicingFrets, voicingLabel, VOICINGS, type VoicingShape } from "../lib/voicings";

const NOTE_OPTIONS = [
  "C",
  "C#",
  "Db",
  "D",
  "Eb",
  "E",
  "F",
  "F#",
  "Gb",
  "G",
  "Ab",
  "A",
  "Bb",
  "B"
];

const STRING_TUNING = [4, 11, 7, 2, 9, 4];
const FRET_COUNT = 16;

type SongSettings = {
  keyTonic: string;
  keyType: "major" | "minor";
  bpm: number;
  timeSig: { beatsPerBar: number; beatUnit: number };
};

type ChordBlock = {
  id: string;
  inputType: "roman" | "literal";
  input: string;
  bars: number;
  overlayMode: "chordTones" | "arpeggio" | "pentatonic" | "voicing";
  overrides: {
    pentatonicSource?: "key" | "chordRoot";
    scaleSource?: "key" | "chordRoot";
    voicingId?: string;
  };
};

type ResolvedBlock = {
  block: ChordBlock;
  result: ParseResult;
  chord?: ResolvedChord;
};

type VoicingOption = {
  shape: VoicingShape;
  label: string;
  frets: number[];
};

type NoteLabelMode = "off" | "letter" | "number";
type OverlayPosition = "All" | CagedRegionId;

type TimelineExample = {
  id: string;
  title: string;
  description: string;
  keyTonic: string;
  keyType: "major" | "minor";
  bpm: number;
  blocks: Array<Pick<ChordBlock, "inputType" | "input" | "bars" | "overlayMode">>;
};

export default function ChordTimelineApp() {
  const [songSettings, setSongSettings] = useState<SongSettings>({
    keyTonic: "G",
    keyType: "major",
    bpm: 90,
    timeSig: { beatsPerBar: 4, beatUnit: 4 }
  });
  const [blocks, setBlocks] = useState<ChordBlock[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [metronomeEnabled, setMetronomeEnabled] = useState(true);
  const [activeBlockIndex, setActiveBlockIndex] = useState<number | null>(null);
  const [playheadLabel, setPlayheadLabel] = useState("00:00");
  const [showCagedRegions, setShowCagedRegions] = useState(true);
  const [noteLabelMode, setNoteLabelMode] = useState<NoteLabelMode>("off");
  const [overlayPosition, setOverlayPosition] = useState<OverlayPosition>("All");
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const schedulerRef = useRef<MetronomeScheduler | null>(null);
  const startTimeRef = useRef<number>(0);
  const rafRef = useRef<number | null>(null);
  const helpDialogRef = useRef<HTMLDivElement | null>(null);

  const preferFlats = preferFlatsForKey(songSettings.keyTonic);

  const fretboardGrid = useMemo(() => {
    return STRING_TUNING.map((openPc, stringIndex) =>
      Array.from({ length: FRET_COUNT }, (_, fret) => ({
        stringIndex,
        fret,
        pc: (openPc + fret) % 12
      }))
    );
  }, []);

  const totalBars = useMemo(
    () => blocks.reduce((sum, block) => sum + block.bars, 0),
    [blocks]
  );

  const totalDurationSeconds = useMemo(() => {
    const secondsPerBeat = 60 / songSettings.bpm;
    return totalBars * songSettings.timeSig.beatsPerBar * secondsPerBeat;
  }, [songSettings.bpm, songSettings.timeSig.beatsPerBar, totalBars]);

  const resolvedBlocks = useMemo<ResolvedBlock[]>(() => {
    return blocks.map((block) => {
      const result = block.inputType === "literal"
        ? parseLiteralChord(block.input)
        : parseRomanNumeral(block.input, songSettings.keyTonic, songSettings.keyType);
      return { block, result, chord: result.ok ? result.chord : undefined };
    });
  }, [blocks, songSettings.keyTonic, songSettings.keyType]);

  const keyRoot = toPitchClass(songSettings.keyTonic) ?? 0;
  const keyScaleSet = useMemo(() => {
    return new Set(buildScale(keyRoot, songSettings.keyType));
  }, [keyRoot, songSettings.keyType]);

  const cagedRegions = useMemo(() => {
    return getCagedRegionsForKey(keyRoot, songSettings.keyType, 0, FRET_COUNT - 1);
  }, [keyRoot, songSettings.keyType]);

  const activeResolvedBlock = activeBlockIndex !== null ? resolvedBlocks[activeBlockIndex] : null;
  const activeOverlayMode = activeResolvedBlock?.block.overlayMode ?? null;
  const effectiveOverlayPosition =
    activeOverlayMode === "voicing" ? "All" : overlayPosition;
  const overlayWindow =
    effectiveOverlayPosition === "All" ? null : getRegionWindow(cagedRegions, effectiveOverlayPosition);

  const regionPalette: Record<CagedRegionId, string> = {
    C: "#60a5fa",
    A: "#34d399",
    G: "#fbbf24",
    E: "#f472b6",
    D: "#a78bfa"
  };

  const cagedLegendItems: Array<{ id: CagedRegionId; label: string }> = [
    { id: "C", label: "C shape" },
    { id: "A", label: "A shape" },
    { id: "G", label: "G shape" },
    { id: "E", label: "E shape" },
    { id: "D", label: "D shape" }
  ];

  const timelineExamples: TimelineExample[] = [
    {
      id: "pop-g",
      title: "Pop progression",
      description: "I – V – vi – IV, 1 bar each",
      keyTonic: "G",
      keyType: "major",
      bpm: 96,
      blocks: [
        { inputType: "roman", input: "I", bars: 1, overlayMode: "chordTones" },
        { inputType: "roman", input: "V", bars: 1, overlayMode: "chordTones" },
        { inputType: "roman", input: "vi", bars: 1, overlayMode: "chordTones" },
        { inputType: "roman", input: "IV", bars: 1, overlayMode: "chordTones" }
      ]
    },
    {
      id: "blues-a",
      title: "12-bar blues",
      description: "A7 / D7 / E7",
      keyTonic: "A",
      keyType: "major",
      bpm: 92,
      blocks: [
        { inputType: "literal", input: "A7", bars: 4, overlayMode: "chordTones" },
        { inputType: "literal", input: "D7", bars: 2, overlayMode: "chordTones" },
        { inputType: "literal", input: "A7", bars: 2, overlayMode: "chordTones" },
        { inputType: "literal", input: "E7", bars: 1, overlayMode: "chordTones" },
        { inputType: "literal", input: "D7", bars: 1, overlayMode: "chordTones" },
        { inputType: "literal", input: "A7", bars: 2, overlayMode: "chordTones" }
      ]
    },
    {
      id: "minor-a",
      title: "Minor groove",
      description: "i – bVII – bVI – bVII",
      keyTonic: "A",
      keyType: "minor",
      bpm: 88,
      blocks: [
        { inputType: "roman", input: "i", bars: 2, overlayMode: "pentatonic" },
        { inputType: "roman", input: "bVII", bars: 2, overlayMode: "pentatonic" },
        { inputType: "roman", input: "bVI", bars: 2, overlayMode: "pentatonic" },
        { inputType: "roman", input: "bVII", bars: 2, overlayMode: "pentatonic" }
      ]
    },
    {
      id: "jazz-c",
      title: "Jazz-ish turnaround",
      description: "Cmaj7 – Am7 – Dm7 – G7 (2 bars each)",
      keyTonic: "C",
      keyType: "major",
      bpm: 110,
      blocks: [
        { inputType: "literal", input: "Cmaj7", bars: 2, overlayMode: "arpeggio" },
        { inputType: "literal", input: "Am7", bars: 2, overlayMode: "arpeggio" },
        { inputType: "literal", input: "Dm7", bars: 2, overlayMode: "arpeggio" },
        { inputType: "literal", input: "G7", bars: 2, overlayMode: "arpeggio" }
      ]
    }
  ];

  const overlay = useMemo(() => {
    if (!activeResolvedBlock?.chord) {
      return { noteSet: new Set<number>(), positionSet: new Set<string>() };
    }
    const chord = activeResolvedBlock.chord;
    const mode = activeResolvedBlock.block.overlayMode;
    const overrides = activeResolvedBlock.block.overrides;

    if (mode === "voicing") {
      const shape = VOICINGS.find((item) => item.id === overrides.voicingId);
      if (!shape) {
        return { noteSet: new Set<number>(), positionSet: new Set<string>() };
      }
      const frets = resolveVoicingFrets(shape, chord.root);
      const positionSet = new Set<string>();
      frets.forEach((fret, stringIndex) => {
        if (fret >= 0 && fret < FRET_COUNT) {
          positionSet.add(`${stringIndex}-${fret}`);
        }
      });
      return { noteSet: new Set<number>(), positionSet };
    }

    if (mode === "pentatonic") {
      const source = overrides.pentatonicSource ?? "key";
      const root = source === "chordRoot" ? chord.root : keyRoot;
      const type = source === "chordRoot" ? (chord.quality.startsWith("min") ? "minor" : "major") : songSettings.keyType;
      return { noteSet: new Set(buildPentatonic(root, type)), positionSet: new Set<string>() };
    }

    if (mode === "chordTones" || mode === "arpeggio") {
      return { noteSet: new Set(chordToneSet(chord)), positionSet: new Set<string>() };
    }

    return { noteSet: new Set<number>(), positionSet: new Set<string>() };
  }, [activeResolvedBlock, keyRoot, songSettings.keyType]);

  const secondsPerBeat = 60 / songSettings.bpm;

  const stopPlayback = useCallback(() => {
    schedulerRef.current?.stop();
    schedulerRef.current = null;
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
    }
    rafRef.current = null;
    setIsPlaying(false);
    setActiveBlockIndex(null);
    setPlayheadLabel("00:00");
  }, []);

  const startPlayback = useCallback(() => {
    if (totalDurationSeconds <= 0) return;

    if (!audioCtxRef.current) {
      audioCtxRef.current = new AudioContext();
    }
    const audioCtx = audioCtxRef.current;
    audioCtx.resume();

    if (!schedulerRef.current) {
      schedulerRef.current = new MetronomeScheduler(audioCtx);
    }

    const startTime = audioCtx.currentTime + 0.05;
    startTimeRef.current = startTime;

    schedulerRef.current.start({
      bpm: songSettings.bpm,
      beatsPerBar: songSettings.timeSig.beatsPerBar,
      clickEnabled: metronomeEnabled,
      startTime
    });

    setIsPlaying(true);

    const update = () => {
      const now = audioCtx.currentTime;
      const elapsed = Math.max(0, now - startTimeRef.current);
      const loopTime = totalDurationSeconds > 0 ? elapsed % totalDurationSeconds : 0;

      let accumulated = 0;
      let activeIndex: number | null = null;
      for (let i = 0; i < blocks.length; i += 1) {
        const blockSeconds = blocks[i].bars * songSettings.timeSig.beatsPerBar * secondsPerBeat;
        if (loopTime >= accumulated && loopTime < accumulated + blockSeconds) {
          activeIndex = i;
          break;
        }
        accumulated += blockSeconds;
      }
      setActiveBlockIndex(activeIndex);

      const totalBeats = Math.floor(elapsed / secondsPerBeat);
      const beatInBar = (totalBeats % songSettings.timeSig.beatsPerBar) + 1;
      const barNumber = Math.floor(totalBeats / songSettings.timeSig.beatsPerBar) + 1;
      setPlayheadLabel(`Bar ${barNumber} · Beat ${beatInBar}`);

      rafRef.current = requestAnimationFrame(update);
    };

    rafRef.current = requestAnimationFrame(update);
  }, [
    blocks,
    metronomeEnabled,
    secondsPerBeat,
    songSettings.bpm,
    songSettings.timeSig.beatsPerBar,
    totalDurationSeconds
  ]);

  useEffect(() => {
    return () => {
      stopPlayback();
      audioCtxRef.current?.close();
      audioCtxRef.current = null;
    };
  }, [stopPlayback]);

  useEffect(() => {
    if (isPlaying) {
      stopPlayback();
      startPlayback();
    }
  }, [songSettings.bpm, songSettings.timeSig.beatsPerBar, blocks, metronomeEnabled]);

  useEffect(() => {
    if (!isHelpOpen) return;
    const dialog = helpDialogRef.current;
    if (dialog) {
      dialog.focus();
    }
  }, [isHelpOpen]);

  useEffect(() => {
    if (!isHelpOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsHelpOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isHelpOpen]);

  const handleAddBlock = (event: React.FormEvent) => {
    event.preventDefault();
    setBlocks((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        inputType: "roman",
        input: "I",
        bars: 2,
        overlayMode: "chordTones",
        overrides: { pentatonicSource: "key" }
      }
    ]);
  };

  const updateBlock = (id: string, updates: Partial<ChordBlock>) => {
    setBlocks((prev) =>
      prev.map((block) => (block.id === id ? { ...block, ...updates } : block))
    );
  };

  const updateBlockOverride = (
    id: string,
    overrides: Partial<ChordBlock["overrides"]>
  ) => {
    setBlocks((prev) =>
      prev.map((block) =>
        block.id === id
          ? { ...block, overrides: { ...block.overrides, ...overrides } }
          : block
      )
    );
  };

  const moveBlock = (index: number, direction: -1 | 1) => {
    setBlocks((prev) => {
      const next = [...prev];
      const newIndex = index + direction;
      if (newIndex < 0 || newIndex >= next.length) return prev;
      const [item] = next.splice(index, 1);
      next.splice(newIndex, 0, item);
      return next;
    });
  };

  const removeBlock = (id: string) => {
    setBlocks((prev) => prev.filter((block) => block.id !== id));
  };

  const loadExample = (example: TimelineExample) => {
    setSongSettings((prev) => ({
      ...prev,
      keyTonic: example.keyTonic,
      keyType: example.keyType,
      bpm: example.bpm
    }));
    setBlocks(
      example.blocks.map((block) => ({
        id: crypto.randomUUID(),
        inputType: block.inputType,
        input: block.input,
        bars: block.bars,
        overlayMode: block.overlayMode,
        overrides: { pentatonicSource: "key" }
      }))
    );
    setActiveBlockIndex(null);
    setIsHelpOpen(false);
  };

  const buildVoicingOptions = (chord: ResolvedChord | undefined): VoicingOption[] => {
    if (!chord) return [];
    return VOICINGS.filter((shape) => shape.quality === chord.quality)
      .map((shape) => {
        const frets = resolveVoicingFrets(shape, chord.root);
        const fits = frets.every((fret) => fret < FRET_COUNT);
        if (!fits) return null;
        return {
          shape,
          frets,
          label: voicingLabel(shape, chord.root, preferFlats)
        };
      })
      .filter((item): item is VoicingOption => item !== null);
  };

  const getDotLabel = (pc: number) => {
    if (noteLabelMode === "off") return "";
    if (noteLabelMode === "letter") return getNoteLetter(pc, preferFlats);
    return getScaleDegreeLabel(pc, keyRoot, songSettings.keyType);
  };

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-2 border-b border-slate-800 pb-4">
        <p className="text-xs uppercase tracking-[0.4em] text-slate-500">Studio tool</p>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-3xl font-semibold text-slate-100">Chord Timeline Fretboard</h1>
          <Link
            href="/help"
            className="text-xs uppercase tracking-[0.25em] text-slate-400 hover:text-slate-200 transition-colors"
          >
            Help
          </Link>
        </div>
        <p className="text-slate-400 text-sm max-w-2xl">
          Build a timeline of chords, hit play, and watch the fretboard update in time.
        </p>
      </header>

      <section className="grid lg:grid-cols-[2fr,1fr] gap-6">
        <div className="card space-y-4">
          {/* Section card layout keeps settings scannable while practicing. */}
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Song Controls</h2>
            <div className="text-xs text-slate-500">Key, tempo, and meter</div>
          </div>
          <div className="grid md:grid-cols-4 gap-4 items-end">
            <div className="space-y-1">
              <label>Key Tonic</label>
              <select
                className="w-full"
                value={songSettings.keyTonic}
                onChange={(event) =>
                  setSongSettings((prev) => ({ ...prev, keyTonic: event.target.value }))
                }
              >
                {NOTE_OPTIONS.map((note) => (
                  <option key={note} value={note}>
                    {note}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label>Key Type</label>
              <select
                className="w-full"
                value={songSettings.keyType}
                onChange={(event) =>
                  setSongSettings((prev) => ({
                    ...prev,
                    keyType: event.target.value as SongSettings["keyType"]
                  }))
                }
              >
                <option value="major">Major</option>
                <option value="minor">Natural Minor</option>
              </select>
            </div>
            <div className="space-y-1">
              <label>BPM</label>
              <input
                className="w-full"
                type="number"
                min={30}
                max={220}
                value={songSettings.bpm}
                onChange={(event) =>
                  setSongSettings((prev) => ({
                    ...prev,
                    bpm: Number(event.target.value)
                  }))
                }
              />
            </div>
            <div className="space-y-1">
              <label>Time Signature</label>
              <div className="text-sm font-medium text-slate-200">{songSettings.timeSig.beatsPerBar}/{songSettings.timeSig.beatUnit}</div>
            </div>
          </div>
        </div>

        <div className="card space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Playback</h2>
            <div className="text-xs text-slate-500">Loop & metronome</div>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => (isPlaying ? stopPlayback() : startPlayback())}
              className="px-4 py-2 text-sm font-medium bg-emerald-500/90 hover:bg-emerald-400 transition-colors shadow-[0_8px_18px_rgba(16,185,129,0.3)]"
            >
              {isPlaying ? "Stop" : "Play"}
            </button>
            <button
              type="button"
              className="secondary px-3 py-2 text-sm font-medium"
              onClick={() => setMetronomeEnabled((prev) => !prev)}
            >
              Metronome: {metronomeEnabled ? "On" : "Off"}
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm text-slate-300">
            <div className="rounded-md bg-[#151b27] px-3 py-2 border border-slate-800/80">
              Looping: {totalBars > 0 ? "On" : "Off"}
            </div>
            <div className="rounded-md bg-[#151b27] px-3 py-2 border border-slate-800/80">
              Playhead: {playheadLabel}
            </div>
          </div>
        </div>
      </section>

      <section className="card space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Fretboard</h2>
          <div className="text-sm text-slate-500">0-15 frets</div>
        </div>
        <div className="flex flex-wrap items-center gap-4 text-sm text-slate-400">
          <div>
            Background: {formatPitchClass(keyRoot, preferFlats)} {songSettings.keyType} scale
          </div>
          <label className="flex items-center gap-2 text-xs text-slate-400">
            <input
              type="checkbox"
              checked={showCagedRegions}
              onChange={(event) => setShowCagedRegions(event.target.checked)}
              className="h-3 w-3 accent-emerald-400"
            />
            Color CAGED Regions
          </label>
          <div className="flex items-center gap-2">
            <label>Note Labels</label>
            <select
              value={noteLabelMode}
              onChange={(event) => setNoteLabelMode(event.target.value as NoteLabelMode)}
            >
              <option value="off">Off</option>
              <option value="letter">Letter</option>
              <option value="number">Number</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <label>Overlay Position</label>
            <select
              value={overlayPosition}
              onChange={(event) => setOverlayPosition(event.target.value as OverlayPosition)}
            >
              <option value="All">All</option>
              <option value="C">C</option>
              <option value="A">A</option>
              <option value="G">G</option>
              <option value="E">E</option>
              <option value="D">D</option>
            </select>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-300">
            <span className="text-slate-500 uppercase tracking-[0.2em]">CAGED Colors</span>
            {cagedLegendItems.map((item) => (
              <div key={item.id} className="flex items-center gap-2">
                <span
                  className="h-3 w-3 rounded-full border border-white/20"
                  style={{ backgroundColor: regionPalette[item.id] }}
                />
                <span className="text-slate-300">{item.label}</span>
              </div>
            ))}
          </div>
          {activeOverlayMode === "voicing" && overlayPosition !== "All" && (
            <div className="text-xs text-slate-500">Voicing ignores position filter.</div>
          )}
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-800/80 bg-gradient-to-b from-[#141a24] to-[#0f141c] shadow-inner">
          <div className="relative min-w-[720px] p-4">
            <div
              className="grid"
              style={{
                gridTemplateColumns: `60px repeat(${FRET_COUNT}, minmax(36px, 1fr))`
              }}
            >
              <div className="text-xs text-slate-500" />
              {Array.from({ length: FRET_COUNT }, (_, fret) => (
                <div key={`fret-${fret}`} className="text-[10px] text-center text-slate-500">
                  {fret}
                </div>
              ))}
            </div>

            {fretboardGrid.map((stringRow, stringIndex) => (
              <div
                key={`string-${stringIndex}`}
                className="relative grid items-center before:content-[''] before:absolute before:left-0 before:right-0 before:top-1/2 before:h-px before:bg-slate-700/70"
                style={{
                  gridTemplateColumns: `60px repeat(${FRET_COUNT}, minmax(36px, 1fr))`
                }}
              >
                <div className="text-xs text-slate-400">{["E", "B", "G", "D", "A", "E"][stringIndex]}</div>
                {stringRow.map((cell) => {
                  const background = keyScaleSet.has(cell.pc);
                  const inOverlayWindow = overlayWindow
                    ? cell.fret >= overlayWindow.fretStart && cell.fret <= overlayWindow.fretEnd
                    : true;
                  const overlayActive = inOverlayWindow && (overlay.positionSet.size > 0
                    ? overlay.positionSet.has(`${cell.stringIndex}-${cell.fret}`)
                    : overlay.noteSet.has(cell.pc));
                  const isRoot = overlayActive && activeResolvedBlock?.chord?.root === cell.pc;
                  const label = getDotLabel(cell.pc);
                  const regionHits =
                    overlayActive && showCagedRegions ? getRegionsForFret(cagedRegions, cell.fret) : [];
                  const overlayColor =
                    effectiveOverlayPosition !== "All"
                      ? regionPalette[effectiveOverlayPosition]
                      : "#34d399";
                  const dotStyle: React.CSSProperties = {};
                  if (overlayActive) {
                    if (effectiveOverlayPosition !== "All") {
                      dotStyle.backgroundColor = overlayColor;
                    } else if (regionHits.length === 1) {
                      dotStyle.backgroundColor = regionPalette[regionHits[0]];
                    } else if (regionHits.length >= 2) {
                      const [first, second] = regionHits;
                      dotStyle.backgroundImage = `linear-gradient(90deg, ${regionPalette[first]} 0 50%, ${regionPalette[second]} 50% 100%)`;
                    } else {
                      dotStyle.backgroundColor = overlayColor;
                    }
                  }

                  return (
                    <div key={`${cell.stringIndex}-${cell.fret}`} className="relative h-10 flex items-center justify-center">
                      <div className="absolute inset-y-0 left-1/2 w-px bg-slate-800/70" />
                      {background && (
                        <div className="w-2.5 h-2.5 rounded-full bg-slate-500/50 flex items-center justify-center">
                          {noteLabelMode !== "off" && (
                            <span className="text-[9px] text-slate-200/60">{label}</span>
                          )}
                        </div>
                      )}
                      {overlayActive && (
                        <div
                          className={`absolute w-4 h-4 rounded-full shadow-[0_0_12px_rgba(52,211,153,0.5)] transition-transform duration-150 scale-105 flex items-center justify-center ${isRoot ? "ring-2 ring-emerald-200/80" : ""}`}
                          style={dotStyle}
                        >
                          {noteLabelMode !== "off" && (
                            <span className="text-[9px] font-semibold text-slate-900 drop-shadow-[0_0_4px_rgba(0,0,0,0.6)]">
                              {label}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="card space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold">Timeline</h2>
            <button
              type="button"
              className="ghost text-xs uppercase tracking-[0.2em]"
              aria-label="Open timeline help"
              onClick={() => setIsHelpOpen(true)}
            >
              Help
            </button>
          </div>
          <button
            className="px-4 py-2 text-sm font-medium bg-emerald-500/90 hover:bg-emerald-400 transition-colors"
            onClick={handleAddBlock}
          >
            Add Block
          </button>
        </div>

        {blocks.length === 0 && (
          <div className="text-sm text-slate-400">Add a block to begin.</div>
        )}

        <div className="space-y-4">
          {resolvedBlocks.map(({ block, result, chord }, index) => {
            const error = !result.ok ? result.error : null;
            const summary = chord ? formatChordSummary(chord, preferFlats) : "";
            const voicingOptions = buildVoicingOptions(chord);
            return (
              <div
                key={block.id}
                className={`border rounded-lg p-4 space-y-3 transition-colors ${activeBlockIndex === index ? "border-emerald-400/70 bg-emerald-500/10 ring-1 ring-emerald-400/30" : "border-slate-800/80 bg-[#101521]"}`}
              >
                <div className="flex flex-wrap gap-2 items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-7 w-7 rounded-full bg-slate-900 text-white text-xs flex items-center justify-center">
                      {index + 1}
                    </div>
                    <div>
                      <div className="text-sm font-semibold">Block {index + 1}</div>
                      <div className="text-xs text-slate-500">
                        {block.bars} bars · {block.overlayMode}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button className="ghost text-xs px-2 py-1" onClick={() => moveBlock(index, -1)}>
                      Up
                    </button>
                    <button className="ghost text-xs px-2 py-1" onClick={() => moveBlock(index, 1)}>
                      Down
                    </button>
                    <button className="secondary text-xs px-2 py-1" onClick={() => removeBlock(block.id)}>
                      Delete
                    </button>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label>Input Type</label>
                    <select
                      className="w-full"
                      value={block.inputType}
                      onChange={(event) =>
                        updateBlock(block.id, { inputType: event.target.value as ChordBlock["inputType"] })
                      }
                    >
                      <option value="roman">Roman</option>
                      <option value="literal">Literal</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label>Chord</label>
                    <input
                      className="w-full"
                      value={block.input}
                      onChange={(event) => updateBlock(block.id, { input: event.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <label>Bars</label>
                    <input
                      className="w-full"
                      type="number"
                      min={1}
                      value={block.bars}
                      onChange={(event) =>
                        updateBlock(block.id, { bars: Math.max(1, Number(event.target.value)) })
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <label>Overlay Mode</label>
                    <select
                      className="w-full"
                      value={block.overlayMode}
                      onChange={(event) =>
                        updateBlock(block.id, {
                          overlayMode: event.target.value as ChordBlock["overlayMode"]
                        })
                      }
                    >
                      <option value="chordTones">Chord Tones</option>
                      <option value="arpeggio">Arpeggio</option>
                      <option value="pentatonic">Pentatonic</option>
                      <option value="voicing">Voicing</option>
                    </select>
                  </div>
                </div>

                {block.overlayMode === "pentatonic" && (
                  <div className="space-y-1">
                    <label>Pentatonic Source</label>
                    <select
                      className="w-full"
                      value={block.overrides.pentatonicSource ?? "key"}
                      onChange={(event) =>
                        updateBlockOverride(block.id, {
                          pentatonicSource: event.target.value as "key" | "chordRoot"
                        })
                      }
                    >
                      <option value="key">Key</option>
                      <option value="chordRoot">Chord Root</option>
                    </select>
                  </div>
                )}

                {block.overlayMode === "voicing" && (
                  <div className="space-y-1">
                    <label>Voicing</label>
                    <select
                      className="w-full"
                      value={block.overrides.voicingId ?? ""}
                      onChange={(event) =>
                        updateBlockOverride(block.id, { voicingId: event.target.value })
                      }
                    >
                      <option value="">Select voicing</option>
                      {voicingOptions.map((option) => (
                        <option key={option.shape.id} value={option.shape.id}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="text-sm">
                  <div className={error ? "text-red-400" : "text-slate-300"}>
                    {error ? `Error: ${error}` : `Resolved: ${summary}`}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {isHelpOpen && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 px-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="timeline-help-title"
        >
          <div
            ref={helpDialogRef}
            tabIndex={-1}
            className="w-full max-w-2xl rounded-xl border border-slate-700 bg-[#0f141d] p-6 shadow-[0_20px_50px_rgba(0,0,0,0.6)] space-y-5"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 id="timeline-help-title" className="text-lg font-semibold text-slate-100">
                  Timeline Help & Examples
                </h3>
                <p className="text-sm text-slate-400">
                  Chord blocks define what the fretboard shows for a number of bars in 4/4.
                </p>
              </div>
              <button
                type="button"
                className="ghost text-xs uppercase tracking-[0.2em]"
                aria-label="Close timeline help"
                onClick={() => setIsHelpOpen(false)}
              >
                Close
              </button>
            </div>

            <div className="space-y-3 text-sm text-slate-300">
              <p><strong className="text-slate-200">Chord block:</strong> one chord + duration (bars). Each bar is 4 beats.</p>
              <p><strong className="text-slate-200">Roman vs Literal:</strong> Roman numerals follow the key (I, vi, bVII). Literal chords are exact names (Cmaj7, F#m7b5).</p>
              <p><strong className="text-slate-200">Overlay modes:</strong> Chord tones = chord notes, Pentatonic = 5-note scale, Arpeggio = chord tones (visual).</p>
              <p><strong className="text-slate-200">Overlay Position:</strong> restricts overlay dots to a single CAGED region.</p>
            </div>

            <div className="space-y-4">
              {timelineExamples.map((example) => (
                <div key={example.id} className="rounded-lg border border-slate-700 bg-[#121826] p-4 space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <div className="text-sm font-semibold text-slate-100">{example.title}</div>
                      <div className="text-xs text-slate-400">
                        Key: {example.keyTonic} {example.keyType} · {example.description}
                      </div>
                    </div>
                    <button
                      type="button"
                      className="secondary text-xs px-3 py-1"
                      aria-label={`Load example ${example.title}`}
                      onClick={() => loadExample(example)}
                    >
                      Load this example
                    </button>
                  </div>
                  <div className="text-xs text-slate-400">
                    {example.blocks.map((block) => `${block.input} (${block.bars} bar${block.bars > 1 ? "s" : ""})`).join(" · ")}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
