// Ring Modulation settings - stored in localStorage

export interface RingModSettings {
  enabled: boolean;
  source1: "osc1" | "osc2" | "osc3";
  source2: "osc1" | "osc2" | "osc3";
  mix: number; // 0-100% dry/wet
  outputLevel: number; // 0-100%
}

export const defaultRingModSettings: RingModSettings = {
  enabled: false,
  source1: "osc1",
  source2: "osc2",
  mix: 50,
  outputLevel: 100,
};

const RING_MOD_SETTINGS_KEY = "synth-ring-mod-settings";

export function loadRingModSettings(): RingModSettings {
  try {
    const stored = localStorage.getItem(RING_MOD_SETTINGS_KEY);
    if (stored) {
      return { ...defaultRingModSettings, ...JSON.parse(stored) };
    }
  } catch {
    // Fall through to default
  }
  return { ...defaultRingModSettings };
}

export function saveRingModSettings(settings: RingModSettings) {
  localStorage.setItem(RING_MOD_SETTINGS_KEY, JSON.stringify(settings));
}

export function randomizeRingModSettings(): RingModSettings {
  const sources: Array<"osc1" | "osc2" | "osc3"> = ["osc1", "osc2", "osc3"];
  const source1 = sources[Math.floor(Math.random() * 3)];
  let source2 = sources[Math.floor(Math.random() * 3)];
  // Ensure source2 is different from source1
  while (source2 === source1) {
    source2 = sources[Math.floor(Math.random() * 3)];
  }
  
  return {
    enabled: Math.random() > 0.6, // 40% chance
    source1,
    source2,
    mix: Math.floor(Math.random() * 60 + 20), // 20-80%
    outputLevel: Math.floor(Math.random() * 40 + 60), // 60-100%
  };
}
