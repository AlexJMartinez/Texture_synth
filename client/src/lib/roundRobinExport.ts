// Round-Robin Export - Generate subtle variations of a sound

import type { SynthParameters } from "@shared/schema";

export interface RoundRobinSettings {
  enabled: boolean;
  variationCount: number; // 4-8 variations
  variationAmount: number; // 0-100% how much to vary each parameter
  varyPitch: boolean;
  varyEnvelope: boolean;
  varyFilter: boolean;
  varyLevel: boolean;
}

export const defaultRoundRobinSettings: RoundRobinSettings = {
  enabled: false,
  variationCount: 4,
  variationAmount: 15,
  varyPitch: true,
  varyEnvelope: true,
  varyFilter: true,
  varyLevel: true,
};

const STORAGE_KEY = "synthRoundRobinSettings";

export function loadRoundRobinSettings(): RoundRobinSettings {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return { ...defaultRoundRobinSettings, ...JSON.parse(stored) };
    }
  } catch (e) {
    console.error("Failed to load round-robin settings:", e);
  }
  return { ...defaultRoundRobinSettings };
}

export function saveRoundRobinSettings(settings: RoundRobinSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch (e) {
    console.error("Failed to save round-robin settings:", e);
  }
}

// Generate subtle variation of a number
function varyNumber(value: number, min: number, max: number, amount: number): number {
  const range = max - min;
  const variation = (Math.random() - 0.5) * 2 * (range * amount);
  return Math.max(min, Math.min(max, value + variation));
}

// Generate a subtle variation of the synth parameters
export function generateVariation(
  baseParams: SynthParameters,
  settings: RoundRobinSettings
): SynthParameters {
  const amount = settings.variationAmount / 100;
  const result = JSON.parse(JSON.stringify(baseParams)) as SynthParameters;
  
  // Vary pitch (subtle detuning)
  if (settings.varyPitch) {
    // Add subtle detuning to oscillators
    if (result.oscillators.osc1.enabled) {
      result.oscillators.osc1.detune = varyNumber(
        result.oscillators.osc1.detune,
        -20,
        20,
        amount * 0.5
      );
    }
    if (result.oscillators.osc2.enabled) {
      result.oscillators.osc2.detune = varyNumber(
        result.oscillators.osc2.detune,
        -20,
        20,
        amount * 0.5
      );
    }
    if (result.oscillators.osc3.enabled) {
      result.oscillators.osc3.detune = varyNumber(
        result.oscillators.osc3.detune,
        -20,
        20,
        amount * 0.5
      );
    }
  }
  
  // Vary envelope (using the envelopes structure from schema)
  if (settings.varyEnvelope) {
    // Amp envelope (env3)
    result.envelopes.env3.attack = varyNumber(result.envelopes.env3.attack, 0, 0.5, amount * 0.3);
    result.envelopes.env3.decay = varyNumber(result.envelopes.env3.decay, 0.01, 2, amount * 0.3);
    result.envelopes.env3.hold = varyNumber(result.envelopes.env3.hold, 0, 0.5, amount * 0.3);
    
    // Pitch envelope (env1)
    result.envelopes.env1.attack = varyNumber(result.envelopes.env1.attack, 0, 0.3, amount * 0.3);
    result.envelopes.env1.decay = varyNumber(result.envelopes.env1.decay, 0.01, 1, amount * 0.3);
    result.envelopes.env1.amount = varyNumber(result.envelopes.env1.amount, -48, 48, amount * 0.2);
  }
  
  // Vary filter
  if (settings.varyFilter) {
    result.filter.frequency = varyNumber(result.filter.frequency, 20, 20000, amount * 0.1);
    result.filter.resonance = varyNumber(result.filter.resonance, 0, 25, amount * 0.2);
    // Filter envelope (env2)
    result.envelopes.env2.amount = varyNumber(result.envelopes.env2.amount, -10000, 10000, amount * 0.15);
  }
  
  // Vary level
  if (settings.varyLevel) {
    result.oscillators.osc1.level = varyNumber(result.oscillators.osc1.level, 0, 1, amount * 0.1);
    result.oscillators.osc2.level = varyNumber(result.oscillators.osc2.level, 0, 1, amount * 0.1);
    result.oscillators.osc3.level = varyNumber(result.oscillators.osc3.level, 0, 1, amount * 0.1);
    result.output.volume = varyNumber(result.output.volume, 0, 1, amount * 0.05);
  }
  
  return result;
}

// Generate all round-robin variations
export function generateAllVariations(
  baseParams: SynthParameters,
  settings: RoundRobinSettings
): SynthParameters[] {
  const variations: SynthParameters[] = [];
  for (let i = 0; i < settings.variationCount; i++) {
    variations.push(generateVariation(baseParams, settings));
  }
  return variations;
}
