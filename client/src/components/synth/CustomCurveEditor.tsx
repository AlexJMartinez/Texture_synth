import { useRef, useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { RotateCcw, Plus, Minus } from "lucide-react";

export interface CurvePoint {
  x: number;
  y: number;
}

interface CustomCurveEditorProps {
  points: CurvePoint[];
  onChange: (points: CurvePoint[]) => void;
  width?: number;
  height?: number;
  className?: string;
}

function catmullRomSpline(p0: CurvePoint, p1: CurvePoint, p2: CurvePoint, p3: CurvePoint, t: number): CurvePoint {
  const t2 = t * t;
  const t3 = t2 * t;
  
  return {
    x: 0.5 * ((2 * p1.x) + (-p0.x + p2.x) * t + (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 + (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3),
    y: 0.5 * ((2 * p1.y) + (-p0.y + p2.y) * t + (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 + (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3)
  };
}

function generateCurvePoints(controlPoints: CurvePoint[], resolution: number = 100): CurvePoint[] {
  if (controlPoints.length < 2) return controlPoints;
  
  const result: CurvePoint[] = [];
  const sorted = [...controlPoints].sort((a, b) => a.x - b.x);
  
  for (let i = 0; i < sorted.length - 1; i++) {
    const p0 = sorted[Math.max(0, i - 1)];
    const p1 = sorted[i];
    const p2 = sorted[i + 1];
    const p3 = sorted[Math.min(sorted.length - 1, i + 2)];
    
    const segments = Math.ceil(resolution / (sorted.length - 1));
    for (let j = 0; j < segments; j++) {
      const t = j / segments;
      result.push(catmullRomSpline(p0, p1, p2, p3, t));
    }
  }
  
  result.push(sorted[sorted.length - 1]);
  return result;
}

const DEFAULT_POINTS: CurvePoint[] = [
  { x: 0, y: 0 },
  { x: 0.25, y: 0.25 },
  { x: 0.5, y: 0.5 },
  { x: 0.75, y: 0.75 },
  { x: 1, y: 1 }
];

export function CustomCurveEditor({ 
  points, 
  onChange, 
  width = 200, 
  height = 150,
  className = ""
}: CustomCurveEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  
  const padding = 8;
  const pointRadius = 6;
  
  const toCanvasX = useCallback((x: number) => padding + x * (width - 2 * padding), [width]);
  const toCanvasY = useCallback((y: number) => height - padding - y * (height - 2 * padding), [height]);
  const fromCanvasX = useCallback((cx: number) => Math.max(0, Math.min(1, (cx - padding) / (width - 2 * padding))), [width]);
  const fromCanvasY = useCallback((cy: number) => Math.max(0, Math.min(1, (height - padding - cy) / (height - 2 * padding))), [height]);
  
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    
    ctx.clearRect(0, 0, width, height);
    
    ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
    ctx.fillRect(0, 0, width, height);
    
    ctx.strokeStyle = "rgba(120, 180, 140, 0.2)";
    ctx.lineWidth = 1;
    
    for (let i = 0; i <= 4; i++) {
      const x = padding + (i / 4) * (width - 2 * padding);
      ctx.beginPath();
      ctx.moveTo(x, padding);
      ctx.lineTo(x, height - padding);
      ctx.stroke();
    }
    
    for (let i = 0; i <= 4; i++) {
      const y = padding + (i / 4) * (height - 2 * padding);
      ctx.beginPath();
      ctx.moveTo(padding, y);
      ctx.lineTo(width - padding, y);
      ctx.stroke();
    }
    
    ctx.strokeStyle = "rgba(120, 180, 140, 0.4)";
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(padding, height - padding);
    ctx.lineTo(width - padding, padding);
    ctx.stroke();
    ctx.setLineDash([]);
    
    const curvePoints = generateCurvePoints(points, 100);
    
    ctx.strokeStyle = "#78B48C";
    ctx.lineWidth = 2;
    ctx.beginPath();
    
    if (curvePoints.length > 0) {
      ctx.moveTo(toCanvasX(curvePoints[0].x), toCanvasY(curvePoints[0].y));
      for (let i = 1; i < curvePoints.length; i++) {
        ctx.lineTo(toCanvasX(curvePoints[i].x), toCanvasY(curvePoints[i].y));
      }
    }
    ctx.stroke();
    
    points.forEach((point, index) => {
      const cx = toCanvasX(point.x);
      const cy = toCanvasY(point.y);
      
      const isEndpoint = index === 0 || index === points.length - 1;
      const isHovered = hoveredIndex === index;
      const isDragging = draggingIndex === index;
      
      ctx.beginPath();
      ctx.arc(cx, cy, pointRadius + (isHovered || isDragging ? 2 : 0), 0, Math.PI * 2);
      
      if (isEndpoint) {
        ctx.fillStyle = isDragging ? "#A0D4B0" : isHovered ? "#90C4A0" : "#4A8A5A";
      } else {
        ctx.fillStyle = isDragging ? "#B0E4C0" : isHovered ? "#A0D4B0" : "#78B48C";
      }
      ctx.fill();
      
      ctx.strokeStyle = "#2A4A3A";
      ctx.lineWidth = 2;
      ctx.stroke();
    });
  }, [points, width, height, hoveredIndex, draggingIndex, toCanvasX, toCanvasY]);
  
  useEffect(() => {
    draw();
  }, [draw]);
  
  const getPointAtPosition = useCallback((clientX: number, clientY: number): number | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    
    const rect = canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    
    for (let i = 0; i < points.length; i++) {
      const px = toCanvasX(points[i].x);
      const py = toCanvasY(points[i].y);
      const dist = Math.sqrt((x - px) ** 2 + (y - py) ** 2);
      if (dist <= pointRadius + 4) {
        return i;
      }
    }
    return null;
  }, [points, toCanvasX, toCanvasY]);
  
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    const index = getPointAtPosition(e.clientX, e.clientY);
    if (index !== null) {
      setDraggingIndex(index);
    }
  }, [getPointAtPosition]);
  
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    if (draggingIndex !== null) {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      const newX = fromCanvasX(x);
      const newY = fromCanvasY(y);
      
      const newPoints = [...points];
      const isEndpoint = draggingIndex === 0 || draggingIndex === points.length - 1;
      
      if (isEndpoint) {
        newPoints[draggingIndex] = { 
          x: draggingIndex === 0 ? 0 : 1, 
          y: newY 
        };
      } else {
        const sorted = [...points].sort((a, b) => a.x - b.x);
        const sortedIndex = sorted.findIndex(p => p === points[draggingIndex]);
        const minX = sortedIndex > 0 ? sorted[sortedIndex - 1].x + 0.02 : 0.02;
        const maxX = sortedIndex < sorted.length - 1 ? sorted[sortedIndex + 1].x - 0.02 : 0.98;
        
        newPoints[draggingIndex] = { 
          x: Math.max(minX, Math.min(maxX, newX)),
          y: newY 
        };
      }
      
      onChange(newPoints);
    } else {
      const index = getPointAtPosition(e.clientX, e.clientY);
      setHoveredIndex(index);
    }
  }, [draggingIndex, points, onChange, fromCanvasX, fromCanvasY, getPointAtPosition]);
  
  const handleMouseUp = useCallback(() => {
    setDraggingIndex(null);
  }, []);
  
  const handleMouseLeave = useCallback(() => {
    setDraggingIndex(null);
    setHoveredIndex(null);
  }, []);
  
  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const index = getPointAtPosition(e.clientX, e.clientY);
    
    if (index !== null) {
      if (index !== 0 && index !== points.length - 1 && points.length > 2) {
        const newPoints = points.filter((_, i) => i !== index);
        onChange(newPoints);
      }
    } else {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      const newX = fromCanvasX(x);
      const newY = fromCanvasY(y);
      
      if (newX > 0.02 && newX < 0.98 && points.length < 10) {
        const newPoints = [...points, { x: newX, y: newY }];
        newPoints.sort((a, b) => a.x - b.x);
        onChange(newPoints);
      }
    }
  }, [points, onChange, getPointAtPosition, fromCanvasX, fromCanvasY]);
  
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      const index = getPointAtPosition(touch.clientX, touch.clientY);
      if (index !== null) {
        e.preventDefault();
        setDraggingIndex(index);
      }
    }
  }, [getPointAtPosition]);
  
  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (draggingIndex !== null && e.touches.length === 1) {
      e.preventDefault();
      const touch = e.touches[0];
      const canvas = canvasRef.current;
      if (!canvas) return;
      
      const rect = canvas.getBoundingClientRect();
      const x = touch.clientX - rect.left;
      const y = touch.clientY - rect.top;
      
      const newX = fromCanvasX(x);
      const newY = fromCanvasY(y);
      
      const newPoints = [...points];
      const isEndpoint = draggingIndex === 0 || draggingIndex === points.length - 1;
      
      if (isEndpoint) {
        newPoints[draggingIndex] = { 
          x: draggingIndex === 0 ? 0 : 1, 
          y: newY 
        };
      } else {
        const sorted = [...points].sort((a, b) => a.x - b.x);
        const sortedIndex = sorted.findIndex(p => p === points[draggingIndex]);
        const minX = sortedIndex > 0 ? sorted[sortedIndex - 1].x + 0.02 : 0.02;
        const maxX = sortedIndex < sorted.length - 1 ? sorted[sortedIndex + 1].x - 0.02 : 0.98;
        
        newPoints[draggingIndex] = { 
          x: Math.max(minX, Math.min(maxX, newX)),
          y: newY 
        };
      }
      
      onChange(newPoints);
    }
  }, [draggingIndex, points, onChange, fromCanvasX, fromCanvasY]);
  
  const handleTouchEnd = useCallback(() => {
    setDraggingIndex(null);
  }, []);
  
  const addPoint = useCallback(() => {
    if (points.length >= 10) return;
    
    const sorted = [...points].sort((a, b) => a.x - b.x);
    let maxGap = 0;
    let insertX = 0.5;
    
    for (let i = 0; i < sorted.length - 1; i++) {
      const gap = sorted[i + 1].x - sorted[i].x;
      if (gap > maxGap) {
        maxGap = gap;
        insertX = (sorted[i].x + sorted[i + 1].x) / 2;
      }
    }
    
    const curvePoints = generateCurvePoints(points, 100);
    let insertY = insertX;
    for (const cp of curvePoints) {
      if (Math.abs(cp.x - insertX) < 0.02) {
        insertY = cp.y;
        break;
      }
    }
    
    const newPoints = [...points, { x: insertX, y: insertY }];
    newPoints.sort((a, b) => a.x - b.x);
    onChange(newPoints);
  }, [points, onChange]);
  
  const removePoint = useCallback(() => {
    if (points.length <= 2) return;
    
    const sorted = [...points].sort((a, b) => a.x - b.x);
    const middleIndex = Math.floor(sorted.length / 2);
    const newPoints = sorted.filter((_, i) => i !== middleIndex);
    onChange(newPoints);
  }, [points, onChange]);
  
  const reset = useCallback(() => {
    onChange([...DEFAULT_POINTS]);
  }, [onChange]);
  
  return (
    <div className={`flex flex-col gap-1 ${className}`} ref={containerRef}>
      <div className="flex items-center justify-between">
        <span className="text-[9px] text-muted-foreground">Custom Curve</span>
        <div className="flex gap-0.5">
          <Button
            size="icon"
            variant="ghost"
            className="h-5 w-5"
            onClick={addPoint}
            disabled={points.length >= 10}
            data-testid="btn-curve-add-point"
          >
            <Plus className="h-3 w-3" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-5 w-5"
            onClick={removePoint}
            disabled={points.length <= 2}
            data-testid="btn-curve-remove-point"
          >
            <Minus className="h-3 w-3" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-5 w-5"
            onClick={reset}
            data-testid="btn-curve-reset"
          >
            <RotateCcw className="h-3 w-3" />
          </Button>
        </div>
      </div>
      
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className="rounded-md border border-border cursor-crosshair touch-none"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onDoubleClick={handleDoubleClick}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        data-testid="canvas-curve-editor"
      />
      
      <span className="text-[8px] text-muted-foreground text-center">
        Drag points • Double-click to add/remove
      </span>
    </div>
  );
}

export { DEFAULT_POINTS, generateCurvePoints };
