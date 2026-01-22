import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Knob } from "./Knob";
import { CollapsiblePanel } from "./CollapsiblePanel";
import type { Oscillator, WaveformType } from "@shared/schema";
import { Waves } from "./WaveformIcons";

interface OscillatorPanelProps {
  oscillator: Oscillator;
  onChange: (oscillator: Oscillator) => void;
  title: string;
  index: number;
}

export function OscillatorPanel({ oscillator, onChange, title, index }: OscillatorPanelProps) {
  const updateOscillator = <K extends keyof Oscillator>(
    key: K,
    value: Oscillator[K]
  ) => {
    onChange({ ...oscillator, [key]: value });
  };

  const waveformLabels: Record<WaveformType, string> = {
    sine: "Sin",
    triangle: "Tri",
    sawtooth: "Saw",
    square: "Sqr",
  };

  return (
    <CollapsiblePanel
      title={title}
      icon={<Waves className="w-3 h-3 text-accent" />}
      defaultOpen={oscillator.enabled}
      data-testid={`panel-oscillator-${index}`}
      className={`transition-opacity ${!oscillator.enabled ? 'opacity-50' : ''}`}
      headerExtra={
        <Switch
          checked={oscillator.enabled}
          onCheckedChange={(v) => updateOscillator("enabled", v)}
          className="scale-75"
          data-testid={`switch-osc-${index}`}
        />
      }
    >
      <div className="space-y-1.5">
        <Select
          value={oscillator.waveform}
          onValueChange={(v) => updateOscillator("waveform", v as WaveformType)}
          disabled={!oscillator.enabled}
        >
          <SelectTrigger className="h-5 text-[10px]" data-testid={`select-waveform-${index}`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="sine">Sine</SelectItem>
            <SelectItem value="triangle">Triangle</SelectItem>
            <SelectItem value="sawtooth">Sawtooth</SelectItem>
            <SelectItem value="square">Square</SelectItem>
          </SelectContent>
        </Select>

        <div className="flex justify-center gap-1">
          <Knob
            value={oscillator.pitch}
            min={20}
            max={20000}
            step={1}
            label="Pitch"
            unit="Hz"
            onChange={(v) => updateOscillator("pitch", v)}
            logarithmic
            accentColor="accent"
            size="xs"
          />
          <Knob
            value={oscillator.detune}
            min={-100}
            max={100}
            step={1}
            label="Det"
            unit="ct"
            onChange={(v) => updateOscillator("detune", v)}
            size="xs"
          />
          <Knob
            value={oscillator.drift}
            min={0}
            max={100}
            step={1}
            label="Dft"
            unit="%"
            onChange={(v) => updateOscillator("drift", v)}
            size="xs"
          />
          <Knob
            value={oscillator.level}
            min={0}
            max={100}
            step={1}
            label="Lvl"
            unit="%"
            onChange={(v) => updateOscillator("level", v)}
            accentColor="primary"
            size="xs"
          />
        </div>
      </div>
    </CollapsiblePanel>
  );
}
