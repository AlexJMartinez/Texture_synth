// Advanced FM and Granular settings - stored in localStorage (not in schema)

// FM Algorithm types - how operators are routed
export type FMAlgorithm = "series" | "parallel" | "feedback" | "mixed";

// Second operator for each oscillator
export interface FMOperator2 {
  enabled: boolean;
  ratio: number; // 0.25-16
  ratioDetune: number; // -100 to 100 cents
  depth: number; // 0-1000
  waveform: "sine" | "triangle" | "sawtooth" | "square";
  feedback: number; // 0-1
}

export interface AdvancedFMSettings {
  algorithm: FMAlgorithm;
  operator1Detune: number; // -100 to 100 cents for fine-tuning
  operator2: FMOperator2;
}

export const defaultAdvancedFMSettings: AdvancedFMSettings = {
  algorithm: "series",
  operator1Detune: 0,
  operator2: {
    enabled: false,
    ratio: 2,
    ratioDetune: 0,
    depth: 200,
    waveform: "sine",
    feedback: 0,
  },
};

// Per-oscillator FM settings map
export type OscAdvancedFMSettings = {
  osc1: AdvancedFMSettings;
  osc2: AdvancedFMSettings;
  osc3: AdvancedFMSettings;
};

export const defaultOscAdvancedFMSettings: OscAdvancedFMSettings = {
  osc1: { ...defaultAdvancedFMSettings },
  osc2: { ...defaultAdvancedFMSettings },
  osc3: { ...defaultAdvancedFMSettings },
};

// Granular envelope shape types
export type GrainEnvelopeShape = "hanning" | "gaussian" | "triangle" | "trapezoid" | "rectangular";

// Advanced granular settings
export interface AdvancedGranularSettings {
  envelopeShape: GrainEnvelopeShape;
  positionJitter: number; // 0-100%, randomize grain start position
  overlap: number; // 0-100%, grain overlap amount
  reverseProbability: number; // 0-100%, chance each grain plays backwards
  stereoSpread: number; // 0-100%, randomize grain panning
  freeze: boolean; // freeze/loop at current position
}

export const defaultAdvancedGranularSettings: AdvancedGranularSettings = {
  envelopeShape: "hanning",
  positionJitter: 20,
  overlap: 50,
  reverseProbability: 0,
  stereoSpread: 30,
  freeze: false,
};

// LocalStorage keys
const FM_SETTINGS_KEY = "synth-advanced-fm-settings";
const GRANULAR_SETTINGS_KEY = "synth-advanced-granular-settings";

// FM settings persistence
export function loadAdvancedFMSettings(): OscAdvancedFMSettings {
  try {
    const stored = localStorage.getItem(FM_SETTINGS_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return {
        osc1: { ...defaultAdvancedFMSettings, ...parsed.osc1 },
        osc2: { ...defaultAdvancedFMSettings, ...parsed.osc2 },
        osc3: { ...defaultAdvancedFMSettings, ...parsed.osc3 },
      };
    }
  } catch {
    // Fall through to default
  }
  return { ...defaultOscAdvancedFMSettings };
}

export function saveAdvancedFMSettings(settings: OscAdvancedFMSettings) {
  localStorage.setItem(FM_SETTINGS_KEY, JSON.stringify(settings));
}

// Granular settings persistence
export function loadAdvancedGranularSettings(): AdvancedGranularSettings {
  try {
    const stored = localStorage.getItem(GRANULAR_SETTINGS_KEY);
    if (stored) {
      return { ...defaultAdvancedGranularSettings, ...JSON.parse(stored) };
    }
  } catch {
    // Fall through to default
  }
  return { ...defaultAdvancedGranularSettings };
}

export function saveAdvancedGranularSettings(settings: AdvancedGranularSettings) {
  localStorage.setItem(GRANULAR_SETTINGS_KEY, JSON.stringify(settings));
}

// Algorithm descriptions for UI
export const fmAlgorithmDescriptions: Record<FMAlgorithm, string> = {
  series: "Op2 → Op1 → Carrier (cascaded modulation)",
  parallel: "Op1 + Op2 → Carrier (summed modulation)",
  feedback: "Op1 ↔ Op2 → Carrier (cross-modulation)",
  mixed: "Op2 → Op1, Op1 → Carrier, Op2 → Carrier",
};

// Grain envelope shape descriptions
export const grainEnvelopeDescriptions: Record<GrainEnvelopeShape, string> = {
  hanning: "Smooth, natural fade (most common)",
  gaussian: "Bell-shaped, very smooth transitions",
  triangle: "Linear fade in/out, sharper transients",
  trapezoid: "Flat sustain with short fades",
  rectangular: "No fade, maximum punch (may click)",
};
