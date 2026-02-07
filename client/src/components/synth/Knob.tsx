import { useRef, useCallback, useEffect, useState } from "react";
import { useModulationsForPath } from "@/contexts/ModulationContext";

interface ModulationIndicator {
  color: string;
  modulatorName: string;
}

interface KnobProps {
  value: number;
  min: number;
  max: number;
  step?: number;
  label: string;
  unit?: string;
  /** Optional formatter for the value readout (receives the raw numeric value). */
  format?: (value: number) => string;
  onChange: (value: number) => void;
  logarithmic?: boolean;
  size?: "xs" | "sm" | "md" | "lg";
  accentColor?: "primary" | "accent";
  showValueOnHover?: boolean;
  defaultValue?: number;
  modulationPath?: string;
  modulations?: ModulationIndicator[];
  disabled?: boolean;
  "data-testid"?: string;
}

export function Knob({
  value,
  min,
  max,
  step = 1,
  label,
  unit = "",
  format,
  onChange,
  logarithmic = false,
  size = "md",
  accentColor = "primary",
  showValueOnHover = true,
  defaultValue,
  modulationPath,
  modulations: externalModulations,
  disabled = false,
  "data-testid": testId,
}: KnobProps) {
  // Get modulations from context if a path is provided, or use external modulations
  const contextModulations = useModulationsForPath(modulationPath || "");
  const modulations = externalModulations || contextModulations;
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
    if (logarithmic) {
      if (min > 0) {
        const logMin = Math.log(min);
        const logMax = Math.log(max);
        return (Math.log(val) - logMin) / (logMax - logMin);
      } else {
        // Pseudo-logarithmic for ranges starting at 0
        // Use a small offset to avoid log(0)
        const offset = 1;
        const logMax = Math.log(max + offset);
        const logOffset = Math.log(offset);
        return (Math.log(val + offset) - logOffset) / (logMax - logOffset);
      }
    }
    return (val - min) / (max - min);
  }, [min, max, logarithmic]);

  const denormalizeValue = useCallback((normalized: number) => {
    if (logarithmic) {
      if (min > 0) {
        const logMin = Math.log(min);
        const logMax = Math.log(max);
        return Math.exp(logMin + normalized * (logMax - logMin));
      } else {
        // Pseudo-logarithmic for ranges starting at 0
        const offset = 1;
        const logMax = Math.log(max + offset);
        const logOffset = Math.log(offset);
        return Math.exp(logOffset + normalized * (logMax - logOffset)) - offset;
      }
    }
    return min + normalized * (max - min);
  }, [min, max, logarithmic]);

  const rotation = normalizeValue(value) * 270 - 135;
  
  // Arc calculation: circumference = 2 * π * r = 2 * π * 46 ≈ 289
  // For 270 degree arc: (270/360) * 289 ≈ 216.77
  const circumference = 2 * Math.PI * 46;
  const arcLength270 = (270 / 360) * circumference; // ~216.77
  const gapLength = circumference - arcLength270; // ~72.26

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    
    // Shift+click for fine-tune ±1 (or ±step)
    if (e.shiftKey && knobRef.current) {
      const rect = knobRef.current.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const midX = rect.width / 2;
      
      // Right half = increment, left half = decrement (matches knob arc direction)
      const fineStep = step || 1;
      const delta = clickX > midX ? fineStep : -fineStep;
      const newValue = Math.max(min, Math.min(max, value + delta));
      onChange(newValue);
      return;
    }
    
    setIsDragging(true);
    startY.current = e.clientY;
    startValue.current = normalizeValue(value);
  }, [value, normalizeValue, step, min, max, onChange]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    setIsDragging(true);
    startY.current = e.touches[0].clientY;
    startValue.current = normalizeValue(value);
  }, [value, normalizeValue]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return;

    // Shift+drag for fine control: 10x slower sensitivity, always ±1 step
    const sensitivity = e.shiftKey ? 1500 : 150;
    const delta = (startY.current - e.clientY) / sensitivity;
    
    if (e.shiftKey) {
      // Fine mode: direct step-based adjustment from start value
      const pixelDelta = startY.current - e.clientY;
      const stepsToMove = Math.round(pixelDelta / 10); // 10 pixels per step
      const fineStep = step || 1;
      const newValue = denormalizeValue(startValue.current) + (stepsToMove * fineStep);
      onChange(Math.max(min, Math.min(max, Math.round(newValue / fineStep) * fineStep)));
    } else {
      const newNormalized = Math.max(0, Math.min(1, startValue.current + delta));
      const newValue = denormalizeValue(newNormalized);
      const snappedValue = Math.round(newValue / step) * step;
      onChange(Math.max(min, Math.min(max, snappedValue)));
    }
  }, [isDragging, denormalizeValue, step, min, max, onChange]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!isDragging) return;
    e.preventDefault();

    const delta = (startY.current - e.touches[0].clientY) / 150;
    const newNormalized = Math.max(0, Math.min(1, startValue.current + delta));
    const newValue = denormalizeValue(newNormalized);
    
    const snappedValue = Math.round(newValue / step) * step;
    onChange(Math.max(min, Math.min(max, snappedValue)));
  }, [isDragging, denormalizeValue, step, min, max, onChange]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleTouchEnd = useCallback(() => {
    const now = Date.now();
    if (now - lastTapTime.current < 300) {
      handleDoubleClick();
    }
    lastTapTime.current = now;
    setIsDragging(false);
  }, [handleDoubleClick]);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
      window.addEventListener("touchmove", handleTouchMove, { passive: false });
      window.addEventListener("touchend", handleTouchEnd);
      return () => {
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
        window.removeEventListener("touchmove", handleTouchMove);
        window.removeEventListener("touchend", handleTouchEnd);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp, handleTouchMove, handleTouchEnd]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = -e.deltaY / 1000;
    const currentNormalized = normalizeValue(value);
    const newNormalized = Math.max(0, Math.min(1, currentNormalized + delta));
    const newValue = denormalizeValue(newNormalized);
    const snappedValue = Math.round(newValue / step) * step;
    onChange(Math.max(min, Math.min(max, snappedValue)));
  }, [value, normalizeValue, denormalizeValue, step, min, max, onChange]);

  const baseDisplayValue = logarithmic
    ? (value >= 1000 ? `${(value / 1000).toFixed(1)}k` : value.toFixed(0))
    : (Number.isInteger(step) ? Math.round(value).toString() : value.toFixed(1));

  const displayValue = format ? format(value) : baseDisplayValue;

  const accentStyles = accentColor === "accent" 
    ? "bg-accent shadow-[0_0_6px_hsl(var(--accent)/0.5)]"
    : "bg-primary shadow-[0_0_6px_hsl(var(--primary)/0.5)]";

  const showValue = showValueOnHover && (isDragging || isHovering);

  // Combine multiple modulator colors into a single gradient or use the first one
  const hasModulations = modulations && modulations.length > 0;
  const primaryModColor = hasModulations ? modulations[0].color : null;

  return (
    <div 
      className={`flex flex-col items-center gap-0.5 flex-1 min-w-0 ${disabled ? 'opacity-40 pointer-events-none' : ''}`}
      data-testid={testId || `knob-${label.toLowerCase().replace(/\s/g, '-')}`}
      onMouseEnter={() => !disabled && setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      <div className="relative">
        {/* Modulation indicator ring - positioned around the knob */}
        {hasModulations && primaryModColor && !disabled && (
          <div 
            className="absolute -inset-1 rounded-full animate-pulse pointer-events-none"
            style={{
              border: `2px solid ${primaryModColor}`,
              boxShadow: `0 0 8px ${primaryModColor}, 0 0 16px ${primaryModColor}50`,
            }}
            title={modulations.map(m => m.modulatorName).join(', ')}
          />
        )}
        <div
          ref={knobRef}
          className={`relative ${sizeClasses[size]} rounded-full select-none transition-transform ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'} ${isDragging && !disabled ? 'scale-105' : ''}`}
          style={{
            background: 'linear-gradient(145deg, hsl(var(--card)), hsl(var(--muted)))',
            boxShadow: isDragging && !disabled
              ? `inset 2px 2px 6px rgba(0,0,0,0.3), inset -1px -1px 3px rgba(255,255,255,0.05), 0 0 15px hsl(var(--${accentColor})/0.4)`
              : 'inset 2px 2px 6px rgba(0,0,0,0.3), inset -1px -1px 3px rgba(255,255,255,0.05), 0 4px 8px rgba(0,0,0,0.4)',
          }}
          onMouseDown={disabled ? undefined : handleMouseDown}
          onTouchStart={disabled ? undefined : handleTouchStart}
          onDoubleClick={disabled ? undefined : handleDoubleClick}
          onWheel={disabled ? undefined : handleWheel}
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
          className="absolute inset-0 w-full h-full -rotate-[225deg]"
          viewBox="0 0 100 100"
        >
          <circle
            cx="50"
            cy="50"
            r="46"
            fill="none"
            stroke={`hsl(var(--${accentColor})/0.2)`}
            strokeWidth="3"
            strokeDasharray={`${arcLength270} ${gapLength}`}
            strokeLinecap="round"
          />
          {normalizeValue(value) > 0.01 && (
            <circle
              cx="50"
              cy="50"
              r="46"
              fill="none"
              stroke={`hsl(var(--${accentColor}))`}
              strokeWidth="3"
              strokeDasharray={`${normalizeValue(value) * arcLength270} ${circumference}`}
              strokeLinecap="round"
              style={{ filter: `drop-shadow(0 0 3px hsl(var(--${accentColor})/0.5))` }}
            />
          )}
        </svg>
        </div>
      </div>
      <span className="text-[10px] font-medium text-muted-foreground truncate max-w-full">{label}</span>
      <div className="h-3 flex items-center justify-center">
        {showValue ? (
          <span className="text-[10px] font-mono text-primary animate-in fade-in duration-150">
            {displayValue}{format ? "" : unit}
          </span>
        ) : (
          <span className="text-[10px] font-mono text-foreground/40">
            {displayValue}{format ? "" : unit}
          </span>
        )}
      </div>
    </div>
  );
}
