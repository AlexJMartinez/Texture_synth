// Ring Modulation settings - stored in localStorage
// Architecture: dedicated modulator oscillator with AHD envelope on depth

export interface RingModSettings {
  enabled: boolean;
  freqHz: number;           // modulator frequency (20-2000 Hz)
  depth: number;            // 0-100% modulation depth
  mix: number;              // 0-100% dry/wet
  waveform: OscillatorType; // modulator waveform
  // AHD envelope on depth (crucial for one-shots)
  envAttack: number;        // ms
  envHold: number;          // ms
  envDecay: number;         // ms
  // Post-filtering to clean up signal
  hpHz: number;             // highpass frequency
  lpHz: number;             // lowpass frequency
  outputLevel: number;      // 0-100%
}

export const defaultRingModSettings: RingModSettings = {
  enabled: false,
  freqHz: 280,
  depth: 35,
  mix: 25,
  waveform: "sine",
  envAttack: 0,
  envHold: 10,
  envDecay: 80,
  hpHz: 200,
  lpHz: 12000,
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
  const waveforms: OscillatorType[] = ["sine", "triangle", "sawtooth", "square"];
  
  return {
    enabled: Math.random() > 0.6, // 40% chance
    freqHz: Math.floor(Math.random() * 800 + 100), // 100-900 Hz
    depth: Math.floor(Math.random() * 60 + 20), // 20-80%
    mix: Math.floor(Math.random() * 50 + 15), // 15-65%
    waveform: waveforms[Math.floor(Math.random() * waveforms.length)],
    envAttack: Math.floor(Math.random() * 5), // 0-5ms
    envHold: Math.floor(Math.random() * 30), // 0-30ms
    envDecay: Math.floor(Math.random() * 200 + 30), // 30-230ms
    hpHz: Math.floor(Math.random() * 300 + 100), // 100-400 Hz
    lpHz: Math.floor(Math.random() * 8000 + 6000), // 6000-14000 Hz
    outputLevel: Math.floor(Math.random() * 40 + 60), // 60-100%
  };
}
