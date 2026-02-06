// Factory wavetables - bundled with the synthesizer
import type { WavetableData, WavetableFrameSize } from "./wavetableSettings";
import { generateBasicFrame, interpolateFrames } from "./wavetableSettings";

const FRAME_SIZE: WavetableFrameSize = 2048;
const DEFAULT_FRAME_COUNT = 64;

// Generate harmonic-rich frame with specified harmonics
function generateHarmonicFrame(
  harmonics: number[],
  size: WavetableFrameSize = FRAME_SIZE
): Float32Array {
  const frame = new Float32Array(size);
  for (let i = 0; i < size; i++) {
    const phase = (i / size) * 2 * Math.PI;
    for (let h = 0; h < harmonics.length; h++) {
      frame[i] += harmonics[h] * Math.sin(phase * (h + 1));
    }
  }
  // Normalize
  let max = 0;
  for (let i = 0; i < size; i++) max = Math.max(max, Math.abs(frame[i]));
  if (max > 0) for (let i = 0; i < size; i++) frame[i] /= max;
  return frame;
}

// Generate formant-like frame
function generateFormantFrame(
  formants: { freq: number; amp: number; bw: number }[],
  fundamental: number,
  size: WavetableFrameSize = FRAME_SIZE
): Float32Array {
  const frame = new Float32Array(size);
  const numHarmonics = 64;
  
  for (let h = 1; h <= numHarmonics; h++) {
    const harmFreq = fundamental * h;
    let amp = 0;
    for (const f of formants) {
      const dist = (harmFreq - f.freq) / f.bw;
      amp += f.amp * Math.exp(-0.5 * dist * dist);
    }
    for (let i = 0; i < size; i++) {
      frame[i] += amp * Math.sin((i / size) * 2 * Math.PI * h);
    }
  }
  
  // Normalize
  let max = 0;
  for (let i = 0; i < size; i++) max = Math.max(max, Math.abs(frame[i]));
  if (max > 0) for (let i = 0; i < size; i++) frame[i] /= max;
  return frame;
}

// Generate sync-like waveform
function generateSyncFrame(
  ratio: number,
  size: WavetableFrameSize = FRAME_SIZE
): Float32Array {
  const frame = new Float32Array(size);
  for (let i = 0; i < size; i++) {
    const phase = (i / size) * 2 * Math.PI * ratio;
    const masterPhase = (i / size) * 2 * Math.PI;
    const sawMaster = 1 - (masterPhase / Math.PI);
    frame[i] = Math.sin(phase) * (0.5 + 0.5 * sawMaster);
  }
  // Normalize
  let max = 0;
  for (let i = 0; i < size; i++) max = Math.max(max, Math.abs(frame[i]));
  if (max > 0) for (let i = 0; i < size; i++) frame[i] /= max;
  return frame;
}

// Generate wave with random harmonics
function generateRandomHarmonicFrame(
  numHarmonics: number,
  seed: number,
  decay: number = 0.7,
  size: WavetableFrameSize = FRAME_SIZE
): Float32Array {
  const harmonics: number[] = [];
  let rng = seed;
  const nextRandom = () => {
    rng = (rng * 1664525 + 1013904223) % 4294967296;
    return rng / 4294967296;
  };
  
  for (let h = 0; h < numHarmonics; h++) {
    harmonics.push((nextRandom() * 2 - 1) * Math.pow(decay, h));
  }
  return generateHarmonicFrame(harmonics, size);
}

// Create morph wavetable between two waveforms
function createMorph(
  id: string,
  name: string,
  category: WavetableData["category"],
  startFrame: Float32Array,
  endFrame: Float32Array,
  frameCount: number = DEFAULT_FRAME_COUNT
): WavetableData {
  const frames: Float32Array[] = [];
  for (let i = 0; i < frameCount; i++) {
    const t = i / (frameCount - 1);
    frames.push(interpolateFrames(startFrame, endFrame, t, "linear"));
  }
  return {
    id,
    name,
    category,
    frameSize: FRAME_SIZE,
    frameCount,
    frames,
    isFactory: true,
  };
}

// Create multi-stage morph wavetable
function createMultiMorph(
  id: string,
  name: string,
  category: WavetableData["category"],
  keyframes: Float32Array[],
  framesPerSegment: number = 16
): WavetableData {
  const frames: Float32Array[] = [];
  
  for (let seg = 0; seg < keyframes.length - 1; seg++) {
    // For the first segment include i=0; for subsequent segments skip i=0 to avoid duplicating the boundary keyframe
    const startI = seg === 0 ? 0 : 1;
    const denom = Math.max(1, framesPerSegment - 1);

    for (let i = startI; i < framesPerSegment; i++) {
      const t = i / denom; // reaches 1.0 at the end of the segment
      frames.push(interpolateFrames(keyframes[seg], keyframes[seg + 1], t, "linear"));
    }
  }
  
  return {
    id,
    name,
    category,
    frameSize: FRAME_SIZE,
    frameCount: frames.length,
    frames,
    isFactory: true,
  };
}

// ============ FACTORY WAVETABLE GENERATORS ============

function createBasicWavetables(): WavetableData[] {
  return [
    // Sine to Saw
    createMorph(
      "basic-sine-to-saw",
      "Sine → Saw",
      "basic",
      generateBasicFrame("sine", FRAME_SIZE),
      generateBasicFrame("sawtooth", FRAME_SIZE)
    ),
    // Sine to Square
    createMorph(
      "basic-sine-to-square",
      "Sine → Square",
      "basic",
      generateBasicFrame("sine", FRAME_SIZE),
      generateBasicFrame("square", FRAME_SIZE)
    ),
    // Triangle to Saw
    createMorph(
      "basic-tri-to-saw",
      "Triangle → Saw",
      "basic",
      generateBasicFrame("triangle", FRAME_SIZE),
      generateBasicFrame("sawtooth", FRAME_SIZE)
    ),
    // Full cycle: Sine → Saw → Square → Triangle → Sine
    createMultiMorph(
      "basic-full-cycle",
      "Wave Cycle",
      "basic",
      [
        generateBasicFrame("sine", FRAME_SIZE),
        generateBasicFrame("sawtooth", FRAME_SIZE),
        generateBasicFrame("square", FRAME_SIZE),
        generateBasicFrame("triangle", FRAME_SIZE),
        generateBasicFrame("sine", FRAME_SIZE),
      ]
    ),
  ];
}

function createAnalogWavetables(): WavetableData[] {
  // Generate analog-style frames with slight imperfections
  const analogSaw = (() => {
    const frame = new Float32Array(FRAME_SIZE);
    for (let i = 0; i < FRAME_SIZE; i++) {
      const phase = i / FRAME_SIZE;
      // Slightly softened saw with subtle harmonics rolloff
      let val = 0;
      for (let h = 1; h <= 32; h++) {
        const rolloff = 1 / (1 + h * 0.05);
        val += (1 / h) * Math.sin(2 * Math.PI * h * phase) * rolloff;
      }
      frame[i] = val;
    }
    let max = 0;
    for (let i = 0; i < FRAME_SIZE; i++) max = Math.max(max, Math.abs(frame[i]));
    for (let i = 0; i < FRAME_SIZE; i++) frame[i] /= max;
    return frame;
  })();
  
  const analogSquare = (() => {
    const frame = new Float32Array(FRAME_SIZE);
    for (let i = 0; i < FRAME_SIZE; i++) {
      const phase = i / FRAME_SIZE;
      let val = 0;
      for (let h = 1; h <= 31; h += 2) {
        const rolloff = 1 / (1 + h * 0.03);
        val += (1 / h) * Math.sin(2 * Math.PI * h * phase) * rolloff;
      }
      frame[i] = val;
    }
    let max = 0;
    for (let i = 0; i < FRAME_SIZE; i++) max = Math.max(max, Math.abs(frame[i]));
    for (let i = 0; i < FRAME_SIZE; i++) frame[i] /= max;
    return frame;
  })();
  
  return [
    createMorph("analog-soft-saw", "Analog Saw", "analog", generateBasicFrame("sine", FRAME_SIZE), analogSaw),
    createMorph("analog-soft-square", "Analog Square", "analog", generateBasicFrame("sine", FRAME_SIZE), analogSquare),
    createMorph("analog-saw-to-square", "Saw → Square", "analog", analogSaw, analogSquare),
  ];
}

function createDigitalWavetables(): WavetableData[] {
  // PWM wavetable
  const pwmFrames: Float32Array[] = [];
  for (let i = 0; i < 64; i++) {
    const pw = 0.05 + (i / 63) * 0.9;
    const frame = new Float32Array(FRAME_SIZE);
    for (let j = 0; j < FRAME_SIZE; j++) {
      frame[j] = (j / FRAME_SIZE) < pw ? 1 : -1;
    }
    pwmFrames.push(frame);
  }
  
  // Sync sweep wavetable
  const syncFrames: Float32Array[] = [];
  for (let i = 0; i < 64; i++) {
    const ratio = 1 + (i / 63) * 7; // 1:1 to 8:1 sync ratio
    syncFrames.push(generateSyncFrame(ratio, FRAME_SIZE));
  }
  
  return [
    {
      id: "digital-pwm",
      name: "PWM Sweep",
      category: "digital",
      frameSize: FRAME_SIZE,
      frameCount: 64,
      frames: pwmFrames,
      isFactory: true,
    },
    {
      id: "digital-sync",
      name: "Sync Sweep",
      category: "digital",
      frameSize: FRAME_SIZE,
      frameCount: 64,
      frames: syncFrames,
      isFactory: true,
    },
  ];
}

function createVocalWavetables(): WavetableData[] {
  // Vowel formant wavetables
  const vowels = [
    { name: "A", formants: [{ freq: 800, amp: 1, bw: 100 }, { freq: 1200, amp: 0.5, bw: 120 }, { freq: 2800, amp: 0.3, bw: 150 }] },
    { name: "E", formants: [{ freq: 400, amp: 1, bw: 80 }, { freq: 2200, amp: 0.7, bw: 140 }, { freq: 2800, amp: 0.3, bw: 160 }] },
    { name: "I", formants: [{ freq: 270, amp: 1, bw: 60 }, { freq: 2300, amp: 0.5, bw: 120 }, { freq: 3000, amp: 0.4, bw: 170 }] },
    { name: "O", formants: [{ freq: 500, amp: 1, bw: 90 }, { freq: 800, amp: 0.6, bw: 100 }, { freq: 2800, amp: 0.2, bw: 150 }] },
    { name: "U", formants: [{ freq: 300, amp: 1, bw: 70 }, { freq: 870, amp: 0.4, bw: 100 }, { freq: 2250, amp: 0.2, bw: 140 }] },
  ];
  
  const vowelFrames = vowels.map(v => 
    generateFormantFrame(v.formants, 100, FRAME_SIZE)
  );
  
  // Create vowel morph A → E → I → O → U
  return [
    createMultiMorph("vocal-vowels", "Vowel Morph", "vocal", vowelFrames, 16),
    createMorph("vocal-ah-to-oh", "Ah → Oh", "vocal", vowelFrames[0], vowelFrames[3]),
    createMorph("vocal-ee-to-oo", "Ee → Oo", "vocal", vowelFrames[2], vowelFrames[4]),
  ];
}

function createOrganicWavetables(): WavetableData[] {
  // Evolving harmonics
  const evolvingFrames: Float32Array[] = [];
  for (let i = 0; i < 64; i++) {
    const t = i / 63;
    const harmonics: number[] = [];
    for (let h = 0; h < 32; h++) {
      const phase = t * Math.PI * 2 + h * 0.3;
      const amp = Math.pow(0.7, h) * (0.5 + 0.5 * Math.sin(phase));
      harmonics.push(amp);
    }
    evolvingFrames.push(generateHarmonicFrame(harmonics, FRAME_SIZE));
  }
  
  // Random harmonic evolution
  const randomFrames: Float32Array[] = [];
  for (let i = 0; i < 64; i++) {
    randomFrames.push(generateRandomHarmonicFrame(24, i * 12345, 0.75, FRAME_SIZE));
  }
  
  return [
    {
      id: "organic-evolve",
      name: "Evolving",
      category: "organic",
      frameSize: FRAME_SIZE,
      frameCount: 64,
      frames: evolvingFrames,
      isFactory: true,
    },
    {
      id: "organic-random",
      name: "Random Harmonics",
      category: "organic",
      frameSize: FRAME_SIZE,
      frameCount: 64,
      frames: randomFrames,
      isFactory: true,
    },
  ];
}

function createHarshWavetables(): WavetableData[] {
  // Clipped/distorted saw
  const clipFrames: Float32Array[] = [];
  for (let i = 0; i < 64; i++) {
    const clipAmount = 0.05 + (i / 63) * 0.9; // 5% to 95% clipping
    const frame = new Float32Array(FRAME_SIZE);
    for (let j = 0; j < FRAME_SIZE; j++) {
      let val = (2 * j / FRAME_SIZE) - 1; // Saw
      val = Math.max(-clipAmount, Math.min(clipAmount, val)) / clipAmount;
      frame[j] = val;
    }
    clipFrames.push(frame);
  }
  
  // Foldback distortion
  const foldFrames: Float32Array[] = [];
  for (let i = 0; i < 64; i++) {
    const threshold = 0.1 + (1 - i / 63) * 0.8;
    const frame = new Float32Array(FRAME_SIZE);
    for (let j = 0; j < FRAME_SIZE; j++) {
      let val = Math.sin(2 * Math.PI * j / FRAME_SIZE) * 2;
      // Foldback
      while (Math.abs(val) > threshold) {
        if (val > threshold) val = 2 * threshold - val;
        else if (val < -threshold) val = -2 * threshold - val;
      }
      frame[j] = val / threshold;
    }
    foldFrames.push(frame);
  }
  
  return [
    {
      id: "harsh-clip",
      name: "Clip Sweep",
      category: "harsh",
      frameSize: FRAME_SIZE,
      frameCount: 64,
      frames: clipFrames,
      isFactory: true,
    },
    {
      id: "harsh-fold",
      name: "Foldback",
      category: "harsh",
      frameSize: FRAME_SIZE,
      frameCount: 64,
      frames: foldFrames,
      isFactory: true,
    },
  ];
}

function createFXWavetables(): WavetableData[] {
  // Noise-like wavetable (different random waveforms)
  const noiseFrames: Float32Array[] = [];
  for (let i = 0; i < 32; i++) {
    const frame = new Float32Array(FRAME_SIZE);
    let rng = i * 54321;
    for (let j = 0; j < FRAME_SIZE; j++) {
      rng = (rng * 1103515245 + 12345) % 2147483648;
      frame[j] = (rng / 2147483648) * 2 - 1;
    }
    // Apply smoothing to make it less harsh
    for (let pass = 0; pass < 3; pass++) {
      for (let j = 1; j < FRAME_SIZE - 1; j++) {
        frame[j] = (frame[j - 1] + frame[j] * 2 + frame[j + 1]) / 4;
      }
    }
    noiseFrames.push(frame);
  }
  
  // Bell/metallic spectrum
  const bellFrames: Float32Array[] = [];
  for (let i = 0; i < 64; i++) {
    const t = i / 63;
    const frame = new Float32Array(FRAME_SIZE);
    const inharmonicity = 0.01 + t * 0.05;
    for (let h = 1; h <= 16; h++) {
      const freq = h * Math.sqrt(1 + inharmonicity * h * h);
      const amp = Math.pow(0.8, h);
      for (let j = 0; j < FRAME_SIZE; j++) {
        frame[j] += amp * Math.sin(2 * Math.PI * freq * j / FRAME_SIZE);
      }
    }
    let max = 0;
    for (let j = 0; j < FRAME_SIZE; j++) max = Math.max(max, Math.abs(frame[j]));
    if (max > 0) for (let j = 0; j < FRAME_SIZE; j++) frame[j] /= max;
    bellFrames.push(frame);
  }
  
  return [
    {
      id: "fx-noise",
      name: "Noise Textures",
      category: "fx",
      frameSize: FRAME_SIZE,
      frameCount: 32,
      frames: noiseFrames,
      isFactory: true,
    },
    {
      id: "fx-bell",
      name: "Metallic Bell",
      category: "fx",
      frameSize: FRAME_SIZE,
      frameCount: 64,
      frames: bellFrames,
      isFactory: true,
    },
  ];
}

// ============ MAIN EXPORT ============

let cachedFactoryWavetables: WavetableData[] | null = null;

export function getFactoryWavetables(): WavetableData[] {
  if (cachedFactoryWavetables) {
    return cachedFactoryWavetables;
  }
  
  cachedFactoryWavetables = [
    ...createBasicWavetables(),
    ...createAnalogWavetables(),
    ...createDigitalWavetables(),
    ...createVocalWavetables(),
    ...createOrganicWavetables(),
    ...createHarshWavetables(),
    ...createFXWavetables(),
  ];
  
  return cachedFactoryWavetables;
}

// Custom/user wavetables storage (in-memory + localStorage)
const CUSTOM_WAVETABLES_KEY = "synth-custom-wavetables";
let customWavetables: WavetableData[] = [];

// Load custom wavetables from localStorage on init
function loadCustomWavetables(): void {
  if (typeof window === "undefined" || typeof localStorage === "undefined") {
    return; // SSR guard
  }
  try {
    const stored = localStorage.getItem(CUSTOM_WAVETABLES_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      const list = Array.isArray(parsed) ? parsed : [];
      customWavetables = list
        .map((wt: any) => {
          const framesIn = Array.isArray(wt?.frames) ? wt.frames : [];
          const frames: Float32Array[] = framesIn
            .map((f: any) => {
              if (!Array.isArray(f)) return null;

              // Coerce to Float32Array and enforce frame size
              const fa = new Float32Array(f);
              if (fa.length === FRAME_SIZE) return fa;
              if (fa.length > FRAME_SIZE) return fa.subarray(0, FRAME_SIZE);

              // Pad short frames with zeros
              const padded = new Float32Array(FRAME_SIZE);
              padded.set(fa, 0);
              return padded;
            })
            .filter((x: Float32Array | null): x is Float32Array => x !== null);

          if (frames.length === 0) return null;

          const frameSize: WavetableFrameSize = FRAME_SIZE;
          return {
            ...wt,
            frameSize,
            frameCount: frames.length,
            frames,
            isFactory: false,
          } as WavetableData;
        })
        .filter((x: WavetableData | null): x is WavetableData => x !== null);
    }
  } catch (e) {
    console.warn("Failed to load custom wavetables:", e);
  }
}

// Save custom wavetables to localStorage
function saveCustomWavetables(): void {
  if (typeof window === "undefined" || typeof localStorage === "undefined") {
    return; // SSR guard
  }
  try {
    const serialized = customWavetables.map(wt => ({
      ...wt,
      frames: wt.frames.map(f => Array.from(f)),
    }));
    localStorage.setItem(CUSTOM_WAVETABLES_KEY, JSON.stringify(serialized));
  } catch (e) {
    console.warn("Failed to save custom wavetables:", e);
  }
}

// Initialize custom wavetables on module load
loadCustomWavetables();

// Register a custom wavetable (add or update)
export function registerCustomWavetable(wavetable: WavetableData): void {
  const existingIndex = customWavetables.findIndex(wt => wt.id === wavetable.id);
  if (existingIndex >= 0) {
    customWavetables[existingIndex] = wavetable;
  } else {
    customWavetables.push(wavetable);
  }
  saveCustomWavetables();
}

// Get all custom wavetables
export function getCustomWavetables(): WavetableData[] {
  return [...customWavetables];
}

// Delete a custom wavetable
export function deleteCustomWavetable(id: string): boolean {
  const index = customWavetables.findIndex(wt => wt.id === id);
  if (index >= 0) {
    customWavetables.splice(index, 1);
    saveCustomWavetables();
    return true;
  }
  return false;
}

// Get wavetable by ID (factory or user)
export function getWavetableById(id: string): WavetableData | null {
  const factory = getFactoryWavetables().find(wt => wt.id === id);
  if (factory) return factory;
  
  // Check user wavetables
  const custom = customWavetables.find(wt => wt.id === id);
  if (custom) return custom;
  
  return null;
}

// Get wavetables by category
export function getWavetablesByCategory(category: WavetableData["category"]): WavetableData[] {
  const factory = getFactoryWavetables().filter(wt => wt.category === category);
  const custom = customWavetables.filter(wt => wt.category === category);
  return [...factory, ...custom];
}
