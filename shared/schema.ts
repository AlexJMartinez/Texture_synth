import { z } from "zod";

export const WaveformType = z.enum(["sine", "triangle", "sawtooth", "square", "noise"]);
export type WaveformType = z.infer<typeof WaveformType>;

export const EnvelopeCurve = z.enum(["linear", "exponential", "logarithmic"]);
export type EnvelopeCurve = z.infer<typeof EnvelopeCurve>;

export const FilterType = z.enum([
  "lowpass", "highpass", "bandpass", "notch", "allpass", "peaking", "lowshelf", "highshelf", "comb"
]);
export type FilterType = z.infer<typeof FilterType>;

export const EnvelopeTarget = z.enum(["amplitude", "filter", "pitch", "osc1", "osc2", "osc3"]);
export type EnvelopeTarget = z.infer<typeof EnvelopeTarget>;

export const ModRatioPreset = z.enum(["0.5", "1", "2", "3", "4", "6", "8", "custom"]);
export type ModRatioPreset = z.infer<typeof ModRatioPreset>;

const OscillatorSchema = z.object({
  enabled: z.boolean(),
  waveform: WaveformType,
  pitch: z.number().min(20).max(20000),
  detune: z.number().min(-100).max(100),
  drift: z.number().min(0).max(100),
  level: z.number().min(0).max(100),
  fmEnabled: z.boolean(),
  fmRatio: z.number().min(0.25).max(16),
  fmRatioPreset: ModRatioPreset,
  fmDepth: z.number().min(0).max(1000),
  fmWaveform: WaveformType,
  fmFeedback: z.number().min(0).max(1),
  amEnabled: z.boolean(),
  amRatio: z.number().min(0.25).max(16),
  amDepth: z.number().min(0).max(100),
  amWaveform: WaveformType,
  pmEnabled: z.boolean(),
  pmRatio: z.number().min(0.25).max(16),
  pmRatioPreset: ModRatioPreset,
  pmDepth: z.number().min(0).max(60),
  pmWaveform: WaveformType,
  pmFeedback: z.number().min(0).max(1),
  indexEnvEnabled: z.boolean(),
  indexEnvDecay: z.number().min(2).max(100),
  indexEnvDepth: z.number().min(0).max(60),
});

const EnvelopeSchema = z.object({
  enabled: z.boolean(),
  attack: z.number().min(0).max(2000),
  hold: z.number().min(0).max(2000),
  decay: z.number().min(0).max(5000),
  curve: EnvelopeCurve,
  target: EnvelopeTarget,
  amount: z.number().min(-100).max(100),
});

const ModalModeSchema = z.object({
  ratio: z.number().min(0.5).max(16),
  decay: z.number().min(10).max(5000),
  level: z.number().min(0).max(100),
});

const ModalSynthSchema = z.object({
  enabled: z.boolean(),
  basePitch: z.number().min(20).max(2000),
  impactNoise: z.number().min(0).max(100),
  impactDecay: z.number().min(1).max(100),
  modes: z.object({
    mode1: ModalModeSchema,
    mode2: ModalModeSchema,
    mode3: ModalModeSchema,
    mode4: ModalModeSchema,
  }),
});

const AdditivePartialSchema = z.object({
  level: z.number().min(0).max(100),
  detune: z.number().min(-100).max(100),
});

const AdditiveSynthSchema = z.object({
  enabled: z.boolean(),
  basePitch: z.number().min(20).max(2000),
  partials: z.object({
    p1: AdditivePartialSchema,
    p2: AdditivePartialSchema,
    p3: AdditivePartialSchema,
    p4: AdditivePartialSchema,
    p5: AdditivePartialSchema,
    p6: AdditivePartialSchema,
    p7: AdditivePartialSchema,
    p8: AdditivePartialSchema,
  }),
  spread: z.number().min(0).max(100),
  decaySlope: z.number().min(0).max(100),
});

const GranularSynthSchema = z.object({
  enabled: z.boolean(),
  density: z.number().min(1).max(100),
  grainSize: z.number().min(5).max(200),
  pitch: z.number().min(20).max(2000),
  pitchSpray: z.number().min(0).max(100),
  scatter: z.number().min(0).max(100),
  texture: z.enum(["noise", "sine", "saw", "click"]),
});

const ClickLayerSchema = z.object({
  enabled: z.boolean(),
  level: z.number().min(0).max(100),
  decay: z.number().min(1).max(10),
  filterType: z.enum(["highpass", "bandpass"]),
  filterFreq: z.number().min(1000).max(15000),
  filterQ: z.number().min(1).max(10),
  srrEnabled: z.boolean(),
  srrAmount: z.number().min(1).max(16),
  noiseType: z.enum(["white", "pink", "brown"]),
});

export const SubWaveformType = z.enum(["sine", "triangle"]);
export type SubWaveformType = z.infer<typeof SubWaveformType>;

const SubOscillatorSchema = z.object({
  enabled: z.boolean(),
  waveform: SubWaveformType,
  octave: z.number().min(-2).max(0),
  level: z.number().min(0).max(100),
  attack: z.number().min(0).max(100),
  decay: z.number().min(10).max(2000),
  filterEnabled: z.boolean(),
  filterFreq: z.number().min(20).max(200),
});

const SaturationChainSchema = z.object({
  enabled: z.boolean(),
  tapeEnabled: z.boolean(),
  tapeDrive: z.number().min(0).max(100),
  tapeWarmth: z.number().min(0).max(100),
  tubeEnabled: z.boolean(),
  tubeDrive: z.number().min(0).max(100),
  tubeBias: z.number().min(0).max(100),
  transistorEnabled: z.boolean(),
  transistorDrive: z.number().min(0).max(100),
  transistorAsymmetry: z.number().min(0).max(100),
  mix: z.number().min(0).max(100),
});

const MasteringSchema = z.object({
  compressorEnabled: z.boolean(),
  compressorThreshold: z.number().min(-40).max(0),
  compressorRatio: z.number().min(1).max(20),
  compressorAttack: z.number().min(0.1).max(100),
  compressorRelease: z.number().min(10).max(1000),
  compressorKnee: z.number().min(0).max(40),
  compressorMakeup: z.number().min(0).max(24),
  exciterEnabled: z.boolean(),
  exciterFreq: z.number().min(2000).max(12000),
  exciterAmount: z.number().min(0).max(100),
  exciterMix: z.number().min(0).max(100),
  stereoEnabled: z.boolean(),
  stereoWidth: z.number().min(0).max(200),
});

export const WaveshaperCurve = z.enum([
  "softclip", "hardclip", "foldback", "sinefold", "chebyshev", "asymmetric", "tube"
]);
export type WaveshaperCurve = z.infer<typeof WaveshaperCurve>;

const WaveshaperSchema = z.object({
  enabled: z.boolean(),
  curve: WaveshaperCurve,
  drive: z.number().min(0).max(100),
  mix: z.number().min(0).max(100),
  preFilterFreq: z.number().min(20).max(20000),
  preFilterEnabled: z.boolean(),
  postFilterFreq: z.number().min(20).max(20000),
  postFilterEnabled: z.boolean(),
  oversample: z.enum(["none", "2x", "4x"]),
});

const ConvolverSchema = z.object({
  enabled: z.boolean(),
  irName: z.string(),
  mix: z.number().min(0).max(100),
  useCustomIR: z.boolean(),
});

export const SynthParametersSchema = z.object({
  oscillators: z.object({
    osc1: OscillatorSchema,
    osc2: OscillatorSchema,
    osc3: OscillatorSchema,
  }),
  
  envelopes: z.object({
    env1: EnvelopeSchema,
    env2: EnvelopeSchema,
    env3: EnvelopeSchema,
  }),
  
  filter: z.object({
    enabled: z.boolean(),
    frequency: z.number().min(20).max(20000),
    resonance: z.number().min(0).max(30),
    type: FilterType,
    combDelay: z.number().min(0.1).max(50),
    gain: z.number().min(-24).max(24),
  }),
  
  modal: ModalSynthSchema,
  
  additive: AdditiveSynthSchema,
  
  granular: GranularSynthSchema,
  
  clickLayer: ClickLayerSchema,
  
  subOsc: SubOscillatorSchema,
  
  saturationChain: SaturationChainSchema,
  
  mastering: MasteringSchema,
  
  waveshaper: WaveshaperSchema,
  
  convolver: ConvolverSchema,
  
  effects: z.object({
    saturation: z.number().min(0).max(100),
    bitcrusher: z.number().min(1).max(16),
    delayEnabled: z.boolean(),
    delayTime: z.number().min(0).max(2000),
    delayFeedback: z.number().min(0).max(95),
    delayMix: z.number().min(0).max(100),
    reverbEnabled: z.boolean(),
    reverbSize: z.number().min(0).max(100),
    reverbMix: z.number().min(0).max(100),
    reverbDecay: z.number().min(0.1).max(10),
    chorusEnabled: z.boolean(),
    chorusRate: z.number().min(0.1).max(10),
    chorusDepth: z.number().min(0).max(100),
    chorusMix: z.number().min(0).max(100),
    transientEnabled: z.boolean(),
    transientAttack: z.number().min(-100).max(100),
    transientSustain: z.number().min(-100).max(100),
    limiterEnabled: z.boolean(),
    limiterThreshold: z.number().min(-30).max(0),
    limiterRelease: z.number().min(10).max(500),
    multibandEnabled: z.boolean(),
    multibandLowFreq: z.number().min(80).max(400),
    multibandHighFreq: z.number().min(2000).max(10000),
    multibandLowDrive: z.number().min(0).max(100),
    multibandMidDrive: z.number().min(0).max(100),
    multibandHighDrive: z.number().min(0).max(100),
  }),
  
  output: z.object({
    volume: z.number().min(0).max(100),
    pan: z.number().min(-100).max(100),
  }),
});

export type SynthParameters = z.infer<typeof SynthParametersSchema>;
export type Oscillator = z.infer<typeof OscillatorSchema>;
export type Envelope = z.infer<typeof EnvelopeSchema>;
export type ModalMode = z.infer<typeof ModalModeSchema>;
export type ModalSynth = z.infer<typeof ModalSynthSchema>;
export type AdditivePartial = z.infer<typeof AdditivePartialSchema>;
export type AdditiveSynth = z.infer<typeof AdditiveSynthSchema>;
export type GranularSynth = z.infer<typeof GranularSynthSchema>;
export type GranularTexture = GranularSynth["texture"];
export type ClickLayer = z.infer<typeof ClickLayerSchema>;
export type NoiseType = ClickLayer["noiseType"];
export type SubOscillator = z.infer<typeof SubOscillatorSchema>;
export type SaturationChain = z.infer<typeof SaturationChainSchema>;
export type Mastering = z.infer<typeof MasteringSchema>;
export type Waveshaper = z.infer<typeof WaveshaperSchema>;
export type Convolver = z.infer<typeof ConvolverSchema>;

export const PresetSchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(50),
  parameters: SynthParametersSchema,
  createdAt: z.number(),
});

export type Preset = z.infer<typeof PresetSchema>;

export const ExportSettingsSchema = z.object({
  sampleRate: z.enum(["44100", "48000"]),
  channels: z.enum(["mono", "stereo"]),
  duration: z.number().min(100).max(10000),
  normalize: z.boolean(),
});

export type ExportSettings = z.infer<typeof ExportSettingsSchema>;

const defaultOscillator: Oscillator = {
  enabled: true,
  waveform: "sine",
  pitch: 440,
  detune: 0,
  drift: 0,
  level: 100,
  fmEnabled: false,
  fmRatio: 2,
  fmRatioPreset: "2",
  fmDepth: 100,
  fmWaveform: "sine",
  fmFeedback: 0,
  amEnabled: false,
  amRatio: 1,
  amDepth: 50,
  amWaveform: "sine",
  pmEnabled: false,
  pmRatio: 2,
  pmRatioPreset: "2",
  pmDepth: 10,
  pmWaveform: "sine",
  pmFeedback: 0,
  indexEnvEnabled: false,
  indexEnvDecay: 15,
  indexEnvDepth: 20,
};

const defaultClickLayer: ClickLayer = {
  enabled: false,
  level: 70,
  decay: 3,
  filterType: "highpass",
  filterFreq: 5000,
  filterQ: 3,
  srrEnabled: false,
  srrAmount: 8,
  noiseType: "white",
};

const defaultSubOsc: SubOscillator = {
  enabled: false,
  waveform: "sine",
  octave: -1,
  level: 60,
  attack: 0,
  decay: 300,
  filterEnabled: false,
  filterFreq: 80,
};

const defaultSaturationChain: SaturationChain = {
  enabled: false,
  tapeEnabled: true,
  tapeDrive: 30,
  tapeWarmth: 40,
  tubeEnabled: false,
  tubeDrive: 20,
  tubeBias: 50,
  transistorEnabled: false,
  transistorDrive: 40,
  transistorAsymmetry: 30,
  mix: 100,
};

const defaultMastering: Mastering = {
  compressorEnabled: true,
  compressorThreshold: -12,
  compressorRatio: 4,
  compressorAttack: 5,
  compressorRelease: 100,
  compressorKnee: 6,
  compressorMakeup: 3,
  exciterEnabled: true,
  exciterFreq: 6000,
  exciterAmount: 30,
  exciterMix: 50,
  stereoEnabled: false,
  stereoWidth: 100,
};

const defaultEnvelope: Envelope = {
  enabled: true,
  attack: 2,
  hold: 20,
  decay: 200,
  curve: "exponential",
  target: "amplitude",
  amount: 100,
};

const defaultWaveshaper: Waveshaper = {
  enabled: false,
  curve: "tube",
  drive: 50,
  mix: 100,
  preFilterFreq: 200,
  preFilterEnabled: false,
  postFilterFreq: 8000,
  postFilterEnabled: false,
  oversample: "4x",
};

const defaultConvolver: Convolver = {
  enabled: false,
  irName: "none",
  mix: 50,
  useCustomIR: false,
};

export const defaultSynthParameters: SynthParameters = {
  oscillators: {
    osc1: { ...defaultOscillator, enabled: true },
    osc2: { ...defaultOscillator, enabled: false, pitch: 880, waveform: "triangle", level: 50 },
    osc3: { ...defaultOscillator, enabled: false, pitch: 220, waveform: "sawtooth", level: 30 },
  },
  envelopes: {
    env1: { ...defaultEnvelope, target: "amplitude", enabled: true },
    env2: { ...defaultEnvelope, target: "filter", enabled: false, amount: 50 },
    env3: { ...defaultEnvelope, target: "pitch", enabled: false, amount: 25 },
  },
  filter: {
    enabled: false,
    frequency: 2000,
    resonance: 5,
    type: "lowpass",
    combDelay: 5,
    gain: 0,
  },
  modal: {
    enabled: false,
    basePitch: 440,
    impactNoise: 50,
    impactDecay: 20,
    modes: {
      mode1: { ratio: 1, decay: 500, level: 100 },
      mode2: { ratio: 2.76, decay: 400, level: 60 },
      mode3: { ratio: 5.4, decay: 300, level: 40 },
      mode4: { ratio: 8.93, decay: 200, level: 25 },
    },
  },
  additive: {
    enabled: false,
    basePitch: 220,
    partials: {
      p1: { level: 100, detune: 0 },
      p2: { level: 50, detune: 0 },
      p3: { level: 33, detune: 0 },
      p4: { level: 25, detune: 0 },
      p5: { level: 20, detune: 0 },
      p6: { level: 17, detune: 0 },
      p7: { level: 14, detune: 0 },
      p8: { level: 12, detune: 0 },
    },
    spread: 0,
    decaySlope: 0,
  },
  granular: {
    enabled: false,
    density: 30,
    grainSize: 50,
    pitch: 440,
    pitchSpray: 20,
    scatter: 30,
    texture: "noise",
  },
  clickLayer: { ...defaultClickLayer },
  subOsc: { ...defaultSubOsc },
  saturationChain: { ...defaultSaturationChain },
  mastering: { ...defaultMastering },
  waveshaper: { ...defaultWaveshaper },
  convolver: { ...defaultConvolver },
  effects: {
    saturation: 20,
    bitcrusher: 16,
    delayEnabled: false,
    delayTime: 250,
    delayFeedback: 30,
    delayMix: 30,
    reverbEnabled: false,
    reverbSize: 50,
    reverbMix: 20,
    reverbDecay: 2,
    chorusEnabled: false,
    chorusRate: 1.5,
    chorusDepth: 50,
    chorusMix: 30,
    transientEnabled: true,
    transientAttack: 50,
    transientSustain: -20,
    limiterEnabled: true,
    limiterThreshold: -6,
    limiterRelease: 50,
    multibandEnabled: false,
    multibandLowFreq: 200,
    multibandHighFreq: 4000,
    multibandLowDrive: 0,
    multibandMidDrive: 0,
    multibandHighDrive: 0,
  },
  output: {
    volume: 75,
    pan: 0,
  },
};

export const defaultExportSettings: ExportSettings = {
  sampleRate: "44100",
  channels: "mono",
  duration: 1000,
  normalize: true,
};

const defaultFmOsc = { 
  fmEnabled: false, 
  fmRatio: 2, 
  fmRatioPreset: "2" as const,
  fmDepth: 100, 
  fmWaveform: "sine" as const,
  fmFeedback: 0,
};
const defaultAmOsc = { amEnabled: false, amRatio: 1, amDepth: 50, amWaveform: "sine" as const };
const defaultPmOsc = {
  pmEnabled: false,
  pmRatio: 2,
  pmRatioPreset: "2" as const,
  pmDepth: 10,
  pmWaveform: "sine" as const,
  pmFeedback: 0,
  indexEnvEnabled: false,
  indexEnvDecay: 15,
  indexEnvDepth: 20,
};
const defaultModOsc = { ...defaultFmOsc, ...defaultAmOsc, ...defaultPmOsc };

export const factoryPresets: Omit<Preset, "id" | "createdAt">[] = [
  {
    name: "Soft Pluck",
    parameters: {
      ...defaultSynthParameters,
      oscillators: {
        osc1: { enabled: true, waveform: "triangle", pitch: 880, detune: 0, drift: 5, level: 100, ...defaultModOsc },
        osc2: { enabled: false, waveform: "sine", pitch: 440, detune: 0, drift: 0, level: 50, ...defaultModOsc },
        osc3: { enabled: false, waveform: "sine", pitch: 220, detune: 0, drift: 0, level: 30, ...defaultModOsc },
      },
      envelopes: {
        env1: { enabled: true, attack: 5, hold: 20, decay: 300, curve: "exponential", target: "amplitude", amount: 100 },
        env2: { enabled: false, attack: 10, hold: 0, decay: 200, curve: "exponential", target: "filter", amount: 50 },
        env3: { enabled: false, attack: 10, hold: 50, decay: 500, curve: "exponential", target: "pitch", amount: 25 },
      },
    },
  },
  {
    name: "Deep Bass",
    parameters: {
      ...defaultSynthParameters,
      oscillators: {
        osc1: { enabled: true, waveform: "sawtooth", pitch: 55, detune: 0, drift: 0, level: 100, ...defaultModOsc },
        osc2: { enabled: true, waveform: "square", pitch: 55, detune: 5, drift: 0, level: 60, ...defaultModOsc },
        osc3: { enabled: false, waveform: "sine", pitch: 110, detune: 0, drift: 0, level: 30, ...defaultModOsc },
      },
      envelopes: {
        env1: { enabled: true, attack: 20, hold: 100, decay: 800, curve: "linear", target: "amplitude", amount: 100 },
        env2: { enabled: true, attack: 5, hold: 50, decay: 400, curve: "exponential", target: "filter", amount: 80 },
        env3: { enabled: false, attack: 10, hold: 50, decay: 500, curve: "exponential", target: "pitch", amount: 25 },
      },
      filter: { enabled: true, frequency: 400, resonance: 8, type: "lowpass", combDelay: 5, gain: 0 },
    },
  },
  {
    name: "Sharp Click",
    parameters: {
      ...defaultSynthParameters,
      oscillators: {
        osc1: { enabled: true, waveform: "square", pitch: 1200, detune: 0, drift: 10, level: 100, ...defaultModOsc },
        osc2: { enabled: false, waveform: "sine", pitch: 440, detune: 0, drift: 0, level: 50, ...defaultModOsc },
        osc3: { enabled: false, waveform: "sine", pitch: 220, detune: 0, drift: 0, level: 30, ...defaultModOsc },
      },
      envelopes: {
        env1: { enabled: true, attack: 0, hold: 5, decay: 50, curve: "exponential", target: "amplitude", amount: 100 },
        env2: { enabled: false, attack: 10, hold: 50, decay: 500, curve: "exponential", target: "filter", amount: 50 },
        env3: { enabled: false, attack: 10, hold: 50, decay: 500, curve: "exponential", target: "pitch", amount: 25 },
      },
      effects: { ...defaultSynthParameters.effects, saturation: 30 },
    },
  },
  {
    name: "Warm Pad",
    parameters: {
      ...defaultSynthParameters,
      oscillators: {
        osc1: { enabled: true, waveform: "sine", pitch: 330, detune: 5, drift: 15, level: 100, ...defaultModOsc },
        osc2: { enabled: true, waveform: "triangle", pitch: 660, detune: -3, drift: 10, level: 40, ...defaultModOsc },
        osc3: { enabled: true, waveform: "sine", pitch: 165, detune: 0, drift: 5, level: 50, ...defaultModOsc },
      },
      envelopes: {
        env1: { enabled: true, attack: 200, hold: 300, decay: 1500, curve: "logarithmic", target: "amplitude", amount: 100 },
        env2: { enabled: false, attack: 10, hold: 50, decay: 500, curve: "exponential", target: "filter", amount: 50 },
        env3: { enabled: false, attack: 10, hold: 50, decay: 500, curve: "exponential", target: "pitch", amount: 25 },
      },
      filter: { enabled: true, frequency: 1500, resonance: 3, type: "lowpass", combDelay: 5, gain: 0 },
      effects: { ...defaultSynthParameters.effects, reverbEnabled: true, reverbSize: 60, reverbMix: 30, reverbDecay: 3 },
    },
  },
  {
    name: "Dirty Synth",
    parameters: {
      ...defaultSynthParameters,
      oscillators: {
        osc1: { enabled: true, waveform: "sawtooth", pitch: 220, detune: 10, drift: 20, level: 100, ...defaultModOsc },
        osc2: { enabled: true, waveform: "square", pitch: 221, detune: -5, drift: 15, level: 70, ...defaultModOsc },
        osc3: { enabled: false, waveform: "sine", pitch: 220, detune: 0, drift: 0, level: 30, ...defaultModOsc },
      },
      envelopes: {
        env1: { enabled: true, attack: 10, hold: 50, decay: 400, curve: "linear", target: "amplitude", amount: 100 },
        env2: { enabled: false, attack: 10, hold: 50, decay: 500, curve: "exponential", target: "filter", amount: 50 },
        env3: { enabled: false, attack: 10, hold: 50, decay: 500, curve: "exponential", target: "pitch", amount: 25 },
      },
      effects: { ...defaultSynthParameters.effects, saturation: 60, bitcrusher: 8 },
    },
  },
  {
    name: "Comb Pluck",
    parameters: {
      ...defaultSynthParameters,
      oscillators: {
        osc1: { enabled: true, waveform: "sawtooth", pitch: 440, detune: 0, drift: 0, level: 100, ...defaultModOsc },
        osc2: { enabled: false, waveform: "sine", pitch: 440, detune: 0, drift: 0, level: 50, ...defaultModOsc },
        osc3: { enabled: false, waveform: "sine", pitch: 220, detune: 0, drift: 0, level: 30, ...defaultModOsc },
      },
      envelopes: {
        env1: { enabled: true, attack: 0, hold: 10, decay: 200, curve: "exponential", target: "amplitude", amount: 100 },
        env2: { enabled: true, attack: 0, hold: 5, decay: 150, curve: "exponential", target: "filter", amount: 90 },
        env3: { enabled: false, attack: 10, hold: 50, decay: 500, curve: "exponential", target: "pitch", amount: 25 },
      },
      filter: { enabled: true, frequency: 800, resonance: 15, type: "comb", combDelay: 2.27, gain: 0 },
    },
  },
  {
    name: "Space Delay",
    parameters: {
      ...defaultSynthParameters,
      oscillators: {
        osc1: { enabled: true, waveform: "triangle", pitch: 660, detune: 0, drift: 5, level: 100, ...defaultModOsc },
        osc2: { enabled: false, waveform: "sine", pitch: 440, detune: 0, drift: 0, level: 50, ...defaultModOsc },
        osc3: { enabled: false, waveform: "sine", pitch: 220, detune: 0, drift: 0, level: 30, ...defaultModOsc },
      },
      envelopes: {
        env1: { enabled: true, attack: 5, hold: 30, decay: 150, curve: "exponential", target: "amplitude", amount: 100 },
        env2: { enabled: false, attack: 10, hold: 50, decay: 500, curve: "exponential", target: "filter", amount: 50 },
        env3: { enabled: false, attack: 10, hold: 50, decay: 500, curve: "exponential", target: "pitch", amount: 25 },
      },
      effects: { ...defaultSynthParameters.effects, delayEnabled: true, delayTime: 375, delayFeedback: 50, delayMix: 40 },
    },
  },
  {
    name: "Chorus Strings",
    parameters: {
      ...defaultSynthParameters,
      oscillators: {
        osc1: { enabled: true, waveform: "sawtooth", pitch: 220, detune: 0, drift: 8, level: 100, ...defaultModOsc },
        osc2: { enabled: true, waveform: "sawtooth", pitch: 220, detune: 7, drift: 8, level: 80, ...defaultModOsc },
        osc3: { enabled: true, waveform: "sawtooth", pitch: 220, detune: -7, drift: 8, level: 80, ...defaultModOsc },
      },
      envelopes: {
        env1: { enabled: true, attack: 150, hold: 200, decay: 800, curve: "logarithmic", target: "amplitude", amount: 100 },
        env2: { enabled: false, attack: 10, hold: 50, decay: 500, curve: "exponential", target: "filter", amount: 50 },
        env3: { enabled: false, attack: 10, hold: 50, decay: 500, curve: "exponential", target: "pitch", amount: 25 },
      },
      filter: { enabled: true, frequency: 3000, resonance: 2, type: "lowpass", combDelay: 5, gain: 0 },
      effects: { ...defaultSynthParameters.effects, chorusEnabled: true, chorusRate: 0.8, chorusDepth: 40, chorusMix: 35 },
    },
  },
  {
    name: "FM Bell",
    parameters: {
      ...defaultSynthParameters,
      oscillators: {
        osc1: { enabled: true, waveform: "sine", pitch: 440, detune: 0, drift: 0, level: 100, fmEnabled: true, fmRatio: 3.5, fmRatioPreset: "custom" as const, fmDepth: 400, fmWaveform: "sine", fmFeedback: 0, ...defaultAmOsc, ...defaultPmOsc },
        osc2: { enabled: false, waveform: "sine", pitch: 440, detune: 0, drift: 0, level: 50, ...defaultModOsc },
        osc3: { enabled: false, waveform: "sine", pitch: 220, detune: 0, drift: 0, level: 30, ...defaultModOsc },
      },
      envelopes: {
        env1: { enabled: true, attack: 0, hold: 50, decay: 2000, curve: "exponential", target: "amplitude", amount: 100 },
        env2: { enabled: false, attack: 10, hold: 50, decay: 500, curve: "exponential", target: "filter", amount: 50 },
        env3: { enabled: false, attack: 10, hold: 50, decay: 500, curve: "exponential", target: "pitch", amount: 25 },
      },
    },
  },
  {
    name: "FM Brass",
    parameters: {
      ...defaultSynthParameters,
      oscillators: {
        osc1: { enabled: true, waveform: "sine", pitch: 220, detune: 0, drift: 5, level: 100, fmEnabled: true, fmRatio: 1, fmRatioPreset: "1" as const, fmDepth: 200, fmWaveform: "sine", fmFeedback: 0, ...defaultAmOsc, ...defaultPmOsc },
        osc2: { enabled: true, waveform: "sine", pitch: 220, detune: 3, drift: 3, level: 60, fmEnabled: true, fmRatio: 2, fmRatioPreset: "2" as const, fmDepth: 150, fmWaveform: "sine", fmFeedback: 0, ...defaultAmOsc, ...defaultPmOsc },
        osc3: { enabled: false, waveform: "sine", pitch: 220, detune: 0, drift: 0, level: 30, ...defaultModOsc },
      },
      envelopes: {
        env1: { enabled: true, attack: 50, hold: 100, decay: 600, curve: "linear", target: "amplitude", amount: 100 },
        env2: { enabled: false, attack: 10, hold: 50, decay: 500, curve: "exponential", target: "filter", amount: 50 },
        env3: { enabled: false, attack: 10, hold: 50, decay: 500, curve: "exponential", target: "pitch", amount: 25 },
      },
      filter: { enabled: true, frequency: 2500, resonance: 4, type: "lowpass", combDelay: 5, gain: 0 },
    },
  },
  {
    name: "AM Tremolo",
    parameters: {
      ...defaultSynthParameters,
      oscillators: {
        osc1: { enabled: true, waveform: "sawtooth", pitch: 200, detune: 0, drift: 0, level: 100, ...defaultFmOsc, amEnabled: true, amRatio: 2.5, amDepth: 80, amWaveform: "sine", ...defaultPmOsc },
        osc2: { enabled: true, waveform: "square", pitch: 200, detune: 5, drift: 0, level: 60, ...defaultFmOsc, amEnabled: true, amRatio: 3.5, amDepth: 60, amWaveform: "triangle", ...defaultPmOsc },
        osc3: { enabled: false, waveform: "sine", pitch: 220, detune: 0, drift: 0, level: 30, ...defaultModOsc },
      },
      envelopes: {
        env1: { enabled: true, attack: 5, hold: 50, decay: 400, curve: "exponential", target: "amplitude", amount: 100 },
        env2: { enabled: false, attack: 10, hold: 50, decay: 500, curve: "exponential", target: "filter", amount: 50 },
        env3: { enabled: false, attack: 10, hold: 50, decay: 500, curve: "exponential", target: "pitch", amount: 25 },
      },
      effects: { ...defaultSynthParameters.effects, saturation: 20 },
    },
  },
  {
    name: "Modal Bell",
    parameters: {
      ...defaultSynthParameters,
      oscillators: {
        osc1: { enabled: false, waveform: "sine", pitch: 440, detune: 0, drift: 0, level: 100, ...defaultModOsc },
        osc2: { enabled: false, waveform: "sine", pitch: 440, detune: 0, drift: 0, level: 50, ...defaultModOsc },
        osc3: { enabled: false, waveform: "sine", pitch: 220, detune: 0, drift: 0, level: 30, ...defaultModOsc },
      },
      envelopes: {
        env1: { enabled: true, attack: 0, hold: 100, decay: 2000, curve: "exponential", target: "amplitude", amount: 100 },
        env2: { enabled: false, attack: 10, hold: 50, decay: 500, curve: "exponential", target: "filter", amount: 50 },
        env3: { enabled: false, attack: 10, hold: 50, decay: 500, curve: "exponential", target: "pitch", amount: 25 },
      },
      modal: {
        enabled: true,
        basePitch: 440,
        impactNoise: 30,
        impactDecay: 15,
        modes: {
          mode1: { ratio: 1, decay: 2000, level: 100 },
          mode2: { ratio: 2.76, decay: 1800, level: 70 },
          mode3: { ratio: 5.4, decay: 1500, level: 50 },
          mode4: { ratio: 8.93, decay: 1200, level: 35 },
        },
      },
      effects: { ...defaultSynthParameters.effects, reverbEnabled: true, reverbMix: 25, reverbDecay: 2.5 },
    },
  },
  {
    name: "Metal Hit",
    parameters: {
      ...defaultSynthParameters,
      oscillators: {
        osc1: { enabled: false, waveform: "sine", pitch: 440, detune: 0, drift: 0, level: 100, ...defaultModOsc },
        osc2: { enabled: false, waveform: "sine", pitch: 440, detune: 0, drift: 0, level: 50, ...defaultModOsc },
        osc3: { enabled: false, waveform: "sine", pitch: 220, detune: 0, drift: 0, level: 30, ...defaultModOsc },
      },
      envelopes: {
        env1: { enabled: true, attack: 0, hold: 20, decay: 800, curve: "exponential", target: "amplitude", amount: 100 },
        env2: { enabled: false, attack: 10, hold: 50, decay: 500, curve: "exponential", target: "filter", amount: 50 },
        env3: { enabled: false, attack: 10, hold: 50, decay: 500, curve: "exponential", target: "pitch", amount: 25 },
      },
      modal: {
        enabled: true,
        basePitch: 180,
        impactNoise: 80,
        impactDecay: 8,
        modes: {
          mode1: { ratio: 1, decay: 600, level: 100 },
          mode2: { ratio: 1.59, decay: 500, level: 85 },
          mode3: { ratio: 2.14, decay: 450, level: 70 },
          mode4: { ratio: 2.83, decay: 400, level: 55 },
        },
      },
      effects: { ...defaultSynthParameters.effects, saturation: 15 },
    },
  },
  {
    name: "Organ Tones",
    parameters: {
      ...defaultSynthParameters,
      oscillators: {
        osc1: { enabled: false, waveform: "sine", pitch: 440, detune: 0, drift: 0, level: 100, ...defaultModOsc },
        osc2: { enabled: false, waveform: "sine", pitch: 440, detune: 0, drift: 0, level: 50, ...defaultModOsc },
        osc3: { enabled: false, waveform: "sine", pitch: 220, detune: 0, drift: 0, level: 30, ...defaultModOsc },
      },
      envelopes: {
        env1: { enabled: true, attack: 20, hold: 200, decay: 800, curve: "exponential", target: "amplitude", amount: 100 },
        env2: { enabled: false, attack: 10, hold: 50, decay: 500, curve: "exponential", target: "filter", amount: 50 },
        env3: { enabled: false, attack: 10, hold: 50, decay: 500, curve: "exponential", target: "pitch", amount: 25 },
      },
      additive: {
        enabled: true,
        basePitch: 220,
        partials: {
          p1: { level: 100, detune: 0 },
          p2: { level: 80, detune: 0 },
          p3: { level: 60, detune: 0 },
          p4: { level: 50, detune: 0 },
          p5: { level: 35, detune: 0 },
          p6: { level: 25, detune: 0 },
          p7: { level: 15, detune: 0 },
          p8: { level: 10, detune: 0 },
        },
        spread: 0,
        decaySlope: 20,
      },
      effects: { ...defaultSynthParameters.effects, chorusEnabled: true, chorusRate: 1.2, chorusDepth: 40, chorusMix: 25 },
    },
  },
  {
    name: "Grain Cloud",
    parameters: {
      ...defaultSynthParameters,
      oscillators: {
        osc1: { enabled: false, waveform: "sine", pitch: 440, detune: 0, drift: 0, level: 100, ...defaultModOsc },
        osc2: { enabled: false, waveform: "sine", pitch: 440, detune: 0, drift: 0, level: 50, ...defaultModOsc },
        osc3: { enabled: false, waveform: "sine", pitch: 220, detune: 0, drift: 0, level: 30, ...defaultModOsc },
      },
      envelopes: {
        env1: { enabled: true, attack: 50, hold: 300, decay: 1000, curve: "exponential", target: "amplitude", amount: 100 },
        env2: { enabled: false, attack: 10, hold: 50, decay: 500, curve: "exponential", target: "filter", amount: 50 },
        env3: { enabled: false, attack: 10, hold: 50, decay: 500, curve: "exponential", target: "pitch", amount: 25 },
      },
      granular: {
        enabled: true,
        density: 40,
        grainSize: 60,
        pitch: 330,
        pitchSpray: 25,
        scatter: 40,
        texture: "sine",
      },
      effects: { ...defaultSynthParameters.effects, reverbEnabled: true, reverbMix: 35, reverbDecay: 2.5 },
    },
  },
  {
    name: "Impact Slam",
    parameters: {
      ...defaultSynthParameters,
      oscillators: {
        osc1: { enabled: true, waveform: "sawtooth", pitch: 55, detune: 0, drift: 5, level: 100, ...defaultModOsc },
        osc2: { enabled: true, waveform: "square", pitch: 110, detune: -10, drift: 0, level: 70, ...defaultModOsc },
        osc3: { enabled: true, waveform: "sine", pitch: 27.5, detune: 0, drift: 0, level: 80, ...defaultModOsc },
      },
      envelopes: {
        env1: { enabled: true, attack: 2, hold: 30, decay: 400, curve: "exponential", target: "amplitude", amount: 100 },
        env2: { enabled: true, attack: 0, hold: 10, decay: 100, curve: "exponential", target: "filter", amount: 80 },
        env3: { enabled: false, attack: 10, hold: 50, decay: 500, curve: "exponential", target: "pitch", amount: 25 },
      },
      filter: {
        enabled: true,
        frequency: 800,
        resonance: 4,
        type: "lowpass",
        combDelay: 5,
        gain: 0,
      },
      effects: {
        ...defaultSynthParameters.effects,
        saturation: 40,
        transientEnabled: true,
        transientAttack: 60,
        transientSustain: -20,
        limiterEnabled: true,
        limiterThreshold: -6,
        limiterRelease: 80,
        multibandEnabled: true,
        multibandLowFreq: 150,
        multibandHighFreq: 4000,
        multibandLowDrive: 30,
        multibandMidDrive: 50,
        multibandHighDrive: 40,
        reverbEnabled: true,
        reverbMix: 15,
        reverbDecay: 1,
      },
    },
  },
  {
    name: "Noise Burst",
    parameters: {
      ...defaultSynthParameters,
      oscillators: {
        osc1: { enabled: false, waveform: "sine", pitch: 440, detune: 0, drift: 0, level: 100, ...defaultModOsc },
        osc2: { enabled: false, waveform: "sine", pitch: 440, detune: 0, drift: 0, level: 50, ...defaultModOsc },
        osc3: { enabled: false, waveform: "sine", pitch: 220, detune: 0, drift: 0, level: 30, ...defaultModOsc },
      },
      envelopes: {
        env1: { enabled: true, attack: 0, hold: 15, decay: 150, curve: "exponential", target: "amplitude", amount: 100 },
        env2: { enabled: false, attack: 10, hold: 50, decay: 500, curve: "exponential", target: "filter", amount: 50 },
        env3: { enabled: false, attack: 10, hold: 50, decay: 500, curve: "exponential", target: "pitch", amount: 25 },
      },
      granular: {
        enabled: true,
        density: 90,
        grainSize: 10,
        pitch: 800,
        pitchSpray: 80,
        scatter: 70,
        texture: "noise",
      },
      effects: { 
        ...defaultSynthParameters.effects, 
        bitcrusher: 6,
        transientEnabled: true, 
        transientAttack: 80, 
        transientSustain: -30,
        limiterEnabled: true,
        limiterThreshold: -3,
      },
    },
  },
  {
    name: "Industrial Clang",
    parameters: {
      ...defaultSynthParameters,
      oscillators: {
        osc1: { enabled: false, waveform: "sine", pitch: 440, detune: 0, drift: 0, level: 100, ...defaultModOsc },
        osc2: { enabled: false, waveform: "sine", pitch: 440, detune: 0, drift: 0, level: 50, ...defaultModOsc },
        osc3: { enabled: false, waveform: "sine", pitch: 220, detune: 0, drift: 0, level: 30, ...defaultModOsc },
      },
      envelopes: {
        env1: { enabled: true, attack: 0, hold: 30, decay: 600, curve: "exponential", target: "amplitude", amount: 100 },
        env2: { enabled: false, attack: 10, hold: 50, decay: 500, curve: "exponential", target: "filter", amount: 50 },
        env3: { enabled: false, attack: 10, hold: 50, decay: 500, curve: "exponential", target: "pitch", amount: 25 },
      },
      modal: {
        enabled: true,
        basePitch: 95,
        impactNoise: 90,
        impactDecay: 5,
        modes: {
          mode1: { ratio: 1, decay: 400, level: 100 },
          mode2: { ratio: 1.41, decay: 350, level: 90 },
          mode3: { ratio: 1.73, decay: 300, level: 80 },
          mode4: { ratio: 2.23, decay: 250, level: 70 },
        },
      },
      effects: { 
        ...defaultSynthParameters.effects, 
        saturation: 50,
        multibandEnabled: true,
        multibandLowFreq: 100,
        multibandHighFreq: 3000,
        multibandLowDrive: 60,
        multibandMidDrive: 40,
        multibandHighDrive: 50,
        reverbEnabled: true,
        reverbMix: 20,
        reverbDecay: 0.8,
      },
    },
  },
  {
    name: "Glitch Stab",
    parameters: {
      ...defaultSynthParameters,
      oscillators: {
        osc1: { enabled: true, waveform: "square", pitch: 660, detune: 0, drift: 30, level: 100, fmEnabled: true, fmRatio: 7, fmRatioPreset: "custom" as const, fmDepth: 600, fmWaveform: "square", fmFeedback: 0, ...defaultAmOsc, ...defaultPmOsc },
        osc2: { enabled: true, waveform: "sawtooth", pitch: 330, detune: 25, drift: 20, level: 70, fmEnabled: true, fmRatio: 5, fmRatioPreset: "custom" as const, fmDepth: 400, fmWaveform: "sawtooth", fmFeedback: 0, ...defaultAmOsc, ...defaultPmOsc },
        osc3: { enabled: false, waveform: "sine", pitch: 220, detune: 0, drift: 0, level: 30, ...defaultModOsc },
      },
      envelopes: {
        env1: { enabled: true, attack: 0, hold: 10, decay: 120, curve: "exponential", target: "amplitude", amount: 100 },
        env2: { enabled: true, attack: 0, hold: 5, decay: 80, curve: "exponential", target: "filter", amount: 100 },
        env3: { enabled: false, attack: 10, hold: 50, decay: 500, curve: "exponential", target: "pitch", amount: 25 },
      },
      filter: { enabled: true, frequency: 2000, resonance: 12, type: "bandpass", combDelay: 5, gain: 0 },
      effects: { 
        ...defaultSynthParameters.effects, 
        bitcrusher: 4,
        saturation: 70,
        delayEnabled: true,
        delayTime: 60,
        delayFeedback: 30,
        delayMix: 25,
      },
    },
  },
  // Hyperpop presets - percussive, abrasive, interesting
  {
    name: "808 Distort",
    parameters: {
      ...defaultSynthParameters,
      oscillators: {
        osc1: { enabled: true, waveform: "sine", pitch: 45, detune: 0, drift: 0, level: 100, ...defaultModOsc },
        osc2: { enabled: true, waveform: "sine", pitch: 90, detune: 0, drift: 0, level: 60, ...defaultModOsc },
        osc3: { enabled: true, waveform: "noise", pitch: 200, detune: 0, drift: 0, level: 25, ...defaultModOsc },
      },
      envelopes: {
        env1: { enabled: true, attack: 0, hold: 40, decay: 600, curve: "exponential", target: "amplitude", amount: 100 },
        env2: { enabled: true, attack: 0, hold: 5, decay: 80, curve: "exponential", target: "pitch", amount: 100 },
        env3: { enabled: false, attack: 10, hold: 50, decay: 500, curve: "exponential", target: "pitch", amount: 25 },
      },
      filter: { enabled: true, frequency: 200, resonance: 8, type: "lowpass", combDelay: 5, gain: 0 },
      effects: {
        ...defaultSynthParameters.effects,
        saturation: 80,
        limiterEnabled: true,
        limiterThreshold: -3,
        limiterRelease: 50,
      },
    },
  },
  {
    name: "Zap Lead",
    parameters: {
      ...defaultSynthParameters,
      oscillators: {
        osc1: { enabled: true, waveform: "sawtooth", pitch: 880, detune: 0, drift: 20, level: 100, fmEnabled: true, fmRatio: 4, fmRatioPreset: "4" as const, fmDepth: 300, fmWaveform: "square", fmFeedback: 0, ...defaultAmOsc, ...defaultPmOsc },
        osc2: { enabled: true, waveform: "square", pitch: 440, detune: 15, drift: 15, level: 50, ...defaultModOsc },
        osc3: { enabled: false, waveform: "sine", pitch: 220, detune: 0, drift: 0, level: 30, ...defaultModOsc },
      },
      envelopes: {
        env1: { enabled: true, attack: 0, hold: 10, decay: 150, curve: "exponential", target: "amplitude", amount: 100 },
        env2: { enabled: true, attack: 0, hold: 5, decay: 50, curve: "exponential", target: "pitch", amount: -80 },
        env3: { enabled: false, attack: 10, hold: 50, decay: 500, curve: "exponential", target: "pitch", amount: 25 },
      },
      filter: { enabled: true, frequency: 4000, resonance: 12, type: "bandpass", combDelay: 5, gain: 0 },
      effects: {
        ...defaultSynthParameters.effects,
        saturation: 50,
        bitcrusher: 10,
        transientEnabled: true,
        transientAttack: 70,
        transientSustain: -40,
      },
    },
  },
  {
    name: "Harsh Stab",
    parameters: {
      ...defaultSynthParameters,
      oscillators: {
        osc1: { enabled: true, waveform: "square", pitch: 330, detune: 0, drift: 30, level: 100, fmEnabled: true, fmRatio: 7, fmRatioPreset: "custom" as const, fmDepth: 800, fmWaveform: "square", fmFeedback: 0, ...defaultAmOsc, ...defaultPmOsc },
        osc2: { enabled: true, waveform: "sawtooth", pitch: 660, detune: -20, drift: 25, level: 70, fmEnabled: true, fmRatio: 5, fmRatioPreset: "custom" as const, fmDepth: 500, fmWaveform: "sawtooth", fmFeedback: 0, ...defaultAmOsc, ...defaultPmOsc },
        osc3: { enabled: true, waveform: "noise", pitch: 500, detune: 0, drift: 0, level: 40, ...defaultModOsc },
      },
      envelopes: {
        env1: { enabled: true, attack: 0, hold: 15, decay: 80, curve: "exponential", target: "amplitude", amount: 100 },
        env2: { enabled: true, attack: 0, hold: 8, decay: 60, curve: "exponential", target: "filter", amount: 100 },
        env3: { enabled: false, attack: 10, hold: 50, decay: 500, curve: "exponential", target: "pitch", amount: 25 },
      },
      filter: { enabled: true, frequency: 1500, resonance: 15, type: "bandpass", combDelay: 5, gain: 0 },
      effects: {
        ...defaultSynthParameters.effects,
        saturation: 80,
        bitcrusher: 6,
        multibandEnabled: true,
        multibandLowFreq: 200,
        multibandHighFreq: 3000,
        multibandLowDrive: 50,
        multibandMidDrive: 70,
        multibandHighDrive: 60,
        limiterEnabled: true,
        limiterThreshold: -3,
      },
    },
  },
  {
    name: "Glitch Perc",
    parameters: {
      ...defaultSynthParameters,
      oscillators: {
        osc1: { enabled: true, waveform: "square", pitch: 200, detune: 0, drift: 50, level: 100, fmEnabled: true, fmRatio: 9, fmRatioPreset: "custom" as const, fmDepth: 1000, fmWaveform: "square", fmFeedback: 0, ...defaultAmOsc, ...defaultPmOsc },
        osc2: { enabled: true, waveform: "noise", pitch: 400, detune: 0, drift: 0, level: 60, ...defaultModOsc },
        osc3: { enabled: false, waveform: "sine", pitch: 220, detune: 0, drift: 0, level: 30, ...defaultModOsc },
      },
      envelopes: {
        env1: { enabled: true, attack: 0, hold: 5, decay: 40, curve: "exponential", target: "amplitude", amount: 100 },
        env2: { enabled: true, attack: 0, hold: 3, decay: 30, curve: "exponential", target: "pitch", amount: -100 },
        env3: { enabled: false, attack: 10, hold: 50, decay: 500, curve: "exponential", target: "pitch", amount: 25 },
      },
      filter: { enabled: true, frequency: 3000, resonance: 18, type: "highpass", combDelay: 5, gain: 0 },
      effects: {
        ...defaultSynthParameters.effects,
        bitcrusher: 3,
        saturation: 60,
        transientEnabled: true,
        transientAttack: 100,
        transientSustain: -60,
        limiterEnabled: true,
        limiterThreshold: -6,
      },
    },
  },
  {
    name: "Screamer",
    parameters: {
      ...defaultSynthParameters,
      oscillators: {
        osc1: { enabled: true, waveform: "sawtooth", pitch: 440, detune: 0, drift: 40, level: 100, fmEnabled: true, fmRatio: 3, fmRatioPreset: "3" as const, fmDepth: 600, fmWaveform: "sawtooth", fmFeedback: 0, amEnabled: true, amRatio: 8, amDepth: 70, amWaveform: "square", ...defaultPmOsc },
        osc2: { enabled: true, waveform: "sawtooth", pitch: 443, detune: 10, drift: 35, level: 80, fmEnabled: true, fmRatio: 4, fmRatioPreset: "4" as const, fmDepth: 500, fmWaveform: "sine", fmFeedback: 0, ...defaultAmOsc, ...defaultPmOsc },
        osc3: { enabled: true, waveform: "square", pitch: 220, detune: -15, drift: 30, level: 60, ...defaultModOsc },
      },
      envelopes: {
        env1: { enabled: true, attack: 0, hold: 20, decay: 200, curve: "exponential", target: "amplitude", amount: 100 },
        env2: { enabled: true, attack: 0, hold: 10, decay: 100, curve: "exponential", target: "filter", amount: 100 },
        env3: { enabled: true, attack: 0, hold: 5, decay: 50, curve: "exponential", target: "pitch", amount: 50 },
      },
      filter: { enabled: true, frequency: 2000, resonance: 20, type: "bandpass", combDelay: 5, gain: 0 },
      effects: {
        ...defaultSynthParameters.effects,
        saturation: 90,
        bitcrusher: 8,
        multibandEnabled: true,
        multibandLowFreq: 150,
        multibandHighFreq: 4000,
        multibandLowDrive: 70,
        multibandMidDrive: 90,
        multibandHighDrive: 80,
        limiterEnabled: true,
        limiterThreshold: -3,
        limiterRelease: 30,
      },
    },
  },
  {
    name: "Pluck Drop",
    parameters: {
      ...defaultSynthParameters,
      oscillators: {
        osc1: { enabled: true, waveform: "triangle", pitch: 660, detune: 0, drift: 10, level: 100, ...defaultModOsc },
        osc2: { enabled: true, waveform: "sawtooth", pitch: 660, detune: 5, drift: 8, level: 50, ...defaultModOsc },
        osc3: { enabled: false, waveform: "sine", pitch: 220, detune: 0, drift: 0, level: 30, ...defaultModOsc },
      },
      envelopes: {
        env1: { enabled: true, attack: 0, hold: 30, decay: 250, curve: "exponential", target: "amplitude", amount: 100 },
        env2: { enabled: true, attack: 0, hold: 20, decay: 180, curve: "exponential", target: "filter", amount: 80 },
        env3: { enabled: true, attack: 0, hold: 10, decay: 100, curve: "exponential", target: "pitch", amount: -60 },
      },
      filter: { enabled: true, frequency: 5000, resonance: 6, type: "lowpass", combDelay: 5, gain: 0 },
      effects: {
        ...defaultSynthParameters.effects,
        saturation: 30,
        delayEnabled: true,
        delayTime: 120,
        delayFeedback: 40,
        delayMix: 20,
        reverbEnabled: true,
        reverbMix: 15,
        reverbDecay: 0.8,
      },
    },
  },
  {
    name: "Noise Hit",
    parameters: {
      ...defaultSynthParameters,
      oscillators: {
        osc1: { enabled: true, waveform: "noise", pitch: 440, detune: 0, drift: 0, level: 100, ...defaultModOsc },
        osc2: { enabled: true, waveform: "square", pitch: 110, detune: 0, drift: 50, level: 40, fmEnabled: true, fmRatio: 6, fmRatioPreset: "6" as const, fmDepth: 400, fmWaveform: "square", fmFeedback: 0, ...defaultAmOsc, ...defaultPmOsc },
        osc3: { enabled: false, waveform: "sine", pitch: 220, detune: 0, drift: 0, level: 30, ...defaultModOsc },
      },
      envelopes: {
        env1: { enabled: true, attack: 0, hold: 8, decay: 80, curve: "exponential", target: "amplitude", amount: 100 },
        env2: { enabled: true, attack: 0, hold: 5, decay: 50, curve: "exponential", target: "filter", amount: 100 },
        env3: { enabled: false, attack: 10, hold: 50, decay: 500, curve: "exponential", target: "pitch", amount: 25 },
      },
      filter: { enabled: true, frequency: 800, resonance: 12, type: "bandpass", combDelay: 5, gain: 0 },
      effects: {
        ...defaultSynthParameters.effects,
        saturation: 70,
        bitcrusher: 5,
        transientEnabled: true,
        transientAttack: 80,
        transientSustain: -50,
        limiterEnabled: true,
        limiterThreshold: -6,
      },
    },
  },
  {
    name: "Tube Warmth",
    parameters: {
      ...defaultSynthParameters,
      oscillators: {
        osc1: { enabled: true, waveform: "sawtooth", pitch: 220, detune: 0, drift: 5, level: 100, ...defaultModOsc },
        osc2: { enabled: true, waveform: "sawtooth", pitch: 220, detune: 7, drift: 5, level: 70, ...defaultModOsc },
        osc3: { enabled: false, waveform: "sine", pitch: 220, detune: 0, drift: 0, level: 30, ...defaultModOsc },
      },
      envelopes: {
        env1: { enabled: true, attack: 5, hold: 50, decay: 400, curve: "exponential", target: "amplitude", amount: 100 },
        env2: { enabled: false, attack: 10, hold: 50, decay: 500, curve: "exponential", target: "filter", amount: 50 },
        env3: { enabled: false, attack: 10, hold: 50, decay: 500, curve: "exponential", target: "pitch", amount: 25 },
      },
      filter: { enabled: true, frequency: 3000, resonance: 4, type: "lowpass", combDelay: 5, gain: 0 },
      waveshaper: {
        enabled: true,
        curve: "tube",
        drive: 60,
        mix: 100,
        preFilterFreq: 150,
        preFilterEnabled: true,
        postFilterFreq: 8000,
        postFilterEnabled: false,
        oversample: "4x",
      },
      convolver: { ...defaultConvolver },
    },
  },
  {
    name: "Fold Crunch",
    parameters: {
      ...defaultSynthParameters,
      oscillators: {
        osc1: { enabled: true, waveform: "sine", pitch: 110, detune: 0, drift: 0, level: 100, ...defaultModOsc },
        osc2: { enabled: true, waveform: "triangle", pitch: 220, detune: 0, drift: 10, level: 50, ...defaultModOsc },
        osc3: { enabled: false, waveform: "sine", pitch: 220, detune: 0, drift: 0, level: 30, ...defaultModOsc },
      },
      envelopes: {
        env1: { enabled: true, attack: 0, hold: 30, decay: 300, curve: "exponential", target: "amplitude", amount: 100 },
        env2: { enabled: false, attack: 10, hold: 50, decay: 500, curve: "exponential", target: "filter", amount: 50 },
        env3: { enabled: false, attack: 10, hold: 50, decay: 500, curve: "exponential", target: "pitch", amount: 25 },
      },
      waveshaper: {
        enabled: true,
        curve: "foldback",
        drive: 80,
        mix: 100,
        preFilterFreq: 200,
        preFilterEnabled: false,
        postFilterFreq: 6000,
        postFilterEnabled: true,
        oversample: "4x",
      },
      convolver: { ...defaultConvolver },
      effects: {
        ...defaultSynthParameters.effects,
        transientEnabled: true,
        transientAttack: 60,
        transientSustain: -30,
        limiterEnabled: true,
        limiterThreshold: -6,
      },
    },
  },
  {
    name: "Sine Destroyer",
    parameters: {
      ...defaultSynthParameters,
      oscillators: {
        osc1: { enabled: true, waveform: "sine", pitch: 440, detune: 0, drift: 0, level: 100, ...defaultModOsc },
        osc2: { enabled: false, waveform: "sine", pitch: 440, detune: 0, drift: 0, level: 50, ...defaultModOsc },
        osc3: { enabled: false, waveform: "sine", pitch: 220, detune: 0, drift: 0, level: 30, ...defaultModOsc },
      },
      envelopes: {
        env1: { enabled: true, attack: 0, hold: 20, decay: 200, curve: "exponential", target: "amplitude", amount: 100 },
        env2: { enabled: false, attack: 10, hold: 50, decay: 500, curve: "exponential", target: "filter", amount: 50 },
        env3: { enabled: false, attack: 10, hold: 50, decay: 500, curve: "exponential", target: "pitch", amount: 25 },
      },
      waveshaper: {
        enabled: true,
        curve: "sinefold",
        drive: 90,
        mix: 100,
        preFilterFreq: 200,
        preFilterEnabled: false,
        postFilterFreq: 5000,
        postFilterEnabled: true,
        oversample: "4x",
      },
      convolver: { ...defaultConvolver },
      effects: {
        ...defaultSynthParameters.effects,
        saturation: 40,
        limiterEnabled: true,
        limiterThreshold: -3,
      },
    },
  },
  {
    name: "Cheby Brass",
    parameters: {
      ...defaultSynthParameters,
      oscillators: {
        osc1: { enabled: true, waveform: "sawtooth", pitch: 220, detune: 0, drift: 8, level: 100, ...defaultModOsc },
        osc2: { enabled: true, waveform: "sawtooth", pitch: 220, detune: 5, drift: 8, level: 60, ...defaultModOsc },
        osc3: { enabled: false, waveform: "sine", pitch: 220, detune: 0, drift: 0, level: 30, ...defaultModOsc },
      },
      envelopes: {
        env1: { enabled: true, attack: 10, hold: 80, decay: 500, curve: "exponential", target: "amplitude", amount: 100 },
        env2: { enabled: true, attack: 5, hold: 40, decay: 300, curve: "exponential", target: "filter", amount: 70 },
        env3: { enabled: false, attack: 10, hold: 50, decay: 500, curve: "exponential", target: "pitch", amount: 25 },
      },
      filter: { enabled: true, frequency: 2000, resonance: 6, type: "lowpass", combDelay: 5, gain: 0 },
      waveshaper: {
        enabled: true,
        curve: "chebyshev",
        drive: 50,
        mix: 80,
        preFilterFreq: 200,
        preFilterEnabled: false,
        postFilterFreq: 8000,
        postFilterEnabled: false,
        oversample: "4x",
      },
      convolver: { ...defaultConvolver },
    },
  },
  {
    name: "Hard Clip Perc",
    parameters: {
      ...defaultSynthParameters,
      oscillators: {
        osc1: { enabled: true, waveform: "square", pitch: 150, detune: 0, drift: 20, level: 100, fmEnabled: true, fmRatio: 3, fmRatioPreset: "3" as const, fmDepth: 200, fmWaveform: "sine", fmFeedback: 0, ...defaultAmOsc, ...defaultPmOsc },
        osc2: { enabled: true, waveform: "noise", pitch: 440, detune: 0, drift: 0, level: 40, ...defaultModOsc },
        osc3: { enabled: false, waveform: "sine", pitch: 220, detune: 0, drift: 0, level: 30, ...defaultModOsc },
      },
      envelopes: {
        env1: { enabled: true, attack: 0, hold: 10, decay: 100, curve: "exponential", target: "amplitude", amount: 100 },
        env2: { enabled: true, attack: 0, hold: 5, decay: 60, curve: "exponential", target: "pitch", amount: -80 },
        env3: { enabled: false, attack: 10, hold: 50, decay: 500, curve: "exponential", target: "pitch", amount: 25 },
      },
      filter: { enabled: true, frequency: 1000, resonance: 10, type: "lowpass", combDelay: 5, gain: 0 },
      waveshaper: {
        enabled: true,
        curve: "hardclip",
        drive: 70,
        mix: 100,
        preFilterFreq: 200,
        preFilterEnabled: false,
        postFilterFreq: 4000,
        postFilterEnabled: true,
        oversample: "4x",
      },
      convolver: { ...defaultConvolver },
      effects: {
        ...defaultSynthParameters.effects,
        transientEnabled: true,
        transientAttack: 100,
        transientSustain: -50,
        limiterEnabled: true,
        limiterThreshold: -3,
      },
    },
  },
  {
    name: "SOPHIE Punch",
    parameters: {
      ...defaultSynthParameters,
      oscillators: {
        osc1: { enabled: true, waveform: "sine", pitch: 80, detune: 0, drift: 0, level: 100, fmEnabled: true, fmRatio: 4, fmRatioPreset: "4" as const, fmDepth: 600, fmWaveform: "sine", fmFeedback: 0.3, ...defaultAmOsc, pmEnabled: true, pmRatio: 2, pmRatioPreset: "2" as const, pmDepth: 25, pmWaveform: "sine", pmFeedback: 0.2, indexEnvEnabled: true, indexEnvDecay: 8, indexEnvDepth: 40 },
        osc2: { enabled: false, waveform: "sine", pitch: 440, detune: 0, drift: 0, level: 50, ...defaultModOsc },
        osc3: { enabled: false, waveform: "sine", pitch: 220, detune: 0, drift: 0, level: 30, ...defaultModOsc },
      },
      envelopes: {
        env1: { enabled: true, attack: 0, hold: 10, decay: 150, curve: "exponential", target: "amplitude", amount: 100 },
        env2: { enabled: true, attack: 0, hold: 5, decay: 80, curve: "exponential", target: "pitch", amount: -100 },
        env3: { enabled: false, attack: 10, hold: 50, decay: 500, curve: "exponential", target: "pitch", amount: 25 },
      },
      clickLayer: { enabled: true, level: 70, decay: 2, filterType: "highpass", filterFreq: 8000, filterQ: 6, srrEnabled: false, srrAmount: 4, noiseType: "white" },
      subOsc: { enabled: true, waveform: "sine", octave: -1, level: 80, attack: 0, decay: 200, filterEnabled: true, filterFreq: 60 },
      saturationChain: { enabled: true, tapeEnabled: true, tapeDrive: 40, tapeWarmth: 30, tubeEnabled: false, tubeDrive: 20, tubeBias: 50, transistorEnabled: true, transistorDrive: 60, transistorAsymmetry: 40, mix: 100 },
      mastering: { compressorEnabled: true, compressorThreshold: -8, compressorRatio: 6, compressorAttack: 2, compressorRelease: 80, compressorKnee: 3, compressorMakeup: 6, exciterEnabled: true, exciterFreq: 5000, exciterAmount: 50, exciterMix: 60, stereoEnabled: false, stereoWidth: 100 },
      effects: {
        ...defaultSynthParameters.effects,
        saturation: 30,
        transientEnabled: true,
        transientAttack: 80,
        transientSustain: -40,
        limiterEnabled: true,
        limiterThreshold: -3,
        limiterRelease: 30,
      },
    },
  },
  {
    name: "Hyperpop Kick",
    parameters: {
      ...defaultSynthParameters,
      oscillators: {
        osc1: { enabled: true, waveform: "sine", pitch: 60, detune: 0, drift: 0, level: 100, fmEnabled: true, fmRatio: 0.5, fmRatioPreset: "0.5" as const, fmDepth: 300, fmWaveform: "sine", fmFeedback: 0.15, ...defaultAmOsc, pmEnabled: false, pmRatio: 2, pmRatioPreset: "2" as const, pmDepth: 10, pmWaveform: "sine", pmFeedback: 0, indexEnvEnabled: true, indexEnvDecay: 5, indexEnvDepth: 30 },
        osc2: { enabled: false, waveform: "sine", pitch: 440, detune: 0, drift: 0, level: 50, ...defaultModOsc },
        osc3: { enabled: false, waveform: "sine", pitch: 220, detune: 0, drift: 0, level: 30, ...defaultModOsc },
      },
      envelopes: {
        env1: { enabled: true, attack: 0, hold: 15, decay: 200, curve: "exponential", target: "amplitude", amount: 100 },
        env2: { enabled: true, attack: 0, hold: 3, decay: 40, curve: "exponential", target: "pitch", amount: -100 },
        env3: { enabled: false, attack: 10, hold: 50, decay: 500, curve: "exponential", target: "pitch", amount: 25 },
      },
      clickLayer: { enabled: true, level: 60, decay: 1.5, filterType: "bandpass", filterFreq: 6000, filterQ: 8, srrEnabled: true, srrAmount: 6, noiseType: "pink" },
      subOsc: { enabled: true, waveform: "sine", octave: -2, level: 90, attack: 0, decay: 250, filterEnabled: true, filterFreq: 40 },
      saturationChain: { enabled: true, tapeEnabled: true, tapeDrive: 50, tapeWarmth: 50, tubeEnabled: true, tubeDrive: 30, tubeBias: 60, transistorEnabled: false, transistorDrive: 40, transistorAsymmetry: 30, mix: 100 },
      mastering: { compressorEnabled: true, compressorThreshold: -6, compressorRatio: 8, compressorAttack: 1, compressorRelease: 60, compressorKnee: 0, compressorMakeup: 8, exciterEnabled: true, exciterFreq: 4000, exciterAmount: 40, exciterMix: 50, stereoEnabled: false, stereoWidth: 100 },
      effects: {
        ...defaultSynthParameters.effects,
        transientEnabled: true,
        transientAttack: 100,
        transientSustain: -60,
        limiterEnabled: true,
        limiterThreshold: -2,
        limiterRelease: 20,
      },
    },
  },
  {
    name: "Metal Snare",
    parameters: {
      ...defaultSynthParameters,
      oscillators: {
        osc1: { enabled: true, waveform: "triangle", pitch: 180, detune: 0, drift: 30, level: 100, fmEnabled: true, fmRatio: 3, fmRatioPreset: "3" as const, fmDepth: 500, fmWaveform: "square", fmFeedback: 0.4, ...defaultAmOsc, ...defaultPmOsc },
        osc2: { enabled: true, waveform: "noise", pitch: 440, detune: 0, drift: 0, level: 60, ...defaultModOsc },
        osc3: { enabled: false, waveform: "sine", pitch: 220, detune: 0, drift: 0, level: 30, ...defaultModOsc },
      },
      envelopes: {
        env1: { enabled: true, attack: 0, hold: 8, decay: 120, curve: "exponential", target: "amplitude", amount: 100 },
        env2: { enabled: true, attack: 0, hold: 5, decay: 60, curve: "exponential", target: "pitch", amount: -80 },
        env3: { enabled: false, attack: 10, hold: 50, decay: 500, curve: "exponential", target: "pitch", amount: 25 },
      },
      filter: { enabled: true, frequency: 2500, resonance: 8, type: "bandpass", combDelay: 5, gain: 0 },
      clickLayer: { enabled: true, level: 80, decay: 2.5, filterType: "highpass", filterFreq: 5000, filterQ: 4, srrEnabled: true, srrAmount: 8, noiseType: "white" },
      saturationChain: { enabled: true, tapeEnabled: false, tapeDrive: 30, tapeWarmth: 40, tubeEnabled: false, tubeDrive: 20, tubeBias: 50, transistorEnabled: true, transistorDrive: 80, transistorAsymmetry: 60, mix: 100 },
      mastering: { compressorEnabled: true, compressorThreshold: -10, compressorRatio: 4, compressorAttack: 3, compressorRelease: 100, compressorKnee: 6, compressorMakeup: 5, exciterEnabled: true, exciterFreq: 6000, exciterAmount: 60, exciterMix: 70, stereoEnabled: false, stereoWidth: 100 },
      modal: { enabled: true, basePitch: 180, impactNoise: 40, impactDecay: 10, modes: { mode1: { ratio: 1, decay: 100, level: 100 }, mode2: { ratio: 2.3, decay: 80, level: 50 }, mode3: { ratio: 4.7, decay: 60, level: 30 }, mode4: { ratio: 7.2, decay: 40, level: 20 } } },
      effects: {
        ...defaultSynthParameters.effects,
        saturation: 50,
        transientEnabled: true,
        transientAttack: 90,
        transientSustain: -30,
        limiterEnabled: true,
        limiterThreshold: -4,
      },
    },
  },
  {
    name: "Glass Shatter",
    parameters: {
      ...defaultSynthParameters,
      oscillators: {
        osc1: { enabled: true, waveform: "sine", pitch: 2000, detune: 20, drift: 50, level: 100, fmEnabled: true, fmRatio: 6, fmRatioPreset: "6" as const, fmDepth: 800, fmWaveform: "sine", fmFeedback: 0.5, ...defaultAmOsc, pmEnabled: true, pmRatio: 8, pmRatioPreset: "8" as const, pmDepth: 35, pmWaveform: "triangle", pmFeedback: 0.3, indexEnvEnabled: true, indexEnvDecay: 3, indexEnvDepth: 50 },
        osc2: { enabled: true, waveform: "sine", pitch: 3200, detune: -15, drift: 40, level: 60, fmEnabled: true, fmRatio: 4, fmRatioPreset: "4" as const, fmDepth: 600, fmWaveform: "sine", fmFeedback: 0.3, ...defaultAmOsc, ...defaultPmOsc },
        osc3: { enabled: false, waveform: "sine", pitch: 220, detune: 0, drift: 0, level: 30, ...defaultModOsc },
      },
      envelopes: {
        env1: { enabled: true, attack: 0, hold: 5, decay: 250, curve: "exponential", target: "amplitude", amount: 100 },
        env2: { enabled: true, attack: 0, hold: 3, decay: 150, curve: "exponential", target: "filter", amount: -80 },
        env3: { enabled: false, attack: 10, hold: 50, decay: 500, curve: "exponential", target: "pitch", amount: 25 },
      },
      filter: { enabled: true, frequency: 8000, resonance: 12, type: "highpass", combDelay: 5, gain: 0 },
      clickLayer: { enabled: true, level: 90, decay: 3, filterType: "bandpass", filterFreq: 10000, filterQ: 5, srrEnabled: false, srrAmount: 4, noiseType: "white" },
      saturationChain: { enabled: true, tapeEnabled: false, tapeDrive: 30, tapeWarmth: 40, tubeEnabled: true, tubeDrive: 40, tubeBias: 40, transistorEnabled: false, transistorDrive: 40, transistorAsymmetry: 30, mix: 80 },
      mastering: { compressorEnabled: true, compressorThreshold: -12, compressorRatio: 3, compressorAttack: 5, compressorRelease: 120, compressorKnee: 10, compressorMakeup: 4, exciterEnabled: true, exciterFreq: 8000, exciterAmount: 80, exciterMix: 90, stereoEnabled: false, stereoWidth: 100 },
      modal: { enabled: true, basePitch: 2000, impactNoise: 60, impactDecay: 5, modes: { mode1: { ratio: 1, decay: 150, level: 100 }, mode2: { ratio: 1.6, decay: 120, level: 80 }, mode3: { ratio: 2.7, decay: 100, level: 60 }, mode4: { ratio: 4.1, decay: 80, level: 40 } } },
      effects: {
        ...defaultSynthParameters.effects,
        saturation: 20,
        reverbEnabled: true,
        reverbSize: 30,
        reverbMix: 20,
        reverbDecay: 0.5,
        limiterEnabled: true,
        limiterThreshold: -6,
      },
    },
  },
  {
    name: "Sub Thump",
    parameters: {
      ...defaultSynthParameters,
      oscillators: {
        osc1: { enabled: true, waveform: "sine", pitch: 50, detune: 0, drift: 0, level: 100, ...defaultModOsc },
        osc2: { enabled: false, waveform: "sine", pitch: 440, detune: 0, drift: 0, level: 50, ...defaultModOsc },
        osc3: { enabled: false, waveform: "sine", pitch: 220, detune: 0, drift: 0, level: 30, ...defaultModOsc },
      },
      envelopes: {
        env1: { enabled: true, attack: 0, hold: 20, decay: 300, curve: "exponential", target: "amplitude", amount: 100 },
        env2: { enabled: true, attack: 0, hold: 5, decay: 50, curve: "exponential", target: "pitch", amount: -100 },
        env3: { enabled: false, attack: 10, hold: 50, decay: 500, curve: "exponential", target: "pitch", amount: 25 },
      },
      clickLayer: { enabled: true, level: 50, decay: 1, filterType: "highpass", filterFreq: 4000, filterQ: 3, srrEnabled: false, srrAmount: 4, noiseType: "brown" },
      subOsc: { enabled: true, waveform: "sine", octave: -2, level: 100, attack: 0, decay: 400, filterEnabled: true, filterFreq: 50 },
      saturationChain: { enabled: true, tapeEnabled: true, tapeDrive: 60, tapeWarmth: 70, tubeEnabled: false, tubeDrive: 20, tubeBias: 50, transistorEnabled: false, transistorDrive: 40, transistorAsymmetry: 30, mix: 100 },
      mastering: { compressorEnabled: true, compressorThreshold: -4, compressorRatio: 10, compressorAttack: 0.5, compressorRelease: 40, compressorKnee: 0, compressorMakeup: 10, exciterEnabled: false, exciterFreq: 6000, exciterAmount: 30, exciterMix: 50, stereoEnabled: false, stereoWidth: 100 },
      filter: { enabled: true, frequency: 100, resonance: 3, type: "lowpass", combDelay: 5, gain: 0 },
      effects: {
        ...defaultSynthParameters.effects,
        transientEnabled: true,
        transientAttack: 100,
        transientSustain: -80,
        limiterEnabled: true,
        limiterThreshold: -1,
        limiterRelease: 15,
      },
    },
  },
];
