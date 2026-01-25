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
          ? 'hsl(155, 45%, 50%)'
          : 'hsl(155, 45%, 42%)',
      }}
      data-testid="button-trigger"
    >
      {isPlaying ? (
        <Zap className={`${iconSizes[size]} text-white`} fill="currentColor" />
      ) : (
        <Play className={`${iconSizes[size]} text-white ml-0.5`} fill="currentColor" />
      )}
    </button>
  );
}
