// Unison/Super mode settings - stored in localStorage (not in schema)

export interface UnisonSettings {
  enabled: boolean;
  voices: number; // 1-8 voices
  detune: number; // 0-100 cents spread
  spread: number; // 0-100% stereo width
  blend: number; // 0-100% mix of detuned voices
}

export const defaultUnisonSettings: UnisonSettings = {
  enabled: false,
  voices: 1,
  detune: 25,
  spread: 50,
  blend: 100,
};

export type OscUnisonSettings = {
  osc1: UnisonSettings;
  osc2: UnisonSettings;
  osc3: UnisonSettings;
};

export const defaultOscUnisonSettings: OscUnisonSettings = {
  osc1: { ...defaultUnisonSettings },
  osc2: { ...defaultUnisonSettings },
  osc3: { ...defaultUnisonSettings },
};

const UNISON_SETTINGS_KEY = "synth-unison-settings";

export function loadUnisonSettings(): OscUnisonSettings {
  try {
    const stored = localStorage.getItem(UNISON_SETTINGS_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return {
        osc1: { ...defaultUnisonSettings, ...parsed.osc1 },
        osc2: { ...defaultUnisonSettings, ...parsed.osc2 },
        osc3: { ...defaultUnisonSettings, ...parsed.osc3 },
      };
    }
  } catch {
    // Fall through to default
  }
  return { ...defaultOscUnisonSettings };
}

export function saveUnisonSettings(settings: OscUnisonSettings) {
  localStorage.setItem(UNISON_SETTINGS_KEY, JSON.stringify(settings));
}

export function randomizeUnisonSettings(): OscUnisonSettings {
  const randomizeOne = (): UnisonSettings => ({
    enabled: Math.random() > 0.5,
    voices: Math.floor(Math.random() * 4) + 1, // 1-4 voices for randomize
    detune: Math.floor(Math.random() * 50), // 0-50 cents
    spread: Math.floor(Math.random() * 100),
    blend: Math.floor(50 + Math.random() * 50), // 50-100%
  });

  return {
    osc1: randomizeOne(),
    osc2: randomizeOne(),
    osc3: randomizeOne(),
  };
}
