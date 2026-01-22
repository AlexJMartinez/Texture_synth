import { useState, useCallback } from "react";
import { Play, Zap } from "lucide-react";

interface TriggerButtonProps {
  onTrigger: () => void;
  isPlaying: boolean;
}

export function TriggerButton({ onTrigger, isPlaying }: TriggerButtonProps) {
  const [isPressed, setIsPressed] = useState(false);

  const handleTrigger = useCallback(() => {
    setIsPressed(true);
    onTrigger();
    setTimeout(() => setIsPressed(false), 150);
  }, [onTrigger]);

  return (
    <button
      onClick={handleTrigger}
      className={`
        relative w-28 h-28 rounded-full cursor-pointer select-none
        transition-all duration-150 ease-out
        flex items-center justify-center
        ${isPressed ? 'scale-95' : 'hover:scale-105'}
        ${isPlaying ? 'trigger-active' : ''}
      `}
      style={{
        background: isPlaying 
          ? 'linear-gradient(145deg, hsl(280, 70%, 60%), hsl(280, 70%, 45%))'
          : 'linear-gradient(145deg, hsl(280, 70%, 55%), hsl(280, 70%, 40%))',
        boxShadow: isPlaying
          ? `inset 2px 2px 4px rgba(255,255,255,0.2),
             inset -2px -2px 4px rgba(0,0,0,0.3),
             0 0 40px hsl(280, 70%, 55%, 0.6),
             0 10px 30px rgba(0,0,0,0.5)`
          : `inset 2px 2px 4px rgba(255,255,255,0.15),
             inset -2px -2px 4px rgba(0,0,0,0.3),
             0 0 20px hsl(280, 70%, 55%, 0.3),
             0 10px 30px rgba(0,0,0,0.5)`,
      }}
      data-testid="button-trigger"
    >
      <div 
        className={`
          absolute inset-2 rounded-full
          transition-opacity duration-150
          ${isPlaying ? 'opacity-100' : 'opacity-0'}
        `}
        style={{
          background: 'radial-gradient(circle, hsl(280, 70%, 70%, 0.4) 0%, transparent 70%)',
        }}
      />
      
      {isPlaying ? (
        <Zap className="w-12 h-12 text-white drop-shadow-lg" fill="currentColor" />
      ) : (
        <Play className="w-12 h-12 text-white drop-shadow-lg ml-1" fill="currentColor" />
      )}

      <div 
        className="absolute inset-0 rounded-full pointer-events-none"
        style={{
          background: 'linear-gradient(135deg, rgba(255,255,255,0.2) 0%, transparent 50%)',
        }}
      />

      <svg 
        className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none"
        viewBox="0 0 100 100"
      >
        <circle
          cx="50"
          cy="50"
          r="48"
          fill="none"
          stroke="rgba(255,255,255,0.1)"
          strokeWidth="1"
        />
        {isPlaying && (
          <circle
            cx="50"
            cy="50"
            r="48"
            fill="none"
            stroke="rgba(255,255,255,0.4)"
            strokeWidth="2"
            strokeDasharray="30 10"
            className="animate-spin"
            style={{ animationDuration: '3s' }}
          />
        )}
      </svg>
    </button>
  );
}
