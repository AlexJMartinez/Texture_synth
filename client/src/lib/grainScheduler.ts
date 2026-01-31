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
  // AHD envelope (in samples)
  envAttackSamp: number;
  envHoldSamp: number;
  envDecaySamp: number;
  // Window skew (-1 to +1, shifts energy front/back)
  windowSkew: number;
};

// Scheduler parameters derived from GranularSettings
export type SchedulerParams = {
  density: number;        // grains per second
  grainSizeMs: number;    // average grain size in ms
  sizeJitter: number;     // 0..1 (fraction)
  posCenter01: number;    // 0..1 scan center (scanStart + scanWidth/2)
  posWidth01: number;     // 0..1 scan width
  posJitterMs: number;    // start position jitter in ms
  timingJitterMs: number; // spawn timing jitter in ms
  pitchST: number;        // semitones
  pitchRandST: number;    // semitone random range
  reverseProb: number;    // 0..1 probability of reverse playback
  panSpread: number;      // 0..1
  ampRandDb: number;      // per-grain amplitude variance in dB
  level: number;          // overall level
  windowType: WindowType;
  // AHD envelope (in ms)
  envAttackMs: number;
  envHoldMs: number;
  envDecayMs: number;
  // Window skew
  windowSkew: number;
  // Scan animation
  scanRateHz: number;     // Hz rate at which scan position oscillates
  scanStart: number;      // 0..1 scan start position
  scanWidth: number;      // 0..1 scan width
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
    sizeJitter: settings.sizeJitter ?? 0.25, // Use settings or default
    posCenter01: settings.scanStart + settings.scanWidth / 2,
    posWidth01: settings.scanWidth,
    posJitterMs: settings.posJitterMs,
    timingJitterMs: settings.timingJitterMs ?? 0,
    pitchST: settings.pitchST,
    pitchRandST: settings.pitchRandST,
    reverseProb: settings.reverseProb ?? 0,
    panSpread: settings.panSpread,
    ampRandDb: settings.grainAmpRandDb ?? 0,
    level: settings.wetMix, // Use wetMix as level
    windowType: settings.windowType,
    // AHD envelope
    envAttackMs: settings.envAttack ?? 0,
    envHoldMs: settings.envHold ?? 10,
    envDecayMs: settings.envDecay ?? 300,
    // Window skew
    windowSkew: settings.windowSkew ?? 0,
    // Scan animation
    scanRateHz: settings.scanRateHz ?? 0,
    scanStart: settings.scanStart,
    scanWidth: settings.scanWidth,
  };
}

export class GrainScheduler {
  private node: AudioWorkletNode | ScriptProcessorNode;
  private isWorklet: boolean;
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


  constructor(node: AudioWorkletNode | ScriptProcessorNode, sampleRate: number, seed: number) {
    this.node = node;
    this.isWorklet = 'port' in node && node.port !== undefined && !('_receive' in (node as any).port);
    this.sampleRate = sampleRate;
    this.seed = seed;
    this.rng = mulberry32(seed);

    // Setup message handling for both node types
    const handleMessage = (e: MessageEvent) => {
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

    if (this.isWorklet && (node as AudioWorkletNode).port) {
      (node as AudioWorkletNode).port.onmessage = handleMessage;
    } else if ((node as any).port) {
      // ScriptProcessor fallback - set up message handler on simulated port
      (node as any).port.onmessage = handleMessage;
    }
  }

  // Helper to send message to node
  private postMessage(msg: any, transfer?: Transferable[]) {
    if (this.isWorklet && (this.node as AudioWorkletNode).port) {
      if (transfer) {
        (this.node as AudioWorkletNode).port.postMessage(msg, transfer);
      } else {
        (this.node as AudioWorkletNode).port.postMessage(msg);
      }
    } else if ((this.node as any).port?._receive) {
      (this.node as any).port._receive(msg);
    }
  }

  start(paramsProvider: () => SchedulerParams) {
    if (this.running) return;
    this.running = true;

    // Ask worklet for frequent clock updates
    this.postMessage({ type: "clockStart", intervalMs: 30 });

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
        // Apply timing jitter to grain start
        const timingJitSamp = Math.floor((params.timingJitterMs / 1000) * this.sampleRate);
        const timingOffset = Math.floor((this.rng() * 2 - 1) * timingJitSamp);
        const startSample = Math.max(0, this.scheduledThroughSample + timingOffset);

        // Grain size with jitter
        const baseDur = Math.max(8, Math.floor((params.grainSizeMs / 1000) * this.sampleRate));
        const jitter = (this.rng() * 2 - 1) * params.sizeJitter;
        const durSamp = Math.max(8, Math.floor(baseDur * (1 + jitter)));

        // Position (normalized 0..1) with scan animation
        // scanRateHz > 0 makes the position oscillate through the scan range
        // Use audio-clock based timing for consistency (nowSample / sampleRate)
        const elapsedSec = this.workletNowSample / this.sampleRate;
        let animatedCenter = params.scanStart + params.scanWidth / 2;
        
        if (params.scanRateHz > 0 && params.scanWidth > 0) {
          // Oscillate using triangle wave for smooth back-and-forth scanning
          const phase = (elapsedSec * params.scanRateHz) % 1;
          // Triangle wave: 0->1 then 1->0
          const triangle = phase < 0.5 ? phase * 2 : 2 - phase * 2;
          // Map to scan range: from scanStart to scanStart+scanWidth
          animatedCenter = params.scanStart + triangle * params.scanWidth;
        }
        
        const w = clamp(params.posWidth01, 0, 1);
        let pos01 = animatedCenter + (this.rng() * 2 - 1) * (w * 0.5);
        pos01 = clamp(pos01, 0, 1);

        // Position jitter in samples, converted to normalized offset
        const posJitSamp = Math.floor((params.posJitterMs / 1000) * this.sampleRate);
        const posOffsetSamp = Math.floor((this.rng() * 2 - 1) * posJitSamp);
        const posOffset01 = posOffsetSamp / Math.max(1, this.bufferLength);
        pos01 = clamp(pos01 + posOffset01, 0, 1);

        // Pitch / playback rate with reverse probability
        const randST = (this.rng() * 2 - 1) * params.pitchRandST;
        let rate = stToRate(params.pitchST + randST);
        
        // Apply reverse probability (negative rate = reverse playback)
        if (params.reverseProb > 0 && this.rng() < params.reverseProb) {
          rate = -rate;
        }

        // Amplitude variance in dB
        const ampVarDb = (this.rng() * 2 - 1) * params.ampRandDb;
        const ampMult = Math.pow(10, ampVarDb / 20);

        // Pan (equal-power panning)
        const pan = (this.rng() * 2 - 1) * clamp(params.panSpread, 0, 1);
        const theta = (pan * 0.5 + 0.5) * (Math.PI / 2);
        const gL = Math.cos(theta) * params.level * ampMult;
        const gR = Math.sin(theta) * params.level * ampMult;

        // AHD envelope in samples
        const envAttackSamp = Math.floor((params.envAttackMs / 1000) * this.sampleRate);
        const envHoldSamp = Math.floor((params.envHoldMs / 1000) * this.sampleRate);
        const envDecaySamp = Math.floor((params.envDecayMs / 1000) * this.sampleRate);

        events.push({
          startSample,
          pos01,
          durSamp,
          rate,
          gainL: gL,
          gainR: gR,
          windowType: params.windowType,
          envAttackSamp,
          envHoldSamp,
          envDecaySamp,
          windowSkew: params.windowSkew,
        });

        this.scheduledThroughSample += periodSamp;
      }

      if (events.length) {
        console.log(`Scheduling ${events.length} grains, nowSample=${now}, bufferLength=${this.bufferLength}`);
        this.postMessage({ type: "schedule", events });
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
    this.postMessage({ type: "clockStop" });
    this.postMessage({ type: "clear" });
  }

  reset() {
    this.stop();
    this.postMessage({ type: "reset" });
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

// Helper to send sample buffer to worklet or script processor
export async function sendSampleToWorklet(
  node: AudioWorkletNode | ScriptProcessorNode,
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

  // Handle both AudioWorkletNode and ScriptProcessorNode
  if ('port' in node && node.port) {
    // AudioWorkletNode
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
  } else if ((node as any).port?._receive) {
    // ScriptProcessorNode with our simulated port
    (node as any).port._receive({
      type: "setBuffer",
      channels: channels.map(a => a.buffer),
      length,
      numChannels,
      sampleRate: bufferSampleRate,
    });
  }
}

// Inline worklet processor code to avoid module loading issues
const GRANULAR_PROCESSOR_CODE = `
class GranularProcessor extends AudioWorkletProcessor {
  constructor(options) {
    super();
    this.bufL = null;
    this.bufR = null;
    this.bufLen = 0;
    this.nowSample = 0;
    this.events = [];
    this.maxGrains = (options?.processorOptions?.maxGrains) ?? 64;
    this.grains = new Array(this.maxGrains);
    for (let i = 0; i < this.maxGrains; i++) this.grains[i] = null;
    this.clockTimer = 0;
    this.clockIntervalSamples = Math.floor(0.05 * sampleRate);
    this.clockEnabled = false;
    this.windowType = 'hann';

    this.port.onmessage = (e) => {
      const msg = e.data;
      if (msg?.type === "setBuffer") {
        const { channels, length, numChannels } = msg;
        this.bufLen = length | 0;
        const ch0 = new Float32Array(channels[0]);
        const ch1 = (numChannels > 1) ? new Float32Array(channels[1]) : null;
        this.bufL = ch0;
        this.bufR = ch1;
        this.port.postMessage({ type: "bufferInfo", length: this.bufLen });
      }
      if (msg?.type === "schedule") {
        const incoming = msg.events || [];
        for (let i = 0; i < incoming.length; i++) this.events.push(incoming[i]);
        this.events.sort((a, b) => a.startSample - b.startSample);
      }
      if (msg?.type === "clockStart") {
        this.clockEnabled = true;
        const ms = msg.intervalMs ?? 50;
        this.clockIntervalSamples = Math.max(128, Math.floor((ms / 1000) * sampleRate));
      }
      if (msg?.type === "clockStop") this.clockEnabled = false;
      if (msg?.type === "setWindowType") this.windowType = msg.windowType || 'hann';
      if (msg?.type === "clear") {
        this.events = [];
        for (let i = 0; i < this.maxGrains; i++) this.grains[i] = null;
      }
      if (msg?.type === "reset") {
        this.events = [];
        for (let i = 0; i < this.maxGrains; i++) this.grains[i] = null;
        this.nowSample = 0;
        this.clockTimer = 0;
      }
    };
  }

  windowHann(p) { return 0.5 - 0.5 * Math.cos(2 * Math.PI * p); }
  windowGauss(p, s = 0.4) { const x = p - 0.5; return Math.exp(-0.5 * Math.pow(x / s, 2)); }
  windowBlackman(p) { return 0.42 - 0.5 * Math.cos(2 * Math.PI * p) + 0.08 * Math.cos(4 * Math.PI * p); }
  windowRect() { return 1.0; }
  windowTukey(p, a = 0.5) {
    if (p < a / 2) return 0.5 * (1 + Math.cos(Math.PI * (2 * p / a - 1)));
    if (p > 1 - a / 2) return 0.5 * (1 + Math.cos(Math.PI * (2 * p / a - 2 / a + 1)));
    return 1.0;
  }
  windowTrapezoid(p, r = 0.25) {
    if (p < r) return p / r;
    if (p > 1 - r) return (1 - p) / r;
    return 1.0;
  }
  getWindow(p, t) {
    switch (t) {
      case 'gauss': return this.windowGauss(p);
      case 'blackman': return this.windowBlackman(p);
      case 'rect': return this.windowRect();
      case 'tukey': return this.windowTukey(p);
      case 'trapezoid': return this.windowTrapezoid(p);
      default: return this.windowHann(p);
    }
  }

  readCubic(buf, x) {
    const len = this.bufLen;
    x = Math.max(1, Math.min(len - 3, x));
    const i = Math.floor(x);
    const t = x - i;
    const y0 = buf[i - 1] || buf[i];
    const y1 = buf[i];
    const y2 = buf[i + 1] || buf[i];
    const y3 = buf[i + 2] || buf[i + 1] || buf[i];
    const a0 = y3 - y2 - y0 + y1;
    const a1 = y0 - y1 - a0;
    const a2 = y2 - y0;
    return a0 * t * t * t + a1 * t * t + a2 * t + y1;
  }

  // AHD envelope: attack ramp up, hold at 1.0, decay ramp down
  // Automatically scales phases to fit within grain duration
  getAhdEnvelope(k, attack, hold, decay, dur) {
    const totalEnv = attack + hold + decay;
    if (totalEnv <= 0) return 1.0; // No envelope
    
    // Scale envelope phases to fit within grain duration if they exceed it
    const scale = totalEnv > dur ? dur / totalEnv : 1.0;
    const scaledAttack = attack * scale;
    const scaledHold = hold * scale;
    const scaledDecay = decay * scale;
    
    if (k < scaledAttack) {
      // Attack phase: ramp from 0 to 1
      return scaledAttack > 0 ? k / scaledAttack : 1.0;
    } else if (k < scaledAttack + scaledHold) {
      // Hold phase: stay at 1
      return 1.0;
    } else {
      // Decay phase: ramp from 1 to 0
      const decayPos = k - scaledAttack - scaledHold;
      return scaledDecay > 0 ? Math.max(0, 1.0 - decayPos / scaledDecay) : 0.0;
    }
  }

  // Apply window skew: negative shifts energy to front, positive shifts to back
  applySkew(p, skew) {
    if (skew === 0) return p;
    // Use power function to skew the phase
    // skew < 0: more weight at start, skew > 0: more weight at end
    const power = Math.pow(2, -skew);
    return Math.pow(p, power);
  }

  allocGrain(ev) {
    for (let i = 0; i < this.maxGrains; i++) {
      if (this.grains[i] === null) {
        this.grains[i] = {
          startSample: ev.startSample | 0,
          dur: ev.durSamp | 0,
          pos: ev.pos01 * (this.bufLen - 1),
          phase: 0,
          rate: ev.rate,
          gainL: ev.gainL,
          gainR: ev.gainR,
          windowType: ev.windowType || this.windowType,
          envAttack: ev.envAttackSamp || 0,
          envHold: ev.envHoldSamp || 0,
          envDecay: ev.envDecaySamp || 0,
          windowSkew: ev.windowSkew || 0
        };
        return;
      }
    }
  }

  process(_inputs, outputs) {
    const out = outputs[0];
    if (!out || out.length === 0) return true;
    const outL = out[0];
    const outR = out[1] || out[0];
    const blockLen = outL.length;
    const hasBuffer = this.bufL && this.bufLen > 1;
    const blockStart = this.nowSample;
    const blockEnd = this.nowSample + blockLen;

    while (this.events.length && this.events[0].startSample < blockEnd) {
      const ev = this.events[0];
      if (ev.startSample >= blockStart) this.allocGrain(ev);
      this.events.shift();
    }

    for (let i = 0; i < blockLen; i++) {
      outL[i] = 0;
      if (outR !== outL) outR[i] = 0;
    }

    if (hasBuffer) {
      for (let gi = 0; gi < this.maxGrains; gi++) {
        const g = this.grains[gi];
        if (!g) continue;
        let localStart = g.startSample - blockStart;
        if (localStart < 0) localStart = 0;
        for (let i = localStart; i < blockLen; i++) {
          const k = g.phase;
          if (k >= g.dur) break;
          
          // Apply window skew to phase
          const phase01 = k / g.dur;
          const skewedPhase = this.applySkew(phase01, g.windowSkew);
          
          // Get window and AHD envelope (pass dur for scaling)
          const w = this.getWindow(skewedPhase, g.windowType);
          const ahd = this.getAhdEnvelope(k, g.envAttack, g.envHold, g.envDecay, g.dur);
          const envelope = w * ahd;
          
          const srcIdx = g.pos + (k * g.rate);
          const sL = this.readCubic(this.bufL, srcIdx);
          const sR = this.bufR ? this.readCubic(this.bufR, srcIdx) : sL;
          outL[i] += sL * envelope * g.gainL;
          if (outR !== outL) outR[i] += sR * envelope * g.gainR;
          g.phase++;
        }
        if (g.phase >= g.dur) this.grains[gi] = null;
      }
    }

    this.nowSample += blockLen;
    if (this.clockEnabled) {
      this.clockTimer += blockLen;
      if (this.clockTimer >= this.clockIntervalSamples) {
        this.clockTimer = 0;
        this.port.postMessage({ type: "clock", nowSample: this.nowSample });
      }
    }
    return true;
  }
}
registerProcessor("granular-processor", GranularProcessor);
`;

// Track if worklet module has been registered per AudioContext
const registeredContexts = new WeakSet<AudioContext>();

// Flag to track if worklet approach works in this environment
let workletSupported: boolean | null = null;

// Create and initialize the granular AudioWorkletNode
export async function createGranularWorkletNode(
  ctx: AudioContext
): Promise<AudioWorkletNode | ScriptProcessorNode> {
  console.log("Creating granular node, ctx.state:", ctx.state);
  
  // Ensure AudioContext is running
  if (ctx.state === 'suspended') {
    console.log("Resuming suspended AudioContext...");
    await ctx.resume();
    console.log("AudioContext resumed, state:", ctx.state);
  }
  
  // If we already know worklets don't work, use ScriptProcessor fallback
  if (workletSupported === false) {
    console.log("Using ScriptProcessor fallback (worklet not supported)");
    return createScriptProcessorFallback(ctx);
  }
  
  // Try to register worklet module with timeout
  if (!registeredContexts.has(ctx)) {
    console.log("Registering worklet module...");
    try {
      const blob = new Blob([GRANULAR_PROCESSOR_CODE], { type: 'text/javascript' });
      const blobUrl = URL.createObjectURL(blob);
      
      // Race between addModule and a 3-second timeout
      const addModulePromise = ctx.audioWorklet.addModule(blobUrl);
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error("addModule timeout")), 3000);
      });
      
      await Promise.race([addModulePromise, timeoutPromise]);
      URL.revokeObjectURL(blobUrl);
      registeredContexts.add(ctx);
      workletSupported = true;
      console.log("Worklet module registered successfully");
    } catch (e) {
      console.warn("AudioWorklet not available, using ScriptProcessor fallback:", e);
      workletSupported = false;
      return createScriptProcessorFallback(ctx);
    }
  }

  console.log("Creating AudioWorkletNode...");
  const node = new AudioWorkletNode(ctx, 'granular-processor', {
    numberOfInputs: 0,
    numberOfOutputs: 1,
    outputChannelCount: [2],
    processorOptions: { maxGrains: 64 },
  });
  console.log("AudioWorkletNode created");

  return node;
}

// ScriptProcessor-based fallback for environments where AudioWorklet doesn't work
function createScriptProcessorFallback(ctx: AudioContext): ScriptProcessorNode {
  console.log("Creating ScriptProcessor-based granular node");
  
  const bufferSize = 2048;
  const processor = ctx.createScriptProcessor(bufferSize, 0, 2);
  
  // Internal state
  let bufL: Float32Array | null = null;
  let bufR: Float32Array | null = null;
  let bufLen = 0;
  const grains: Array<{
    pos: number;
    phase: number;
    dur: number;
    rate: number;
    gainL: number;
    gainR: number;
    windowType: string;
    envAttack: number;
    envHold: number;
    envDecay: number;
    windowSkew: number;
  } | null> = new Array(64).fill(null);
  const events: Array<{
    startSample: number;
    pos01: number;
    durSamp: number;
    rate: number;
    gainL: number;
    gainR: number;
    windowType?: string;
    envAttackSamp?: number;
    envHoldSamp?: number;
    envDecaySamp?: number;
    windowSkew?: number;
  }> = [];
  let nowSample = 0;
  let windowType = 'hann';
  let clockEnabled = false;
  let clockTimer = 0;
  const clockIntervalSamples = Math.floor(0.05 * ctx.sampleRate);
  
  // Window functions
  const windowHann = (p: number) => 0.5 - 0.5 * Math.cos(2 * Math.PI * p);
  const windowGauss = (p: number, s = 0.4) => { const x = p - 0.5; return Math.exp(-0.5 * Math.pow(x / s, 2)); };
  const windowBlackman = (p: number) => 0.42 - 0.5 * Math.cos(2 * Math.PI * p) + 0.08 * Math.cos(4 * Math.PI * p);
  const windowTukey = (p: number, a = 0.5) => {
    if (p < a / 2) return 0.5 * (1 + Math.cos(Math.PI * (2 * p / a - 1)));
    if (p > 1 - a / 2) return 0.5 * (1 + Math.cos(Math.PI * (2 * p / a - 2 / a + 1)));
    return 1.0;
  };
  const windowTrapezoid = (p: number, r = 0.25) => {
    if (p < r) return p / r;
    if (p > 1 - r) return (1 - p) / r;
    return 1.0;
  };
  const getWindow = (p: number, t: string) => {
    switch (t) {
      case 'gauss': return windowGauss(p);
      case 'blackman': return windowBlackman(p);
      case 'rect': return 1.0;
      case 'tukey': return windowTukey(p);
      case 'trapezoid': return windowTrapezoid(p);
      default: return windowHann(p);
    }
  };
  
  // AHD envelope: attack ramp up, hold at 1.0, decay ramp down
  // Automatically scales phases to fit within grain duration
  const getAhdEnvelope = (k: number, attack: number, hold: number, decay: number, dur: number) => {
    const totalEnv = attack + hold + decay;
    if (totalEnv <= 0) return 1.0;
    
    // Scale envelope phases to fit within grain duration if they exceed it
    const scale = totalEnv > dur ? dur / totalEnv : 1.0;
    const scaledAttack = attack * scale;
    const scaledHold = hold * scale;
    const scaledDecay = decay * scale;
    
    if (k < scaledAttack) {
      return scaledAttack > 0 ? k / scaledAttack : 1.0;
    } else if (k < scaledAttack + scaledHold) {
      return 1.0;
    } else {
      const decayPos = k - scaledAttack - scaledHold;
      return scaledDecay > 0 ? Math.max(0, 1.0 - decayPos / scaledDecay) : 0.0;
    }
  };
  
  // Apply window skew
  const applySkew = (p: number, skew: number) => {
    if (skew === 0) return p;
    const power = Math.pow(2, -skew);
    return Math.pow(p, power);
  };
  
  // Cubic interpolation
  const readCubic = (buf: Float32Array, x: number) => {
    x = Math.max(1, Math.min(bufLen - 3, x));
    const i = Math.floor(x);
    const t = x - i;
    const y0 = buf[i - 1] ?? buf[i];
    const y1 = buf[i];
    const y2 = buf[i + 1] ?? buf[i];
    const y3 = buf[i + 2] ?? buf[i + 1] ?? buf[i];
    const a0 = y3 - y2 - y0 + y1;
    const a1 = y0 - y1 - a0;
    const a2 = y2 - y0;
    return a0 * t * t * t + a1 * t * t + a2 * t + y1;
  };
  
  // Message port simulation via custom property
  const messageHandlers: ((msg: MessageEvent) => void)[] = [];
  (processor as any).port = {
    onmessage: null as ((e: MessageEvent) => void) | null,
    postMessage: (data: any) => {
      // Dispatch to handlers
      if ((processor as any).port.onmessage) {
        (processor as any).port.onmessage({ data } as MessageEvent);
      }
    },
    _receive: (data: any) => {
      // Handle incoming messages
      if (data?.type === "setBuffer") {
        const { channels, length, numChannels } = data;
        bufLen = length | 0;
        bufL = new Float32Array(channels[0]);
        bufR = (numChannels > 1) ? new Float32Array(channels[1]) : null;
        console.log("ScriptProcessor: buffer set, length:", bufLen);
      }
      if (data?.type === "schedule") {
        const incoming = data.events || [];
        for (const ev of incoming) events.push(ev);
        events.sort((a, b) => a.startSample - b.startSample);
      }
      if (data?.type === "clockStart") {
        clockEnabled = true;
      }
      if (data?.type === "clockStop") {
        clockEnabled = false;
      }
      if (data?.type === "setWindowType") {
        windowType = data.windowType || 'hann';
      }
      if (data?.type === "clear") {
        events.length = 0;
        for (let i = 0; i < grains.length; i++) grains[i] = null;
      }
      if (data?.type === "reset") {
        events.length = 0;
        for (let i = 0; i < grains.length; i++) grains[i] = null;
        nowSample = 0;
        clockTimer = 0;
      }
    }
  };
  
  processor.onaudioprocess = (e) => {
    const outL = e.outputBuffer.getChannelData(0);
    const outR = e.outputBuffer.getChannelData(1);
    const blockLen = outL.length;
    const hasBuffer = bufL && bufLen > 1;
    const blockStart = nowSample;
    const blockEnd = nowSample + blockLen;
    
    // Activate scheduled events
    while (events.length && events[0].startSample < blockEnd) {
      const ev = events[0];
      if (ev.startSample >= blockStart) {
        // Allocate grain
        for (let i = 0; i < grains.length; i++) {
          if (grains[i] === null) {
            grains[i] = {
              pos: ev.pos01 * (bufLen - 1),
              phase: 0,
              dur: ev.durSamp | 0,
              rate: ev.rate,
              gainL: ev.gainL,
              gainR: ev.gainR,
              windowType: ev.windowType || windowType,
              envAttack: ev.envAttackSamp || 0,
              envHold: ev.envHoldSamp || 0,
              envDecay: ev.envDecaySamp || 0,
              windowSkew: ev.windowSkew || 0
            };
            break;
          }
        }
      }
      events.shift();
    }
    
    // Clear output
    for (let i = 0; i < blockLen; i++) {
      outL[i] = 0;
      outR[i] = 0;
    }
    
    // Render grains
    if (hasBuffer && bufL) {
      for (let gi = 0; gi < grains.length; gi++) {
        const g = grains[gi];
        if (!g) continue;
        
        for (let i = 0; i < blockLen; i++) {
          const k = g.phase;
          if (k >= g.dur) break;
          
          // Apply window skew to phase
          const phase01 = k / g.dur;
          const skewedPhase = applySkew(phase01, g.windowSkew);
          
          // Get window and AHD envelope (pass dur for scaling)
          const w = getWindow(skewedPhase, g.windowType);
          const ahd = getAhdEnvelope(k, g.envAttack, g.envHold, g.envDecay, g.dur);
          const envelope = w * ahd;
          
          const srcIdx = g.pos + (k * g.rate);
          const sL = readCubic(bufL, srcIdx);
          const sR = bufR ? readCubic(bufR, srcIdx) : sL;
          
          outL[i] += sL * envelope * g.gainL;
          outR[i] += sR * envelope * g.gainR;
          g.phase++;
        }
        
        if (g.phase >= g.dur) grains[gi] = null;
      }
    }
    
    nowSample += blockLen;
    
    // Clock updates - send back to scheduler like AudioWorklet does
    if (clockEnabled) {
      clockTimer += blockLen;
      if (clockTimer >= clockIntervalSamples) {
        clockTimer = 0;
        // Post clock update to scheduler
        if ((processor as any).port?.onmessage) {
          (processor as any).port.onmessage({ data: { type: "clock", nowSample } } as MessageEvent);
        }
      }
    }
  };
  
  console.log("ScriptProcessor granular node created");
  return processor;
}
