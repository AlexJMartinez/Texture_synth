import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Knob } from "./Knob";
import { CollapsiblePanel } from "./CollapsiblePanel";
import type { Waveshaper, WaveshaperCurve } from "@shared/schema";
import { Zap } from "lucide-react";

interface WaveshaperPanelProps {
  waveshaper: Waveshaper;
  onChange: (waveshaper: Waveshaper) => void;
}

const curveOptions: { value: WaveshaperCurve; label: string }[] = [
  { value: "softclip", label: "Soft Clip" },
  { value: "hardclip", label: "Hard Clip" },
  { value: "foldback", label: "Foldback" },
  { value: "sinefold", label: "Sine Fold" },
  { value: "chebyshev", label: "Chebyshev" },
  { value: "asymmetric", label: "Asymmetric" },
  { value: "tube", label: "Tube" },
];

const oversampleOptions = [
  { value: "none", label: "None" },
  { value: "2x", label: "2x" },
  { value: "4x", label: "4x" },
];

export function WaveshaperPanel({ waveshaper, onChange }: WaveshaperPanelProps) {
  const updateWaveshaper = <K extends keyof Waveshaper>(key: K, value: Waveshaper[K]) => {
    onChange({ ...waveshaper, [key]: value });
  };

  return (
    <CollapsiblePanel
      title="Waveshaper"
      icon={<Zap className="w-3 h-3 text-primary" />}
      defaultOpen={false}
      data-testid="panel-waveshaper"
    >
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-muted-foreground">Enable</span>
          <Switch
            checked={waveshaper.enabled}
            onCheckedChange={(v) => updateWaveshaper("enabled", v)}
            className="scale-50"
            data-testid="switch-waveshaper"
          />
        </div>

        <div className={`space-y-2 ${!waveshaper.enabled ? "opacity-50 pointer-events-none" : ""}`}>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-muted-foreground w-10">Curve</span>
            <Select
              value={waveshaper.curve}
              onValueChange={(v) => updateWaveshaper("curve", v as WaveshaperCurve)}
            >
              <SelectTrigger className="h-6 text-[10px] flex-1" data-testid="select-waveshaper-curve">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {curveOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value} className="text-[10px]">
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] text-muted-foreground w-10">OS</span>
            <Select
              value={waveshaper.oversample}
              onValueChange={(v) => updateWaveshaper("oversample", v as "none" | "2x" | "4x")}
            >
              <SelectTrigger className="h-6 text-[10px] flex-1" data-testid="select-waveshaper-oversample">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {oversampleOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value} className="text-[10px]">
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-center gap-2">
            <Knob
              value={waveshaper.drive}
              min={0}
              max={100}
              step={1}
              label="Drive"
              unit="%"
              onChange={(v) => updateWaveshaper("drive", v)}
              accentColor="primary"
              size="xs"
              modulationPath="waveshaper.amount"
            />
            <Knob
              value={waveshaper.mix}
              min={0}
              max={100}
              step={1}
              label="Mix"
              unit="%"
              onChange={(v) => updateWaveshaper("mix", v)}
              accentColor="accent"
              size="xs"
              modulationPath="waveshaper.mix"
            />
          </div>

          <div className="border-t border-border/50 pt-1.5 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-muted-foreground">Pre Filter</span>
              <Switch
                checked={waveshaper.preFilterEnabled}
                onCheckedChange={(v) => updateWaveshaper("preFilterEnabled", v)}
                className="scale-50"
                data-testid="switch-pre-filter"
              />
            </div>
            {waveshaper.preFilterEnabled && (
              <div className="flex justify-center">
                <Knob
                  value={waveshaper.preFilterFreq}
                  min={20}
                  max={20000}
                  step={1}
                  label="Freq"
                  unit="Hz"
                  onChange={(v) => updateWaveshaper("preFilterFreq", v)}
                  logarithmic
                  size="xs"
                />
              </div>
            )}

            <div className="flex items-center justify-between">
              <span className="text-[10px] text-muted-foreground">Post Filter</span>
              <Switch
                checked={waveshaper.postFilterEnabled}
                onCheckedChange={(v) => updateWaveshaper("postFilterEnabled", v)}
                className="scale-50"
                data-testid="switch-post-filter"
              />
            </div>
            {waveshaper.postFilterEnabled && (
              <div className="flex justify-center">
                <Knob
                  value={waveshaper.postFilterFreq}
                  min={20}
                  max={20000}
                  step={1}
                  label="Freq"
                  unit="Hz"
                  onChange={(v) => updateWaveshaper("postFilterFreq", v)}
                  logarithmic
                  size="xs"
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </CollapsiblePanel>
  );
}
