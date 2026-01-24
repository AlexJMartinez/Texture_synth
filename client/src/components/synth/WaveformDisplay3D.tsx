import { useRef, useEffect, useCallback } from "react";

interface WaveformDisplay3DProps {
  audioBuffer: AudioBuffer | null;
  isPlaying?: boolean;
  className?: string;
}

export function WaveformDisplay3D({ audioBuffer, isPlaying, className = "" }: WaveformDisplay3DProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const progressRef = useRef(0);

  const drawWaveform = useCallback((
    ctx: CanvasRenderingContext2D, 
    width: number, 
    height: number, 
    data: Float32Array | null,
    progress: number
  ) => {
    ctx.clearRect(0, 0, width, height);
    
    const barWidth = 2;
    const gap = 1;
    const totalBarWidth = barWidth + gap;
    const numBars = Math.floor(width / totalBarWidth);
    const centerY = height / 2;
    
    // Pastel green colors
    const waveColor = "hsl(145, 45%, 55%)";
    const progressColor = "hsl(145, 50%, 65%)";
    const dimColor = "hsl(145, 25%, 25%)";
    
    if (data && data.length > 0) {
      // Draw waveform bars
      for (let i = 0; i < numBars; i++) {
        const dataIndex = Math.floor((i / numBars) * data.length);
        const amplitude = Math.abs(data[dataIndex] || 0);
        
        // Scale amplitude for visibility (min 2px, max 90% of half height)
        const maxBarHeight = (height / 2) * 0.9;
        const barHeight = Math.max(2, amplitude * maxBarHeight * 3);
        
        const x = i * totalBarWidth;
        const barProgress = i / numBars;
        
        // Color based on playback progress
        if (isPlaying && barProgress <= progress) {
          ctx.fillStyle = progressColor;
        } else {
          ctx.fillStyle = waveColor;
        }
        
        // Draw mirrored bar (top and bottom)
        ctx.beginPath();
        ctx.roundRect(x, centerY - barHeight, barWidth, barHeight, 1);
        ctx.roundRect(x, centerY, barWidth, barHeight, 1);
        ctx.fill();
      }
      
      // Draw center line
      ctx.strokeStyle = dimColor;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, centerY);
      ctx.lineTo(width, centerY);
      ctx.stroke();
      
      // Draw playhead if playing
      if (isPlaying && progress > 0 && progress < 1) {
        const playheadX = progress * width;
        ctx.strokeStyle = "hsl(145, 60%, 70%)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(playheadX, 0);
        ctx.lineTo(playheadX, height);
        ctx.stroke();
      }
    } else {
      // Draw idle state - subtle animated bars
      const time = Date.now() / 1000;
      for (let i = 0; i < numBars; i++) {
        const x = i * totalBarWidth;
        const phase = (i / numBars) * Math.PI * 4 + time * 0.5;
        const amplitude = Math.sin(phase) * 0.3 + 0.3;
        const barHeight = 4 + amplitude * 12;
        
        ctx.fillStyle = dimColor;
        ctx.beginPath();
        ctx.roundRect(x, centerY - barHeight, barWidth, barHeight, 1);
        ctx.roundRect(x, centerY, barWidth, barHeight, 1);
        ctx.fill();
      }
      
      // Center line
      ctx.strokeStyle = "hsl(145, 15%, 18%)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, centerY);
      ctx.lineTo(width, centerY);
      ctx.stroke();
    }
  }, [isPlaying]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width <= 0 || height <= 0) return;
        const dpr = window.devicePixelRatio || 1;
        canvas.width = width * dpr;
        canvas.height = height * dpr;
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.scale(dpr, dpr);
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;
      }
    });
    
    resizeObserver.observe(canvas.parentElement!);
    
    return () => resizeObserver.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    let data: Float32Array | null = null;
    if (audioBuffer) {
      const channelData = audioBuffer.getChannelData(0);
      const samples = Math.min(512, channelData.length);
      data = new Float32Array(samples);
      const step = Math.max(1, Math.floor(channelData.length / samples));
      for (let i = 0; i < samples; i++) {
        let max = 0;
        const start = Math.min(i * step, channelData.length - 1);
        const count = Math.min(step, channelData.length - start);
        for (let j = 0; j < count; j++) {
          const val = Math.abs(channelData[start + j] || 0);
          if (val > max) max = val;
        }
        data[i] = max;
      }
    }
    
    const startTime = Date.now();
    const duration = audioBuffer ? audioBuffer.duration * 1000 : 2000;
    
    const animate = () => {
      const rect = canvas.getBoundingClientRect();
      
      if (isPlaying && audioBuffer) {
        const elapsed = Date.now() - startTime;
        progressRef.current = Math.min(elapsed / duration, 1);
      } else if (!isPlaying) {
        progressRef.current = 0;
      }
      
      drawWaveform(ctx, rect.width, rect.height, data, progressRef.current);
      animationRef.current = requestAnimationFrame(animate);
    };
    
    animate();
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [audioBuffer, isPlaying, drawWaveform]);

  return (
    <div 
      className={`relative w-full rounded-lg overflow-hidden ${className}`}
      style={{
        background: 'hsl(150, 8%, 6%)',
        border: '1px solid hsl(150, 6%, 12%)',
      }}
      data-testid="waveform-display"
    >
      <canvas 
        ref={canvasRef}
        className="w-full h-full"
      />
      {!audioBuffer && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <span className="text-muted-foreground text-xs opacity-40">Trigger to preview</span>
        </div>
      )}
    </div>
  );
}
