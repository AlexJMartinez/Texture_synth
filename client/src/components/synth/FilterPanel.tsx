import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Knob } from "./Knob";
import type { SynthParameters, FilterType } from "@shared/schema";
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

  const showCombDelay = filter.type === "comb";
  const showGain = filter.type === "peaking" || filter.type === "lowshelf" || filter.type === "highshelf";

  return (
    <Card className={`synth-panel transition-opacity ${!filter.enabled ? 'opacity-50' : ''}`} data-testid="panel-filter">
      <CardHeader className="pb-1 pt-2 px-2">
        <CardTitle className="flex items-center justify-between text-xs font-medium">
          <div className="flex items-center gap-1">
            <SlidersHorizontal className="w-3 h-3 text-accent" />
            Filter
          </div>
          <Switch
            checked={filter.enabled}
            onCheckedChange={(v) => updateFilter("enabled", v)}
            className="scale-75"
            data-testid="switch-filter"
          />
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 px-2 pb-2">
        <Select
          value={filter.type}
          onValueChange={(v) => updateFilter("type", v as FilterType)}
          disabled={!filter.enabled}
        >
          <SelectTrigger className="h-6 text-[10px]" data-testid="select-filter-type">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="lowpass">Low Pass</SelectItem>
            <SelectItem value="highpass">High Pass</SelectItem>
            <SelectItem value="bandpass">Band Pass</SelectItem>
            <SelectItem value="notch">Notch</SelectItem>
            <SelectItem value="allpass">All Pass</SelectItem>
            <SelectItem value="peaking">Peaking</SelectItem>
            <SelectItem value="lowshelf">Low Shelf</SelectItem>
            <SelectItem value="highshelf">High Shelf</SelectItem>
            <SelectItem value="comb">Comb</SelectItem>
          </SelectContent>
        </Select>

        <div className="flex justify-center gap-1 flex-wrap">
          <Knob
            value={filter.frequency}
            min={20}
            max={20000}
            step={1}
            label="Freq"
            unit="Hz"
            onChange={(v) => updateFilter("frequency", v)}
            logarithmic
            accentColor="accent"
            size="xs"
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
          />
          {showCombDelay && (
            <Knob
              value={filter.combDelay}
              min={0.1}
              max={50}
              step={0.1}
              label="Delay"
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
              label="Gain"
              unit="dB"
              onChange={(v) => updateFilter("gain", v)}
              size="xs"
            />
          )}
        </div>

        <div className="h-8 w-full rounded-md relative overflow-hidden" style={{
          background: 'linear-gradient(to bottom, hsl(var(--muted)), hsl(var(--background)))',
        }}>
          <svg className="w-full h-full" viewBox="0 0 100 20" preserveAspectRatio="none">
            <defs>
              <linearGradient id="filterGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="hsl(var(--accent))" />
                <stop offset="100%" stopColor="hsl(var(--primary))" />
              </linearGradient>
            </defs>
            {filter.type === "lowpass" && (
              <path
                d={`M 0,16 
                    L ${(Math.log(filter.frequency / 20) / Math.log(1000)) * 80},16 
                    Q ${(Math.log(filter.frequency / 20) / Math.log(1000)) * 80 + 5},${16 - filter.resonance * 0.4} 
                      ${(Math.log(filter.frequency / 20) / Math.log(1000)) * 80 + 10},4 
                    L 100,18`}
                fill="none"
                stroke={filter.enabled ? "url(#filterGradient)" : "hsl(var(--muted-foreground))"}
                strokeWidth="1"
                strokeLinecap="round"
                opacity={filter.enabled ? 1 : 0.5}
              />
            )}
            {filter.type === "highpass" && (
              <path
                d={`M 0,18 
                    L ${(Math.log(filter.frequency / 20) / Math.log(1000)) * 80 - 10},4 
                    Q ${(Math.log(filter.frequency / 20) / Math.log(1000)) * 80 - 5},${16 - filter.resonance * 0.4} 
                      ${(Math.log(filter.frequency / 20) / Math.log(1000)) * 80},16 
                    L 100,16`}
                fill="none"
                stroke={filter.enabled ? "url(#filterGradient)" : "hsl(var(--muted-foreground))"}
                strokeWidth="1"
                strokeLinecap="round"
                opacity={filter.enabled ? 1 : 0.5}
              />
            )}
            {(filter.type === "bandpass" || filter.type === "peaking") && (
              <path
                d={`M 0,18 
                    L ${(Math.log(filter.frequency / 20) / Math.log(1000)) * 80 - 10},18 
                    Q ${(Math.log(filter.frequency / 20) / Math.log(1000)) * 80},${16 - filter.resonance * 0.4} 
                      ${(Math.log(filter.frequency / 20) / Math.log(1000)) * 80 + 10},18 
                    L 100,18`}
                fill="none"
                stroke={filter.enabled ? "url(#filterGradient)" : "hsl(var(--muted-foreground))"}
                strokeWidth="1"
                strokeLinecap="round"
                opacity={filter.enabled ? 1 : 0.5}
              />
            )}
            {filter.type === "notch" && (
              <path
                d={`M 0,4 
                    L ${(Math.log(filter.frequency / 20) / Math.log(1000)) * 80 - 10},4 
                    Q ${(Math.log(filter.frequency / 20) / Math.log(1000)) * 80},${4 + filter.resonance * 0.4} 
                      ${(Math.log(filter.frequency / 20) / Math.log(1000)) * 80 + 10},4 
                    L 100,4`}
                fill="none"
                stroke={filter.enabled ? "url(#filterGradient)" : "hsl(var(--muted-foreground))"}
                strokeWidth="1"
                strokeLinecap="round"
                opacity={filter.enabled ? 1 : 0.5}
              />
            )}
            {(filter.type === "allpass" || filter.type === "comb") && (
              <path
                d="M 0,10 L 100,10"
                fill="none"
                stroke={filter.enabled ? "url(#filterGradient)" : "hsl(var(--muted-foreground))"}
                strokeWidth="1"
                strokeDasharray="4,2"
                strokeLinecap="round"
                opacity={filter.enabled ? 1 : 0.5}
              />
            )}
            {filter.type === "lowshelf" && (
              <path
                d={`M 0,${16 - filter.gain * 0.3} 
                    L ${(Math.log(filter.frequency / 20) / Math.log(1000)) * 60},${16 - filter.gain * 0.3} 
                    Q ${(Math.log(filter.frequency / 20) / Math.log(1000)) * 80},10 
                      100,10`}
                fill="none"
                stroke={filter.enabled ? "url(#filterGradient)" : "hsl(var(--muted-foreground))"}
                strokeWidth="1"
                strokeLinecap="round"
                opacity={filter.enabled ? 1 : 0.5}
              />
            )}
            {filter.type === "highshelf" && (
              <path
                d={`M 0,10 
                    Q ${(Math.log(filter.frequency / 20) / Math.log(1000)) * 60},10 
                      ${(Math.log(filter.frequency / 20) / Math.log(1000)) * 80},${16 - filter.gain * 0.3} 
                    L 100,${16 - filter.gain * 0.3}`}
                fill="none"
                stroke={filter.enabled ? "url(#filterGradient)" : "hsl(var(--muted-foreground))"}
                strokeWidth="1"
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
