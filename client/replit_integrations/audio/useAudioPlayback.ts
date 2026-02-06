/**
 * React hook for streaming audio playback using AudioWorklet.
 * Supports real-time PCM16 audio streaming from SSE responses.
 * Includes sequence buffer for reordering out-of-order chunks.
 */
import { useRef, useCallback, useState } from "react";
import { decodePCM16ToFloat32 } from "./audio-utils";

const MAX_PENDING_SEQUENCES = 64;

export type PlaybackState = "idle" | "playing" | "ended";

/**
 * Reorders audio chunks that may arrive out of sequence.
 * Buffers chunks until they can be played in correct order.
 *
 * Example: If chunks arrive as seq 2, seq 0, seq 1:
 * - seq 2 arrives → buffered (waiting for seq 0)
 * - seq 0 arrives → played immediately, then check buffer
 * - seq 1 arrives → played immediately (seq 0 done), seq 2 now plays
 */
class SequenceBuffer {
  private pending = new Map<number, string[]>();
  private nextSeq = 0;

  /** Add chunk with sequence number, returns chunks ready to play in order */
  push(seq: number, data: string): string[] {
    // Store the chunk under its sequence number
    if (!this.pending.has(seq)) {
      this.pending.set(seq, []);
    }
    this.pending.get(seq)!.push(data);

    // If buffer grows too large, drop the oldest pending sequences
    if (this.pending.size > MAX_PENDING_SEQUENCES) {
      // Drop the farthest-ahead sequences first
      const keys = Array.from(this.pending.keys()).sort((a, b) => a - b);
      while (this.pending.size > MAX_PENDING_SEQUENCES) {
        const k = keys.pop();
        if (k !== undefined) this.pending.delete(k);
      }
    }

    // Drain consecutive ready sequences
    const ready: string[] = [];
    while (this.pending.has(this.nextSeq)) {
      ready.push(...this.pending.get(this.nextSeq)!);
      this.pending.delete(this.nextSeq);
      this.nextSeq++;
    }
    return ready;
  }

  reset() {
    this.pending.clear();
    this.nextSeq = 0;
  }
}

export function useAudioPlayback(workletPath = "/audio-playback-worklet.js") {
  const [state, setState] = useState<PlaybackState>("idle");
  const [error, setError] = useState<string | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const workletRef = useRef<AudioWorkletNode | null>(null);
  const readyRef = useRef(false);
  const seqBufferRef = useRef(new SequenceBuffer());
  const workletPathRef = useRef<string>(workletPath);

  const init = useCallback(async () => {
    try {
      // If workletPath changed, force re-init
      if (workletPathRef.current !== workletPath) {
        workletPathRef.current = workletPath;
        readyRef.current = false;
      }

      if (readyRef.current) return;

      setError(null);

      const ctx = new AudioContext({ sampleRate: 24000 });
      try {
        await ctx.audioWorklet.addModule(workletPath);
      } catch (e) {
        await ctx.close();
        throw new Error(`Failed to load audio worklet at ${workletPath}`);
      }

      const worklet = new AudioWorkletNode(ctx, "audio-playback-processor");
      worklet.connect(ctx.destination);

      worklet.port.onmessage = (e) => {
        if (e.data?.type === "ended") {
          seqBufferRef.current.reset();
          setState("ended");
        }
      };

      // Many browsers require a user gesture; attempt resume here.
      if (ctx.state === "suspended") {
        try {
          await ctx.resume();
        } catch {
          // Caller can resume later on user gesture.
        }
      }

      ctxRef.current = ctx;
      workletRef.current = worklet;
      readyRef.current = true;
    } catch (e: any) {
      console.error(e);
      setError(e?.message ?? "Failed to initialize audio playback");
      readyRef.current = false;
    }
  }, [workletPath]);

  /** Push audio directly (no sequencing) - for simple streaming */
  const pushAudio = useCallback((base64Audio: string) => {
    if (!workletRef.current) {
      console.warn("useAudioPlayback: not initialized; call init() before pushing audio");
      return;
    }
    const samples = decodePCM16ToFloat32(base64Audio);
    workletRef.current.port.postMessage({ type: "audio", samples });
    setState("playing");
  }, []);

  /** Push audio with sequence number - reorders before playback */
  const pushSequencedAudio = useCallback((seq: number, base64Audio: string) => {
    if (!workletRef.current) {
      console.warn("useAudioPlayback: not initialized; call init() before pushing audio");
      return;
    }

    const readyChunks = seqBufferRef.current.push(seq, base64Audio);
    for (const chunk of readyChunks) {
      const samples = decodePCM16ToFloat32(chunk);
      workletRef.current.port.postMessage({ type: "audio", samples });
    }
    if (readyChunks.length > 0) {
      setState("playing");
    }
  }, []);

  const signalComplete = useCallback(() => {
    workletRef.current?.port.postMessage({ type: "streamComplete" });
  }, []);

  const clear = useCallback(() => {
    workletRef.current?.port.postMessage({ type: "clear" });
    seqBufferRef.current.reset();
    setState("idle");
  }, []);

  const dispose = useCallback(async () => {
    try {
      workletRef.current?.port.postMessage({ type: "stop" });
      workletRef.current?.disconnect();
      workletRef.current = null;
      readyRef.current = false;
      seqBufferRef.current.reset();
      setState("idle");
      const ctx = ctxRef.current;
      ctxRef.current = null;
      if (ctx && ctx.state !== "closed") {
        await ctx.close();
      }
    } catch (e) {
      console.warn("Failed to dispose audio playback:", e);
    }
  }, []);

  return { state, error, init, pushAudio, pushSequencedAudio, signalComplete, clear, dispose };
}
