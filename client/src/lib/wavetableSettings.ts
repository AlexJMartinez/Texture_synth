// Wavetable synthesis settings and types

// Wavetable frame - single cycle waveform (256 or 2048 samples)
export type WavetableFrameSize = 256 | 512 | 1024 | 2048;

// Single wavetable containing multiple frames for morphing
export interface WavetableData {
  id: string;
  name: string;
  category: WavetableCategory;
  frameSize: WavetableFrameSize;
  frameCount: number;
  frames: Float32Array[]; // Array of single-cycle waveforms
  isFactory: boolean; // Built-in vs user-created
  createdAt?: number;
}

// Wavetable categories for organization
export type WavetableCategory = 
  | "basic"      // Sine, saw, square morphs
  | "analog"     // Classic synth shapes
  | "digital"    // PWM, sync, hard sounds
  | "vocal"      // Formant, voice-like
  | "organic"    // Natural, evolving
  | "harsh"      // Aggressive, distorted
  | "fx"         // Special effects
  | "user";      // User-created wavetables

// Per-oscillator wavetable settings
export interface OscWavetableSettings {
  enabled: boolean;           // Use wavetable instead of basic waveform
  wavetableId: string;        // ID of selected wavetable
  position: number;           // 0-100, frame position (morphs between frames)
  positionModDepth: number;   // -100 to 100, envelope modulation depth
  interpolation: WavetableInterpolation;
  unison: number;             // 1-8 voices
  unisonDetune: number;       // 0-100 cents spread
  unisonBlend: number;        // 0-100, stereo spread
}

// Interpolation modes between frames
export type WavetableInterpolation = "none" | "linear" | "cubic";

// Default wavetable settings per oscillator
export const defaultOscWavetableSettings: OscWavetableSettings = {
  enabled: false,
  wavetableId: "basic-sine-to-saw",
  position: 0,
  positionModDepth: 0,
  interpolation: "linear",
  unison: 1,
  unisonDetune: 15,
  unisonBlend: 50,
};

// All oscillators' wavetable settings
export interface AllOscWavetableSettings {
  osc1: OscWavetableSettings;
  osc2: OscWavetableSettings;
  osc3: OscWavetableSettings;
}

export const defaultAllOscWavetableSettings: AllOscWavetableSettings = {
  osc1: { ...defaultOscWavetableSettings },
  osc2: { ...defaultOscWavetableSettings },
  osc3: { ...defaultOscWavetableSettings },
};

// LocalStorage keys
const WAVETABLE_SETTINGS_KEY = "synth-wavetable-settings";
const USER_WAVETABLES_KEY = "synth-user-wavetables";

// Persistence functions
export function loadWavetableSettings(): AllOscWavetableSettings {
  try {
    const stored = localStorage.getItem(WAVETABLE_SETTINGS_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return {
        osc1: { ...defaultOscWavetableSettings, ...parsed.osc1 },
        osc2: { ...defaultOscWavetableSettings, ...parsed.osc2 },
        osc3: { ...defaultOscWavetableSettings, ...parsed.osc3 },
      };
    }
  } catch {
    // Fall through to default
  }
  return { ...defaultAllOscWavetableSettings };
}

export function saveWavetableSettings(settings: AllOscWavetableSettings): void {
  localStorage.setItem(WAVETABLE_SETTINGS_KEY, JSON.stringify(settings));
}

// User wavetables storage (metadata only - actual frame data stored separately)
export interface StoredWavetableMetadata {
  id: string;
  name: string;
  category: WavetableCategory;
  frameSize: WavetableFrameSize;
  frameCount: number;
  createdAt: number;
}

// Load user wavetable list (metadata)
export function loadUserWavetableList(): StoredWavetableMetadata[] {
  try {
    const stored = localStorage.getItem(USER_WAVETABLES_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch {
    // Fall through
  }
  return [];
}

// Save user wavetable metadata
export function saveUserWavetableMetadata(wavetables: StoredWavetableMetadata[]): void {
  localStorage.setItem(USER_WAVETABLES_KEY, JSON.stringify(wavetables));
}

// Store individual wavetable frame data (separate key per wavetable to avoid size limits)
export function saveWavetableFrames(id: string, frames: Float32Array[]): void {
  const serialized = frames.map(frame => Array.from(frame));
  localStorage.setItem(`synth-wt-frames-${id}`, JSON.stringify(serialized));
}

// Load wavetable frame data
export function loadWavetableFrames(id: string): Float32Array[] | null {
  try {
    const stored = localStorage.getItem(`synth-wt-frames-${id}`);
    if (stored) {
      const parsed = JSON.parse(stored);
      return parsed.map((arr: number[]) => new Float32Array(arr));
    }
  } catch {
    // Fall through
  }
  return null;
}

// Delete user wavetable
export function deleteUserWavetable(id: string): void {
  localStorage.removeItem(`synth-wt-frames-${id}`);
  const list = loadUserWavetableList();
  const filtered = list.filter(wt => wt.id !== id);
  saveUserWavetableMetadata(filtered);
}

// Generate PeriodicWave from wavetable frame (for Web Audio API)
export function frameToPeriodicWave(
  audioContext: AudioContext | OfflineAudioContext,
  frame: Float32Array,
  normalize: boolean = true
): PeriodicWave {
  const fftSize = frame.length;
  
  // Remove DC offset from the time-domain frame to keep harmonic analysis stable
  let mean = 0;
  for (let i = 0; i < fftSize; i++) mean += frame[i];
  mean /= fftSize;
  
  const real = new Float32Array(fftSize);
  const imag = new Float32Array(fftSize);
  
  // Perform FFT to get harmonics
  for (let k = 0; k < fftSize / 2; k++) {
    let realSum = 0;
    let imagSum = 0;
    for (let n = 0; n < fftSize; n++) {
      const angle = (2 * Math.PI * k * n) / fftSize;
      const x = frame[n] - mean;
      realSum += x * Math.cos(angle);
      imagSum -= x * Math.sin(angle);
    }
    if (k === 0) {
      // DC component (we remove it below)
      real[k] = realSum / fftSize;
      imag[k] = imagSum / fftSize;
    } else {
      // Harmonic coefficients: scale by 2/N for k>0
      real[k] = (2 * realSum) / fftSize;
      imag[k] = (2 * imagSum) / fftSize;
    }
  }
  
  // DC offset removal
  real[0] = 0;
  imag[0] = 0;
  
  return audioContext.createPeriodicWave(real, imag, { disableNormalization: !normalize });
}

// Interpolate between two frames
export function interpolateFrames(
  frame1: Float32Array,
  frame2: Float32Array,
  t: number, // 0-1 blend factor
  mode: WavetableInterpolation = "linear"
): Float32Array {
  const size = frame1.length;
  const result = new Float32Array(size);
  
  if (mode === "none") {
    // No interpolation - snap to nearest
    const src = t < 0.5 ? frame1 : frame2;
    for (let i = 0; i < size; i++) {
      result[i] = src[i];
    }
  } else if (mode === "linear") {
    // Linear interpolation
    for (let i = 0; i < size; i++) {
      result[i] = frame1[i] * (1 - t) + frame2[i] * t;
    }
  } else if (mode === "cubic") {
    // Cubic interpolation (smoother)
    const smoothT = t * t * (3 - 2 * t); // Smoothstep
    for (let i = 0; i < size; i++) {
      result[i] = frame1[i] * (1 - smoothT) + frame2[i] * smoothT;
    }
  }
  
  return result;
}

// Get interpolated frame at position (0-100)
export function getFrameAtPosition(
  wavetable: WavetableData,
  position: number,
  interpolation: WavetableInterpolation = "linear"
): Float32Array {
  const normalizedPos = Math.max(0, Math.min(100, position)) / 100;
  const floatIndex = normalizedPos * (wavetable.frameCount - 1);
  const lowIndex = Math.floor(floatIndex);
  const highIndex = Math.min(lowIndex + 1, wavetable.frameCount - 1);
  const blend = floatIndex - lowIndex;
  
  if (lowIndex === highIndex || interpolation === "none") {
    return wavetable.frames[lowIndex];
  }
  
  return interpolateFrames(
    wavetable.frames[lowIndex],
    wavetable.frames[highIndex],
    blend,
    interpolation
  );
}

// Generate basic waveform as single frame
export function generateBasicFrame(
  type: "sine" | "triangle" | "sawtooth" | "square" | "pulse",
  size: WavetableFrameSize = 2048,
  pulseWidth: number = 0.5
): Float32Array {
  const frame = new Float32Array(size);
  
  for (let i = 0; i < size; i++) {
    const phase = i / size;
    
    switch (type) {
      case "sine":
        frame[i] = Math.sin(2 * Math.PI * phase);
        break;
      case "triangle":
        frame[i] = 4 * Math.abs(phase - 0.5) - 1;
        break;
      case "sawtooth":
        frame[i] = 2 * phase - 1;
        break;
      case "square":
        frame[i] = phase < 0.5 ? 1 : -1;
        break;
      case "pulse":
        frame[i] = phase < pulseWidth ? 1 : -1;
        break;
    }
  }
  
  return frame;
}

// Create wavetable from basic morph (e.g., sine to saw)
export function createMorphWavetable(
  id: string,
  name: string,
  startType: "sine" | "triangle" | "sawtooth" | "square",
  endType: "sine" | "triangle" | "sawtooth" | "square",
  frameCount: number = 64,
  frameSize: WavetableFrameSize = 2048
): WavetableData {
  const startFrame = generateBasicFrame(startType, frameSize);
  const endFrame = generateBasicFrame(endType, frameSize);
  
  const frames: Float32Array[] = [];
  for (let i = 0; i < frameCount; i++) {
    const t = i / (frameCount - 1);
    frames.push(interpolateFrames(startFrame, endFrame, t, "linear"));
  }
  
  return {
    id,
    name,
    category: "basic",
    frameSize,
    frameCount,
    frames,
    isFactory: true,
  };
}

// Create PWM (pulse width modulation) wavetable
export function createPWMWavetable(
  frameCount: number = 64,
  frameSize: WavetableFrameSize = 2048
): WavetableData {
  const frames: Float32Array[] = [];
  
  for (let i = 0; i < frameCount; i++) {
    const pulseWidth = 0.05 + (i / (frameCount - 1)) * 0.9; // 5% to 95%
    frames.push(generateBasicFrame("pulse", frameSize, pulseWidth));
  }
  
  return {
    id: "factory-pwm",
    name: "PWM Sweep",
    category: "digital",
    frameSize,
    frameCount,
    frames,
    isFactory: true,
  };
}

// Randomize wavetable settings
export function randomizeWavetableSettings(chaosLevel: number = 50): Partial<OscWavetableSettings> {
  const chaos = chaosLevel / 100;
  const interpolations: WavetableInterpolation[] = ["none", "linear", "cubic"];
  
  return {
    position: Math.floor(Math.random() * 100),
    positionModDepth: Math.floor(-50 + Math.random() * 100) * chaos,
    interpolation: interpolations[Math.floor(Math.random() * 3)],
    unison: Math.random() > 0.6 ? Math.floor(1 + Math.random() * 4) : 1,
    unisonDetune: Math.floor(5 + Math.random() * 40),
    unisonBlend: Math.floor(30 + Math.random() * 50),
  };
}

// Category display names
export const wavetableCategoryNames: Record<WavetableCategory, string> = {
  basic: "Basic",
  analog: "Analog",
  digital: "Digital",
  vocal: "Vocal",
  organic: "Organic",
  harsh: "Harsh",
  fx: "FX",
  user: "User",
};
