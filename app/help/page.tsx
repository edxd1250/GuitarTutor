export default function HelpPage() {
  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-2 border-b border-slate-800 pb-4">
        <p className="text-xs uppercase tracking-[0.4em] text-slate-500">Help</p>
        <h1 className="text-3xl font-semibold text-slate-100">How to Use Chord Timeline Fretboard</h1>
        <p className="text-slate-400 text-sm max-w-2xl">
          This tool lets you build a chord timeline and practice scales or chord tones across the guitar neck.
          It is designed to feel like a studio tool: clear, focused, and reliable.
        </p>
      </header>

      <section className="card space-y-4">
        <h2 className="text-lg font-semibold">Quick Start</h2>
        <ol className="list-decimal list-inside space-y-2 text-sm text-slate-300">
          <li>Choose a song key (major or natural minor).</li>
          <li>Set your BPM.</li>
          <li>Add chord blocks (Roman numerals or literal chord names).</li>
          <li>Press Play to loop the timeline.</li>
          <li>Use Overlay Mode + Overlay Position to practice inside a CAGED box.</li>
        </ol>
      </section>

      <section className="card space-y-4">
        <h2 className="text-lg font-semibold">How to Read the Fretboard</h2>
        <ul className="list-disc list-inside space-y-2 text-sm text-slate-300">
          <li>Muted dots = the song key scale.</li>
          <li>Bright dots = the active overlay (chord tones, arpeggio, or pentatonic).</li>
          <li>Root notes are emphasized with a subtle ring.</li>
          <li>CAGED colors show which shape region a note belongs to.</li>
        </ul>
      </section>

      <section className="card space-y-4">
        <h2 className="text-lg font-semibold">Why CAGED Helps</h2>
        <p className="text-sm text-slate-300">
          The CAGED system maps five familiar chord shapes across the neck, helping you connect chord voicings
          to scale locations. Practicing inside one shape at a time builds position awareness and makes it easier
          to move ideas up the neck.
        </p>
      </section>

      <section className="card space-y-4">
        <h2 className="text-lg font-semibold">Tips</h2>
        <ul className="list-disc list-inside space-y-2 text-sm text-slate-300">
          <li>Start with Overlay Position set to All, then choose a single CAGED position.</li>
          <li>Practice chord tones first, then switch to pentatonic for flow.</li>
          <li>Keep BPM comfortable and focus on clean timing.</li>
        </ul>
      </section>

      <section className="card space-y-4">
        <h2 className="text-lg font-semibold">Keyboard Shortcuts</h2>
        <p className="text-sm text-slate-400">
          TODO: Add keyboard shortcuts like Space for play/pause.
        </p>
      </section>
    </div>
  );
}
