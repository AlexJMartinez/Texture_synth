// Full preset type that includes all synth settings
import type { SynthParameters } from "@shared/schema";
import type { OscEnvelopes } from "@/components/synth/OscillatorPanel";
import type { 
  OscAdvancedFMSettings, 
  AdvancedGranularSettings,
  AdvancedFilterSettings,
  AdvancedWaveshaperSettings,
  LowEndSettings,
  OscPhaseSettings,
  AdvancedSpectralSettings
} from "./advancedSynthSettings";
import type { ConvolverSettings } from "@/components/synth/ConvolverPanel";
import type { ReverbSettings } from "@/components/synth/EffectsPanel";

// All settings that make up a complete sound
export interface FullSynthSettings {
  params: SynthParameters;
  oscEnvelopes?: OscEnvelopes;
  convolverSettings?: ConvolverSettings;
  reverbSettings?: ReverbSettings;
  advancedFMSettings?: OscAdvancedFMSettings;
  advancedGranularSettings?: AdvancedGranularSettings;
  advancedFilterSettings?: AdvancedFilterSettings;
  advancedWaveshaperSettings?: AdvancedWaveshaperSettings;
  lowEndSettings?: LowEndSettings;
  phaseSettings?: OscPhaseSettings;
  advancedSpectralSettings?: AdvancedSpectralSettings;
}

// Full preset with metadata
export interface FullPreset {
  id: string;
  name: string;
  settings: FullSynthSettings;
  createdAt: number;
  version: number; // For future migrations
}

export const FULL_PRESET_VERSION = 1;
