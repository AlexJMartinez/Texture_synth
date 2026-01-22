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
  type Oscillator,
  type Envelope,
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

  const createImpulseResponse = useCallback((ctx: BaseAudioContext, duration: number, decay: number): AudioBuffer => {
    const sampleRate = ctx.sampleRate;
    const length = Math.floor(sampleRate * duration);
    const impulse = ctx.createBuffer(2, length, sampleRate);
    
    for (let channel = 0; channel < 2; channel++) {
      const channelData = impulse.getChannelData(channel);
      for (let i = 0; i < length; i++) {
        const t = i / sampleRate;
        channelData[i] = (Math.random() * 2 - 1) * Math.exp(-t / decay);
      }
    }
    
    return impulse;
  }, []);

  const generateSound = useCallback((
    ctx: AudioContext | OfflineAudioContext,
    params: SynthParameters,
    duration: number
  ): { oscillators: OscillatorNode[]; masterGain: GainNode } => {
    const now = ctx.currentTime;
    const durationSec = duration / 1000;
    
    const masterGain = ctx.createGain();
    masterGain.gain.value = 0.0001;
    
    const panNode = ctx.createStereoPanner();
    panNode.pan.value = params.output.pan / 100;
    
    let lastNode: AudioNode = masterGain;
    
    if (params.filter.enabled) {
      if (params.filter.type === "comb") {
        const delay = ctx.createDelay();
        delay.delayTime.value = params.filter.combDelay / 1000;
        const feedback = ctx.createGain();
        feedback.gain.value = Math.min(0.95, params.filter.resonance / 30);
        const combGain = ctx.createGain();
        combGain.gain.value = 1;
        
        masterGain.connect(delay);
        delay.connect(feedback);
        feedback.connect(delay);
        delay.connect(combGain);
        masterGain.connect(combGain);
        lastNode = combGain;
      } else {
        const filter = ctx.createBiquadFilter();
        filter.type = params.filter.type as BiquadFilterType;
        filter.frequency.value = params.filter.frequency;
        filter.Q.value = params.filter.resonance;
        if (params.filter.type === "peaking" || params.filter.type === "lowshelf" || params.filter.type === "highshelf") {
          filter.gain.value = params.filter.gain;
        }
        masterGain.connect(filter);
        lastNode = filter;
        
        const ampEnv = params.envelopes.env1;
        const filterEnvs = [params.envelopes.env1, params.envelopes.env2, params.envelopes.env3]
          .filter(e => e.enabled && e.target === "filter");
        
        for (const env of filterEnvs) {
          const attackEnd = now + env.attack / 1000;
          const holdEnd = attackEnd + env.hold / 1000;
          const decayEnd = holdEnd + env.decay / 1000;
          const modAmount = (env.amount / 100) * (params.filter.frequency * 2);
          
          filter.frequency.setValueAtTime(params.filter.frequency, now);
          filter.frequency.linearRampToValueAtTime(
            Math.max(20, Math.min(20000, params.filter.frequency + modAmount)), 
            attackEnd
          );
          filter.frequency.setValueAtTime(
            Math.max(20, Math.min(20000, params.filter.frequency + modAmount)), 
            holdEnd
          );
          filter.frequency.linearRampToValueAtTime(params.filter.frequency, decayEnd);
        }
      }
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

    const dryGain = ctx.createGain();
    dryGain.gain.value = 1;
    lastNode.connect(dryGain);
    
    const effectsMixer = ctx.createGain();
    effectsMixer.gain.value = 1;
    dryGain.connect(effectsMixer);

    if (params.effects.delayEnabled && params.effects.delayMix > 0) {
      const delayNode = ctx.createDelay(3);
      delayNode.delayTime.value = params.effects.delayTime / 1000;
      const delayFeedback = ctx.createGain();
      delayFeedback.gain.value = params.effects.delayFeedback / 100;
      const delayWet = ctx.createGain();
      delayWet.gain.value = params.effects.delayMix / 100;
      
      lastNode.connect(delayNode);
      delayNode.connect(delayFeedback);
      delayFeedback.connect(delayNode);
      delayNode.connect(delayWet);
      delayWet.connect(effectsMixer);
    }

    if (params.effects.reverbEnabled && params.effects.reverbMix > 0) {
      const convolver = ctx.createConvolver();
      const reverbDuration = 0.5 + (params.effects.reverbSize / 100) * 3;
      convolver.buffer = createImpulseResponse(ctx, reverbDuration, params.effects.reverbDecay);
      const reverbWet = ctx.createGain();
      reverbWet.gain.value = params.effects.reverbMix / 100;
      
      lastNode.connect(convolver);
      convolver.connect(reverbWet);
      reverbWet.connect(effectsMixer);
    }

    if (params.effects.chorusEnabled && params.effects.chorusMix > 0) {
      const chorusDelay1 = ctx.createDelay();
      const chorusDelay2 = ctx.createDelay();
      chorusDelay1.delayTime.value = 0.02;
      chorusDelay2.delayTime.value = 0.025;
      
      const lfo1 = ctx.createOscillator();
      const lfo2 = ctx.createOscillator();
      lfo1.frequency.value = params.effects.chorusRate;
      lfo2.frequency.value = params.effects.chorusRate * 1.1;
      
      const lfoGain1 = ctx.createGain();
      const lfoGain2 = ctx.createGain();
      const depth = (params.effects.chorusDepth / 100) * 0.005;
      lfoGain1.gain.value = depth;
      lfoGain2.gain.value = depth;
      
      lfo1.connect(lfoGain1);
      lfoGain1.connect(chorusDelay1.delayTime);
      lfo2.connect(lfoGain2);
      lfoGain2.connect(chorusDelay2.delayTime);
      
      lfo1.start(now);
      lfo2.start(now);
      lfo1.stop(now + durationSec);
      lfo2.stop(now + durationSec);
      
      const chorusWet = ctx.createGain();
      chorusWet.gain.value = params.effects.chorusMix / 100;
      
      lastNode.connect(chorusDelay1);
      lastNode.connect(chorusDelay2);
      chorusDelay1.connect(chorusWet);
      chorusDelay2.connect(chorusWet);
      chorusWet.connect(effectsMixer);
    }

    effectsMixer.connect(panNode);
    panNode.connect(ctx.destination);

    const oscillators: OscillatorNode[] = [];
    const oscConfigs = [
      { osc: params.oscillators.osc1, key: "osc1" },
      { osc: params.oscillators.osc2, key: "osc2" },
      { osc: params.oscillators.osc3, key: "osc3" },
    ];

    for (const { osc, key } of oscConfigs) {
      if (!osc.enabled) continue;

      const oscNode = ctx.createOscillator();
      oscNode.type = osc.waveform;
      oscNode.frequency.value = osc.pitch;
      oscNode.detune.value = osc.detune;

      const oscGain = ctx.createGain();
      oscGain.gain.value = osc.level / 100;

      if (osc.fmEnabled && osc.fmDepth > 0) {
        const modOsc = ctx.createOscillator();
        modOsc.type = osc.fmWaveform;
        modOsc.frequency.value = osc.pitch * osc.fmRatio;
        
        const modGain = ctx.createGain();
        modGain.gain.value = osc.fmDepth;
        
        modOsc.connect(modGain);
        modGain.connect(oscNode.frequency);
        
        modOsc.start(now);
        modOsc.stop(now + durationSec);
      }

      const pitchEnvs = [params.envelopes.env1, params.envelopes.env2, params.envelopes.env3]
        .filter(e => e.enabled && e.target === "pitch");
      
      for (const env of pitchEnvs) {
        const attackEnd = now + env.attack / 1000;
        const holdEnd = attackEnd + env.hold / 1000;
        const decayEnd = holdEnd + env.decay / 1000;
        const modAmount = (env.amount / 100) * osc.pitch * 0.5;
        
        oscNode.frequency.setValueAtTime(osc.pitch, now);
        oscNode.frequency.linearRampToValueAtTime(
          Math.max(20, osc.pitch + modAmount), 
          attackEnd
        );
        oscNode.frequency.setValueAtTime(
          Math.max(20, osc.pitch + modAmount), 
          holdEnd
        );
        oscNode.frequency.linearRampToValueAtTime(osc.pitch, decayEnd);
      }

      const oscTargetEnvs = [params.envelopes.env1, params.envelopes.env2, params.envelopes.env3]
        .filter(e => e.enabled && e.target === key);
      
      for (const env of oscTargetEnvs) {
        const attackEnd = now + env.attack / 1000;
        const holdEnd = attackEnd + env.hold / 1000;
        const decayEnd = holdEnd + env.decay / 1000;
        const baseLevel = osc.level / 100;
        const modAmount = (env.amount / 100) * baseLevel;
        
        oscGain.gain.setValueAtTime(0.0001, now);
        oscGain.gain.linearRampToValueAtTime(Math.max(0.0001, baseLevel + modAmount), attackEnd);
        oscGain.gain.setValueAtTime(Math.max(0.0001, baseLevel + modAmount), holdEnd);
        oscGain.gain.linearRampToValueAtTime(0.0001, decayEnd);
      }

      if (osc.drift > 0) {
        const driftAmount = osc.drift / 100;
        const driftLfo = ctx.createOscillator();
        const driftGain = ctx.createGain();
        driftLfo.frequency.value = 2 + Math.random() * 3;
        driftGain.gain.value = osc.pitch * 0.02 * driftAmount;
        driftLfo.connect(driftGain);
        driftGain.connect(oscNode.frequency);
        driftLfo.start(now);
        driftLfo.stop(now + durationSec);
      }

      oscNode.connect(oscGain);
      oscGain.connect(masterGain);
      
      oscNode.start(now);
      oscNode.stop(now + durationSec);
      oscillators.push(oscNode);
    }

    const ampEnv = params.envelopes.env1;
    const attackEnd = now + ampEnv.attack / 1000;
    const holdEnd = attackEnd + ampEnv.hold / 1000;
    const decayEnd = holdEnd + ampEnv.decay / 1000;
    const volume = Math.max(0.0001, params.output.volume / 100);

    masterGain.gain.setValueAtTime(0.0001, now);
    
    if (ampEnv.curve === "exponential") {
      masterGain.gain.exponentialRampToValueAtTime(volume, attackEnd);
    } else {
      masterGain.gain.linearRampToValueAtTime(volume, attackEnd);
    }
    
    masterGain.gain.setValueAtTime(volume, holdEnd);
    
    if (ampEnv.curve === "exponential") {
      masterGain.gain.exponentialRampToValueAtTime(0.0001, decayEnd);
    } else if (ampEnv.curve === "logarithmic") {
      masterGain.gain.setTargetAtTime(0.0001, holdEnd, ampEnv.decay / 3000);
    } else {
      masterGain.gain.linearRampToValueAtTime(0.0001, decayEnd);
    }

    return { oscillators, masterGain };
  }, [createImpulseResponse]);

  const getTotalDuration = useCallback((params: SynthParameters): number => {
    const env1 = params.envelopes.env1;
    let baseDuration = env1.attack + env1.hold + env1.decay + 100;
    
    if (params.effects.delayEnabled) {
      baseDuration += params.effects.delayTime * 3;
    }
    if (params.effects.reverbEnabled) {
      baseDuration += params.effects.reverbDecay * 1000;
    }
    
    return Math.min(baseDuration, 10000);
  }, []);

  const handleTrigger = useCallback(async () => {
    const ctx = getAudioContext();
    
    if (ctx.state === "suspended") {
      await ctx.resume();
    }

    setIsPlaying(true);

    const totalDuration = getTotalDuration(params);
    
    const { oscillators } = generateSound(ctx, params, totalDuration);

    if (oscillators.length > 0) {
      oscillators[0].onended = () => {
        setIsPlaying(false);
      };
    }

    const sampleRate = 44100;
    const offlineCtx = new OfflineAudioContext(1, (totalDuration / 1000) * sampleRate, sampleRate);
    generateSound(offlineCtx, params, totalDuration);
    
    const buffer = await offlineCtx.startRendering();
    
    if (params.effects.bitcrusher < 16) {
      applyBitcrusher(buffer, params.effects.bitcrusher);
    }
    
    setAudioBuffer(buffer);
  }, [params, getAudioContext, generateSound, applyBitcrusher, getTotalDuration]);

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
        for (let channel = 0; channel < channels; channel++) {
          const data = renderedBuffer.getChannelData(channel);
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
  }, [params, exportSettings, generateSound, applyBitcrusher]);

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
    <div className="min-h-screen bg-background p-2">
      <header className="mb-2">
        <div className="flex items-center justify-center gap-2">
          <div className="w-6 h-6 rounded bg-primary/20 flex items-center justify-center">
            <Zap className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-foreground">OneShot Synth</h1>
            <p className="text-[10px] text-muted-foreground">Multi-Oscillator One-Shot Generator</p>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-2">
          <div className="lg:col-span-9 space-y-2">
            <div className="flex items-center gap-2">
              <div className="flex-shrink-0">
                <TriggerButton onTrigger={handleTrigger} isPlaying={isPlaying} size="sm" />
              </div>
              <WaveformDisplay 
                audioBuffer={audioBuffer} 
                isPlaying={isPlaying}
                className="h-16 flex-1"
              />
            </div>

            <div className="grid grid-cols-3 gap-2">
              <OscillatorPanel
                oscillator={params.oscillators.osc1}
                onChange={(osc) => setParams({ ...params, oscillators: { ...params.oscillators, osc1: osc } })}
                title="OSC 1"
                index={1}
              />
              <OscillatorPanel
                oscillator={params.oscillators.osc2}
                onChange={(osc) => setParams({ ...params, oscillators: { ...params.oscillators, osc2: osc } })}
                title="OSC 2"
                index={2}
              />
              <OscillatorPanel
                oscillator={params.oscillators.osc3}
                onChange={(osc) => setParams({ ...params, oscillators: { ...params.oscillators, osc3: osc } })}
                title="OSC 3"
                index={3}
              />
            </div>

            <div className="grid grid-cols-3 gap-2">
              <EnvelopePanel
                envelope={params.envelopes.env1}
                onChange={(env) => setParams({ ...params, envelopes: { ...params.envelopes, env1: env } })}
                title="ENV 1"
                index={1}
              />
              <EnvelopePanel
                envelope={params.envelopes.env2}
                onChange={(env) => setParams({ ...params, envelopes: { ...params.envelopes, env2: env } })}
                title="ENV 2"
                index={2}
              />
              <EnvelopePanel
                envelope={params.envelopes.env3}
                onChange={(env) => setParams({ ...params, envelopes: { ...params.envelopes, env3: env } })}
                title="ENV 3"
                index={3}
              />
            </div>

            <div className="grid grid-cols-3 gap-2">
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

          <div className="lg:col-span-3 space-y-2">
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
