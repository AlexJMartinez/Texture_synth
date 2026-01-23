import { Switch } from "@/components/ui/switch";
import { Knob } from "./Knob";
import { CollapsiblePanel } from "./CollapsiblePanel";
import type { SaturationChain } from "@shared/schema";
import { Flame } from "lucide-react";

interface SaturationChainPanelProps {
  saturation: SaturationChain;
  onChange: (saturation: SaturationChain) => void;
}

export function SaturationChainPanel({ saturation, onChange }: SaturationChainPanelProps) {
  const update = <K extends keyof SaturationChain>(key: K, value: SaturationChain[K]) => {
    onChange({ ...saturation, [key]: value });
  };

  return (
    <CollapsiblePanel
      title="Saturation"
      icon={<Flame className="w-3 h-3 text-red-400" />}
      defaultOpen={saturation.enabled}
      data-testid="panel-saturation-chain"
      className={`transition-opacity ${!saturation.enabled ? 'opacity-50' : ''}`}
      headerExtra={
        <Switch
          checked={saturation.enabled}
          onCheckedChange={(v) => update("enabled", v)}
          className="scale-75"
          data-testid="switch-saturation-chain"
        />
      }
    >
      <div className="space-y-1.5">
        <div className={`rounded border border-border/50 p-1.5 ${!saturation.tapeEnabled ? 'opacity-50' : ''}`}>
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] text-muted-foreground">Tape</span>
            <Switch
              checked={saturation.tapeEnabled}
              onCheckedChange={(v) => update("tapeEnabled", v)}
              className="scale-50"
              data-testid="switch-tape"
            />
          </div>
          <div className="flex justify-center gap-1">
            <Knob
              value={saturation.tapeDrive}
              min={0}
              max={100}
              step={1}
              label="Drive"
              unit="%"
              onChange={(v) => update("tapeDrive", v)}
              accentColor="primary"
              size="xs"
            />
            <Knob
              value={saturation.tapeWarmth}
              min={0}
              max={100}
              step={1}
              label="Warmth"
              unit="%"
              onChange={(v) => update("tapeWarmth", v)}
              accentColor="primary"
              size="xs"
            />
          </div>
        </div>

        <div className={`rounded border border-border/50 p-1.5 ${!saturation.tubeEnabled ? 'opacity-50' : ''}`}>
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] text-muted-foreground">Tube</span>
            <Switch
              checked={saturation.tubeEnabled}
              onCheckedChange={(v) => update("tubeEnabled", v)}
              className="scale-50"
              data-testid="switch-tube"
            />
          </div>
          <div className="flex justify-center gap-1">
            <Knob
              value={saturation.tubeDrive}
              min={0}
              max={100}
              step={1}
              label="Drive"
              unit="%"
              onChange={(v) => update("tubeDrive", v)}
              accentColor="primary"
              size="xs"
            />
            <Knob
              value={saturation.tubeBias}
              min={0}
              max={100}
              step={1}
              label="Bias"
              unit="%"
              onChange={(v) => update("tubeBias", v)}
              accentColor="primary"
              size="xs"
            />
          </div>
        </div>

        <div className={`rounded border border-border/50 p-1.5 ${!saturation.transistorEnabled ? 'opacity-50' : ''}`}>
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] text-muted-foreground">Transistor</span>
            <Switch
              checked={saturation.transistorEnabled}
              onCheckedChange={(v) => update("transistorEnabled", v)}
              className="scale-50"
              data-testid="switch-transistor"
            />
          </div>
          <div className="flex justify-center gap-1">
            <Knob
              value={saturation.transistorDrive}
              min={0}
              max={100}
              step={1}
              label="Drive"
              unit="%"
              onChange={(v) => update("transistorDrive", v)}
              accentColor="accent"
              size="xs"
            />
            <Knob
              value={saturation.transistorAsymmetry}
              min={0}
              max={100}
              step={1}
              label="Asym"
              unit="%"
              onChange={(v) => update("transistorAsymmetry", v)}
              accentColor="accent"
              size="xs"
            />
          </div>
        </div>

        <div className="flex justify-center">
          <Knob
            value={saturation.mix}
            min={0}
            max={100}
            step={1}
            label="Mix"
            unit="%"
            onChange={(v) => update("mix", v)}
            accentColor="primary"
            size="xs"
          />
        </div>
      </div>
    </CollapsiblePanel>
  );
}
