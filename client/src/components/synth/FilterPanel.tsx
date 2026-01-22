import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Knob } from "./Knob";
import type { SynthParameters } from "@shared/schema";
import { SlidersHorizontal } from "lucide-react";

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

  return (
    <Card className={`synth-panel transition-opacity ${!filter.enabled ? 'opacity-60' : ''}`} data-testid="panel-filter">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-sm font-medium">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-accent" />
            Filter
          </div>
          <Switch
            checked={filter.enabled}
            onCheckedChange={(v) => updateFilter("enabled", v)}
            data-testid="switch-filter"
          />
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-xs text-muted-foreground">Type</label>
          <Select
            value={filter.type}
            onValueChange={(v) => updateFilter("type", v as SynthParameters["filter"]["type"])}
            disabled={!filter.enabled}
          >
            <SelectTrigger className="h-8 text-xs" data-testid="select-filter-type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="lowpass">Low Pass</SelectItem>
              <SelectItem value="highpass">High Pass</SelectItem>
              <SelectItem value="bandpass">Band Pass</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex justify-center gap-4">
          <Knob
            value={filter.frequency}
            min={20}
            max={20000}
            step={1}
            label="Frequency"
            unit="Hz"
            onChange={(v) => updateFilter("frequency", v)}
            logarithmic
            accentColor="accent"
          />
          <Knob
            value={filter.resonance}
            min={0}
            max={30}
            step={0.1}
            label="Resonance"
            unit="Q"
            onChange={(v) => updateFilter("resonance", v)}
            accentColor="primary"
          />
        </div>

        <div className="h-12 w-full rounded-md relative overflow-hidden" style={{
          background: 'linear-gradient(to bottom, hsl(var(--muted)), hsl(var(--background)))',
        }}>
          <svg className="w-full h-full" viewBox="0 0 100 30" preserveAspectRatio="none">
            <defs>
              <linearGradient id="filterGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="hsl(var(--accent))" />
                <stop offset="100%" stopColor="hsl(var(--primary))" />
              </linearGradient>
            </defs>
            {filter.type === "lowpass" && (
              <path
                d={`M 0,25 
                    L ${(Math.log(filter.frequency / 20) / Math.log(1000)) * 80},25 
                    Q ${(Math.log(filter.frequency / 20) / Math.log(1000)) * 80 + 5},${25 - filter.resonance * 0.7} 
                      ${(Math.log(filter.frequency / 20) / Math.log(1000)) * 80 + 10},5 
                    L 100,28`}
                fill="none"
                stroke={filter.enabled ? "url(#filterGradient)" : "hsl(var(--muted-foreground))"}
                strokeWidth="1.5"
                strokeLinecap="round"
                opacity={filter.enabled ? 1 : 0.5}
              />
            )}
            {filter.type === "highpass" && (
              <path
                d={`M 0,28 
                    L ${(Math.log(filter.frequency / 20) / Math.log(1000)) * 80 - 10},5 
                    Q ${(Math.log(filter.frequency / 20) / Math.log(1000)) * 80 - 5},${25 - filter.resonance * 0.7} 
                      ${(Math.log(filter.frequency / 20) / Math.log(1000)) * 80},25 
                    L 100,25`}
                fill="none"
                stroke={filter.enabled ? "url(#filterGradient)" : "hsl(var(--muted-foreground))"}
                strokeWidth="1.5"
                strokeLinecap="round"
                opacity={filter.enabled ? 1 : 0.5}
              />
            )}
            {filter.type === "bandpass" && (
              <path
                d={`M 0,28 
                    L ${(Math.log(filter.frequency / 20) / Math.log(1000)) * 80 - 15},28 
                    Q ${(Math.log(filter.frequency / 20) / Math.log(1000)) * 80 - 5},28 
                      ${(Math.log(filter.frequency / 20) / Math.log(1000)) * 80},${25 - filter.resonance * 0.7} 
                    Q ${(Math.log(filter.frequency / 20) / Math.log(1000)) * 80 + 5},28 
                      ${(Math.log(filter.frequency / 20) / Math.log(1000)) * 80 + 15},28 
                    L 100,28`}
                fill="none"
                stroke={filter.enabled ? "url(#filterGradient)" : "hsl(var(--muted-foreground))"}
                strokeWidth="1.5"
                strokeLinecap="round"
                opacity={filter.enabled ? 1 : 0.5}
              />
            )}
          </svg>
        </div>
      </CardContent>
    </Card>
  );
}
