export interface BuiltinIR {
  id: string;
  name: string;
  category: "plate" | "spring" | "room" | "metallic" | "synthetic";
  description: string;
  duration: number;
}

export const BUILTIN_IRS: BuiltinIR[] = [
  { id: "plate-short", name: "Short Plate", category: "plate", description: "Tight plate reverb, 80ms", duration: 0.08 },
  { id: "plate-medium", name: "Medium Plate", category: "plate", description: "Classic plate sound, 200ms", duration: 0.2 },
  { id: "spring-tight", name: "Tight Spring", category: "spring", description: "Snappy spring, 100ms", duration: 0.1 },
  { id: "spring-boing", name: "Spring Boing", category: "spring", description: "Characteristic spring, 180ms", duration: 0.18 },
  { id: "room-closet", name: "Closet", category: "room", description: "Very small space, 60ms", duration: 0.06 },
  { id: "room-booth", name: "Vocal Booth", category: "room", description: "Tight vocal booth, 120ms", duration: 0.12 },
  { id: "room-tile", name: "Tile Room", category: "room", description: "Reflective tile space, 150ms", duration: 0.15 },
  { id: "metal-ping", name: "Metal Ping", category: "metallic", description: "Metallic resonance, 90ms", duration: 0.09 },
  { id: "metal-clang", name: "Metal Clang", category: "metallic", description: "Industrial metal, 140ms", duration: 0.14 },
  { id: "metal-pipe", name: "Pipe Resonance", category: "metallic", description: "Hollow pipe character, 200ms", duration: 0.2 },
  { id: "synth-shimmer", name: "Synth Shimmer", category: "synthetic", description: "Designed shimmer, 180ms", duration: 0.18 },
  { id: "synth-grit", name: "Synth Grit", category: "synthetic", description: "Textured synthetic, 100ms", duration: 0.1 },
  { id: "synth-glitch", name: "Glitch Burst", category: "synthetic", description: "Digital artifacts, 80ms", duration: 0.08 },
  { id: "synth-vapor", name: "Vapor", category: "synthetic", description: "Ethereal texture, 250ms", duration: 0.25 },
];

function generateNoise(length: number): Float32Array {
  const noise = new Float32Array(length);
  for (let i = 0; i < length; i++) {
    noise[i] = Math.random() * 2 - 1;
  }
  return noise;
}

function applyEnvelope(buffer: Float32Array, attack: number, decay: number, shape: number = 2): void {
  const length = buffer.length;
  const attackSamples = Math.floor(attack * length);
  const decaySamples = length - attackSamples;
  
  for (let i = 0; i < length; i++) {
    let envelope: number;
    if (i < attackSamples) {
      envelope = Math.pow(i / attackSamples, 0.5);
    } else {
      const decayPos = (i - attackSamples) / decaySamples;
      envelope = Math.pow(1 - decayPos, shape);
    }
    buffer[i] *= envelope;
  }
}

function applyResonances(buffer: Float32Array, sampleRate: number, freqs: number[], decays: number[], amounts: number[]): void {
  const length = buffer.length;
  
  for (let f = 0; f < freqs.length; f++) {
    const freq = freqs[f];
    const decay = decays[f];
    const amount = amounts[f];
    const omega = 2 * Math.PI * freq / sampleRate;
    
    for (let i = 0; i < length; i++) {
      const t = i / sampleRate;
      const resonance = Math.sin(omega * i) * Math.exp(-t * decay) * amount;
      buffer[i] += resonance;
    }
  }
}

function normalizeBuffer(buffer: Float32Array): void {
  let max = 0;
  for (let i = 0; i < buffer.length; i++) {
    max = Math.max(max, Math.abs(buffer[i]));
  }
  if (max > 0) {
    const scale = 0.95 / max;
    for (let i = 0; i < buffer.length; i++) {
      buffer[i] *= scale;
    }
  }
}

export function generateBuiltinIR(id: string, sampleRate: number): AudioBuffer | null {
  const ir = BUILTIN_IRS.find(i => i.id === id);
  if (!ir) return null;
  
  const length = Math.floor(ir.duration * sampleRate);
  const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
  const buffer = audioContext.createBuffer(2, length, sampleRate);
  
  const leftChannel = buffer.getChannelData(0);
  const rightChannel = buffer.getChannelData(1);
  
  switch (ir.category) {
    case "plate": {
      const noise = generateNoise(length);
      leftChannel.set(noise);
      rightChannel.set(generateNoise(length));
      
      applyResonances(leftChannel, sampleRate, [2200, 3400, 4800, 6200], [15, 18, 22, 28], [0.3, 0.2, 0.15, 0.1]);
      applyResonances(rightChannel, sampleRate, [2300, 3500, 4900, 6300], [16, 19, 23, 29], [0.3, 0.2, 0.15, 0.1]);
      
      const attackTime = id === "plate-short" ? 0.001 : 0.002;
      applyEnvelope(leftChannel, attackTime, 1, id === "plate-short" ? 3 : 2.5);
      applyEnvelope(rightChannel, attackTime, 1, id === "plate-short" ? 3 : 2.5);
      break;
    }
    
    case "spring": {
      const noise = generateNoise(length);
      leftChannel.set(noise);
      rightChannel.set(noise);
      
      const springFreqs = id === "spring-tight" 
        ? [180, 360, 540, 720] 
        : [120, 240, 480, 720, 960];
      const springDecays = id === "spring-tight"
        ? [25, 30, 35, 40]
        : [15, 20, 25, 30, 35];
      const springAmounts = id === "spring-tight"
        ? [0.5, 0.3, 0.2, 0.1]
        : [0.6, 0.4, 0.25, 0.15, 0.1];
      
      applyResonances(leftChannel, sampleRate, springFreqs, springDecays, springAmounts);
      applyResonances(rightChannel, sampleRate, springFreqs.map(f => f * 1.01), springDecays, springAmounts);
      
      applyEnvelope(leftChannel, 0.001, 1, 1.8);
      applyEnvelope(rightChannel, 0.001, 1, 1.8);
      
      for (let i = 0; i < length; i++) {
        const wobble = Math.sin(i * 0.02) * 0.1 * Math.exp(-i / (length * 0.3));
        leftChannel[i] *= (1 + wobble);
        rightChannel[i] *= (1 - wobble);
      }
      break;
    }
    
    case "room": {
      const noise = generateNoise(length);
      leftChannel.set(noise);
      rightChannel.set(generateNoise(length));
      
      let roomDecay = 3.5;
      let roomResonances: number[] = [];
      
      if (id === "room-closet") {
        roomDecay = 5;
        roomResonances = [800, 1600, 3200];
      } else if (id === "room-booth") {
        roomDecay = 4;
        roomResonances = [500, 1200, 2400, 4800];
      } else if (id === "room-tile") {
        roomDecay = 3;
        roomResonances = [600, 1800, 3600, 7200];
      }
      
      applyResonances(leftChannel, sampleRate, roomResonances, roomResonances.map(() => 20), roomResonances.map((_, i) => 0.15 / (i + 1)));
      applyResonances(rightChannel, sampleRate, roomResonances.map(f => f * 1.02), roomResonances.map(() => 21), roomResonances.map((_, i) => 0.15 / (i + 1)));
      
      applyEnvelope(leftChannel, 0.002, 1, roomDecay);
      applyEnvelope(rightChannel, 0.002, 1, roomDecay);
      break;
    }
    
    case "metallic": {
      const noise = generateNoise(length);
      leftChannel.set(noise.map(n => n * 0.3));
      rightChannel.set(generateNoise(length).map(n => n * 0.3));
      
      let metalFreqs: number[];
      let metalDecays: number[];
      
      if (id === "metal-ping") {
        metalFreqs = [1200, 2400, 3800, 5200, 7600];
        metalDecays = [12, 15, 18, 22, 28];
      } else if (id === "metal-clang") {
        metalFreqs = [340, 890, 1450, 2100, 3200, 4800];
        metalDecays = [8, 10, 14, 18, 24, 30];
      } else {
        metalFreqs = [220, 440, 880, 1320, 1980];
        metalDecays = [6, 8, 12, 16, 22];
      }
      
      const metalAmounts = metalFreqs.map((_, i) => 0.4 / (i + 1));
      
      applyResonances(leftChannel, sampleRate, metalFreqs, metalDecays, metalAmounts);
      applyResonances(rightChannel, sampleRate, metalFreqs.map(f => f * 1.003), metalDecays, metalAmounts);
      
      applyEnvelope(leftChannel, 0.0005, 1, 2.2);
      applyEnvelope(rightChannel, 0.0005, 1, 2.2);
      break;
    }
    
    case "synthetic": {
      const noise = generateNoise(length);
      
      if (id === "synth-shimmer") {
        leftChannel.set(noise);
        rightChannel.set(generateNoise(length));
        
        applyResonances(leftChannel, sampleRate, [4000, 6000, 8000, 12000], [8, 10, 12, 15], [0.3, 0.25, 0.2, 0.15]);
        applyResonances(rightChannel, sampleRate, [4200, 6300, 8400, 12600], [9, 11, 13, 16], [0.3, 0.25, 0.2, 0.15]);
        
        applyEnvelope(leftChannel, 0.01, 1, 2);
        applyEnvelope(rightChannel, 0.01, 1, 2);
      } else if (id === "synth-grit") {
        for (let i = 0; i < length; i++) {
          const grit = Math.random() > 0.7 ? noise[i] * 2 : noise[i] * 0.3;
          leftChannel[i] = grit;
          rightChannel[i] = Math.random() > 0.7 ? noise[i] * 2 : noise[i] * 0.3;
        }
        
        applyEnvelope(leftChannel, 0.001, 1, 3);
        applyEnvelope(rightChannel, 0.001, 1, 3);
      } else if (id === "synth-glitch") {
        for (let i = 0; i < length; i++) {
          const glitchPhase = Math.floor(i / (sampleRate * 0.005));
          const glitchAmp = (glitchPhase % 3 === 0) ? 1 : 0.1;
          leftChannel[i] = noise[i] * glitchAmp;
          rightChannel[i] = noise[Math.min(i + 50, length - 1)] * glitchAmp;
        }
        
        applyEnvelope(leftChannel, 0.0005, 1, 4);
        applyEnvelope(rightChannel, 0.0005, 1, 4);
      } else if (id === "synth-vapor") {
        leftChannel.set(noise.map(n => n * 0.5));
        rightChannel.set(generateNoise(length).map(n => n * 0.5));
        
        applyResonances(leftChannel, sampleRate, [300, 600, 1200], [5, 7, 10], [0.4, 0.3, 0.2]);
        applyResonances(rightChannel, sampleRate, [320, 640, 1280], [5.5, 7.5, 10.5], [0.4, 0.3, 0.2]);
        
        applyEnvelope(leftChannel, 0.02, 1, 1.5);
        applyEnvelope(rightChannel, 0.02, 1, 1.5);
      }
      break;
    }
  }
  
  normalizeBuffer(leftChannel);
  normalizeBuffer(rightChannel);
  
  audioContext.close();
  return buffer;
}

export function getRandomOneShotIR(): string {
  const weights: Record<string, number> = {
    "plate": 3,
    "spring": 2,
    "room": 3,
    "metallic": 2,
    "synthetic": 2,
  };
  
  const weightedIRs: BuiltinIR[] = [];
  for (const ir of BUILTIN_IRS) {
    const weight = weights[ir.category] || 1;
    for (let i = 0; i < weight; i++) {
      weightedIRs.push(ir);
    }
  }
  
  return weightedIRs[Math.floor(Math.random() * weightedIRs.length)].id;
}
