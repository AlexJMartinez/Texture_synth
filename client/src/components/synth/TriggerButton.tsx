import { useState, useCallback, useRef } from "react";
import { Play, Zap } from "lucide-react";

interface TriggerButtonProps {
  onTrigger: () => void;
  isPlaying: boolean;
  size?: "sm" | "md" | "lg";
}

export function TriggerButton({ onTrigger, isPlaying, size = "md" }: TriggerButtonProps) {
  const [isPressed, setIsPressed] = useState(false);
  const touchTriggeredRef = useRef(false);

  const handleTrigger = useCallback(() => {
    setIsPressed(true);
    onTrigger();
    setTimeout(() => setIsPressed(false), 150);
  }, [onTrigger]);

  // Handle touch for mobile - fires before click
  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    e.preventDefault(); // Prevent subsequent click event
    touchTriggeredRef.current = true;
    handleTrigger();
    // Reset after a short delay
    setTimeout(() => { touchTriggeredRef.current = false; }, 300);
  }, [handleTrigger]);

  // Only fire on click if not triggered by touch
  const handleClick = useCallback(() => {
    if (!touchTriggeredRef.current) {
      handleTrigger();
    }
  }, [handleTrigger]);

  const sizeClasses = {
    sm: "w-10 h-10",
    md: "w-12 h-12",
    lg: "w-16 h-16",
  };

  const iconSizes = {
    sm: "w-4 h-4",
    md: "w-5 h-5",
    lg: "w-7 h-7",
  };

  return (
    <button
      onClick={handleClick}
      onTouchEnd={handleTouchEnd}
      className={`
        relative ${sizeClasses[size]} rounded-lg cursor-pointer select-none
        transition-all duration-150 ease-out
        flex items-center justify-center
        ${isPressed ? 'scale-95' : 'hover:scale-105'}
        ${isPlaying ? 'trigger-active' : ''}
      `}
      style={{
        background: isPlaying 
          ? 'linear-gradient(145deg, hsl(155, 45%, 55%), hsl(155, 45%, 40%))'
          : 'linear-gradient(145deg, hsl(155, 45%, 50%), hsl(155, 45%, 35%))',
        boxShadow: isPlaying
          ? `inset 2px 2px 4px rgba(255,255,255,0.2),
             inset -2px -2px 4px rgba(0,0,0,0.3),
             0 0 30px hsl(155, 45%, 50%, 0.5),
             0 6px 20px rgba(0,0,0,0.4)`
          : `inset 2px 2px 4px rgba(255,255,255,0.15),
             inset -2px -2px 4px rgba(0,0,0,0.3),
             0 0 15px hsl(155, 45%, 50%, 0.25),
             0 6px 20px rgba(0,0,0,0.4)`,
      }}
      data-testid="button-trigger"
    >
      <div 
        className={`
          absolute inset-1.5 rounded-md
          transition-opacity duration-150
          ${isPlaying ? 'opacity-100' : 'opacity-0'}
        `}
        style={{
          background: 'radial-gradient(circle, hsl(155, 45%, 65%, 0.4) 0%, transparent 70%)',
        }}
      />
      
      {isPlaying ? (
        <Zap className={`${iconSizes[size]} text-white drop-shadow-lg`} fill="currentColor" />
      ) : (
        <Play className={`${iconSizes[size]} text-white drop-shadow-lg ml-0.5`} fill="currentColor" />
      )}

      <div 
        className="absolute inset-0 rounded-lg pointer-events-none"
        style={{
          background: 'linear-gradient(135deg, rgba(255,255,255,0.2) 0%, transparent 50%)',
        }}
      />

      <div 
        className={`
          absolute inset-0 rounded-lg pointer-events-none
          transition-all duration-300
          ${isPlaying ? 'opacity-100 scale-105' : 'opacity-0 scale-100'}
        `}
        style={{
          background: 'transparent',
          boxShadow: isPlaying 
            ? '0 0 15px hsl(155, 45%, 55%, 0.5), 0 0 30px hsl(155, 45%, 50%, 0.3), inset 0 0 15px hsl(155, 45%, 65%, 0.2)'
            : 'none',
        }}
      />
    </button>
  );
}
