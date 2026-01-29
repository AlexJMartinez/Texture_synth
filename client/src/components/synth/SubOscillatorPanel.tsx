import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Knob } from "./Knob";
import { CollapsiblePanel } from "./CollapsiblePanel";
import type { SubOscillator, SubWaveformType } from "@shared/schema";
import { Waves } from "lucide-react";

interface SubOscillatorPanelProps {
  subOsc: SubOscillator;
  onChange: (subOsc: SubOscillator) => void;
}

export function SubOscillatorPanel({ subOsc, onChange }: SubOscillatorPanelProps) {
  const update = <K extends keyof SubOscillator>(key: K, value: SubOscillator[K]) => {
    onChange({ ...subOsc, [key]: value });
  };

  return (
    <CollapsiblePanel
      title="Sub Osc"
      icon={<Waves className="w-3 h-3 text-blue-400" />}
      defaultOpen={subOsc.enabled}
      data-testid="panel-sub-osc"
      className={`transition-opacity ${!subOsc.enabled ? 'opacity-50' : ''}`}
      headerExtra={
        <Switch
          checked={subOsc.enabled}
          onCheckedChange={(v) => update("enabled", v)}
          className="scale-75"
          data-testid="switch-sub-osc"
        />
      }
    >
      <div className="space-y-1.5">
        <div className="flex items-center gap-1">
          <Select
            value={subOsc.waveform}
            onValueChange={(v) => update("waveform", v as SubWaveformType)}
            disabled={!subOsc.enabled}
          >
            <SelectTrigger className="h-5 text-[10px] flex-1" data-testid="select-sub-waveform">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="sine">Sine</SelectItem>
              <SelectItem value="triangle">Triangle</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={String(subOsc.octave)}
            onValueChange={(v) => update("octave", parseInt(v))}
            disabled={!subOsc.enabled}
          >
            <SelectTrigger className="h-5 text-[10px] flex-1" data-testid="select-sub-octave">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="-4">-4 Oct</SelectItem>
              <SelectItem value="-3">-3 Oct</SelectItem>
              <SelectItem value="-2">-2 Oct</SelectItem>
              <SelectItem value="-1">-1 Oct</SelectItem>
              <SelectItem value="0">0 Oct</SelectItem>
              <SelectItem value="1">+1 Oct</SelectItem>
              <SelectItem value="2">+2 Oct</SelectItem>
              <SelectItem value="3">+3 Oct</SelectItem>
              <SelectItem value="4">+4 Oct</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex justify-center gap-1">
          <Knob
            value={subOsc.level}
            min={0}
            max={100}
            step={1}
            label="Level"
            unit="%"
            onChange={(v) => update("level", v)}
            accentColor="accent"
            size="xs"
            modulationPath="subOsc.level"
          />
          <Knob
            value={subOsc.attack}
            min={0}
            max={100}
            step={1}
            label="Attack"
            unit="ms"
            onChange={(v) => update("attack", v)}
            accentColor="accent"
            size="xs"
          />
          <Knob
            value={subOsc.decay}
            min={10}
            max={2000}
            step={10}
            label="Decay"
            unit="ms"
            onChange={(v) => update("decay", v)}
            accentColor="accent"
            size="xs"
          />
          <Knob
            value={subOsc.drive ?? 0}
            min={0}
            max={100}
            step={1}
            label="Drive"
            unit="%"
            onChange={(v) => update("drive", v)}
            accentColor="accent"
            size="xs"
          />
        </div>

        <div className="flex items-center justify-between rounded border border-border/50 p-1 mb-1.5">
          <span className="text-[10px] text-muted-foreground">Pitch Env Bypass</span>
          <Switch
            checked={subOsc.pitchEnvBypass}
            onCheckedChange={(v) => update("pitchEnvBypass", v)}
            className="scale-50"
            data-testid="switch-sub-pitch-env-bypass"
          />
        </div>

        <div className={`rounded border border-border/50 p-1.5 ${!subOsc.filterEnabled ? 'opacity-50' : ''}`}>
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] text-muted-foreground">Filters</span>
            <Switch
              checked={subOsc.filterEnabled}
              onCheckedChange={(v) => update("filterEnabled", v)}
              className="scale-50"
              data-testid="switch-sub-filter"
            />
          </div>
          <div className="flex justify-center gap-1">
            <Knob
              value={subOsc.hpFreq ?? 25}
              min={10}
              max={60}
              step={1}
              label="HP"
              unit="Hz"
              onChange={(v) => update("hpFreq", v)}
              accentColor="accent"
              size="xs"
            />
            <Knob
              value={subOsc.filterFreq}
              min={20}
              max={200}
              step={5}
              label="LP"
              unit="Hz"
              onChange={(v) => update("filterFreq", v)}
              accentColor="accent"
              size="xs"
            />
          </div>
        </div>
      </div>
    </CollapsiblePanel>
  );
}
