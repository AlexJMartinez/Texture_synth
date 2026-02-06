/**
 * Audio utility functions for voice chat.
 * Handles PCM16 decoding and AudioContext initialization.
 */

/**
 * Decode base64 PCM16 audio to Float32Array for Web Audio API
 */
export function decodePCM16ToFloat32(base64Audio: string): Float32Array {
  let raw: string;
  try {
    raw = atob(base64Audio);
  } catch (e) {
    throw new Error("decodePCM16ToFloat32: invalid base64 audio payload");
  }

  // Convert binary string to bytes
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) {
    bytes[i] = raw.charCodeAt(i) & 0xff;
  }

  // PCM16 must be an even number of bytes; truncate any dangling byte
  const evenLen = bytes.byteLength - (bytes.byteLength % 2);
  const view = new DataView(bytes.buffer, bytes.byteOffset, evenLen);

  const sampleCount = evenLen / 2;
  const out = new Float32Array(sampleCount);
  for (let i = 0; i < sampleCount; i++) {
    const s = view.getInt16(i * 2, true); // little-endian
    const f = s / 32768;
    out[i] = Math.max(-1, Math.min(1, f));
  }

  return out;
}

/**
 * Create and initialize AudioContext with worklet
 */
export async function createAudioPlaybackContext(
  workletPath = "/audio-playback-worklet.js",
  sampleRate = 24000
): Promise<{ ctx: AudioContext; worklet: AudioWorkletNode }> {
  const ctx = new AudioContext({ sampleRate });

  try {
    await ctx.audioWorklet.addModule(workletPath);
  } catch (e) {
    throw new Error(`Failed to load audio worklet module at ${workletPath}`);
  }

  const worklet = new AudioWorkletNode(ctx, "audio-playback-processor");
  worklet.connect(ctx.destination);

  // Many browsers require a user gesture before audio can start; try to resume here.
  if (ctx.state === "suspended") {
    try {
      await ctx.resume();
    } catch {
      // Caller can resume later on user interaction.
    }
  }

  return { ctx, worklet };
}
