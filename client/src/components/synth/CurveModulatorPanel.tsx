import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { 
  type CurveModulatorSettings, 
  type CurvePoint,
  interpolateCurve,
  randomizeCurveModulatorSettings,
} from "@/lib/curveModulatorSettings";
import { useRef, useEffect, useState, useCallback } from "react";
import { Shuffle, RotateCcw, Plus, Minus } from "lucide-react";

interface CurveModulatorPanelProps {
  settings: CurveModulatorSettings;
  onChange: (settings: CurveModulatorSettings) => void;
}

export function CurveModulatorPanel({ settings, onChange }: CurveModulatorPanelProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [selectedPoint, setSelectedPoint] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const drawCurve = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    
    const width = canvas.width;
    const height = canvas.height;
    const padding = 10;
    
    ctx.fillStyle = "hsl(140, 10%, 12%)";
    ctx.fillRect(0, 0, width, height);
    
    ctx.strokeStyle = "hsl(140, 20%, 25%)";
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = padding + (height - 2 * padding) * (i / 4);
      ctx.beginPath();
      ctx.moveTo(padding, y);
      ctx.lineTo(width - padding, y);
      ctx.stroke();
    }
    for (let i = 0; i <= 4; i++) {
      const x = padding + (width - 2 * padding) * (i / 4);
      ctx.beginPath();
      ctx.moveTo(x, padding);
      ctx.lineTo(x, height - padding);
      ctx.stroke();
    }
    
    ctx.strokeStyle = "hsl(140, 60%, 50%)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    
    const steps = 100;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const value = interpolateCurve(settings.points, t, settings.smoothing);
      const x = padding + t * (width - 2 * padding);
      const y = height - padding - value * (height - 2 * padding);
      
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.stroke();
    
    settings.points.forEach((point, index) => {
      const x = padding + point.x * (width - 2 * padding);
      const y = height - padding - point.y * (height - 2 * padding);
      
      ctx.fillStyle = selectedPoint === index 
        ? "hsl(140, 80%, 70%)" 
        : "hsl(140, 60%, 50%)";
      ctx.beginPath();
      ctx.arc(x, y, 6, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.strokeStyle = "hsl(140, 10%, 10%)";
      ctx.lineWidth = 2;
      ctx.stroke();
    });
  }, [settings, selectedPoint]);

  useEffect(() => {
    drawCurve();
  }, [drawCurve]);

  const getCanvasPoint = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const padding = 10;
    
    const x = ((e.clientX - rect.left) * scaleX - padding) / (canvas.width - 2 * padding);
    const y = 1 - ((e.clientY - rect.top) * scaleY - padding) / (canvas.height - 2 * padding);
    
    return { x: Math.max(0, Math.min(1, x)), y: Math.max(0, Math.min(1, y)) };
  };

  const findNearestPoint = (pos: { x: number; y: number }) => {
    const canvas = canvasRef.current;
    if (!canvas) return -1;
    
    const threshold = 15 / canvas.width;
    let nearestIndex = -1;
    let nearestDist = threshold;
    
    settings.points.forEach((point, index) => {
      const dist = Math.sqrt(
        Math.pow(point.x - pos.x, 2) + Math.pow(point.y - pos.y, 2)
      );
      if (dist < nearestDist) {
        nearestDist = dist;
        nearestIndex = index;
      }
    });
    
    return nearestIndex;
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const pos = getCanvasPoint(e);
    if (!pos) return;
    
    const nearestIndex = findNearestPoint(pos);
    
    if (nearestIndex >= 0) {
      setSelectedPoint(nearestIndex);
      setIsDragging(true);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging || selectedPoint === null) return;
    
    const pos = getCanvasPoint(e);
    if (!pos) return;
    
    const newPoints = [...settings.points];
    const isEndpoint = selectedPoint === 0 || selectedPoint === settings.points.length - 1;
    
    newPoints[selectedPoint] = {
      x: isEndpoint ? newPoints[selectedPoint].x : pos.x,
      y: pos.y,
    };
    
    onChange({ ...settings, points: newPoints });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleDoubleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const pos = getCanvasPoint(e);
    if (!pos) return;
    
    const nearestIndex = findNearestPoint(pos);
    
    if (nearestIndex >= 0 && nearestIndex !== 0 && nearestIndex !== settings.points.length - 1) {
      const newPoints = settings.points.filter((_, i) => i !== nearestIndex);
      onChange({ ...settings, points: newPoints });
      setSelectedPoint(null);
    } else if (nearestIndex < 0 && settings.points.length < 10) {
      const newPoints = [...settings.points, { x: pos.x, y: pos.y }];
      newPoints.sort((a, b) => a.x - b.x);
      onChange({ ...settings, points: newPoints });
    }
  };

  const addPoint = () => {
    if (settings.points.length >= 10) return;
    
    const sortedPoints = [...settings.points].sort((a, b) => a.x - b.x);
    let maxGap = 0;
    let insertX = 0.5;
    
    for (let i = 0; i < sortedPoints.length - 1; i++) {
      const gap = sortedPoints[i + 1].x - sortedPoints[i].x;
      if (gap > maxGap) {
        maxGap = gap;
        insertX = (sortedPoints[i].x + sortedPoints[i + 1].x) / 2;
      }
    }
    
    const insertY = interpolateCurve(settings.points, insertX, settings.smoothing);
    const newPoints = [...settings.points, { x: insertX, y: insertY }];
    newPoints.sort((a, b) => a.x - b.x);
    onChange({ ...settings, points: newPoints });
  };

  const removePoint = () => {
    if (settings.points.length <= 2) return;
    if (selectedPoint === null || selectedPoint === 0 || selectedPoint === settings.points.length - 1) return;
    
    const newPoints = settings.points.filter((_, i) => i !== selectedPoint);
    onChange({ ...settings, points: newPoints });
    setSelectedPoint(null);
  };

  const resetCurve = () => {
    onChange({
      ...settings,
      points: [
        { x: 0, y: 0 },
        { x: 0.25, y: 1 },
        { x: 0.5, y: 0.5 },
        { x: 0.75, y: 0.8 },
        { x: 1, y: 0 },
      ],
    });
    setSelectedPoint(null);
  };

  const randomize = () => {
    onChange(randomizeCurveModulatorSettings());
    setSelectedPoint(null);
  };

  return (
    <Card className="bg-card/50 border-primary/20" data-testid="curve-modulator-panel">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-sm font-medium text-primary">Curve Modulator</CardTitle>
          <Switch
            checked={settings.enabled}
            onCheckedChange={(enabled) => onChange({ ...settings, enabled })}
            data-testid="curve-modulator-enabled"
          />
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="relative">
          <canvas
            ref={canvasRef}
            width={280}
            height={120}
            className="w-full rounded-md border border-primary/20 cursor-crosshair"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onDoubleClick={handleDoubleClick}
            data-testid="curve-modulator-canvas"
          />
          <div className="absolute top-1 right-1 flex gap-1">
            <Button
              size="icon"
              variant="ghost"
              className="h-6 w-6"
              onClick={addPoint}
              disabled={settings.points.length >= 10}
              data-testid="curve-add-point"
            >
              <Plus className="w-3 h-3" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-6 w-6"
              onClick={removePoint}
              disabled={selectedPoint === null || selectedPoint === 0 || selectedPoint === settings.points.length - 1}
              data-testid="curve-remove-point"
            >
              <Minus className="w-3 h-3" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-6 w-6"
              onClick={resetCurve}
              data-testid="curve-reset"
            >
              <RotateCcw className="w-3 h-3" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-6 w-6"
              onClick={randomize}
              data-testid="curve-randomize"
            >
              <Shuffle className="w-3 h-3" />
            </Button>
          </div>
        </div>
        
        <div className="text-xs text-muted-foreground text-center">
          Double-click to add/remove points. Drag to move.
        </div>
        
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">Duration: {settings.duration.toFixed(2)}s</Label>
            <Slider
              value={[settings.duration]}
              min={0.01}
              max={5}
              step={0.01}
              onValueChange={([v]) => onChange({ ...settings, duration: v })}
              data-testid="curve-duration"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Smoothing: {Math.round(settings.smoothing * 100)}%</Label>
            <Slider
              value={[settings.smoothing]}
              min={0}
              max={1}
              step={0.01}
              onValueChange={([v]) => onChange({ ...settings, smoothing: v })}
              data-testid="curve-smoothing"
            />
          </div>
        </div>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Switch
              checked={settings.loop}
              onCheckedChange={(loop) => onChange({ ...settings, loop })}
              data-testid="curve-loop"
            />
            <Label className="text-xs">Loop</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              checked={settings.bipolar}
              onCheckedChange={(bipolar) => onChange({ ...settings, bipolar })}
              data-testid="curve-bipolar"
            />
            <Label className="text-xs">Bipolar</Label>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
