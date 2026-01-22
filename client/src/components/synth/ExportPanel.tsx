import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import type { ExportSettings } from "@shared/schema";
import { Download, FileAudio } from "lucide-react";

interface ExportPanelProps {
  settings: ExportSettings;
  onChange: (settings: ExportSettings) => void;
  onExport: () => void;
  isExporting: boolean;
}

export function ExportPanel({ settings, onChange, onExport, isExporting }: ExportPanelProps) {
  const updateSettings = <K extends keyof ExportSettings>(
    key: K,
    value: ExportSettings[K]
  ) => {
    onChange({ ...settings, [key]: value });
  };

  return (
    <Card className="synth-panel" data-testid="panel-export">
      <CardHeader className="pb-1 pt-2 px-2">
        <CardTitle className="flex items-center gap-1 text-xs font-medium">
          <FileAudio className="w-3 h-3 text-accent" />
          Export
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 px-2 pb-2 pt-0">
        <div className="grid grid-cols-2 gap-1.5">
          <div className="space-y-0.5">
            <Label className="text-[10px] text-muted-foreground">Rate</Label>
            <Select
              value={settings.sampleRate}
              onValueChange={(v) => updateSettings("sampleRate", v as ExportSettings["sampleRate"])}
            >
              <SelectTrigger className="h-6 text-[10px]" data-testid="select-sample-rate">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="44100">44.1k</SelectItem>
                <SelectItem value="48000">48k</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-0.5">
            <Label className="text-[10px] text-muted-foreground">Ch</Label>
            <Select
              value={settings.channels}
              onValueChange={(v) => updateSettings("channels", v as ExportSettings["channels"])}
            >
              <SelectTrigger className="h-6 text-[10px]" data-testid="select-channels">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="mono">M</SelectItem>
                <SelectItem value="stereo">St</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <Label className="text-[10px] text-muted-foreground">Dur</Label>
            <span className="text-[10px] font-mono text-foreground">{settings.duration}ms</span>
          </div>
          <Slider
            value={[settings.duration]}
            onValueChange={([v]) => updateSettings("duration", v)}
            min={100}
            max={10000}
            step={100}
            className="w-full"
            data-testid="slider-duration"
          />
        </div>

        <div className="flex items-center justify-between py-1 px-2 rounded bg-muted/30 border border-border/50">
          <Label className="text-[10px] text-foreground">Norm</Label>
          <Switch
            checked={settings.normalize}
            onCheckedChange={(v) => updateSettings("normalize", v)}
            className="scale-75"
            data-testid="switch-normalize"
          />
        </div>

        <Button
          onClick={onExport}
          disabled={isExporting}
          size="sm"
          className="w-full h-6 text-[10px] glow-accent"
          data-testid="button-export"
        >
          {isExporting ? (
            <>
              <div className="w-3 h-3 mr-1 border-2 border-current border-t-transparent rounded-full animate-spin" />
              ...
            </>
          ) : (
            <>
              <Download className="w-3 h-3 mr-1" />
              Export
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
