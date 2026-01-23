import { useRef, useEffect, useCallback } from "react";

interface WaveformDisplay3DProps {
  audioBuffer: AudioBuffer | null;
  isPlaying?: boolean;
  className?: string;
}

export function WaveformDisplay3D({ audioBuffer, isPlaying, className = "" }: WaveformDisplay3DProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const offsetRef = useRef(0);

  const drawTerrain = useCallback((ctx: CanvasRenderingContext2D, width: number, height: number, data: Float32Array | null, offset: number) => {
    ctx.clearRect(0, 0, width, height);
    
    const rows = 24;
    const cols = 80;
    const perspective = 0.6;
    const baseY = height * 0.85;
    const terrainHeight = height * 0.7;
    const rowSpacing = terrainHeight / rows;
    
    const primaryColor = isPlaying ? [139, 92, 246] : [124, 82, 220];
    const accentColor = [20, 184, 166];
    
    for (let row = rows - 1; row >= 0; row--) {
      const rowProgress = row / rows;
      const yOffset = baseY - row * rowSpacing * perspective;
      const xScale = 1 - rowProgress * 0.3;
      const xOffset = (width * (1 - xScale)) / 2;
      const segmentWidth = (width * xScale) / cols;
      
      const alpha = 0.3 + rowProgress * 0.7;
      const depthFade = 1 - rowProgress * 0.5;
      
      ctx.beginPath();
      
      for (let col = 0; col <= cols; col++) {
        const x = xOffset + col * segmentWidth;
        let amplitude = 0;
        
        if (data) {
          const dataIndex = Math.floor(((col + offset) % cols) / cols * data.length);
          const nextIndex = Math.min(dataIndex + 1, data.length - 1);
          const t = (col / cols * data.length) % 1;
          amplitude = data[dataIndex] * (1 - t) + data[nextIndex] * t;
          amplitude = Math.abs(amplitude) * terrainHeight * 0.4 * depthFade;
          
          const waveOffset = Math.sin((col / cols + row / rows * 2 + offset * 0.02) * Math.PI * 4) * 3;
          amplitude += waveOffset * depthFade;
        } else {
          amplitude = Math.sin((col / cols + row / rows + offset * 0.01) * Math.PI * 4) * 8 * depthFade;
        }
        
        const y = yOffset - amplitude;
        
        if (col === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      
      ctx.lineTo(xOffset + cols * segmentWidth, baseY);
      ctx.lineTo(xOffset, baseY);
      ctx.closePath();
      
      const r = Math.round(primaryColor[0] * (1 - rowProgress * 0.3) + accentColor[0] * rowProgress * 0.3);
      const g = Math.round(primaryColor[1] * (1 - rowProgress * 0.3) + accentColor[1] * rowProgress * 0.3);
      const b = Math.round(primaryColor[2] * (1 - rowProgress * 0.3) + accentColor[2] * rowProgress * 0.3);
      
      const gradient = ctx.createLinearGradient(0, yOffset - terrainHeight * 0.4, 0, baseY);
      gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${alpha * 0.9})`);
      gradient.addColorStop(1, `rgba(${r * 0.3}, ${g * 0.3}, ${b * 0.3}, ${alpha * 0.5})`);
      
      ctx.fillStyle = gradient;
      ctx.fill();
      
      ctx.strokeStyle = `rgba(${r + 40}, ${g + 40}, ${b + 40}, ${alpha * 0.6})`;
      ctx.lineWidth = 0.5;
      ctx.stroke();
    }
    
    if (isPlaying) {
      const glowGradient = ctx.createRadialGradient(
        width / 2, height * 0.5, 0,
        width / 2, height * 0.5, width * 0.5
      );
      glowGradient.addColorStop(0, 'rgba(139, 92, 246, 0.15)');
      glowGradient.addColorStop(1, 'transparent');
      ctx.fillStyle = glowGradient;
      ctx.fillRect(0, 0, width, height);
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
      const samples = Math.min(256, channelData.length);
      data = new Float32Array(samples);
      const step = Math.max(1, Math.floor(channelData.length / samples));
      for (let i = 0; i < samples; i++) {
        let sum = 0;
        const start = Math.min(i * step, channelData.length - 1);
        const count = Math.min(step, channelData.length - start);
        for (let j = 0; j < count; j++) {
          sum += Math.abs(channelData[start + j] || 0);
        }
        data[i] = count > 0 ? sum / count : 0;
      }
    }
    
    const animate = () => {
      const rect = canvas.getBoundingClientRect();
      offsetRef.current += isPlaying ? 0.5 : 0.1;
      drawTerrain(ctx, rect.width, rect.height, data, offsetRef.current);
      animationRef.current = requestAnimationFrame(animate);
    };
    
    animate();
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [audioBuffer, isPlaying, drawTerrain]);

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
      />
      {!audioBuffer && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <span className="text-muted-foreground text-xs opacity-50">Trigger to preview</span>
        </div>
      )}
    </div>
  );
}
