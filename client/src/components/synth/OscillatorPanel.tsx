import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Knob } from "./Knob";
import type { Oscillator, WaveformType } from "@shared/schema";
import { Waves, Triangle, Square, SawWave } from "./WaveformIcons";

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

  const waveforms: { type: WaveformType; icon: React.ReactNode }[] = [
    { type: "sine", icon: <Waves className="w-3 h-3" /> },
    { type: "triangle", icon: <Triangle className="w-3 h-3" /> },
    { type: "sawtooth", icon: <SawWave className="w-3 h-3" /> },
    { type: "square", icon: <Square className="w-3 h-3" /> },
  ];

  return (
    <Card className={`synth-panel transition-opacity ${!oscillator.enabled ? 'opacity-50' : ''}`} data-testid={`panel-oscillator-${index}`}>
      <CardHeader className="pb-1 pt-2 px-2">
        <CardTitle className="flex items-center justify-between text-xs font-medium">
          <div className="flex items-center gap-1">
            <Waves className="w-3 h-3 text-accent" />
            {title}
          </div>
          <Switch
            checked={oscillator.enabled}
            onCheckedChange={(v) => updateOscillator("enabled", v)}
            className="scale-75"
            data-testid={`switch-osc-${index}`}
          />
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 px-2 pb-2">
        <div className="grid grid-cols-4 gap-0.5">
          {waveforms.map(({ type, icon }) => (
            <Button
              key={type}
              size="sm"
              variant={oscillator.waveform === type ? "default" : "secondary"}
              className={`h-6 p-1 ${oscillator.waveform === type ? 'glow-primary' : ''}`}
              onClick={() => updateOscillator("waveform", type)}
              disabled={!oscillator.enabled}
              data-testid={`button-waveform-${type}-${index}`}
            >
              {icon}
            </Button>
          ))}
        </div>

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
            label="Detune"
            unit="ct"
            onChange={(v) => updateOscillator("detune", v)}
            size="xs"
          />
          <Knob
            value={oscillator.drift}
            min={0}
            max={100}
            step={1}
            label="Drift"
            unit="%"
            onChange={(v) => updateOscillator("drift", v)}
            size="xs"
          />
          <Knob
            value={oscillator.level}
            min={0}
            max={100}
            step={1}
            label="Level"
            unit="%"
            onChange={(v) => updateOscillator("level", v)}
            accentColor="primary"
            size="xs"
          />
        </div>
      </CardContent>
    </Card>
  );
}
