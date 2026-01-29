export interface StepSequencerSettings {
  enabled: boolean;
  steps: number[];
  stepCount: 8 | 16;
  rate: string;
  smoothing: number;
  bipolar: boolean;
  swing: number;
}

export const defaultStepSequencerSettings: StepSequencerSettings = {
  enabled: false,
  steps: [1, 0.75, 0.5, 0.75, 1, 0.5, 0.25, 0.5, 1, 0.75, 0.5, 0.75, 1, 0.5, 0.25, 0.5],
  stepCount: 8,
  rate: "1/8",
  smoothing: 0,
  bipolar: false,
  swing: 0,
};

const STORAGE_KEY = "oneshot-synth-step-sequencer";

export function loadStepSequencerSettings(): StepSequencerSettings {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return { ...defaultStepSequencerSettings, ...JSON.parse(stored) };
    }
  } catch (e) {
    console.error("Failed to load step sequencer settings:", e);
  }
  return { ...defaultStepSequencerSettings };
}

export function saveStepSequencerSettings(settings: StepSequencerSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch (e) {
    console.error("Failed to save step sequencer settings:", e);
  }
}

export function getStepValue(settings: StepSequencerSettings, stepIndex: number): number {
  const idx = stepIndex % settings.stepCount;
  const value = settings.steps[idx] ?? 0.5;
  
  if (settings.bipolar) {
    return value * 2 - 1;
  }
  return value;
}

export function rateToBPMDivision(rate: string): number {
  const rates: Record<string, number> = {
    "1/1": 4,
    "1/2": 2,
    "1/4": 1,
    "1/8": 0.5,
    "1/16": 0.25,
    "1/32": 0.125,
    "1/4T": 1 / 1.5,
    "1/8T": 0.5 / 1.5,
    "1/16T": 0.25 / 1.5,
    "1/4D": 1.5,
    "1/8D": 0.75,
    "1/16D": 0.375,
  };
  return rates[rate] ?? 0.5;
}

export function randomizeStepSequencerSettings(): StepSequencerSettings {
  const stepCount = Math.random() > 0.5 ? 16 : 8;
  const steps: number[] = [];
  
  for (let i = 0; i < 16; i++) {
    steps.push(Math.random());
  }
  
  const rates = ["1/4", "1/8", "1/16", "1/8T", "1/16T"];
  
  return {
    enabled: true,
    steps,
    stepCount: stepCount as 8 | 16,
    rate: rates[Math.floor(Math.random() * rates.length)],
    smoothing: Math.random() * 0.5,
    bipolar: Math.random() > 0.5,
    swing: Math.random() * 0.3,
  };
}
