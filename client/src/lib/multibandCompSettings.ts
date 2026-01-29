// Multiband Compression settings (3-band)

export interface BandCompSettings {
  threshold: number; // dB, -60 to 0
  ratio: number; // 1:1 to 20:1
  attack: number; // ms, 0.1 to 100
  release: number; // ms, 10 to 1000
  gain: number; // dB, -12 to +12
  enabled: boolean;
}

export interface MultibandCompSettings {
  enabled: boolean;
  lowCrossover: number; // Hz, 20 to 500
  highCrossover: number; // Hz, 2000 to 10000
  lowBand: BandCompSettings;
  midBand: BandCompSettings;
  highBand: BandCompSettings;
  mix: number; // 0-1 dry/wet
}

export const defaultBandSettings: BandCompSettings = {
  threshold: -24,
  ratio: 4,
  attack: 10,
  release: 100,
  gain: 0,
  enabled: true,
};

export const defaultMultibandCompSettings: MultibandCompSettings = {
  enabled: false,
  lowCrossover: 200,
  highCrossover: 4000,
  lowBand: { ...defaultBandSettings },
  midBand: { ...defaultBandSettings },
  highBand: { ...defaultBandSettings },
  mix: 1,
};

const STORAGE_KEY = "synthMultibandCompSettings";

export function loadMultibandCompSettings(): MultibandCompSettings {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return {
        ...defaultMultibandCompSettings,
        ...parsed,
        lowBand: { ...defaultBandSettings, ...parsed.lowBand },
        midBand: { ...defaultBandSettings, ...parsed.midBand },
        highBand: { ...defaultBandSettings, ...parsed.highBand },
      };
    }
  } catch (e) {
    console.error("Failed to load multiband comp settings:", e);
  }
  return { ...defaultMultibandCompSettings };
}

export function saveMultibandCompSettings(settings: MultibandCompSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch (e) {
    console.error("Failed to save multiband comp settings:", e);
  }
}

export function randomizeMultibandCompSettings(
  current: MultibandCompSettings,
  chaos: number = 0.5
): MultibandCompSettings {
  const shouldChange = () => Math.random() < chaos;
  
  const randomizeBand = (band: BandCompSettings): BandCompSettings => ({
    threshold: shouldChange() ? -40 + Math.random() * 30 : band.threshold,
    ratio: shouldChange() ? 1 + Math.random() * 8 : band.ratio,
    attack: shouldChange() ? 0.5 + Math.random() * 50 : band.attack,
    release: shouldChange() ? 20 + Math.random() * 200 : band.release,
    gain: shouldChange() ? (Math.random() - 0.5) * 12 : band.gain,
    enabled: band.enabled,
  });
  
  return {
    ...current,
    enabled: shouldChange() ? Math.random() > 0.5 : current.enabled,
    lowCrossover: shouldChange() ? 80 + Math.random() * 300 : current.lowCrossover,
    highCrossover: shouldChange() ? 2000 + Math.random() * 6000 : current.highCrossover,
    lowBand: randomizeBand(current.lowBand),
    midBand: randomizeBand(current.midBand),
    highBand: randomizeBand(current.highBand),
    mix: shouldChange() ? 0.5 + Math.random() * 0.5 : current.mix,
  };
}
