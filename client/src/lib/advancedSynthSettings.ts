// Advanced FM settings - stored in localStorage (not in schema)

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
  carrierWaveform: "sine" | "triangle" | "sawtooth" | "square"; // Carrier waveform when FM bypasses main osc
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
  carrierWaveform: "sine", // Classic FM uses sine carrier
};

function cloneAdvancedFMSettings(src: AdvancedFMSettings = defaultAdvancedFMSettings): AdvancedFMSettings {
  return {
    ...src,
    operator2: { ...src.operator2 },
  };
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function sanitizeAdvancedFMSettings(s: AdvancedFMSettings): AdvancedFMSettings {
  return {
    algorithm: s.algorithm,
    operator1Detune: clamp(Number(s.operator1Detune ?? 0), -100, 100),
    carrierWaveform: s.carrierWaveform,
    operator2: {
      enabled: Boolean(s.operator2?.enabled),
      ratio: clamp(Number(s.operator2?.ratio ?? 2), 0.25, 16),
      ratioDetune: clamp(Number(s.operator2?.ratioDetune ?? 0), -100, 100),
      depth: clamp(Number(s.operator2?.depth ?? 200), 0, 1000),
      waveform: (s.operator2?.waveform ?? 'sine') as FMOperator2['waveform'],
      feedback: clamp(Number(s.operator2?.feedback ?? 0), 0, 1),
    },
  };
}

// Per-oscillator FM settings map
export type OscAdvancedFMSettings = {
  osc1: AdvancedFMSettings;
  osc2: AdvancedFMSettings;
  osc3: AdvancedFMSettings;
};

export const defaultOscAdvancedFMSettings: OscAdvancedFMSettings = {
  osc1: cloneAdvancedFMSettings(),
  osc2: cloneAdvancedFMSettings(),
  osc3: cloneAdvancedFMSettings(),
};

// LocalStorage keys
const FM_SETTINGS_KEY = "synth-advanced-fm-settings";

// FM settings persistence
export function loadAdvancedFMSettings(): OscAdvancedFMSettings {
  try {
    const stored = localStorage.getItem(FM_SETTINGS_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as Partial<OscAdvancedFMSettings>;

      const mergeOne = (p?: Partial<AdvancedFMSettings>): AdvancedFMSettings => {
        const merged: AdvancedFMSettings = {
          ...cloneAdvancedFMSettings(),
          ...(p ?? {}),
          operator2: {
            ...defaultAdvancedFMSettings.operator2,
            ...((p as any)?.operator2 ?? {}),
          },
        };
        return sanitizeAdvancedFMSettings(merged);
      };

      return {
        osc1: mergeOne((parsed as any)?.osc1),
        osc2: mergeOne((parsed as any)?.osc2),
        osc3: mergeOne((parsed as any)?.osc3),
      };
    }
  } catch {
    // Fall through to default
  }

  return {
    osc1: cloneAdvancedFMSettings(),
    osc2: cloneAdvancedFMSettings(),
    osc3: cloneAdvancedFMSettings(),
  };
}

export function saveAdvancedFMSettings(settings: OscAdvancedFMSettings) {
  try {
    localStorage.setItem(FM_SETTINGS_KEY, JSON.stringify(settings));
  } catch (e) {
    console.warn('Failed to save advanced FM settings:', e);
  }
}

// Algorithm descriptions for UI
export const fmAlgorithmDescriptions: Record<FMAlgorithm, string> = {
  series: "Op2 → Op1 → Carrier (cascaded modulation)",
  parallel: "Op1 + Op2 → Carrier (summed modulation)",
  feedback: "Op1 ↔ Op2 → Carrier (cross-modulation)",
  mixed: "Op2 → Op1, Op1 → Carrier, Op2 → Carrier",
};

// ============ ADVANCED FILTER SETTINGS ============

export type FilterDriveType = "off" | "soft" | "hard" | "tube" | "tape";
export type FilterDrivePosition = "pre" | "post";
export type DualFilterRouting = "off" | "series" | "parallel";
export type FormantVowel = "A" | "E" | "I" | "O" | "U";

export interface AdvancedFilterSettings {
  // Filter Drive/Saturation
  driveEnabled: boolean;
  driveAmount: number; // 0-100
  driveType: FilterDriveType;
  drivePosition: FilterDrivePosition;
  
  // Dual Filter Mode
  dualMode: DualFilterRouting;
  filter2Type: "lowpass" | "highpass" | "bandpass" | "notch";
  filter2Frequency: number; // 20-20000
  filter2Resonance: number; // 0-30
  dualMix: number; // 0-100 (morph between filters in parallel, or balance in series)
  
  // Formant Filter
  formantEnabled: boolean;
  formantVowel: FormantVowel;
  formantMix: number; // 0-100
  
  // Filter FM
  fmEnabled: boolean;
  fmSource: "osc1" | "osc2" | "osc3" | "lfo";
  fmDepth: number; // 0-100
  
  // Keytracking
  keytrackEnabled: boolean;
  keytrackAmount: number; // -100 to 100
  
  // Self-oscillation
  selfOscillation: boolean;
}

export const defaultAdvancedFilterSettings: AdvancedFilterSettings = {
  driveEnabled: false,
  driveAmount: 30,
  driveType: "soft",
  drivePosition: "pre",
  
  dualMode: "off",
  filter2Type: "highpass",
  filter2Frequency: 200,
  filter2Resonance: 5,
  dualMix: 50,
  
  formantEnabled: false,
  formantVowel: "A",
  formantMix: 50,
  
  fmEnabled: false,
  fmSource: "lfo",
  fmDepth: 30,
  
  keytrackEnabled: false,
  keytrackAmount: 50,
  
  selfOscillation: false,
};

// Formant filter frequencies for each vowel
export const formantFrequencies: Record<FormantVowel, { f1: number; f2: number; f3: number }> = {
  A: { f1: 800, f2: 1200, f3: 2800 },
  E: { f1: 400, f2: 2200, f3: 2800 },
  I: { f1: 270, f2: 2300, f3: 3000 },
  O: { f1: 500, f2: 800, f3: 2800 },
  U: { f1: 300, f2: 870, f3: 2250 },
};

// ============ OSCILLATOR PHASE SETTINGS ============

export interface OscPhaseSettings {
  osc1Phase: number; // 0-360 degrees
  osc2Phase: number;
  osc3Phase: number;
  subPhase: number;
}

export const defaultOscPhaseSettings: OscPhaseSettings = {
  osc1Phase: 0,
  osc2Phase: 0,
  osc3Phase: 0,
  subPhase: 0,
};

// ============ SUB BASS ENHANCEMENT SETTINGS ============

export interface SubHarmonicSettings {
  enabled: boolean;
  octaveDown1: number; // 0-100 mix for 1 octave down
  octaveDown2: number; // 0-100 mix for 2 octaves down
  filterFreq: number; // 20-200 Hz lowpass on sub harmonics
  drive: number; // 0-100 soft saturation on sub harmonics
}

export interface BassExciterSettings {
  enabled: boolean;
  frequency: number; // 40-150 Hz - center frequency for harmonic generation
  harmonics: number; // 0-100 amount of 2nd/3rd harmonic generation
  subOctave: number; // 0-100 psychoacoustic sub-octave synthesis
  presence: number; // 0-100 high-frequency "edge" for bass presence
  mix: number; // 0-100 wet/dry
}

export interface SubEQSettings {
  enabled: boolean;
  lowShelfFreq: number; // 30-120 Hz
  lowShelfGain: number; // -12 to +12 dB
  lowShelfQ: number; // 0.3-2.0 resonance
  subBoostFreq: number; // 20-80 Hz - narrow sub boost
  subBoostGain: number; // 0-12 dB
  subBoostQ: number; // 1-8 narrow to wide
}

export interface LowEndSettings {
  dcFilterEnabled: boolean; // Highpass at ~5Hz to remove DC offset
  dcFilterFreq: number; // 3-20 Hz
  
  monoSumEnabled: boolean; // Collapse low frequencies to mono
  monoSumFreq: number; // 80-300 Hz crossover frequency
  monoSumWidth: number; // 0-100% transition width (gradual vs sharp)
  
  subHarmonic: SubHarmonicSettings;
  bassExciter: BassExciterSettings;
  subEQ: SubEQSettings;
}

export const defaultLowEndSettings: LowEndSettings = {
  dcFilterEnabled: true,
  dcFilterFreq: 5,
  
  monoSumEnabled: false,
  monoSumFreq: 120,
  monoSumWidth: 50,
  
  subHarmonic: {
    enabled: false,
    octaveDown1: 30,
    octaveDown2: 15,
    filterFreq: 80,
    drive: 20,
  },
  
  bassExciter: {
    enabled: false,
    frequency: 80,
    harmonics: 40,
    subOctave: 25,
    presence: 30,
    mix: 50,
  },
  
  subEQ: {
    enabled: false,
    lowShelfFreq: 60,
    lowShelfGain: 3,
    lowShelfQ: 0.7,
    subBoostFreq: 45,
    subBoostGain: 4,
    subBoostQ: 3,
  },
};

// LocalStorage keys for phase and low-end settings
const PHASE_SETTINGS_KEY = "synth-osc-phase-settings";
const LOW_END_SETTINGS_KEY = "synth-low-end-settings";

// Phase settings persistence
export function loadOscPhaseSettings(): OscPhaseSettings {
  try {
    const stored = localStorage.getItem(PHASE_SETTINGS_KEY);
    if (stored) {
      return { ...defaultOscPhaseSettings, ...JSON.parse(stored) };
    }
  } catch {
    // Fall through to default
  }
  return { ...defaultOscPhaseSettings };
}

export function saveOscPhaseSettings(settings: OscPhaseSettings) {
  localStorage.setItem(PHASE_SETTINGS_KEY, JSON.stringify(settings));
}

// Low-end settings persistence
export function loadLowEndSettings(): LowEndSettings {
  try {
    const stored = localStorage.getItem(LOW_END_SETTINGS_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return {
        ...defaultLowEndSettings,
        ...parsed,
        subHarmonic: { ...defaultLowEndSettings.subHarmonic, ...parsed.subHarmonic },
        bassExciter: { ...defaultLowEndSettings.bassExciter, ...parsed.bassExciter },
        subEQ: { ...defaultLowEndSettings.subEQ, ...parsed.subEQ },
      };
    }
  } catch {
    // Fall through to default
  }
  return { ...defaultLowEndSettings };
}

export function saveLowEndSettings(settings: LowEndSettings) {
  localStorage.setItem(LOW_END_SETTINGS_KEY, JSON.stringify(settings));
}

// Randomization for low-end settings
export function randomizeLowEndSettings(chaosLevel: number = 50): Partial<LowEndSettings> {
  const chaos = chaosLevel / 100;
  const maybeEnable = (base: number) => Math.random() < base * chaos;
  
  return {
    dcFilterEnabled: true, // Always keep DC filter on for safety
    dcFilterFreq: 3 + Math.floor(Math.random() * 7), // 3-10 Hz
    
    monoSumEnabled: maybeEnable(0.4),
    monoSumFreq: 80 + Math.floor(Math.random() * 100), // 80-180 Hz
    monoSumWidth: 30 + Math.floor(Math.random() * 50),
    
    subHarmonic: {
      enabled: maybeEnable(0.35),
      octaveDown1: 15 + Math.floor(Math.random() * 45 * chaos),
      octaveDown2: 5 + Math.floor(Math.random() * 30 * chaos),
      filterFreq: 40 + Math.floor(Math.random() * 80),
      drive: Math.floor(Math.random() * 40 * chaos),
    },
    
    bassExciter: {
      enabled: maybeEnable(0.3),
      frequency: 50 + Math.floor(Math.random() * 80),
      harmonics: 20 + Math.floor(Math.random() * 50 * chaos),
      subOctave: 10 + Math.floor(Math.random() * 40 * chaos),
      presence: 15 + Math.floor(Math.random() * 40 * chaos),
      mix: 30 + Math.floor(Math.random() * 40),
    },
    
    subEQ: {
      enabled: maybeEnable(0.4),
      lowShelfFreq: 40 + Math.floor(Math.random() * 60),
      lowShelfGain: -3 + Math.floor(Math.random() * 9),
      lowShelfQ: 0.5 + Math.random() * 1.0,
      subBoostFreq: 30 + Math.floor(Math.random() * 40),
      subBoostGain: Math.floor(Math.random() * 8 * chaos),
      subBoostQ: 2 + Math.floor(Math.random() * 4),
    },
  };
}

// ============ ADVANCED WAVESHAPER SETTINGS ============

export type WaveshaperBandCurve = "softclip" | "hardclip" | "foldback" | "sinefold" | "chebyshev" | "asymmetric" | "tube" | "rectifier" | "sinecrush";

export interface MultibandSettings {
  enabled: boolean;
  lowCrossover: number; // Hz (20-500)
  highCrossover: number; // Hz (1000-10000)
  lowCurve: WaveshaperBandCurve;
  midCurve: WaveshaperBandCurve;
  highCurve: WaveshaperBandCurve;
  lowDrive: number; // 0-100
  midDrive: number; // 0-100
  highDrive: number; // 0-100
}

export interface AdvancedWaveshaperSettings {
  // Asymmetric shaping
  asymmetricEnabled: boolean;
  positiveCurve: WaveshaperBandCurve;
  negativeCurve: WaveshaperBandCurve;
  positiveAmount: number; // 0-100
  negativeAmount: number; // 0-100
  dcOffset: number; // -50 to 50
  
  // Multi-band waveshaping
  multiband: MultibandSettings;
  
  // Dynamic shaping
  dynamicEnabled: boolean;
  dynamicSensitivity: number; // 0-100
  dynamicAttack: number; // 1-500 ms
  dynamicRelease: number; // 10-2000 ms
  
  // Additional curve parameters
  chebyshevOrder: number; // 2-7
  foldbackIterations: number; // 1-5
  
  // Custom curve (control points for spline)
  customCurveEnabled: boolean;
  customCurvePoints: { x: number; y: number }[]; // normalized -1 to 1
}

export const defaultAdvancedWaveshaperSettings: AdvancedWaveshaperSettings = {
  asymmetricEnabled: false,
  positiveCurve: "softclip",
  negativeCurve: "hardclip",
  positiveAmount: 50,
  negativeAmount: 50,
  dcOffset: 0,
  
  multiband: {
    enabled: false,
    lowCrossover: 200,
    highCrossover: 3000,
    lowCurve: "tube",
    midCurve: "softclip",
    highCurve: "sinefold",
    lowDrive: 40,
    midDrive: 30,
    highDrive: 50,
  },
  
  dynamicEnabled: false,
  dynamicSensitivity: 50,
  dynamicAttack: 10,
  dynamicRelease: 200,
  
  chebyshevOrder: 3,
  foldbackIterations: 2,
  
  customCurveEnabled: false,
  customCurvePoints: [
    { x: -1, y: -1 },
    { x: -0.5, y: -0.4 },
    { x: 0, y: 0 },
    { x: 0.5, y: 0.4 },
    { x: 1, y: 1 },
  ],
};

// LocalStorage keys for new settings
const FILTER_SETTINGS_KEY = "synth-advanced-filter-settings";
const WAVESHAPER_SETTINGS_KEY = "synth-advanced-waveshaper-settings";

// Filter settings persistence
export function loadAdvancedFilterSettings(): AdvancedFilterSettings {
  try {
    const stored = localStorage.getItem(FILTER_SETTINGS_KEY);
    if (stored) {
      return { ...defaultAdvancedFilterSettings, ...JSON.parse(stored) };
    }
  } catch {
    // Fall through to default
  }
  return { ...defaultAdvancedFilterSettings };
}

export function saveAdvancedFilterSettings(settings: AdvancedFilterSettings) {
  localStorage.setItem(FILTER_SETTINGS_KEY, JSON.stringify(settings));
}

// Waveshaper settings persistence
export function loadAdvancedWaveshaperSettings(): AdvancedWaveshaperSettings {
  try {
    const stored = localStorage.getItem(WAVESHAPER_SETTINGS_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return {
        ...defaultAdvancedWaveshaperSettings,
        ...parsed,
        multiband: { ...defaultAdvancedWaveshaperSettings.multiband, ...parsed.multiband },
      };
    }
  } catch {
    // Fall through to default
  }
  return { ...defaultAdvancedWaveshaperSettings };
}

export function saveAdvancedWaveshaperSettings(settings: AdvancedWaveshaperSettings) {
  localStorage.setItem(WAVESHAPER_SETTINGS_KEY, JSON.stringify(settings));
}

// Randomization functions with sensible ranges for one-shots
export function randomizeAdvancedFilterSettings(chaosLevel: number = 50): Partial<AdvancedFilterSettings> {
  const chaos = chaosLevel / 100;
  const maybeEnable = (base: number) => Math.random() < base * chaos;
  
  return {
    driveEnabled: maybeEnable(0.4),
    driveAmount: Math.floor(10 + Math.random() * 60 * chaos),
    driveType: ["soft", "hard", "tube", "tape"][Math.floor(Math.random() * 4)] as FilterDriveType,
    drivePosition: Math.random() > 0.5 ? "pre" : "post",
    
    dualMode: maybeEnable(0.3) ? (Math.random() > 0.5 ? "series" : "parallel") : "off",
    filter2Type: ["lowpass", "highpass", "bandpass", "notch"][Math.floor(Math.random() * 4)] as any,
    filter2Frequency: Math.exp(Math.random() * (Math.log(10000) - Math.log(100)) + Math.log(100)),
    filter2Resonance: Math.random() * 15,
    dualMix: 30 + Math.random() * 40,
    
    formantEnabled: maybeEnable(0.2),
    formantVowel: ["A", "E", "I", "O", "U"][Math.floor(Math.random() * 5)] as FormantVowel,
    formantMix: 30 + Math.random() * 50,
    
    fmEnabled: maybeEnable(0.25),
    fmSource: ["osc1", "osc2", "osc3", "lfo"][Math.floor(Math.random() * 4)] as any,
    fmDepth: Math.floor(10 + Math.random() * 50 * chaos),
    
    keytrackEnabled: maybeEnable(0.3),
    keytrackAmount: Math.floor(-50 + Math.random() * 100),
    
    selfOscillation: maybeEnable(0.1),
  };
}

export function randomizeAdvancedWaveshaperSettings(chaosLevel: number = 50): Partial<AdvancedWaveshaperSettings> {
  const chaos = chaosLevel / 100;
  const maybeEnable = (base: number) => Math.random() < base * chaos;
  const curves: WaveshaperBandCurve[] = ["softclip", "hardclip", "foldback", "sinefold", "chebyshev", "tube", "rectifier"];
  const randomCurve = () => curves[Math.floor(Math.random() * curves.length)];
  
  return {
    asymmetricEnabled: maybeEnable(0.4),
    positiveCurve: randomCurve(),
    negativeCurve: randomCurve(),
    positiveAmount: 30 + Math.floor(Math.random() * 50),
    negativeAmount: 30 + Math.floor(Math.random() * 50),
    dcOffset: Math.floor(-20 + Math.random() * 40) * chaos,
    
    multiband: {
      enabled: maybeEnable(0.3),
      lowCrossover: 100 + Math.floor(Math.random() * 200),
      highCrossover: 2000 + Math.floor(Math.random() * 4000),
      lowCurve: randomCurve(),
      midCurve: randomCurve(),
      highCurve: randomCurve(),
      lowDrive: 20 + Math.floor(Math.random() * 60),
      midDrive: 20 + Math.floor(Math.random() * 50),
      highDrive: 20 + Math.floor(Math.random() * 70),
    },
    
    dynamicEnabled: maybeEnable(0.25),
    dynamicSensitivity: 30 + Math.floor(Math.random() * 50),
    dynamicAttack: 5 + Math.floor(Math.random() * 50),
    dynamicRelease: 50 + Math.floor(Math.random() * 300),
    
    chebyshevOrder: 2 + Math.floor(Math.random() * 5),
    foldbackIterations: 1 + Math.floor(Math.random() * 3),
  };
}

// ============ ADVANCED SPECTRAL EFFECTS ============

// Spectral Tilt - shift energy from low to high frequencies (or vice versa)
export interface SpectralTiltSettings {
  enabled: boolean;
  amount: number; // -100 to 100 (-100 = bass emphasis, +100 = treble emphasis)
  envelopeFollow: boolean; // tilt changes over time based on amplitude envelope
  envelopeAmount: number; // how much the envelope affects tilt (-100 to 100)
}

// Spectral Blur - smear frequency bins over time for washy textures
export interface SpectralBlurSettings {
  enabled: boolean;
  amount: number; // 0-100 (how many neighboring bins to average)
  timeSmear: number; // 0-100 (how much bins smear over time)
  asymmetric: boolean; // blur more upward or downward
  direction: number; // -100 to 100 (negative = downward smear, positive = upward)
}

// Harmonic Resynthesis - selectively boost/attenuate harmonics
export interface HarmonicResynthSettings {
  enabled: boolean;
  fundamentalDetect: boolean; // auto-detect fundamental from oscillator pitch
  manualFundamental: number; // Hz (20-500) used if fundamentalDetect is false
  harmonicsMode: "odd" | "even" | "all" | "prime"; // which harmonics to emphasize
  harmonicSpread: number; // 0-100 (tolerance for harmonic detection)
  harmonicBoost: number; // -24 to 24 dB (boost/cut for harmonics)
  inharmonicCut: number; // -48 to 0 dB (how much to cut non-harmonic content)
  harmonicDecay: number; // 0-100 (higher harmonics decay faster)
}

export interface AdvancedSpectralSettings {
  tilt: SpectralTiltSettings;
  blur: SpectralBlurSettings;
  harmonicResynth: HarmonicResynthSettings;
}

export const defaultAdvancedSpectralSettings: AdvancedSpectralSettings = {
  tilt: {
    enabled: false,
    amount: 0,
    envelopeFollow: false,
    envelopeAmount: 0,
  },
  blur: {
    enabled: false,
    amount: 20,
    timeSmear: 30,
    asymmetric: false,
    direction: 0,
  },
  harmonicResynth: {
    enabled: false,
    fundamentalDetect: true,
    manualFundamental: 110,
    harmonicsMode: "all",
    harmonicSpread: 10,
    harmonicBoost: 6,
    inharmonicCut: -12,
    harmonicDecay: 30,
  },
};

// LocalStorage key for spectral settings
const SPECTRAL_SETTINGS_KEY = "synth-advanced-spectral-settings";

// Spectral settings persistence
export function loadAdvancedSpectralSettings(): AdvancedSpectralSettings {
  try {
    const stored = localStorage.getItem(SPECTRAL_SETTINGS_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return {
        tilt: { ...defaultAdvancedSpectralSettings.tilt, ...parsed.tilt },
        blur: { ...defaultAdvancedSpectralSettings.blur, ...parsed.blur },
        harmonicResynth: { ...defaultAdvancedSpectralSettings.harmonicResynth, ...parsed.harmonicResynth },
      };
    }
  } catch {
    // Fall through to default
  }
  return { ...defaultAdvancedSpectralSettings };
}

export function saveAdvancedSpectralSettings(settings: AdvancedSpectralSettings) {
  localStorage.setItem(SPECTRAL_SETTINGS_KEY, JSON.stringify(settings));
}

// Randomization for spectral effects
export function randomizeAdvancedSpectralSettings(chaosLevel: number = 50): Partial<AdvancedSpectralSettings> {
  const chaos = chaosLevel / 100;
  const maybeEnable = (base: number) => Math.random() < base * chaos;
  const harmonicModes: ("odd" | "even" | "all" | "prime")[] = ["odd", "even", "all", "prime"];
  
  return {
    tilt: {
      enabled: maybeEnable(0.35),
      amount: Math.floor(-60 + Math.random() * 120 * chaos), // -60 to +60
      envelopeFollow: maybeEnable(0.4),
      envelopeAmount: Math.floor(-40 + Math.random() * 80 * chaos),
    },
    blur: {
      enabled: maybeEnable(0.3),
      amount: 5 + Math.floor(Math.random() * 50 * chaos),
      timeSmear: 10 + Math.floor(Math.random() * 60 * chaos),
      asymmetric: maybeEnable(0.3),
      direction: Math.floor(-50 + Math.random() * 100 * chaos),
    },
    harmonicResynth: {
      enabled: maybeEnable(0.25),
      fundamentalDetect: true,
      manualFundamental: 55 + Math.floor(Math.random() * 200),
      harmonicsMode: harmonicModes[Math.floor(Math.random() * harmonicModes.length)],
      harmonicSpread: 5 + Math.floor(Math.random() * 30),
      harmonicBoost: Math.floor(-6 + Math.random() * 18 * chaos),
      inharmonicCut: Math.floor(-36 + Math.random() * 24 * chaos),
      harmonicDecay: 10 + Math.floor(Math.random() * 60 * chaos),
    },
  };
}
