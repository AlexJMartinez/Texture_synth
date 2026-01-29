// Phaser and Flanger effect settings

export interface PhaserSettings {
  enabled: boolean;
  rate: number; // Hz, 0.1 to 10
  depth: number; // 0-1
  feedback: number; // -1 to 1
  stages: number; // 2, 4, 6, 8, 12
  mix: number; // 0-1
}

export interface FlangerSettings {
  enabled: boolean;
  rate: number; // Hz, 0.1 to 10
  depth: number; // 0-1 (max delay swing in ms)
  feedback: number; // -1 to 1
  delay: number; // base delay in ms, 0.5 to 10
  mix: number; // 0-1
}

export interface PhaserFlangerSettings {
  phaser: PhaserSettings;
  flanger: FlangerSettings;
}

export const defaultPhaserSettings: PhaserSettings = {
  enabled: false,
  rate: 0.5,
  depth: 0.5,
  feedback: 0.5,
  stages: 4,
  mix: 0.5,
};

export const defaultFlangerSettings: FlangerSettings = {
  enabled: false,
  rate: 0.3,
  depth: 0.5,
  feedback: 0.5,
  delay: 2,
  mix: 0.5,
};

export const defaultPhaserFlangerSettings: PhaserFlangerSettings = {
  phaser: { ...defaultPhaserSettings },
  flanger: { ...defaultFlangerSettings },
};

const STORAGE_KEY = "synthPhaserFlangerSettings";

export function loadPhaserFlangerSettings(): PhaserFlangerSettings {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return {
        phaser: { ...defaultPhaserSettings, ...parsed.phaser },
        flanger: { ...defaultFlangerSettings, ...parsed.flanger },
      };
    }
  } catch (e) {
    console.error("Failed to load phaser/flanger settings:", e);
  }
  return { ...defaultPhaserFlangerSettings };
}

export function savePhaserFlangerSettings(settings: PhaserFlangerSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch (e) {
    console.error("Failed to save phaser/flanger settings:", e);
  }
}

export function randomizePhaserFlangerSettings(
  current: PhaserFlangerSettings,
  chaos: number = 0.5
): PhaserFlangerSettings {
  const shouldChange = () => Math.random() < chaos;
  
  return {
    phaser: {
      enabled: shouldChange() ? Math.random() > 0.6 : current.phaser.enabled,
      rate: shouldChange() ? 0.1 + Math.random() * 3 : current.phaser.rate,
      depth: shouldChange() ? Math.random() : current.phaser.depth,
      feedback: shouldChange() ? (Math.random() - 0.5) * 1.6 : current.phaser.feedback,
      stages: shouldChange() ? [2, 4, 6, 8, 12][Math.floor(Math.random() * 5)] : current.phaser.stages,
      mix: shouldChange() ? 0.3 + Math.random() * 0.7 : current.phaser.mix,
    },
    flanger: {
      enabled: shouldChange() ? Math.random() > 0.6 : current.flanger.enabled,
      rate: shouldChange() ? 0.1 + Math.random() * 2 : current.flanger.rate,
      depth: shouldChange() ? Math.random() : current.flanger.depth,
      feedback: shouldChange() ? (Math.random() - 0.5) * 1.6 : current.flanger.feedback,
      delay: shouldChange() ? 0.5 + Math.random() * 5 : current.flanger.delay,
      mix: shouldChange() ? 0.3 + Math.random() * 0.7 : current.flanger.mix,
    },
  };
}
