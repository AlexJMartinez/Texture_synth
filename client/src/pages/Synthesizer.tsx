import { useState, useCallback, useRef, useEffect } from "react";
import * as Tone from "tone";
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
import { SynthEngineSelector } from "@/components/synth/SynthEngineSelector";
import { WaveshaperPanel } from "@/components/synth/WaveshaperPanel";
import { ConvolverPanel } from "@/components/synth/ConvolverPanel";
import { ClickLayerPanel } from "@/components/synth/ClickLayerPanel";
import { SubOscillatorPanel } from "@/components/synth/SubOscillatorPanel";
import { SaturationChainPanel } from "@/components/synth/SaturationChainPanel";
import { MasteringPanel } from "@/components/synth/MasteringPanel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  type SynthParameters, 
  type ExportSettings,
  type WaveshaperCurve,
  defaultSynthParameters, 
  defaultExportSettings 
} from "@shared/schema";
import { pitchToHz } from "@/lib/pitchUtils";
import { Zap } from "lucide-react";

const IR_STORAGE_KEY = "synth-custom-irs";

function createWaveshaperCurve(type: WaveshaperCurve, drive: number): Float32Array {
  const samples = 8192;
  const curve = new Float32Array(samples);
  const amount = (drive / 100) * 10;
  
  for (let i = 0; i < samples; i++) {
    const x = (i * 2) / samples - 1;
    
    switch (type) {
      case "softclip":
        curve[i] = Math.tanh(x * (1 + amount * 2));
        break;
      case "hardclip":
        const threshold = 1 / (1 + amount);
        curve[i] = Math.max(-threshold, Math.min(threshold, x)) * (1 / threshold);
        break;
      case "foldback":
        let folded = x * (1 + amount * 3);
        while (Math.abs(folded) > 1) {
          if (folded > 1) folded = 2 - folded;
          else if (folded < -1) folded = -2 - folded;
        }
        curve[i] = folded;
        break;
      case "sinefold":
        curve[i] = Math.sin(x * Math.PI * (1 + amount * 2));
        break;
      case "chebyshev":
        const order = Math.floor(2 + amount * 8);
        curve[i] = chebyshev(x, order);
        break;
      case "asymmetric":
        if (x >= 0) {
          curve[i] = Math.tanh(x * (1 + amount * 4));
        } else {
          curve[i] = Math.tanh(x * (1 + amount));
        }
        break;
      case "tube":
        const k = amount * 5 + 1;
        curve[i] = (1 + k) * x / (1 + k * Math.abs(x));
        break;
      default:
        curve[i] = x;
    }
  }
  
  return curve;
}

function chebyshev(x: number, order: number): number {
  if (order === 0) return 1;
  if (order === 1) return x;
  let t0 = 1, t1 = x;
  for (let i = 2; i <= order; i++) {
    const t2 = 2 * x * t1 - t0;
    t0 = t1;
    t1 = t2;
  }
  return t1;
}

async function loadStoredIR(name: string): Promise<AudioBuffer | null> {
  try {
    const stored = localStorage.getItem(IR_STORAGE_KEY);
    if (!stored) return null;
    
    const irs = JSON.parse(stored);
    const ir = irs.find((ir: { name: string; data: string }) => ir.name === name);
    if (!ir) return null;
    
    const binaryString = atob(ir.data);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    
    // Use Tone.js context for decoding audio data
    await Tone.start();
    const toneContext = Tone.getContext();
    const audioBuffer = await toneContext.decodeAudioData(bytes.buffer.slice(0));
    
    return audioBuffer;
  } catch (error) {
    console.error("Failed to load stored IR:", error);
    return null;
  }
}

export default function Synthesizer() {
  const [params, setParams] = useState<SynthParameters>(defaultSynthParameters);
  const [exportSettings, setExportSettings] = useState<ExportSettings>(defaultExportSettings);
  const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const customIRBufferRef = useRef<AudioBuffer | null>(null);
  const activeSourcesRef = useRef<AudioScheduledSourceNode[]>([]);
  const activeFadeGainRef = useRef<GainNode | null>(null);
  const playTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleIRLoaded = useCallback((buffer: AudioBuffer) => {
    customIRBufferRef.current = buffer;
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

  const generateSound = useCallback(async (
    ctx: AudioContext | OfflineAudioContext,
    params: SynthParameters,
    duration: number,
    fadeGain?: GainNode,
    sourcesCollector?: AudioScheduledSourceNode[]
  ): Promise<{ masterGain: GainNode; fadeGain: GainNode }> => {
    const now = ctx.currentTime;
    const durationSec = duration / 1000;
    
    const masterGain = ctx.createGain();
    masterGain.gain.value = 0.0001;
    
    const outputFadeGain = fadeGain || ctx.createGain();
    if (!fadeGain) {
      outputFadeGain.gain.setValueAtTime(0, now);
      outputFadeGain.gain.linearRampToValueAtTime(1, now + 0.002);
    }
    
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

    if (params.waveshaper.enabled) {
      const waveshaper = ctx.createWaveShaper();
      waveshaper.curve = createWaveshaperCurve(params.waveshaper.curve, params.waveshaper.drive);
      waveshaper.oversample = params.waveshaper.oversample;
      
      if (params.waveshaper.preFilterEnabled) {
        const preFilter = ctx.createBiquadFilter();
        preFilter.type = "highpass";
        preFilter.frequency.value = params.waveshaper.preFilterFreq;
        lastNode.connect(preFilter);
        lastNode = preFilter;
      }
      
      if (params.waveshaper.mix < 100) {
        const dryGain = ctx.createGain();
        const wetGain = ctx.createGain();
        const mixNode = ctx.createGain();
        dryGain.gain.value = 1 - params.waveshaper.mix / 100;
        wetGain.gain.value = params.waveshaper.mix / 100;
        
        lastNode.connect(dryGain);
        lastNode.connect(waveshaper);
        waveshaper.connect(wetGain);
        dryGain.connect(mixNode);
        wetGain.connect(mixNode);
        lastNode = mixNode;
      } else {
        lastNode.connect(waveshaper);
        lastNode = waveshaper;
      }
      
      if (params.waveshaper.postFilterEnabled) {
        const postFilter = ctx.createBiquadFilter();
        postFilter.type = "lowpass";
        postFilter.frequency.value = params.waveshaper.postFilterFreq;
        lastNode.connect(postFilter);
        lastNode = postFilter;
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

    if (params.convolver.enabled && params.convolver.useCustomIR && params.convolver.irName !== "none") {
      let irBuffer = customIRBufferRef.current;
      if (!irBuffer || params.convolver.irName !== "current") {
        irBuffer = await loadStoredIR(params.convolver.irName);
      }
      
      if (irBuffer) {
        const convolver = ctx.createConvolver();
        const irCopy = ctx.createBuffer(irBuffer.numberOfChannels, irBuffer.length, irBuffer.sampleRate);
        for (let ch = 0; ch < irBuffer.numberOfChannels; ch++) {
          irCopy.copyToChannel(irBuffer.getChannelData(ch), ch);
        }
        convolver.buffer = irCopy;
        
        const convolverWet = ctx.createGain();
        const convolverDry = ctx.createGain();
        convolverWet.gain.value = params.convolver.mix / 100;
        convolverDry.gain.value = 1 - params.convolver.mix / 100;
        
        lastNode.connect(convolver);
        convolver.connect(convolverWet);
        lastNode.connect(convolverDry);
        
        const convolverMix = ctx.createGain();
        convolverWet.connect(convolverMix);
        convolverDry.connect(convolverMix);
        convolverMix.connect(effectsMixer);
      }
    } else if (params.effects.reverbEnabled && params.effects.reverbMix > 0) {
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

    let outputNode: AudioNode = effectsMixer;

    if (params.effects.transientEnabled) {
      const transientGain = ctx.createGain();
      const attackAmount = params.effects.transientAttack / 100;
      const sustainAmount = params.effects.transientSustain / 100;
      
      const transientDuration = 0.05;
      
      if (attackAmount > 0) {
        transientGain.gain.setValueAtTime(1 + attackAmount * 0.5, now);
        transientGain.gain.linearRampToValueAtTime(1, now + transientDuration);
      } else if (attackAmount < 0) {
        transientGain.gain.setValueAtTime(1 + attackAmount * 0.5, now);
        transientGain.gain.linearRampToValueAtTime(1, now + transientDuration);
      } else {
        transientGain.gain.setValueAtTime(1, now);
      }
      
      if (sustainAmount !== 0) {
        transientGain.gain.linearRampToValueAtTime(1 + sustainAmount * 0.3, now + transientDuration + 0.01);
      }
      
      outputNode.connect(transientGain);
      outputNode = transientGain;
    }

    if (params.effects.multibandEnabled) {
      const lowFilter = ctx.createBiquadFilter();
      lowFilter.type = "lowpass";
      lowFilter.frequency.value = params.effects.multibandLowFreq;
      
      const midFilterLow = ctx.createBiquadFilter();
      midFilterLow.type = "highpass";
      midFilterLow.frequency.value = params.effects.multibandLowFreq;
      const midFilterHigh = ctx.createBiquadFilter();
      midFilterHigh.type = "lowpass";
      midFilterHigh.frequency.value = params.effects.multibandHighFreq;
      
      const highFilter = ctx.createBiquadFilter();
      highFilter.type = "highpass";
      highFilter.frequency.value = params.effects.multibandHighFreq;
      
      const createWaveshaper = (drive: number) => {
        const shaper = ctx.createWaveShaper();
        const amount = (drive / 100) * 5;
        const samples = 256;
        const curve = new Float32Array(samples);
        for (let i = 0; i < samples; i++) {
          const x = (i * 2) / samples - 1;
          curve[i] = (Math.PI + amount) * x / (Math.PI + amount * Math.abs(x));
        }
        shaper.curve = curve;
        return shaper;
      };
      
      const lowShaper = createWaveshaper(params.effects.multibandLowDrive);
      const midShaper = createWaveshaper(params.effects.multibandMidDrive);
      const highShaper = createWaveshaper(params.effects.multibandHighDrive);
      
      const bandMixer = ctx.createGain();
      bandMixer.gain.value = 1;
      
      outputNode.connect(lowFilter);
      lowFilter.connect(lowShaper);
      lowShaper.connect(bandMixer);
      
      outputNode.connect(midFilterLow);
      midFilterLow.connect(midFilterHigh);
      midFilterHigh.connect(midShaper);
      midShaper.connect(bandMixer);
      
      outputNode.connect(highFilter);
      highFilter.connect(highShaper);
      highShaper.connect(bandMixer);
      
      outputNode = bandMixer;
    }

    if (params.saturationChain.enabled) {
      const sat = params.saturationChain;
      let satInput = outputNode;
      let satNode: AudioNode = outputNode;
      
      if (sat.tapeEnabled && sat.tapeDrive > 0) {
        const tapeShaper = ctx.createWaveShaper();
        const tapeDrive = sat.tapeDrive / 100;
        const tapeWarmth = sat.tapeWarmth / 100;
        const tapeCurve = new Float32Array(4096);
        for (let i = 0; i < tapeCurve.length; i++) {
          const x = (i * 2) / tapeCurve.length - 1;
          const softClip = Math.tanh(x * (1 + tapeDrive * 2));
          const warmth = x > 0 ? softClip * (1 - tapeWarmth * 0.2) : softClip * (1 + tapeWarmth * 0.1);
          tapeCurve[i] = warmth;
        }
        tapeShaper.curve = tapeCurve;
        tapeShaper.oversample = "2x";
        satNode.connect(tapeShaper);
        satNode = tapeShaper;
      }
      
      if (sat.tubeEnabled && sat.tubeDrive > 0) {
        const tubeShaper = ctx.createWaveShaper();
        const tubeDrive = sat.tubeDrive / 100;
        const tubeBias = (sat.tubeBias / 100 - 0.5) * 0.3;
        const tubeCurve = new Float32Array(4096);
        for (let i = 0; i < tubeCurve.length; i++) {
          const x = (i * 2) / tubeCurve.length - 1 + tubeBias;
          const k = tubeDrive * 10 + 1;
          tubeCurve[i] = (1 + k) * x / (1 + k * Math.abs(x));
        }
        tubeShaper.curve = tubeCurve;
        tubeShaper.oversample = "2x";
        satNode.connect(tubeShaper);
        satNode = tubeShaper;
      }
      
      if (sat.transistorEnabled && sat.transistorDrive > 0) {
        const transShaper = ctx.createWaveShaper();
        const transDrive = sat.transistorDrive / 100;
        const transAsym = sat.transistorAsymmetry / 100;
        const transCurve = new Float32Array(4096);
        for (let i = 0; i < transCurve.length; i++) {
          const x = (i * 2) / transCurve.length - 1;
          if (x >= 0) {
            transCurve[i] = Math.tanh(x * (1 + transDrive * 5));
          } else {
            transCurve[i] = Math.tanh(x * (1 + transDrive * 5 * (1 + transAsym)));
          }
        }
        transShaper.curve = transCurve;
        transShaper.oversample = "2x";
        satNode.connect(transShaper);
        satNode = transShaper;
      }
      
      if (sat.mix < 100) {
        const dryGain = ctx.createGain();
        const wetGain = ctx.createGain();
        const satMixer = ctx.createGain();
        dryGain.gain.value = 1 - sat.mix / 100;
        wetGain.gain.value = sat.mix / 100;
        satInput.connect(dryGain);
        satNode.connect(wetGain);
        dryGain.connect(satMixer);
        wetGain.connect(satMixer);
        outputNode = satMixer;
      } else {
        outputNode = satNode;
      }
    }

    if (params.mastering.compressorEnabled) {
      const comp = ctx.createDynamicsCompressor();
      comp.threshold.value = params.mastering.compressorThreshold;
      comp.knee.value = params.mastering.compressorKnee;
      comp.ratio.value = params.mastering.compressorRatio;
      comp.attack.value = params.mastering.compressorAttack / 1000;
      comp.release.value = params.mastering.compressorRelease / 1000;
      
      const makeup = ctx.createGain();
      makeup.gain.value = Math.pow(10, params.mastering.compressorMakeup / 20);
      
      outputNode.connect(comp);
      comp.connect(makeup);
      outputNode = makeup;
    }

    if (params.mastering.exciterEnabled && params.mastering.exciterAmount > 0) {
      const exciterHPF = ctx.createBiquadFilter();
      exciterHPF.type = "highpass";
      exciterHPF.frequency.value = params.mastering.exciterFreq;
      exciterHPF.Q.value = 0.5;
      
      const exciterShaper = ctx.createWaveShaper();
      const exciterAmount = params.mastering.exciterAmount / 100;
      const exciterCurve = new Float32Array(256);
      for (let i = 0; i < exciterCurve.length; i++) {
        const x = (i * 2) / exciterCurve.length - 1;
        exciterCurve[i] = Math.tanh(x * (1 + exciterAmount * 5)) + x * exciterAmount * 0.5;
      }
      exciterShaper.curve = exciterCurve;
      
      const exciterGain = ctx.createGain();
      exciterGain.gain.value = (params.mastering.exciterMix / 100) * 0.5;
      
      const exciterMixer = ctx.createGain();
      exciterMixer.gain.value = 1;
      
      outputNode.connect(exciterHPF);
      exciterHPF.connect(exciterShaper);
      exciterShaper.connect(exciterGain);
      outputNode.connect(exciterMixer);
      exciterGain.connect(exciterMixer);
      
      outputNode = exciterMixer;
    }

    if (params.mastering.stereoEnabled && params.output.pan === 0) {
      const widthAmount = (params.mastering.stereoWidth - 100) / 100;
      
      const splitter = ctx.createChannelSplitter(2);
      const merger = ctx.createChannelMerger(2);
      
      const leftGain = ctx.createGain();
      const rightGain = ctx.createGain();
      const leftCross = ctx.createGain();
      const rightCross = ctx.createGain();
      
      const sideAmount = Math.max(0, widthAmount);
      const narrowAmount = Math.max(0, -widthAmount);
      
      leftGain.gain.value = 1 - narrowAmount * 0.5;
      rightGain.gain.value = 1 - narrowAmount * 0.5;
      leftCross.gain.value = narrowAmount * 0.5 + sideAmount * 0.3;
      rightCross.gain.value = narrowAmount * 0.5 - sideAmount * 0.3;
      
      outputNode.connect(splitter);
      
      splitter.connect(leftGain, 0);
      splitter.connect(rightGain, 1);
      splitter.connect(leftCross, 1);
      splitter.connect(rightCross, 0);
      
      const leftMix = ctx.createGain();
      const rightMix = ctx.createGain();
      leftGain.connect(leftMix);
      leftCross.connect(leftMix);
      rightGain.connect(rightMix);
      rightCross.connect(rightMix);
      
      leftMix.connect(merger, 0, 0);
      rightMix.connect(merger, 0, 1);
      
      outputNode = merger;
    }

    if (params.effects.limiterEnabled) {
      const limiter = ctx.createDynamicsCompressor();
      limiter.threshold.value = params.effects.limiterThreshold;
      limiter.knee.value = 0;
      limiter.ratio.value = 20;
      limiter.attack.value = 0.001;
      limiter.release.value = params.effects.limiterRelease / 1000;
      
      outputNode.connect(limiter);
      outputNode = limiter;
    }

    outputNode.connect(panNode);
    panNode.connect(outputFadeGain);
    outputFadeGain.connect(ctx.destination);

    const oscConfigs = [
      { osc: params.oscillators.osc1, key: "osc1" },
      { osc: params.oscillators.osc2, key: "osc2" },
      { osc: params.oscillators.osc3, key: "osc3" },
    ];

    for (const { osc, key } of oscConfigs) {
      if (!osc.enabled) continue;

      const oscGain = ctx.createGain();
      oscGain.gain.value = osc.level / 100;
      const oscPitchHz = pitchToHz(osc.pitch);
      
      let sourceNode: AudioScheduledSourceNode;
      let frequencyParam: AudioParam | null = null;

      if (osc.waveform === "noise") {
        const bufferSize = Math.ceil(ctx.sampleRate * durationSec);
        const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const noiseData = noiseBuffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          noiseData[i] = Math.random() * 2 - 1;
        }
        const noiseSource = ctx.createBufferSource();
        noiseSource.buffer = noiseBuffer;
        noiseSource.connect(oscGain);
        sourceNode = noiseSource;
      } else {
        const oscNode = ctx.createOscillator();
        oscNode.type = osc.waveform as OscillatorType;
        oscNode.frequency.value = oscPitchHz;
        oscNode.detune.value = osc.detune;
        frequencyParam = oscNode.frequency;

        if (osc.fmEnabled && osc.fmDepth > 0 && osc.fmWaveform !== "noise") {
          const modOsc = ctx.createOscillator();
          modOsc.type = osc.fmWaveform as OscillatorType;
          modOsc.frequency.value = oscPitchHz * osc.fmRatio;
          
          const modGain = ctx.createGain();
          let fmDepthValue = osc.fmDepth;
          
          if (osc.indexEnvEnabled && osc.indexEnvDepth > 0) {
            const baseDepth = osc.fmDepth;
            const peakDepth = baseDepth + (osc.indexEnvDepth * 50);
            modGain.gain.setValueAtTime(peakDepth, now);
            modGain.gain.exponentialRampToValueAtTime(
              Math.max(baseDepth, 0.01), 
              now + osc.indexEnvDecay / 1000
            );
          } else {
            modGain.gain.value = fmDepthValue;
          }
          
          modOsc.connect(modGain);
          modGain.connect(oscNode.frequency);
          
          if (osc.fmFeedback > 0) {
            const feedbackGain = ctx.createGain();
            feedbackGain.gain.value = osc.fmFeedback * osc.fmDepth * 0.5;
            modOsc.connect(feedbackGain);
            feedbackGain.connect(modOsc.frequency);
          }
          
          modOsc.start(now);
          modOsc.stop(now + durationSec);
        }

        if (osc.pmEnabled && osc.pmDepth > 0 && osc.pmWaveform !== "noise") {
          const pmModOsc = ctx.createOscillator();
          pmModOsc.type = osc.pmWaveform as OscillatorType;
          pmModOsc.frequency.value = oscPitchHz * osc.pmRatio;
          
          const pmModGain = ctx.createGain();
          const pmIndex = osc.pmDepth * 100;
          
          if (osc.indexEnvEnabled && osc.indexEnvDepth > 0) {
            const basePmDepth = pmIndex;
            const peakPmDepth = basePmDepth + (osc.indexEnvDepth * 100);
            pmModGain.gain.setValueAtTime(peakPmDepth, now);
            pmModGain.gain.exponentialRampToValueAtTime(
              Math.max(basePmDepth, 0.01),
              now + osc.indexEnvDecay / 1000
            );
          } else {
            pmModGain.gain.value = pmIndex;
          }
          
          pmModOsc.connect(pmModGain);
          pmModGain.connect(oscNode.frequency);
          
          if (osc.pmFeedback > 0) {
            const pmFeedbackGain = ctx.createGain();
            pmFeedbackGain.gain.value = osc.pmFeedback * pmIndex * 0.3;
            pmModOsc.connect(pmFeedbackGain);
            pmFeedbackGain.connect(pmModOsc.frequency);
          }
          
          pmModOsc.start(now);
          pmModOsc.stop(now + durationSec);
        }

        oscNode.connect(oscGain);
        sourceNode = oscNode;
      }

      let finalGain = oscGain;
      if (osc.amEnabled && osc.amDepth > 0 && osc.amWaveform !== "noise") {
        const depth = osc.amDepth / 100;
        
        const amModOsc = ctx.createOscillator();
        amModOsc.type = osc.amWaveform as OscillatorType;
        amModOsc.frequency.value = oscPitchHz * osc.amRatio;
        
        const amModGain = ctx.createGain();
        amModGain.gain.value = depth * 0.5;
        
        const amOutputGain = ctx.createGain();
        amOutputGain.gain.value = 1 - depth * 0.5;
        
        amModOsc.connect(amModGain);
        amModGain.connect(amOutputGain.gain);
        
        oscGain.disconnect();
        oscGain.connect(amOutputGain);
        finalGain = amOutputGain;
        
        amModOsc.start(now);
        amModOsc.stop(now + durationSec);
      }

      if (frequencyParam) {
        const pitchEnvs = [params.envelopes.env1, params.envelopes.env2, params.envelopes.env3]
          .filter(e => e.enabled && e.target === "pitch");
        
        for (const env of pitchEnvs) {
          const attackEnd = now + env.attack / 1000;
          const holdEnd = attackEnd + env.hold / 1000;
          const decayEnd = holdEnd + env.decay / 1000;
          const modAmount = (env.amount / 100) * oscPitchHz * 0.5;
          
          frequencyParam.setValueAtTime(oscPitchHz, now);
          frequencyParam.linearRampToValueAtTime(
            Math.max(20, oscPitchHz + modAmount), 
            attackEnd
          );
          frequencyParam.setValueAtTime(
            Math.max(20, oscPitchHz + modAmount), 
            holdEnd
          );
          frequencyParam.linearRampToValueAtTime(oscPitchHz, decayEnd);
        }

        if (osc.drift > 0) {
          const driftAmount = osc.drift / 100;
          const driftLfo = ctx.createOscillator();
          const driftGain = ctx.createGain();
          driftLfo.frequency.value = 2 + Math.random() * 3;
          driftGain.gain.value = oscPitchHz * 0.02 * driftAmount;
          driftLfo.connect(driftGain);
          driftGain.connect(frequencyParam);
          driftLfo.start(now);
          driftLfo.stop(now + durationSec);
        }
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

      finalGain.connect(masterGain);
      
      sourceNode.start(now);
      sourceNode.stop(now + durationSec);
      if (sourcesCollector) {
        sourcesCollector.push(sourceNode);
      }
    }

    if (params.clickLayer.enabled && params.clickLayer.level > 0) {
      const click = params.clickLayer;
      const clickDecay = click.decay / 1000;
      const clickBufferLength = Math.ceil(ctx.sampleRate * (clickDecay + 0.005));
      const clickBuffer = ctx.createBuffer(1, clickBufferLength, ctx.sampleRate);
      const clickData = clickBuffer.getChannelData(0);
      
      if (click.noiseType === "white") {
        for (let i = 0; i < clickBufferLength; i++) {
          clickData[i] = Math.random() * 2 - 1;
        }
      } else if (click.noiseType === "pink") {
        let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
        for (let i = 0; i < clickBufferLength; i++) {
          const white = Math.random() * 2 - 1;
          b0 = 0.99886 * b0 + white * 0.0555179;
          b1 = 0.99332 * b1 + white * 0.0750759;
          b2 = 0.96900 * b2 + white * 0.1538520;
          b3 = 0.86650 * b3 + white * 0.3104856;
          b4 = 0.55000 * b4 + white * 0.5329522;
          b5 = -0.7616 * b5 - white * 0.0168980;
          clickData[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
          b6 = white * 0.115926;
        }
      } else if (click.noiseType === "brown") {
        let lastOut = 0;
        for (let i = 0; i < clickBufferLength; i++) {
          const white = Math.random() * 2 - 1;
          lastOut = (lastOut + (0.02 * white)) / 1.02;
          clickData[i] = lastOut * 3.5;
        }
      }
      
      const clickSource = ctx.createBufferSource();
      clickSource.buffer = clickBuffer;
      
      const clickFilter = ctx.createBiquadFilter();
      clickFilter.type = click.filterType;
      clickFilter.frequency.value = click.filterFreq;
      clickFilter.Q.value = click.filterQ;
      
      let clickNode: AudioNode = clickFilter;
      
      if (click.srrEnabled) {
        const srrSamples = Math.pow(2, 16 - click.srrAmount);
        const srrShaper = ctx.createWaveShaper();
        const srrCurve = new Float32Array(65536);
        for (let i = 0; i < srrCurve.length; i++) {
          const x = (i / 32768) - 1;
          srrCurve[i] = Math.round(x * srrSamples) / srrSamples;
        }
        srrShaper.curve = srrCurve;
        clickFilter.connect(srrShaper);
        clickNode = srrShaper;
      }
      
      const clickGain = ctx.createGain();
      const clickLevel = (click.level / 100) * 0.8;
      clickGain.gain.setValueAtTime(clickLevel, now);
      clickGain.gain.exponentialRampToValueAtTime(0.0001, now + clickDecay);
      
      clickSource.connect(clickFilter);
      clickNode.connect(clickGain);
      clickGain.connect(masterGain);
      
      clickSource.start(now);
      clickSource.stop(now + clickDecay + 0.01);
      if (sourcesCollector) {
        sourcesCollector.push(clickSource);
      }
    }

    if (params.subOsc.enabled && params.subOsc.level > 0) {
      const sub = params.subOsc;
      const baseFreq = pitchToHz(params.oscillators.osc1.pitch);
      const subFreq = baseFreq * Math.pow(2, sub.octave);
      
      const subOsc = ctx.createOscillator();
      subOsc.type = sub.waveform;
      subOsc.frequency.value = Math.max(20, Math.min(200, subFreq));
      
      let subNode: AudioNode = subOsc;
      
      if (sub.filterEnabled) {
        const subFilter = ctx.createBiquadFilter();
        subFilter.type = "lowpass";
        subFilter.frequency.value = sub.filterFreq;
        subFilter.Q.value = 0.707;
        subOsc.connect(subFilter);
        subNode = subFilter;
      }
      
      const subGain = ctx.createGain();
      const subLevel = (sub.level / 100) * 0.6;
      const subAttack = sub.attack / 1000;
      const subDecay = sub.decay / 1000;
      
      subGain.gain.setValueAtTime(0.0001, now);
      subGain.gain.linearRampToValueAtTime(subLevel, now + subAttack);
      subGain.gain.exponentialRampToValueAtTime(0.0001, now + subAttack + subDecay);
      
      subNode.connect(subGain);
      subGain.connect(masterGain);
      
      subOsc.start(now);
      subOsc.stop(now + subAttack + subDecay + 0.1);
      if (sourcesCollector) {
        sourcesCollector.push(subOsc);
      }
    }

    if (params.modal.enabled) {
      const modal = params.modal;
      const modeConfigs = [
        { mode: modal.modes.mode1, key: "mode1" },
        { mode: modal.modes.mode2, key: "mode2" },
        { mode: modal.modes.mode3, key: "mode3" },
        { mode: modal.modes.mode4, key: "mode4" },
      ];

      if (modal.impactNoise > 0) {
        const noiseBuffer = ctx.createBuffer(1, ctx.sampleRate * 0.1, ctx.sampleRate);
        const noiseData = noiseBuffer.getChannelData(0);
        for (let i = 0; i < noiseData.length; i++) {
          noiseData[i] = (Math.random() * 2 - 1);
        }
        
        const noiseSource = ctx.createBufferSource();
        noiseSource.buffer = noiseBuffer;
        
        const noiseGain = ctx.createGain();
        const noiseLevel = modal.impactNoise / 100;
        noiseGain.gain.setValueAtTime(noiseLevel * 0.5, now);
        noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + modal.impactDecay / 1000);
        
        noiseSource.connect(noiseGain);
        noiseGain.connect(masterGain);
        noiseSource.start(now);
        noiseSource.stop(now + 0.1);
      }

      for (const { mode } of modeConfigs) {
        if (mode.level === 0) continue;
        
        const modeOsc = ctx.createOscillator();
        modeOsc.type = "sine";
        modeOsc.frequency.value = modal.basePitch * mode.ratio;
        
        const modeGain = ctx.createGain();
        const modeLevel = mode.level / 100;
        modeGain.gain.setValueAtTime(modeLevel * 0.25, now);
        modeGain.gain.exponentialRampToValueAtTime(0.0001, now + mode.decay / 1000);
        
        modeOsc.connect(modeGain);
        modeGain.connect(masterGain);
        
        modeOsc.start(now);
        modeOsc.stop(now + mode.decay / 1000 + 0.1);
      }
    }

    if (params.additive.enabled) {
      const additive = params.additive;
      const partialKeys = ["p1", "p2", "p3", "p4", "p5", "p6", "p7", "p8"] as const;
      
      partialKeys.forEach((key, i) => {
        const partial = additive.partials[key];
        if (partial.level === 0) return;
        
        const harmonic = i + 1;
        const partialOsc = ctx.createOscillator();
        partialOsc.type = "sine";
        
        const spreadCents = (additive.spread / 100) * (harmonic - 1) * 10;
        const baseFreq = additive.basePitch * harmonic;
        const detunedFreq = baseFreq * Math.pow(2, (partial.detune + spreadCents) / 1200);
        partialOsc.frequency.value = detunedFreq;
        
        const partialGain = ctx.createGain();
        const baseLevel = partial.level / 100;
        const slopeMultiplier = 1 - (additive.decaySlope / 100) * (harmonic - 1) / 7;
        const finalLevel = baseLevel * Math.max(0.1, slopeMultiplier) * 0.2;
        
        partialGain.gain.setValueAtTime(finalLevel, now);
        
        partialOsc.connect(partialGain);
        partialGain.connect(masterGain);
        
        const ampEnv = params.envelopes.env1;
        const envDuration = (ampEnv.attack + ampEnv.hold + ampEnv.decay) / 1000 + 0.2;
        partialOsc.start(now);
        partialOsc.stop(now + envDuration);
      });
    }

    if (params.granular.enabled) {
      const granular = params.granular;
      const grainCount = Math.round(granular.density);
      const grainDuration = granular.grainSize / 1000;
      const totalDuration = (params.envelopes.env1.attack + params.envelopes.env1.hold + params.envelopes.env1.decay) / 1000;
      const timeSpread = totalDuration * (granular.scatter / 100);
      
      for (let i = 0; i < grainCount; i++) {
        const grainOffset = (i / grainCount) * totalDuration + (Math.random() - 0.5) * timeSpread;
        const grainStart = Math.max(0, now + grainOffset);
        
        const pitchVariation = 1 + (Math.random() - 0.5) * 2 * (granular.pitchSpray / 100);
        const grainPitch = granular.pitch * pitchVariation;
        
        const grainGain = ctx.createGain();
        grainGain.gain.setValueAtTime(0, grainStart);
        grainGain.gain.linearRampToValueAtTime(0.15, grainStart + grainDuration * 0.1);
        grainGain.gain.setValueAtTime(0.15, grainStart + grainDuration * 0.5);
        grainGain.gain.linearRampToValueAtTime(0, grainStart + grainDuration);
        
        if (granular.texture === "noise") {
          const noiseLength = Math.max(0.01, grainDuration);
          const noiseBuffer = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * noiseLength), ctx.sampleRate);
          const noiseData = noiseBuffer.getChannelData(0);
          for (let j = 0; j < noiseData.length; j++) {
            noiseData[j] = (Math.random() * 2 - 1) * 0.8;
          }
          const noiseSource = ctx.createBufferSource();
          noiseSource.buffer = noiseBuffer;
          
          const bandpass = ctx.createBiquadFilter();
          bandpass.type = "bandpass";
          bandpass.frequency.value = grainPitch;
          bandpass.Q.value = 5;
          
          noiseSource.connect(bandpass);
          bandpass.connect(grainGain);
          grainGain.connect(masterGain);
          noiseSource.start(grainStart);
          noiseSource.stop(grainStart + grainDuration);
        } else if (granular.texture === "click") {
          const clickLength = 0.002;
          const clickBuffer = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * clickLength), ctx.sampleRate);
          const clickData = clickBuffer.getChannelData(0);
          for (let j = 0; j < clickData.length; j++) {
            clickData[j] = (j < clickData.length / 2) ? 1 : -1;
          }
          const clickSource = ctx.createBufferSource();
          clickSource.buffer = clickBuffer;
          clickSource.connect(grainGain);
          grainGain.connect(masterGain);
          clickSource.start(grainStart);
        } else {
          const grainOsc = ctx.createOscillator();
          grainOsc.type = granular.texture === "saw" ? "sawtooth" : "sine";
          grainOsc.frequency.value = grainPitch;
          grainOsc.connect(grainGain);
          grainGain.connect(masterGain);
          grainOsc.start(grainStart);
          grainOsc.stop(grainStart + grainDuration);
        }
      }
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

    return { masterGain, fadeGain: outputFadeGain };
  }, [createImpulseResponse]);

  const getTotalDuration = useCallback((params: SynthParameters): number => {
    const env1 = params.envelopes.env1;
    let baseDuration = env1.attack + env1.hold + env1.decay + 100;
    
    if (params.effects.delayEnabled) {
      baseDuration += params.effects.delayTime * 3;
    }
    if (params.effects.reverbEnabled || (params.convolver.enabled && params.convolver.useCustomIR)) {
      baseDuration += params.effects.reverbDecay * 1000;
    }
    
    return Math.min(baseDuration, 10000);
  }, []);

  const handleTrigger = useCallback(async () => {
    // Use Tone.js to start audio context (handles user gesture requirement)
    await Tone.start();
    
    // Get the Tone.js-managed audio context
    const ctx = Tone.getContext().rawContext as AudioContext;
    const now = ctx.currentTime;
    
    // Clear previous timeout
    if (playTimeoutRef.current) {
      clearTimeout(playTimeoutRef.current);
      playTimeoutRef.current = null;
    }
    
    // Quickly fade out and stop any active sources to prevent pops/clicks
    if (activeFadeGainRef.current) {
      try {
        activeFadeGainRef.current.gain.cancelScheduledValues(now);
        activeFadeGainRef.current.gain.setValueAtTime(activeFadeGainRef.current.gain.value, now);
        activeFadeGainRef.current.gain.linearRampToValueAtTime(0, now + 0.003);
      } catch (e) {
        // Ignore if gain node is disconnected
      }
    }
    
    // Stop all active sources after fadeout
    setTimeout(() => {
      for (const source of activeSourcesRef.current) {
        try {
          source.stop();
        } catch (e) {
          // Ignore if already stopped
        }
      }
      activeSourcesRef.current = [];
    }, 5);
    
    setIsPlaying(true);

    const totalDuration = getTotalDuration(params);
    
    // Create new fade gain for this sound
    const fadeGain = ctx.createGain();
    fadeGain.gain.setValueAtTime(0, now + 0.005);
    fadeGain.gain.linearRampToValueAtTime(1, now + 0.008);
    
    // Track new sources
    const newSources: AudioScheduledSourceNode[] = [];
    
    // Play through live context with source tracking
    const result = await generateSound(ctx, params, totalDuration, fadeGain, newSources);
    
    // Store references for next retrigger
    activeFadeGainRef.current = result.fadeGain;
    activeSourcesRef.current = newSources;

    playTimeoutRef.current = setTimeout(() => {
      setIsPlaying(false);
      activeSourcesRef.current = [];
      activeFadeGainRef.current = null;
    }, totalDuration);

    // Use Tone.Offline for rendering the waveform display
    const sampleRate = 44100;
    const durationInSeconds = totalDuration / 1000;
    
    const buffer = await Tone.Offline(async (offlineCtx) => {
      // Get the raw context for our generateSound function
      const rawCtx = offlineCtx.rawContext as OfflineAudioContext;
      await generateSound(rawCtx, params, totalDuration);
    }, durationInSeconds);
    
    // Convert Tone.ToneAudioBuffer to AudioBuffer for waveform display
    const audioBuffer = buffer.get() as AudioBuffer;
    if (audioBuffer && params.effects.bitcrusher < 16) {
      applyBitcrusher(audioBuffer, params.effects.bitcrusher);
    }
    if (audioBuffer) {
      setAudioBuffer(audioBuffer);
    }
  }, [params, generateSound, applyBitcrusher, getTotalDuration]);

  const handleExport = useCallback(async () => {
    setIsExporting(true);

    try {
      // Use Tone.js context management for export
      await Tone.start();
      
      const sampleRate = parseInt(exportSettings.sampleRate);
      const channels = exportSettings.channels === "stereo" ? 2 : 1;
      const duration = exportSettings.duration;
      const durationInSeconds = duration / 1000;

      // Use Tone.Offline for rendering
      const toneBuffer = await Tone.Offline(async (offlineCtx) => {
        const rawCtx = offlineCtx.rawContext as OfflineAudioContext;
        await generateSound(rawCtx, params, duration);
      }, durationInSeconds);
      
      const renderedBuffer = toneBuffer.get() as AudioBuffer;
      if (!renderedBuffer) {
        throw new Error("Failed to render audio buffer");
      }

      if (params.effects.bitcrusher < 16) {
        applyBitcrusher(renderedBuffer, params.effects.bitcrusher);
      }

      // Handle mono/stereo conversion
      let finalBuffer = renderedBuffer;
      if (channels === 1 && renderedBuffer.numberOfChannels > 1) {
        // Mix down to mono
        const monoCtx = new OfflineAudioContext(1, renderedBuffer.length, sampleRate);
        const monoBuffer = monoCtx.createBuffer(1, renderedBuffer.length, sampleRate);
        const monoData = monoBuffer.getChannelData(0);
        for (let i = 0; i < renderedBuffer.length; i++) {
          let sum = 0;
          for (let ch = 0; ch < renderedBuffer.numberOfChannels; ch++) {
            sum += renderedBuffer.getChannelData(ch)[i];
          }
          monoData[i] = sum / renderedBuffer.numberOfChannels;
        }
        finalBuffer = monoBuffer;
      }
      
      if (exportSettings.normalize) {
        for (let channel = 0; channel < finalBuffer.numberOfChannels; channel++) {
          const data = finalBuffer.getChannelData(channel);
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
    <div className="min-h-screen bg-background p-1.5 overflow-x-hidden">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center gap-2 mb-1.5">
          <div className="flex items-center gap-1.5">
            <div className="w-5 h-5 rounded bg-primary/20 flex items-center justify-center">
              <Zap className="w-3 h-3 text-primary" />
            </div>
            <h1 className="text-sm font-bold tracking-tight text-foreground">OneShot</h1>
          </div>
          <div className="flex-shrink-0">
            <TriggerButton onTrigger={handleTrigger} isPlaying={isPlaying} size="sm" />
          </div>
          <WaveformDisplay 
            audioBuffer={audioBuffer} 
            isPlaying={isPlaying}
            className="h-12 flex-1"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-1.5">
          <div className="lg:col-span-9 space-y-1.5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
              <Tabs defaultValue="osc1" className="w-full">
                <TabsList className="w-full h-7 grid grid-cols-3" data-testid="osc-tabs">
                  <TabsTrigger value="osc1" className="text-xs h-6" data-testid="tab-osc1">OSC 1</TabsTrigger>
                  <TabsTrigger value="osc2" className="text-xs h-6" data-testid="tab-osc2">OSC 2</TabsTrigger>
                  <TabsTrigger value="osc3" className="text-xs h-6" data-testid="tab-osc3">OSC 3</TabsTrigger>
                </TabsList>
                <TabsContent value="osc1" className="mt-1">
                  <OscillatorPanel
                    oscillator={params.oscillators.osc1}
                    onChange={(osc) => setParams({ ...params, oscillators: { ...params.oscillators, osc1: osc } })}
                    title="OSC 1"
                    index={1}
                  />
                </TabsContent>
                <TabsContent value="osc2" className="mt-1">
                  <OscillatorPanel
                    oscillator={params.oscillators.osc2}
                    onChange={(osc) => setParams({ ...params, oscillators: { ...params.oscillators, osc2: osc } })}
                    title="OSC 2"
                    index={2}
                  />
                </TabsContent>
                <TabsContent value="osc3" className="mt-1">
                  <OscillatorPanel
                    oscillator={params.oscillators.osc3}
                    onChange={(osc) => setParams({ ...params, oscillators: { ...params.oscillators, osc3: osc } })}
                    title="OSC 3"
                    index={3}
                  />
                </TabsContent>
              </Tabs>

              <Tabs defaultValue="env1" className="w-full">
                <TabsList className="w-full h-7 grid grid-cols-3" data-testid="env-tabs">
                  <TabsTrigger value="env1" className="text-xs h-6" data-testid="tab-env1">ENV 1</TabsTrigger>
                  <TabsTrigger value="env2" className="text-xs h-6" data-testid="tab-env2">ENV 2</TabsTrigger>
                  <TabsTrigger value="env3" className="text-xs h-6" data-testid="tab-env3">ENV 3</TabsTrigger>
                </TabsList>
                <TabsContent value="env1" className="mt-1">
                  <EnvelopePanel
                    envelope={params.envelopes.env1}
                    onChange={(env) => setParams({ ...params, envelopes: { ...params.envelopes, env1: env } })}
                    title="ENV 1"
                    index={1}
                  />
                </TabsContent>
                <TabsContent value="env2" className="mt-1">
                  <EnvelopePanel
                    envelope={params.envelopes.env2}
                    onChange={(env) => setParams({ ...params, envelopes: { ...params.envelopes, env2: env } })}
                    title="ENV 2"
                    index={2}
                  />
                </TabsContent>
                <TabsContent value="env3" className="mt-1">
                  <EnvelopePanel
                    envelope={params.envelopes.env3}
                    onChange={(env) => setParams({ ...params, envelopes: { ...params.envelopes, env3: env } })}
                    title="ENV 3"
                    index={3}
                  />
                </TabsContent>
              </Tabs>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-1.5">
              <FilterPanel
                filter={params.filter}
                onChange={(filter) => setParams({ ...params, filter })}
              />
              <ClickLayerPanel
                clickLayer={params.clickLayer}
                onChange={(clickLayer) => setParams({ ...params, clickLayer })}
              />
              <SubOscillatorPanel
                subOsc={params.subOsc}
                onChange={(subOsc) => setParams({ ...params, subOsc })}
              />
              <OutputPanel
                output={params.output}
                onChange={(output) => setParams({ ...params, output })}
              />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-1.5">
              <SynthEngineSelector
                modal={params.modal}
                additive={params.additive}
                granular={params.granular}
                onModalChange={(modal) => setParams({ ...params, modal })}
                onAdditiveChange={(additive) => setParams({ ...params, additive })}
                onGranularChange={(granular) => setParams({ ...params, granular })}
              />
              <EffectsPanel
                effects={params.effects}
                onChange={(effects) => setParams({ ...params, effects })}
              />
              <SaturationChainPanel
                saturation={params.saturationChain}
                onChange={(saturationChain) => setParams({ ...params, saturationChain })}
              />
              <MasteringPanel
                mastering={params.mastering}
                onChange={(mastering) => setParams({ ...params, mastering })}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-1.5">
              <WaveshaperPanel
                waveshaper={params.waveshaper}
                onChange={(waveshaper) => setParams({ ...params, waveshaper })}
              />
              <ConvolverPanel
                convolver={params.convolver}
                onChange={(convolver) => setParams({ ...params, convolver })}
                onIRLoaded={handleIRLoaded}
              />
            </div>
          </div>

          <div className="lg:col-span-3 space-y-1.5">
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
