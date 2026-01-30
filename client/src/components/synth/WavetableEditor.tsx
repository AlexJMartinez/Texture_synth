import { useState, useRef, useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { 
  Pencil, Eraser, Waves, ChevronLeft, ChevronRight, 
  RotateCcw, Copy, Trash2, Plus, Download, Upload,
  Grid3x3
} from "lucide-react";
import type { WavetableData } from "@/lib/wavetableSettings";
import { getWavetableById } from "@/lib/factoryWavetables";

interface WavetableEditorProps {
  open: boolean;
  onClose: () => void;
  wavetableId: string;
  onSave: (wavetable: WavetableData) => void;
  onImport?: (file: File) => void;
}

type DrawTool = "pencil" | "line" | "smooth" | "eraser";

const SAMPLES_PER_FRAME = 256;
const LOGICAL_WIDTH = 512;
const LOGICAL_HEIGHT = 256;

export function WavetableEditor({
  open,
  onClose,
  wavetableId,
  onSave,
  onImport,
}: WavetableEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [frames, setFrames] = useState<Float32Array[]>([]);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [tool, setTool] = useState<DrawTool>("pencil");
  const [isDrawing, setIsDrawing] = useState(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);
  const [showGrid, setShowGrid] = useState(true);
  const [wavetableName, setWavetableName] = useState("Custom Wavetable");
  const [undoStack, setUndoStack] = useState<Float32Array[][]>([]);
  const [editingWavetableId, setEditingWavetableId] = useState<string | null>(null);
  
  useEffect(() => {
    if (open && wavetableId) {
      const wt = getWavetableById(wavetableId);
      if (wt) {
        setFrames(wt.frames.map(f => new Float32Array(f)));
        // If editing a non-factory wavetable, keep the same ID to allow updates
        if (!wt.isFactory) {
          setEditingWavetableId(wavetableId);
          setWavetableName(wt.name);
        } else {
          setEditingWavetableId(null);
          setWavetableName(wt.name + " (edited)");
        }
        setCurrentFrame(0);
        setUndoStack([]);
      } else {
        const defaultFrame = new Float32Array(SAMPLES_PER_FRAME);
        for (let i = 0; i < SAMPLES_PER_FRAME; i++) {
          defaultFrame[i] = Math.sin((i / SAMPLES_PER_FRAME) * Math.PI * 2);
        }
        setFrames([defaultFrame]);
        setEditingWavetableId(null);
        setWavetableName("Custom Wavetable");
        setCurrentFrame(0);
        setUndoStack([]);
      }
    }
  }, [open, wavetableId]);
  
  // Track canvas size to avoid unnecessary resizing
  const canvasSizeRef = useRef({ width: 0, height: 0 });
  
  const setupCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return false;
    
    const dpr = window.devicePixelRatio || 1;
    const rect = container.getBoundingClientRect();
    const displayWidth = Math.floor(rect.width);
    const displayHeight = Math.floor(rect.height);
    
    // Only resize if dimensions actually changed (with tolerance for rounding)
    if (Math.abs(canvasSizeRef.current.width - displayWidth) > 1 || 
        Math.abs(canvasSizeRef.current.height - displayHeight) > 1) {
      canvasSizeRef.current = { width: displayWidth, height: displayHeight };
      canvas.width = displayWidth * dpr;
      canvas.height = displayHeight * dpr;
      return true;
    }
    return false;
  }, []);
  
  const drawWaveform = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container || frames.length === 0) return;
    
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    
    // Setup canvas size if needed
    setupCanvas();
    
    const dpr = window.devicePixelRatio || 1;
    const width = canvasSizeRef.current.width || LOGICAL_WIDTH;
    const height = canvasSizeRef.current.height || LOGICAL_HEIGHT;
    
    // Reset transform and scale for high DPI
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    
    const frame = frames[currentFrame];
    if (!frame) return;
    
    ctx.fillStyle = "#0a0a0a";
    ctx.fillRect(0, 0, width, height);
    
    if (showGrid) {
      ctx.strokeStyle = "#1a1a1a";
      ctx.lineWidth = 1;
      
      for (let i = 0; i <= 8; i++) {
        const x = (i / 8) * width;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      
      for (let i = 0; i <= 4; i++) {
        const y = (i / 4) * height;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }
      
      ctx.strokeStyle = "#2a2a2a";
      ctx.beginPath();
      ctx.moveTo(0, height / 2);
      ctx.lineTo(width, height / 2);
      ctx.stroke();
    }
    
    // Draw waveform with anti-aliasing for smooth appearance
    ctx.strokeStyle = "#4ade80";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    
    for (let i = 0; i < frame.length; i++) {
      const x = (i / (frame.length - 1)) * width;
      const y = ((1 - frame[i]) / 2) * height;
      
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    
    ctx.stroke();
    
    // Fill under the curve
    ctx.fillStyle = "rgba(74, 222, 128, 0.1)";
    ctx.beginPath();
    ctx.moveTo(0, height / 2);
    for (let i = 0; i < frame.length; i++) {
      const x = (i / (frame.length - 1)) * width;
      const y = ((1 - frame[i]) / 2) * height;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(width, height / 2);
    ctx.closePath();
    ctx.fill();
  }, [frames, currentFrame, showGrid, setupCanvas]);
  
  useEffect(() => {
    drawWaveform();
  }, [drawWaveform]);
  
  // Handle initial setup when dialog opens
  useEffect(() => {
    if (!open) return;
    
    // Reset size tracking when dialog opens
    canvasSizeRef.current = { width: 0, height: 0 };
    
    // Initial draw after dialog animation settles
    const timer = setTimeout(() => {
      setupCanvas();
      drawWaveform();
    }, 150);
    
    return () => clearTimeout(timer);
  }, [open, setupCanvas, drawWaveform]);
  
  const saveUndoState = useCallback(() => {
    setUndoStack(prev => [...prev.slice(-20), frames.map(f => new Float32Array(f))]);
  }, [frames]);
  
  const undo = useCallback(() => {
    if (undoStack.length === 0) return;
    const lastState = undoStack[undoStack.length - 1];
    setUndoStack(prev => prev.slice(0, -1));
    setFrames(lastState);
  }, [undoStack]);
  
  const getCanvasPointFromPointer = useCallback((e: React.PointerEvent<HTMLCanvasElement>): { x: number; y: number } | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    
    const rect = canvas.getBoundingClientRect();
    // Normalize to 0-1 range based on canvas display size
    const normalizedX = (e.clientX - rect.left) / rect.width;
    const normalizedY = (e.clientY - rect.top) / rect.height;
    
    // Use logical dimensions for drawing coordinates
    const x = normalizedX * LOGICAL_WIDTH;
    const y = normalizedY * LOGICAL_HEIGHT;
    
    return { 
      x: Math.max(0, Math.min(LOGICAL_WIDTH, x)), 
      y: Math.max(0, Math.min(LOGICAL_HEIGHT, y)) 
    };
  }, []);
  
  const drawAtPoint = useCallback((x: number, y: number, prevX?: number, prevY?: number) => {
    const sampleIndex = Math.min(SAMPLES_PER_FRAME - 1, Math.floor((x / LOGICAL_WIDTH) * SAMPLES_PER_FRAME));
    const value = 1 - (y / LOGICAL_HEIGHT) * 2;
    
    setFrames(prevFrames => {
      if (prevFrames.length === 0) return prevFrames;
      
      const frame = new Float32Array(prevFrames[currentFrame]);
      
      if (tool === "pencil" || tool === "line") {
        if (prevX !== undefined && prevY !== undefined) {
          const prevSampleIndex = Math.min(SAMPLES_PER_FRAME - 1, Math.floor((prevX / LOGICAL_WIDTH) * SAMPLES_PER_FRAME));
          const prevValue = 1 - (prevY / LOGICAL_HEIGHT) * 2;
          
          const startIdx = Math.min(sampleIndex, prevSampleIndex);
          const endIdx = Math.max(sampleIndex, prevSampleIndex);
          
          for (let i = startIdx; i <= endIdx; i++) {
            const t = endIdx === startIdx ? 0 : (i - startIdx) / (endIdx - startIdx);
            const interpolatedValue = prevValue + (value - prevValue) * t;
            frame[i] = Math.max(-1, Math.min(1, interpolatedValue));
          }
        } else {
          frame[sampleIndex] = Math.max(-1, Math.min(1, value));
        }
      } else if (tool === "eraser") {
        const brushSize = 5;
        for (let i = Math.max(0, sampleIndex - brushSize); i <= Math.min(SAMPLES_PER_FRAME - 1, sampleIndex + brushSize); i++) {
          frame[i] = 0;
        }
      } else if (tool === "smooth") {
        const brushSize = 3;
        const originalFrame = new Float32Array(frame);
        for (let i = Math.max(1, sampleIndex - brushSize); i <= Math.min(SAMPLES_PER_FRAME - 2, sampleIndex + brushSize); i++) {
          frame[i] = (originalFrame[i - 1] + originalFrame[i] + originalFrame[i + 1]) / 3;
        }
      }
      
      const newFrames = [...prevFrames];
      newFrames[currentFrame] = frame;
      return newFrames;
    });
  }, [currentFrame, tool]);
  
  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    saveUndoState();
    setIsDrawing(true);
    const point = getCanvasPointFromPointer(e);
    if (point) {
      lastPointRef.current = point;
      drawAtPoint(point.x, point.y);
    }
  }, [drawAtPoint, saveUndoState, getCanvasPointFromPointer]);
  
  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    e.preventDefault();
    const point = getCanvasPointFromPointer(e);
    const lastPoint = lastPointRef.current;
    if (point && lastPoint) {
      drawAtPoint(point.x, point.y, lastPoint.x, lastPoint.y);
      lastPointRef.current = point;
    }
  }, [isDrawing, getCanvasPointFromPointer, drawAtPoint]);
  
  const handlePointerUp = useCallback(() => {
    setIsDrawing(false);
    lastPointRef.current = null;
  }, []);
  
  const addFrame = useCallback(() => {
    const newFrame = new Float32Array(SAMPLES_PER_FRAME);
    for (let i = 0; i < SAMPLES_PER_FRAME; i++) {
      newFrame[i] = Math.sin((i / SAMPLES_PER_FRAME) * Math.PI * 2);
    }
    setFrames(prev => {
      setCurrentFrame(prev.length);
      return [...prev, newFrame];
    });
  }, []);
  
  const duplicateFrame = useCallback(() => {
    setFrames(prev => {
      if (prev.length === 0) return prev;
      const copy = new Float32Array(prev[currentFrame]);
      const newFrames = [...prev];
      newFrames.splice(currentFrame + 1, 0, copy);
      setCurrentFrame(currentFrame + 1);
      return newFrames;
    });
  }, [currentFrame]);
  
  const deleteFrame = useCallback(() => {
    setFrames(prev => {
      if (prev.length <= 1) return prev;
      const newFrames = prev.filter((_, i) => i !== currentFrame);
      setCurrentFrame(Math.min(currentFrame, newFrames.length - 1));
      return newFrames;
    });
  }, [currentFrame]);
  
  const resetFrame = useCallback(() => {
    saveUndoState();
    const newFrame = new Float32Array(SAMPLES_PER_FRAME);
    for (let i = 0; i < SAMPLES_PER_FRAME; i++) {
      newFrame[i] = Math.sin((i / SAMPLES_PER_FRAME) * Math.PI * 2);
    }
    const newFrames = [...frames];
    newFrames[currentFrame] = newFrame;
    setFrames(newFrames);
  }, [frames, currentFrame, saveUndoState]);
  
  const handleSave = useCallback(() => {
    const wavetable: WavetableData = {
      id: editingWavetableId || `user_${Date.now()}`,
      name: wavetableName,
      category: "user",
      frameSize: SAMPLES_PER_FRAME as 256,
      frameCount: frames.length,
      frames: frames,
      isFactory: false,
      createdAt: editingWavetableId ? undefined : Date.now(),
    };
    onSave(wavetable);
    onClose();
  }, [frames, wavetableName, onSave, onClose, editingWavetableId]);
  
  const handleFileImport = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const arrayBuffer = event.target?.result as ArrayBuffer;
        const audioContext = new AudioContext();
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
        
        const channelData = audioBuffer.getChannelData(0);
        const numFrames = Math.min(64, Math.floor(channelData.length / SAMPLES_PER_FRAME));
        
        const importedFrames: Float32Array[] = [];
        for (let f = 0; f < numFrames; f++) {
          const frame = new Float32Array(SAMPLES_PER_FRAME);
          const startSample = f * SAMPLES_PER_FRAME;
          
          for (let i = 0; i < SAMPLES_PER_FRAME; i++) {
            frame[i] = channelData[startSample + i] || 0;
          }
          
          let maxAbs = 0;
          for (let i = 0; i < frame.length; i++) {
            maxAbs = Math.max(maxAbs, Math.abs(frame[i]));
          }
          if (maxAbs > 0) {
            for (let i = 0; i < frame.length; i++) {
              frame[i] /= maxAbs;
            }
          }
          
          importedFrames.push(frame);
        }
        
        if (importedFrames.length > 0) {
          setFrames(importedFrames);
          setCurrentFrame(0);
          setWavetableName(file.name.replace(/\.[^/.]+$/, ""));
        }
        
        audioContext.close();
      } catch (err) {
        console.error("Failed to import wavetable:", err);
      }
    };
    reader.readAsArrayBuffer(file);
    
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, []);
  
  const exportWavetable = useCallback(() => {
    if (frames.length === 0) return;
    
    const totalSamples = frames.length * SAMPLES_PER_FRAME;
    const sampleRate = 44100;
    const audioContext = new OfflineAudioContext(1, totalSamples, sampleRate);
    const buffer = audioContext.createBuffer(1, totalSamples, sampleRate);
    const channelData = buffer.getChannelData(0);
    
    for (let f = 0; f < frames.length; f++) {
      for (let i = 0; i < SAMPLES_PER_FRAME; i++) {
        channelData[f * SAMPLES_PER_FRAME + i] = frames[f][i];
      }
    }
    
    const wavBlob = audioBufferToWav(buffer);
    const url = URL.createObjectURL(wavBlob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${wavetableName.replace(/[^a-z0-9]/gi, "_")}.wav`;
    a.click();
    URL.revokeObjectURL(url);
  }, [frames, wavetableName]);
  
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-[95vw] md:max-w-2xl max-h-[90vh] overflow-y-auto p-3 md:p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-sm md:text-base">
            <Waves className="w-4 h-4 text-green-400" />
            Wavetable Editor
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="text"
              value={wavetableName}
              onChange={(e) => setWavetableName(e.target.value)}
              className="flex-1 min-w-[120px] h-8 px-2 text-xs bg-background border border-border rounded"
              placeholder="Wavetable name"
              data-testid="input-wavetable-name"
            />
            <input
              type="file"
              ref={fileInputRef}
              accept=".wav,audio/wav"
              onChange={handleFileImport}
              className="hidden"
              data-testid="input-wavetable-file"
            />
            <Button
              size="sm"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              className="h-8 text-xs gap-1"
              data-testid="btn-import-wav"
            >
              <Upload className="w-3 h-3" />
              <span className="hidden sm:inline">Import</span>
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={exportWavetable}
              className="h-8 text-xs gap-1"
              data-testid="btn-export-wav"
            >
              <Download className="w-3 h-3" />
              <span className="hidden sm:inline">Export</span>
            </Button>
          </div>
          
          <div className="flex flex-wrap gap-1">
            {(["pencil", "line", "smooth", "eraser"] as DrawTool[]).map((t) => (
              <Button
                key={t}
                size="sm"
                variant={tool === t ? "default" : "outline"}
                onClick={() => setTool(t)}
                className="h-8 px-2 text-xs gap-1"
                data-testid={`btn-tool-${t}`}
              >
                {t === "pencil" && <Pencil className="w-3 h-3" />}
                {t === "line" && <span className="w-3 h-3 border-t-2 border-current" />}
                {t === "smooth" && <Waves className="w-3 h-3" />}
                {t === "eraser" && <Eraser className="w-3 h-3" />}
                <span className="hidden sm:inline capitalize">{t}</span>
              </Button>
            ))}
            <div className="flex-1" />
            <Button
              size="sm"
              variant={showGrid ? "default" : "outline"}
              onClick={() => setShowGrid(!showGrid)}
              className="h-8 px-2"
              data-testid="btn-toggle-grid"
            >
              <Grid3x3 className="w-3 h-3" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={undo}
              disabled={undoStack.length === 0}
              className="h-8 px-2"
              data-testid="btn-undo"
            >
              <RotateCcw className="w-3 h-3" />
            </Button>
          </div>
          
          <div 
            ref={containerRef}
            className="relative border border-border rounded-lg overflow-hidden bg-black select-none"
            style={{ aspectRatio: "2/1", touchAction: "none" }}
            onTouchStart={(e) => e.preventDefault()}
          >
            <canvas
              ref={canvasRef}
              className="w-full h-full block"
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerLeave={handlePointerUp}
              onPointerCancel={handlePointerUp}
              onTouchStart={(e) => e.preventDefault()}
              style={{ touchAction: "none", userSelect: "none" }}
              data-testid="canvas-wavetable-editor"
            />
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setCurrentFrame(Math.max(0, currentFrame - 1))}
              disabled={currentFrame === 0}
              className="h-8 px-2"
              data-testid="btn-prev-frame"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            
            <div className="flex-1 text-center text-xs">
              Frame {currentFrame + 1} / {frames.length}
            </div>
            
            <Button
              size="sm"
              variant="outline"
              onClick={() => setCurrentFrame(Math.min(frames.length - 1, currentFrame + 1))}
              disabled={currentFrame >= frames.length - 1}
              className="h-8 px-2"
              data-testid="btn-next-frame"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
          
          {frames.length > 1 && (
            <div className="px-2">
              <Slider
                value={[currentFrame]}
                min={0}
                max={frames.length - 1}
                step={1}
                onValueChange={([v]) => setCurrentFrame(v)}
                className="w-full"
                data-testid="slider-frame-position"
              />
            </div>
          )}
          
          <div className="flex flex-wrap gap-1">
            <Button
              size="sm"
              variant="outline"
              onClick={addFrame}
              className="h-8 text-xs gap-1"
              data-testid="btn-add-frame"
            >
              <Plus className="w-3 h-3" />
              Add Frame
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={duplicateFrame}
              className="h-8 text-xs gap-1"
              data-testid="btn-duplicate-frame"
            >
              <Copy className="w-3 h-3" />
              Duplicate
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={resetFrame}
              className="h-8 text-xs gap-1"
              data-testid="btn-reset-frame"
            >
              <RotateCcw className="w-3 h-3" />
              Reset
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={deleteFrame}
              disabled={frames.length <= 1}
              className="h-8 text-xs gap-1"
              data-testid="btn-delete-frame"
            >
              <Trash2 className="w-3 h-3" />
              Delete
            </Button>
          </div>
          
          <div className="flex justify-end gap-2 pt-2 border-t border-border">
            <Button
              variant="outline"
              onClick={onClose}
              className="h-9"
              data-testid="btn-cancel-wavetable"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              className="h-9"
              data-testid="btn-save-wavetable"
            >
              Save Wavetable
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function audioBufferToWav(buffer: AudioBuffer): Blob {
  const numChannels = 1;
  const sampleRate = buffer.sampleRate;
  const format = 1;
  const bitDepth = 16;
  
  const bytesPerSample = bitDepth / 8;
  const blockAlign = numChannels * bytesPerSample;
  
  const data = buffer.getChannelData(0);
  const dataLength = data.length * bytesPerSample;
  const bufferLength = 44 + dataLength;
  
  const arrayBuffer = new ArrayBuffer(bufferLength);
  const view = new DataView(arrayBuffer);
  
  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };
  
  writeString(0, "RIFF");
  view.setUint32(4, bufferLength - 8, true);
  writeString(8, "WAVE");
  writeString(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, format, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitDepth, true);
  writeString(36, "data");
  view.setUint32(40, dataLength, true);
  
  let offset = 44;
  for (let i = 0; i < data.length; i++) {
    const sample = Math.max(-1, Math.min(1, data[i]));
    const intSample = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
    view.setInt16(offset, intSample, true);
    offset += 2;
  }
  
  return new Blob([arrayBuffer], { type: "audio/wav" });
}
