import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Dices, Shuffle } from "lucide-react";
import { useState } from "react";
import type { SynthParameters, Oscillator, Envelope, WaveformType, EnvelopeCurve, FilterType, EnvelopeTarget, WaveshaperCurve, ModRatioPreset, PitchState, SpectralScrambler } from "@shared/schema";
import { defaultSynthParameters } from "@shared/schema";
import { normalizePitch, pitchToHz, hzToPitchState } from "@/lib/pitchUtils";
import type { OscEnvelope, OscEnvelopes } from "./OscillatorPanel";

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
}

function randomizeOscEnvelope(chaos: number): OscEnvelope {
  return {
    enabled: Math.random() > 0.6,
    attack: Math.round(randExp(0, 50 * chaos, 2.0)),
    hold: Math.round(randExp(0, 100 * chaos, 2.0)),
    decay: Math.round(randExp(50, 2000, 1.5)),
    curve: randomCurve(),
  };
}

function mutateOscEnvelope(env: OscEnvelope, strength: number): OscEnvelope {
  const mutateValue = (current: number, min: number, max: number): number => {
    const range = max - min;
    const mutation = (Math.random() - 0.5) * 2 * strength * range;
    return Math.max(min, Math.min(max, current + mutation));
  };
  
  return {
    enabled: env.enabled,
    attack: Math.round(mutateValue(env.attack, 0, 500)),
    hold: Math.round(mutateValue(env.hold, 0, 500)),
    decay: Math.round(mutateValue(env.decay, 20, 5000)),
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
  octave: -2 | -1 | 0;
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
  
  const octave = (Math.random() < 0.75 ? -1 : -2) as -1 | -2;
  const waveform: "sine" | "triangle" = (["sine", "triangle"] as const)[Math.floor(Math.random() * 2)];
  const level = randExp(8, 35, 2.0);
  const lpHz = randExp(80, 160, 1.7);
  const drive = randExp(0, 25, 2.5);
  const attack = randExp(2, 8, 1.3);
  const decay = randExp(100, 450, 1.4);
  
  return {
    enabled: mutateFrom?.enabled ?? true,
    octave: mutateFrom?.octave != null ? (Math.random() < 0.9 ? (mutateFrom.octave as -2 | -1 | 0) : octave) : octave,
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

export function RandomizeControls({ currentParams, onRandomize, oscEnvelopes, onOscEnvelopesRandomize }: RandomizeControlsProps) {
  const [chaosAmount, setChaosAmount] = useState(50);

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
    // Amplitude envelope needs fast attack for percussive sounds
    const isAmpEnv = target === "amplitude";
    const maxAttack = isAmpEnv ? 30 : 500 * chaos; // Max 30ms for amp, otherwise chaos-scaled
    const minDecay = isAmpEnv ? 100 : 50; // Minimum decay for amp envelope
    const envAmount = isAmpEnv ? 100 : Math.round(randomInRange(20, 100)); // Always 100% for amp
    
    return {
      enabled: forceEnabled !== undefined ? forceEnabled : Math.random() > 0.4,
      attack: Math.round(randomInRange(0, maxAttack)),
      hold: Math.round(randomInRange(0, isAmpEnv ? 50 : 300 * chaos)),
      decay: Math.round(randomInRange(minDecay, 2000)),
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
        delayEnabled: Math.random() > 0.6,
        delaySyncMode: Math.random() > 0.5 ? "sync" as const : "ms" as const,
        delayTime: Math.round(randomInRange(50, 500)),
        delayDivision: (["1/4", "1/8", "1/16", "1/4T", "1/8T"] as const)[Math.floor(Math.random() * 5)],
        delayFeedback: Math.round(randomInRange(20, 60)),
        delayMix: Math.round(randomInRange(20, 50)),
        reverbEnabled: Math.random() > 0.6,
        reverbSize: Math.round(randomInRange(30, 80)),
        reverbMix: Math.round(randomInRange(15, 40)),
        reverbDecay: Math.round(randomInRange(1, 4) * 10) / 10,
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
        enabled: currentParams.convolver.useCustomIR && Math.random() > 0.5,
        irName: currentParams.convolver.irName,
        mix: Math.round(randomInRange(30, 70)),
        useCustomIR: currentParams.convolver.useCustomIR,
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
  };

  const mutate = () => {
    const chaos = chaosAmount / 100;
    const strength = 0.2 * chaos;

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

    const mutateEnv = (env: Envelope): Envelope => ({
      enabled: env.enabled,
      attack: Math.round(mutateValue(env.attack, 0, 2000)),
      hold: Math.round(mutateValue(env.hold, 0, 2000)),
      decay: Math.round(mutateValue(env.decay, 0, 5000)),
      curve: env.curve,
      target: env.target,
      amount: Math.round(mutateValue(env.amount, -100, 100)),
    });

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
        delayTime: Math.round(mutateValue(currentParams.effects.delayTime, 0, 2000)),
        delayDivision: currentParams.effects.delayDivision,
        delayFeedback: Math.round(mutateValue(currentParams.effects.delayFeedback, 0, 95)),
        delayMix: Math.round(mutateValue(currentParams.effects.delayMix, 0, 100)),
        reverbEnabled: currentParams.effects.reverbEnabled,
        reverbSize: Math.round(mutateValue(currentParams.effects.reverbSize, 0, 100)),
        reverbMix: Math.round(mutateValue(currentParams.effects.reverbMix, 0, 100)),
        reverbDecay: Math.round(mutateValue(currentParams.effects.reverbDecay, 0.1, 10) * 10) / 10,
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
        mix: Math.round(mutateValue(currentParams.convolver.mix, 0, 100)),
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
  };

  const reset = () => {
    onRandomize(defaultSynthParameters);
  };

  return (
    <div className="flex items-center gap-1" data-testid="randomize-controls">
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
        <span className="text-[9px] text-muted-foreground whitespace-nowrap">{chaosAmount}%</span>
        <Slider
          value={[chaosAmount]}
          onValueChange={([v]) => setChaosAmount(v)}
          min={10}
          max={100}
          step={5}
          className="w-12"
          data-testid="slider-chaos"
        />
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
