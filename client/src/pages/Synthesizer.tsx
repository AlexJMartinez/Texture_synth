import { useState, useCallback, useRef, useEffect } from "react";
import { WaveformDisplay } from "@/components/synth/WaveformDisplay";
import { EnvelopePanel } from "@/components/synth/EnvelopePanel";
import { OscillatorPanel } from "@/components/synth/OscillatorPanel";
import { FilterPanel } from "@/components/synth/FilterPanel";
import { EffectsPanel } from "@/components/synth/EffectsPanel";
import { OutputPanel } from "@/components/synth/OutputPanel";
import { PresetPanel } from "@/components/synth/PresetPanel";
import { ExportPanel } from "@/components/synth/ExportPanel";
import { TriggerButton } from "@/components/synth/TriggerButton";
import { RandomizeControls } from "@/components/synth/RandomizeControls";
import { 
  type SynthParameters, 
  type ExportSettings,
  defaultSynthParameters, 
  defaultExportSettings 
} from "@shared/schema";
import { Zap } from "lucide-react";

export default function Synthesizer() {
  const [params, setParams] = useState<SynthParameters>(defaultSynthParameters);
  const [exportSettings, setExportSettings] = useState<ExportSettings>(defaultExportSettings);
  const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);

  const getAudioContext = useCallback(() => {
    if (!audioContextRef.current || audioContextRef.current.state === "closed") {
      audioContextRef.current = new AudioContext();
    }
    return audioContextRef.current;
  }, []);

  const applyBitcrusher = useCallback((buffer: AudioBuffer, bitDepth: number): void => {
    if (bitDepth >= 16) return;
    
    const step = Math.pow(0.5, bitDepth);
    const invStep = 1 / step;
    
    for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
      const data = buffer.getChannelData(channel);
      for (let i = 0; i < data.length; i++) {
        data[i] = Math.round(data[i] * invStep) * step;
      }
    }
  }, []);

  const generateSound = useCallback((
    ctx: AudioContext | OfflineAudioContext,
    params: SynthParameters,
    duration: number
  ): { source: OscillatorNode; gainNode: GainNode } => {
    const osc = ctx.createOscillator();
    osc.type = params.oscillator.waveform;
    osc.frequency.value = params.oscillator.pitch;
    osc.detune.value = params.oscillator.detune;

    const gainNode = ctx.createGain();
    gainNode.gain.value = 0.0001;

    let lastNode: AudioNode = osc;

    if (params.filter.enabled) {
      const filter = ctx.createBiquadFilter();
      filter.type = params.filter.type;
      filter.frequency.value = params.filter.frequency;
      filter.Q.value = params.filter.resonance;
      lastNode.connect(filter);
      lastNode = filter;
    }

    if (params.effects.saturation > 0) {
      const waveshaper = ctx.createWaveShaper();
      const amount = params.effects.saturation / 100;
      const samples = 44100;
      const curve = new Float32Array(samples);
      for (let i = 0; i < samples; i++) {
        const x = (i * 2) / samples - 1;
        curve[i] = (3 + amount * 10) * x * 20 * (Math.PI / 180) / 
          (Math.PI + amount * 10 * Math.abs(x));
      }
      waveshaper.curve = curve;
      waveshaper.oversample = "4x";
      lastNode.connect(waveshaper);
      lastNode = waveshaper;
    }

    const panNode = ctx.createStereoPanner();
    panNode.pan.value = params.output.pan / 100;
    lastNode.connect(panNode);

    panNode.connect(gainNode);
    gainNode.connect(ctx.destination);

    const now = ctx.currentTime;
    const attackEnd = now + params.envelope.attack / 1000;
    const holdEnd = attackEnd + params.envelope.hold / 1000;
    const decayEnd = holdEnd + params.envelope.decay / 1000;
    const volume = Math.max(0.0001, params.output.volume / 100);

    gainNode.gain.setValueAtTime(0.0001, now);
    
    if (params.envelope.curve === "exponential") {
      gainNode.gain.exponentialRampToValueAtTime(volume, attackEnd);
    } else {
      gainNode.gain.linearRampToValueAtTime(volume, attackEnd);
    }
    
    gainNode.gain.setValueAtTime(volume, holdEnd);
    
    if (params.envelope.curve === "exponential") {
      gainNode.gain.exponentialRampToValueAtTime(0.0001, decayEnd);
    } else if (params.envelope.curve === "logarithmic") {
      gainNode.gain.setTargetAtTime(0.0001, holdEnd, params.envelope.decay / 3000);
    } else {
      gainNode.gain.linearRampToValueAtTime(0.0001, decayEnd);
    }

    if (params.oscillator.drift > 0) {
      const driftAmount = params.oscillator.drift / 100;
      const driftLfo = ctx.createOscillator();
      const driftGain = ctx.createGain();
      driftLfo.frequency.value = 2 + Math.random() * 3;
      driftGain.gain.value = params.oscillator.pitch * 0.02 * driftAmount;
      driftLfo.connect(driftGain);
      driftGain.connect(osc.frequency);
      driftLfo.start(now);
      driftLfo.stop(now + duration / 1000);
    }

    osc.start(now);
    osc.stop(now + duration / 1000);

    return { source: osc, gainNode };
  }, []);

  const handleTrigger = useCallback(async () => {
    const ctx = getAudioContext();
    
    if (ctx.state === "suspended") {
      await ctx.resume();
    }

    setIsPlaying(true);

    const totalDuration = params.envelope.attack + params.envelope.hold + params.envelope.decay + 100;
    
    const { source } = generateSound(ctx, params, totalDuration);

    source.onended = () => {
      setIsPlaying(false);
    };

    const sampleRate = 44100;
    const offlineCtx = new OfflineAudioContext(1, (totalDuration / 1000) * sampleRate, sampleRate);
    generateSound(offlineCtx, params, totalDuration);
    
    const buffer = await offlineCtx.startRendering();
    
    if (params.effects.bitcrusher < 16) {
      applyBitcrusher(buffer, params.effects.bitcrusher);
    }
    
    setAudioBuffer(buffer);
  }, [params, getAudioContext, generateSound, applyBitcrusher]);

  const handleExport = useCallback(async () => {
    setIsExporting(true);

    try {
      const sampleRate = parseInt(exportSettings.sampleRate);
      const channels = exportSettings.channels === "stereo" ? 2 : 1;
      const duration = exportSettings.duration;

      const offlineCtx = new OfflineAudioContext(channels, (duration / 1000) * sampleRate, sampleRate);
      generateSound(offlineCtx, params, duration);
      
      const renderedBuffer = await offlineCtx.startRendering();

      if (params.effects.bitcrusher < 16) {
        applyBitcrusher(renderedBuffer, params.effects.bitcrusher);
      }

      let finalBuffer = renderedBuffer;
      if (exportSettings.normalize) {
        const data = renderedBuffer.getChannelData(0);
        let max = 0;
        for (let i = 0; i < data.length; i++) {
          max = Math.max(max, Math.abs(data[i]));
        }
        if (max > 0) {
          const normalizeRatio = 0.95 / max;
          for (let i = 0; i < data.length; i++) {
            data[i] *= normalizeRatio;
          }
        }
        if (channels === 2) {
          const dataR = renderedBuffer.getChannelData(1);
          let maxR = 0;
          for (let i = 0; i < dataR.length; i++) {
            maxR = Math.max(maxR, Math.abs(dataR[i]));
          }
          if (maxR > 0) {
            const normalizeRatioR = 0.95 / maxR;
            for (let i = 0; i < dataR.length; i++) {
              dataR[i] *= normalizeRatioR;
            }
          }
        }
      }

      const wavBlob = audioBufferToWav(finalBuffer);
      const url = URL.createObjectURL(wavBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `oneshot-${Date.now()}.wav`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Export failed:", err);
    } finally {
      setIsExporting(false);
    }
  }, [params, exportSettings, generateSound]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space" && !e.repeat) {
        e.preventDefault();
        handleTrigger();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleTrigger]);

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <header className="mb-6">
        <div className="flex items-center justify-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
            <Zap className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">OneShot Synth</h1>
            <p className="text-sm text-muted-foreground">Web Audio One-Shot Generator</p>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div className="lg:col-span-8 space-y-4">
            <div className="flex flex-col items-center gap-4 p-6 rounded-xl bg-card/50 border border-border">
              <TriggerButton onTrigger={handleTrigger} isPlaying={isPlaying} />
              <p className="text-xs text-muted-foreground">Press Space or click to trigger</p>
            </div>

            <WaveformDisplay 
              audioBuffer={audioBuffer} 
              isPlaying={isPlaying}
              className="h-32"
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <OscillatorPanel
                oscillator={params.oscillator}
                onChange={(osc) => setParams({ ...params, oscillator: osc })}
              />
              <EnvelopePanel
                envelope={params.envelope}
                onChange={(env) => setParams({ ...params, envelope: env })}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FilterPanel
                filter={params.filter}
                onChange={(filter) => setParams({ ...params, filter })}
              />
              <EffectsPanel
                effects={params.effects}
                onChange={(effects) => setParams({ ...params, effects })}
              />
              <OutputPanel
                output={params.output}
                onChange={(output) => setParams({ ...params, output })}
              />
            </div>
          </div>

          <div className="lg:col-span-4 space-y-4">
            <RandomizeControls
              currentParams={params}
              onRandomize={setParams}
            />
            <PresetPanel
              currentParams={params}
              onLoadPreset={setParams}
            />
            <ExportPanel
              settings={exportSettings}
              onChange={setExportSettings}
              onExport={handleExport}
              isExporting={isExporting}
            />
          </div>
        </div>
      </div>

      <footer className="mt-8 text-center">
        <p className="text-xs text-muted-foreground">
          OneShot Synth - Web Audio API powered synthesizer
        </p>
      </footer>
    </div>
  );
}

function audioBufferToWav(buffer: AudioBuffer): Blob {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const format = 1;
  const bitDepth = 16;

  const bytesPerSample = bitDepth / 8;
  const blockAlign = numChannels * bytesPerSample;

  const dataLength = buffer.length * blockAlign;
  const arrayBuffer = new ArrayBuffer(44 + dataLength);
  const view = new DataView(arrayBuffer);

  function writeString(offset: number, str: string) {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  }

  writeString(0, "RIFF");
  view.setUint32(4, 36 + dataLength, true);
  writeString(8, "WAVE");
  writeString(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, format, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitDepth, true);
  writeString(36, "data");
  view.setUint32(40, dataLength, true);

  const channels: Float32Array[] = [];
  for (let i = 0; i < numChannels; i++) {
    channels.push(buffer.getChannelData(i));
  }

  let offset = 44;
  for (let i = 0; i < buffer.length; i++) {
    for (let channel = 0; channel < numChannels; channel++) {
      const sample = Math.max(-1, Math.min(1, channels[channel][i]));
      const intSample = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
      view.setInt16(offset, intSample, true);
      offset += 2;
    }
  }

  return new Blob([arrayBuffer], { type: "audio/wav" });
}
