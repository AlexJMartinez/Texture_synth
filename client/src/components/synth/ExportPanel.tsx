import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import type { ExportSettings } from "@shared/schema";
import { Download, FileAudio, Share2, Check, X } from "lucide-react";
import { useEffect, useState, useRef, useMemo } from "react";

export interface ExportResult {
  blob: Blob;
  url: string;
  filename: string;
}

interface ExportPanelProps {
  settings: ExportSettings;
  onChange: (settings: ExportSettings) => void;
  onExport: () => void;
  isExporting: boolean;
  exportResult: ExportResult | null;
  onClearResult: () => void;
}

export function ExportPanel({ settings, onChange, onExport, isExporting, exportResult, onClearResult }: ExportPanelProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [canShare, setCanShare] = useState(false);
  
  const isIOS = useMemo(() => {
    if (typeof navigator === "undefined") return false;
    return /iPad|iPhone|iPod/.test(navigator.userAgent) || 
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  }, []);

  useEffect(() => {
    setCanShare(typeof navigator !== "undefined" && "share" in navigator && "canShare" in navigator);
  }, []);

  const updateSettings = <K extends keyof ExportSettings>(
    key: K,
    value: ExportSettings[K]
  ) => {
    onChange({ ...settings, [key]: value });
  };

  const handleShare = async () => {
    if (!exportResult || !canShare) return;
    
    try {
      const file = new File([exportResult.blob], exportResult.filename, { type: "audio/wav" });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: "OneShot Audio",
          text: "Check out this sound I made!"
        });
      } else {
        await navigator.share({
          title: "OneShot Audio",
          text: `Download: ${exportResult.filename}`,
          url: exportResult.url
        });
      }
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        console.error("Share failed:", err);
      }
    }
  };

  const handleDownload = () => {
    if (!exportResult) return;
    const a = document.createElement("a");
    a.href = exportResult.url;
    a.download = exportResult.filename;
    a.click();
  };

  if (exportResult) {
    return (
      <Card className="synth-panel" data-testid="panel-export">
        <CardHeader className="pb-1 pt-2 px-2">
          <CardTitle className="flex items-center justify-between text-xs font-medium">
            <div className="flex items-center gap-1">
              <Check className="w-3 h-3 text-green-500" />
              Exported
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-4 w-4"
              onClick={onClearResult}
              data-testid="button-clear-export"
            >
              <X className="w-3 h-3" />
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 px-2 pb-2 pt-0">
          <div className="text-[10px] text-muted-foreground truncate" title={exportResult.filename}>
            {exportResult.filename}
          </div>
          
          {isIOS && (
            <div className="space-y-1">
              <audio 
                ref={audioRef}
                src={exportResult.url} 
                controls 
                className="w-full h-8"
                data-testid="audio-preview"
              />
              <p className="text-[9px] text-muted-foreground text-center">
                Long-press to save audio
              </p>
            </div>
          )}
          
          <div className="flex gap-1">
            <Button
              onClick={handleDownload}
              size="sm"
              variant="outline"
              className="flex-1 h-6 text-[10px]"
              data-testid="button-download"
            >
              <Download className="w-3 h-3 mr-1" />
              Save
            </Button>
            
            {canShare && (
              <Button
                onClick={handleShare}
                size="sm"
                variant="outline"
                className="flex-1 h-6 text-[10px]"
                data-testid="button-share"
              >
                <Share2 className="w-3 h-3 mr-1" />
                Share
              </Button>
            )}
          </div>
          
          <Button
            onClick={() => { onClearResult(); }}
            size="sm"
            className="w-full h-6 text-[10px] glow-accent"
            data-testid="button-export-new"
          >
            <FileAudio className="w-3 h-3 mr-1" />
            New Export
          </Button>
        </CardContent>
      </Card>
    );
  }

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
            <Label className="text-[10px] text-muted-foreground">Tail</Label>
            <span className="text-[10px] font-mono text-foreground">+{settings.tailExtension}ms</span>
          </div>
          <Slider
            value={[settings.tailExtension]}
            onValueChange={([v]) => updateSettings("tailExtension", v)}
            min={0}
            max={5000}
            step={100}
            className="w-full"
            data-testid="slider-tail-extension"
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
