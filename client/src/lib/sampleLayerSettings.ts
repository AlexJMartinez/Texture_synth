// Sample Layer settings for user-imported audio samples

export interface SampleLayerSettings {
  enabled: boolean;
  volume: number; // 0-1
  pitch: number; // semitones, -24 to +24
  attack: number; // 0-1 seconds
  decay: number; // 0-1 seconds
  startPosition: number; // 0-1 (normalized position in sample)
  endPosition: number; // 0-1 (normalized end position)
  reverse: boolean;
  loopEnabled: boolean;
  // Sample data (base64 encoded audio)
  sampleData: string | null;
  sampleName: string | null;
  sampleDuration: number; // seconds
}

export const defaultSampleLayerSettings: SampleLayerSettings = {
  enabled: false,
  volume: 0.7,
  pitch: 0,
  attack: 0.001,
  decay: 0.5,
  startPosition: 0,
  endPosition: 1,
  reverse: false,
  loopEnabled: false,
  sampleData: null,
  sampleName: null,
  sampleDuration: 0,
};

const STORAGE_KEY = "synthSampleLayerSettings";

export function loadSampleLayerSettings(): SampleLayerSettings {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return { ...defaultSampleLayerSettings, ...parsed };
    }
  } catch (e) {
    console.error("Failed to load sample layer settings:", e);
  }
  return { ...defaultSampleLayerSettings };
}

export function saveSampleLayerSettings(settings: SampleLayerSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch (e) {
    console.error("Failed to save sample layer settings:", e);
  }
}

// Convert AudioBuffer to base64 WAV for storage
export async function audioBufferToBase64(buffer: AudioBuffer): Promise<string> {
  const length = buffer.length;
  const numberOfChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  
  // Create WAV file
  const wavHeader = createWavHeader(length, numberOfChannels, sampleRate);
  const wavData = new Float32Array(length * numberOfChannels);
  
  for (let channel = 0; channel < numberOfChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < length; i++) {
      wavData[i * numberOfChannels + channel] = channelData[i];
    }
  }
  
  // Convert to 16-bit PCM
  const pcmData = new Int16Array(wavData.length);
  for (let i = 0; i < wavData.length; i++) {
    const s = Math.max(-1, Math.min(1, wavData[i]));
    pcmData[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
  }
  
  const wavBuffer = new Uint8Array(wavHeader.length + pcmData.length * 2);
  wavBuffer.set(wavHeader, 0);
  const dataView = new DataView(wavBuffer.buffer);
  for (let i = 0; i < pcmData.length; i++) {
    dataView.setInt16(wavHeader.length + i * 2, pcmData[i], true);
  }
  
  // Convert to base64
  let binary = '';
  for (let i = 0; i < wavBuffer.length; i++) {
    binary += String.fromCharCode(wavBuffer[i]);
  }
  return btoa(binary);
}

function createWavHeader(numSamples: number, numChannels: number, sampleRate: number): Uint8Array {
  const bytesPerSample = 2;
  const blockAlign = numChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = numSamples * numChannels * bytesPerSample;
  const fileSize = 36 + dataSize;
  
  const buffer = new ArrayBuffer(44);
  const view = new DataView(buffer);
  
  // RIFF header
  writeString(view, 0, 'RIFF');
  view.setUint32(4, fileSize, true);
  writeString(view, 8, 'WAVE');
  
  // fmt chunk
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true); // chunk size
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bytesPerSample * 8, true);
  
  // data chunk
  writeString(view, 36, 'data');
  view.setUint32(40, dataSize, true);
  
  return new Uint8Array(buffer);
}

function writeString(view: DataView, offset: number, string: string): void {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

// Convert base64 WAV back to AudioBuffer
export async function base64ToAudioBuffer(
  base64: string,
  audioContext: AudioContext
): Promise<AudioBuffer> {
  const binary = atob(base64);
  const buffer = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    buffer[i] = binary.charCodeAt(i);
  }
  return audioContext.decodeAudioData(buffer.buffer);
}

// Randomize sample layer settings (preserves sample data)
export function randomizeSampleLayerSettings(
  current: SampleLayerSettings,
  chaos: number = 0.5
): SampleLayerSettings {
  const shouldChange = () => Math.random() < chaos;
  
  return {
    ...current,
    enabled: current.sampleData ? (shouldChange() ? Math.random() > 0.3 : current.enabled) : false,
    volume: shouldChange() ? 0.3 + Math.random() * 0.7 : current.volume,
    pitch: shouldChange() ? Math.round((Math.random() - 0.5) * 24) : current.pitch,
    attack: shouldChange() ? Math.random() * 0.1 : current.attack,
    decay: shouldChange() ? 0.1 + Math.random() * 0.9 : current.decay,
    startPosition: shouldChange() ? Math.random() * 0.3 : current.startPosition,
    endPosition: shouldChange() ? 0.7 + Math.random() * 0.3 : current.endPosition,
    reverse: shouldChange() ? Math.random() > 0.7 : current.reverse,
    loopEnabled: false, // Keep loop off for one-shots
  };
}
