// Granular Synthesis Engine Settings
// Two modes: Cinematic (guardrails) and Design (full range)
// Parameter ranges aligned with industry standards: PhasePlant, Quanta

export type GranularMode = 'cinematic' | 'design';
export type WindowType = 'hann' | 'gauss' | 'blackman' | 'rect' | 'tukey' | 'trapezoid';
export type PitchMode = 'semitones' | 'cents' | 'ratio';
export type OverlapPolicy = 'auto' | 'manual';
export type SpawnMode = 'rate' | 'sync' | 'density';

// Sample buffer state
export interface GranularSampleBuffer {
  data: Float32Array | null;
  sampleRate: number;
  duration: number;
  name: string;
  channels: 1 | 2;
}

// Core granular settings - extended to match PhasePlant/Quanta
export interface GranularSettings {
  enabled: boolean;
  mode: GranularMode;
  
  // Timing + density (Quanta: grain size 1-1000ms, up to 100 grains)
  grainSizeMs: number;           // 1-500ms (cinematic: 6-60ms)
  densityGps: number;            // Grains per second: 1-500 (cinematic: 20-150)
  maxVoices: number;             // Hard cap: 8-128
  overlapPolicy: OverlapPolicy;  // auto ties density↔size
  spawnMode: SpawnMode;          // PhasePlant: rate/sync/density modes
  
  // Position / scan
  scanStart: number;             // 0-1 normalized buffer position
  scanWidth: number;             // 0-1 how much of sample to roam
  scanRateHz: number;            // 0-30 (0 = static/freeze)
  posJitterMs: number;           // 0-200ms per-grain position jitter (spray)
  timingJitterMs: number;        // 0-100ms spawn timing randomization
  
  // Pitch / rate (PhasePlant: full pitch control)
  pitchMode: PitchMode;
  pitchST: number;               // -48 to +48 semitones
  pitchRandST: number;           // 0-36 per-grain pitch randomization
  quantizeST: 'off' | '1' | '12' | 'scale';
  
  // Window / shape (Quanta: 10 envelope shapes)
  windowType: WindowType;
  windowSkew: number;            // -1 to +1 (shifts energy front/back)
  sizeJitter: number;            // 0-1 grain size randomization (0 = no jitter)
  grainAmpRandDb: number;        // 0-12 dB per-grain amplitude variance
  
  // Direction / playback (PhasePlant: reverse probability)
  reverseProb: number;           // 0-1 probability grain plays backwards
  
  // Stereo / spread
  panSpread: number;             // 0-1 (cinematic: 0.1-0.5)
  stereoLink: number;            // 0-1 (1 = L/R correlated)
  widthMs: number;               // 0-30ms Haas widening
  
  // Post bus (anti-mud)
  postHPHz: number;              // 20-2000 Hz
  postLPHz: number;              // 2000-20000 Hz
  satDrive: number;              // 0-1
  wetMix: number;                // 0-1 blend with dry sample
  
  // Granular layer envelope (AHD)
  envAttack: number;             // 0-1000ms
  envHold: number;               // 0-1000ms
  envDecay: number;              // 10-5000ms
  
  // Advanced features (PhasePlant)
  phaseAlign: boolean;           // Nudge grain start to be in-phase with fundamental
  warmStart: boolean;            // Grains already running when note strikes
  
  // RNG seed for determinism
  seed: number;
}

// Cinematic mode defaults (guardrails on)
export const CINEMATIC_DEFAULTS: GranularSettings = {
  enabled: true,
  mode: 'cinematic',
  
  grainSizeMs: 25,
  densityGps: 60,
  maxVoices: 32,
  overlapPolicy: 'auto',
  spawnMode: 'density',
  
  scanStart: 0,
  scanWidth: 0.15,
  scanRateHz: 0.5,
  posJitterMs: 8,
  timingJitterMs: 0,
  
  pitchMode: 'semitones',
  pitchST: 0,
  pitchRandST: 3,
  quantizeST: 'off',
  
  windowType: 'hann',
  windowSkew: 0,
  sizeJitter: 0.15,
  grainAmpRandDb: 2,
  
  reverseProb: 0,
  
  panSpread: 0.3,
  stereoLink: 0.85,
  widthMs: 4,
  
  postHPHz: 800,
  postLPHz: 12000,
  satDrive: 0.1,
  wetMix: 0.4,
  
  envAttack: 0,
  envHold: 10,
  envDecay: 300,
  
  phaseAlign: false,
  warmStart: false,
  
  seed: 12345,
};

// Design mode defaults (full range, no guardrails)
export const DESIGN_DEFAULTS: GranularSettings = {
  enabled: true,
  mode: 'design',
  
  grainSizeMs: 15,
  densityGps: 80,
  maxVoices: 64,
  overlapPolicy: 'manual',
  spawnMode: 'density',
  
  scanStart: 0,
  scanWidth: 0.5,
  scanRateHz: 2,
  posJitterMs: 20,
  timingJitterMs: 5,
  
  pitchMode: 'semitones',
  pitchST: 0,
  pitchRandST: 7,
  quantizeST: 'off',
  
  windowType: 'hann',
  windowSkew: 0,
  sizeJitter: 0.25,
  grainAmpRandDb: 4,
  
  reverseProb: 0,
  
  panSpread: 0.6,
  stereoLink: 0.5,
  widthMs: 8,
  
  postHPHz: 400,
  postLPHz: 14000,
  satDrive: 0.2,
  wetMix: 0.6,
  
  envAttack: 0,
  envHold: 5,
  envDecay: 200,
  
  phaseAlign: false,
  warmStart: false,
  
  seed: 12345,
};

// Parameter ranges for each mode (extended to match PhasePlant/Quanta standards)
export const CINEMATIC_RANGES = {
  grainSizeMs: { min: 6, max: 60 },
  densityGps: { min: 20, max: 150 },
  maxVoices: { min: 8, max: 48 },
  scanWidth: { min: 0.02, max: 0.35 },
  scanRateHz: { min: 0, max: 5 },
  posJitterMs: { min: 0, max: 30 },
  timingJitterMs: { min: 0, max: 20 },
  pitchST: { min: -24, max: 24 },
  pitchRandST: { min: 0, max: 12 },
  sizeJitter: { min: 0, max: 0.3 },
  reverseProb: { min: 0, max: 0.3 },
  panSpread: { min: 0.1, max: 0.5 },
  stereoLink: { min: 0.6, max: 1.0 },
  widthMs: { min: 0, max: 12 },
  postHPHz: { min: 200, max: 1500 },
  postLPHz: { min: 6000, max: 16000 },
  satDrive: { min: 0, max: 0.3 },
  wetMix: { min: 0.1, max: 0.7 },
  grainAmpRandDb: { min: 0, max: 6 },
  envAttack: { min: 0, max: 500 },
  envHold: { min: 0, max: 500 },
  envDecay: { min: 10, max: 2000 },
};

function isGranularMode(v: any): v is GranularMode {
  return v === 'cinematic' || v === 'design';
}

// Design mode: full range matching Quanta/PhasePlant industry standards
export const DESIGN_RANGES = {
  grainSizeMs: { min: 1, max: 500 },      // Quanta goes to 1000ms
  densityGps: { min: 1, max: 500 },       // Extended for extreme textures
  maxVoices: { min: 8, max: 128 },        // Quanta: 100 per voice
  scanWidth: { min: 0, max: 1 },
  scanRateHz: { min: 0, max: 30 },        // Extended for fast scanning
  posJitterMs: { min: 0, max: 200 },      // Full spray range
  timingJitterMs: { min: 0, max: 100 },   // Spawn timing randomization
  pitchST: { min: -48, max: 48 },         // 4 octaves each way
  pitchRandST: { min: 0, max: 36 },       // Full pitch random range
  sizeJitter: { min: 0, max: 1 },         // Full grain size randomization
  reverseProb: { min: 0, max: 1 },        // Full reverse probability
  panSpread: { min: 0, max: 1 },
  stereoLink: { min: 0, max: 1 },
  widthMs: { min: 0, max: 30 },           // Extended Haas range
  postHPHz: { min: 20, max: 2000 },       // Full sub to mid
  postLPHz: { min: 2000, max: 20000 },    // Full high frequency
  satDrive: { min: 0, max: 1 },           // Full saturation
  wetMix: { min: 0, max: 1 },
  grainAmpRandDb: { min: 0, max: 12 },    // Extended amplitude variance
  envAttack: { min: 0, max: 1000 },
  envHold: { min: 0, max: 1000 },
  envDecay: { min: 10, max: 5000 },
};

// Get ranges based on current mode
export function getRanges(mode: GranularMode) {
  return mode === 'cinematic' ? CINEMATIC_RANGES : DESIGN_RANGES;
}

// Clamp settings to mode-appropriate ranges
export function clampToMode(settings: GranularSettings): GranularSettings {
  const ranges = getRanges(settings.mode);
  const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));
  
  return {
    ...settings,
    grainSizeMs: clamp(settings.grainSizeMs, ranges.grainSizeMs.min, ranges.grainSizeMs.max),
    densityGps: clamp(settings.densityGps, ranges.densityGps.min, ranges.densityGps.max),
    maxVoices: clamp(settings.maxVoices, ranges.maxVoices.min, ranges.maxVoices.max),
    scanWidth: clamp(settings.scanWidth, ranges.scanWidth.min, ranges.scanWidth.max),
    scanRateHz: clamp(settings.scanRateHz, ranges.scanRateHz.min, ranges.scanRateHz.max),
    posJitterMs: clamp(settings.posJitterMs, ranges.posJitterMs.min, ranges.posJitterMs.max),
    timingJitterMs: clamp(settings.timingJitterMs ?? 0, ranges.timingJitterMs.min, ranges.timingJitterMs.max),
    pitchST: clamp(settings.pitchST, ranges.pitchST.min, ranges.pitchST.max),
    pitchRandST: clamp(settings.pitchRandST, ranges.pitchRandST.min, ranges.pitchRandST.max),
    sizeJitter: clamp(settings.sizeJitter ?? 0.25, ranges.sizeJitter.min, ranges.sizeJitter.max),
    reverseProb: clamp(settings.reverseProb ?? 0, ranges.reverseProb.min, ranges.reverseProb.max),
    panSpread: clamp(settings.panSpread, ranges.panSpread.min, ranges.panSpread.max),
    stereoLink: clamp(settings.stereoLink, ranges.stereoLink.min, ranges.stereoLink.max),
    widthMs: clamp(settings.widthMs, ranges.widthMs.min, ranges.widthMs.max),
    postHPHz: clamp(settings.postHPHz, ranges.postHPHz.min, ranges.postHPHz.max),
    postLPHz: clamp(settings.postLPHz, ranges.postLPHz.min, ranges.postLPHz.max),
    satDrive: clamp(settings.satDrive, ranges.satDrive.min, ranges.satDrive.max),
    wetMix: clamp(settings.wetMix, ranges.wetMix.min, ranges.wetMix.max),
    grainAmpRandDb: clamp(settings.grainAmpRandDb, ranges.grainAmpRandDb.min, ranges.grainAmpRandDb.max),
    envAttack: clamp(settings.envAttack, ranges.envAttack.min, ranges.envAttack.max),
    envHold: clamp(settings.envHold, ranges.envHold.min, ranges.envHold.max),
    envDecay: clamp(settings.envDecay, ranges.envDecay.min, ranges.envDecay.max),
  };
}

// Auto-overlap rule: compute density from grain size
export function autoComputeDensity(grainSizeMs: number, targetOverlap: number = 2.5): number {
  const grainSizeSec = grainSizeMs / 1000;
  return Math.round(targetOverlap / grainSizeSec);
}

// Anti-mud rules (baked into scheduler)
export function applyAntiMudRules(settings: GranularSettings): GranularSettings {
  let result = { ...settings };
  
  // Rule 1: If grainSize < 6ms, cap density at 120 gps
  if (result.grainSizeMs < 6) {
    result.densityGps = Math.min(result.densityGps, 120);
  }
  
  // Rule 2: If pitchRandST > 12, force higher HP
  if (result.pitchRandST > 12) {
    result.postHPHz = Math.max(result.postHPHz, 900);
  }
  
  // Rule 3: If density is high (>200), reduce grain amp variance
  if (result.densityGps > 200) {
    result.grainAmpRandDb = Math.min(result.grainAmpRandDb, 3);
  }
  
  return result;
}

// localStorage persistence
const STORAGE_KEY = 'oneshot-granular-settings';
const BUFFER_STORAGE_KEY = 'oneshot-granular-buffer';

export function saveGranularSettings(settings: GranularSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch (e) {
    console.warn('Failed to save granular settings:', e);
  }
}

export function loadGranularSettings(): GranularSettings {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      const merged: GranularSettings = { ...CINEMATIC_DEFAULTS, ...parsed };

      // Guard against invalid mode coming from storage
      const mode: GranularMode = isGranularMode((merged as any).mode) ? (merged as any).mode : 'cinematic';
      const normalized: GranularSettings = { ...merged, mode };

      // Always restore to a sane, mode-appropriate state
      return applyAntiMudRules(clampToMode(normalized));
    }
  } catch (e) {
    console.warn('Failed to load granular settings:', e);
  }
  return CINEMATIC_DEFAULTS;
}

// Buffer metadata storage (actual audio data handled separately)
export interface GranularBufferMeta {
  name: string;
  duration: number;
  sampleRate: number;
  channels: 1 | 2;
  dataBase64?: string; // For small samples, store inline
}

export function saveGranularBufferMeta(meta: GranularBufferMeta | null): void {
  try {
    if (meta) {
      localStorage.setItem(BUFFER_STORAGE_KEY, JSON.stringify(meta));
    } else {
      localStorage.removeItem(BUFFER_STORAGE_KEY);
    }
  } catch (e) {
    console.warn('Failed to save granular buffer meta:', e);
  }
}

export function loadGranularBufferMeta(): GranularBufferMeta | null {
  try {
    const stored = localStorage.getItem(BUFFER_STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.warn('Failed to load granular buffer meta:', e);
  }
  return null;
}

// Convert Float32Array to base64 for storage
export function float32ToBase64(data: Float32Array): string {
  // Respect views/slices (byteOffset + byteLength), not the entire underlying buffer.
  const uint8 = new Uint8Array(data.buffer, data.byteOffset, data.byteLength);

  // Chunk to avoid call stack / performance issues with large arrays.
  const chunkSize = 0x8000; // 32KB
  let binary = '';
  for (let i = 0; i < uint8.length; i += chunkSize) {
    const chunk = uint8.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }

  return btoa(binary);
}

// Convert base64 back to Float32Array
export function base64ToFloat32(base64: string): Float32Array {
  const binary = atob(base64);
  const uint8 = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    uint8[i] = binary.charCodeAt(i);
  }

  // Float32Array requires a byte length multiple of 4.
  const validLen = uint8.byteLength - (uint8.byteLength % Float32Array.BYTES_PER_ELEMENT);
  if (validLen !== uint8.byteLength) {
    console.warn('base64ToFloat32: decoded byte length is not a multiple of 4; truncating.');
  }

  const buf = uint8.buffer.slice(0, validLen);
  return new Float32Array(buf);
}
