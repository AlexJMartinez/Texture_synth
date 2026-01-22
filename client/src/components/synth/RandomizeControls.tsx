import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Dices, Shuffle } from "lucide-react";
import { useState } from "react";
import type { SynthParameters, Oscillator, Envelope, WaveformType, EnvelopeCurve, FilterType, EnvelopeTarget, ModalSynth, ModalMode } from "@shared/schema";
import { defaultSynthParameters } from "@shared/schema";

interface RandomizeControlsProps {
  currentParams: SynthParameters;
  onRandomize: (params: SynthParameters) => void;
}

function randomInRange(min: number, max: number, logarithmic = false): number {
  if (logarithmic && min > 0) {
    const logMin = Math.log(min);
    const logMax = Math.log(max);
    return Math.exp(logMin + Math.random() * (logMax - logMin));
  }
  return min + Math.random() * (max - min);
}

function randomWaveform(): WaveformType {
  return (["sine", "triangle", "sawtooth", "square"] as const)[Math.floor(Math.random() * 4)];
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

export function RandomizeControls({ currentParams, onRandomize }: RandomizeControlsProps) {
  const [chaosAmount, setChaosAmount] = useState(50);

  const randomizeOsc = (current: Oscillator, chaos: number, forceEnabled?: boolean): Oscillator => ({
    enabled: forceEnabled !== undefined ? forceEnabled : Math.random() > 0.3,
    waveform: Math.random() > 0.5 ? current.waveform : randomWaveform(),
    pitch: Math.round(randomInRange(55, 2000, true)),
    detune: Math.round(randomInRange(-50 * chaos, 50 * chaos)),
    drift: Math.round(randomInRange(0, 50 * chaos)),
    level: Math.round(randomInRange(30, 100)),
    fmEnabled: Math.random() > 0.7,
    fmRatio: Math.round(randomInRange(0.5, 8) * 4) / 4,
    fmDepth: Math.round(randomInRange(50, 500 * chaos)),
    fmWaveform: randomWaveform(),
    amEnabled: Math.random() > 0.75,
    amRatio: Math.round(randomInRange(0.5, 8) * 4) / 4,
    amDepth: Math.round(randomInRange(20, 80 * chaos)),
    amWaveform: randomWaveform(),
  });

  const randomizeEnv = (current: Envelope, chaos: number, target: EnvelopeTarget, forceEnabled?: boolean): Envelope => ({
    enabled: forceEnabled !== undefined ? forceEnabled : Math.random() > 0.4,
    attack: Math.round(randomInRange(0, 500 * chaos)),
    hold: Math.round(randomInRange(0, 300 * chaos)),
    decay: Math.round(randomInRange(50, 2000)),
    curve: Math.random() > 0.5 ? current.curve : randomCurve(),
    target: target,
    amount: Math.round(randomInRange(20, 100)),
  });

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
        delayTime: Math.round(randomInRange(50, 500)),
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
      },
      output: {
        volume: 75,
        pan: Math.round(randomInRange(-30 * chaos, 30 * chaos)),
      },
    };

    onRandomize(params);
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
      pitch: Math.round(mutateValue(osc.pitch, 20, 20000, true)),
      detune: Math.round(mutateValue(osc.detune, -100, 100)),
      drift: Math.round(mutateValue(osc.drift, 0, 100)),
      level: Math.round(mutateValue(osc.level, 0, 100)),
      fmEnabled: osc.fmEnabled,
      fmRatio: Math.round(mutateValue(osc.fmRatio, 0.25, 16) * 4) / 4,
      fmDepth: Math.round(mutateValue(osc.fmDepth, 0, 1000)),
      fmWaveform: Math.random() > 0.9 ? randomWaveform() : osc.fmWaveform,
      amEnabled: osc.amEnabled,
      amRatio: Math.round(mutateValue(osc.amRatio, 0.25, 16) * 4) / 4,
      amDepth: Math.round(mutateValue(osc.amDepth, 0, 100)),
      amWaveform: Math.random() > 0.9 ? randomWaveform() : osc.amWaveform,
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
        impactNoise: Math.round(mutateValue(currentParams.modal.impactNoise, 0, 100)),
        impactDecay: Math.round(mutateValue(currentParams.modal.impactDecay, 1, 100)),
        modes: {
          mode1: { ratio: 1, decay: Math.round(mutateValue(currentParams.modal.modes.mode1.decay, 10, 5000)), level: currentParams.modal.modes.mode1.level },
          mode2: { ratio: Math.round(mutateValue(currentParams.modal.modes.mode2.ratio, 0.5, 16) * 100) / 100, decay: Math.round(mutateValue(currentParams.modal.modes.mode2.decay, 10, 5000)), level: Math.round(mutateValue(currentParams.modal.modes.mode2.level, 0, 100)) },
          mode3: { ratio: Math.round(mutateValue(currentParams.modal.modes.mode3.ratio, 0.5, 16) * 100) / 100, decay: Math.round(mutateValue(currentParams.modal.modes.mode3.decay, 10, 5000)), level: Math.round(mutateValue(currentParams.modal.modes.mode3.level, 0, 100)) },
          mode4: { ratio: Math.round(mutateValue(currentParams.modal.modes.mode4.ratio, 0.5, 16) * 100) / 100, decay: Math.round(mutateValue(currentParams.modal.modes.mode4.decay, 10, 5000)), level: Math.round(mutateValue(currentParams.modal.modes.mode4.level, 0, 100)) },
        },
      },
      effects: {
        saturation: Math.round(mutateValue(currentParams.effects.saturation, 0, 100)),
        bitcrusher: Math.round(mutateValue(currentParams.effects.bitcrusher, 1, 16)),
        delayEnabled: currentParams.effects.delayEnabled,
        delayTime: Math.round(mutateValue(currentParams.effects.delayTime, 0, 2000)),
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
      },
      output: {
        volume: currentParams.output.volume,
        pan: Math.round(mutateValue(currentParams.output.pan, -100, 100)),
      },
    };

    onRandomize(params);
  };

  const reset = () => {
    onRandomize(defaultSynthParameters);
  };

  return (
    <div className="flex flex-col gap-2 p-2 rounded-lg bg-card border border-border" data-testid="randomize-controls">
      <div className="flex items-center gap-1">
        <Button
          onClick={randomizeAll}
          variant="secondary"
          size="sm"
          className="flex-1 h-7 text-xs"
          data-testid="button-randomize"
        >
          <Dices className="w-3 h-3 mr-1" />
          Rand
        </Button>
        <Button
          onClick={mutate}
          variant="secondary"
          size="sm"
          className="flex-1 h-7 text-xs"
          data-testid="button-mutate"
        >
          <Shuffle className="w-3 h-3 mr-1" />
          Mutate
        </Button>
      </div>

      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <Label className="text-[10px] text-muted-foreground">Chaos</Label>
          <span className="text-[10px] font-mono text-foreground">{chaosAmount}%</span>
        </div>
        <Slider
          value={[chaosAmount]}
          onValueChange={([v]) => setChaosAmount(v)}
          min={10}
          max={100}
          step={5}
          className="w-full"
          data-testid="slider-chaos"
        />
      </div>

      <Button
        onClick={reset}
        variant="ghost"
        size="sm"
        className="text-[10px] text-muted-foreground h-6"
        data-testid="button-reset"
      >
        Reset
      </Button>
    </div>
  );
}
