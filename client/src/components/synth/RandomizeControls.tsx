import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Dices, Shuffle } from "lucide-react";
import { useState } from "react";
import type { SynthParameters, Oscillator, Envelope, WaveformType, EnvelopeCurve, FilterType, EnvelopeTarget, WaveshaperCurve, ModRatioPreset, PitchState, SpectralScrambler } from "@shared/schema";
import { defaultSynthParameters } from "@shared/schema";
import { normalizePitch, pitchToHz, hzToPitchState } from "@/lib/pitchUtils";
import type { OscEnvelope, OscEnvelopes } from "./OscillatorPanel";
import type { ConvolverSettings } from "./ConvolverPanel";
import type { ReverbSettings, ReverbType } from "./EffectsPanel";
import { getRandomOneShotIR } from "@/lib/builtinIRs";
import type { 
  OscAdvancedFMSettings, 
  AdvancedGranularSettings, 
  AdvancedFMSettings,
  AdvancedFilterSettings,
  AdvancedWaveshaperSettings,
  LowEndSettings,
  OscPhaseSettings,
  AdvancedSpectralSettings,
  FMAlgorithm,
  GrainEnvelopeShape 
} from "@/lib/advancedSynthSettings";
import { 
  randomizeAdvancedFilterSettings, 
  randomizeAdvancedWaveshaperSettings,
  randomizeLowEndSettings,
  randomizeAdvancedSpectralSettings,
  defaultLowEndSettings,
  defaultOscPhaseSettings
} from "@/lib/advancedSynthSettings";

function randomRatioPreset(): ModRatioPreset {
  return (["0.5", "1", "2", "3", "4", "6", "8", "custom"] as const)[Math.floor(Math.random() * 8)];
}

function randomPitchState(minHz: number, maxHz: number): PitchState {
  const logMin = Math.log(minHz);
  const logMax = Math.log(maxHz);
  const hz = Math.exp(logMin + Math.random() * (logMax - logMin));
  return hzToPitchState(hz);
}

function mutatePitchState(current: PitchState | number | undefined, amount: number): PitchState {
  const pitch = normalizePitch(current);
  const currentHz = pitchToHz(pitch);
  const logCurrent = Math.log(currentHz);
  const mutation = (Math.random() - 0.5) * 2 * amount;
  const newHz = Math.exp(logCurrent + mutation);
  const clampedHz = Math.max(20, Math.min(20000, newHz));
  return {
    ...pitch,
    st: 12 * Math.log(clampedHz / pitch.baseHz) / Math.log(2),
  };
}

interface RandomizeControlsProps {
  currentParams: SynthParameters;
  onRandomize: (params: SynthParameters) => void;
  oscEnvelopes?: OscEnvelopes;
  onOscEnvelopesRandomize?: (envelopes: OscEnvelopes) => void;
  convolverSettings?: ConvolverSettings;
  onConvolverSettingsRandomize?: (settings: ConvolverSettings) => void;
  reverbSettings?: ReverbSettings;
  onReverbSettingsRandomize?: (settings: ReverbSettings) => void;
  advancedFMSettings?: OscAdvancedFMSettings;
  onAdvancedFMSettingsRandomize?: (settings: OscAdvancedFMSettings) => void;
  advancedGranularSettings?: AdvancedGranularSettings;
  onAdvancedGranularSettingsRandomize?: (settings: AdvancedGranularSettings) => void;
  advancedFilterSettings?: AdvancedFilterSettings;
  onAdvancedFilterSettingsRandomize?: (settings: AdvancedFilterSettings) => void;
  advancedWaveshaperSettings?: AdvancedWaveshaperSettings;
  onAdvancedWaveshaperSettingsRandomize?: (settings: AdvancedWaveshaperSettings) => void;
  lowEndSettings?: LowEndSettings;
  onLowEndSettingsRandomize?: (settings: LowEndSettings) => void;
  phaseSettings?: OscPhaseSettings;
  onPhaseSettingsRandomize?: (settings: OscPhaseSettings) => void;
  advancedSpectralSettings?: AdvancedSpectralSettings;
  onAdvancedSpectralSettingsRandomize?: (settings: Partial<AdvancedSpectralSettings>) => void;
}

function randomizeOscEnvelope(chaos: number): OscEnvelope {
  // One-shot safe ranges: fast attacks, moderate holds, reasonable decays
  return {
    enabled: Math.random() > 0.6,
    attack: Math.round(randExp(0, Math.min(30, 40 * chaos), 2.0)), // 0-30ms max: fast transients
    hold: Math.round(randExp(0, Math.min(80, 100 * chaos), 2.0)), // 0-80ms max: keep it punchy
    decay: Math.round(randExp(50, 2500, 1.5)), // 50-2500ms: good one-shot range
    curve: randomCurve(),
  };
}

function mutateOscEnvelope(env: OscEnvelope, strength: number): OscEnvelope {
  const mutateValue = (current: number, min: number, max: number): number => {
    const range = max - min;
    const mutation = (Math.random() - 0.5) * 2 * strength * range;
    return Math.max(min, Math.min(max, current + mutation));
  };
  
  // One-shot safe mutation ranges
  return {
    enabled: env.enabled,
    attack: Math.round(mutateValue(env.attack, 0, 80)), // 0-80ms: keep attacks fast
    hold: Math.round(mutateValue(env.hold, 0, 120)), // 0-120ms: keep holds short
    decay: Math.round(mutateValue(env.decay, 30, 3000)), // 30-3000ms: reasonable one-shot range
    curve: env.curve,
  };
}

function randomInRange(min: number, max: number, logarithmic = false): number {
  if (logarithmic && min > 0) {
    const logMin = Math.log(min);
    const logMax = Math.log(max);
    return Math.exp(logMin + Math.random() * (logMax - logMin));
  }
  return min + Math.random() * (max - min);
}

function randExp(min: number, max: number, bias = 2.5): number {
  const t = Math.pow(Math.random(), bias);
  return min + (max - min) * t;
}

function randomizeSubSafe(mutateFrom?: {
  level?: number;
  octave?: number;
  filterFreq?: number;
  drive?: number;
  attack?: number;
  decay?: number;
  waveform?: "sine" | "triangle";
  enabled?: boolean;
  filterEnabled?: boolean;
  hpFreq?: number;
  pitchEnvBypass?: boolean;
}): {
  enabled: boolean;
  octave: number;
  waveform: "sine" | "triangle";
  level: number;
  filterFreq: number;
  hpFreq: number;
  drive: number;
  attack: number;
  decay: number;
  filterEnabled: boolean;
  pitchEnvBypass: boolean;
} {
  const clamp = (x: number, a: number, b: number) => Math.max(a, Math.min(b, x));
  const mix = (cur: number, next: number, amt: number) => cur + (next - cur) * amt;
  const amt = mutateFrom ? 0.35 : 1.0;
  
  const octave = Math.random() < 0.75 ? -1 : -2;
  const waveform: "sine" | "triangle" = (["sine", "triangle"] as const)[Math.floor(Math.random() * 2)];
  const level = randExp(8, 35, 2.0);
  const lpHz = randExp(80, 160, 1.7);
  const drive = randExp(0, 25, 2.5);
  const attack = randExp(2, 8, 1.3);
  const decay = randExp(100, 450, 1.4);
  
  return {
    enabled: mutateFrom?.enabled ?? true,
    octave: mutateFrom?.octave != null ? (Math.random() < 0.9 ? mutateFrom.octave : octave) : octave,
    waveform: mutateFrom?.waveform ?? waveform,
    level: mutateFrom?.level != null ? Math.round(clamp(mix(mutateFrom.level, level, amt), 4, 50)) : Math.round(level),
    filterFreq: mutateFrom?.filterFreq != null ? Math.round(clamp(mix(mutateFrom.filterFreq, lpHz, amt), 60, 200)) : Math.round(lpHz),
    hpFreq: 25,
    drive: mutateFrom?.drive != null ? Math.round(clamp(mix(mutateFrom.drive, drive, amt), 0, 35)) : Math.round(drive),
    attack: mutateFrom?.attack != null ? Math.round(clamp(mix(mutateFrom.attack, attack, amt), 1, 20)) : Math.round(attack),
    decay: mutateFrom?.decay != null ? Math.round(clamp(mix(mutateFrom.decay, decay, amt), 50, 800)) : Math.round(decay),
    filterEnabled: mutateFrom?.filterEnabled ?? true,
    pitchEnvBypass: mutateFrom?.pitchEnvBypass ?? true,
  };
}

function randomWaveform(): WaveformType {
  return (["sine", "triangle", "sawtooth", "square", "noise"] as const)[Math.floor(Math.random() * 5)];
}

function randomCurve(): EnvelopeCurve {
  return (["linear", "exponential", "logarithmic"] as const)[Math.floor(Math.random() * 3)];
}

function randomFilterType(): FilterType {
  return (["lowpass", "highpass", "bandpass", "notch", "comb"] as const)[Math.floor(Math.random() * 5)];
}

function randomTarget(): EnvelopeTarget {
  return (["amplitude", "filter", "pitch"] as const)[Math.floor(Math.random() * 3)];
}

function randomWaveshaperCurve(): WaveshaperCurve {
  return (["softclip", "hardclip", "foldback", "sinefold", "chebyshev", "asymmetric", "tube"] as const)[Math.floor(Math.random() * 7)];
}

export function RandomizeControls({ 
  currentParams, 
  onRandomize, 
  oscEnvelopes, 
  onOscEnvelopesRandomize, 
  convolverSettings, 
  onConvolverSettingsRandomize,
  reverbSettings,
  onReverbSettingsRandomize,
  advancedFMSettings,
  onAdvancedFMSettingsRandomize,
  advancedGranularSettings,
  onAdvancedGranularSettingsRandomize,
  advancedFilterSettings,
  onAdvancedFilterSettingsRandomize,
  advancedWaveshaperSettings,
  onAdvancedWaveshaperSettingsRandomize,
  lowEndSettings,
  onLowEndSettingsRandomize,
  phaseSettings,
  onPhaseSettingsRandomize,
  advancedSpectralSettings,
  onAdvancedSpectralSettingsRandomize
}: RandomizeControlsProps) {
  const [chaosAmount, setChaosAmount] = useState(50);
  const [variationAmount, setVariationAmount] = useState(15); // 5-50% range for subtle to moderate variations

  const randomizeOsc = (current: Oscillator, chaos: number, forceEnabled?: boolean): Oscillator => {
    const fmPreset = randomRatioPreset();
    const pmPreset = randomRatioPreset();
    // Force enabled oscillators should have higher minimum level
    const minLevel = forceEnabled ? 60 : 30;
    return {
      enabled: forceEnabled !== undefined ? forceEnabled : Math.random() > 0.3,
      waveform: Math.random() > 0.5 ? current.waveform : randomWaveform(),
      pitch: randomPitchState(55, 2000),
      detune: Math.round(randomInRange(-50 * chaos, 50 * chaos)),
      drift: Math.round(randomInRange(0, 50 * chaos)),
      level: Math.round(randomInRange(minLevel, 100)),
      fmEnabled: Math.random() > 0.7,
      fmRatio: fmPreset === "custom" ? Math.round(randomInRange(0.5, 8) * 4) / 4 : parseFloat(fmPreset),
      fmRatioPreset: fmPreset,
      fmDepth: Math.round(randomInRange(50, 500 * chaos)),
      fmWaveform: randomWaveform(),
      fmFeedback: Math.random() > 0.7 ? Math.round(randomInRange(0, 0.5 * chaos) * 100) / 100 : 0,
      amEnabled: Math.random() > 0.75,
      amRatio: Math.round(randomInRange(0.5, 8) * 4) / 4,
      amDepth: Math.round(randomInRange(20, 80 * chaos)),
      amWaveform: randomWaveform(),
      pmEnabled: Math.random() > 0.6,
      pmRatio: pmPreset === "custom" ? Math.round(randomInRange(0.5, 8) * 4) / 4 : parseFloat(pmPreset),
      pmRatioPreset: pmPreset,
      pmDepth: Math.round(randomInRange(1, 30 * chaos)),
      pmWaveform: randomWaveform(),
      pmFeedback: Math.random() > 0.7 ? Math.round(randomInRange(0, 0.4 * chaos) * 100) / 100 : 0,
      indexEnvEnabled: Math.random() > 0.5,
      indexEnvDecay: Math.round(randomInRange(5, 50 * chaos + 10)),
      indexEnvDepth: Math.round(randomInRange(5, 40 * chaos)),
    };
  };

  const randomizeEnv = (current: Envelope, chaos: number, target: EnvelopeTarget, forceEnabled?: boolean): Envelope => {
    // One-shot safe envelope ranges - fast attacks, short holds, reasonable decays
    const isAmpEnv = target === "amplitude";
    const isPitchEnv = target === "pitch";
    
    // Amp: ultra-fast attack for transient; Filter/Pitch: slightly longer but still one-shot friendly
    const maxAttack = isAmpEnv ? 20 : Math.min(150, 200 * chaos); // Amp: 0-20ms, others: 0-150ms max
    const maxHold = isAmpEnv ? 40 : Math.min(100, 150 * chaos); // Amp: 0-40ms, others: 0-100ms max
    const minDecay = isAmpEnv ? 80 : 40; // Minimum decay
    const maxDecay = isPitchEnv ? 1500 : 2500; // Pitch shorter for snappy 808 drops, others reasonable
    const envAmount = isAmpEnv ? 100 : Math.round(randomInRange(20, 100)); // Always 100% for amp
    
    return {
      enabled: forceEnabled !== undefined ? forceEnabled : Math.random() > 0.4,
      attack: Math.round(randomInRange(0, maxAttack)),
      hold: Math.round(randomInRange(0, maxHold)),
      decay: Math.round(randomInRange(minDecay, maxDecay)),
      curve: Math.random() > 0.5 ? current.curve : randomCurve(),
      target: target,
      amount: envAmount,
    };
  };

  const randomizeAll = () => {
    const chaos = chaosAmount / 100;
    
    const params: SynthParameters = {
      oscillators: {
        osc1: randomizeOsc(currentParams.oscillators.osc1, chaos, true),
        osc2: randomizeOsc(currentParams.oscillators.osc2, chaos),
        osc3: randomizeOsc(currentParams.oscillators.osc3, chaos),
      },
      envelopes: {
        env1: randomizeEnv(currentParams.envelopes.env1, chaos, "amplitude", true),
        env2: randomizeEnv(currentParams.envelopes.env2, chaos, "filter"),
        env3: randomizeEnv(currentParams.envelopes.env3, chaos, "pitch"),
      },
      filter: {
        enabled: Math.random() > 0.3,
        frequency: Math.round(randomInRange(200, 8000, true)),
        resonance: Math.round(randomInRange(0, 15) * 10) / 10,
        type: randomFilterType(),
        combDelay: Math.round(randomInRange(1, 10) * 10) / 10,
        gain: Math.round(randomInRange(-12, 12)),
      },
      modal: {
        enabled: Math.random() > 0.7,
        basePitch: Math.round(randomInRange(100, 800, true)),
        modeCount: Math.round(randomInRange(2, 4)),
        inharmonicity: Math.round(randomInRange(0, 50 * chaos)),
        exciterType: (["noise", "impulse", "mallet", "pluck"] as const)[Math.floor(Math.random() * 4)],
        impactNoise: Math.round(randomInRange(20, 80 * chaos)),
        impactDecay: Math.round(randomInRange(5, 50)),
        modes: {
          mode1: { ratio: 1, decay: Math.round(randomInRange(200, 2000)), level: 100 },
          mode2: { ratio: Math.round(randomInRange(1.5, 4) * 100) / 100, decay: Math.round(randomInRange(150, 1500)), level: Math.round(randomInRange(40, 80)) },
          mode3: { ratio: Math.round(randomInRange(3, 7) * 100) / 100, decay: Math.round(randomInRange(100, 1000)), level: Math.round(randomInRange(20, 60)) },
          mode4: { ratio: Math.round(randomInRange(5, 12) * 100) / 100, decay: Math.round(randomInRange(80, 800)), level: Math.round(randomInRange(10, 40)) },
        },
      },
      effects: {
        saturation: Math.round(randomInRange(0, 80 * chaos)),
        bitcrusher: Math.round(randomInRange(4, 16)),
        // One-shot delay: short times for transient thickening/slap, low feedback, subtle mix
        delayEnabled: Math.random() > 0.6,
        delaySyncMode: "ms" as const, // Use ms mode for precise one-shot control
        delayTime: Math.round(randExp(1, 40, 1.5)), // 1-40ms: transient thickening (1-5ms), slap (5-20ms), tight echo (20-40ms)
        delayDivision: (["1/32", "1/16", "1/16T"] as const)[Math.floor(Math.random() * 3)], // Shorter divisions if sync mode used
        delayFeedback: Math.round(randExp(0, 15, 2.0)), // 0-15%: one-shots should decay once, not repeat
        delayMix: Math.round(randExp(3, 20, 1.5)), // 3-20%: delay should support, not announce itself
        reverbEnabled: Math.random() > 0.6,
        reverbSize: Math.round(randomInRange(15, 50)), // 15-50%: smaller rooms for tight one-shot tails
        reverbMix: Math.round(randomInRange(8, 30)), // 8-30%: preserve transient clarity
        reverbDecay: Math.round(randomInRange(0.3, 2) * 10) / 10, // 0.3-2s: short tails for one-shots
        chorusEnabled: Math.random() > 0.7,
        chorusRate: Math.round(randomInRange(0.5, 3) * 10) / 10,
        chorusDepth: Math.round(randomInRange(20, 60)),
        chorusMix: Math.round(randomInRange(20, 40)),
        transientEnabled: Math.random() > 0.7,
        transientAttack: Math.round(randomInRange(-50 * chaos, 80 * chaos)),
        transientSustain: Math.round(randomInRange(-40 * chaos, 60 * chaos)),
        limiterEnabled: Math.random() > 0.6,
        limiterThreshold: Math.round(randomInRange(-20, -3)),
        limiterRelease: Math.round(randomInRange(30, 200)),
        multibandEnabled: Math.random() > 0.75,
        multibandLowFreq: Math.round(randomInRange(100, 300)),
        multibandHighFreq: Math.round(randomInRange(3000, 8000)),
        multibandLowDrive: Math.round(randomInRange(0, 60 * chaos)),
        multibandMidDrive: Math.round(randomInRange(0, 70 * chaos)),
        multibandHighDrive: Math.round(randomInRange(0, 80 * chaos)),
      },
      additive: {
        enabled: Math.random() > 0.8,
        basePitch: Math.round(randomInRange(55, 440, true)),
        partialCount: Math.round(randomInRange(4, 8)),
        randomness: Math.round(randomInRange(0, 40 * chaos)),
        partials: {
          p1: { level: 100, detune: 0 },
          p2: { level: Math.round(randomInRange(20, 80)), detune: Math.round(randomInRange(-20, 20)) },
          p3: { level: Math.round(randomInRange(10, 60)), detune: Math.round(randomInRange(-20, 20)) },
          p4: { level: Math.round(randomInRange(5, 50)), detune: Math.round(randomInRange(-20, 20)) },
          p5: { level: Math.round(randomInRange(0, 40)), detune: Math.round(randomInRange(-20, 20)) },
          p6: { level: Math.round(randomInRange(0, 35)), detune: Math.round(randomInRange(-20, 20)) },
          p7: { level: Math.round(randomInRange(0, 30)), detune: Math.round(randomInRange(-20, 20)) },
          p8: { level: Math.round(randomInRange(0, 25)), detune: Math.round(randomInRange(-20, 20)) },
        },
        spread: Math.round(randomInRange(0, 50 * chaos)),
        decaySlope: Math.round(randomInRange(0, 60 * chaos)),
      },
      granular: {
        enabled: Math.random() > 0.8,
        density: Math.round(randomInRange(5, 50 * chaos + 10)),
        grainSize: Math.round(randomInRange(10, 100)),
        pitch: Math.round(randomInRange(100, 800, true)),
        pitchSpray: Math.round(randomInRange(0, 60 * chaos)),
        scatter: Math.round(randomInRange(0, 70 * chaos)),
        texture: (["noise", "sine", "saw", "click"] as const)[Math.floor(Math.random() * 4)],
      },
      waveshaper: {
        enabled: Math.random() > 0.6,
        curve: randomWaveshaperCurve(),
        drive: Math.round(randomInRange(20, 80 * chaos)),
        mix: Math.round(randomInRange(50, 100)),
        preFilterFreq: Math.round(randomInRange(100, 500)),
        preFilterEnabled: Math.random() > 0.7,
        postFilterFreq: Math.round(randomInRange(4000, 12000)),
        postFilterEnabled: Math.random() > 0.7,
        oversample: (["none", "2x", "4x"] as const)[Math.floor(Math.random() * 3)],
      },
      convolver: {
        // One-shot convolution: always use built-in IRs, subtle mix
        enabled: Math.random() > 0.5,
        irName: getRandomOneShotIR(), // Use optimized one-shot IR
        mix: Math.round(randExp(3, 15, 1.5)), // 3-15%: convolution adds density fast, a little goes a long way
        useCustomIR: false, // Use built-in one-shot optimized IRs
      },
      spectralScrambler: {
        enabled: Math.random() > 0.7,
        fftSize: (["512", "1024", "2048"] as const)[Math.floor(Math.random() * 3)],
        scrambleAmount: Math.round(randomInRange(10, 50 * chaos)),
        binShift: Math.round(randomInRange(-20 * chaos, 20 * chaos)),
        freeze: false,
        mix: Math.round(randomInRange(20, 50)),
        gateThreshold: Math.random() > 0.5 ? Math.round(randomInRange(-40, -20)) : 0,
        stretch: Math.round(randomInRange(0.7, 1.5) * 100) / 100,
        binDensity: Math.round(randomInRange(30, 100)),
      },
      clickLayer: {
        enabled: Math.random() > 0.5,
        level: Math.round(randomInRange(30, 80 * chaos)),
        decay: Math.round(randomInRange(2, 8) * 10) / 10,
        filterType: (["highpass", "bandpass"] as const)[Math.floor(Math.random() * 2)],
        filterFreq: Math.round(randomInRange(3000, 12000, true)),
        filterQ: Math.round(randomInRange(2, 8) * 10) / 10,
        srrEnabled: Math.random() > 0.7,
        srrAmount: Math.round(randomInRange(4, 12)),
        noiseType: (["white", "pink", "brown"] as const)[Math.floor(Math.random() * 3)],
      },
      subOsc: randomizeSubSafe(),
      saturationChain: {
        enabled: Math.random() > 0.5,
        tapeEnabled: Math.random() > 0.4,
        tapeDrive: Math.round(randomInRange(10, 60 * chaos)),
        tapeWarmth: Math.round(randomInRange(20, 70)),
        tubeEnabled: Math.random() > 0.5,
        tubeDrive: Math.round(randomInRange(10, 50 * chaos)),
        tubeBias: Math.round(randomInRange(30, 70)),
        transistorEnabled: Math.random() > 0.6,
        transistorDrive: Math.round(randomInRange(10, 70 * chaos)),
        transistorAsymmetry: Math.round(randomInRange(0, 50 * chaos)),
        mix: Math.round(randomInRange(60, 100)),
      },
      tempo: Math.round(randomInRange(80, 160)),
      modulators: [],
      modulationRoutes: [],
      mastering: currentParams.mastering,
      output: currentParams.output,
    };

    onRandomize(params);
    
    if (onOscEnvelopesRandomize) {
      onOscEnvelopesRandomize({
        osc1: randomizeOscEnvelope(chaos),
        osc2: randomizeOscEnvelope(chaos),
        osc3: randomizeOscEnvelope(chaos),
      });
    }
    
    if (onConvolverSettingsRandomize) {
      // One-shot convolver settings: short pre-delay, tight filtering, no extreme stretch
      onConvolverSettingsRandomize({
        predelay: Math.round(randExp(0, 10, 2.0)), // 0-10ms: preserve transient snap
        decay: Math.round(randomInRange(60, 100)), // 60-100%: built-in IRs are already short (50-300ms)
        lowCut: Math.round(randomInRange(150, 600, true)), // 150-600Hz: prevent low-end smearing
        highCut: Math.round(randomInRange(3000, 8000, true)), // 3-8kHz: avoid fizzy tails
        reverse: Math.random() > 0.92, // Rare: ~8% chance for micro-swell effect
        stretch: Math.round(randomInRange(0.8, 1.2) * 100) / 100, // 0.8-1.2x: keep IR character intact
      });
    }
    
    // Randomize reverb settings (type, damping, diffusion, modulation, predelay, stereoWidth)
    // One-shot optimized: prefer room/plate (tighter), higher damping for faster HF decay, shorter predelay
    if (onReverbSettingsRandomize) {
      const reverbTypes: ReverbType[] = ["room", "plate", "hall"]; // Room/plate more likely (appear first)
      const typeWeights = [0.4, 0.4, 0.2]; // 40% room, 40% plate, 20% hall
      const rand = Math.random();
      const type = rand < typeWeights[0] ? "room" : rand < typeWeights[0] + typeWeights[1] ? "plate" : "hall";
      onReverbSettingsRandomize({
        type,
        damping: Math.round(randomInRange(45, 90)), // 45-90%: faster HF decay for cleaner one-shot tails
        diffusion: Math.round(randomInRange(50, 95)), // 50-95%: good density without smearing
        modulation: Math.round(randomInRange(5, 30)), // 5-30%: subtle modulation
        predelay: Math.round(randomInRange(0, 40 * chaos)), // 0-40ms max: keep reverb tight to transient
        stereoWidth: Math.round(randomInRange(40, 90)), // 40-90%: moderate width for focused sound
      });
    }
    
    // Randomize advanced FM settings (algorithm, operator 2)
    if (onAdvancedFMSettingsRandomize) {
      const algorithms: FMAlgorithm[] = ["series", "parallel", "feedback", "mixed"];
      const randomAdvancedFM = (): AdvancedFMSettings => ({
        algorithm: algorithms[Math.floor(Math.random() * 4)],
        operator1Detune: Math.round(randomInRange(-30 * chaos, 30 * chaos)),
        operator2: {
          enabled: Math.random() > 0.5,
          ratio: [0.5, 1, 2, 3, 4, 6, 8][Math.floor(Math.random() * 7)],
          ratioDetune: Math.round(randomInRange(-50 * chaos, 50 * chaos)),
          depth: Math.round(randExp(50, 600, 1.5)),
          waveform: ["sine", "triangle", "sawtooth", "square"][Math.floor(Math.random() * 4)] as "sine" | "triangle" | "sawtooth" | "square",
          feedback: Math.round(Math.random() * 50) / 100,
        },
      });
      onAdvancedFMSettingsRandomize({
        osc1: randomAdvancedFM(),
        osc2: randomAdvancedFM(),
        osc3: randomAdvancedFM(),
      });
    }
    
    // Randomize advanced granular settings
    if (onAdvancedGranularSettingsRandomize) {
      const envelopeShapes: GrainEnvelopeShape[] = ["hanning", "gaussian", "triangle", "trapezoid", "rectangular"];
      onAdvancedGranularSettingsRandomize({
        envelopeShape: envelopeShapes[Math.floor(Math.random() * 5)],
        positionJitter: Math.round(randomInRange(5, 60 * chaos)),
        overlap: Math.round(randomInRange(20, 80)),
        reverseProbability: Math.round(randExp(0, 30 * chaos, 2.0)), // Bias toward low reverse probability
        stereoSpread: Math.round(randomInRange(10, 70)),
        freeze: false, // Never randomize to freeze mode
      });
    }
    
    // Randomize advanced filter settings
    if (onAdvancedFilterSettingsRandomize && advancedFilterSettings) {
      const randomFilter = randomizeAdvancedFilterSettings(chaosAmount);
      onAdvancedFilterSettingsRandomize({ ...advancedFilterSettings, ...randomFilter });
    }
    
    // Randomize advanced waveshaper settings
    if (onAdvancedWaveshaperSettingsRandomize && advancedWaveshaperSettings) {
      const randomWaveshaper = randomizeAdvancedWaveshaperSettings(chaosAmount);
      onAdvancedWaveshaperSettingsRandomize({ 
        ...advancedWaveshaperSettings, 
        ...randomWaveshaper,
        multiband: { ...advancedWaveshaperSettings.multiband, ...randomWaveshaper.multiband }
      });
    }
    
    // Randomize low-end settings (sub-harmonic generator, bass exciter, sub EQ, mono sum, DC filter)
    if (onLowEndSettingsRandomize) {
      const randomLowEnd = randomizeLowEndSettings(chaosAmount);
      onLowEndSettingsRandomize({
        ...defaultLowEndSettings,
        ...randomLowEnd,
        subHarmonic: { ...defaultLowEndSettings.subHarmonic, ...randomLowEnd.subHarmonic },
        bassExciter: { ...defaultLowEndSettings.bassExciter, ...randomLowEnd.bassExciter },
        subEQ: { ...defaultLowEndSettings.subEQ, ...randomLowEnd.subEQ },
      });
    }
    
    // Randomize phase settings (0-360° for each oscillator, focused on constructive alignment)
    if (onPhaseSettingsRandomize) {
      // For heavy sub bass, often we want phases aligned (0°) or inverted (180°)
      // But allow some random variation too
      const randomPhaseAlignment = () => {
        const alignments = [0, 0, 0, 90, 180, 180, 270]; // Bias toward 0° and 180°
        return alignments[Math.floor(Math.random() * alignments.length)] + Math.round(randomInRange(-15, 15) * chaos);
      };
      onPhaseSettingsRandomize({
        osc1Phase: 0, // Keep osc1 at 0 as reference
        osc2Phase: Math.round(randomPhaseAlignment()) % 360,
        osc3Phase: Math.round(randomPhaseAlignment()) % 360,
        subPhase: Math.round(randomPhaseAlignment()) % 360,
      });
    }
    
    // Randomize advanced spectral settings
    if (onAdvancedSpectralSettingsRandomize) {
      onAdvancedSpectralSettingsRandomize(randomizeAdvancedSpectralSettings(chaosAmount));
    }
  };

  const mutate = () => {
    // Use variationAmount directly (5-50% maps to 0.05-0.50 strength)
    const strength = variationAmount / 100;

    const mutateValue = (current: number, min: number, max: number, log = false): number => {
      const range = log ? Math.log(max) - Math.log(min) : max - min;
      const mutation = (Math.random() - 0.5) * 2 * strength * range;
      
      if (log && min > 0) {
        const logCurrent = Math.log(current);
        const newLogValue = logCurrent + mutation;
        return Math.max(min, Math.min(max, Math.exp(newLogValue)));
      }
      
      return Math.max(min, Math.min(max, current + mutation * (max - min)));
    };

    const mutateOsc = (osc: Oscillator): Oscillator => ({
      enabled: osc.enabled,
      waveform: Math.random() > 0.9 ? randomWaveform() : osc.waveform,
      pitch: mutatePitchState(osc.pitch, strength),
      detune: Math.round(mutateValue(osc.detune, -100, 100)),
      drift: Math.round(mutateValue(osc.drift, 0, 100)),
      level: Math.round(mutateValue(osc.level, 0, 100)),
      fmEnabled: osc.fmEnabled,
      fmRatio: Math.round(mutateValue(osc.fmRatio, 0.25, 16) * 4) / 4,
      fmRatioPreset: osc.fmRatioPreset,
      fmDepth: Math.round(mutateValue(osc.fmDepth, 0, 1000)),
      fmWaveform: Math.random() > 0.9 ? randomWaveform() : osc.fmWaveform,
      fmFeedback: Math.round(mutateValue(osc.fmFeedback, 0, 1) * 100) / 100,
      amEnabled: osc.amEnabled,
      amRatio: Math.round(mutateValue(osc.amRatio, 0.25, 16) * 4) / 4,
      amDepth: Math.round(mutateValue(osc.amDepth, 0, 100)),
      amWaveform: Math.random() > 0.9 ? randomWaveform() : osc.amWaveform,
      pmEnabled: osc.pmEnabled,
      pmRatio: Math.round(mutateValue(osc.pmRatio, 0.25, 16) * 4) / 4,
      pmRatioPreset: osc.pmRatioPreset,
      pmDepth: Math.round(mutateValue(osc.pmDepth, 0, 60)),
      pmWaveform: Math.random() > 0.9 ? randomWaveform() : osc.pmWaveform,
      pmFeedback: Math.round(mutateValue(osc.pmFeedback, 0, 1) * 100) / 100,
      indexEnvEnabled: osc.indexEnvEnabled,
      indexEnvDecay: Math.round(mutateValue(osc.indexEnvDecay, 2, 100)),
      indexEnvDepth: Math.round(mutateValue(osc.indexEnvDepth, 0, 60)),
    });

    // One-shot safe envelope mutation ranges
    const mutateEnv = (env: Envelope): Envelope => {
      const isAmpEnv = env.target === "amplitude";
      const isPitchEnv = env.target === "pitch";
      // Amp: very fast attack; others: moderate but still one-shot friendly
      const maxAttack = isAmpEnv ? 50 : 200; // Amp: 0-50ms, others: 0-200ms
      const maxHold = isAmpEnv ? 80 : 150; // Amp: 0-80ms, others: 0-150ms
      const maxDecay = isPitchEnv ? 2000 : 3000; // Pitch: 50-2000ms, others: 50-3000ms
      
      return {
        enabled: env.enabled,
        attack: Math.round(mutateValue(env.attack, 0, maxAttack)),
        hold: Math.round(mutateValue(env.hold, 0, maxHold)),
        decay: Math.round(mutateValue(env.decay, 50, maxDecay)),
        curve: env.curve,
        target: env.target,
        amount: Math.round(mutateValue(env.amount, -100, 100)),
      };
    };

    const params: SynthParameters = {
      oscillators: {
        osc1: mutateOsc(currentParams.oscillators.osc1),
        osc2: mutateOsc(currentParams.oscillators.osc2),
        osc3: mutateOsc(currentParams.oscillators.osc3),
      },
      envelopes: {
        env1: mutateEnv(currentParams.envelopes.env1),
        env2: mutateEnv(currentParams.envelopes.env2),
        env3: mutateEnv(currentParams.envelopes.env3),
      },
      filter: {
        enabled: currentParams.filter.enabled,
        frequency: Math.round(mutateValue(currentParams.filter.frequency, 20, 20000, true)),
        resonance: Math.round(mutateValue(currentParams.filter.resonance, 0, 30) * 10) / 10,
        type: currentParams.filter.type,
        combDelay: Math.round(mutateValue(currentParams.filter.combDelay, 0.1, 50) * 10) / 10,
        gain: Math.round(mutateValue(currentParams.filter.gain, -24, 24)),
      },
      modal: {
        enabled: currentParams.modal.enabled,
        basePitch: Math.round(mutateValue(currentParams.modal.basePitch, 20, 2000, true)),
        modeCount: currentParams.modal.modeCount,
        inharmonicity: Math.round(mutateValue(currentParams.modal.inharmonicity, 0, 100)),
        exciterType: currentParams.modal.exciterType,
        impactNoise: Math.round(mutateValue(currentParams.modal.impactNoise, 0, 100)),
        impactDecay: Math.round(mutateValue(currentParams.modal.impactDecay, 1, 100)),
        modes: {
          mode1: { ratio: 1, decay: Math.round(mutateValue(currentParams.modal.modes.mode1.decay, 10, 5000)), level: currentParams.modal.modes.mode1.level },
          mode2: { ratio: Math.round(mutateValue(currentParams.modal.modes.mode2.ratio, 0.5, 16) * 100) / 100, decay: Math.round(mutateValue(currentParams.modal.modes.mode2.decay, 10, 5000)), level: Math.round(mutateValue(currentParams.modal.modes.mode2.level, 0, 100)) },
          mode3: { ratio: Math.round(mutateValue(currentParams.modal.modes.mode3.ratio, 0.5, 16) * 100) / 100, decay: Math.round(mutateValue(currentParams.modal.modes.mode3.decay, 10, 5000)), level: Math.round(mutateValue(currentParams.modal.modes.mode3.level, 0, 100)) },
          mode4: { ratio: Math.round(mutateValue(currentParams.modal.modes.mode4.ratio, 0.5, 16) * 100) / 100, decay: Math.round(mutateValue(currentParams.modal.modes.mode4.decay, 10, 5000)), level: Math.round(mutateValue(currentParams.modal.modes.mode4.level, 0, 100)) },
        },
      },
      additive: {
        enabled: currentParams.additive.enabled,
        basePitch: Math.round(mutateValue(currentParams.additive.basePitch, 20, 2000, true)),
        partialCount: currentParams.additive.partialCount,
        randomness: Math.round(mutateValue(currentParams.additive.randomness, 0, 100)),
        partials: {
          p1: { level: currentParams.additive.partials.p1.level, detune: 0 },
          p2: { level: Math.round(mutateValue(currentParams.additive.partials.p2.level, 0, 100)), detune: Math.round(mutateValue(currentParams.additive.partials.p2.detune, -100, 100)) },
          p3: { level: Math.round(mutateValue(currentParams.additive.partials.p3.level, 0, 100)), detune: Math.round(mutateValue(currentParams.additive.partials.p3.detune, -100, 100)) },
          p4: { level: Math.round(mutateValue(currentParams.additive.partials.p4.level, 0, 100)), detune: Math.round(mutateValue(currentParams.additive.partials.p4.detune, -100, 100)) },
          p5: { level: Math.round(mutateValue(currentParams.additive.partials.p5.level, 0, 100)), detune: Math.round(mutateValue(currentParams.additive.partials.p5.detune, -100, 100)) },
          p6: { level: Math.round(mutateValue(currentParams.additive.partials.p6.level, 0, 100)), detune: Math.round(mutateValue(currentParams.additive.partials.p6.detune, -100, 100)) },
          p7: { level: Math.round(mutateValue(currentParams.additive.partials.p7.level, 0, 100)), detune: Math.round(mutateValue(currentParams.additive.partials.p7.detune, -100, 100)) },
          p8: { level: Math.round(mutateValue(currentParams.additive.partials.p8.level, 0, 100)), detune: Math.round(mutateValue(currentParams.additive.partials.p8.detune, -100, 100)) },
        },
        spread: Math.round(mutateValue(currentParams.additive.spread, 0, 100)),
        decaySlope: Math.round(mutateValue(currentParams.additive.decaySlope, 0, 100)),
      },
      effects: {
        saturation: Math.round(mutateValue(currentParams.effects.saturation, 0, 100)),
        bitcrusher: Math.round(mutateValue(currentParams.effects.bitcrusher, 1, 16)),
        delayEnabled: currentParams.effects.delayEnabled,
        delaySyncMode: currentParams.effects.delaySyncMode,
        // One-shot delay mutation: keep within short/subtle ranges
        delayTime: Math.round(mutateValue(currentParams.effects.delayTime, 1, 40)), // 1-40ms for one-shots
        delayDivision: currentParams.effects.delayDivision,
        delayFeedback: Math.round(mutateValue(currentParams.effects.delayFeedback, 0, 15)), // 0-15% max
        delayMix: Math.round(mutateValue(currentParams.effects.delayMix, 3, 20)), // 3-20% subtle mix
        reverbEnabled: currentParams.effects.reverbEnabled,
        // One-shot reverb mutation: keep within tight ranges
        reverbSize: Math.round(mutateValue(currentParams.effects.reverbSize, 10, 60)), // 10-60%: tight rooms
        reverbMix: Math.round(mutateValue(currentParams.effects.reverbMix, 5, 35)), // 5-35%: preserve transient
        reverbDecay: Math.round(mutateValue(currentParams.effects.reverbDecay, 0.2, 2.5) * 10) / 10, // 0.2-2.5s: short tails
        chorusEnabled: currentParams.effects.chorusEnabled,
        chorusRate: Math.round(mutateValue(currentParams.effects.chorusRate, 0.1, 10) * 10) / 10,
        chorusDepth: Math.round(mutateValue(currentParams.effects.chorusDepth, 0, 100)),
        chorusMix: Math.round(mutateValue(currentParams.effects.chorusMix, 0, 100)),
        transientEnabled: currentParams.effects.transientEnabled,
        transientAttack: Math.round(mutateValue(currentParams.effects.transientAttack, -100, 100)),
        transientSustain: Math.round(mutateValue(currentParams.effects.transientSustain, -100, 100)),
        limiterEnabled: currentParams.effects.limiterEnabled,
        limiterThreshold: Math.round(mutateValue(currentParams.effects.limiterThreshold, -30, 0)),
        limiterRelease: Math.round(mutateValue(currentParams.effects.limiterRelease, 10, 500)),
        multibandEnabled: currentParams.effects.multibandEnabled,
        multibandLowFreq: Math.round(mutateValue(currentParams.effects.multibandLowFreq, 80, 400)),
        multibandHighFreq: Math.round(mutateValue(currentParams.effects.multibandHighFreq, 2000, 10000)),
        multibandLowDrive: Math.round(mutateValue(currentParams.effects.multibandLowDrive, 0, 100)),
        multibandMidDrive: Math.round(mutateValue(currentParams.effects.multibandMidDrive, 0, 100)),
        multibandHighDrive: Math.round(mutateValue(currentParams.effects.multibandHighDrive, 0, 100)),
      },
      granular: {
        enabled: currentParams.granular.enabled,
        density: Math.round(mutateValue(currentParams.granular.density, 1, 100)),
        grainSize: Math.round(mutateValue(currentParams.granular.grainSize, 5, 200)),
        pitch: Math.round(mutateValue(currentParams.granular.pitch, 20, 2000, true)),
        pitchSpray: Math.round(mutateValue(currentParams.granular.pitchSpray, 0, 100)),
        scatter: Math.round(mutateValue(currentParams.granular.scatter, 0, 100)),
        texture: currentParams.granular.texture,
      },
      waveshaper: {
        enabled: currentParams.waveshaper.enabled,
        curve: Math.random() > 0.9 ? randomWaveshaperCurve() : currentParams.waveshaper.curve,
        drive: Math.round(mutateValue(currentParams.waveshaper.drive, 0, 100)),
        mix: Math.round(mutateValue(currentParams.waveshaper.mix, 0, 100)),
        preFilterFreq: Math.round(mutateValue(currentParams.waveshaper.preFilterFreq, 20, 20000, true)),
        preFilterEnabled: currentParams.waveshaper.preFilterEnabled,
        postFilterFreq: Math.round(mutateValue(currentParams.waveshaper.postFilterFreq, 20, 20000, true)),
        postFilterEnabled: currentParams.waveshaper.postFilterEnabled,
        oversample: currentParams.waveshaper.oversample,
      },
      convolver: {
        enabled: currentParams.convolver.enabled,
        irName: currentParams.convolver.irName,
        // One-shot convolution mutation: keep mix subtle (3-15%)
        mix: Math.round(mutateValue(currentParams.convolver.mix, 3, 15)),
        useCustomIR: currentParams.convolver.useCustomIR,
      },
      spectralScrambler: {
        enabled: currentParams.spectralScrambler.enabled,
        fftSize: currentParams.spectralScrambler.fftSize,
        scrambleAmount: Math.round(mutateValue(currentParams.spectralScrambler.scrambleAmount, 0, 60)),
        binShift: Math.round(mutateValue(currentParams.spectralScrambler.binShift, -30, 30)),
        freeze: false,
        mix: Math.round(mutateValue(currentParams.spectralScrambler.mix, 10, 60)),
        gateThreshold: Math.round(mutateValue(currentParams.spectralScrambler.gateThreshold, -60, 0)),
        stretch: Math.round(mutateValue(currentParams.spectralScrambler.stretch, 0.5, 2.0) * 100) / 100,
        binDensity: Math.round(mutateValue(currentParams.spectralScrambler.binDensity, 5, 100)),
      },
      clickLayer: {
        enabled: currentParams.clickLayer.enabled,
        level: Math.round(mutateValue(currentParams.clickLayer.level, 0, 100)),
        decay: Math.round(mutateValue(currentParams.clickLayer.decay, 1, 10) * 10) / 10,
        filterType: currentParams.clickLayer.filterType,
        filterFreq: Math.round(mutateValue(currentParams.clickLayer.filterFreq, 1000, 15000, true)),
        filterQ: Math.round(mutateValue(currentParams.clickLayer.filterQ, 1, 10) * 10) / 10,
        srrEnabled: currentParams.clickLayer.srrEnabled,
        srrAmount: Math.round(mutateValue(currentParams.clickLayer.srrAmount, 1, 16)),
        noiseType: currentParams.clickLayer.noiseType,
      },
      subOsc: randomizeSubSafe({
        enabled: currentParams.subOsc.enabled,
        waveform: currentParams.subOsc.waveform,
        octave: currentParams.subOsc.octave,
        level: currentParams.subOsc.level,
        attack: currentParams.subOsc.attack,
        decay: currentParams.subOsc.decay,
        filterEnabled: currentParams.subOsc.filterEnabled,
        filterFreq: currentParams.subOsc.filterFreq,
        hpFreq: currentParams.subOsc.hpFreq ?? 25,
        drive: currentParams.subOsc.drive ?? 0,
        pitchEnvBypass: currentParams.subOsc.pitchEnvBypass,
      }),
      saturationChain: {
        enabled: currentParams.saturationChain.enabled,
        tapeEnabled: currentParams.saturationChain.tapeEnabled,
        tapeDrive: Math.round(mutateValue(currentParams.saturationChain.tapeDrive, 0, 100)),
        tapeWarmth: Math.round(mutateValue(currentParams.saturationChain.tapeWarmth, 0, 100)),
        tubeEnabled: currentParams.saturationChain.tubeEnabled,
        tubeDrive: Math.round(mutateValue(currentParams.saturationChain.tubeDrive, 0, 100)),
        tubeBias: Math.round(mutateValue(currentParams.saturationChain.tubeBias, 0, 100)),
        transistorEnabled: currentParams.saturationChain.transistorEnabled,
        transistorDrive: Math.round(mutateValue(currentParams.saturationChain.transistorDrive, 0, 100)),
        transistorAsymmetry: Math.round(mutateValue(currentParams.saturationChain.transistorAsymmetry, 0, 100)),
        mix: Math.round(mutateValue(currentParams.saturationChain.mix, 0, 100)),
      },
      tempo: currentParams.tempo,
      modulators: currentParams.modulators,
      modulationRoutes: currentParams.modulationRoutes,
      mastering: currentParams.mastering,
      output: currentParams.output,
    };

    onRandomize(params);
    
    if (onOscEnvelopesRandomize && oscEnvelopes) {
      onOscEnvelopesRandomize({
        osc1: mutateOscEnvelope(oscEnvelopes.osc1, strength),
        osc2: mutateOscEnvelope(oscEnvelopes.osc2, strength),
        osc3: mutateOscEnvelope(oscEnvelopes.osc3, strength),
      });
    }
    
    if (onConvolverSettingsRandomize && convolverSettings) {
      // One-shot convolver settings mutation: keep within safe ranges
      onConvolverSettingsRandomize({
        predelay: Math.round(mutateValue(convolverSettings.predelay, 0, 10)), // 0-10ms max
        decay: Math.round(mutateValue(convolverSettings.decay, 60, 100)), // Keep full decay
        lowCut: Math.round(mutateValue(convolverSettings.lowCut, 150, 600, true)), // 150-600Hz
        highCut: Math.round(mutateValue(convolverSettings.highCut, 3000, 8000, true)), // 3-8kHz
        reverse: convolverSettings.reverse,
        stretch: Math.round(mutateValue(convolverSettings.stretch, 0.8, 1.2) * 100) / 100, // 0.8-1.2x
      });
    }
    
    // Mutate reverb settings with one-shot safe ranges (keep type)
    if (onReverbSettingsRandomize && reverbSettings) {
      onReverbSettingsRandomize({
        type: reverbSettings.type, // Keep current type
        damping: Math.round(mutateValue(reverbSettings.damping, 40, 95)), // 40-95%: faster HF decay for clean tails
        diffusion: Math.round(mutateValue(reverbSettings.diffusion, 45, 95)), // 45-95%: good density
        modulation: Math.round(mutateValue(reverbSettings.modulation, 0, 35)), // 0-35%: subtle modulation
        predelay: Math.round(mutateValue(reverbSettings.predelay, 0, 50)), // 0-50ms: tight to transient
        stereoWidth: Math.round(mutateValue(reverbSettings.stereoWidth, 35, 95)), // 35-95%: moderate width
      });
    }
    
    // Mutate advanced FM settings
    if (onAdvancedFMSettingsRandomize && advancedFMSettings) {
      const mutateAdvancedFM = (fm: AdvancedFMSettings): AdvancedFMSettings => ({
        algorithm: fm.algorithm, // Keep algorithm
        operator1Detune: Math.round(mutateValue(fm.operator1Detune, -50, 50)),
        operator2: {
          enabled: fm.operator2.enabled,
          ratio: fm.operator2.ratio, // Keep ratio
          ratioDetune: Math.round(mutateValue(fm.operator2.ratioDetune, -50, 50)),
          depth: Math.round(mutateValue(fm.operator2.depth, 0, 800)),
          waveform: fm.operator2.waveform, // Keep waveform
          feedback: Math.round(mutateValue(fm.operator2.feedback * 100, 0, 60)) / 100,
        },
      });
      onAdvancedFMSettingsRandomize({
        osc1: mutateAdvancedFM(advancedFMSettings.osc1),
        osc2: mutateAdvancedFM(advancedFMSettings.osc2),
        osc3: mutateAdvancedFM(advancedFMSettings.osc3),
      });
    }
    
    // Mutate advanced granular settings
    if (onAdvancedGranularSettingsRandomize && advancedGranularSettings) {
      onAdvancedGranularSettingsRandomize({
        envelopeShape: advancedGranularSettings.envelopeShape, // Keep envelope shape
        positionJitter: Math.round(mutateValue(advancedGranularSettings.positionJitter, 0, 80)),
        overlap: Math.round(mutateValue(advancedGranularSettings.overlap, 10, 90)),
        reverseProbability: Math.round(mutateValue(advancedGranularSettings.reverseProbability, 0, 40)),
        stereoSpread: Math.round(mutateValue(advancedGranularSettings.stereoSpread, 0, 100)),
        freeze: advancedGranularSettings.freeze, // Keep freeze state
      });
    }
    
    // Mutate advanced filter settings (subtle changes)
    if (onAdvancedFilterSettingsRandomize && advancedFilterSettings) {
      onAdvancedFilterSettingsRandomize({
        ...advancedFilterSettings,
        driveAmount: Math.round(mutateValue(advancedFilterSettings.driveAmount, 0, 100)),
        filter2Frequency: Math.round(mutateValue(advancedFilterSettings.filter2Frequency, 100, 10000, true)),
        filter2Resonance: Math.round(mutateValue(advancedFilterSettings.filter2Resonance, 0, 25) * 10) / 10,
        dualMix: Math.round(mutateValue(advancedFilterSettings.dualMix, 20, 80)),
        formantMix: Math.round(mutateValue(advancedFilterSettings.formantMix, 20, 80)),
        fmDepth: Math.round(mutateValue(advancedFilterSettings.fmDepth, 0, 80)),
        keytrackAmount: Math.round(mutateValue(advancedFilterSettings.keytrackAmount, -80, 80)),
      });
    }
    
    // Mutate advanced waveshaper settings (subtle changes)
    if (onAdvancedWaveshaperSettingsRandomize && advancedWaveshaperSettings) {
      onAdvancedWaveshaperSettingsRandomize({
        ...advancedWaveshaperSettings,
        positiveAmount: Math.round(mutateValue(advancedWaveshaperSettings.positiveAmount, 20, 90)),
        negativeAmount: Math.round(mutateValue(advancedWaveshaperSettings.negativeAmount, 20, 90)),
        dcOffset: Math.round(mutateValue(advancedWaveshaperSettings.dcOffset, -30, 30)),
        dynamicSensitivity: Math.round(mutateValue(advancedWaveshaperSettings.dynamicSensitivity, 20, 80)),
        chebyshevOrder: Math.round(mutateValue(advancedWaveshaperSettings.chebyshevOrder, 2, 7)),
        foldbackIterations: Math.round(mutateValue(advancedWaveshaperSettings.foldbackIterations, 1, 4)),
        multiband: {
          ...advancedWaveshaperSettings.multiband,
          lowDrive: Math.round(mutateValue(advancedWaveshaperSettings.multiband.lowDrive, 10, 80)),
          midDrive: Math.round(mutateValue(advancedWaveshaperSettings.multiband.midDrive, 10, 80)),
          highDrive: Math.round(mutateValue(advancedWaveshaperSettings.multiband.highDrive, 10, 80)),
        },
      });
    }
    
    // Mutate low-end settings
    if (onLowEndSettingsRandomize && lowEndSettings) {
      onLowEndSettingsRandomize({
        ...lowEndSettings,
        dcFilterFreq: Math.round(mutateValue(lowEndSettings.dcFilterFreq, 3, 15)),
        monoSumFreq: Math.round(mutateValue(lowEndSettings.monoSumFreq, 80, 200)),
        monoSumWidth: Math.round(mutateValue(lowEndSettings.monoSumWidth, 20, 80)),
        subHarmonic: {
          ...lowEndSettings.subHarmonic,
          octaveDown1: Math.round(mutateValue(lowEndSettings.subHarmonic.octaveDown1, 5, 60)),
          octaveDown2: Math.round(mutateValue(lowEndSettings.subHarmonic.octaveDown2, 0, 40)),
          filterFreq: Math.round(mutateValue(lowEndSettings.subHarmonic.filterFreq, 30, 120)),
          drive: Math.round(mutateValue(lowEndSettings.subHarmonic.drive, 0, 50)),
        },
        bassExciter: {
          ...lowEndSettings.bassExciter,
          frequency: Math.round(mutateValue(lowEndSettings.bassExciter.frequency, 50, 120)),
          harmonics: Math.round(mutateValue(lowEndSettings.bassExciter.harmonics, 20, 70)),
          subOctave: Math.round(mutateValue(lowEndSettings.bassExciter.subOctave, 10, 50)),
          presence: Math.round(mutateValue(lowEndSettings.bassExciter.presence, 10, 50)),
          mix: Math.round(mutateValue(lowEndSettings.bassExciter.mix, 25, 70)),
        },
        subEQ: {
          ...lowEndSettings.subEQ,
          lowShelfFreq: Math.round(mutateValue(lowEndSettings.subEQ.lowShelfFreq, 40, 100)),
          lowShelfGain: Math.round(mutateValue(lowEndSettings.subEQ.lowShelfGain, -6, 8) * 2) / 2,
          lowShelfQ: Math.round(mutateValue(lowEndSettings.subEQ.lowShelfQ, 0.4, 1.5) * 10) / 10,
          subBoostFreq: Math.round(mutateValue(lowEndSettings.subEQ.subBoostFreq, 30, 70)),
          subBoostGain: Math.round(mutateValue(lowEndSettings.subEQ.subBoostGain, 0, 10) * 2) / 2,
          subBoostQ: Math.round(mutateValue(lowEndSettings.subEQ.subBoostQ, 1.5, 6) * 2) / 2,
        },
      });
    }
    
    // Mutate phase settings (small adjustments for fine-tuning)
    if (onPhaseSettingsRandomize && phaseSettings) {
      const mutatePhase = (current: number) => {
        const mutation = Math.round((Math.random() - 0.5) * 30 * strength);
        return ((current + mutation) % 360 + 360) % 360;
      };
      onPhaseSettingsRandomize({
        osc1Phase: phaseSettings.osc1Phase, // Keep osc1 stable as reference
        osc2Phase: mutatePhase(phaseSettings.osc2Phase),
        osc3Phase: mutatePhase(phaseSettings.osc3Phase),
        subPhase: mutatePhase(phaseSettings.subPhase),
      });
    }
    
    // Mutate advanced spectral settings
    if (onAdvancedSpectralSettingsRandomize && advancedSpectralSettings) {
      const mutateSpectralValue = (current: number, min: number, max: number) => {
        const mutation = (Math.random() - 0.5) * 2 * strength * (max - min);
        return Math.round(Math.max(min, Math.min(max, current + mutation)));
      };
      
      onAdvancedSpectralSettingsRandomize({
        tilt: {
          ...advancedSpectralSettings.tilt,
          amount: mutateSpectralValue(advancedSpectralSettings.tilt.amount, -100, 100),
          envelopeAmount: mutateSpectralValue(advancedSpectralSettings.tilt.envelopeAmount, -100, 100),
        },
        blur: {
          ...advancedSpectralSettings.blur,
          amount: mutateSpectralValue(advancedSpectralSettings.blur.amount, 0, 100),
          direction: mutateSpectralValue(advancedSpectralSettings.blur.direction, -100, 100),
        },
        harmonicResynth: {
          ...advancedSpectralSettings.harmonicResynth,
          harmonicSpread: mutateSpectralValue(advancedSpectralSettings.harmonicResynth.harmonicSpread, 0, 100),
          harmonicBoost: Math.round(mutateValue(advancedSpectralSettings.harmonicResynth.harmonicBoost, 0, 24) * 2) / 2,
          inharmonicCut: Math.round(mutateValue(advancedSpectralSettings.harmonicResynth.inharmonicCut, -48, 0) * 2) / 2,
          harmonicDecay: mutateSpectralValue(advancedSpectralSettings.harmonicResynth.harmonicDecay, 0, 100),
        },
      });
    }
  };

  const reset = () => {
    onRandomize(defaultSynthParameters);
  };

  return (
    <div className="flex items-center gap-1 flex-wrap" data-testid="randomize-controls">
      <div className="flex items-center gap-1">
        <Button
          onClick={randomizeAll}
          variant="secondary"
          size="sm"
          className="h-6 text-[10px] px-2"
          data-testid="button-randomize"
        >
          <Dices className="w-3 h-3 mr-1" />
          Rand
        </Button>
        <div className="flex items-center gap-1 px-1">
          <span className="text-[9px] text-muted-foreground whitespace-nowrap">Chaos</span>
          <Slider
            value={[chaosAmount]}
            onValueChange={([v]) => setChaosAmount(v)}
            min={10}
            max={100}
            step={5}
            className="w-10"
            data-testid="slider-chaos"
          />
          <span className="text-[9px] text-muted-foreground w-6">{chaosAmount}%</span>
        </div>
      </div>
      <div className="flex items-center gap-1">
        <Button
          onClick={mutate}
          variant="secondary"
          size="sm"
          className="h-6 text-[10px] px-2"
          data-testid="button-mutate"
        >
          <Shuffle className="w-3 h-3 mr-1" />
          Mutate
        </Button>
        <div className="flex items-center gap-1 px-1">
          <span className="text-[9px] text-muted-foreground whitespace-nowrap">Vary</span>
          <Slider
            value={[variationAmount]}
            onValueChange={([v]) => setVariationAmount(v)}
            min={5}
            max={50}
            step={5}
            className="w-10"
            data-testid="slider-variation"
          />
          <span className="text-[9px] text-muted-foreground w-6">{variationAmount}%</span>
        </div>
      </div>
      <Button
        onClick={reset}
        variant="ghost"
        size="sm"
        className="h-6 text-[10px] px-2 text-muted-foreground"
        data-testid="button-reset"
      >
        Reset
      </Button>
    </div>
  );
}
