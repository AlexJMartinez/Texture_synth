// Granular Synthesis Engine Settings
// Two modes: Cinematic (guardrails) and Design (full range)

export type GranularMode = 'cinematic' | 'design';
export type WindowType = 'hann' | 'gauss' | 'blackman' | 'rect';
export type PitchMode = 'semitones' | 'cents' | 'ratio';
export type OverlapPolicy = 'auto' | 'manual';

// Sample buffer state
export interface GranularSampleBuffer {
  data: Float32Array | null;
  sampleRate: number;
  duration: number;
  name: string;
  channels: 1 | 2;
}

// Core granular settings
export interface GranularSettings {
  enabled: boolean;
  mode: GranularMode;
  
  // Timing + density
  grainSizeMs: number;           // 1-80ms (cinematic: 6-45ms)
  densityGps: number;            // Grains per second: 10-400 (cinematic: 30-120)
  maxVoices: number;             // Hard cap: 8-64
  overlapPolicy: OverlapPolicy;  // auto ties density↔size
  
  // Position / scan
  scanStart: number;             // 0-1 normalized buffer position
  scanWidth: number;             // 0-1 how much of sample to roam
  scanRateHz: number;            // 0-20 (0 = static)
  posJitterMs: number;           // 0-80ms per-grain position jitter
  
  // Pitch / rate
  pitchMode: PitchMode;
  pitchST: number;               // -36 to +36 semitones
  pitchRandST: number;           // 0-24 per-grain pitch randomization
  quantizeST: 'off' | '1' | '12' | 'scale';
  
  // Window / shape
  windowType: WindowType;
  windowSkew: number;            // -1 to +1 (shifts energy front/back)
  grainAmpRandDb: number;        // 0-9 dB per-grain amplitude variance
  
  // Stereo / spread
  panSpread: number;             // 0-1 (cinematic: 0.1-0.5)
  stereoLink: number;            // 0-1 (1 = L/R correlated)
  widthMs: number;               // 0-20ms Haas widening
  
  // Post bus (anti-mud)
  postHPHz: number;              // 100-2000 Hz
  postLPHz: number;              // 4000-16000 Hz
  satDrive: number;              // 0-0.6
  wetMix: number;                // 0-1 blend with dry sample
  
  // Granular layer envelope (AHD)
  envAttack: number;             // 0-500ms
  envHold: number;               // 0-500ms
  envDecay: number;              // 10-2000ms
  
  // RNG seed for determinism
  seed: number;
}

// Cinematic mode defaults (guardrails on)
export const CINEMATIC_DEFAULTS: GranularSettings = {
  enabled: true,
  mode: 'cinematic',
  
  grainSizeMs: 25,
  densityGps: 60,
  maxVoices: 24,
  overlapPolicy: 'auto',
  
  scanStart: 0,
  scanWidth: 0.15,
  scanRateHz: 0.5,
  posJitterMs: 8,
  
  pitchMode: 'semitones',
  pitchST: 0,
  pitchRandST: 3,
  quantizeST: 'off',
  
  windowType: 'hann',
  windowSkew: 0,
  grainAmpRandDb: 2,
  
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
  
  seed: 12345,
};

// Design mode defaults (full range, no guardrails)
export const DESIGN_DEFAULTS: GranularSettings = {
  enabled: true,
  mode: 'design',
  
  grainSizeMs: 15,
  densityGps: 80,
  maxVoices: 48,
  overlapPolicy: 'manual',
  
  scanStart: 0,
  scanWidth: 0.5,
  scanRateHz: 2,
  posJitterMs: 20,
  
  pitchMode: 'semitones',
  pitchST: 0,
  pitchRandST: 7,
  quantizeST: 'off',
  
  windowType: 'hann',
  windowSkew: 0,
  grainAmpRandDb: 4,
  
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
  
  seed: 12345,
};

// Parameter ranges for each mode
export const CINEMATIC_RANGES = {
  grainSizeMs: { min: 6, max: 45 },
  densityGps: { min: 30, max: 120 },
  maxVoices: { min: 8, max: 32 },
  scanWidth: { min: 0.02, max: 0.25 },
  scanRateHz: { min: 0, max: 2 },
  posJitterMs: { min: 0, max: 15 },
  pitchST: { min: -12, max: 12 },
  pitchRandST: { min: 0, max: 7 },
  panSpread: { min: 0.1, max: 0.5 },
  stereoLink: { min: 0.7, max: 1.0 },
  widthMs: { min: 0, max: 8 },
  postHPHz: { min: 500, max: 1200 },
  postLPHz: { min: 8000, max: 14000 },
  satDrive: { min: 0, max: 0.2 },
  wetMix: { min: 0.15, max: 0.6 },
};

export const DESIGN_RANGES = {
  grainSizeMs: { min: 1, max: 80 },
  densityGps: { min: 10, max: 400 },
  maxVoices: { min: 8, max: 64 },
  scanWidth: { min: 0, max: 1 },
  scanRateHz: { min: 0, max: 20 },
  posJitterMs: { min: 0, max: 80 },
  pitchST: { min: -36, max: 36 },
  pitchRandST: { min: 0, max: 24 },
  panSpread: { min: 0, max: 1 },
  stereoLink: { min: 0, max: 1 },
  widthMs: { min: 0, max: 20 },
  postHPHz: { min: 100, max: 2000 },
  postLPHz: { min: 4000, max: 16000 },
  satDrive: { min: 0, max: 0.6 },
  wetMix: { min: 0, max: 1 },
};

// Get ranges based on current mode
export function getRanges(mode: GranularMode) {
  return mode === 'cinematic' ? CINEMATIC_RANGES : DESIGN_RANGES;
}

// Clamp settings to mode-appropriate ranges
export function clampToMode(settings: GranularSettings): GranularSettings {
  const ranges = getRanges(settings.mode);
  
  return {
    ...settings,
    grainSizeMs: Math.max(ranges.grainSizeMs.min, Math.min(ranges.grainSizeMs.max, settings.grainSizeMs)),
    densityGps: Math.max(ranges.densityGps.min, Math.min(ranges.densityGps.max, settings.densityGps)),
    maxVoices: Math.max(ranges.maxVoices.min, Math.min(ranges.maxVoices.max, settings.maxVoices)),
    scanWidth: Math.max(ranges.scanWidth.min, Math.min(ranges.scanWidth.max, settings.scanWidth)),
    scanRateHz: Math.max(ranges.scanRateHz.min, Math.min(ranges.scanRateHz.max, settings.scanRateHz)),
    posJitterMs: Math.max(ranges.posJitterMs.min, Math.min(ranges.posJitterMs.max, settings.posJitterMs)),
    pitchST: Math.max(ranges.pitchST.min, Math.min(ranges.pitchST.max, settings.pitchST)),
    pitchRandST: Math.max(ranges.pitchRandST.min, Math.min(ranges.pitchRandST.max, settings.pitchRandST)),
    panSpread: Math.max(ranges.panSpread.min, Math.min(ranges.panSpread.max, settings.panSpread)),
    stereoLink: Math.max(ranges.stereoLink.min, Math.min(ranges.stereoLink.max, settings.stereoLink)),
    widthMs: Math.max(ranges.widthMs.min, Math.min(ranges.widthMs.max, settings.widthMs)),
    postHPHz: Math.max(ranges.postHPHz.min, Math.min(ranges.postHPHz.max, settings.postHPHz)),
    postLPHz: Math.max(ranges.postLPHz.min, Math.min(ranges.postLPHz.max, settings.postLPHz)),
    satDrive: Math.max(ranges.satDrive.min, Math.min(ranges.satDrive.max, settings.satDrive)),
    wetMix: Math.max(ranges.wetMix.min, Math.min(ranges.wetMix.max, settings.wetMix)),
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
      return { ...CINEMATIC_DEFAULTS, ...parsed };
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
  const uint8 = new Uint8Array(data.buffer);
  let binary = '';
  for (let i = 0; i < uint8.length; i++) {
    binary += String.fromCharCode(uint8[i]);
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
  return new Float32Array(uint8.buffer);
}
