// GrainScheduler - Main thread scheduler for real-time granular synthesis
// Schedules grain events ahead of time and sends them to the AudioWorkletProcessor

import type { GranularSettings, WindowType } from './granularSettings';

// Grain event sent to the worklet
export type GrainEvent = {
  startSample: number;  // absolute output sample index
  pos01: number;        // 0..1 buffer position
  durSamp: number;      // grain length in samples
  rate: number;         // playback rate
  gainL: number;        // left channel gain
  gainR: number;        // right channel gain
  windowType: WindowType;
};

// Scheduler parameters derived from GranularSettings
export type SchedulerParams = {
  density: number;        // grains per second
  grainSizeMs: number;    // average grain size in ms
  sizeJitter: number;     // 0..1 (fraction)
  posCenter01: number;    // 0..1 scan center (scanStart + scanWidth/2)
  posWidth01: number;     // 0..1 scan width
  posJitterMs: number;    // start position jitter in ms
  pitchST: number;        // semitones
  pitchRandST: number;    // semitone random range
  panSpread: number;      // 0..1
  level: number;          // overall level
  windowType: WindowType;
};

// Seeded PRNG (Mulberry32) for deterministic grain scheduling
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const clamp = (x: number, a: number, b: number) => Math.max(a, Math.min(b, x));
const stToRate = (st: number) => Math.pow(2, st / 12);

// Convert GranularSettings to SchedulerParams
export function granularSettingsToSchedulerParams(settings: GranularSettings): SchedulerParams {
  return {
    density: settings.densityGps,
    grainSizeMs: settings.grainSizeMs,
    sizeJitter: 0.25, // Default grain size jitter (25%)
    posCenter01: settings.scanStart + settings.scanWidth / 2,
    posWidth01: settings.scanWidth,
    posJitterMs: settings.posJitterMs,
    pitchST: settings.pitchST,
    pitchRandST: settings.pitchRandST,
    panSpread: settings.panSpread,
    level: settings.wetMix, // Use wetMix as level
    windowType: settings.windowType,
  };
}

export class GrainScheduler {
  private node: AudioWorkletNode;
  private sampleRate: number;
  private seed: number;
  private rng: () => number;

  private scheduleIntervalMs = 20;
  private scheduleAheadSec = 0.12;

  private running = false;
  private intervalId: ReturnType<typeof setTimeout> | null = null;

  // Absolute output sample we've scheduled up to
  private scheduledThroughSample = 0;

  // Worklet clock (absolute output sample index at "now")
  private workletNowSample = 0;

  // Buffer length for position mapping
  private bufferLength = 1;

  // Callback for when buffer info is received
  private onBufferInfo: ((length: number) => void) | null = null;

  constructor(node: AudioWorkletNode, sampleRate: number, seed: number) {
    this.node = node;
    this.sampleRate = sampleRate;
    this.seed = seed;
    this.rng = mulberry32(seed);

    this.node.port.onmessage = (e: MessageEvent) => {
      const msg = e.data;
      if (msg?.type === "clock") {
        this.workletNowSample = msg.nowSample | 0;
      } else if (msg?.type === "bufferInfo") {
        this.bufferLength = msg.length | 0;
        if (this.onBufferInfo) {
          this.onBufferInfo(this.bufferLength);
        }
      }
    };
  }

  start(paramsProvider: () => SchedulerParams) {
    if (this.running) return;
    this.running = true;

    // Ask worklet for frequent clock updates
    this.node.port.postMessage({ type: "clockStart", intervalMs: 30 });

    // Initialize scheduledThroughSample slightly ahead to prevent late scheduling
    this.scheduledThroughSample = this.workletNowSample + Math.floor(0.02 * this.sampleRate);

    const tick = () => {
      if (!this.running) return;

      const params = paramsProvider();

      const now = this.workletNowSample;
      const ahead = Math.floor(this.scheduleAheadSec * this.sampleRate);
      const targetThrough = now + ahead;

      const events: GrainEvent[] = [];
      
      // Grain period (samples) based on density
      const periodSamp = Math.max(1, Math.floor(this.sampleRate / Math.max(1e-3, params.density)));

      while (this.scheduledThroughSample < targetThrough) {
        const startSample = this.scheduledThroughSample;

        // Grain size with jitter
        const baseDur = Math.max(8, Math.floor((params.grainSizeMs / 1000) * this.sampleRate));
        const jitter = (this.rng() * 2 - 1) * params.sizeJitter;
        const durSamp = Math.max(8, Math.floor(baseDur * (1 + jitter)));

        // Position (normalized 0..1)
        const w = clamp(params.posWidth01, 0, 1);
        let pos01 = params.posCenter01 + (this.rng() * 2 - 1) * (w * 0.5);
        pos01 = clamp(pos01, 0, 1);

        // Position jitter in samples, converted to normalized offset
        const posJitSamp = Math.floor((params.posJitterMs / 1000) * this.sampleRate);
        const posOffsetSamp = Math.floor((this.rng() * 2 - 1) * posJitSamp);
        const posOffset01 = posOffsetSamp / Math.max(1, this.bufferLength);
        pos01 = clamp(pos01 + posOffset01, 0, 1);

        // Pitch / playback rate
        const randST = (this.rng() * 2 - 1) * params.pitchRandST;
        const rate = stToRate(params.pitchST + randST);

        // Pan (equal-power panning)
        const pan = (this.rng() * 2 - 1) * clamp(params.panSpread, 0, 1);
        const theta = (pan * 0.5 + 0.5) * (Math.PI / 2);
        const gL = Math.cos(theta) * params.level;
        const gR = Math.sin(theta) * params.level;

        events.push({
          startSample,
          pos01,
          durSamp,
          rate,
          gainL: gL,
          gainR: gR,
          windowType: params.windowType,
        });

        this.scheduledThroughSample += periodSamp;
      }

      if (events.length) {
        this.node.port.postMessage({ type: "schedule", events });
      }

      this.intervalId = setTimeout(tick, this.scheduleIntervalMs);
    };

    tick();
  }

  stop() {
    this.running = false;
    if (this.intervalId) {
      clearTimeout(this.intervalId);
      this.intervalId = null;
    }
    this.node.port.postMessage({ type: "clockStop" });
    this.node.port.postMessage({ type: "clear" });
  }

  reset() {
    this.stop();
    this.node.port.postMessage({ type: "reset" });
    this.scheduledThroughSample = 0;
    this.workletNowSample = 0;
  }

  resetSeed(seed: number) {
    this.seed = seed;
    this.rng = mulberry32(seed);
  }

  isRunning(): boolean {
    return this.running;
  }

  setOnBufferInfo(callback: (length: number) => void) {
    this.onBufferInfo = callback;
  }
}

// Helper to send sample buffer to worklet
export async function sendSampleToWorklet(
  node: AudioWorkletNode,
  buffer: AudioBuffer | { data: Float32Array; sampleRate: number }
): Promise<void> {
  let channels: Float32Array[];
  let length: number;
  let numChannels: number;
  let bufferSampleRate: number;

  if (buffer instanceof AudioBuffer) {
    // Standard AudioBuffer
    channels = [];
    numChannels = buffer.numberOfChannels;
    length = buffer.length;
    bufferSampleRate = buffer.sampleRate;
    
    for (let ch = 0; ch < numChannels; ch++) {
      const data = buffer.getChannelData(ch);
      const copy = new Float32Array(data.length);
      copy.set(data);
      channels.push(copy);
    }
  } else {
    // Our custom format { data: Float32Array, sampleRate: number }
    const copy = new Float32Array(buffer.data.length);
    copy.set(buffer.data);
    channels = [copy];
    length = buffer.data.length;
    numChannels = 1;
    bufferSampleRate = buffer.sampleRate;
  }

  node.port.postMessage(
    {
      type: "setBuffer",
      channels: channels.map(a => a.buffer),
      length,
      numChannels,
      sampleRate: bufferSampleRate,
    },
    channels.map(a => a.buffer) // transfer
  );
}

// Create and initialize the granular AudioWorkletNode
export async function createGranularWorkletNode(
  ctx: AudioContext
): Promise<AudioWorkletNode> {
  // Load the processor module
  await ctx.audioWorklet.addModule('/granular-processor.js');

  const node = new AudioWorkletNode(ctx, 'granular-processor', {
    numberOfInputs: 0,
    numberOfOutputs: 1,
    outputChannelCount: [2],
    processorOptions: { maxGrains: 64 },
  });

  return node;
}
