import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  type StepSequencerSettings,
  randomizeStepSequencerSettings,
} from "@/lib/stepSequencerSettings";
import { Shuffle, RotateCcw } from "lucide-react";

interface StepSequencerPanelProps {
  settings: StepSequencerSettings;
  onChange: (settings: StepSequencerSettings) => void;
}

export function StepSequencerPanel({ settings, onChange }: StepSequencerPanelProps) {
  const handleStepChange = (index: number, value: number) => {
    const newSteps = [...settings.steps];
    newSteps[index] = value;
    onChange({ ...settings, steps: newSteps });
  };

  const handleStepClick = (index: number, e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const y = 1 - (e.clientY - rect.top) / rect.height;
    handleStepChange(index, Math.max(0, Math.min(1, y)));
  };

  const resetSequencer = () => {
    const steps = Array(16).fill(0.5);
    onChange({ ...settings, steps });
  };

  const randomize = () => {
    onChange(randomizeStepSequencerSettings());
  };

  const rates = [
    { value: "1/1", label: "1/1" },
    { value: "1/2", label: "1/2" },
    { value: "1/4", label: "1/4" },
    { value: "1/8", label: "1/8" },
    { value: "1/16", label: "1/16" },
    { value: "1/32", label: "1/32" },
    { value: "1/4T", label: "1/4T" },
    { value: "1/8T", label: "1/8T" },
    { value: "1/16T", label: "1/16T" },
    { value: "1/4D", label: "1/4." },
    { value: "1/8D", label: "1/8." },
    { value: "1/16D", label: "1/16." },
  ];

  return (
    <Card className="bg-card/50 border-primary/20" data-testid="step-sequencer-panel">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-sm font-medium text-primary">Step Sequencer</CardTitle>
          <div className="flex items-center gap-2">
            <Button
              size="icon"
              variant="ghost"
              className="h-6 w-6"
              onClick={resetSequencer}
              data-testid="step-seq-reset"
            >
              <RotateCcw className="w-3 h-3" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-6 w-6"
              onClick={randomize}
              data-testid="step-seq-randomize"
            >
              <Shuffle className="w-3 h-3" />
            </Button>
            <Switch
              checked={settings.enabled}
              onCheckedChange={(enabled) => onChange({ ...settings, enabled })}
              data-testid="step-seq-enabled"
            />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div 
          className="flex gap-0.5 h-20 bg-background/50 rounded-md p-1 border border-primary/10"
          data-testid="step-seq-grid"
        >
          {Array.from({ length: settings.stepCount }).map((_, index) => (
            <div
              key={index}
              className="relative flex-1 cursor-pointer group"
              onClick={(e) => handleStepClick(index, e)}
              data-testid={`step-${index}`}
            >
              <div className="absolute inset-x-0.5 bottom-0 rounded-sm transition-colors bg-primary/60 group-hover:bg-primary/80"
                style={{ height: `${settings.steps[index] * 100}%` }}
              />
              <div className="absolute inset-0 border-r border-primary/10 last:border-r-0" />
              <div className="absolute bottom-0 left-0 right-0 text-[8px] text-center text-muted-foreground opacity-0 group-hover:opacity-100">
                {index + 1}
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div className="space-y-1">
            <Label className="text-xs">Steps</Label>
            <Select
              value={String(settings.stepCount)}
              onValueChange={(v) => onChange({ ...settings, stepCount: Number(v) as 8 | 16 })}
            >
              <SelectTrigger className="h-8" data-testid="step-seq-count">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="8">8 Steps</SelectItem>
                <SelectItem value="16">16 Steps</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Rate</Label>
            <Select
              value={settings.rate}
              onValueChange={(rate) => onChange({ ...settings, rate })}
            >
              <SelectTrigger className="h-8" data-testid="step-seq-rate">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {rates.map((r) => (
                  <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Swing: {Math.round(settings.swing * 100)}%</Label>
            <Slider
              value={[settings.swing]}
              min={0}
              max={0.5}
              step={0.01}
              onValueChange={([v]) => onChange({ ...settings, swing: v })}
              className="mt-2"
              data-testid="step-seq-swing"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">Smoothing: {Math.round(settings.smoothing * 100)}%</Label>
            <Slider
              value={[settings.smoothing]}
              min={0}
              max={1}
              step={0.01}
              onValueChange={([v]) => onChange({ ...settings, smoothing: v })}
              data-testid="step-seq-smoothing"
            />
          </div>
          <div className="flex items-center justify-end gap-2 pt-4">
            <Switch
              checked={settings.bipolar}
              onCheckedChange={(bipolar) => onChange({ ...settings, bipolar })}
              data-testid="step-seq-bipolar"
            />
            <Label className="text-xs">Bipolar</Label>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
