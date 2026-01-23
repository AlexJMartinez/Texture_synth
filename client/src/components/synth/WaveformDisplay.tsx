import { useRef, useEffect, useState } from "react";
import WaveSurfer from "wavesurfer.js";

interface WaveformDisplayProps {
  audioBuffer: AudioBuffer | null;
  isPlaying?: boolean;
  className?: string;
}

export function WaveformDisplay({ audioBuffer, isPlaying, className = "" }: WaveformDisplayProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const wavesurferRef = useRef<WaveSurfer | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    if (!containerRef.current) return;

    if (wavesurferRef.current) {
      wavesurferRef.current.destroy();
    }

    wavesurferRef.current = WaveSurfer.create({
      container: containerRef.current,
      waveColor: "hsl(280, 70%, 55%)",
      progressColor: "hsl(175, 70%, 50%)",
      cursorColor: "transparent",
      barWidth: 2,
      barGap: 1,
      barRadius: 2,
      height: "auto",
      normalize: true,
      interact: false,
      hideScrollbar: true,
      fillParent: true,
      minPxPerSec: 50,
    });

    setIsInitialized(true);

    return () => {
      if (wavesurferRef.current) {
        wavesurferRef.current.destroy();
        wavesurferRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!wavesurferRef.current || !audioBuffer || !isInitialized) return;

    const channelData = audioBuffer.getChannelData(0);
    const secondChannel = audioBuffer.numberOfChannels > 1 
      ? audioBuffer.getChannelData(1) 
      : channelData;

    wavesurferRef.current.load("", [channelData, secondChannel], audioBuffer.duration);
  }, [audioBuffer, isInitialized]);

  useEffect(() => {
    if (!wavesurferRef.current) return;

    if (isPlaying) {
      wavesurferRef.current.setOptions({
        waveColor: "hsl(280, 70%, 65%)",
        progressColor: "hsl(175, 70%, 60%)",
      });
    } else {
      wavesurferRef.current.setOptions({
        waveColor: "hsl(280, 70%, 55%)",
        progressColor: "hsl(175, 70%, 50%)",
      });
    }
  }, [isPlaying]);

  return (
    <div 
      className={`relative w-full rounded-md overflow-hidden ${className}`}
      style={{
        background: 'linear-gradient(to bottom, hsl(var(--card)), hsl(var(--background)))',
        boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.4)',
      }}
      data-testid="waveform-display"
    >
      <div 
        ref={containerRef} 
        className="w-full h-full"
      />
      {!audioBuffer && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-muted-foreground text-xs">Trigger to preview waveform</span>
        </div>
      )}
      {isPlaying && (
        <div 
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse at center, hsl(280, 70%, 55%, 0.15) 0%, transparent 70%)',
          }}
        />
      )}
    </div>
  );
}
