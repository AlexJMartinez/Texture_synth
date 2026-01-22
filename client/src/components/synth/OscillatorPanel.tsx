import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Knob } from "./Knob";
import type { SynthParameters, WaveformType } from "@shared/schema";
import { Waves, Triangle, Square, SawWave } from "./WaveformIcons";

interface OscillatorPanelProps {
  oscillator: SynthParameters["oscillator"];
  onChange: (oscillator: SynthParameters["oscillator"]) => void;
}

export function OscillatorPanel({ oscillator, onChange }: OscillatorPanelProps) {
  const updateOscillator = <K extends keyof SynthParameters["oscillator"]>(
    key: K,
    value: SynthParameters["oscillator"][K]
  ) => {
    onChange({ ...oscillator, [key]: value });
  };

  const waveforms: { type: WaveformType; icon: React.ReactNode; label: string }[] = [
    { type: "sine", icon: <Waves className="w-5 h-5" />, label: "Sine" },
    { type: "triangle", icon: <Triangle className="w-5 h-5" />, label: "Triangle" },
    { type: "sawtooth", icon: <SawWave className="w-5 h-5" />, label: "Saw" },
    { type: "square", icon: <Square className="w-5 h-5" />, label: "Square" },
  ];

  const noteFromFreq = (freq: number): string => {
    const notes = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
    const a4 = 440;
    const semitones = Math.round(12 * Math.log2(freq / a4));
    const noteIndex = (semitones % 12 + 12 + 9) % 12;
    const octave = Math.floor((semitones + 9) / 12) + 4;
    return `${notes[noteIndex]}${octave}`;
  };

  return (
    <Card className="synth-panel" data-testid="panel-oscillator">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          <Waves className="w-4 h-4 text-accent" />
          Oscillator
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-xs text-muted-foreground">Waveform</label>
          <div className="grid grid-cols-4 gap-1">
            {waveforms.map(({ type, icon, label }) => (
              <Button
                key={type}
                size="sm"
                variant={oscillator.waveform === type ? "default" : "secondary"}
                className={`h-12 flex flex-col gap-1 p-2 ${
                  oscillator.waveform === type ? 'glow-primary' : ''
                }`}
                onClick={() => updateOscillator("waveform", type)}
                data-testid={`button-waveform-${type}`}
              >
                {icon}
                <span className="text-[10px]">{label}</span>
              </Button>
            ))}
          </div>
        </div>

        <div className="flex justify-center gap-4">
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
          />
          <Knob
            value={oscillator.detune}
            min={-100}
            max={100}
            step={1}
            label="Detune"
            unit="ct"
            onChange={(v) => updateOscillator("detune", v)}
          />
          <Knob
            value={oscillator.drift}
            min={0}
            max={100}
            step={1}
            label="Drift"
            unit="%"
            onChange={(v) => updateOscillator("drift", v)}
          />
        </div>

        <div className="flex justify-center">
          <div className="px-3 py-1.5 rounded-md bg-muted/50 border border-border">
            <span className="text-xs text-muted-foreground">Note: </span>
            <span className="text-sm font-mono text-foreground">{noteFromFreq(oscillator.pitch)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
