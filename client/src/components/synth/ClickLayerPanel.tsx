import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Knob } from "./Knob";
import { CollapsiblePanel } from "./CollapsiblePanel";
import type { ClickLayer } from "@shared/schema";
import { Zap } from "lucide-react";

interface ClickLayerPanelProps {
  clickLayer: ClickLayer;
  onChange: (clickLayer: ClickLayer) => void;
}

export function ClickLayerPanel({ clickLayer, onChange }: ClickLayerPanelProps) {
  const update = <K extends keyof ClickLayer>(key: K, value: ClickLayer[K]) => {
    onChange({ ...clickLayer, [key]: value });
  };

  return (
    <CollapsiblePanel
      title="Click Layer"
      icon={<Zap className="w-3 h-3 text-orange-400" />}
      defaultOpen={clickLayer.enabled}
      data-testid="panel-click-layer"
      className={`transition-opacity ${!clickLayer.enabled ? 'opacity-50' : ''}`}
      headerExtra={
        <Switch
          checked={clickLayer.enabled}
          onCheckedChange={(v) => update("enabled", v)}
          className="scale-75"
          data-testid="switch-click-layer"
        />
      }
    >
      <div className="space-y-1.5">
        <div className="flex justify-center gap-1">
          <Knob
            value={clickLayer.level}
            min={0}
            max={100}
            step={1}
            label="Level"
            unit="%"
            onChange={(v) => update("level", v)}
            accentColor="orange"
            size="xs"
          />
          <Knob
            value={clickLayer.decay}
            min={1}
            max={10}
            step={0.5}
            label="Decay"
            unit="ms"
            onChange={(v) => update("decay", v)}
            accentColor="orange"
            size="xs"
          />
        </div>

        <div className="flex items-center gap-1">
          <Select
            value={clickLayer.filterType}
            onValueChange={(v) => update("filterType", v as "highpass" | "bandpass")}
            disabled={!clickLayer.enabled}
          >
            <SelectTrigger className="h-5 text-[10px] flex-1" data-testid="select-click-filter-type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="highpass">Highpass</SelectItem>
              <SelectItem value="bandpass">Bandpass</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex justify-center gap-1">
          <Knob
            value={clickLayer.filterFreq}
            min={1000}
            max={15000}
            step={100}
            label="Freq"
            unit="Hz"
            onChange={(v) => update("filterFreq", v)}
            logarithmic
            accentColor="orange"
            size="xs"
          />
          <Knob
            value={clickLayer.filterQ}
            min={1}
            max={10}
            step={0.5}
            label="Q"
            onChange={(v) => update("filterQ", v)}
            accentColor="orange"
            size="xs"
          />
        </div>

        <div className={`rounded border border-border/50 p-1.5 ${!clickLayer.srrEnabled ? 'opacity-50' : ''}`}>
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] text-muted-foreground">SRR</span>
            <Switch
              checked={clickLayer.srrEnabled}
              onCheckedChange={(v) => update("srrEnabled", v)}
              className="scale-50"
              data-testid="switch-click-srr"
            />
          </div>
          <div className="flex justify-center">
            <Knob
              value={clickLayer.srrAmount}
              min={1}
              max={16}
              step={1}
              label="Bits"
              onChange={(v) => update("srrAmount", v)}
              accentColor="orange"
              size="xs"
            />
          </div>
        </div>
      </div>
    </CollapsiblePanel>
  );
}
