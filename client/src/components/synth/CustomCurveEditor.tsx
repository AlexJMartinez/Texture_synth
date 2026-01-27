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

function generateCurvePoints(controlPoints: CurvePoint[], resolution: number = 200): CurvePoint[] {
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
  const [isMobile, setIsMobile] = useState(false);
  const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(null);
  const [longPressPosition, setLongPressPosition] = useState<{ x: number; y: number } | null>(null);
  
  // Detect mobile/touch device
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.matchMedia('(max-width: 768px)').matches || 'ontouchstart' in window);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  
  // Responsive dimensions - larger on mobile for easier interaction
  const responsiveWidth = isMobile ? Math.min(width * 1.4, 280) : width;
  const responsiveHeight = isMobile ? Math.min(height * 1.3, 195) : height;
  
  const padding = isMobile ? 12 : 8;
  const pointRadius = isMobile ? 10 : 6; // Larger touch targets on mobile
  const hitRadius = isMobile ? 20 : 10; // Even larger hit area for touch
  
  // Get device pixel ratio for high-DPI rendering
  const getPixelRatio = useCallback(() => {
    return Math.min(window.devicePixelRatio || 1, 3); // Cap at 3x for performance
  }, []);
  
  const toCanvasX = useCallback((x: number) => padding + x * (responsiveWidth - 2 * padding), [responsiveWidth, padding]);
  const toCanvasY = useCallback((y: number) => responsiveHeight - padding - y * (responsiveHeight - 2 * padding), [responsiveHeight, padding]);
  const fromCanvasX = useCallback((cx: number) => Math.max(0, Math.min(1, (cx - padding) / (responsiveWidth - 2 * padding))), [responsiveWidth, padding]);
  const fromCanvasY = useCallback((cy: number) => Math.max(0, Math.min(1, (responsiveHeight - padding - cy) / (responsiveHeight - 2 * padding))), [responsiveHeight, padding]);
  
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    
    const dpr = getPixelRatio();
    
    // Set up high-DPI canvas
    canvas.width = responsiveWidth * dpr;
    canvas.height = responsiveHeight * dpr;
    canvas.style.width = `${responsiveWidth}px`;
    canvas.style.height = `${responsiveHeight}px`;
    ctx.scale(dpr, dpr);
    
    // Enable antialiasing
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    
    ctx.clearRect(0, 0, responsiveWidth, responsiveHeight);
    
    // Background
    ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
    ctx.fillRect(0, 0, responsiveWidth, responsiveHeight);
    
    // Grid lines
    ctx.strokeStyle = "rgba(120, 180, 140, 0.2)";
    ctx.lineWidth = 1;
    
    for (let i = 0; i <= 4; i++) {
      const x = padding + (i / 4) * (responsiveWidth - 2 * padding);
      ctx.beginPath();
      ctx.moveTo(x, padding);
      ctx.lineTo(x, responsiveHeight - padding);
      ctx.stroke();
    }
    
    for (let i = 0; i <= 4; i++) {
      const y = padding + (i / 4) * (responsiveHeight - 2 * padding);
      ctx.beginPath();
      ctx.moveTo(padding, y);
      ctx.lineTo(responsiveWidth - padding, y);
      ctx.stroke();
    }
    
    // Diagonal reference line
    ctx.strokeStyle = "rgba(120, 180, 140, 0.4)";
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(padding, responsiveHeight - padding);
    ctx.lineTo(responsiveWidth - padding, padding);
    ctx.stroke();
    ctx.setLineDash([]);
    
    // Generate and draw curve with higher resolution
    const curvePoints = generateCurvePoints(points, 200);
    
    // Draw curve shadow for depth
    ctx.strokeStyle = "rgba(0, 0, 0, 0.3)";
    ctx.lineWidth = isMobile ? 4 : 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    if (curvePoints.length > 0) {
      ctx.moveTo(toCanvasX(curvePoints[0].x) + 1, toCanvasY(curvePoints[0].y) + 1);
      for (let i = 1; i < curvePoints.length; i++) {
        ctx.lineTo(toCanvasX(curvePoints[i].x) + 1, toCanvasY(curvePoints[i].y) + 1);
      }
    }
    ctx.stroke();
    
    // Draw main curve
    ctx.strokeStyle = "#78B48C";
    ctx.lineWidth = isMobile ? 3 : 2.5;
    ctx.beginPath();
    
    if (curvePoints.length > 0) {
      ctx.moveTo(toCanvasX(curvePoints[0].x), toCanvasY(curvePoints[0].y));
      for (let i = 1; i < curvePoints.length; i++) {
        ctx.lineTo(toCanvasX(curvePoints[i].x), toCanvasY(curvePoints[i].y));
      }
    }
    ctx.stroke();
    
    // Draw control points
    points.forEach((point, index) => {
      const cx = toCanvasX(point.x);
      const cy = toCanvasY(point.y);
      
      const isEndpoint = index === 0 || index === points.length - 1;
      const isHovered = hoveredIndex === index;
      const isDragging = draggingIndex === index;
      
      const currentRadius = pointRadius + (isHovered || isDragging ? (isMobile ? 4 : 2) : 0);
      
      // Point shadow
      ctx.beginPath();
      ctx.arc(cx + 1, cy + 1, currentRadius, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
      ctx.fill();
      
      // Point fill
      ctx.beginPath();
      ctx.arc(cx, cy, currentRadius, 0, Math.PI * 2);
      
      if (isEndpoint) {
        ctx.fillStyle = isDragging ? "#A0D4B0" : isHovered ? "#90C4A0" : "#4A8A5A";
      } else {
        ctx.fillStyle = isDragging ? "#B0E4C0" : isHovered ? "#A0D4B0" : "#78B48C";
      }
      ctx.fill();
      
      // Point border
      ctx.strokeStyle = "#2A4A3A";
      ctx.lineWidth = isMobile ? 2.5 : 2;
      ctx.stroke();
      
      // Inner highlight for 3D effect
      ctx.beginPath();
      ctx.arc(cx - currentRadius * 0.25, cy - currentRadius * 0.25, currentRadius * 0.4, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255, 255, 255, 0.2)";
      ctx.fill();
    });
  }, [points, responsiveWidth, responsiveHeight, hoveredIndex, draggingIndex, toCanvasX, toCanvasY, getPixelRatio, isMobile, padding, pointRadius]);
  
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
      if (dist <= hitRadius) {
        return i;
      }
    }
    return null;
  }, [points, toCanvasX, toCanvasY, hitRadius]);
  
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
  
  // Long press handler for mobile - add/remove points
  const handleLongPress = useCallback((clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const index = getPointAtPosition(clientX, clientY);
    
    if (index !== null) {
      // Long press on existing point - remove it (unless endpoint)
      if (index !== 0 && index !== points.length - 1 && points.length > 2) {
        const newPoints = points.filter((_, i) => i !== index);
        onChange(newPoints);
      }
    } else {
      // Long press on empty space - add point
      const rect = canvas.getBoundingClientRect();
      const x = clientX - rect.left;
      const y = clientY - rect.top;
      
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
      
      // Store position for long press
      setLongPressPosition({ x: touch.clientX, y: touch.clientY });
      
      // Start long press timer (500ms)
      const timer = setTimeout(() => {
        handleLongPress(touch.clientX, touch.clientY);
        setLongPressTimer(null);
      }, 500);
      setLongPressTimer(timer);
      
      if (index !== null) {
        e.preventDefault();
        setDraggingIndex(index);
      }
    }
  }, [getPointAtPosition, handleLongPress]);
  
  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    // Cancel long press if finger moves
    if (longPressTimer && longPressPosition) {
      const touch = e.touches[0];
      const dx = touch.clientX - longPressPosition.x;
      const dy = touch.clientY - longPressPosition.y;
      if (Math.sqrt(dx * dx + dy * dy) > 10) {
        clearTimeout(longPressTimer);
        setLongPressTimer(null);
      }
    }
    
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
  }, [draggingIndex, points, onChange, fromCanvasX, fromCanvasY, longPressTimer, longPressPosition]);
  
  const handleTouchEnd = useCallback(() => {
    // Clear long press timer
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
    setLongPressPosition(null);
    setDraggingIndex(null);
  }, [longPressTimer]);
  
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
    
    const curvePoints = generateCurvePoints(points, 200);
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
    <div className={`flex flex-col gap-1.5 ${className}`} ref={containerRef}>
      <div className="flex items-center justify-between">
        <span className="text-[10px] sm:text-[9px] text-muted-foreground font-medium">Custom Curve</span>
        <div className="flex gap-1 sm:gap-0.5">
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7 sm:h-5 sm:w-5"
            onClick={addPoint}
            disabled={points.length >= 10}
            data-testid="btn-curve-add-point"
          >
            <Plus className="h-4 w-4 sm:h-3 sm:w-3" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7 sm:h-5 sm:w-5"
            onClick={removePoint}
            disabled={points.length <= 2}
            data-testid="btn-curve-remove-point"
          >
            <Minus className="h-4 w-4 sm:h-3 sm:w-3" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7 sm:h-5 sm:w-5"
            onClick={reset}
            data-testid="btn-curve-reset"
          >
            <RotateCcw className="h-4 w-4 sm:h-3 sm:w-3" />
          </Button>
        </div>
      </div>
      
      <canvas
        ref={canvasRef}
        className="rounded-md border border-border cursor-crosshair touch-none select-none"
        style={{ 
          width: responsiveWidth, 
          height: responsiveHeight,
          touchAction: 'none'
        }}
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
      
      <span className="text-[9px] sm:text-[8px] text-muted-foreground text-center">
        {isMobile ? "Drag points • Long-press to add/remove" : "Drag points • Double-click to add/remove"}
      </span>
    </div>
  );
}

export { DEFAULT_POINTS, generateCurvePoints };
