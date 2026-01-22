import { z } from "zod";

export const WaveformType = z.enum(["sine", "triangle", "sawtooth", "square"]);
export type WaveformType = z.infer<typeof WaveformType>;

export const EnvelopeCurve = z.enum(["linear", "exponential", "logarithmic"]);
export type EnvelopeCurve = z.infer<typeof EnvelopeCurve>;

export const FilterType = z.enum([
  "lowpass", "highpass", "bandpass", "notch", "allpass", "peaking", "lowshelf", "highshelf", "comb"
]);
export type FilterType = z.infer<typeof FilterType>;

export const EnvelopeTarget = z.enum(["amplitude", "filter", "pitch", "osc1", "osc2", "osc3"]);
export type EnvelopeTarget = z.infer<typeof EnvelopeTarget>;

const OscillatorSchema = z.object({
  enabled: z.boolean(),
  waveform: WaveformType,
  pitch: z.number().min(20).max(20000),
  detune: z.number().min(-100).max(100),
  drift: z.number().min(0).max(100),
  level: z.number().min(0).max(100),
  fmEnabled: z.boolean(),
  fmRatio: z.number().min(0.25).max(16),
  fmDepth: z.number().min(0).max(1000),
  fmWaveform: WaveformType,
  amEnabled: z.boolean(),
  amRatio: z.number().min(0.25).max(16),
  amDepth: z.number().min(0).max(100),
  amWaveform: WaveformType,
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
  }),
  
  output: z.object({
    volume: z.number().min(0).max(100),
    pan: z.number().min(-100).max(100),
  }),
});

export type SynthParameters = z.infer<typeof SynthParametersSchema>;
export type Oscillator = z.infer<typeof OscillatorSchema>;
export type Envelope = z.infer<typeof EnvelopeSchema>;

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
  fmDepth: 100,
  fmWaveform: "sine",
  amEnabled: false,
  amRatio: 1,
  amDepth: 50,
  amWaveform: "sine",
};

const defaultEnvelope: Envelope = {
  enabled: true,
  attack: 10,
  hold: 50,
  decay: 500,
  curve: "exponential",
  target: "amplitude",
  amount: 100,
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
  effects: {
    saturation: 0,
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

const defaultFmOsc = { fmEnabled: false, fmRatio: 2, fmDepth: 100, fmWaveform: "sine" as const };
const defaultAmOsc = { amEnabled: false, amRatio: 1, amDepth: 50, amWaveform: "sine" as const };
const defaultModOsc = { ...defaultFmOsc, ...defaultAmOsc };

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
        osc1: { enabled: true, waveform: "sine", pitch: 440, detune: 0, drift: 0, level: 100, fmEnabled: true, fmRatio: 3.5, fmDepth: 400, fmWaveform: "sine", ...defaultAmOsc },
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
        osc1: { enabled: true, waveform: "sine", pitch: 220, detune: 0, drift: 5, level: 100, fmEnabled: true, fmRatio: 1, fmDepth: 200, fmWaveform: "sine", ...defaultAmOsc },
        osc2: { enabled: true, waveform: "sine", pitch: 220, detune: 3, drift: 3, level: 60, fmEnabled: true, fmRatio: 2, fmDepth: 150, fmWaveform: "sine", ...defaultAmOsc },
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
        osc1: { enabled: true, waveform: "sawtooth", pitch: 200, detune: 0, drift: 0, level: 100, ...defaultFmOsc, amEnabled: true, amRatio: 2.5, amDepth: 80, amWaveform: "sine" },
        osc2: { enabled: true, waveform: "square", pitch: 200, detune: 5, drift: 0, level: 60, ...defaultFmOsc, amEnabled: true, amRatio: 3.5, amDepth: 60, amWaveform: "triangle" },
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
];
