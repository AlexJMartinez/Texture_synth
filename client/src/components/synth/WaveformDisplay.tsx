import { useRef, useEffect } from "react";

interface WaveformDisplayProps {
  audioBuffer: AudioBuffer | null;
  isPlaying?: boolean;
  className?: string;
}

export function WaveformDisplay({ audioBuffer, isPlaying, className = "" }: WaveformDisplayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;

    ctx.clearRect(0, 0, width, height);

    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, "rgba(139, 92, 246, 0.1)");
    gradient.addColorStop(0.5, "rgba(139, 92, 246, 0.02)");
    gradient.addColorStop(1, "rgba(139, 92, 246, 0.1)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    for (let i = 0; i <= 4; i++) {
      const y = (height / 4) * i;
      ctx.beginPath();
      ctx.strokeStyle = i === 2 ? "rgba(255, 255, 255, 0.15)" : "rgba(255, 255, 255, 0.05)";
      ctx.lineWidth = i === 2 ? 1 : 0.5;
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    for (let i = 0; i < 8; i++) {
      const x = (width / 8) * i;
      ctx.beginPath();
      ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
      ctx.lineWidth = 0.5;
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }

    if (audioBuffer) {
      const data = audioBuffer.getChannelData(0);
      const step = Math.ceil(data.length / width);
      const amp = height / 2;

      const waveGradient = ctx.createLinearGradient(0, 0, width, 0);
      waveGradient.addColorStop(0, isPlaying ? "hsl(280, 70%, 65%)" : "hsl(280, 70%, 55%)");
      waveGradient.addColorStop(0.5, isPlaying ? "hsl(175, 70%, 55%)" : "hsl(175, 70%, 45%)");
      waveGradient.addColorStop(1, isPlaying ? "hsl(280, 70%, 65%)" : "hsl(280, 70%, 55%)");

      ctx.beginPath();
      ctx.strokeStyle = waveGradient;
      ctx.lineWidth = 2;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      for (let i = 0; i < width; i++) {
        const sliceStart = i * step;
        const sliceEnd = Math.min(sliceStart + step, data.length);
        
        let min = 1.0;
        let max = -1.0;
        for (let j = sliceStart; j < sliceEnd; j++) {
          const sample = data[j];
          if (sample < min) min = sample;
          if (sample > max) max = sample;
        }

        const y = amp + ((min + max) / 2) * amp;
        
        if (i === 0) {
          ctx.moveTo(i, y);
        } else {
          ctx.lineTo(i, y);
        }
      }

      if (isPlaying) {
        ctx.shadowColor = "hsl(280, 70%, 55%)";
        ctx.shadowBlur = 10;
      }
      ctx.stroke();
      ctx.shadowBlur = 0;

      ctx.beginPath();
      ctx.strokeStyle = waveGradient;
      ctx.lineWidth = 1;
      ctx.globalAlpha = 0.3;

      for (let i = 0; i < width; i++) {
        const sliceStart = i * step;
        const sliceEnd = Math.min(sliceStart + step, data.length);
        
        let min = 1.0;
        let max = -1.0;
        for (let j = sliceStart; j < sliceEnd; j++) {
          const sample = data[j];
          if (sample < min) min = sample;
          if (sample > max) max = sample;
        }

        ctx.moveTo(i, amp + min * amp);
        ctx.lineTo(i, amp + max * amp);
      }
      ctx.stroke();
      ctx.globalAlpha = 1;
    } else {
      ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
      ctx.font = "13px Inter, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("Trigger to preview waveform", width / 2, height / 2);
    }
  }, [audioBuffer, isPlaying]);

  return (
    <div 
      className={`relative w-full rounded-md overflow-hidden ${className}`}
      style={{
        background: 'linear-gradient(to bottom, hsl(var(--card)), hsl(var(--background)))',
        boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.4)',
      }}
      data-testid="waveform-display"
    >
      <canvas
        ref={canvasRef}
        className="w-full h-full"
        style={{ display: 'block' }}
      />
      {isPlaying && (
        <div 
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse at center, hsl(280, 70%, 55%, 0.1) 0%, transparent 70%)',
          }}
        />
      )}
    </div>
  );
}
