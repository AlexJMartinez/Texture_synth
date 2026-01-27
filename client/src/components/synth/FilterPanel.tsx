import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Knob } from "./Knob";
import { CollapsiblePanel } from "./CollapsiblePanel";
import type { SynthParameters, FilterType } from "@shared/schema";
import { SlidersHorizontal, Shuffle } from "lucide-react";

function randomizeFilter(): Partial<SynthParameters["filter"]> {
  const types: FilterType[] = ["lowpass", "highpass", "bandpass", "notch", "allpass", "peaking", "lowshelf", "highshelf", "comb"];
  return {
    type: types[Math.floor(Math.random() * types.length)],
    frequency: Math.exp(Math.random() * (Math.log(15000) - Math.log(100)) + Math.log(100)),
    resonance: Math.random() * 20,
    combDelay: Math.floor(5 + Math.random() * 45),
    gain: Math.floor(Math.random() * 24 - 12),
  };
}

interface FilterPanelProps {
  filter: SynthParameters["filter"];
  onChange: (filter: SynthParameters["filter"]) => void;
}

export function FilterPanel({ filter, onChange }: FilterPanelProps) {
  const updateFilter = <K extends keyof SynthParameters["filter"]>(
    key: K,
    value: SynthParameters["filter"][K]
  ) => {
    onChange({ ...filter, [key]: value });
  };

  const handleRandomize = () => {
    onChange({ ...filter, ...randomizeFilter() });
  };

  const showCombDelay = filter.type === "comb";
  const showGain = filter.type === "peaking" || filter.type === "lowshelf" || filter.type === "highshelf";

  return (
    <CollapsiblePanel
      title="Filter"
      icon={<SlidersHorizontal className="w-3 h-3 text-accent" />}
      defaultOpen={filter.enabled}
      data-testid="panel-filter"
      className={`transition-opacity ${!filter.enabled ? 'opacity-50' : ''}`}
      headerExtra={
        <div className="flex items-center gap-1">
          <Button
            size="icon"
            variant="ghost"
            onClick={handleRandomize}
            data-testid="btn-randomize-filter"
          >
            <Shuffle className="w-3 h-3" />
          </Button>
          <Switch
            checked={filter.enabled}
            onCheckedChange={(v) => updateFilter("enabled", v)}
            className="scale-75"
            data-testid="switch-filter"
          />
        </div>
      }
    >
      <div className="space-y-1.5">
        <Select
          value={filter.type}
          onValueChange={(v) => updateFilter("type", v as FilterType)}
          disabled={!filter.enabled}
        >
          <SelectTrigger className="h-5 text-[10px]" data-testid="select-filter-type">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="lowpass">LP</SelectItem>
            <SelectItem value="highpass">HP</SelectItem>
            <SelectItem value="bandpass">BP</SelectItem>
            <SelectItem value="notch">Notch</SelectItem>
            <SelectItem value="allpass">AP</SelectItem>
            <SelectItem value="peaking">Peak</SelectItem>
            <SelectItem value="lowshelf">LS</SelectItem>
            <SelectItem value="highshelf">HS</SelectItem>
            <SelectItem value="comb">Comb</SelectItem>
          </SelectContent>
        </Select>

        <div className="flex justify-center gap-1 flex-wrap">
          <Knob
            value={filter.frequency}
            min={20}
            max={20000}
            step={1}
            label="Frq"
            unit="Hz"
            onChange={(v) => updateFilter("frequency", v)}
            logarithmic
            accentColor="accent"
            size="xs"
            modulationPath="filter.frequency"
          />
          <Knob
            value={filter.resonance}
            min={0}
            max={30}
            step={0.1}
            label="Res"
            unit="Q"
            onChange={(v) => updateFilter("resonance", v)}
            accentColor="primary"
            size="xs"
            modulationPath="filter.resonance"
          />
          {showCombDelay && (
            <Knob
              value={filter.combDelay}
              min={0.1}
              max={50}
              step={0.1}
              label="Dly"
              unit="ms"
              onChange={(v) => updateFilter("combDelay", v)}
              size="xs"
            />
          )}
          {showGain && (
            <Knob
              value={filter.gain}
              min={-24}
              max={24}
              step={0.5}
              label="Gn"
              unit="dB"
              onChange={(v) => updateFilter("gain", v)}
              size="xs"
              modulationPath="filter.gain"
            />
          )}
        </div>
      </div>
    </CollapsiblePanel>
  );
}
