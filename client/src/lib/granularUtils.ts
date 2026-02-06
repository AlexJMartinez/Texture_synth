// Granular Synthesis Utility Functions
// Seeded PRNG, window functions, interpolation, grain scheduling

import type { GranularSettings, WindowType } from './granularSettings';

// ============================================
// SEEDED PSEUDO-RANDOM NUMBER GENERATOR
// Mulberry32 - fast, good distribution, seedable
// ============================================

export class SeededRNG {
  private state: number;
  
  constructor(seed: number) {
    this.state = seed;
  }
  
  // Reset to a new seed
  reset(seed: number): void {
    this.state = seed;
  }
  
  // Get next random value [0, 1)
  next(): number {
    this.state |= 0;
    this.state = (this.state + 0x6D2B79F5) | 0;
    let t = Math.imul(this.state ^ (this.state >>> 15), 1 | this.state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  
  // Random float in range [min, max)
  range(min: number, max: number): number {
    return min + this.next() * (max - min);
  }
  
  // Random integer in range [min, max]
  rangeInt(min: number, max: number): number {
    return Math.floor(this.range(min, max + 1));
  }
  
  // Gaussian-ish distribution (Box-Muller approximation)
  gaussian(mean: number = 0, stdDev: number = 1): number {
    const u1 = this.next();
    const u2 = this.next();
    const z0 = Math.sqrt(-2 * Math.log(u1 || 0.0001)) * Math.cos(2 * Math.PI * u2);
    return z0 * stdDev + mean;
  }
  
  // Pick random element from array
  pick<T>(arr: T[]): T {
    return arr[Math.floor(this.next() * arr.length)];
  }
}

// ============================================
// WINDOW FUNCTIONS
// For grain amplitude shaping
// ============================================

// Hann window (raised cosine) - smooth, no clicks
export function hannWindow(phase: number): number {
  return 0.5 * (1 - Math.cos(2 * Math.PI * phase));
}

// Gaussian window - softer tails
export function gaussWindow(phase: number, sigma: number = 0.4): number {
  const x = phase - 0.5;
  return Math.exp(-0.5 * Math.pow(x / sigma, 2));
}

// Blackman window - steeper rolloff
export function blackmanWindow(phase: number): number {
  const a0 = 0.42;
  const a1 = 0.5;
  const a2 = 0.08;
  return a0 - a1 * Math.cos(2 * Math.PI * phase) + a2 * Math.cos(4 * Math.PI * phase);
}

// Rectangular window - clicks/glitch (design mode)
export function rectWindow(phase: number): number {
  return 1.0;
}

// Tukey window (tapered cosine) - flat center with smooth edges
export function tukeyWindow(phase: number, alpha: number = 0.5): number {
  if (phase < alpha / 2) {
    return 0.5 * (1 + Math.cos(Math.PI * (2 * phase / alpha - 1)));
  } else if (phase > 1 - alpha / 2) {
    return 0.5 * (1 + Math.cos(Math.PI * (2 * phase / alpha - 2 / alpha + 1)));
  }
  return 1.0;
}

// Trapezoid window - flat top with linear ramps
export function trapezoidWindow(phase: number, ramp: number = 0.25): number {
  if (phase < ramp) {
    return phase / ramp;
  } else if (phase > 1 - ramp) {
    return (1 - phase) / ramp;
  }
  return 1.0;
}

// Get window function by type
export function getWindowFunction(type: WindowType): (phase: number) => number {
  switch (type) {
    case 'hann': return hannWindow;
    case 'gauss': return gaussWindow;
    case 'blackman': return blackmanWindow;
    case 'rect': return rectWindow;
    case 'tukey': return tukeyWindow;
    case 'trapezoid': return trapezoidWindow;
    default: return hannWindow;
  }
}

// Apply skew to window (shift energy front/back)
// skew: -1 to +1 (negative = front-loaded, positive = back-loaded)
export function applyWindowSkew(phase: number, skew: number): number {
  if (skew === 0) return phase;
  skew = Math.max(-1, Math.min(1, skew));
  
  // Use power curve to skew
  const power = 1 + skew * 0.8; // 0.2 to 1.8
  return Math.pow(phase, power);
}

// Combined window with skew
export function windowWithSkew(
  phase: number, 
  type: WindowType, 
  skew: number
): number {
  const skewedPhase = applyWindowSkew(phase, skew);
  const windowFn = getWindowFunction(type);
  return windowFn(skewedPhase);
}

// ============================================
// SAMPLE INTERPOLATION
// For reading buffer at fractional positions
// ============================================

// Linear interpolation (minimum quality)
export function linearInterpolate(
  buffer: Float32Array,
  position: number
): number {
  const len = buffer.length;
  if (len === 0) return 0;
  
  // Wrap position to buffer bounds
  position = Math.max(0, Math.min(position, len - 1));
  
  const index0 = Math.floor(position);
  const index1 = Math.min(index0 + 1, len - 1);
  const frac = position - index0;
  
  return buffer[index0] * (1 - frac) + buffer[index1] * frac;
}

// Cubic interpolation (smoother, recommended)
export function cubicInterpolate(
  buffer: Float32Array,
  position: number
): number {
  const len = buffer.length;
  if (len === 0) return 0;
  
  position = Math.max(0, Math.min(position, len - 1));
  
  const index1 = Math.floor(position);
  const frac = position - index1;
  
  // Get 4 surrounding samples
  const index0 = Math.max(0, index1 - 1);
  const index2 = Math.min(len - 1, index1 + 1);
  const index3 = Math.min(len - 1, index1 + 2);
  
  const y0 = buffer[index0];
  const y1 = buffer[index1];
  const y2 = buffer[index2];
  const y3 = buffer[index3];
  
  // Catmull-Rom spline
  const c0 = y1;
  const c1 = 0.5 * (y2 - y0);
  const c2 = y0 - 2.5 * y1 + 2 * y2 - 0.5 * y3;
  const c3 = 0.5 * (y3 - y0) + 1.5 * (y1 - y2);
  
  return c0 + frac * (c1 + frac * (c2 + frac * c3));
}

// ============================================
// GRAIN SCHEDULING
// Generate deterministic grain events
// ============================================

export interface GrainEvent {
  startTime: number;      // When grain starts (seconds)
  bufferPosition: number; // Where to read from buffer (0-1 normalized)
  duration: number;       // Grain length in seconds
  playbackRate: number;   // Pitch as rate (1 = original)
  pan: number;            // -1 to +1
  gain: number;           // Linear amplitude multiplier
  windowType: WindowType;
  windowSkew: number;
}

// Convert semitones to playback rate
export function semitonesToRate(semitones: number): number {
  return Math.pow(2, semitones / 12);
}

// Generate grain schedule for a render
export function generateGrainSchedule(
  settings: GranularSettings,
  bufferDuration: number,
  renderDuration: number,
  sampleRate: number
): GrainEvent[] {
  const rng = new SeededRNG(settings.seed);
  const events: GrainEvent[] = [];
  
  if (bufferDuration <= 0 || renderDuration <= 0) return events;
  if (settings.densityGps <= 0) return events;
  
  // Compute timing
  const grainSizeSec = settings.grainSizeMs / 1000;
  if (grainSizeSec <= 0) return events;
  if (grainSizeSec >= bufferDuration) return events;
  
  const grainInterval = 1 / settings.densityGps;
  
  // Scan position (smoothly moving through buffer)
  let scanPhase = 0;
  const scanSpeed = settings.scanRateHz / sampleRate;
  
  let time = 0;
  let activeGrains = 0;
  // Track grain end times to avoid O(n^2) scanning at high density
  const endTimes: number[] = [];
  let endHead = 0;
  
  while (time < renderDuration) {
    // Retire ended grains
    while (endHead < endTimes.length && endTimes[endHead] < time) endHead++;
    activeGrains = endTimes.length - endHead;
    
    // Skip if at max voices
    if (activeGrains >= settings.maxVoices) {
      time += grainInterval;
      continue;
    }
    
    // Calculate buffer read position
    let bufferPos = settings.scanStart + 
      settings.scanWidth * (0.5 + 0.5 * Math.sin(2 * Math.PI * scanPhase));
    
    // Add position jitter
    const jitterSec = (settings.posJitterMs / 1000);
    const jitterNorm = jitterSec / bufferDuration;
    bufferPos += rng.range(-jitterNorm, jitterNorm);
    
    // Clamp to valid range
    bufferPos = Math.max(0, Math.min(1 - grainSizeSec / bufferDuration, bufferPos));
    
    // Calculate pitch/rate
    let pitchST = settings.pitchST;
    pitchST += rng.gaussian(0, settings.pitchRandST * 0.5);
    
    // Quantize if enabled
    if (settings.quantizeST !== 'off') {
      const quantizeStep = settings.quantizeST === '1' ? 1 : 12;
      pitchST = Math.round(pitchST / quantizeStep) * quantizeStep;
    }
    
    const playbackRate = semitonesToRate(pitchST);
    
    // Calculate stereo position
    let pan = rng.range(-settings.panSpread, settings.panSpread);
    
    // Apply stereo link (correlate L/R)
    if (settings.stereoLink > 0 && events.length > 0) {
      const lastPan = events[events.length - 1].pan;
      pan = pan * (1 - settings.stereoLink) + lastPan * settings.stereoLink;
    }
    
    // Calculate gain with variance
    let gain = 1.0;
    if (settings.grainAmpRandDb > 0) {
      const dbVariance = rng.range(-settings.grainAmpRandDb, settings.grainAmpRandDb);
      gain = Math.pow(10, dbVariance / 20);
    }
    
    // Create grain event
    events.push({
      startTime: time,
      bufferPosition: bufferPos,
      duration: grainSizeSec,
      playbackRate,
      pan,
      gain,
      windowType: settings.windowType,
      windowSkew: settings.windowSkew,
    });
    endTimes.push(time + grainSizeSec);
    
    // Update state
    activeGrains++;
    scanPhase += scanSpeed * grainInterval * sampleRate;
    
    // Move to next grain time (with slight jitter for natural feel)
    time += grainInterval * rng.range(0.8, 1.2);
  }
  
  return events;
}

// ============================================
// POST-BUS PROCESSING UTILITIES
// ============================================

// Simple biquad HP filter coefficient calculation
export function calculateHPCoeffs(
  cutoff: number, 
  sampleRate: number, 
  Q: number = 0.707
): { b0: number; b1: number; b2: number; a1: number; a2: number } {
  const w0 = 2 * Math.PI * cutoff / sampleRate;
  const cosW0 = Math.cos(w0);
  const sinW0 = Math.sin(w0);
  const alpha = sinW0 / (2 * Q);
  
  const b0 = (1 + cosW0) / 2;
  const b1 = -(1 + cosW0);
  const b2 = (1 + cosW0) / 2;
  const a0 = 1 + alpha;
  const a1 = -2 * cosW0;
  const a2 = 1 - alpha;
  
  return {
    b0: b0 / a0,
    b1: b1 / a0,
    b2: b2 / a0,
    a1: a1 / a0,
    a2: a2 / a0,
  };
}

// Simple biquad LP filter coefficient calculation
export function calculateLPCoeffs(
  cutoff: number, 
  sampleRate: number, 
  Q: number = 0.707
): { b0: number; b1: number; b2: number; a1: number; a2: number } {
  const w0 = 2 * Math.PI * cutoff / sampleRate;
  const cosW0 = Math.cos(w0);
  const sinW0 = Math.sin(w0);
  const alpha = sinW0 / (2 * Q);
  
  const b0 = (1 - cosW0) / 2;
  const b1 = 1 - cosW0;
  const b2 = (1 - cosW0) / 2;
  const a0 = 1 + alpha;
  const a1 = -2 * cosW0;
  const a2 = 1 - alpha;
  
  return {
    b0: b0 / a0,
    b1: b1 / a0,
    b2: b2 / a0,
    a1: a1 / a0,
    a2: a2 / a0,
  };
}

// Soft saturation (tanh-like)
export function saturate(sample: number, drive: number): number {
  if (drive === 0) return sample;
  const input = sample * (1 + drive * 3);
  return Math.tanh(input);
}

// DC blocking filter (single-pole HP at ~5Hz)
export function createDCBlocker(sampleRate: number): { 
  process: (sample: number) => number; 
  reset: () => void;
} {
  const R = 1 - (2 * Math.PI * 5 / sampleRate);
  let x1 = 0;
  let y1 = 0;
  
  return {
    process(sample: number): number {
      const output = sample - x1 + R * y1;
      x1 = sample;
      y1 = output;
      return output;
    },
    reset() {
      x1 = 0;
      y1 = 0;
    }
  };
}

// Safety fade (prevent pops at start/end)
export function applySafetyFade(
  buffer: Float32Array,
  sampleRate: number,
  fadeMs: number = 10
): void {
  const fadeSamples = Math.floor((fadeMs / 1000) * sampleRate);
  if (fadeSamples <= 0) return;
  const len = buffer.length;
  
  // Fade in
  for (let i = 0; i < fadeSamples && i < len; i++) {
    const gain = i / fadeSamples;
    buffer[i] *= gain;
  }
  
  // Fade out
  for (let i = 0; i < fadeSamples && i < len; i++) {
    const idx = len - 1 - i;
    const gain = i / fadeSamples;
    buffer[idx] *= gain;
  }
}

// ============================================
// AHD ENVELOPE FOR GRANULAR BUS
// ============================================

export function generateAHDEnvelope(
  attackMs: number,
  holdMs: number,
  decayMs: number,
  durationSamples: number,
  sampleRate: number
): Float32Array {
  const envelope = new Float32Array(durationSamples);
  
  const attackSamples = Math.floor((attackMs / 1000) * sampleRate);
  const holdSamples = Math.floor((holdMs / 1000) * sampleRate);
  const decaySamples = Math.floor((decayMs / 1000) * sampleRate);
  
  for (let i = 0; i < durationSamples; i++) {
    let value: number;
    
    if (i < attackSamples) {
      // Attack phase
      value = attackSamples > 0 ? i / attackSamples : 1.0;
    } else if (i < attackSamples + holdSamples) {
      // Hold phase
      value = 1.0;
    } else {
      // Decay phase (exponential)
      const decayProgress = decaySamples > 0 ? (i - attackSamples - holdSamples) / decaySamples : 1;
      value = Math.max(0, Math.exp(-3 * decayProgress));
    }
    
    envelope[i] = value;
  }
  
  return envelope;
}
