import { useState, useCallback, useRef, useEffect } from "react";
import * as Tone from "tone";
import { WaveformDisplay3D } from "@/components/synth/WaveformDisplay3D";
import { EnvelopePanel } from "@/components/synth/EnvelopePanel";
import { OscillatorPanel, OscEnvelope } from "@/components/synth/OscillatorPanel";
import { FilterPanel } from "@/components/synth/FilterPanel";
import { EffectsPanel } from "@/components/synth/EffectsPanel";
import { OutputPanel } from "@/components/synth/OutputPanel";
import { PresetPanel } from "@/components/synth/PresetPanel";
import { ExportPanel, type ExportResult } from "@/components/synth/ExportPanel";
import { TriggerButton } from "@/components/synth/TriggerButton";
import { RandomizeControls } from "@/components/synth/RandomizeControls";
import { SynthEngineSelector } from "@/components/synth/SynthEngineSelector";
import { WaveshaperPanel } from "@/components/synth/WaveshaperPanel";
import { ConvolverPanel, ConvolverSettings, loadConvolverSettings, saveConvolverSettings, defaultConvolverSettings } from "@/components/synth/ConvolverPanel";
import { ClickLayerPanel } from "@/components/synth/ClickLayerPanel";
import { SubOscillatorPanel } from "@/components/synth/SubOscillatorPanel";
import { SaturationChainPanel } from "@/components/synth/SaturationChainPanel";
import { MasteringPanel } from "@/components/synth/MasteringPanel";
import { SpectralScramblerPanel } from "@/components/synth/SpectralScramblerPanel";
import { CollapsiblePanel } from "@/components/synth/CollapsiblePanel";
import { Knob } from "@/components/synth/Knob";
import { ModulatorRack } from "@/components/synth/ModulatorRack";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Clock } from "lucide-react";
import { 
  type SynthParameters, 
  type ExportSettings,
  type WaveshaperCurve,
  defaultSynthParameters, 
  defaultExportSettings 
} from "@shared/schema";
import { pitchToHz } from "@/lib/pitchUtils";
import { triggerAHD, stopWithFade, EPS } from "@/lib/envelopeAHD";

const IR_STORAGE_KEY = "synth-custom-irs";

// Convert beat division to ms based on tempo
function divisionToMs(division: string, tempo: number): number {
  const beatMs = (60 / tempo) * 1000; // Quarter note in ms
  const divisionMap: Record<string, number> = {
    "1/1": 4,      // Whole note = 4 beats
    "1/2": 2,      // Half note = 2 beats
    "1/4": 1,      // Quarter = 1 beat
    "1/8": 0.5,    // Eighth = 0.5 beats
    "1/16": 0.25,  // Sixteenth = 0.25 beats
    "1/32": 0.125, // Thirty-second = 0.125 beats
    "1/2T": 2 * (2/3),      // Half triplet
    "1/4T": 1 * (2/3),      // Quarter triplet
    "1/8T": 0.5 * (2/3),    // Eighth triplet
    "1/16T": 0.25 * (2/3),  // Sixteenth triplet
    "1/2D": 2 * 1.5,        // Dotted half
    "1/4D": 1 * 1.5,        // Dotted quarter
    "1/8D": 0.5 * 1.5,      // Dotted eighth
    "1/16D": 0.25 * 1.5,    // Dotted sixteenth
  };
  return beatMs * (divisionMap[division] || 1);
}

// Get effective delay time (either ms or calculated from tempo/division)
function getEffectiveDelayTime(params: SynthParameters): number {
  if (params.effects.delaySyncMode === "sync") {
    return divisionToMs(params.effects.delayDivision, params.tempo);
  }
  return params.effects.delayTime;
}

// Modulation evaluation system
interface ModulatorState {
  randomValue: number;
  lastRandomTime: number;
  prevRandomValue: number;
}

function createModulatorStates(modulators: SynthParameters["modulators"]): Map<string, ModulatorState> {
  const states = new Map<string, ModulatorState>();
  for (const mod of modulators) {
    states.set(mod.id, {
      randomValue: Math.random(),
      lastRandomTime: 0,
      prevRandomValue: Math.random(),
    });
  }
  return states;
}

function evaluateLfo(
  mod: { shape: string; rate: number; rateSync: boolean; rateDivision: string; phase: number; amount: number; bipolar: boolean },
  time: number,
  tempo: number
): number {
  const rateHz = mod.rateSync ? 1 / (divisionToMs(mod.rateDivision, tempo) / 1000) : mod.rate;
  const phase = (mod.phase / 360) * Math.PI * 2;
  const t = time * rateHz * Math.PI * 2 + phase;
  
  let value: number;
  switch (mod.shape) {
    case "sine":
      value = Math.sin(t);
      break;
    case "triangle":
      value = 2 * Math.abs(2 * ((t / (Math.PI * 2)) % 1) - 1) - 1;
      break;
    case "sawtooth":
      value = 2 * ((t / (Math.PI * 2)) % 1) - 1;
      break;
    case "square":
      value = Math.sin(t) >= 0 ? 1 : -1;
      break;
    case "random":
      value = Math.sin(t * 7.3) * Math.cos(t * 3.7);
      break;
    default:
      value = 0;
  }
  
  if (!mod.bipolar) {
    value = (value + 1) / 2;
  }
  
  return value * (mod.amount / 100);
}

function evaluateEnvelope(
  mod: { attack: number; decay: number; sustain: number; release: number; amount: number; bipolar: boolean },
  time: number,
  duration: number
): number {
  const attackEnd = mod.attack / 1000;
  const decayEnd = attackEnd + mod.decay / 1000;
  const sustainLevel = mod.sustain / 100;
  const releaseStart = Math.max(0, duration - mod.release / 1000);
  
  let value: number;
  if (time < attackEnd) {
    value = time / attackEnd;
  } else if (time < decayEnd) {
    const decayProgress = (time - attackEnd) / (mod.decay / 1000);
    value = 1 - decayProgress * (1 - sustainLevel);
  } else if (time < releaseStart) {
    value = sustainLevel;
  } else {
    const releaseProgress = (time - releaseStart) / (mod.release / 1000);
    value = sustainLevel * (1 - releaseProgress);
  }
  
  value = Math.max(0, Math.min(1, value));
  
  if (mod.bipolar) {
    value = value * 2 - 1;
  }
  
  return value * (mod.amount / 100);
}

function evaluateRandom(
  mod: { rate: number; smooth: number; amount: number; bipolar: boolean },
  time: number,
  state: ModulatorState
): number {
  const period = 1 / mod.rate;
  const currentPeriod = Math.floor(time / period);
  const lastPeriod = Math.floor(state.lastRandomTime / period);
  
  if (currentPeriod !== lastPeriod) {
    state.prevRandomValue = state.randomValue;
    state.randomValue = Math.random();
    state.lastRandomTime = time;
  }
  
  const t = (time % period) / period;
  const smoothFactor = mod.smooth / 100;
  const smoothT = t < smoothFactor ? t / smoothFactor * 0.5 : 
                  t > (1 - smoothFactor) ? 0.5 + (t - (1 - smoothFactor)) / smoothFactor * 0.5 : 
                  0.5;
  
  let value = state.prevRandomValue + (state.randomValue - state.prevRandomValue) * smoothT;
  
  if (mod.bipolar) {
    value = value * 2 - 1;
  }
  
  return value * (mod.amount / 100);
}

function evaluateMacro(mod: { value: number; amount: number }): number {
  return (mod.value / 100) * (mod.amount / 100);
}

function evaluateModulator(
  mod: SynthParameters["modulators"][0],
  time: number,
  duration: number,
  tempo: number,
  state: ModulatorState
): number {
  if (!mod.enabled) return 0;
  
  switch (mod.type) {
    case "lfo":
      return evaluateLfo(mod, time, tempo);
    case "envelope":
      return evaluateEnvelope(mod, time, duration);
    case "random":
      return evaluateRandom(mod, time, state);
    case "macro":
      return evaluateMacro(mod);
    default:
      return 0;
  }
}

function getModulatedValue(
  basePath: string,
  baseValue: number,
  min: number,
  max: number,
  modulators: SynthParameters["modulators"],
  routes: SynthParameters["modulationRoutes"],
  time: number,
  duration: number,
  tempo: number,
  states: Map<string, ModulatorState>
): number {
  let totalMod = 0;
  
  for (const route of routes) {
    if (route.targetPath === basePath) {
      const mod = modulators.find(m => m.id === route.modulatorId);
      if (mod) {
        const state = states.get(mod.id);
        if (state) {
          const modValue = evaluateModulator(mod, time, duration, tempo, state);
          totalMod += modValue * (route.depth / 100);
        }
      }
    }
  }
  
  const range = max - min;
  const modulatedValue = baseValue + totalMod * range;
  return Math.max(min, Math.min(max, modulatedValue));
}

// Fix 1: Tail padding for reverb/delay decay (in seconds)
// Increased for heavily processed sounds with reverb/delay
const TAIL_PAD = 0.35; // 350ms for better FX tail capture

// Fix 6: Seeded random number generator for consistent preview/export
function createSeededRandom(seed: number) {
  let state = seed;
  return function() {
    state = (state * 1103515245 + 12345) & 0x7fffffff;
    return state / 0x7fffffff;
  };
}

function createWaveshaperCurve(type: WaveshaperCurve, drive: number): Float32Array {
  const samples = 8192;
  const curve = new Float32Array(samples);
  const amount = (drive / 100) * 10;
  
  for (let i = 0; i < samples; i++) {
    const x = (i * 2) / samples - 1;
    
    switch (type) {
      case "softclip":
        curve[i] = Math.tanh(x * (1 + amount * 2));
        break;
      case "hardclip":
        const threshold = 1 / (1 + amount);
        curve[i] = Math.max(-threshold, Math.min(threshold, x)) * (1 / threshold);
        break;
      case "foldback":
        let folded = x * (1 + amount * 3);
        while (Math.abs(folded) > 1) {
          if (folded > 1) folded = 2 - folded;
          else if (folded < -1) folded = -2 - folded;
        }
        curve[i] = folded;
        break;
      case "sinefold":
        curve[i] = Math.sin(x * Math.PI * (1 + amount * 2));
        break;
      case "chebyshev":
        const order = Math.floor(2 + amount * 8);
        curve[i] = chebyshev(x, order);
        break;
      case "asymmetric":
        if (x >= 0) {
          curve[i] = Math.tanh(x * (1 + amount * 4));
        } else {
          curve[i] = Math.tanh(x * (1 + amount));
        }
        break;
      case "tube":
        const k = amount * 5 + 1;
        curve[i] = (1 + k) * x / (1 + k * Math.abs(x));
        break;
      default:
        curve[i] = x;
    }
  }
  
  return curve;
}

function chebyshev(x: number, order: number): number {
  if (order === 0) return 1;
  if (order === 1) return x;
  let t0 = 1, t1 = x;
  for (let i = 2; i <= order; i++) {
    const t2 = 2 * x * t1 - t0;
    t0 = t1;
    t1 = t2;
  }
  return t1;
}

async function loadStoredIR(name: string): Promise<AudioBuffer | null> {
  try {
    const stored = localStorage.getItem(IR_STORAGE_KEY);
    if (!stored) return null;
    
    const irs = JSON.parse(stored);
    const ir = irs.find((ir: { name: string; data: string }) => ir.name === name);
    if (!ir) return null;
    
    const binaryString = atob(ir.data);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    
    // Use Tone.js context for decoding audio data
    await Tone.start();
    const toneContext = Tone.getContext();
    const audioBuffer = await toneContext.decodeAudioData(bytes.buffer.slice(0));
    
    return audioBuffer;
  } catch (error) {
    console.error("Failed to load stored IR:", error);
    return null;
  }
}

const defaultOscEnvelope: OscEnvelope = {
  enabled: false,
  attack: 0,
  hold: 0,
  decay: 200,
  curve: "exponential",
};

interface OscEnvelopes {
  osc1: OscEnvelope;
  osc2: OscEnvelope;
  osc3: OscEnvelope;
}

const defaultOscEnvelopes: OscEnvelopes = {
  osc1: { ...defaultOscEnvelope },
  osc2: { ...defaultOscEnvelope },
  osc3: { ...defaultOscEnvelope },
};

function loadOscEnvelopes(): OscEnvelopes {
  try {
    const stored = localStorage.getItem("oscEnvelopes");
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.warn("Failed to load osc envelopes from localStorage");
  }
  return defaultOscEnvelopes;
}

export default function Synthesizer() {
  const [params, setParams] = useState<SynthParameters>(defaultSynthParameters);
  const [exportSettings, setExportSettings] = useState<ExportSettings>(defaultExportSettings);
  const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportResult, setExportResult] = useState<ExportResult | null>(null);
  const [oscEnvelopes, setOscEnvelopes] = useState<OscEnvelopes>(loadOscEnvelopes);
  const [convolverSettings, setConvolverSettings] = useState<ConvolverSettings>(loadConvolverSettings);
  const customIRBufferRef = useRef<AudioBuffer | null>(null);
  const activeSourcesRef = useRef<AudioScheduledSourceNode[]>([]);
  const activeFadeGainRef = useRef<GainNode | null>(null);
  const playTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Persist osc envelopes to localStorage
  useEffect(() => {
    localStorage.setItem("oscEnvelopes", JSON.stringify(oscEnvelopes));
  }, [oscEnvelopes]);

  const handleIRLoaded = useCallback((buffer: AudioBuffer) => {
    customIRBufferRef.current = buffer;
  }, []);

  // Fix 6: Accept seeded random function for deterministic impulse response generation
  const createImpulseResponse = useCallback((
    ctx: BaseAudioContext, 
    duration: number, 
    decay: number,
    randomFn: () => number = Math.random
  ): AudioBuffer => {
    const sampleRate = ctx.sampleRate;
    const length = Math.floor(sampleRate * duration);
    const impulse = ctx.createBuffer(2, length, sampleRate);
    
    for (let channel = 0; channel < 2; channel++) {
      const channelData = impulse.getChannelData(channel);
      for (let i = 0; i < length; i++) {
        const t = i / sampleRate;
        channelData[i] = (randomFn() * 2 - 1) * Math.exp(-t / decay);
      }
    }
    
    return impulse;
  }, []);

  const applyBitcrusher = useCallback((buffer: AudioBuffer, bitDepth: number): void => {
    if (bitDepth >= 16) return;
    
    const step = Math.pow(0.5, bitDepth);
    const invStep = 1 / step;
    
    for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
      const data = buffer.getChannelData(channel);
      for (let i = 0; i < data.length; i++) {
        data[i] = Math.round(data[i] * invStep) * step;
      }
    }
  }, []);

  // Reference to frozen spectral data for freeze mode
  const frozenSpectrumRef = useRef<{ real: Float32Array, imag: Float32Array, fftSize: number } | null>(null);
  
  // Reusable FFT buffers to reduce GC pressure
  const fftBuffersRef = useRef<{
    window: Float32Array | null,
    real: Float32Array | null,
    imag: Float32Array | null,
    scrambledReal: Float32Array | null,
    scrambledImag: Float32Array | null,
    fftSize: number
  }>({ window: null, real: null, imag: null, scrambledReal: null, scrambledImag: null, fftSize: 0 });

  // Radix-2 Cooley-Tukey FFT - O(N log N) complexity
  const fft = useCallback((real: Float32Array, imag: Float32Array, inverse: boolean = false): void => {
    const n = real.length;
    if (n <= 1) return;
    
    // Bit-reversal permutation
    let j = 0;
    for (let i = 0; i < n - 1; i++) {
      if (i < j) {
        let tmp = real[i]; real[i] = real[j]; real[j] = tmp;
        tmp = imag[i]; imag[i] = imag[j]; imag[j] = tmp;
      }
      let k = n >> 1;
      while (k <= j) { j -= k; k >>= 1; }
      j += k;
    }
    
    // Cooley-Tukey iterative radix-2 FFT
    const sign = inverse ? 1 : -1;
    for (let len = 2; len <= n; len <<= 1) {
      const halfLen = len >> 1;
      const angle = (2 * Math.PI) / len * sign;
      const wReal = Math.cos(angle);
      const wImag = Math.sin(angle);
      
      for (let i = 0; i < n; i += len) {
        let curReal = 1, curImag = 0;
        for (let k = 0; k < halfLen; k++) {
          const evenIdx = i + k;
          const oddIdx = i + k + halfLen;
          
          const tReal = curReal * real[oddIdx] - curImag * imag[oddIdx];
          const tImag = curReal * imag[oddIdx] + curImag * real[oddIdx];
          
          real[oddIdx] = real[evenIdx] - tReal;
          imag[oddIdx] = imag[evenIdx] - tImag;
          real[evenIdx] = real[evenIdx] + tReal;
          imag[evenIdx] = imag[evenIdx] + tImag;
          
          const nextReal = curReal * wReal - curImag * wImag;
          curImag = curReal * wImag + curImag * wReal;
          curReal = nextReal;
        }
      }
    }
    
    // Scale for inverse FFT
    if (inverse) {
      for (let i = 0; i < n; i++) {
        real[i] /= n;
        imag[i] /= n;
      }
    }
  }, []);

  // Spectral bin scrambling using FFT
  const applySpectralScrambling = useCallback((
    buffer: AudioBuffer, 
    fftSize: number, 
    scrambleAmount: number, 
    binShift: number,
    freeze: boolean,
    mix: number,
    gateThreshold: number,
    stretch: number,
    binDensity: number
  ): void => {
    // Check if any processing is needed
    const hasScramble = scrambleAmount > 0;
    const hasShift = binShift !== 0;
    const hasGate = gateThreshold < 0;
    const hasStretch = Math.abs(stretch - 1.0) > 0.01;
    const hasDensity = binDensity < 100;
    
    if (!hasScramble && !hasShift && !freeze && !hasGate && !hasStretch && !hasDensity) return;
    
    // Validate and clamp to power-of-two (256, 512, 1024, 2048)
    const validSizes = [256, 512, 1024, 2048];
    if (!validSizes.includes(fftSize)) {
      fftSize = 1024; // Default to safe value
    }
    
    const hopSize = fftSize / 4;
    const wetMix = mix / 100;
    const numBins = fftSize / 2;
    
    // Convert gate threshold from dB to linear amplitude
    // gateThreshold is 0 (off) to -60 (aggressive)
    const gateLinear = gateThreshold < 0 ? Math.pow(10, gateThreshold / 20) : 0;
    
    // Reset frozen spectrum if FFT size changed
    if (frozenSpectrumRef.current && frozenSpectrumRef.current.fftSize !== fftSize) {
      frozenSpectrumRef.current = null;
    }
    
    // Allocate or reuse FFT buffers
    const buffers = fftBuffersRef.current;
    if (buffers.fftSize !== fftSize) {
      buffers.window = new Float32Array(fftSize);
      for (let i = 0; i < fftSize; i++) {
        buffers.window[i] = 0.5 * (1 - Math.cos(2 * Math.PI * i / fftSize));
      }
      buffers.real = new Float32Array(fftSize);
      buffers.imag = new Float32Array(fftSize);
      buffers.scrambledReal = new Float32Array(fftSize);
      buffers.scrambledImag = new Float32Array(fftSize);
      buffers.fftSize = fftSize;
    }
    const window = buffers.window!;
    const real = buffers.real!;
    const imag = buffers.imag!;
    const scrambledReal = buffers.scrambledReal!;
    const scrambledImag = buffers.scrambledImag!;
    
    // Create seeded random for deterministic scrambling (per-trigger, not per-frame for impact)
    const seed = Math.floor(scrambleAmount * 1000 + binShift * 100 + stretch * 50 + binDensity);
    let rngState = seed;
    const seededRandom = () => {
      rngState = (rngState * 1103515245 + 12345) & 0x7fffffff;
      return rngState / 0x7fffffff;
    };
    
    // Pre-calculate which bins are active based on density (per-trigger for discrete states)
    const activeBins = new Array(numBins).fill(false);
    const densityFraction = binDensity / 100;
    for (let k = 0; k < numBins; k++) {
      activeBins[k] = seededRandom() < densityFraction;
    }
    // Always keep some low-frequency content for audibility
    for (let k = 0; k < Math.min(10, numBins); k++) {
      activeBins[k] = true;
    }
    
    // Pre-calculate scramble mapping (per-trigger for impact, not per-frame)
    const scrambleMap = new Int32Array(numBins);
    const scrambleRange = Math.floor((scrambleAmount / 100) * numBins * 0.5);
    const shiftAmount = Math.floor((binShift / 50) * numBins * 0.25);
    rngState = seed; // Reset for consistent mapping
    for (let k = 0; k < numBins; k++) {
      let srcBin = k - shiftAmount;
      
      // Apply spectral stretch/squeeze
      if (hasStretch) {
        srcBin = Math.round(srcBin / stretch);
      }
      
      // Apply scrambling
      if (scrambleRange > 0) {
        const scrambleProb = scrambleAmount / 100;
        if (seededRandom() < scrambleProb) {
          srcBin += Math.floor((seededRandom() - 0.5) * scrambleRange * 2);
        }
      }
      
      scrambleMap[k] = Math.max(0, Math.min(numBins - 1, srcBin));
    }
    
    for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
      const data = buffer.getChannelData(channel);
      const originalData = new Float32Array(data);
      const numFrames = Math.ceil(data.length / hopSize);
      
      const processedData = new Float32Array(data.length);
      const windowSum = new Float32Array(data.length);
      
      for (let frame = 0; frame < numFrames; frame++) {
        const startIdx = frame * hopSize;
        
        // Extract frame and apply window
        for (let i = 0; i < fftSize; i++) {
          const idx = startIdx + i;
          real[i] = idx < data.length ? data[idx] * window[i] : 0;
          imag[i] = 0;
        }
        
        // Forward FFT
        fft(real, imag, false);
        
        // Use frozen spectrum if freeze is enabled
        if (freeze && frozenSpectrumRef.current) {
          real.set(frozenSpectrumRef.current.real);
          imag.set(frozenSpectrumRef.current.imag);
        } else if (freeze && !frozenSpectrumRef.current) {
          frozenSpectrumRef.current = {
            real: new Float32Array(real),
            imag: new Float32Array(imag),
            fftSize: fftSize
          };
        }
        
        // Find max magnitude for this frame (for relative gating) - computed per frame
        let frameMagnitude = 0;
        if (hasGate) {
          for (let k = 0; k < numBins; k++) {
            const mag = Math.sqrt(real[k] * real[k] + imag[k] * imag[k]);
            if (mag > frameMagnitude) frameMagnitude = mag;
          }
        }
        
        // Process frequency bins
        scrambledReal.fill(0);
        scrambledImag.fill(0);
        
        for (let k = 0; k < numBins; k++) {
          const srcBin = scrambleMap[k];
          let srcReal = real[srcBin];
          let srcImag = imag[srcBin];
          
          // Apply spectral gating (per-frame threshold)
          if (hasGate && frameMagnitude > 0) {
            const mag = Math.sqrt(srcReal * srcReal + srcImag * srcImag);
            const normalizedMag = mag / frameMagnitude;
            if (normalizedMag < gateLinear) {
              srcReal = 0;
              srcImag = 0;
            }
          }
          
          // Apply bin density (zero out inactive bins)
          if (hasDensity && !activeBins[k]) {
            srcReal = 0;
            srcImag = 0;
          }
          
          // Copy to output (positive frequency)
          scrambledReal[k] = srcReal;
          scrambledImag[k] = srcImag;
          
          // Mirror for negative frequency - use conjugate symmetry (same real, negated imag)
          // This maintains Hermitian symmetry for real-valued output
          if (k > 0 && k < numBins) {
            scrambledReal[fftSize - k] = srcReal;
            scrambledImag[fftSize - k] = -srcImag;
          }
        }
        
        // DC bin (k=0) - preserved unshifted but apply gating/density
        // DC represents the signal's average level and should stay at bin 0
        let dcReal = real[0];
        if (hasGate && frameMagnitude > 0) {
          const dcMag = Math.abs(dcReal);
          if (dcMag / frameMagnitude < gateLinear) dcReal = 0;
        }
        if (hasDensity && !activeBins[0]) dcReal = 0;
        scrambledReal[0] = dcReal;
        scrambledImag[0] = 0;
        
        // Nyquist bin - preserved unshifted but apply gating/density
        // Nyquist represents the highest frequency and should stay at numBins
        if (fftSize % 2 === 0) {
          let nyqReal = real[numBins];
          if (hasGate && frameMagnitude > 0) {
            const nyqMag = Math.abs(nyqReal);
            if (nyqMag / frameMagnitude < gateLinear) nyqReal = 0;
          }
          // Nyquist density: use last active bin status (numBins-1) since activeBins.length = numBins
          if (hasDensity && !activeBins[numBins - 1]) nyqReal = 0;
          scrambledReal[numBins] = nyqReal;
          scrambledImag[numBins] = 0;
        }
        
        // Inverse FFT
        fft(scrambledReal, scrambledImag, true);
        
        // Overlap-add
        for (let i = 0; i < fftSize; i++) {
          const idx = startIdx + i;
          if (idx < data.length) {
            processedData[idx] += scrambledReal[i] * window[i];
            windowSum[idx] += window[i] * window[i];
          }
        }
      }
      
      // Calculate RMS energy of original and processed signals
      let originalRMS = 0;
      let processedRMS = 0;
      for (let i = 0; i < data.length; i++) {
        originalRMS += originalData[i] * originalData[i];
        const wet = windowSum[i] > 0.001 ? processedData[i] / windowSum[i] : 0;
        processedRMS += wet * wet;
      }
      originalRMS = Math.sqrt(originalRMS / data.length);
      processedRMS = Math.sqrt(processedRMS / data.length);
      
      // ALWAYS cap wet mix at 70% to guarantee audible dry signal
      const maxWetMix = 0.7;
      let effectiveWetMix = Math.min(wetMix, maxWetMix);
      
      // Calculate energy normalization gain for the processed signal
      // This ensures scrambled output matches original loudness
      let energyGain = 1.0;
      if (processedRMS > 0.0001 && originalRMS > 0.001) {
        energyGain = Math.min(originalRMS / processedRMS, 4.0); // Cap at 4x to avoid extreme boost
      }
      
      // If processed signal is still too quiet even after normalization potential,
      // reduce wet mix further (stronger safeguard)
      if (originalRMS > 0.001 && processedRMS * energyGain < originalRMS * 0.5) {
        // Scrambler produced very quiet output - blend more dry signal
        effectiveWetMix = Math.min(effectiveWetMix, 0.4); // Further reduce to 40% wet max
      }
      
      let effectiveDryMix = 1 - effectiveWetMix;
      
      // Normalize and mix with original - apply energy gain to wet signal
      for (let i = 0; i < data.length; i++) {
        const rawWet = windowSum[i] > 0.001 ? processedData[i] / windowSum[i] : 0;
        const normalizedWet = rawWet * energyGain;
        data[i] = originalData[i] * effectiveDryMix + normalizedWet * effectiveWetMix;
      }
    }
    
    // Clear frozen spectrum when freeze is disabled
    if (!freeze) {
      frozenSpectrumRef.current = null;
    }
  }, [fft]);

  // Apply a safety fadeout at the end of the buffer to prevent pops/clicks
  // Increased fadeMs for heavily processed sounds
  const applySafetyFadeout = useCallback((buffer: AudioBuffer, fadeMs: number = 20): void => {
    const fadeOutSamples = Math.max(2, Math.min(
      Math.floor((fadeMs / 1000) * buffer.sampleRate),
      Math.floor(buffer.length * 0.1) // Max 10% of buffer length
    ));
    
    if (buffer.length < 2) return;
    
    for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
      const data = buffer.getChannelData(channel);
      const startIndex = Math.max(0, buffer.length - fadeOutSamples);
      const actualFadeSamples = buffer.length - startIndex;
      
      for (let i = 0; i < actualFadeSamples; i++) {
        // Use (i+1)/actualFadeSamples to reach exactly 0 at the last sample
        const t = (i + 1) / actualFadeSamples;
        const gain = Math.cos(t * Math.PI * 0.5); // Cosine curve from ~1 to 0
        data[startIndex + i] *= gain;
      }
      
      // Force last sample to exactly zero to prevent any residual click
      data[buffer.length - 1] = 0;
    }
  }, []);

  const processIRBuffer = useCallback((
    ctx: AudioContext | OfflineAudioContext,
    irBuffer: AudioBuffer,
    settings: ConvolverSettings
  ): AudioBuffer => {
    const { reverse, stretch, decay } = settings;
    
    const stretchedLength = Math.floor(irBuffer.length * stretch);
    const finalLength = Math.max(1, stretchedLength);
    
    const processedBuffer = ctx.createBuffer(
      irBuffer.numberOfChannels,
      finalLength,
      irBuffer.sampleRate
    );
    
    const decayRate = decay / 100;
    const decayExponent = 3 + (1 - decayRate) * 5;
    
    for (let ch = 0; ch < irBuffer.numberOfChannels; ch++) {
      const inputData = irBuffer.getChannelData(ch);
      const outputData = processedBuffer.getChannelData(ch);
      
      for (let i = 0; i < finalLength; i++) {
        const srcPos = i / stretch;
        const srcIndex = Math.floor(srcPos);
        const frac = srcPos - srcIndex;
        const idx0 = Math.min(srcIndex, inputData.length - 1);
        const idx1 = Math.min(srcIndex + 1, inputData.length - 1);
        let sample = inputData[idx0] * (1 - frac) + inputData[idx1] * frac;
        
        const position = i / finalLength;
        const envelope = Math.pow(1 - position, decayExponent);
        sample *= envelope;
        
        outputData[i] = sample;
      }
      
      if (reverse) {
        outputData.reverse();
      }
    }
    
    return processedBuffer;
  }, []);

  const generateSound = useCallback(async (
    ctx: AudioContext | OfflineAudioContext,
    params: SynthParameters,
    duration: number,
    seed: number = Date.now(),
    sourcesCollector?: AudioScheduledSourceNode[],
    perOscEnvelopes?: OscEnvelopes,
    convSettings?: ConvolverSettings
  ): Promise<{ masterGain: GainNode; safetyFadeGain: GainNode }> => {
    const now = ctx.currentTime;
    const durationSec = duration / 1000;
    
    // Fix 6: Use seeded random for consistent preview/export
    const seededRandom = createSeededRandom(seed);
    
    const masterGain = ctx.createGain();
    masterGain.gain.value = 0.0001;
    
    // Fix 2: Create safety fade gain at the end of the chain
    const safetyFadeGain = ctx.createGain();
    safetyFadeGain.gain.value = 1.0;
    
    // Fix 2: Schedule safety fade at the end (25ms fade for smoother fadeout)
    const safetyFadeTime = 0.025; // 25ms for smooth fade on heavy FX
    const envelopeEndTime = durationSec - TAIL_PAD; // When envelope ends
    safetyFadeGain.gain.setValueAtTime(1.0, now + envelopeEndTime);
    safetyFadeGain.gain.linearRampToValueAtTime(0, now + envelopeEndTime + safetyFadeTime);
    
    // Fix 3: Calculate when to stop nodes (after safety fade completes plus buffer)
    const stopAt = now + envelopeEndTime + safetyFadeTime + 0.02;
    
    const panNode = ctx.createStereoPanner();
    panNode.pan.value = params.output.pan / 100;
    
    let lastNode: AudioNode = masterGain;
    
    if (params.filter.enabled) {
      if (params.filter.type === "comb") {
        const delay = ctx.createDelay();
        delay.delayTime.value = params.filter.combDelay / 1000;
        const feedback = ctx.createGain();
        feedback.gain.value = Math.min(0.95, params.filter.resonance / 30);
        const combGain = ctx.createGain();
        combGain.gain.value = 1;
        
        masterGain.connect(delay);
        delay.connect(feedback);
        feedback.connect(delay);
        delay.connect(combGain);
        masterGain.connect(combGain);
        lastNode = combGain;
      } else {
        const filter = ctx.createBiquadFilter();
        filter.type = params.filter.type as BiquadFilterType;
        filter.frequency.value = params.filter.frequency;
        filter.Q.value = params.filter.resonance;
        if (params.filter.type === "peaking" || params.filter.type === "lowshelf" || params.filter.type === "highshelf") {
          filter.gain.value = params.filter.gain;
        }
        masterGain.connect(filter);
        lastNode = filter;
        
        const filterEnv = params.envelopes.env1;
        if (filterEnv.enabled) {
          const attackEnd = now + filterEnv.attack / 1000;
          const holdEnd = attackEnd + filterEnv.hold / 1000;
          const decayEnd = holdEnd + filterEnv.decay / 1000;
          const modAmount = (filterEnv.amount / 100) * (params.filter.frequency * 2);
          
          filter.frequency.setValueAtTime(params.filter.frequency, now);
          filter.frequency.linearRampToValueAtTime(
            Math.max(20, Math.min(20000, params.filter.frequency + modAmount)), 
            attackEnd
          );
          filter.frequency.setValueAtTime(
            Math.max(20, Math.min(20000, params.filter.frequency + modAmount)), 
            holdEnd
          );
          filter.frequency.linearRampToValueAtTime(params.filter.frequency, decayEnd);
        }
      }
    }

    if (params.waveshaper.enabled) {
      const waveshaper = ctx.createWaveShaper();
      waveshaper.curve = createWaveshaperCurve(params.waveshaper.curve, params.waveshaper.drive);
      waveshaper.oversample = params.waveshaper.oversample;
      
      if (params.waveshaper.preFilterEnabled) {
        const preFilter = ctx.createBiquadFilter();
        preFilter.type = "highpass";
        preFilter.frequency.value = params.waveshaper.preFilterFreq;
        lastNode.connect(preFilter);
        lastNode = preFilter;
      }
      
      if (params.waveshaper.mix < 100) {
        const dryGain = ctx.createGain();
        const wetGain = ctx.createGain();
        const mixNode = ctx.createGain();
        dryGain.gain.value = 1 - params.waveshaper.mix / 100;
        wetGain.gain.value = params.waveshaper.mix / 100;
        
        lastNode.connect(dryGain);
        lastNode.connect(waveshaper);
        waveshaper.connect(wetGain);
        dryGain.connect(mixNode);
        wetGain.connect(mixNode);
        lastNode = mixNode;
      } else {
        lastNode.connect(waveshaper);
        lastNode = waveshaper;
      }
      
      if (params.waveshaper.postFilterEnabled) {
        const postFilter = ctx.createBiquadFilter();
        postFilter.type = "lowpass";
        postFilter.frequency.value = params.waveshaper.postFilterFreq;
        lastNode.connect(postFilter);
        lastNode = postFilter;
      }
    }

    if (params.effects.saturation > 0) {
      const waveshaper = ctx.createWaveShaper();
      const amount = params.effects.saturation / 100;
      const samples = 44100;
      const curve = new Float32Array(samples);
      for (let i = 0; i < samples; i++) {
        const x = (i * 2) / samples - 1;
        curve[i] = (3 + amount * 10) * x * 20 * (Math.PI / 180) / 
          (Math.PI + amount * 10 * Math.abs(x));
      }
      waveshaper.curve = curve;
      waveshaper.oversample = "4x";
      lastNode.connect(waveshaper);
      lastNode = waveshaper;
    }
    
    // Fix 4: DC blocking highpass filter after distortion (removes clicks from DC offset)
    const dcBlock = ctx.createBiquadFilter();
    dcBlock.type = "highpass";
    dcBlock.frequency.value = 20;
    dcBlock.Q.value = 0.707;
    lastNode.connect(dcBlock);
    lastNode = dcBlock;

    const dryGain = ctx.createGain();
    dryGain.gain.value = 1;
    lastNode.connect(dryGain);
    
    const effectsMixer = ctx.createGain();
    effectsMixer.gain.value = 1;
    dryGain.connect(effectsMixer);

    if (params.effects.delayEnabled && params.effects.delayMix > 0) {
      const delayNode = ctx.createDelay(3);
      delayNode.delayTime.value = getEffectiveDelayTime(params) / 1000;
      const delayFeedback = ctx.createGain();
      delayFeedback.gain.value = params.effects.delayFeedback / 100;
      const delayWet = ctx.createGain();
      delayWet.gain.value = params.effects.delayMix / 100;
      
      lastNode.connect(delayNode);
      delayNode.connect(delayFeedback);
      delayFeedback.connect(delayNode);
      delayNode.connect(delayWet);
      delayWet.connect(effectsMixer);
    }

    if (params.convolver.enabled && params.convolver.useCustomIR && params.convolver.irName !== "none") {
      let irBuffer = customIRBufferRef.current;
      if (!irBuffer || params.convolver.irName !== "current") {
        irBuffer = await loadStoredIR(params.convolver.irName);
      }
      
      if (irBuffer) {
        const settings = convSettings || defaultConvolverSettings;
        const processedIR = processIRBuffer(ctx, irBuffer, settings);
        
        const convolver = ctx.createConvolver();
        convolver.buffer = processedIR;
        
        const convolverWet = ctx.createGain();
        const convolverDry = ctx.createGain();
        convolverWet.gain.value = params.convolver.mix / 100;
        convolverDry.gain.value = 1 - params.convolver.mix / 100;
        
        let convolverInput: AudioNode = lastNode;
        if (settings.predelay > 0) {
          const predelayNode = ctx.createDelay(1);
          predelayNode.delayTime.value = settings.predelay / 1000;
          lastNode.connect(predelayNode);
          convolverInput = predelayNode;
        }
        
        const nyquist = ctx.sampleRate / 2;
        const clampedLowCut = Math.max(20, Math.min(settings.lowCut, nyquist - 100));
        const clampedHighCut = Math.max(clampedLowCut + 100, Math.min(settings.highCut, nyquist - 10));
        
        const lowCutFilter = ctx.createBiquadFilter();
        lowCutFilter.type = "highpass";
        lowCutFilter.frequency.value = clampedLowCut;
        lowCutFilter.Q.value = 0.7;
        
        const highCutFilter = ctx.createBiquadFilter();
        highCutFilter.type = "lowpass";
        highCutFilter.frequency.value = clampedHighCut;
        highCutFilter.Q.value = 0.7;
        
        convolverInput.connect(convolver);
        convolver.connect(lowCutFilter);
        lowCutFilter.connect(highCutFilter);
        highCutFilter.connect(convolverWet);
        lastNode.connect(convolverDry);
        
        const convolverMix = ctx.createGain();
        convolverWet.connect(convolverMix);
        convolverDry.connect(convolverMix);
        convolverMix.connect(effectsMixer);
      }
    } else if (params.effects.reverbEnabled && params.effects.reverbMix > 0) {
      const convolver = ctx.createConvolver();
      const reverbDuration = 0.5 + (params.effects.reverbSize / 100) * 3;
      // Fix 6: Use seeded random for deterministic reverb impulse response
      convolver.buffer = createImpulseResponse(ctx, reverbDuration, params.effects.reverbDecay, seededRandom);
      const reverbWet = ctx.createGain();
      reverbWet.gain.value = params.effects.reverbMix / 100;
      
      lastNode.connect(convolver);
      convolver.connect(reverbWet);
      reverbWet.connect(effectsMixer);
    }

    if (params.effects.chorusEnabled && params.effects.chorusMix > 0) {
      const chorusDelay1 = ctx.createDelay();
      const chorusDelay2 = ctx.createDelay();
      chorusDelay1.delayTime.value = 0.02;
      chorusDelay2.delayTime.value = 0.025;
      
      const lfo1 = ctx.createOscillator();
      const lfo2 = ctx.createOscillator();
      lfo1.frequency.value = params.effects.chorusRate;
      lfo2.frequency.value = params.effects.chorusRate * 1.1;
      
      const lfoGain1 = ctx.createGain();
      const lfoGain2 = ctx.createGain();
      const depth = (params.effects.chorusDepth / 100) * 0.005;
      lfoGain1.gain.value = depth;
      lfoGain2.gain.value = depth;
      
      lfo1.connect(lfoGain1);
      lfoGain1.connect(chorusDelay1.delayTime);
      lfo2.connect(lfoGain2);
      lfoGain2.connect(chorusDelay2.delayTime);
      
      lfo1.start(now);
      lfo2.start(now);
      // Fix 3: Stop nodes after safety fade completes
      lfo1.stop(stopAt);
      lfo2.stop(stopAt);
      
      const chorusWet = ctx.createGain();
      chorusWet.gain.value = params.effects.chorusMix / 100;
      
      lastNode.connect(chorusDelay1);
      lastNode.connect(chorusDelay2);
      chorusDelay1.connect(chorusWet);
      chorusDelay2.connect(chorusWet);
      chorusWet.connect(effectsMixer);
    }

    let outputNode: AudioNode = effectsMixer;

    if (params.effects.transientEnabled) {
      const transientGain = ctx.createGain();
      const attackAmount = params.effects.transientAttack / 100;
      const sustainAmount = params.effects.transientSustain / 100;
      
      const transientDuration = 0.05;
      const transientPeak = 1 + attackAmount * 0.5;
      const sustainLevel = 1 + sustainAmount * 0.3;
      
      if (attackAmount !== 0) {
        transientGain.gain.setValueAtTime(Math.max(EPS, transientPeak), now);
        transientGain.gain.setTargetAtTime(sustainLevel, now, transientDuration / 5);
        transientGain.gain.setValueAtTime(sustainLevel, now + transientDuration);
      } else {
        transientGain.gain.setValueAtTime(sustainLevel, now);
      }
      
      outputNode.connect(transientGain);
      outputNode = transientGain;
    }

    if (params.effects.multibandEnabled) {
      const lowFilter = ctx.createBiquadFilter();
      lowFilter.type = "lowpass";
      lowFilter.frequency.value = params.effects.multibandLowFreq;
      
      const midFilterLow = ctx.createBiquadFilter();
      midFilterLow.type = "highpass";
      midFilterLow.frequency.value = params.effects.multibandLowFreq;
      const midFilterHigh = ctx.createBiquadFilter();
      midFilterHigh.type = "lowpass";
      midFilterHigh.frequency.value = params.effects.multibandHighFreq;
      
      const highFilter = ctx.createBiquadFilter();
      highFilter.type = "highpass";
      highFilter.frequency.value = params.effects.multibandHighFreq;
      
      const createWaveshaper = (drive: number) => {
        const shaper = ctx.createWaveShaper();
        const amount = (drive / 100) * 5;
        const samples = 256;
        const curve = new Float32Array(samples);
        for (let i = 0; i < samples; i++) {
          const x = (i * 2) / samples - 1;
          curve[i] = (Math.PI + amount) * x / (Math.PI + amount * Math.abs(x));
        }
        shaper.curve = curve;
        return shaper;
      };
      
      const lowShaper = createWaveshaper(params.effects.multibandLowDrive);
      const midShaper = createWaveshaper(params.effects.multibandMidDrive);
      const highShaper = createWaveshaper(params.effects.multibandHighDrive);
      
      const bandMixer = ctx.createGain();
      bandMixer.gain.value = 1;
      
      outputNode.connect(lowFilter);
      lowFilter.connect(lowShaper);
      lowShaper.connect(bandMixer);
      
      outputNode.connect(midFilterLow);
      midFilterLow.connect(midFilterHigh);
      midFilterHigh.connect(midShaper);
      midShaper.connect(bandMixer);
      
      outputNode.connect(highFilter);
      highFilter.connect(highShaper);
      highShaper.connect(bandMixer);
      
      outputNode = bandMixer;
    }

    if (params.saturationChain.enabled) {
      const sat = params.saturationChain;
      let satInput = outputNode;
      let satNode: AudioNode = outputNode;
      
      if (sat.tapeEnabled && sat.tapeDrive > 0) {
        const tapeShaper = ctx.createWaveShaper();
        const tapeDrive = sat.tapeDrive / 100;
        const tapeWarmth = sat.tapeWarmth / 100;
        const tapeCurve = new Float32Array(4096);
        for (let i = 0; i < tapeCurve.length; i++) {
          const x = (i * 2) / tapeCurve.length - 1;
          const softClip = Math.tanh(x * (1 + tapeDrive * 2));
          const warmth = x > 0 ? softClip * (1 - tapeWarmth * 0.2) : softClip * (1 + tapeWarmth * 0.1);
          tapeCurve[i] = warmth;
        }
        tapeShaper.curve = tapeCurve;
        tapeShaper.oversample = "2x";
        satNode.connect(tapeShaper);
        satNode = tapeShaper;
      }
      
      if (sat.tubeEnabled && sat.tubeDrive > 0) {
        const tubeShaper = ctx.createWaveShaper();
        const tubeDrive = sat.tubeDrive / 100;
        const tubeBias = (sat.tubeBias / 100 - 0.5) * 0.3;
        const tubeCurve = new Float32Array(4096);
        for (let i = 0; i < tubeCurve.length; i++) {
          const x = (i * 2) / tubeCurve.length - 1 + tubeBias;
          const k = tubeDrive * 10 + 1;
          tubeCurve[i] = (1 + k) * x / (1 + k * Math.abs(x));
        }
        tubeShaper.curve = tubeCurve;
        tubeShaper.oversample = "2x";
        satNode.connect(tubeShaper);
        satNode = tubeShaper;
      }
      
      if (sat.transistorEnabled && sat.transistorDrive > 0) {
        const transShaper = ctx.createWaveShaper();
        const transDrive = sat.transistorDrive / 100;
        const transAsym = sat.transistorAsymmetry / 100;
        const transCurve = new Float32Array(4096);
        for (let i = 0; i < transCurve.length; i++) {
          const x = (i * 2) / transCurve.length - 1;
          if (x >= 0) {
            transCurve[i] = Math.tanh(x * (1 + transDrive * 5));
          } else {
            transCurve[i] = Math.tanh(x * (1 + transDrive * 5 * (1 + transAsym)));
          }
        }
        transShaper.curve = transCurve;
        transShaper.oversample = "2x";
        satNode.connect(transShaper);
        satNode = transShaper;
      }
      
      if (sat.mix < 100) {
        const dryGain = ctx.createGain();
        const wetGain = ctx.createGain();
        const satMixer = ctx.createGain();
        dryGain.gain.value = 1 - sat.mix / 100;
        wetGain.gain.value = sat.mix / 100;
        satInput.connect(dryGain);
        satNode.connect(wetGain);
        dryGain.connect(satMixer);
        wetGain.connect(satMixer);
        outputNode = satMixer;
      } else {
        outputNode = satNode;
      }
    }

    if (params.mastering.compressorEnabled) {
      const comp = ctx.createDynamicsCompressor();
      comp.threshold.value = params.mastering.compressorThreshold;
      comp.knee.value = params.mastering.compressorKnee;
      comp.ratio.value = params.mastering.compressorRatio;
      comp.attack.value = params.mastering.compressorAttack / 1000;
      comp.release.value = params.mastering.compressorRelease / 1000;
      
      const makeup = ctx.createGain();
      makeup.gain.value = Math.pow(10, params.mastering.compressorMakeup / 20);
      
      outputNode.connect(comp);
      comp.connect(makeup);
      outputNode = makeup;
    }

    if (params.mastering.exciterEnabled && params.mastering.exciterAmount > 0) {
      const exciterHPF = ctx.createBiquadFilter();
      exciterHPF.type = "highpass";
      exciterHPF.frequency.value = params.mastering.exciterFreq;
      exciterHPF.Q.value = 0.5;
      
      const exciterShaper = ctx.createWaveShaper();
      const exciterAmount = params.mastering.exciterAmount / 100;
      const exciterCurve = new Float32Array(256);
      for (let i = 0; i < exciterCurve.length; i++) {
        const x = (i * 2) / exciterCurve.length - 1;
        exciterCurve[i] = Math.tanh(x * (1 + exciterAmount * 5)) + x * exciterAmount * 0.5;
      }
      exciterShaper.curve = exciterCurve;
      
      const exciterGain = ctx.createGain();
      exciterGain.gain.value = (params.mastering.exciterMix / 100) * 0.5;
      
      const exciterMixer = ctx.createGain();
      exciterMixer.gain.value = 1;
      
      outputNode.connect(exciterHPF);
      exciterHPF.connect(exciterShaper);
      exciterShaper.connect(exciterGain);
      outputNode.connect(exciterMixer);
      exciterGain.connect(exciterMixer);
      
      outputNode = exciterMixer;
    }

    if (params.mastering.stereoEnabled && params.output.pan === 0) {
      const widthAmount = (params.mastering.stereoWidth - 100) / 100;
      
      const splitter = ctx.createChannelSplitter(2);
      const merger = ctx.createChannelMerger(2);
      
      const leftGain = ctx.createGain();
      const rightGain = ctx.createGain();
      const leftCross = ctx.createGain();
      const rightCross = ctx.createGain();
      
      const sideAmount = Math.max(0, widthAmount);
      const narrowAmount = Math.max(0, -widthAmount);
      
      leftGain.gain.value = 1 - narrowAmount * 0.5;
      rightGain.gain.value = 1 - narrowAmount * 0.5;
      leftCross.gain.value = narrowAmount * 0.5 + sideAmount * 0.3;
      rightCross.gain.value = narrowAmount * 0.5 - sideAmount * 0.3;
      
      outputNode.connect(splitter);
      
      splitter.connect(leftGain, 0);
      splitter.connect(rightGain, 1);
      splitter.connect(leftCross, 1);
      splitter.connect(rightCross, 0);
      
      const leftMix = ctx.createGain();
      const rightMix = ctx.createGain();
      leftGain.connect(leftMix);
      leftCross.connect(leftMix);
      rightGain.connect(rightMix);
      rightCross.connect(rightMix);
      
      leftMix.connect(merger, 0, 0);
      rightMix.connect(merger, 0, 1);
      
      outputNode = merger;
    }

    if (params.effects.limiterEnabled) {
      const limiter = ctx.createDynamicsCompressor();
      limiter.threshold.value = params.effects.limiterThreshold;
      limiter.knee.value = 0;
      limiter.ratio.value = 20;
      limiter.attack.value = 0.001;
      limiter.release.value = params.effects.limiterRelease / 1000;
      
      outputNode.connect(limiter);
      outputNode = limiter;
    }
    
    // Always-on safety limiter to prevent clipping in exports
    // This ensures exported audio matches browser playback (which has built-in protection)
    const safetyLimiter = ctx.createDynamicsCompressor();
    safetyLimiter.threshold.value = -0.5; // Just below 0dB to catch peaks
    safetyLimiter.knee.value = 0.5; // Soft knee for transparent limiting
    safetyLimiter.ratio.value = 20; // Hard limiting
    safetyLimiter.attack.value = 0.0005; // Ultra-fast attack (0.5ms)
    safetyLimiter.release.value = 0.05; // Quick release (50ms)
    
    // Fix 2: Route through safety fade gain (scheduled fadeout at end)
    outputNode.connect(safetyLimiter);
    safetyLimiter.connect(panNode);
    panNode.connect(safetyFadeGain);
    safetyFadeGain.connect(ctx.destination);

    const oscConfigs = [
      { osc: params.oscillators.osc1, key: "osc1" },
      { osc: params.oscillators.osc2, key: "osc2" },
      { osc: params.oscillators.osc3, key: "osc3" },
    ];

    for (const { osc, key } of oscConfigs) {
      if (!osc.enabled) continue;

      const oscGain = ctx.createGain();
      oscGain.gain.value = osc.level / 100;
      const oscPitchHz = pitchToHz(osc.pitch);
      
      let sourceNode: AudioScheduledSourceNode;
      let frequencyParam: AudioParam | null = null;

      if (osc.waveform === "noise") {
        const bufferSize = Math.ceil(ctx.sampleRate * durationSec);
        const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const noiseData = noiseBuffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          noiseData[i] = seededRandom() * 2 - 1; // Fix 6: Use seeded random
        }
        const noiseSource = ctx.createBufferSource();
        noiseSource.buffer = noiseBuffer;
        noiseSource.connect(oscGain);
        sourceNode = noiseSource;
      } else {
        const oscNode = ctx.createOscillator();
        oscNode.type = osc.waveform as OscillatorType;
        oscNode.frequency.value = oscPitchHz;
        oscNode.detune.value = osc.detune;
        frequencyParam = oscNode.frequency;

        if (osc.fmEnabled && osc.fmDepth > 0 && osc.fmWaveform !== "noise") {
          const modOsc = ctx.createOscillator();
          modOsc.type = osc.fmWaveform as OscillatorType;
          modOsc.frequency.value = oscPitchHz * osc.fmRatio;
          
          const modGain = ctx.createGain();
          let fmDepthValue = osc.fmDepth;
          
          if (osc.indexEnvEnabled && osc.indexEnvDepth > 0) {
            const baseDepth = Math.max(EPS, osc.fmDepth);
            const peakDepth = baseDepth + (osc.indexEnvDepth * 50);
            triggerAHD(modGain.gain, now, {
              attack: 0.0005,
              hold: 0,
              decay: osc.indexEnvDecay / 1000
            }, peakDepth, { startFromCurrent: false });
          } else {
            modGain.gain.value = fmDepthValue;
          }
          
          modOsc.connect(modGain);
          modGain.connect(oscNode.frequency);
          
          if (osc.fmFeedback > 0) {
            const feedbackGain = ctx.createGain();
            feedbackGain.gain.value = osc.fmFeedback * osc.fmDepth * 0.5;
            modOsc.connect(feedbackGain);
            feedbackGain.connect(modOsc.frequency);
          }
          
          modOsc.start(now);
          modOsc.stop(stopAt); // Fix 3: Stop after safety fade
        }

        if (osc.pmEnabled && osc.pmDepth > 0 && osc.pmWaveform !== "noise") {
          const pmModOsc = ctx.createOscillator();
          pmModOsc.type = osc.pmWaveform as OscillatorType;
          pmModOsc.frequency.value = oscPitchHz * osc.pmRatio;
          
          const pmModGain = ctx.createGain();
          const pmIndex = osc.pmDepth * 100;
          
          if (osc.indexEnvEnabled && osc.indexEnvDepth > 0) {
            const basePmDepth = Math.max(EPS, pmIndex);
            const peakPmDepth = basePmDepth + (osc.indexEnvDepth * 100);
            triggerAHD(pmModGain.gain, now, {
              attack: 0.0005,
              hold: 0,
              decay: osc.indexEnvDecay / 1000
            }, peakPmDepth, { startFromCurrent: false });
          } else {
            pmModGain.gain.value = pmIndex;
          }
          
          pmModOsc.connect(pmModGain);
          pmModGain.connect(oscNode.frequency);
          
          if (osc.pmFeedback > 0) {
            const pmFeedbackGain = ctx.createGain();
            pmFeedbackGain.gain.value = osc.pmFeedback * pmIndex * 0.3;
            pmModOsc.connect(pmFeedbackGain);
            pmFeedbackGain.connect(pmModOsc.frequency);
          }
          
          pmModOsc.start(now);
          pmModOsc.stop(stopAt); // Fix 3: Stop after safety fade
        }

        oscNode.connect(oscGain);
        sourceNode = oscNode;
      }

      let finalGain = oscGain;
      if (osc.amEnabled && osc.amDepth > 0 && osc.amWaveform !== "noise") {
        const depth = osc.amDepth / 100;
        
        const amModOsc = ctx.createOscillator();
        amModOsc.type = osc.amWaveform as OscillatorType;
        amModOsc.frequency.value = oscPitchHz * osc.amRatio;
        
        const amModGain = ctx.createGain();
        amModGain.gain.value = depth * 0.5;
        
        const amOutputGain = ctx.createGain();
        amOutputGain.gain.value = 1 - depth * 0.5;
        
        amModOsc.connect(amModGain);
        amModGain.connect(amOutputGain.gain);
        
        oscGain.disconnect();
        oscGain.connect(amOutputGain);
        finalGain = amOutputGain;
        
        amModOsc.start(now);
        amModOsc.stop(stopAt); // Fix 3: Stop after safety fade
      }

      if (frequencyParam) {
        const pitchEnv = params.envelopes.env2;
        if (pitchEnv.enabled && pitchEnv.amount !== 0) {
          const attackEnd = now + pitchEnv.attack / 1000;
          const holdEnd = attackEnd + pitchEnv.hold / 1000;
          const decayEnd = holdEnd + pitchEnv.decay / 1000;
          
          // Use semitone-based pitch modulation for proper 808-style pitch drops
          // amount is in semitones (-48 to +48)
          const semitones = pitchEnv.amount;
          const pitchMultiplier = Math.pow(2, semitones / 12);
          const startFreq = oscPitchHz * pitchMultiplier;
          const useExponential = pitchEnv.curve === 'exponential';
          
          frequencyParam.setValueAtTime(Math.max(20, startFreq), now);
          if (useExponential) {
            frequencyParam.exponentialRampToValueAtTime(
              Math.max(20, startFreq),
              attackEnd
            );
            frequencyParam.setValueAtTime(Math.max(20, startFreq), holdEnd);
            frequencyParam.exponentialRampToValueAtTime(Math.max(20, oscPitchHz), decayEnd);
          } else {
            frequencyParam.linearRampToValueAtTime(
              Math.max(20, startFreq), 
              attackEnd
            );
            frequencyParam.setValueAtTime(Math.max(20, startFreq), holdEnd);
            frequencyParam.linearRampToValueAtTime(oscPitchHz, decayEnd);
          }
        }

        if (osc.drift > 0) {
          const driftAmount = osc.drift / 100;
          const driftLfo = ctx.createOscillator();
          const driftGain = ctx.createGain();
          driftLfo.frequency.value = 2 + seededRandom() * 3; // Fix 6: Use seeded random
          driftGain.gain.value = oscPitchHz * 0.02 * driftAmount;
          driftLfo.connect(driftGain);
          driftGain.connect(frequencyParam);
          driftLfo.start(now);
          driftLfo.stop(stopAt); // Fix 3: Stop after safety fade
        }
      }

      const baseLevel = osc.level / 100;
      
      // Check for per-oscillator envelope (if enabled, use it; otherwise just set level)
      const oscEnv = perOscEnvelopes?.[key as keyof OscEnvelopes];
      if (oscEnv && oscEnv.enabled) {
        // Per-oscillator AHD - shapes this oscillator independently before master
        triggerAHD(oscGain.gain, now, {
          attack: oscEnv.attack / 1000,
          hold: oscEnv.hold / 1000,
          decay: oscEnv.decay / 1000
        }, baseLevel, { startFromCurrent: false });
      } else {
        // No per-osc envelope - just set constant level (master envelope handles overall shape)
        oscGain.gain.setValueAtTime(baseLevel, now);
      }

      finalGain.connect(masterGain);
      
      sourceNode.start(now);
      sourceNode.stop(stopAt); // Fix 3: Stop after safety fade
      if (sourcesCollector) {
        sourcesCollector.push(sourceNode);
      }
    }

    if (params.clickLayer.enabled && params.clickLayer.level > 0) {
      const click = params.clickLayer;
      const clickDecay = click.decay / 1000;
      const clickBufferLength = Math.ceil(ctx.sampleRate * (clickDecay + 0.005));
      const clickBuffer = ctx.createBuffer(1, clickBufferLength, ctx.sampleRate);
      const clickData = clickBuffer.getChannelData(0);
      
      // Fix 6: Use seeded random for click layer noise
      if (click.noiseType === "white") {
        for (let i = 0; i < clickBufferLength; i++) {
          clickData[i] = seededRandom() * 2 - 1;
        }
      } else if (click.noiseType === "pink") {
        let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
        for (let i = 0; i < clickBufferLength; i++) {
          const white = seededRandom() * 2 - 1;
          b0 = 0.99886 * b0 + white * 0.0555179;
          b1 = 0.99332 * b1 + white * 0.0750759;
          b2 = 0.96900 * b2 + white * 0.1538520;
          b3 = 0.86650 * b3 + white * 0.3104856;
          b4 = 0.55000 * b4 + white * 0.5329522;
          b5 = -0.7616 * b5 - white * 0.0168980;
          clickData[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
          b6 = white * 0.115926;
        }
      } else if (click.noiseType === "brown") {
        let lastOut = 0;
        for (let i = 0; i < clickBufferLength; i++) {
          const white = seededRandom() * 2 - 1;
          lastOut = (lastOut + (0.02 * white)) / 1.02;
          clickData[i] = lastOut * 3.5;
        }
      }
      
      const clickSource = ctx.createBufferSource();
      clickSource.buffer = clickBuffer;
      
      const clickFilter = ctx.createBiquadFilter();
      clickFilter.type = click.filterType;
      clickFilter.frequency.value = click.filterFreq;
      clickFilter.Q.value = click.filterQ;
      
      let clickNode: AudioNode = clickFilter;
      
      if (click.srrEnabled) {
        const srrSamples = Math.pow(2, 16 - click.srrAmount);
        const srrShaper = ctx.createWaveShaper();
        const srrCurve = new Float32Array(65536);
        for (let i = 0; i < srrCurve.length; i++) {
          const x = (i / 32768) - 1;
          srrCurve[i] = Math.round(x * srrSamples) / srrSamples;
        }
        srrShaper.curve = srrCurve;
        clickFilter.connect(srrShaper);
        clickNode = srrShaper;
      }
      
      const clickGain = ctx.createGain();
      const clickLevel = (click.level / 100) * 0.8;
      triggerAHD(clickGain.gain, now, {
        attack: 0.0005,
        hold: 0,
        decay: clickDecay
      }, clickLevel, { startFromCurrent: false });
      
      clickSource.connect(clickFilter);
      clickNode.connect(clickGain);
      clickGain.connect(masterGain);
      
      clickSource.start(now);
      clickSource.stop(now + clickDecay + 0.01);
      if (sourcesCollector) {
        sourcesCollector.push(clickSource);
      }
    }

    if (params.subOsc.enabled && params.subOsc.level > 0) {
      const sub = params.subOsc;
      const baseFreq = pitchToHz(params.oscillators.osc1.pitch);
      const subFreq = baseFreq * Math.pow(2, sub.octave);
      
      const subOsc = ctx.createOscillator();
      subOsc.type = sub.waveform;
      
      const stToMult = (st: number) => Math.pow(2, st / 12);
      const pitchEnv = params.envelopes.env2;
      
      // Only apply pitch envelope to sub if bypass is disabled
      if (!sub.pitchEnvBypass && pitchEnv.enabled && pitchEnv.amount !== 0) {
        // Use semitone-based pitch drop (amount is now in semitones, -48 to +48)
        // Apply a gentler scale for sub bass (0.5x the main osc drop)
        const subPitchScale = 0.5;
        const semitones = pitchEnv.amount * subPitchScale;
        const attackEnd = now + pitchEnv.attack / 1000;
        const holdEnd = attackEnd + pitchEnv.hold / 1000;
        const decayEnd = holdEnd + pitchEnv.decay / 1000;
        
        const startHz = Math.max(20, subFreq * stToMult(semitones));
        const endHz = Math.max(20, subFreq);
        
        subOsc.frequency.setValueAtTime(startHz, now);
        if (pitchEnv.curve === "exponential") {
          subOsc.frequency.exponentialRampToValueAtTime(startHz, attackEnd);
          subOsc.frequency.setValueAtTime(startHz, holdEnd);
          subOsc.frequency.exponentialRampToValueAtTime(endHz, decayEnd);
        } else {
          subOsc.frequency.linearRampToValueAtTime(startHz, attackEnd);
          subOsc.frequency.setValueAtTime(startHz, holdEnd);
          subOsc.frequency.linearRampToValueAtTime(endHz, decayEnd);
        }
      } else {
        // Bypass enabled or no pitch envelope - keep sub at steady frequency
        subOsc.frequency.setValueAtTime(Math.max(20, subFreq), now);
      }
      
      const subEnvGain = ctx.createGain();
      subEnvGain.gain.setValueAtTime(EPS, now);
      
      const hp = ctx.createBiquadFilter();
      hp.type = "highpass";
      // Only apply HP filter if filtering is enabled, otherwise set very low (5Hz just to remove DC)
      hp.frequency.setValueAtTime(sub.filterEnabled ? Math.max(10, sub.hpFreq ?? 25) : 5, now);
      hp.Q.setValueAtTime(0.707, now);
      
      const lp = ctx.createBiquadFilter();
      lp.type = "lowpass";
      // Only apply LP filter if filtering is enabled, otherwise set to 20kHz (passthrough)
      lp.frequency.setValueAtTime(sub.filterEnabled ? Math.max(40, sub.filterFreq) : 20000, now);
      lp.Q.setValueAtTime(0.707, now);
      
      const makeSoftClipCurve = (amount01: number, n = 1024) => {
        const a = Math.max(0, Math.min(1, amount01));
        const k = 1 + a * 20;
        const curve = new Float32Array(n);
        for (let i = 0; i < n; i++) {
          const x = (i / (n - 1)) * 2 - 1;
          curve[i] = Math.tanh(k * x) / Math.tanh(k);
        }
        return curve;
      };
      
      const drive = ctx.createWaveShaper();
      drive.curve = makeSoftClipCurve((sub.drive ?? 0) / 100);
      drive.oversample = "2x";
      
      const trim = ctx.createGain();
      trim.gain.setValueAtTime(sub.level / 100, now);
      
      subOsc.connect(subEnvGain).connect(hp).connect(lp).connect(drive).connect(trim).connect(masterGain);
      
      const subAttack = sub.attack / 1000;
      const subDecay = sub.decay / 1000;
      const stopAt = triggerAHD(subEnvGain.gain, now, {
        attack: subAttack,
        hold: 0,
        decay: subDecay
      }, 1.0, { startFromCurrent: false });
      
      subOsc.start(now);
      subOsc.stop(stopAt + 0.03);
      if (sourcesCollector) {
        sourcesCollector.push(subOsc);
      }
    }

    if (params.modal.enabled) {
      const modal = params.modal;
      const modeConfigs = [
        { mode: modal.modes.mode1, key: "mode1", index: 0 },
        { mode: modal.modes.mode2, key: "mode2", index: 1 },
        { mode: modal.modes.mode3, key: "mode3", index: 2 },
        { mode: modal.modes.mode4, key: "mode4", index: 3 },
      ];

      // Generate exciter based on exciterType
      const exciterLevel = modal.impactNoise / 100;
      if (exciterLevel > 0) {
        const exciterDuration = modal.impactDecay / 1000;
        
        if (modal.exciterType === "noise") {
          // White noise burst
          const noiseBuffer = ctx.createBuffer(1, ctx.sampleRate * 0.1, ctx.sampleRate);
          const noiseData = noiseBuffer.getChannelData(0);
          for (let i = 0; i < noiseData.length; i++) {
            noiseData[i] = (seededRandom() * 2 - 1);
          }
          const noiseSource = ctx.createBufferSource();
          noiseSource.buffer = noiseBuffer;
          const noiseGain = ctx.createGain();
          triggerAHD(noiseGain.gain, now, { attack: 0.0005, hold: 0, decay: exciterDuration }, exciterLevel * 0.5, { startFromCurrent: false });
          noiseSource.connect(noiseGain);
          noiseGain.connect(masterGain);
          noiseSource.start(now);
          noiseSource.stop(now + 0.1);
        } else if (modal.exciterType === "impulse") {
          // Sharp impulse click
          const impBuffer = ctx.createBuffer(1, ctx.sampleRate * 0.01, ctx.sampleRate);
          const impData = impBuffer.getChannelData(0);
          for (let i = 0; i < impData.length; i++) {
            impData[i] = Math.exp(-i / (ctx.sampleRate * 0.001)) * (seededRandom() * 2 - 1);
          }
          const impSource = ctx.createBufferSource();
          impSource.buffer = impBuffer;
          const impGain = ctx.createGain();
          impGain.gain.value = exciterLevel;
          impSource.connect(impGain);
          impGain.connect(masterGain);
          impSource.start(now);
          impSource.stop(now + 0.01);
        } else if (modal.exciterType === "mallet") {
          // Soft mallet - filtered noise with slower attack
          const malletBuffer = ctx.createBuffer(1, ctx.sampleRate * 0.05, ctx.sampleRate);
          const malletData = malletBuffer.getChannelData(0);
          for (let i = 0; i < malletData.length; i++) {
            const env = Math.sin(Math.PI * i / malletData.length);
            malletData[i] = env * (seededRandom() * 2 - 1);
          }
          const malletSource = ctx.createBufferSource();
          malletSource.buffer = malletBuffer;
          const malletFilter = ctx.createBiquadFilter();
          malletFilter.type = "lowpass";
          malletFilter.frequency.value = 2000;
          const malletGain = ctx.createGain();
          malletGain.gain.value = exciterLevel * 0.7;
          malletSource.connect(malletFilter);
          malletFilter.connect(malletGain);
          malletGain.connect(masterGain);
          malletSource.start(now);
          malletSource.stop(now + 0.05);
        } else if (modal.exciterType === "pluck") {
          // Pluck - short pitched burst
          const pluckOsc = ctx.createOscillator();
          pluckOsc.type = "sawtooth";
          pluckOsc.frequency.value = modal.basePitch * 2;
          const pluckGain = ctx.createGain();
          triggerAHD(pluckGain.gain, now, { attack: 0.0001, hold: 0, decay: 0.015 }, exciterLevel * 0.4, { startFromCurrent: false });
          pluckOsc.connect(pluckGain);
          pluckGain.connect(masterGain);
          pluckOsc.start(now);
          pluckOsc.stop(now + 0.02);
        }
      }

      // Generate modes (limited by modeCount)
      for (const { mode, index } of modeConfigs) {
        if (index >= modal.modeCount) continue;
        if (mode.level === 0) continue;
        
        const modeOsc = ctx.createOscillator();
        modeOsc.type = "sine";
        
        // Apply inharmonicity - slight detuning that increases with mode number
        const inharmonicityFactor = 1 + (modal.inharmonicity / 100) * 0.02 * (index * index);
        modeOsc.frequency.value = modal.basePitch * mode.ratio * inharmonicityFactor;
        
        const modeGain = ctx.createGain();
        const modeLevel = mode.level / 100;
        triggerAHD(modeGain.gain, now, {
          attack: 0.0005,
          hold: 0,
          decay: mode.decay / 1000
        }, modeLevel * 0.25, { startFromCurrent: false });
        
        modeOsc.connect(modeGain);
        modeGain.connect(masterGain);
        
        modeOsc.start(now);
        modeOsc.stop(now + mode.decay / 1000 + 0.1);
      }
    }

    if (params.additive.enabled) {
      const additive = params.additive;
      const partialKeys = ["p1", "p2", "p3", "p4", "p5", "p6", "p7", "p8"] as const;
      
      partialKeys.forEach((key, i) => {
        // Skip partials beyond partialCount
        if (i >= additive.partialCount) return;
        
        const partial = additive.partials[key];
        if (partial.level === 0) return;
        
        const harmonic = i + 1;
        const partialOsc = ctx.createOscillator();
        partialOsc.type = "sine";
        
        // Apply randomness - random pitch deviation per partial
        const randomCents = (seededRandom() - 0.5) * 2 * (additive.randomness / 100) * 50;
        const spreadCents = (additive.spread / 100) * (harmonic - 1) * 10;
        const baseFreq = additive.basePitch * harmonic;
        const detunedFreq = baseFreq * Math.pow(2, (partial.detune + spreadCents + randomCents) / 1200);
        partialOsc.frequency.value = detunedFreq;
        
        const partialGain = ctx.createGain();
        const baseLevel = partial.level / 100;
        const slopeMultiplier = 1 - (additive.decaySlope / 100) * (harmonic - 1) / 7;
        // Apply level randomness too
        const levelRandom = 1 - (seededRandom() * (additive.randomness / 100) * 0.3);
        const finalLevel = baseLevel * Math.max(0.1, slopeMultiplier) * levelRandom * 0.2;
        
        const ampEnvForPartial = params.envelopes.env3;
        triggerAHD(partialGain.gain, now, {
          attack: ampEnvForPartial.attack / 1000,
          hold: ampEnvForPartial.hold / 1000,
          decay: ampEnvForPartial.decay / 1000
        }, finalLevel, { startFromCurrent: false });
        
        partialOsc.connect(partialGain);
        partialGain.connect(masterGain);
        
        const envDuration = (ampEnvForPartial.attack + ampEnvForPartial.hold + ampEnvForPartial.decay) / 1000 + 0.2;
        partialOsc.start(now);
        partialOsc.stop(now + envDuration);
      });
    }

    if (params.granular.enabled) {
      const granular = params.granular;
      const grainCount = Math.round(granular.density);
      const grainDuration = granular.grainSize / 1000;
      const totalDuration = (params.envelopes.env3.attack + params.envelopes.env3.hold + params.envelopes.env3.decay) / 1000;
      const timeSpread = totalDuration * (granular.scatter / 100);
      
      for (let i = 0; i < grainCount; i++) {
        // Fix 6: Use seeded random for granular timing and pitch
        const grainOffset = (i / grainCount) * totalDuration + (seededRandom() - 0.5) * timeSpread;
        const grainStart = Math.max(0, now + grainOffset);
        
        const pitchVariation = 1 + (seededRandom() - 0.5) * 2 * (granular.pitchSpray / 100);
        const grainPitch = granular.pitch * pitchVariation;
        
        const grainGain = ctx.createGain();
        triggerAHD(grainGain.gain, grainStart, {
          attack: grainDuration * 0.1,
          hold: grainDuration * 0.4,
          decay: grainDuration * 0.5
        }, 0.15, { startFromCurrent: false });
        
        if (granular.texture === "noise") {
          const noiseLength = Math.max(0.01, grainDuration);
          const noiseBuffer = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * noiseLength), ctx.sampleRate);
          const noiseData = noiseBuffer.getChannelData(0);
          for (let j = 0; j < noiseData.length; j++) {
            noiseData[j] = (seededRandom() * 2 - 1) * 0.8; // Fix 6: Use seeded random
          }
          const noiseSource = ctx.createBufferSource();
          noiseSource.buffer = noiseBuffer;
          
          const bandpass = ctx.createBiquadFilter();
          bandpass.type = "bandpass";
          bandpass.frequency.value = grainPitch;
          bandpass.Q.value = 5;
          
          noiseSource.connect(bandpass);
          bandpass.connect(grainGain);
          grainGain.connect(masterGain);
          noiseSource.start(grainStart);
          noiseSource.stop(grainStart + grainDuration);
        } else if (granular.texture === "click") {
          const clickLength = 0.002;
          const clickBuffer = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * clickLength), ctx.sampleRate);
          const clickData = clickBuffer.getChannelData(0);
          for (let j = 0; j < clickData.length; j++) {
            clickData[j] = (j < clickData.length / 2) ? 1 : -1;
          }
          const clickSource = ctx.createBufferSource();
          clickSource.buffer = clickBuffer;
          clickSource.connect(grainGain);
          grainGain.connect(masterGain);
          clickSource.start(grainStart);
        } else {
          const grainOsc = ctx.createOscillator();
          grainOsc.type = granular.texture === "saw" ? "sawtooth" : "sine";
          grainOsc.frequency.value = grainPitch;
          grainOsc.connect(grainGain);
          grainGain.connect(masterGain);
          grainOsc.start(grainStart);
          grainOsc.stop(grainStart + grainDuration);
        }
      }
    }

    const ampEnv = params.envelopes.env3;
    const volume = Math.max(EPS, params.output.volume / 100);

    triggerAHD(masterGain.gain, now, {
      attack: ampEnv.attack / 1000,
      hold: ampEnv.hold / 1000,
      decay: ampEnv.decay / 1000
    }, volume, { startFromCurrent: false });

    return { masterGain, safetyFadeGain };
  }, [createImpulseResponse]);

  const getTotalDuration = useCallback((params: SynthParameters): number => {
    const ampEnv = params.envelopes.env3;
    // Fix 1: Add tail padding for reverb/delay decay
    let baseDuration = ampEnv.attack + ampEnv.hold + ampEnv.decay + (TAIL_PAD * 1000);
    
    if (params.effects.delayEnabled) {
      baseDuration += getEffectiveDelayTime(params) * 3;
    }
    if (params.effects.reverbEnabled || (params.convolver.enabled && params.convolver.useCustomIR)) {
      baseDuration += params.effects.reverbDecay * 1000;
    }
    
    return Math.min(baseDuration, 10000);
  }, []);

  const handleTrigger = useCallback(async () => {
    // Use Tone.js to start audio context (handles user gesture requirement)
    await Tone.start();
    
    // Get the Tone.js-managed audio context
    const ctx = Tone.getContext().rawContext as AudioContext;
    const now = ctx.currentTime;
    
    // Clear previous timeout
    if (playTimeoutRef.current) {
      clearTimeout(playTimeoutRef.current);
      playTimeoutRef.current = null;
    }
    
    // Quickly fade out and stop any active sources to prevent pops/clicks
    if (activeFadeGainRef.current) {
      try {
        stopWithFade(activeFadeGainRef.current.gain, now, 0.003);
      } catch (e) {
        // Ignore if gain node is disconnected
      }
    }
    
    // Stop all active sources after fadeout
    setTimeout(() => {
      for (const source of activeSourcesRef.current) {
        try {
          source.stop();
        } catch (e) {
          // Ignore if already stopped
        }
      }
      activeSourcesRef.current = [];
    }, 5);
    
    setIsPlaying(true);

    const totalDuration = getTotalDuration(params);
    
    // Fix 5 & 6: Use same OfflineAudioContext for preview and export with locked seed
    const seed = Date.now();
    const sampleRate = 44100;
    const durationInSeconds = totalDuration / 1000;
    
    // Fix 5: Render once with OfflineAudioContext (same render for preview and export)
    const buffer = await Tone.Offline(async (offlineCtx) => {
      const rawCtx = offlineCtx.rawContext as OfflineAudioContext;
      await generateSound(rawCtx, params, totalDuration, seed, undefined, oscEnvelopes, convolverSettings);
    }, durationInSeconds);
    
    // Convert Tone.ToneAudioBuffer to AudioBuffer
    const renderedBuffer = buffer.get() as AudioBuffer;
    if (renderedBuffer) {
      // Apply bitcrusher effect (post-process)
      if (params.effects.bitcrusher < 16) {
        applyBitcrusher(renderedBuffer, params.effects.bitcrusher);
      }
      // Apply spectral scrambling (post-process FFT manipulation)
      if (params.spectralScrambler.enabled) {
        applySpectralScrambling(
          renderedBuffer,
          parseInt(params.spectralScrambler.fftSize),
          params.spectralScrambler.scrambleAmount,
          params.spectralScrambler.binShift,
          params.spectralScrambler.freeze,
          params.spectralScrambler.mix,
          params.spectralScrambler.gateThreshold,
          params.spectralScrambler.stretch,
          params.spectralScrambler.binDensity
        );
      }
      // Apply additional safety fadeout to prevent any remaining pops
      applySafetyFadeout(renderedBuffer, 5);
      
      // Store buffer for export and waveform display
      setAudioBuffer(renderedBuffer);
      
      // Fix 5: Play the rendered buffer (preview = export)
      const playbackGain = ctx.createGain();
      playbackGain.gain.value = 1.0;
      
      const bufferSource = ctx.createBufferSource();
      bufferSource.buffer = renderedBuffer;
      bufferSource.connect(playbackGain);
      playbackGain.connect(ctx.destination);
      bufferSource.start(now + 0.003); // Small delay for fadeout of previous sound
      
      // Track for retrigger handling
      activeSourcesRef.current.push(bufferSource);
      activeFadeGainRef.current = playbackGain;
    }

    playTimeoutRef.current = setTimeout(() => {
      setIsPlaying(false);
      activeSourcesRef.current = [];
      activeFadeGainRef.current = null;
    }, totalDuration);
  }, [params, generateSound, applyBitcrusher, applySpectralScrambling, applySafetyFadeout, getTotalDuration]);

  const handleExport = useCallback(async () => {
    if (!audioBuffer) {
      console.error("No audio to export - trigger a sound first");
      return;
    }
    
    setIsExporting(true);

    try {
      const targetSampleRate = parseInt(exportSettings.sampleRate);
      const channels = exportSettings.channels === "stereo" ? 2 : 1;
      const tailExtension = exportSettings.tailExtension;
      
      // Use the cached preview buffer (what you hear is what you export)
      // Create a copy with optional tail extension (silence for decay padding)
      const tailSamples = Math.floor((tailExtension / 1000) * audioBuffer.sampleRate);
      const totalSamples = audioBuffer.length + tailSamples;
      
      // Create a new buffer with the audio data plus tail extension
      const workingCtx = new OfflineAudioContext(
        audioBuffer.numberOfChannels,
        totalSamples,
        audioBuffer.sampleRate
      );
      const workingBuffer = workingCtx.createBuffer(
        audioBuffer.numberOfChannels,
        totalSamples,
        audioBuffer.sampleRate
      );
      
      // Copy audio data from cached buffer
      for (let ch = 0; ch < audioBuffer.numberOfChannels; ch++) {
        const sourceData = audioBuffer.getChannelData(ch);
        const destData = workingBuffer.getChannelData(ch);
        destData.set(sourceData, 0);
        // Tail extension is already zero-filled
      }

      // Handle sample rate conversion if needed
      let finalBuffer: AudioBuffer = workingBuffer;
      if (targetSampleRate !== workingBuffer.sampleRate) {
        const resampleCtx = new OfflineAudioContext(
          workingBuffer.numberOfChannels,
          Math.ceil(workingBuffer.length * targetSampleRate / workingBuffer.sampleRate),
          targetSampleRate
        );
        const bufferSource = resampleCtx.createBufferSource();
        bufferSource.buffer = workingBuffer;
        bufferSource.connect(resampleCtx.destination);
        bufferSource.start();
        finalBuffer = await resampleCtx.startRendering();
      }
      
      // Handle mono conversion
      if (channels === 1 && finalBuffer.numberOfChannels > 1) {
        const monoBuffer = new OfflineAudioContext(1, finalBuffer.length, finalBuffer.sampleRate)
          .createBuffer(1, finalBuffer.length, finalBuffer.sampleRate);
        const monoData = monoBuffer.getChannelData(0);
        for (let i = 0; i < finalBuffer.length; i++) {
          let sum = 0;
          for (let ch = 0; ch < finalBuffer.numberOfChannels; ch++) {
            sum += finalBuffer.getChannelData(ch)[i];
          }
          monoData[i] = sum / finalBuffer.numberOfChannels;
        }
        finalBuffer = monoBuffer;
      }
      
      // Check for peaks exceeding 0dB (clipping territory)
      let peakValue = 0;
      for (let channel = 0; channel < finalBuffer.numberOfChannels; channel++) {
        const data = finalBuffer.getChannelData(channel);
        for (let i = 0; i < data.length; i++) {
          peakValue = Math.max(peakValue, Math.abs(data[i]));
        }
      }
      
      // Always normalize if peaks exceed 1.0 (would clip in WAV) or if requested
      const needsNormalization = peakValue > 1.0 || exportSettings.normalize;
      if (needsNormalization && peakValue > 0) {
        const targetPeak = 0.95;
        const normalizeRatio = targetPeak / peakValue;
        for (let channel = 0; channel < finalBuffer.numberOfChannels; channel++) {
          const data = finalBuffer.getChannelData(channel);
          for (let i = 0; i < data.length; i++) {
            data[i] *= normalizeRatio;
          }
        }
      }
      
      // Apply safety fadeout AFTER all processing to guarantee zero endpoint
      applySafetyFadeout(finalBuffer, 5);

      let blob: Blob;
      let filename: string;
      
      if (exportSettings.format === "mp3") {
        blob = await audioBufferToMp3(finalBuffer);
        filename = `oneshot-${Date.now()}.mp3`;
      } else {
        blob = audioBufferToWav(finalBuffer);
        filename = `oneshot-${Date.now()}.wav`;
      }
      
      const url = URL.createObjectURL(blob);
      
      setExportResult(prev => {
        if (prev?.url) URL.revokeObjectURL(prev.url);
        return { blob, url, filename };
      });
      
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || 
        (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
      
      if (!isIOS) {
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        a.click();
      }
    } catch (err) {
      console.error("Export failed:", err);
    } finally {
      setIsExporting(false);
    }
  }, [audioBuffer, exportSettings, applySafetyFadeout]);

  const clearExportResult = useCallback(() => {
    if (exportResult?.url) {
      URL.revokeObjectURL(exportResult.url);
    }
    setExportResult(null);
  }, [exportResult]);

  useEffect(() => {
    return () => {
      if (exportResult?.url) {
        URL.revokeObjectURL(exportResult.url);
      }
    };
  }, [exportResult]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space" && !e.repeat) {
        e.preventDefault();
        handleTrigger();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleTrigger]);

  return (
    <div className="h-screen bg-background p-2 overflow-hidden flex flex-col">
      <div className="max-w-5xl mx-auto w-full flex flex-col flex-1 min-h-0">
        {/* Header with trigger and controls */}
        <div className="flex flex-col gap-2 mb-3 shrink-0">
          {/* Controls row */}
          <div className="flex items-center gap-3">
            <TriggerButton onTrigger={handleTrigger} isPlaying={isPlaying} size="md" />
            {/* Waveform inline on desktop */}
            <WaveformDisplay3D 
              audioBuffer={audioBuffer} 
              isPlaying={isPlaying}
              className="h-14 flex-1 min-w-0 hidden md:block"
            />
            <RandomizeControls
              currentParams={params}
              onRandomize={setParams}
              oscEnvelopes={oscEnvelopes}
              onOscEnvelopesRandomize={setOscEnvelopes}
              convolverSettings={convolverSettings}
              onConvolverSettingsRandomize={setConvolverSettings}
            />
          </div>
          {/* Waveform full-width on mobile only */}
          <WaveformDisplay3D 
            audioBuffer={audioBuffer} 
            isPlaying={isPlaying}
            className="h-16 w-full md:hidden"
          />
        </div>

        {/* Main tabbed interface */}
        <Tabs defaultValue="sound" className="flex-1 min-h-0 flex flex-col">
          <TabsList className="w-full h-8 grid grid-cols-5 mb-2 bg-card border border-border" data-testid="main-tabs">
            <TabsTrigger value="sound" className="text-xs" data-testid="tab-sound">Sound</TabsTrigger>
            <TabsTrigger value="layers" className="text-xs" data-testid="tab-layers">Layers</TabsTrigger>
            <TabsTrigger value="fx" className="text-xs" data-testid="tab-fx">FX</TabsTrigger>
            <TabsTrigger value="master" className="text-xs" data-testid="tab-master">Master</TabsTrigger>
            <TabsTrigger value="export" className="text-xs" data-testid="tab-export">Export</TabsTrigger>
          </TabsList>

          {/* Sound Tab: Oscillators, Envelopes, Filter */}
          <TabsContent value="sound" className="flex-1 overflow-y-auto mt-0">
            <div className="space-y-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {/* Oscillators sub-tabs */}
                <Tabs defaultValue="osc1" className="w-full">
                  <TabsList className="w-full h-7 grid grid-cols-3 bg-muted/50" data-testid="osc-tabs">
                    <TabsTrigger value="osc1" className="text-[10px]" data-testid="tab-osc1">OSC 1</TabsTrigger>
                    <TabsTrigger value="osc2" className="text-[10px]" data-testid="tab-osc2">OSC 2</TabsTrigger>
                    <TabsTrigger value="osc3" className="text-[10px]" data-testid="tab-osc3">OSC 3</TabsTrigger>
                  </TabsList>
                  <TabsContent value="osc1" className="mt-1">
                    <OscillatorPanel
                      oscillator={params.oscillators.osc1}
                      onChange={(osc) => setParams({ ...params, oscillators: { ...params.oscillators, osc1: osc } })}
                      title="OSC 1"
                      index={1}
                      envelope={oscEnvelopes.osc1}
                      onEnvelopeChange={(env) => setOscEnvelopes({ ...oscEnvelopes, osc1: env })}
                    />
                  </TabsContent>
                  <TabsContent value="osc2" className="mt-1">
                    <OscillatorPanel
                      oscillator={params.oscillators.osc2}
                      onChange={(osc) => setParams({ ...params, oscillators: { ...params.oscillators, osc2: osc } })}
                      title="OSC 2"
                      index={2}
                      envelope={oscEnvelopes.osc2}
                      onEnvelopeChange={(env) => setOscEnvelopes({ ...oscEnvelopes, osc2: env })}
                    />
                  </TabsContent>
                  <TabsContent value="osc3" className="mt-1">
                    <OscillatorPanel
                      oscillator={params.oscillators.osc3}
                      onChange={(osc) => setParams({ ...params, oscillators: { ...params.oscillators, osc3: osc } })}
                      title="OSC 3"
                      index={3}
                      envelope={oscEnvelopes.osc3}
                      onEnvelopeChange={(env) => setOscEnvelopes({ ...oscEnvelopes, osc3: env })}
                    />
                  </TabsContent>
                </Tabs>

                {/* Envelopes sub-tabs */}
                <Tabs defaultValue="amp" className="w-full">
                  <TabsList className="w-full h-7 grid grid-cols-3 bg-muted/50" data-testid="env-tabs">
                    <TabsTrigger value="amp" className="text-[10px]" data-testid="tab-amp-env">Amp</TabsTrigger>
                    <TabsTrigger value="filter" className="text-[10px]" data-testid="tab-filter-env">Filter</TabsTrigger>
                    <TabsTrigger value="pitch" className="text-[10px]" data-testid="tab-pitch-env">Pitch</TabsTrigger>
                  </TabsList>
                  <TabsContent value="amp" className="mt-1">
                    <EnvelopePanel
                      envelope={params.envelopes.env3}
                      onChange={(env) => setParams({ ...params, envelopes: { ...params.envelopes, env3: env } })}
                      type="amp"
                    />
                  </TabsContent>
                  <TabsContent value="filter" className="mt-1">
                    <EnvelopePanel
                      envelope={params.envelopes.env1}
                      onChange={(env) => setParams({ ...params, envelopes: { ...params.envelopes, env1: env } })}
                      type="filter"
                    />
                  </TabsContent>
                  <TabsContent value="pitch" className="mt-1">
                    <EnvelopePanel
                      envelope={params.envelopes.env2}
                      onChange={(env) => setParams({ ...params, envelopes: { ...params.envelopes, env2: env } })}
                      type="pitch"
                    />
                  </TabsContent>
                </Tabs>
              </div>

              {/* Filter */}
              <FilterPanel
                filter={params.filter}
                onChange={(filter) => setParams({ ...params, filter })}
              />

              {/* Modulator Rack */}
              <ModulatorRack
                modulators={params.modulators}
                routes={params.modulationRoutes}
                tempo={params.tempo}
                onUpdateModulators={(modulators) => setParams(prev => ({ ...prev, modulators }))}
                onUpdateRoutes={(modulationRoutes) => setParams(prev => ({ ...prev, modulationRoutes }))}
              />
            </div>
          </TabsContent>

          {/* Layers Tab: Click, Sub, Synth Engines */}
          <TabsContent value="layers" className="flex-1 overflow-y-auto mt-0">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <ClickLayerPanel
                clickLayer={params.clickLayer}
                onChange={(clickLayer) => setParams({ ...params, clickLayer })}
              />
              <SubOscillatorPanel
                subOsc={params.subOsc}
                onChange={(subOsc) => setParams({ ...params, subOsc })}
              />
              <div className="md:col-span-2">
                <SynthEngineSelector
                  modal={params.modal}
                  additive={params.additive}
                  granular={params.granular}
                  onModalChange={(modal) => setParams({ ...params, modal })}
                  onAdditiveChange={(additive) => setParams({ ...params, additive })}
                  onGranularChange={(granular) => setParams({ ...params, granular })}
                />
              </div>
            </div>
          </TabsContent>

          {/* FX Tab: Effects, Saturation, Waveshaper, Convolver */}
          <TabsContent value="fx" className="flex-1 overflow-y-auto mt-0">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <EffectsPanel
                effects={params.effects}
                onChange={(effects) => setParams({ ...params, effects })}
              />
              <SaturationChainPanel
                saturation={params.saturationChain}
                onChange={(saturationChain) => setParams({ ...params, saturationChain })}
              />
              <WaveshaperPanel
                waveshaper={params.waveshaper}
                onChange={(waveshaper) => setParams({ ...params, waveshaper })}
              />
              <ConvolverPanel
                convolver={params.convolver}
                onChange={(convolver) => setParams({ ...params, convolver })}
                onIRLoaded={handleIRLoaded}
                settings={convolverSettings}
                onSettingsChange={setConvolverSettings}
              />
              <SpectralScramblerPanel
                spectralScrambler={params.spectralScrambler}
                onChange={(update) => setParams({ ...params, spectralScrambler: { ...params.spectralScrambler, ...update } })}
              />
            </div>
          </TabsContent>

          {/* Master Tab: Mastering, Output, Tempo */}
          <TabsContent value="master" className="flex-1 overflow-y-auto mt-0">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <CollapsiblePanel
                title="Tempo"
                icon={<Clock className="w-3 h-3 text-primary" />}
                defaultOpen={true}
                data-testid="panel-tempo"
              >
                <div className="flex justify-center">
                  <Knob
                    value={params.tempo}
                    min={20}
                    max={300}
                    step={1}
                    label="BPM"
                    onChange={(v) => setParams({ ...params, tempo: v })}
                    size="sm"
                    accentColor="primary"
                    data-testid="knob-tempo"
                  />
                </div>
              </CollapsiblePanel>
              <MasteringPanel
                mastering={params.mastering}
                onChange={(mastering) => setParams({ ...params, mastering })}
              />
              <OutputPanel
                output={params.output}
                onChange={(output) => setParams({ ...params, output })}
              />
            </div>
          </TabsContent>

          {/* Export Tab: Presets, Export */}
          <TabsContent value="export" className="flex-1 overflow-y-auto mt-0">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <PresetPanel
                currentParams={params}
                onLoadPreset={setParams}
              />
              <ExportPanel
                settings={exportSettings}
                onChange={setExportSettings}
                onExport={handleExport}
                isExporting={isExporting}
                exportResult={exportResult}
                onClearResult={clearExportResult}
              />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function audioBufferToWav(buffer: AudioBuffer): Blob {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const format = 1;
  const bitDepth = 16;

  const bytesPerSample = bitDepth / 8;
  const blockAlign = numChannels * bytesPerSample;

  const dataLength = buffer.length * blockAlign;
  const arrayBuffer = new ArrayBuffer(44 + dataLength);
  const view = new DataView(arrayBuffer);

  function writeString(offset: number, str: string) {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  }

  writeString(0, "RIFF");
  view.setUint32(4, 36 + dataLength, true);
  writeString(8, "WAVE");
  writeString(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, format, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitDepth, true);
  writeString(36, "data");
  view.setUint32(40, dataLength, true);

  const channels: Float32Array[] = [];
  for (let i = 0; i < numChannels; i++) {
    channels.push(buffer.getChannelData(i));
  }

  let offset = 44;
  for (let i = 0; i < buffer.length; i++) {
    for (let channel = 0; channel < numChannels; channel++) {
      const sample = Math.max(-1, Math.min(1, channels[channel][i]));
      const intSample = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
      view.setInt16(offset, intSample, true);
      offset += 2;
    }
  }

  return new Blob([arrayBuffer], { type: "audio/wav" });
}

async function audioBufferToMp3(buffer: AudioBuffer): Promise<Blob> {
  // Dynamically load lamejs from lame.all.js bundled version
  // @ts-ignore
  if (!window.lamejs) {
    await new Promise<void>((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/lamejs@1.2.1/lame.all.js';
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Failed to load lamejs'));
      document.head.appendChild(script);
    });
  }
  
  // @ts-ignore
  const lamejs = window.lamejs;
  
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const kbps = 192; // High quality MP3
  
  // Convert Float32Array samples to Int16Array for lamejs
  const floatToInt16 = (data: Float32Array): Int16Array => {
    const int16 = new Int16Array(data.length);
    for (let i = 0; i < data.length; i++) {
      const sample = Math.max(-1, Math.min(1, data[i]));
      int16[i] = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
    }
    return int16;
  };
  
  const mp3Data: Int8Array[] = [];
  
  if (numChannels === 1) {
    // Mono encoding
    const mp3encoder = new lamejs.Mp3Encoder(1, sampleRate, kbps);
    const samples = floatToInt16(buffer.getChannelData(0));
    const blockSize = 1152;
    
    for (let i = 0; i < samples.length; i += blockSize) {
      const sampleChunk = samples.subarray(i, Math.min(i + blockSize, samples.length));
      const mp3buf = mp3encoder.encodeBuffer(sampleChunk);
      if (mp3buf.length > 0) {
        mp3Data.push(mp3buf);
      }
    }
    
    const mp3buf = mp3encoder.flush();
    if (mp3buf.length > 0) {
      mp3Data.push(mp3buf);
    }
  } else {
    // Stereo encoding
    const mp3encoder = new lamejs.Mp3Encoder(2, sampleRate, kbps);
    const leftSamples = floatToInt16(buffer.getChannelData(0));
    const rightSamples = floatToInt16(buffer.getChannelData(1));
    const blockSize = 1152;
    
    for (let i = 0; i < leftSamples.length; i += blockSize) {
      const leftChunk = leftSamples.subarray(i, Math.min(i + blockSize, leftSamples.length));
      const rightChunk = rightSamples.subarray(i, Math.min(i + blockSize, rightSamples.length));
      const mp3buf = mp3encoder.encodeBuffer(leftChunk, rightChunk);
      if (mp3buf.length > 0) {
        mp3Data.push(mp3buf);
      }
    }
    
    const mp3buf = mp3encoder.flush();
    if (mp3buf.length > 0) {
      mp3Data.push(mp3buf);
    }
  }
  
  return new Blob(mp3Data, { type: "audio/mp3" });
}
