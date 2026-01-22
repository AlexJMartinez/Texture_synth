import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Dices, Shuffle } from "lucide-react";
import { useState } from "react";
import type { SynthParameters } from "@shared/schema";
import { defaultSynthParameters } from "@shared/schema";

interface RandomizeControlsProps {
  currentParams: SynthParameters;
  onRandomize: (params: SynthParameters) => void;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function randomInRange(min: number, max: number, logarithmic = false): number {
  if (logarithmic && min > 0) {
    const logMin = Math.log(min);
    const logMax = Math.log(max);
    return Math.exp(logMin + Math.random() * (logMax - logMin));
  }
  return min + Math.random() * (max - min);
}

export function RandomizeControls({ currentParams, onRandomize }: RandomizeControlsProps) {
  const [chaosAmount, setChaosAmount] = useState(50);

  const randomizeAll = () => {
    const chaos = chaosAmount / 100;
    
    const params: SynthParameters = {
      oscillator: {
        waveform: Math.random() > 0.5 ? currentParams.oscillator.waveform : 
          (["sine", "triangle", "sawtooth", "square"] as const)[Math.floor(Math.random() * 4)],
        pitch: Math.round(randomInRange(55, 2000, true)),
        detune: Math.round(randomInRange(-50 * chaos, 50 * chaos)),
        drift: Math.round(randomInRange(0, 50 * chaos)),
      },
      envelope: {
        attack: Math.round(randomInRange(0, 500 * chaos)),
        hold: Math.round(randomInRange(0, 300 * chaos)),
        decay: Math.round(randomInRange(50, 2000)),
        curve: (["linear", "exponential", "logarithmic"] as const)[Math.floor(Math.random() * 3)],
      },
      filter: {
        enabled: Math.random() > 0.3,
        frequency: Math.round(randomInRange(200, 8000, true)),
        resonance: Math.round(randomInRange(0, 15) * 10) / 10,
        type: (["lowpass", "highpass", "bandpass"] as const)[Math.floor(Math.random() * 3)],
      },
      effects: {
        saturation: Math.round(randomInRange(0, 80 * chaos)),
        bitcrusher: Math.round(randomInRange(4, 16)),
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
    const mutationStrength = 0.2 * chaos;

    const mutateValue = (current: number, min: number, max: number, log = false): number => {
      const range = log ? Math.log(max) - Math.log(min) : max - min;
      const mutation = (Math.random() - 0.5) * 2 * mutationStrength * range;
      
      if (log && min > 0) {
        const logCurrent = Math.log(current);
        const newLogValue = logCurrent + mutation;
        return Math.max(min, Math.min(max, Math.exp(newLogValue)));
      }
      
      return Math.max(min, Math.min(max, current + mutation * (max - min)));
    };

    const params: SynthParameters = {
      oscillator: {
        waveform: Math.random() > 0.9 
          ? (["sine", "triangle", "sawtooth", "square"] as const)[Math.floor(Math.random() * 4)]
          : currentParams.oscillator.waveform,
        pitch: Math.round(mutateValue(currentParams.oscillator.pitch, 20, 20000, true)),
        detune: Math.round(mutateValue(currentParams.oscillator.detune, -100, 100)),
        drift: Math.round(mutateValue(currentParams.oscillator.drift, 0, 100)),
      },
      envelope: {
        attack: Math.round(mutateValue(currentParams.envelope.attack, 0, 2000)),
        hold: Math.round(mutateValue(currentParams.envelope.hold, 0, 2000)),
        decay: Math.round(mutateValue(currentParams.envelope.decay, 0, 5000)),
        curve: currentParams.envelope.curve,
      },
      filter: {
        enabled: currentParams.filter.enabled,
        frequency: Math.round(mutateValue(currentParams.filter.frequency, 20, 20000, true)),
        resonance: Math.round(mutateValue(currentParams.filter.resonance, 0, 30) * 10) / 10,
        type: currentParams.filter.type,
      },
      effects: {
        saturation: Math.round(mutateValue(currentParams.effects.saturation, 0, 100)),
        bitcrusher: Math.round(mutateValue(currentParams.effects.bitcrusher, 1, 16)),
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
    <div className="flex flex-col gap-3 p-4 rounded-lg bg-card border border-border" data-testid="randomize-controls">
      <div className="flex items-center gap-2">
        <Button
          onClick={randomizeAll}
          variant="secondary"
          className="flex-1"
          data-testid="button-randomize"
        >
          <Dices className="w-4 h-4 mr-2" />
          Randomize
        </Button>
        <Button
          onClick={mutate}
          variant="secondary"
          className="flex-1"
          data-testid="button-mutate"
        >
          <Shuffle className="w-4 h-4 mr-2" />
          Mutate
        </Button>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs text-muted-foreground">Chaos</Label>
          <span className="text-xs font-mono text-foreground">{chaosAmount}%</span>
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
        className="text-xs text-muted-foreground"
        data-testid="button-reset"
      >
        Reset to Default
      </Button>
    </div>
  );
}
