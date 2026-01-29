import { useCallback, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Knob } from "./Knob";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Upload, Trash2, Play, RefreshCw } from "lucide-react";
import type { SampleLayerSettings } from "@/lib/sampleLayerSettings";

interface SampleLayerPanelProps {
  settings: SampleLayerSettings;
  onChange: (settings: SampleLayerSettings) => void;
  onSampleLoaded?: (buffer: AudioBuffer) => void;
}

export function SampleLayerPanel({ settings, onChange, onSampleLoaded }: SampleLayerPanelProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleFileSelect = useCallback(async (file: File) => {
    if (!file.type.startsWith("audio/")) {
      console.error("Invalid file type. Please select an audio file.");
      return;
    }

    setIsLoading(true);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const audioContext = new AudioContext();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      
      // Convert to base64 for storage
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = (reader.result as string).split(",")[1];
        onChange({
          ...settings,
          enabled: true,
          sampleData: base64,
          sampleName: file.name,
          sampleDuration: audioBuffer.duration,
        });
        onSampleLoaded?.(audioBuffer);
      };
      reader.readAsDataURL(file);
      
      audioContext.close();
    } catch (error) {
      console.error("Failed to load audio file:", error);
    } finally {
      setIsLoading(false);
    }
  }, [settings, onChange, onSampleLoaded]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileSelect(file);
    }
  }, [handleFileSelect]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  }, [handleFileSelect]);

  const handleClearSample = useCallback(() => {
    onChange({
      ...settings,
      enabled: false,
      sampleData: null,
      sampleName: null,
      sampleDuration: 0,
    });
  }, [settings, onChange]);

  return (
    <Card className="w-full" data-testid="sample-layer-panel">
      <CardHeader className="pb-2 pt-3 px-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-sm font-medium text-primary">Sample Layer</CardTitle>
          <div className="flex items-center gap-2">
            <Label htmlFor="sample-enabled" className="text-xs text-muted-foreground">
              On
            </Label>
            <Switch
              id="sample-enabled"
              checked={settings.enabled}
              onCheckedChange={(enabled) => onChange({ ...settings, enabled })}
              disabled={!settings.sampleData}
              data-testid="switch-sample-enabled"
            />
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-3 pt-0 space-y-3">
        {/* Drop zone / File info */}
        <div
          className={`relative border-2 border-dashed rounded-md p-3 text-center transition-colors cursor-pointer ${
            isDragging
              ? "border-primary bg-primary/10"
              : settings.sampleData
              ? "border-muted bg-muted/30"
              : "border-muted-foreground/30 hover:border-primary/50"
          }`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => fileInputRef.current?.click()}
          data-testid="sample-drop-zone"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="audio/*"
            onChange={handleInputChange}
            className="hidden"
            data-testid="input-sample-file"
          />
          
          {isLoading ? (
            <div className="flex items-center justify-center gap-2 py-2">
              <RefreshCw className="h-4 w-4 animate-spin text-primary" />
              <span className="text-xs text-muted-foreground">Loading...</span>
            </div>
          ) : settings.sampleData ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <Play className="h-4 w-4 text-primary shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs font-medium truncate">{settings.sampleName}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {settings.sampleDuration.toFixed(2)}s
                  </p>
                </div>
              </div>
              <Button
                size="icon"
                variant="ghost"
                onClick={(e) => {
                  e.stopPropagation();
                  handleClearSample();
                }}
                data-testid="button-clear-sample"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-1 py-1">
              <Upload className="h-5 w-5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">
                Drop audio or click to import
              </span>
            </div>
          )}
        </div>

        {/* Controls */}
        {settings.sampleData && (
          <div className="grid grid-cols-4 gap-2">
            <Knob
              value={settings.volume * 100}
              onChange={(v) => onChange({ ...settings, volume: v / 100 })}
              min={0}
              max={100}
              step={1}
              label="Vol"
              unit="%"
            />
            <Knob
              value={settings.pitch}
              onChange={(pitch) => onChange({ ...settings, pitch })}
              min={-24}
              max={24}
              step={1}
              label="Pitch"
              unit="st"
            />
            <Knob
              value={settings.attack * 1000}
              onChange={(v) => onChange({ ...settings, attack: v / 1000 })}
              min={0}
              max={1000}
              step={1}
              label="Atk"
              unit="ms"
            />
            <Knob
              value={settings.decay * 1000}
              onChange={(v) => onChange({ ...settings, decay: v / 1000 })}
              min={10}
              max={2000}
              step={10}
              label="Dec"
              unit="ms"
            />
          </div>
        )}

        {/* Position and Options */}
        {settings.sampleData && (
          <div className="grid grid-cols-4 gap-2">
            <Knob
              value={settings.startPosition * 100}
              onChange={(v) => onChange({ ...settings, startPosition: v / 100 })}
              min={0}
              max={90}
              step={1}
              label="Start"
              unit="%"
            />
            <Knob
              value={settings.endPosition * 100}
              onChange={(v) => onChange({ ...settings, endPosition: v / 100 })}
              min={10}
              max={100}
              step={1}
              label="End"
              unit="%"
            />
            <div className="flex flex-col items-center gap-1">
              <Label className="text-[10px] text-muted-foreground">Reverse</Label>
              <Switch
                checked={settings.reverse}
                onCheckedChange={(reverse) => onChange({ ...settings, reverse })}
                data-testid="switch-sample-reverse"
              />
            </div>
            <div className="flex flex-col items-center gap-1">
              <Label className="text-[10px] text-muted-foreground">Loop</Label>
              <Switch
                checked={settings.loopEnabled}
                onCheckedChange={(loopEnabled) => onChange({ ...settings, loopEnabled })}
                data-testid="switch-sample-loop"
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
