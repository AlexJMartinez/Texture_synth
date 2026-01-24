import { useState, useCallback, useRef, useEffect } from "react";
import * as Tone from "tone";
import { WaveformDisplay3D } from "@/components/synth/WaveformDisplay3D";
import { EnvelopePanel } from "@/components/synth/EnvelopePanel";
import { OscillatorPanel } from "@/components/synth/OscillatorPanel";
import { FilterPanel } from "@/components/synth/FilterPanel";
import { EffectsPanel } from "@/components/synth/EffectsPanel";
import { OutputPanel } from "@/components/synth/OutputPanel";
import { PresetPanel } from "@/components/synth/PresetPanel";
import { ExportPanel, type ExportResult } from "@/components/synth/ExportPanel";
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
import { triggerAHD, stopWithFade, EPS } from "@/lib/envelopeAHD";
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
  const [exportResult, setExportResult] = useState<ExportResult | null>(null);
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

  // Apply a safety fadeout at the end of the buffer to prevent pops/clicks
  const applySafetyFadeout = useCallback((buffer: AudioBuffer, fadeMs: number = 5): void => {
    const fadeOutSamples = Math.max(2, Math.min(
      Math.floor((fadeMs / 1000) * buffer.sampleRate),
      Math.floor(buffer.length * 0.1) // Max 10% of buffer length
    ));
    
    if (buffer.length < 2) return;
    
    for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
      const data = buffer.getChannelData(channel);
      const startIndex = Math.max(0, buffer.length - fadeOutSamples);
      const actualFadeSamples = buffer.length - startIndex;
      
      for (let i = 0; i < actualFadeSamples; i++) {
        // Use (i+1)/actualFadeSamples to reach exactly 0 at the last sample
        const t = (i + 1) / actualFadeSamples;
        const gain = Math.cos(t * Math.PI * 0.5); // Cosine curve from ~1 to 0
        data[startIndex + i] *= gain;
      }
      
      // Force last sample to exactly zero to prevent any residual click
      data[buffer.length - 1] = 0;
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
      triggerAHD(outputFadeGain.gain, now, {
        attack: 0.002,
        hold: durationSec,
        decay: 0.002
      }, 1.0, { startFromCurrent: false });
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
        
        const filterEnv = params.envelopes.env1;
        if (filterEnv.enabled) {
          const attackEnd = now + filterEnv.attack / 1000;
          const holdEnd = attackEnd + filterEnv.hold / 1000;
          const decayEnd = holdEnd + filterEnv.decay / 1000;
          const modAmount = (filterEnv.amount / 100) * (params.filter.frequency * 2);
          
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
      const transientPeak = 1 + attackAmount * 0.5;
      const sustainLevel = 1 + sustainAmount * 0.3;
      
      if (attackAmount !== 0) {
        transientGain.gain.setValueAtTime(Math.max(EPS, transientPeak), now);
        transientGain.gain.setTargetAtTime(sustainLevel, now, transientDuration / 5);
        transientGain.gain.setValueAtTime(sustainLevel, now + transientDuration);
      } else {
        transientGain.gain.setValueAtTime(sustainLevel, now);
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
            const baseDepth = Math.max(EPS, osc.fmDepth);
            const peakDepth = baseDepth + (osc.indexEnvDepth * 50);
            triggerAHD(modGain.gain, now, {
              attack: 0.0005,
              hold: 0,
              decay: osc.indexEnvDecay / 1000
            }, peakDepth, { startFromCurrent: false });
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
            const basePmDepth = Math.max(EPS, pmIndex);
            const peakPmDepth = basePmDepth + (osc.indexEnvDepth * 100);
            triggerAHD(pmModGain.gain, now, {
              attack: 0.0005,
              hold: 0,
              decay: osc.indexEnvDecay / 1000
            }, peakPmDepth, { startFromCurrent: false });
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
        const pitchEnv = params.envelopes.env2;
        if (pitchEnv.enabled) {
          const attackEnd = now + pitchEnv.attack / 1000;
          const holdEnd = attackEnd + pitchEnv.hold / 1000;
          const decayEnd = holdEnd + pitchEnv.decay / 1000;
          const modAmount = (pitchEnv.amount / 100) * oscPitchHz * 0.5;
          
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

      const ampEnv = params.envelopes.env3;
      const baseLevel = osc.level / 100;
      
      triggerAHD(oscGain.gain, now, {
        attack: ampEnv.attack / 1000,
        hold: ampEnv.hold / 1000,
        decay: ampEnv.decay / 1000
      }, baseLevel, { startFromCurrent: false });

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
      triggerAHD(clickGain.gain, now, {
        attack: 0.0005,
        hold: 0,
        decay: clickDecay
      }, clickLevel, { startFromCurrent: false });
      
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
      
      const stToMult = (st: number) => Math.pow(2, st / 12);
      const pitchEnv = params.envelopes.env2;
      
      if (pitchEnv.enabled && pitchEnv.amount !== 0) {
        const subPitchScale = 0.65;
        const dropST = Math.abs(pitchEnv.amount) * 0.48 * subPitchScale;
        const dropTime = Math.max(0.001, (pitchEnv.attack + pitchEnv.hold + pitchEnv.decay) / 1000 * 1.5);
        
        const startHz = Math.max(20, subFreq * stToMult(pitchEnv.amount > 0 ? dropST : -dropST));
        const endHz = Math.max(20, subFreq);
        
        subOsc.frequency.setValueAtTime(startHz, now);
        if (pitchEnv.curve === "exponential") {
          subOsc.frequency.exponentialRampToValueAtTime(endHz, now + dropTime);
        } else {
          subOsc.frequency.linearRampToValueAtTime(endHz, now + dropTime);
        }
      } else {
        subOsc.frequency.setValueAtTime(Math.max(20, subFreq), now);
      }
      
      const subEnvGain = ctx.createGain();
      subEnvGain.gain.setValueAtTime(EPS, now);
      
      const hp = ctx.createBiquadFilter();
      hp.type = "highpass";
      hp.frequency.setValueAtTime(Math.max(10, sub.hpFreq ?? 25), now);
      hp.Q.setValueAtTime(0.707, now);
      
      const lp = ctx.createBiquadFilter();
      lp.type = "lowpass";
      lp.frequency.setValueAtTime(sub.filterEnabled ? Math.max(40, sub.filterFreq) : 200, now);
      lp.Q.setValueAtTime(0.707, now);
      
      const makeSoftClipCurve = (amount01: number, n = 1024) => {
        const a = Math.max(0, Math.min(1, amount01));
        const k = 1 + a * 20;
        const curve = new Float32Array(n);
        for (let i = 0; i < n; i++) {
          const x = (i / (n - 1)) * 2 - 1;
          curve[i] = Math.tanh(k * x) / Math.tanh(k);
        }
        return curve;
      };
      
      const drive = ctx.createWaveShaper();
      drive.curve = makeSoftClipCurve((sub.drive ?? 0) / 100);
      drive.oversample = "2x";
      
      const trim = ctx.createGain();
      trim.gain.setValueAtTime(sub.level / 100, now);
      
      subOsc.connect(subEnvGain).connect(hp).connect(lp).connect(drive).connect(trim).connect(masterGain);
      
      const subAttack = sub.attack / 1000;
      const subDecay = sub.decay / 1000;
      const stopAt = triggerAHD(subEnvGain.gain, now, {
        attack: subAttack,
        hold: 0,
        decay: subDecay
      }, 1.0, { startFromCurrent: false });
      
      subOsc.start(now);
      subOsc.stop(stopAt + 0.03);
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
        triggerAHD(noiseGain.gain, now, {
          attack: 0.0005,
          hold: 0,
          decay: modal.impactDecay / 1000
        }, noiseLevel * 0.5, { startFromCurrent: false });
        
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
        triggerAHD(modeGain.gain, now, {
          attack: 0.0005,
          hold: 0,
          decay: mode.decay / 1000
        }, modeLevel * 0.25, { startFromCurrent: false });
        
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
        
        const ampEnvForPartial = params.envelopes.env3;
        triggerAHD(partialGain.gain, now, {
          attack: ampEnvForPartial.attack / 1000,
          hold: ampEnvForPartial.hold / 1000,
          decay: ampEnvForPartial.decay / 1000
        }, finalLevel, { startFromCurrent: false });
        
        partialOsc.connect(partialGain);
        partialGain.connect(masterGain);
        
        const envDuration = (ampEnvForPartial.attack + ampEnvForPartial.hold + ampEnvForPartial.decay) / 1000 + 0.2;
        partialOsc.start(now);
        partialOsc.stop(now + envDuration);
      });
    }

    if (params.granular.enabled) {
      const granular = params.granular;
      const grainCount = Math.round(granular.density);
      const grainDuration = granular.grainSize / 1000;
      const totalDuration = (params.envelopes.env3.attack + params.envelopes.env3.hold + params.envelopes.env3.decay) / 1000;
      const timeSpread = totalDuration * (granular.scatter / 100);
      
      for (let i = 0; i < grainCount; i++) {
        const grainOffset = (i / grainCount) * totalDuration + (Math.random() - 0.5) * timeSpread;
        const grainStart = Math.max(0, now + grainOffset);
        
        const pitchVariation = 1 + (Math.random() - 0.5) * 2 * (granular.pitchSpray / 100);
        const grainPitch = granular.pitch * pitchVariation;
        
        const grainGain = ctx.createGain();
        triggerAHD(grainGain.gain, grainStart, {
          attack: grainDuration * 0.1,
          hold: grainDuration * 0.4,
          decay: grainDuration * 0.5
        }, 0.15, { startFromCurrent: false });
        
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

    const ampEnv = params.envelopes.env3;
    const volume = Math.max(EPS, params.output.volume / 100);

    triggerAHD(masterGain.gain, now, {
      attack: ampEnv.attack / 1000,
      hold: ampEnv.hold / 1000,
      decay: ampEnv.decay / 1000
    }, volume, { startFromCurrent: false });

    return { masterGain, fadeGain: outputFadeGain };
  }, [createImpulseResponse]);

  const getTotalDuration = useCallback((params: SynthParameters): number => {
    const ampEnv = params.envelopes.env3;
    let baseDuration = ampEnv.attack + ampEnv.hold + ampEnv.decay + 100;
    
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
        stopWithFade(activeFadeGainRef.current.gain, now, 0.003);
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
    fadeGain.gain.value = EPS;
    triggerAHD(fadeGain.gain, now + 0.003, {
      attack: 0.005,
      hold: getTotalDuration(params) / 1000,
      decay: 0.005
    }, 1.0, { startFromCurrent: false });
    
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
    if (audioBuffer) {
      if (params.effects.bitcrusher < 16) {
        applyBitcrusher(audioBuffer, params.effects.bitcrusher);
      }
      // Apply safety fadeout to prevent pops at end of buffer
      applySafetyFadeout(audioBuffer, 5);
      setAudioBuffer(audioBuffer);
    }
  }, [params, generateSound, applyBitcrusher, applySafetyFadeout, getTotalDuration]);

  const handleExport = useCallback(async () => {
    setIsExporting(true);

    try {
      await Tone.start();
      
      const targetSampleRate = parseInt(exportSettings.sampleRate);
      const channels = exportSettings.channels === "stereo" ? 2 : 1;
      const tailExtension = exportSettings.tailExtension;
      
      // Calculate total duration including tail for reverb/delay decay
      const baseDuration = getTotalDuration(params);
      const totalDuration = baseDuration + tailExtension;
      const durationInSeconds = totalDuration / 1000;
      
      // Re-render with tail extension to capture reverb/delay decay
      const toneBuffer = await Tone.Offline(async (offlineCtx) => {
        const rawCtx = offlineCtx.rawContext as OfflineAudioContext;
        await generateSound(rawCtx, params, totalDuration);
      }, durationInSeconds);
      
      let renderedBuffer = toneBuffer.get() as AudioBuffer;
      if (!renderedBuffer) {
        throw new Error("Failed to render audio buffer");
      }

      if (params.effects.bitcrusher < 16) {
        applyBitcrusher(renderedBuffer, params.effects.bitcrusher);
      }

      // Handle sample rate conversion if needed
      let finalBuffer = renderedBuffer;
      if (targetSampleRate !== renderedBuffer.sampleRate) {
        const resampleCtx = new OfflineAudioContext(
          renderedBuffer.numberOfChannels,
          Math.ceil(renderedBuffer.length * targetSampleRate / renderedBuffer.sampleRate),
          targetSampleRate
        );
        const bufferSource = resampleCtx.createBufferSource();
        bufferSource.buffer = renderedBuffer;
        bufferSource.connect(resampleCtx.destination);
        bufferSource.start();
        finalBuffer = await resampleCtx.startRendering();
      }
      
      // Handle mono conversion
      if (channels === 1 && finalBuffer.numberOfChannels > 1) {
        const monoBuffer = new OfflineAudioContext(1, finalBuffer.length, finalBuffer.sampleRate)
          .createBuffer(1, finalBuffer.length, finalBuffer.sampleRate);
        const monoData = monoBuffer.getChannelData(0);
        for (let i = 0; i < finalBuffer.length; i++) {
          let sum = 0;
          for (let ch = 0; ch < finalBuffer.numberOfChannels; ch++) {
            sum += finalBuffer.getChannelData(ch)[i];
          }
          monoData[i] = sum / finalBuffer.numberOfChannels;
        }
        finalBuffer = monoBuffer;
      }
      
      // Normalize if requested
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
      
      // Apply safety fadeout AFTER all processing to guarantee zero endpoint
      applySafetyFadeout(finalBuffer, 5);

      const wavBlob = audioBufferToWav(finalBuffer);
      const filename = `oneshot-${Date.now()}.wav`;
      const url = URL.createObjectURL(wavBlob);
      
      setExportResult(prev => {
        if (prev?.url) URL.revokeObjectURL(prev.url);
        return { blob: wavBlob, url, filename };
      });
      
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || 
        (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
      
      if (!isIOS) {
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        a.click();
      }
    } catch (err) {
      console.error("Export failed:", err);
    } finally {
      setIsExporting(false);
    }
  }, [params, exportSettings, generateSound, applyBitcrusher, applySafetyFadeout, getTotalDuration]);

  const clearExportResult = useCallback(() => {
    if (exportResult?.url) {
      URL.revokeObjectURL(exportResult.url);
    }
    setExportResult(null);
  }, [exportResult]);

  useEffect(() => {
    return () => {
      if (exportResult?.url) {
        URL.revokeObjectURL(exportResult.url);
      }
    };
  }, [exportResult]);

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
    <div className="h-screen bg-background p-1 overflow-hidden flex flex-col">
      <div className="max-w-7xl mx-auto w-full flex flex-col flex-1 min-h-0">
        <div className="flex flex-col md:flex-row md:items-center gap-1 mb-1 shrink-0">
          <div className="flex items-center gap-1.5">
            <div className="flex items-center gap-1">
              <div className="w-4 h-4 rounded bg-primary/20 flex items-center justify-center">
                <Zap className="w-2.5 h-2.5 text-primary" />
              </div>
              <h1 className="text-xs font-bold tracking-tight text-foreground">OneShot</h1>
            </div>
            <TriggerButton onTrigger={handleTrigger} isPlaying={isPlaying} size="sm" />
            <RandomizeControls
              currentParams={params}
              onRandomize={setParams}
            />
          </div>
          <WaveformDisplay3D 
            audioBuffer={audioBuffer} 
            isPlaying={isPlaying}
            className="h-12 md:h-10 flex-1 min-w-0 md:min-w-[200px]"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-1 flex-1 min-h-0 overflow-y-auto lg:overflow-hidden">
          <div className="lg:col-span-10 space-y-1">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-1">
              <Tabs defaultValue="osc1" className="w-full">
                <TabsList className="w-full h-6 grid grid-cols-3" data-testid="osc-tabs">
                  <TabsTrigger value="osc1" className="text-[10px] h-5" data-testid="tab-osc1">OSC 1</TabsTrigger>
                  <TabsTrigger value="osc2" className="text-[10px] h-5" data-testid="tab-osc2">OSC 2</TabsTrigger>
                  <TabsTrigger value="osc3" className="text-[10px] h-5" data-testid="tab-osc3">OSC 3</TabsTrigger>
                </TabsList>
                <TabsContent value="osc1" className="mt-0.5">
                  <OscillatorPanel
                    oscillator={params.oscillators.osc1}
                    onChange={(osc) => setParams({ ...params, oscillators: { ...params.oscillators, osc1: osc } })}
                    title="OSC 1"
                    index={1}
                  />
                </TabsContent>
                <TabsContent value="osc2" className="mt-0.5">
                  <OscillatorPanel
                    oscillator={params.oscillators.osc2}
                    onChange={(osc) => setParams({ ...params, oscillators: { ...params.oscillators, osc2: osc } })}
                    title="OSC 2"
                    index={2}
                  />
                </TabsContent>
                <TabsContent value="osc3" className="mt-0.5">
                  <OscillatorPanel
                    oscillator={params.oscillators.osc3}
                    onChange={(osc) => setParams({ ...params, oscillators: { ...params.oscillators, osc3: osc } })}
                    title="OSC 3"
                    index={3}
                  />
                </TabsContent>
              </Tabs>

              <Tabs defaultValue="filter" className="w-full">
                <TabsList className="w-full h-6 grid grid-cols-3" data-testid="env-tabs">
                  <TabsTrigger value="filter" className="text-[10px] h-5" data-testid="tab-filter-env">Filter</TabsTrigger>
                  <TabsTrigger value="pitch" className="text-[10px] h-5" data-testid="tab-pitch-env">Pitch</TabsTrigger>
                  <TabsTrigger value="amp" className="text-[10px] h-5" data-testid="tab-amp-env">Amp</TabsTrigger>
                </TabsList>
                <TabsContent value="filter" className="mt-0.5">
                  <EnvelopePanel
                    envelope={params.envelopes.env1}
                    onChange={(env) => setParams({ ...params, envelopes: { ...params.envelopes, env1: env } })}
                    type="filter"
                  />
                </TabsContent>
                <TabsContent value="pitch" className="mt-0.5">
                  <EnvelopePanel
                    envelope={params.envelopes.env2}
                    onChange={(env) => setParams({ ...params, envelopes: { ...params.envelopes, env2: env } })}
                    type="pitch"
                  />
                </TabsContent>
                <TabsContent value="amp" className="mt-0.5">
                  <EnvelopePanel
                    envelope={params.envelopes.env3}
                    onChange={(env) => setParams({ ...params, envelopes: { ...params.envelopes, env3: env } })}
                    type="amp"
                  />
                </TabsContent>
              </Tabs>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-1">
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

            <div className="grid grid-cols-2 md:grid-cols-4 gap-1">
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
            
            <div className="grid grid-cols-2 gap-1">
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

          <div className="lg:col-span-2 space-y-1">
            <PresetPanel
              currentParams={params}
              onLoadPreset={setParams}
            />
            <ExportPanel
              settings={exportSettings}
              onChange={setExportSettings}
              onExport={handleExport}
              isExporting={isExporting}
              exportResult={exportResult}
              onClearResult={clearExportResult}
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
