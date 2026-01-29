// 3-band Parametric EQ settings

export interface EQBandSettings {
  enabled: boolean;
  frequency: number; // Hz
  gain: number; // dB, -15 to +15
  q: number; // 0.1 to 10 (bandwidth)
  type: "lowshelf" | "peaking" | "highshelf";
}

export interface ParametricEQSettings {
  enabled: boolean;
  lowBand: EQBandSettings;
  midBand: EQBandSettings;
  highBand: EQBandSettings;
}

export const defaultParametricEQSettings: ParametricEQSettings = {
  enabled: false,
  lowBand: {
    enabled: true,
    frequency: 100,
    gain: 0,
    q: 0.7,
    type: "lowshelf",
  },
  midBand: {
    enabled: true,
    frequency: 1000,
    gain: 0,
    q: 1,
    type: "peaking",
  },
  highBand: {
    enabled: true,
    frequency: 8000,
    gain: 0,
    q: 0.7,
    type: "highshelf",
  },
};

const STORAGE_KEY = "synthParametricEQSettings";

export function loadParametricEQSettings(): ParametricEQSettings {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return {
        ...defaultParametricEQSettings,
        ...parsed,
        lowBand: { ...defaultParametricEQSettings.lowBand, ...parsed.lowBand },
        midBand: { ...defaultParametricEQSettings.midBand, ...parsed.midBand },
        highBand: { ...defaultParametricEQSettings.highBand, ...parsed.highBand },
      };
    }
  } catch (e) {
    console.error("Failed to load EQ settings:", e);
  }
  return { ...defaultParametricEQSettings };
}

export function saveParametricEQSettings(settings: ParametricEQSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch (e) {
    console.error("Failed to save EQ settings:", e);
  }
}

export function randomizeParametricEQSettings(
  current: ParametricEQSettings,
  chaos: number = 0.5
): ParametricEQSettings {
  const shouldChange = () => Math.random() < chaos;
  
  return {
    enabled: shouldChange() ? Math.random() > 0.4 : current.enabled,
    lowBand: {
      ...current.lowBand,
      frequency: shouldChange() ? 50 + Math.random() * 150 : current.lowBand.frequency,
      gain: shouldChange() ? (Math.random() - 0.5) * 12 : current.lowBand.gain,
      q: shouldChange() ? 0.3 + Math.random() * 1.5 : current.lowBand.q,
    },
    midBand: {
      ...current.midBand,
      frequency: shouldChange() ? 500 + Math.random() * 3000 : current.midBand.frequency,
      gain: shouldChange() ? (Math.random() - 0.5) * 12 : current.midBand.gain,
      q: shouldChange() ? 0.5 + Math.random() * 3 : current.midBand.q,
    },
    highBand: {
      ...current.highBand,
      frequency: shouldChange() ? 4000 + Math.random() * 8000 : current.highBand.frequency,
      gain: shouldChange() ? (Math.random() - 0.5) * 12 : current.highBand.gain,
      q: shouldChange() ? 0.3 + Math.random() * 1.5 : current.highBand.q,
    },
  };
}
