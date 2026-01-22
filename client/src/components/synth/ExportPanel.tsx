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
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          <FileAudio className="w-4 h-4 text-accent" />
          Export WAV
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Sample Rate</Label>
            <Select
              value={settings.sampleRate}
              onValueChange={(v) => updateSettings("sampleRate", v as ExportSettings["sampleRate"])}
            >
              <SelectTrigger className="h-8 text-xs" data-testid="select-sample-rate">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="44100">44.1 kHz</SelectItem>
                <SelectItem value="48000">48 kHz</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Channels</Label>
            <Select
              value={settings.channels}
              onValueChange={(v) => updateSettings("channels", v as ExportSettings["channels"])}
            >
              <SelectTrigger className="h-8 text-xs" data-testid="select-channels">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="mono">Mono</SelectItem>
                <SelectItem value="stereo">Stereo</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs text-muted-foreground">Duration</Label>
            <span className="text-xs font-mono text-foreground">{settings.duration}ms</span>
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
          <div className="flex justify-between text-[10px] text-muted-foreground">
            <span>100ms</span>
            <span>10s</span>
          </div>
        </div>

        <div className="flex items-center justify-between py-2 px-3 rounded-md bg-muted/30 border border-border/50">
          <Label className="text-xs text-foreground">Normalize output</Label>
          <Switch
            checked={settings.normalize}
            onCheckedChange={(v) => updateSettings("normalize", v)}
            data-testid="switch-normalize"
          />
        </div>

        <Button
          onClick={onExport}
          disabled={isExporting}
          className="w-full glow-accent"
          data-testid="button-export"
        >
          {isExporting ? (
            <>
              <div className="w-4 h-4 mr-2 border-2 border-current border-t-transparent rounded-full animate-spin" />
              Rendering...
            </>
          ) : (
            <>
              <Download className="w-4 h-4 mr-2" />
              Export WAV
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
