import { useRef, useCallback, useEffect, useState } from "react";

interface KnobProps {
  value: number;
  min: number;
  max: number;
  step?: number;
  label: string;
  unit?: string;
  onChange: (value: number) => void;
  logarithmic?: boolean;
  size?: "xs" | "sm" | "md" | "lg";
  accentColor?: "primary" | "accent";
  showValueOnHover?: boolean;
  defaultValue?: number;
  "data-testid"?: string;
}

export function Knob({
  value,
  min,
  max,
  step = 1,
  label,
  unit = "",
  onChange,
  logarithmic = false,
  size = "md",
  accentColor = "primary",
  showValueOnHover = true,
  defaultValue,
  "data-testid": testId,
}: KnobProps) {
  const knobRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const startY = useRef(0);
  const startValue = useRef(0);
  const lastTapTime = useRef(0);

  const handleDoubleClick = useCallback(() => {
    const resetValue = defaultValue !== undefined ? defaultValue : min;
    onChange(resetValue);
  }, [defaultValue, min, onChange]);

  const handleTouchEnd = useCallback(() => {
    const now = Date.now();
    if (now - lastTapTime.current < 300) {
      handleDoubleClick();
    }
    lastTapTime.current = now;
  }, [handleDoubleClick]);

  const sizeClasses = {
    xs: "w-7 h-7",
    sm: "w-9 h-9",
    md: "w-11 h-11",
    lg: "w-14 h-14",
  };

  const indicatorSize = {
    xs: "w-0.5 h-2 top-0.5",
    sm: "w-0.5 h-2.5 top-0.5",
    md: "w-0.5 h-3 top-1",
    lg: "w-1 h-4 top-1.5",
  };

  const normalizeValue = useCallback((val: number) => {
    if (logarithmic && min > 0) {
      const logMin = Math.log(min);
      const logMax = Math.log(max);
      return (Math.log(val) - logMin) / (logMax - logMin);
    }
    return (val - min) / (max - min);
  }, [min, max, logarithmic]);

  const denormalizeValue = useCallback((normalized: number) => {
    if (logarithmic && min > 0) {
      const logMin = Math.log(min);
      const logMax = Math.log(max);
      return Math.exp(logMin + normalized * (logMax - logMin));
    }
    return min + normalized * (max - min);
  }, [min, max, logarithmic]);

  const rotation = normalizeValue(value) * 270 - 135;

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    startY.current = e.clientY;
    startValue.current = normalizeValue(value);
  }, [value, normalizeValue]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return;

    const delta = (startY.current - e.clientY) / 150;
    const newNormalized = Math.max(0, Math.min(1, startValue.current + delta));
    const newValue = denormalizeValue(newNormalized);
    
    const snappedValue = Math.round(newValue / step) * step;
    onChange(Math.max(min, Math.min(max, snappedValue)));
  }, [isDragging, denormalizeValue, step, min, max, onChange]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
      return () => {
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = -e.deltaY / 1000;
    const currentNormalized = normalizeValue(value);
    const newNormalized = Math.max(0, Math.min(1, currentNormalized + delta));
    const newValue = denormalizeValue(newNormalized);
    const snappedValue = Math.round(newValue / step) * step;
    onChange(Math.max(min, Math.min(max, snappedValue)));
  }, [value, normalizeValue, denormalizeValue, step, min, max, onChange]);

  const displayValue = logarithmic ? 
    (value >= 1000 ? `${(value / 1000).toFixed(1)}k` : value.toFixed(0)) :
    (Number.isInteger(step) ? Math.round(value).toString() : value.toFixed(1));

  const accentStyles = accentColor === "accent" 
    ? "bg-accent shadow-[0_0_6px_hsl(var(--accent)/0.5)]"
    : "bg-primary shadow-[0_0_6px_hsl(var(--primary)/0.5)]";

  const showValue = showValueOnHover && (isDragging || isHovering);

  return (
    <div 
      className="flex flex-col items-center gap-0.5 flex-1 min-w-0" 
      data-testid={testId || `knob-${label.toLowerCase().replace(/\s/g, '-')}`}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      <div
        ref={knobRef}
        className={`relative ${sizeClasses[size]} rounded-full cursor-pointer select-none transition-transform ${isDragging ? 'scale-105' : ''}`}
        style={{
          background: 'linear-gradient(145deg, hsl(var(--card)), hsl(var(--muted)))',
          boxShadow: isDragging 
            ? `inset 2px 2px 6px rgba(0,0,0,0.3), inset -1px -1px 3px rgba(255,255,255,0.05), 0 0 15px hsl(var(--${accentColor})/0.4)`
            : 'inset 2px 2px 6px rgba(0,0,0,0.3), inset -1px -1px 3px rgba(255,255,255,0.05), 0 4px 8px rgba(0,0,0,0.4)',
        }}
        onMouseDown={handleMouseDown}
        onDoubleClick={handleDoubleClick}
        onTouchEnd={handleTouchEnd}
        onWheel={handleWheel}
      >
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{ transform: `rotate(${rotation}deg)` }}
        >
          <div
            className={`absolute ${indicatorSize[size]} rounded-full left-1/2 -translate-x-1/2 ${accentStyles}`}
          />
        </div>
        <svg
          className="absolute inset-0 w-full h-full -rotate-[135deg]"
          viewBox="0 0 100 100"
        >
          <circle
            cx="50"
            cy="50"
            r="46"
            fill="none"
            stroke={`hsl(var(--${accentColor})/0.2)`}
            strokeWidth="3"
            strokeDasharray={`${270 * 2.88} 360`}
            strokeLinecap="round"
          />
          <circle
            cx="50"
            cy="50"
            r="46"
            fill="none"
            stroke={`hsl(var(--${accentColor}))`}
            strokeWidth="3"
            strokeDasharray={`${normalizeValue(value) * 270 * 2.88} 360`}
            strokeLinecap="round"
            style={{ filter: `drop-shadow(0 0 3px hsl(var(--${accentColor})/0.5))` }}
          />
        </svg>
      </div>
      <span className="text-[10px] font-medium text-muted-foreground truncate max-w-full">{label}</span>
      <div className="h-3 flex items-center justify-center">
        {showValue ? (
          <span className="text-[10px] font-mono text-primary animate-in fade-in duration-150">
            {displayValue}{unit}
          </span>
        ) : (
          <span className="text-[10px] font-mono text-foreground/40">
            {displayValue}{unit}
          </span>
        )}
      </div>
    </div>
  );
}
