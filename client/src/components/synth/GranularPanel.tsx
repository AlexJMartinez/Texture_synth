import { useCallback, useRef, useEffect, useState, useMemo } from "react";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Knob } from "./Knob";
import { CollapsiblePanel } from "./CollapsiblePanel";
import { Layers, Upload, Mic, Trash2, Play, Square } from "lucide-react";
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
  isPlaying?: boolean;
  onTogglePlayback?: () => void;
}

export function GranularPanel({ 
  settings, 
  onChange, 
  sampleBuffer, 
  onSampleLoad,
  onCapture,
  onClearSample,
  isCapturing = false,
  isPlaying = false,
  onTogglePlayback
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
  
  // Canvas-based waveform visualization (matches terrain display style)
  const waveformCanvasRef = useRef<HTMLCanvasElement>(null);
  const grainOverlayRef = useRef<HTMLCanvasElement>(null);
  const [grainPositions, setGrainPositions] = useState<number[]>([]);
  
  // Draw bar-style waveform on canvas (matches main terrain display)
  const drawBarWaveform = useCallback((canvas: HTMLCanvasElement, data: Float32Array | null, cssWidth: number, cssHeight: number) => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Use CSS dimensions for drawing (canvas is scaled for devicePixelRatio)
    const width = cssWidth;
    const height = cssHeight;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    const barWidth = 2;
    const gap = 1;
    const totalBarWidth = barWidth + gap;
    const numBars = Math.floor(width / totalBarWidth);
    const centerY = height / 2;
    
    // Colors matching the terrain display
    const waveColor = "hsl(145, 45%, 55%)";
    const dimColor = "hsl(145, 25%, 25%)";
    
    if (data && data.length > 0) {
      // Draw waveform bars
      for (let i = 0; i < numBars; i++) {
        const dataIndex = Math.floor((i / numBars) * data.length);
        const amplitude = Math.abs(data[dataIndex] || 0);
        
        // Scale amplitude for visibility
        const maxBarHeight = (height / 2) * 0.9;
        const barHeight = Math.max(2, amplitude * maxBarHeight * 3);
        
        const x = i * totalBarWidth;
        ctx.fillStyle = waveColor;
        
        // Draw mirrored bar (top and bottom)
        ctx.beginPath();
        ctx.roundRect(x, centerY - barHeight, barWidth, barHeight, 1);
        ctx.roundRect(x, centerY, barWidth, barHeight, 1);
        ctx.fill();
      }
      
      // Draw center line
      ctx.strokeStyle = dimColor;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, centerY);
      ctx.lineTo(width, centerY);
      ctx.stroke();
    } else {
      // Draw idle state - subtle animated bars
      const time = Date.now() / 1000;
      for (let i = 0; i < numBars; i++) {
        const x = i * totalBarWidth;
        const phase = (i / numBars) * Math.PI * 4 + time * 0.5;
        const amplitude = Math.sin(phase) * 0.3 + 0.3;
        const barHeight = 4 + amplitude * 12;
        
        ctx.fillStyle = dimColor;
        ctx.beginPath();
        ctx.roundRect(x, centerY - barHeight, barWidth, barHeight, 1);
        ctx.roundRect(x, centerY, barWidth, barHeight, 1);
        ctx.fill();
      }
      
      // Center line
      ctx.strokeStyle = "hsl(145, 15%, 18%)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, centerY);
      ctx.lineTo(width, centerY);
      ctx.stroke();
    }
  }, []);
  
  // Redraw waveform when sample buffer changes
  useEffect(() => {
    const canvas = waveformCanvasRef.current;
    if (!canvas) return;
    
    // Set canvas size based on container
    const rect = canvas.getBoundingClientRect();
    const cssWidth = rect.width;
    const cssHeight = rect.height;
    canvas.width = cssWidth * window.devicePixelRatio;
    canvas.height = cssHeight * window.devicePixelRatio;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    }
    
    drawBarWaveform(canvas, sampleBuffer?.data || null, cssWidth, cssHeight);
  }, [sampleBuffer?.data, drawBarWaveform]);
  
  // Helper to convert Float32Array to WAV ArrayBuffer (defined before use)
  const audioBufferToWav = useCallback((samples: Float32Array, sampleRate: number): ArrayBuffer => {
    const numChannels = 1;
    const format = 1; // PCM
    const bitDepth = 16;
    const bytesPerSample = bitDepth / 8;
    const blockAlign = numChannels * bytesPerSample;
    const dataLength = samples.length * bytesPerSample;
    const bufferLength = 44 + dataLength;
    const arrayBuffer = new ArrayBuffer(bufferLength);
    const view = new DataView(arrayBuffer);
    
    const writeString = (offset: number, str: string) => {
      for (let i = 0; i < str.length; i++) {
        view.setUint8(offset + i, str.charCodeAt(i));
      }
    };
    
    writeString(0, 'RIFF');
    view.setUint32(4, bufferLength - 8, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, format, true);
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * blockAlign, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitDepth, true);
    writeString(36, 'data');
    view.setUint32(40, dataLength, true);
    
    let offset = 44;
    for (let i = 0; i < samples.length; i++) {
      const s = Math.max(-1, Math.min(1, samples[i]));
      view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
      offset += 2;
    }
    
    return arrayBuffer;
  }, []);
  
  
  // Simulate grain positions for visualization (updates periodically when enabled)
  useEffect(() => {
    if (!settings.enabled || !sampleBuffer?.data) {
      setGrainPositions([]);
      return;
    }
    
    const updateGrains = () => {
      const numGrains = Math.min(Math.floor(settings.densityGps / 8), 16);
      const positions: number[] = [];
      const scanStart = settings.scanStart;
      const scanWidth = settings.scanWidth;
      const jitterNorm = settings.posJitterMs / 80;
      
      for (let i = 0; i < numGrains; i++) {
        const basePos = scanStart + (i / numGrains) * scanWidth;
        const jitterAmount = (Math.random() - 0.5) * jitterNorm * scanWidth;
        const pos = Math.max(0, Math.min(1, basePos + jitterAmount));
        positions.push(pos);
      }
      setGrainPositions(positions);
    };
    
    updateGrains();
    const interval = setInterval(updateGrains, 80);
    return () => clearInterval(interval);
  }, [settings.enabled, settings.densityGps, settings.scanStart, settings.scanWidth, settings.posJitterMs, sampleBuffer?.data]);
  
  // Draw grain overlay on canvas
  useEffect(() => {
    const canvas = grainOverlayRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.parentElement?.getBoundingClientRect();
    const width = rect?.width || 280;
    const height = 64;
    
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.scale(dpr, dpr);
    
    ctx.clearRect(0, 0, width, height);
    
    if (!sampleBuffer?.data) {
      ctx.fillStyle = 'rgba(136, 136, 136, 0.9)';
      ctx.font = '600 13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('Drop sample or Capture', width / 2, height / 2);
      return;
    }
    
    // Draw scan region overlay
    const scanStartX = settings.scanStart * width;
    const scanEndX = (settings.scanStart + settings.scanWidth) * width;
    
    const regionGradient = ctx.createLinearGradient(scanStartX, 0, scanEndX, 0);
    regionGradient.addColorStop(0, 'rgba(144, 238, 144, 0.15)');
    regionGradient.addColorStop(0.5, 'rgba(144, 238, 144, 0.08)');
    regionGradient.addColorStop(1, 'rgba(144, 238, 144, 0.15)');
    ctx.fillStyle = regionGradient;
    ctx.fillRect(scanStartX, 0, scanEndX - scanStartX, height);
    
    // Draw grain visualization (Phaseplant-style: elegant glowing orbs)
    if (grainPositions.length > 0 && settings.enabled) {
      // Sort positions for consistent z-layering
      const sortedPositions = [...grainPositions].sort((a, b) => a - b);
      
      // Base size scales with grain size - keep them small and elegant
      const baseRadius = Math.max(4, Math.min(8, settings.grainSizeMs / 6));
      
      // Draw all grains with layered glow effect
      sortedPositions.forEach((pos, index) => {
        const x = pos * width;
        // Use a seeded pseudo-random for vertical position based on index
        const hash = ((index * 2654435761) >>> 0) % 1000 / 1000;
        const yVariation = (hash - 0.5) * (height * 0.6);
        const y = height / 2 + yVariation;
        
        // Size variation based on position hash
        const sizeVar = 0.7 + hash * 0.6;
        const radius = baseRadius * sizeVar;
        
        // Outer soft glow layer (large, very soft)
        ctx.save();
        const outerGlow = ctx.createRadialGradient(x, y, 0, x, y, radius * 4);
        outerGlow.addColorStop(0, 'rgba(80, 180, 255, 0.3)');
        outerGlow.addColorStop(0.4, 'rgba(60, 150, 230, 0.15)');
        outerGlow.addColorStop(1, 'rgba(40, 120, 200, 0)');
        ctx.fillStyle = outerGlow;
        ctx.beginPath();
        ctx.arc(x, y, radius * 4, 0, Math.PI * 2);
        ctx.fill();
        
        // Middle glow layer
        const midGlow = ctx.createRadialGradient(x, y, 0, x, y, radius * 2);
        midGlow.addColorStop(0, 'rgba(120, 200, 255, 0.6)');
        midGlow.addColorStop(0.5, 'rgba(80, 170, 240, 0.3)');
        midGlow.addColorStop(1, 'rgba(60, 140, 220, 0)');
        ctx.fillStyle = midGlow;
        ctx.beginPath();
        ctx.arc(x, y, radius * 2, 0, Math.PI * 2);
        ctx.fill();
        
        // Core orb with glass-like gradient
        const coreGradient = ctx.createRadialGradient(
          x - radius * 0.3, y - radius * 0.3, 0,
          x, y, radius
        );
        coreGradient.addColorStop(0, 'rgba(220, 245, 255, 1)');
        coreGradient.addColorStop(0.3, 'rgba(150, 210, 255, 0.95)');
        coreGradient.addColorStop(0.6, 'rgba(100, 180, 250, 0.9)');
        coreGradient.addColorStop(0.85, 'rgba(70, 150, 230, 0.85)');
        coreGradient.addColorStop(1, 'rgba(50, 120, 200, 0.7)');
        ctx.fillStyle = coreGradient;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
        
        // Highlight specular (glass effect)
        const specSize = radius * 0.35;
        const specX = x - radius * 0.35;
        const specY = y - radius * 0.35;
        const specGradient = ctx.createRadialGradient(specX, specY, 0, specX, specY, specSize);
        specGradient.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
        specGradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.4)');
        specGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = specGradient;
        ctx.beginPath();
        ctx.arc(specX, specY, specSize, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.restore();
      });
    }
    
    // Draw scan boundaries
    ctx.strokeStyle = 'rgba(144, 238, 144, 0.9)';
    ctx.lineWidth = 2;
    ctx.shadowColor = 'rgba(144, 238, 144, 0.5)';
    ctx.shadowBlur = 4;
    ctx.beginPath();
    ctx.moveTo(scanStartX, 0);
    ctx.lineTo(scanStartX, height);
    ctx.stroke();
    
    ctx.strokeStyle = 'rgba(144, 238, 144, 0.5)';
    ctx.lineWidth = 1;
    ctx.shadowBlur = 0;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(scanEndX, 0);
    ctx.lineTo(scanEndX, height);
    ctx.stroke();
    ctx.setLineDash([]);
    
  }, [sampleBuffer?.data, settings.scanStart, settings.scanWidth, settings.grainSizeMs, settings.enabled, grainPositions]);
  
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
          className={`relative border border-dashed rounded-lg overflow-hidden transition-all cursor-pointer ${
            isDragging ? 'border-primary bg-primary/10 shadow-lg shadow-primary/20' : 'border-muted-foreground/30 hover:border-muted-foreground/50'
          }`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => fileInputRef.current?.click()}
          data-testid="drop-zone-granular"
          style={{ background: 'linear-gradient(180deg, rgba(20,20,20,1) 0%, rgba(15,15,15,1) 100%)' }}
        >
          {/* Bar-style waveform canvas (matches main terrain display) */}
          <canvas
            ref={waveformCanvasRef}
            className="w-full h-16"
            style={{ opacity: 1 }}
          />
          {/* Grain overlay canvas */}
          <canvas
            ref={grainOverlayRef}
            className="absolute inset-0 w-full h-16 pointer-events-none"
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
            <>
              <Button
                size="sm"
                variant={isPlaying ? "default" : "ghost"}
                className={`h-5 px-1 ${isPlaying ? 'bg-primary/80' : ''}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onTogglePlayback?.();
                }}
                disabled={!settings.enabled}
                data-testid="button-granular-play"
              >
                {isPlaying ? <Square className="w-3 h-3" /> : <Play className="w-3 h-3" />}
              </Button>
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
            </>
          )}
        </div>
        
        {sampleBuffer && (
          <div className="text-[9px] text-muted-foreground truncate">
            {sampleBuffer.name} ({sampleBuffer.duration.toFixed(2)}s) {isPlaying && '▶'}
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
