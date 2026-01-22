import { useState } from "react";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Knob } from "./Knob";
import { CollapsiblePanel } from "./CollapsiblePanel";
import type { Oscillator, WaveformType } from "@shared/schema";
import { Waves } from "./WaveformIcons";
import { ChevronDown, ChevronRight, Radio, Zap } from "lucide-react";

interface OscillatorPanelProps {
  oscillator: Oscillator;
  onChange: (oscillator: Oscillator) => void;
  title: string;
  index: number;
}

export function OscillatorPanel({ oscillator, onChange, title, index }: OscillatorPanelProps) {
  const [fmOpen, setFmOpen] = useState(oscillator.fmEnabled);
  const [amOpen, setAmOpen] = useState(oscillator.amEnabled);
  
  const updateOscillator = <K extends keyof Oscillator>(
    key: K,
    value: Oscillator[K]
  ) => {
    onChange({ ...oscillator, [key]: value });
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

        <div className={`rounded border border-border/50 transition-opacity ${!oscillator.fmEnabled ? 'opacity-50 bg-muted/10' : 'bg-muted/30'}`}>
          <div className="flex items-center justify-between px-1.5 py-0.5">
            <button
              type="button"
              onClick={() => setFmOpen(!fmOpen)}
              className="flex items-center gap-0.5 text-[10px] text-muted-foreground hover:text-foreground"
            >
              {fmOpen ? <ChevronDown className="w-2.5 h-2.5" /> : <ChevronRight className="w-2.5 h-2.5" />}
              <Radio className="w-2.5 h-2.5 text-primary" />
              FM
            </button>
            <Switch
              checked={oscillator.fmEnabled}
              onCheckedChange={(v) => updateOscillator("fmEnabled", v)}
              className="scale-50"
              data-testid={`switch-fm-${index}`}
            />
          </div>
          {fmOpen && (
            <div className="px-1.5 pb-1.5 space-y-1">
              <Select
                value={oscillator.fmWaveform}
                onValueChange={(v) => updateOscillator("fmWaveform", v as WaveformType)}
                disabled={!oscillator.fmEnabled}
              >
                <SelectTrigger className="h-5 text-[10px]" data-testid={`select-fm-waveform-${index}`}>
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
                  value={oscillator.fmRatio}
                  min={0.25}
                  max={16}
                  step={0.25}
                  label="Ratio"
                  onChange={(v) => updateOscillator("fmRatio", v)}
                  accentColor="primary"
                  size="xs"
                />
                <Knob
                  value={oscillator.fmDepth}
                  min={0}
                  max={1000}
                  step={10}
                  label="Depth"
                  unit="Hz"
                  onChange={(v) => updateOscillator("fmDepth", v)}
                  accentColor="accent"
                  size="xs"
                />
              </div>
            </div>
          )}
        </div>

        <div className={`rounded border border-border/50 transition-opacity ${!oscillator.amEnabled ? 'opacity-50 bg-muted/10' : 'bg-muted/30'}`}>
          <div className="flex items-center justify-between px-1.5 py-0.5">
            <button
              type="button"
              onClick={() => setAmOpen(!amOpen)}
              className="flex items-center gap-0.5 text-[10px] text-muted-foreground hover:text-foreground"
            >
              {amOpen ? <ChevronDown className="w-2.5 h-2.5" /> : <ChevronRight className="w-2.5 h-2.5" />}
              <Zap className="w-2.5 h-2.5 text-accent" />
              AM
            </button>
            <Switch
              checked={oscillator.amEnabled}
              onCheckedChange={(v) => updateOscillator("amEnabled", v)}
              className="scale-50"
              data-testid={`switch-am-${index}`}
            />
          </div>
          {amOpen && (
            <div className="px-1.5 pb-1.5 space-y-1">
              <Select
                value={oscillator.amWaveform}
                onValueChange={(v) => updateOscillator("amWaveform", v as WaveformType)}
                disabled={!oscillator.amEnabled}
              >
                <SelectTrigger className="h-5 text-[10px]" data-testid={`select-am-waveform-${index}`}>
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
                  value={oscillator.amRatio}
                  min={0.25}
                  max={16}
                  step={0.25}
                  label="Ratio"
                  onChange={(v) => updateOscillator("amRatio", v)}
                  accentColor="accent"
                  size="xs"
                />
                <Knob
                  value={oscillator.amDepth}
                  min={0}
                  max={100}
                  step={1}
                  label="Depth"
                  unit="%"
                  onChange={(v) => updateOscillator("amDepth", v)}
                  accentColor="primary"
                  size="xs"
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </CollapsiblePanel>
  );
}
