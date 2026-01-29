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
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <span className="text-[9px] text-muted-foreground">Source 1</span>
            <Select
              value={settings.source1}
              onValueChange={(v) => update("source1", v as "osc1" | "osc2" | "osc3")}
              disabled={!settings.enabled}
            >
              <SelectTrigger className="h-6 text-[10px]" data-testid="select-ring-source1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="osc1">OSC 1</SelectItem>
                <SelectItem value="osc2">OSC 2</SelectItem>
                <SelectItem value="osc3">OSC 3</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <span className="text-[9px] text-muted-foreground">Source 2</span>
            <Select
              value={settings.source2}
              onValueChange={(v) => update("source2", v as "osc1" | "osc2" | "osc3")}
              disabled={!settings.enabled}
            >
              <SelectTrigger className="h-6 text-[10px]" data-testid="select-ring-source2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="osc1">OSC 1</SelectItem>
                <SelectItem value="osc2">OSC 2</SelectItem>
                <SelectItem value="osc3">OSC 3</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        
        <div className="flex justify-center gap-2">
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
          Multiplies selected oscillators for metallic tones
        </p>
      </div>
    </CollapsiblePanel>
  );
}
