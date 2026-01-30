import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Knob } from "./Knob";
import { CollapsiblePanel } from "./CollapsiblePanel";
import { CircleDot } from "lucide-react";
import type { RingModSettings } from "@/lib/ringModSettings";

interface RingModPanelProps {
  settings: RingModSettings;
  onChange: (settings: RingModSettings) => void;
}

export function RingModPanel({ settings, onChange }: RingModPanelProps) {
  const update = <K extends keyof RingModSettings>(key: K, value: RingModSettings[K]) => {
    onChange({ ...settings, [key]: value });
  };

  return (
    <CollapsiblePanel
      title="Ring Mod"
      icon={<CircleDot className="w-3 h-3 text-pink-400" />}
      defaultOpen={settings.enabled}
      data-testid="panel-ring-mod"
      className={`transition-opacity ${!settings.enabled ? 'opacity-50' : ''}`}
      headerExtra={
        <Switch
          checked={settings.enabled}
          onCheckedChange={(v) => update("enabled", v)}
          className="scale-75"
          data-testid="switch-ring-mod"
        />
      }
    >
      <div className="space-y-2">
        <div className="flex justify-center gap-2">
          <Knob
            value={settings.freqHz}
            min={20}
            max={2000}
            step={10}
            label="Freq"
            unit="Hz"
            onChange={(v) => update("freqHz", v)}
            accentColor="primary"
            size="xs"
            disabled={!settings.enabled}
          />
          <Knob
            value={settings.depth}
            min={0}
            max={100}
            step={1}
            label="Depth"
            unit="%"
            onChange={(v) => update("depth", v)}
            accentColor="accent"
            size="xs"
            disabled={!settings.enabled}
          />
          <Knob
            value={settings.mix}
            min={0}
            max={100}
            step={1}
            label="Mix"
            unit="%"
            onChange={(v) => update("mix", v)}
            accentColor="accent"
            size="xs"
            disabled={!settings.enabled}
          />
        </div>
        
        <div className="space-y-1">
          <span className="text-[9px] text-muted-foreground block text-center">Modulator</span>
          <Select
            value={settings.waveform}
            onValueChange={(v) => update("waveform", v as OscillatorType)}
            disabled={!settings.enabled}
          >
            <SelectTrigger className="h-6 text-[10px]" data-testid="select-ring-waveform">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="sine">Sine</SelectItem>
              <SelectItem value="triangle">Triangle</SelectItem>
              <SelectItem value="sawtooth">Sawtooth</SelectItem>
              <SelectItem value="square">Square</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="space-y-1">
          <span className="text-[9px] text-muted-foreground block text-center">Depth Envelope (AHD)</span>
          <div className="flex justify-center gap-2">
            <Knob
              value={settings.envAttack}
              min={0}
              max={100}
              step={1}
              label="A"
              unit="ms"
              onChange={(v) => update("envAttack", v)}
              accentColor="primary"
              size="xs"
              disabled={!settings.enabled}
            />
            <Knob
              value={settings.envHold}
              min={0}
              max={200}
              step={1}
              label="H"
              unit="ms"
              onChange={(v) => update("envHold", v)}
              accentColor="primary"
              size="xs"
              disabled={!settings.enabled}
            />
            <Knob
              value={settings.envDecay}
              min={0}
              max={1000}
              step={10}
              label="D"
              unit="ms"
              onChange={(v) => update("envDecay", v)}
              accentColor="primary"
              size="xs"
              disabled={!settings.enabled}
            />
          </div>
        </div>
        
        <div className="flex justify-center gap-2">
          <Knob
            value={settings.hpHz}
            min={20}
            max={1000}
            step={10}
            label="HP"
            unit="Hz"
            onChange={(v) => update("hpHz", v)}
            accentColor="accent"
            size="xs"
            disabled={!settings.enabled}
          />
          <Knob
            value={settings.lpHz}
            min={1000}
            max={20000}
            step={100}
            label="LP"
            unit="Hz"
            onChange={(v) => update("lpHz", v)}
            accentColor="accent"
            size="xs"
            disabled={!settings.enabled}
          />
          <Knob
            value={settings.outputLevel}
            min={0}
            max={100}
            step={1}
            label="Level"
            unit="%"
            onChange={(v) => update("outputLevel", v)}
            accentColor="primary"
            size="xs"
            disabled={!settings.enabled}
          />
        </div>
        
        <p className="text-[8px] text-muted-foreground text-center">
          Dedicated modulator with envelope for metallic one-shots
        </p>
      </div>
    </CollapsiblePanel>
  );
}
