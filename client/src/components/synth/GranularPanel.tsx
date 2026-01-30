import { useCallback, useRef, useEffect, useState } from "react";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Knob } from "./Knob";
import { CollapsiblePanel } from "./CollapsiblePanel";
import { Layers, Upload, Mic, Trash2 } from "lucide-react";
import type { 
  GranularSettings, 
  GranularMode, 
  WindowType, 
  PitchMode,
  GranularSampleBuffer 
} from "@/lib/granularSettings";
import { 
  CINEMATIC_DEFAULTS, 
  DESIGN_DEFAULTS, 
  getRanges, 
  clampToMode,
  applyAntiMudRules
} from "@/lib/granularSettings";

interface GranularPanelProps {
  settings: GranularSettings;
  onChange: (settings: GranularSettings) => void;
  sampleBuffer: GranularSampleBuffer | null;
  onSampleLoad: (buffer: GranularSampleBuffer) => void;
  onCapture: () => void;
  onClearSample: () => void;
  isCapturing?: boolean;
}

export function GranularPanel({ 
  settings, 
  onChange, 
  sampleBuffer, 
  onSampleLoad,
  onCapture,
  onClearSample,
  isCapturing = false
}: GranularPanelProps) {
  const dropZoneRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  
  const ranges = getRanges(settings.mode);
  
  const update = <K extends keyof GranularSettings>(key: K, value: GranularSettings[K]) => {
    const newSettings = { ...settings, [key]: value };
    // Apply mode clamping and then anti-mud rules for deterministic behavior
    onChange(applyAntiMudRules(clampToMode(newSettings)));
  };
  
  // Switch mode and apply appropriate defaults
  const handleModeChange = (mode: GranularMode) => {
    const defaults = mode === 'cinematic' ? CINEMATIC_DEFAULTS : DESIGN_DEFAULTS;
    onChange(applyAntiMudRules({
      ...defaults,
      enabled: settings.enabled,
      seed: settings.seed, // Preserve seed
    }));
  };
  
  // Handle file drop
  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files[0];
    if (!file) return;
    
    await loadAudioFile(file);
  }, []);
  
  // Handle file input
  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    await loadAudioFile(file);
  }, []);
  
  // Load audio file into buffer
  const loadAudioFile = async (file: File) => {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const audioContext = new AudioContext();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      
      // Convert to mono Float32Array
      const channelData = audioBuffer.getChannelData(0);
      const data = new Float32Array(channelData.length);
      data.set(channelData);
      
      // If stereo, mix to mono
      if (audioBuffer.numberOfChannels > 1) {
        const rightChannel = audioBuffer.getChannelData(1);
        for (let i = 0; i < data.length; i++) {
          data[i] = (data[i] + rightChannel[i]) / 2;
        }
      }
      
      onSampleLoad({
        data,
        sampleRate: audioBuffer.sampleRate,
        duration: audioBuffer.duration,
        name: file.name,
        channels: 1,
      });
      
      // Update seed for new sample to ensure deterministic grain generation
      const newSeed = Date.now();
      onChange(applyAntiMudRules({ ...settings, seed: newSeed }));
      
      audioContext.close();
    } catch (err) {
      console.error('Failed to load audio file:', err);
    }
  };
  
  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };
  
  const handleDragLeave = () => {
    setIsDragging(false);
  };
  
  // Draw waveform preview
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const width = canvas.width;
    const height = canvas.height;
    
    // Clear
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, width, height);
    
    if (!sampleBuffer?.data) {
      // Draw placeholder text
      ctx.fillStyle = '#666';
      ctx.font = '10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Drop sample or Capture', width / 2, height / 2 + 4);
      return;
    }
    
    // Draw waveform
    const data = sampleBuffer.data;
    const step = Math.ceil(data.length / width);
    
    ctx.strokeStyle = '#8fbc8f';
    ctx.lineWidth = 1;
    ctx.beginPath();
    
    for (let i = 0; i < width; i++) {
      const start = i * step;
      const end = Math.min(start + step, data.length);
      
      let min = 0, max = 0;
      for (let j = start; j < end; j++) {
        if (data[j] < min) min = data[j];
        if (data[j] > max) max = data[j];
      }
      
      const yMin = ((1 - max) / 2) * height;
      const yMax = ((1 - min) / 2) * height;
      
      ctx.moveTo(i, yMin);
      ctx.lineTo(i, yMax);
    }
    
    ctx.stroke();
    
    // Draw scan region overlay
    const scanStartX = settings.scanStart * width;
    const scanEndX = (settings.scanStart + settings.scanWidth) * width;
    
    ctx.fillStyle = 'rgba(143, 188, 143, 0.2)';
    ctx.fillRect(scanStartX, 0, scanEndX - scanStartX, height);
    
    // Draw scan position line
    ctx.strokeStyle = '#90ee90';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(scanStartX, 0);
    ctx.lineTo(scanStartX, height);
    ctx.stroke();
    
  }, [sampleBuffer, settings.scanStart, settings.scanWidth]);
  
  return (
    <CollapsiblePanel
      title="Granular"
      icon={<Layers className="w-3 h-3 text-purple-400" />}
      defaultOpen={settings.enabled}
      data-testid="panel-granular"
      className={`transition-opacity ${!settings.enabled ? 'opacity-50' : ''}`}
      headerExtra={
        <Switch
          checked={settings.enabled}
          onCheckedChange={(v) => update("enabled", v)}
          className="scale-75"
          data-testid="switch-granular"
        />
      }
    >
      <div className="space-y-2">
        {/* Mode Toggle */}
        <div className="flex items-center gap-1">
          <Select
            value={settings.mode}
            onValueChange={(v) => handleModeChange(v as GranularMode)}
            disabled={!settings.enabled}
          >
            <SelectTrigger className="h-5 text-[10px] flex-1" data-testid="select-granular-mode">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="cinematic">Cinematic</SelectItem>
              <SelectItem value="design">Design</SelectItem>
            </SelectContent>
          </Select>
          <span className="text-[9px] text-muted-foreground">
            {settings.mode === 'cinematic' ? '(guardrails)' : '(full range)'}
          </span>
        </div>
        
        {/* Sample Drop Zone + Waveform */}
        <div
          ref={dropZoneRef}
          className={`relative border border-dashed rounded-md p-1 transition-colors cursor-pointer ${
            isDragging ? 'border-primary bg-primary/10' : 'border-muted-foreground/30'
          }`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => fileInputRef.current?.click()}
          data-testid="drop-zone-granular"
        >
          <canvas
            ref={canvasRef}
            width={200}
            height={40}
            className="w-full h-10 rounded"
          />
          <input
            ref={fileInputRef}
            type="file"
            accept="audio/*"
            className="hidden"
            onChange={handleFileSelect}
            data-testid="input-granular-file"
          />
        </div>
        
        {/* Sample info + buttons */}
        <div className="flex items-center gap-1">
          <Button
            size="sm"
            variant="outline"
            className="h-5 text-[10px] flex-1"
            onClick={onCapture}
            disabled={!settings.enabled || isCapturing}
            data-testid="button-granular-capture"
          >
            <Mic className="w-3 h-3 mr-1" />
            {isCapturing ? 'Capturing...' : 'Capture'}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-5 px-1"
            onClick={() => fileInputRef.current?.click()}
            disabled={!settings.enabled}
            data-testid="button-granular-upload"
          >
            <Upload className="w-3 h-3" />
          </Button>
          {sampleBuffer && (
            <Button
              size="sm"
              variant="ghost"
              className="h-5 px-1"
              onClick={onClearSample}
              disabled={!settings.enabled}
              data-testid="button-granular-clear"
            >
              <Trash2 className="w-3 h-3" />
            </Button>
          )}
        </div>
        
        {sampleBuffer && (
          <div className="text-[9px] text-muted-foreground truncate">
            {sampleBuffer.name} ({sampleBuffer.duration.toFixed(2)}s)
          </div>
        )}
        
        {/* Timing + Density */}
        <div className="border-t border-muted-foreground/20 pt-1.5">
          <div className="text-[9px] text-muted-foreground mb-1">Timing</div>
          <div className="flex justify-center gap-1">
            <Knob
              value={settings.grainSizeMs}
              min={ranges.grainSizeMs.min}
              max={ranges.grainSizeMs.max}
              step={1}
              label="Size"
              unit="ms"
              onChange={(v) => update("grainSizeMs", v)}
              accentColor="accent"
              size="xs"
              modulationPath="granular.grainSizeMs"
            />
            <Knob
              value={settings.densityGps}
              min={ranges.densityGps.min}
              max={ranges.densityGps.max}
              step={1}
              label="Density"
              unit="g/s"
              onChange={(v) => update("densityGps", v)}
              accentColor="accent"
              size="xs"
              modulationPath="granular.densityGps"
            />
            <Knob
              value={settings.maxVoices}
              min={ranges.maxVoices.min}
              max={ranges.maxVoices.max}
              step={1}
              label="Voices"
              unit=""
              onChange={(v) => update("maxVoices", v)}
              accentColor="accent"
              size="xs"
            />
          </div>
        </div>
        
        {/* Position / Scan */}
        <div className="border-t border-muted-foreground/20 pt-1.5">
          <div className="text-[9px] text-muted-foreground mb-1">Position</div>
          <div className="flex justify-center gap-1">
            <Knob
              value={settings.scanStart * 100}
              min={0}
              max={100}
              step={1}
              label="Start"
              unit="%"
              onChange={(v) => update("scanStart", v / 100)}
              accentColor="accent"
              size="xs"
              modulationPath="granular.scanStart"
            />
            <Knob
              value={settings.scanWidth * 100}
              min={ranges.scanWidth.min * 100}
              max={ranges.scanWidth.max * 100}
              step={1}
              label="Width"
              unit="%"
              onChange={(v) => update("scanWidth", v / 100)}
              accentColor="accent"
              size="xs"
              modulationPath="granular.scanWidth"
            />
            <Knob
              value={settings.scanRateHz}
              min={ranges.scanRateHz.min}
              max={ranges.scanRateHz.max}
              step={0.1}
              label="Rate"
              unit="Hz"
              onChange={(v) => update("scanRateHz", v)}
              accentColor="accent"
              size="xs"
              modulationPath="granular.scanRateHz"
            />
            <Knob
              value={settings.posJitterMs}
              min={ranges.posJitterMs.min}
              max={ranges.posJitterMs.max}
              step={1}
              label="Jitter"
              unit="ms"
              onChange={(v) => update("posJitterMs", v)}
              accentColor="accent"
              size="xs"
              modulationPath="granular.posJitterMs"
            />
          </div>
        </div>
        
        {/* Pitch */}
        <div className="border-t border-muted-foreground/20 pt-1.5">
          <div className="text-[9px] text-muted-foreground mb-1">Pitch</div>
          <div className="flex justify-center gap-1">
            <Knob
              value={settings.pitchST}
              min={ranges.pitchST.min}
              max={ranges.pitchST.max}
              step={1}
              label="Pitch"
              unit="st"
              onChange={(v) => update("pitchST", v)}
              accentColor="accent"
              size="xs"
              modulationPath="granular.pitchST"
            />
            <Knob
              value={settings.pitchRandST}
              min={ranges.pitchRandST.min}
              max={ranges.pitchRandST.max}
              step={0.5}
              label="Random"
              unit="st"
              onChange={(v) => update("pitchRandST", v)}
              accentColor="accent"
              size="xs"
              modulationPath="granular.pitchRandST"
            />
          </div>
        </div>
        
        {/* Window */}
        <div className="border-t border-muted-foreground/20 pt-1.5">
          <div className="text-[9px] text-muted-foreground mb-1">Window</div>
          <div className="flex items-center gap-1 mb-1">
            <Select
              value={settings.windowType}
              onValueChange={(v) => update("windowType", v as WindowType)}
              disabled={!settings.enabled}
            >
              <SelectTrigger className="h-5 text-[10px] flex-1" data-testid="select-granular-window">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="hann">Hann</SelectItem>
                <SelectItem value="gauss">Gauss</SelectItem>
                <SelectItem value="blackman">Blackman</SelectItem>
                {settings.mode === 'design' && (
                  <SelectItem value="rect">Rect (glitch)</SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-center gap-1">
            <Knob
              value={settings.windowSkew * 100}
              min={-100}
              max={100}
              step={1}
              label="Skew"
              unit="%"
              onChange={(v) => update("windowSkew", v / 100)}
              accentColor="accent"
              size="xs"
            />
            <Knob
              value={settings.grainAmpRandDb}
              min={0}
              max={9}
              step={0.5}
              label="AmpVar"
              unit="dB"
              onChange={(v) => update("grainAmpRandDb", v)}
              accentColor="accent"
              size="xs"
            />
          </div>
        </div>
        
        {/* Stereo */}
        <div className="border-t border-muted-foreground/20 pt-1.5">
          <div className="text-[9px] text-muted-foreground mb-1">Stereo</div>
          <div className="flex justify-center gap-1">
            <Knob
              value={settings.panSpread * 100}
              min={ranges.panSpread.min * 100}
              max={ranges.panSpread.max * 100}
              step={1}
              label="Spread"
              unit="%"
              onChange={(v) => update("panSpread", v / 100)}
              accentColor="accent"
              size="xs"
              modulationPath="granular.panSpread"
            />
            <Knob
              value={settings.stereoLink * 100}
              min={ranges.stereoLink.min * 100}
              max={ranges.stereoLink.max * 100}
              step={1}
              label="Link"
              unit="%"
              onChange={(v) => update("stereoLink", v / 100)}
              accentColor="accent"
              size="xs"
            />
            <Knob
              value={settings.widthMs}
              min={ranges.widthMs.min}
              max={ranges.widthMs.max}
              step={0.5}
              label="Width"
              unit="ms"
              onChange={(v) => update("widthMs", v)}
              accentColor="accent"
              size="xs"
            />
          </div>
        </div>
        
        {/* Post Bus */}
        <div className="border-t border-muted-foreground/20 pt-1.5">
          <div className="text-[9px] text-muted-foreground mb-1">Post Bus</div>
          <div className="flex justify-center gap-1">
            <Knob
              value={settings.postHPHz}
              min={ranges.postHPHz.min}
              max={ranges.postHPHz.max}
              step={10}
              label="HP"
              unit="Hz"
              onChange={(v) => update("postHPHz", v)}
              accentColor="accent"
              size="xs"
              logarithmic
              modulationPath="granular.postHPHz"
            />
            <Knob
              value={settings.postLPHz}
              min={ranges.postLPHz.min}
              max={ranges.postLPHz.max}
              step={100}
              label="LP"
              unit="Hz"
              onChange={(v) => update("postLPHz", v)}
              accentColor="accent"
              size="xs"
              logarithmic
              modulationPath="granular.postLPHz"
            />
            <Knob
              value={settings.satDrive * 100}
              min={ranges.satDrive.min * 100}
              max={ranges.satDrive.max * 100}
              step={1}
              label="Sat"
              unit="%"
              onChange={(v) => update("satDrive", v / 100)}
              accentColor="accent"
              size="xs"
              modulationPath="granular.satDrive"
            />
            <Knob
              value={settings.wetMix * 100}
              min={ranges.wetMix.min * 100}
              max={ranges.wetMix.max * 100}
              step={1}
              label="Mix"
              unit="%"
              onChange={(v) => update("wetMix", v / 100)}
              accentColor="accent"
              size="xs"
              modulationPath="granular.wetMix"
            />
          </div>
        </div>
        
        {/* Envelope */}
        <div className="border-t border-muted-foreground/20 pt-1.5">
          <div className="text-[9px] text-muted-foreground mb-1">Envelope (AHD)</div>
          <div className="flex justify-center gap-1">
            <Knob
              value={settings.envAttack}
              min={0}
              max={500}
              step={1}
              label="A"
              unit="ms"
              onChange={(v) => update("envAttack", v)}
              accentColor="accent"
              size="xs"
              logarithmic
            />
            <Knob
              value={settings.envHold}
              min={0}
              max={500}
              step={1}
              label="H"
              unit="ms"
              onChange={(v) => update("envHold", v)}
              accentColor="accent"
              size="xs"
            />
            <Knob
              value={settings.envDecay}
              min={10}
              max={2000}
              step={10}
              label="D"
              unit="ms"
              onChange={(v) => update("envDecay", v)}
              accentColor="accent"
              size="xs"
              logarithmic
            />
          </div>
        </div>
        
        {/* Seed (for determinism) */}
        <div className="border-t border-muted-foreground/20 pt-1.5">
          <div className="flex items-center gap-1">
            <span className="text-[9px] text-muted-foreground">Seed:</span>
            <input
              type="number"
              value={settings.seed}
              onChange={(e) => update("seed", parseInt(e.target.value) || 0)}
              className="flex-1 h-5 text-[10px] bg-background border rounded px-1"
              disabled={!settings.enabled}
              data-testid="input-granular-seed"
            />
            <Button
              size="sm"
              variant="ghost"
              className="h-5 px-1 text-[9px]"
              onClick={() => update("seed", Math.floor(Math.random() * 99999))}
              disabled={!settings.enabled}
              data-testid="button-granular-new-seed"
            >
              New
            </Button>
          </div>
        </div>
      </div>
    </CollapsiblePanel>
  );
}
