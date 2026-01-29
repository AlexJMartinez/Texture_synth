// Parallel Processing settings - global dry/wet blend for effects chain

export interface ParallelProcessingSettings {
  enabled: boolean;
  dryWetMix: number; // 0 = all dry, 1 = all wet
  dryGain: number; // dB, -12 to +12
  wetGain: number; // dB, -12 to +12
}

export const defaultParallelProcessingSettings: ParallelProcessingSettings = {
  enabled: false,
  dryWetMix: 0.5,
  dryGain: 0,
  wetGain: 0,
};

const STORAGE_KEY = "synthParallelProcessingSettings";

export function loadParallelProcessingSettings(): ParallelProcessingSettings {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return { ...defaultParallelProcessingSettings, ...JSON.parse(stored) };
    }
  } catch (e) {
    console.error("Failed to load parallel processing settings:", e);
  }
  return { ...defaultParallelProcessingSettings };
}

export function saveParallelProcessingSettings(settings: ParallelProcessingSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch (e) {
    console.error("Failed to save parallel processing settings:", e);
  }
}

export function randomizeParallelProcessingSettings(
  current: ParallelProcessingSettings,
  chaos: number = 0.5
): ParallelProcessingSettings {
  const shouldChange = () => Math.random() < chaos;
  
  return {
    enabled: shouldChange() ? Math.random() > 0.5 : current.enabled,
    dryWetMix: shouldChange() ? Math.random() : current.dryWetMix,
    dryGain: shouldChange() ? (Math.random() - 0.5) * 12 : current.dryGain,
    wetGain: shouldChange() ? (Math.random() - 0.5) * 12 : current.wetGain,
  };
}
