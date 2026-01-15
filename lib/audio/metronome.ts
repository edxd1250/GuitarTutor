type MetronomeConfig = {
  bpm: number;
  beatsPerBar: number;
  clickEnabled: boolean;
  startTime: number;
};

export class MetronomeScheduler {
  private audioCtx: AudioContext;
  private intervalId: number | null = null;
  private nextBeatTime = 0;
  private beatIndex = 0;
  private config: MetronomeConfig | null = null;
  private readonly lookaheadMs = 25;
  private readonly scheduleAheadTime = 0.12;

  constructor(audioCtx: AudioContext) {
    this.audioCtx = audioCtx;
  }

  start(config: MetronomeConfig) {
    this.stop();
    this.config = config;
    this.nextBeatTime = config.startTime;
    this.beatIndex = 0;
    this.intervalId = window.setInterval(() => this.tick(), this.lookaheadMs);
  }

  stop() {
    if (this.intervalId !== null) {
      window.clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  updateConfig(config: MetronomeConfig) {
    this.start(config);
  }

  private tick() {
    if (!this.config) return;
    const { bpm, beatsPerBar, clickEnabled } = this.config;
    const secondsPerBeat = 60 / bpm;
    while (this.nextBeatTime < this.audioCtx.currentTime + this.scheduleAheadTime) {
      if (clickEnabled) {
        const isDownbeat = this.beatIndex % beatsPerBar === 0;
        this.scheduleClick(this.nextBeatTime, isDownbeat);
      }
      this.nextBeatTime += secondsPerBeat;
      this.beatIndex += 1;
    }
  }

  private scheduleClick(time: number, accent: boolean) {
    const osc = this.audioCtx.createOscillator();
    const gain = this.audioCtx.createGain();
    osc.type = "square";
    osc.frequency.value = accent ? 1000 : 750;
    gain.gain.value = 0.0001;

    osc.connect(gain);
    gain.connect(this.audioCtx.destination);

    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.exponentialRampToValueAtTime(0.12, time + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.05);

    osc.start(time);
    osc.stop(time + 0.06);
  }
}
