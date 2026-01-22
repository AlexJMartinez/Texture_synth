import { z } from "zod";

// Oscillator waveform types
export const WaveformType = z.enum(["sine", "triangle", "sawtooth", "square"]);
export type WaveformType = z.infer<typeof WaveformType>;

// Envelope curve types
export const EnvelopeCurve = z.enum(["linear", "exponential", "logarithmic"]);
export type EnvelopeCurve = z.infer<typeof EnvelopeCurve>;

// Parameter definition for the synth
export const SynthParametersSchema = z.object({
  // Oscillator
  oscillator: z.object({
    waveform: WaveformType,
    pitch: z.number().min(20).max(20000),
    detune: z.number().min(-100).max(100),
    drift: z.number().min(0).max(100),
  }),
  
  // Amplitude Envelope (AHD - Attack/Hold/Decay)
  envelope: z.object({
    attack: z.number().min(0).max(2000),
    hold: z.number().min(0).max(2000),
    decay: z.number().min(0).max(5000),
    curve: EnvelopeCurve,
  }),
  
  // Filter
  filter: z.object({
    enabled: z.boolean(),
    frequency: z.number().min(20).max(20000),
    resonance: z.number().min(0).max(30),
    type: z.enum(["lowpass", "highpass", "bandpass"]),
  }),
  
  // Effects
  effects: z.object({
    saturation: z.number().min(0).max(100),
    bitcrusher: z.number().min(1).max(16),
  }),
  
  // Output
  output: z.object({
    volume: z.number().min(0).max(100),
    pan: z.number().min(-100).max(100),
  }),
});

export type SynthParameters = z.infer<typeof SynthParametersSchema>;

// Preset schema
export const PresetSchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(50),
  parameters: SynthParametersSchema,
  createdAt: z.number(),
});

export type Preset = z.infer<typeof PresetSchema>;

// Export settings
export const ExportSettingsSchema = z.object({
  sampleRate: z.enum(["44100", "48000"]),
  channels: z.enum(["mono", "stereo"]),
  duration: z.number().min(100).max(10000),
  normalize: z.boolean(),
});

export type ExportSettings = z.infer<typeof ExportSettingsSchema>;

// Default parameters
export const defaultSynthParameters: SynthParameters = {
  oscillator: {
    waveform: "sine",
    pitch: 440,
    detune: 0,
    drift: 0,
  },
  envelope: {
    attack: 10,
    hold: 50,
    decay: 500,
    curve: "exponential",
  },
  filter: {
    enabled: false,
    frequency: 2000,
    resonance: 5,
    type: "lowpass",
  },
  effects: {
    saturation: 0,
    bitcrusher: 16,
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

// Factory presets
export const factoryPresets: Omit<Preset, "id" | "createdAt">[] = [
  {
    name: "Soft Pluck",
    parameters: {
      ...defaultSynthParameters,
      oscillator: { waveform: "triangle", pitch: 880, detune: 0, drift: 5 },
      envelope: { attack: 5, hold: 20, decay: 300, curve: "exponential" },
    },
  },
  {
    name: "Deep Bass",
    parameters: {
      ...defaultSynthParameters,
      oscillator: { waveform: "sawtooth", pitch: 55, detune: 0, drift: 0 },
      envelope: { attack: 20, hold: 100, decay: 800, curve: "linear" },
      filter: { enabled: true, frequency: 400, resonance: 8, type: "lowpass" },
    },
  },
  {
    name: "Sharp Click",
    parameters: {
      ...defaultSynthParameters,
      oscillator: { waveform: "square", pitch: 1200, detune: 0, drift: 10 },
      envelope: { attack: 0, hold: 5, decay: 50, curve: "exponential" },
      effects: { saturation: 30, bitcrusher: 16 },
    },
  },
  {
    name: "Warm Pad",
    parameters: {
      ...defaultSynthParameters,
      oscillator: { waveform: "sine", pitch: 330, detune: 5, drift: 15 },
      envelope: { attack: 200, hold: 300, decay: 1500, curve: "logarithmic" },
      filter: { enabled: true, frequency: 1500, resonance: 3, type: "lowpass" },
    },
  },
  {
    name: "Dirty Synth",
    parameters: {
      ...defaultSynthParameters,
      oscillator: { waveform: "sawtooth", pitch: 220, detune: 10, drift: 20 },
      envelope: { attack: 10, hold: 50, decay: 400, curve: "linear" },
      effects: { saturation: 60, bitcrusher: 8 },
    },
  },
];
