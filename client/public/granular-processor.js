// Granular AudioWorkletProcessor - Sample-accurate grain scheduling
// This processor runs on the audio thread for click-free, deterministic grain playback

class GranularProcessor extends AudioWorkletProcessor {
  constructor(options) {
    super();

    // Sample buffer storage (mono or stereo)
    this.bufL = null;
    this.bufR = null;
    this.bufLen = 0;

    // Absolute output sample clock
    this.nowSample = 0;

    // Scheduled events queue (kept sorted by startSample)
    this.events = [];
    this.eventsHead = 0;

    // Active grain pool
    this.maxGrains = (options?.processorOptions?.maxGrains) ?? 64;
    this.grains = new Array(this.maxGrains);
    for (let i = 0; i < this.maxGrains; i++) this.grains[i] = null;

    // Clock reporting for main thread sync
    this.clockTimer = 0;
    this.clockIntervalSamples = Math.floor(0.05 * sampleRate); // 50ms default
    this.clockEnabled = false;

    // Window type (default: hann)
    this.windowType = 'hann';

    // Handle messages from main thread
    this.port.onmessage = (e) => {
      const msg = e.data;

      if (msg?.type === "setBuffer") {
        const { channels, length, numChannels } = msg;
        this.bufLen = length | 0;

        // channels are transferred ArrayBuffers
        const ch0 = new Float32Array(channels[0]);
        const ch1 = (numChannels > 1) ? new Float32Array(channels[1]) : null;

        this.bufL = ch0;
        this.bufR = ch1;
        this.port.postMessage({ type: "bufferInfo", length: this.bufLen });
      }

      if (msg?.type === "schedule") {
        const incoming = msg.events || [];

        // Compact consumed events occasionally to keep memory/CPU stable
        if (this.eventsHead > 0 && this.eventsHead >= 1024) {
          this.events = this.events.slice(this.eventsHead);
          this.eventsHead = 0;
        }

        for (let i = 0; i < incoming.length; i++) {
          this.events.push(incoming[i]);
        }

        // Keep queue sorted by startSample
        this.events.sort((a, b) => a.startSample - b.startSample);
      }

      if (msg?.type === "clockStart") {
        this.clockEnabled = true;
        const ms = msg.intervalMs ?? 50;
        this.clockIntervalSamples = Math.max(128, Math.floor((ms / 1000) * sampleRate));
      }

      if (msg?.type === "clockStop") {
        this.clockEnabled = false;
      }

      if (msg?.type === "setWindowType") {
        this.windowType = msg.windowType || 'hann';
      }

      if (msg?.type === "clear") {
        // Clear all scheduled events and active grains
        this.events = [];
        this.eventsHead = 0;
        for (let i = 0; i < this.maxGrains; i++) this.grains[i] = null;
      }

      if (msg?.type === "reset") {
        // Full reset including clock
        this.events = [];
        this.eventsHead = 0;
        for (let i = 0; i < this.maxGrains; i++) this.grains[i] = null;
        this.nowSample = 0;
        this.clockTimer = 0;
      }
    };
  }

  // Window functions
  windowHann(phase01) {
    return 0.5 - 0.5 * Math.cos(2 * Math.PI * phase01);
  }

  windowGauss(phase01, sigma = 0.4) {
    const x = phase01 - 0.5;
    return Math.exp(-0.5 * Math.pow(x / sigma, 2));
  }

  windowBlackman(phase01) {
    const a0 = 0.42;
    const a1 = 0.5;
    const a2 = 0.08;
    return a0 - a1 * Math.cos(2 * Math.PI * phase01) + a2 * Math.cos(4 * Math.PI * phase01);
  }

  windowRect() {
    return 1.0;
  }

  getWindow(phase01, type) {
    switch (type) {
      case 'gauss': return this.windowGauss(phase01);
      case 'blackman': return this.windowBlackman(phase01);
      case 'rect': return this.windowRect();
      case 'hann':
      default: return this.windowHann(phase01);
    }
  }

  // Linear interpolation for reading buffer at fractional positions
  readInterp(buf, idxFloat) {
    const len = this.bufLen;
    // Clamp to valid range
    const x = Math.max(0, Math.min(len - 2, idxFloat));
    const i = x | 0;
    const frac = x - i;
    return buf[i] * (1 - frac) + buf[i + 1] * frac;
  }

  // Cubic interpolation for better quality
  readCubic(buf, idxFloat) {
    const len = this.bufLen;
    const x = Math.max(1, Math.min(len - 3, idxFloat));
    const i = Math.floor(x);
    const t = x - i;
    
    const y0 = buf[i - 1] || buf[i];
    const y1 = buf[i];
    const y2 = buf[i + 1] || buf[i];
    const y3 = buf[i + 2] || buf[i + 1] || buf[i];
    
    const a0 = y3 - y2 - y0 + y1;
    const a1 = y0 - y1 - a0;
    const a2 = y2 - y0;
    const a3 = y1;
    
    return a0 * t * t * t + a1 * t * t + a2 * t + a3;
  }

  allocGrain(ev) {
    // Find free slot in grain pool
    for (let i = 0; i < this.maxGrains; i++) {
      if (this.grains[i] === null) {
        const startPos = ev.pos01 * (this.bufLen - 1);
        this.grains[i] = {
          startSample: ev.startSample | 0,
          dur: ev.durSamp | 0,
          pos: startPos,
          phase: 0,            // sample index within grain
          rate: ev.rate,
          gainL: ev.gainL,
          gainR: ev.gainR,
          windowType: ev.windowType || this.windowType
        };
        return;
      }
    }
    // No free slot: drop grain (could implement "steal quietest" policy)
  }

  process(_inputs, outputs) {
    const out = outputs[0];
    if (!out || out.length === 0) return true;
    
    const outL = out[0];
    const outR = out[1] || out[0]; // if mono output, mirror
    const blockLen = outL.length;

    // Check if buffer is loaded
    const hasBuffer = this.bufL && this.bufLen > 1;

    const blockStart = this.nowSample;
    const blockEnd = this.nowSample + blockLen;

    // Activate events that start within this block
    while (this.eventsHead < this.events.length && this.events[this.eventsHead].startSample < blockEnd) {
      const ev = this.events[this.eventsHead];
      if (ev.startSample >= blockStart) {
        this.allocGrain(ev);
      }
      this.eventsHead++;
    }

    // Compact consumed events occasionally to avoid unbounded growth
    if (this.eventsHead > 0 && this.eventsHead >= 1024) {
      this.events = this.events.slice(this.eventsHead);
      this.eventsHead = 0;
    }

    // Clear output buffers
    for (let i = 0; i < blockLen; i++) {
      outL[i] = 0;
      if (outR !== outL) outR[i] = 0;
    }

    if (hasBuffer) {
      // Render active grains sample-by-sample
      for (let gi = 0; gi < this.maxGrains; gi++) {
        const g = this.grains[gi];
        if (!g) continue;

        // Determine where this grain begins in this block
        let localStart = g.startSample - blockStart;
        if (localStart < 0) localStart = 0;
        if (localStart >= blockLen) continue;

        for (let i = localStart; i < blockLen; i++) {
          const k = g.phase;
          if (k >= g.dur) break;

          const phase01 = k / g.dur;
          const w = this.getWindow(phase01, g.windowType);

          const srcIdx = g.pos + (k * g.rate);
          const sL = this.readCubic(this.bufL, srcIdx);
          const sR = this.bufR ? this.readCubic(this.bufR, srcIdx) : sL;

          outL[i] += sL * w * g.gainL;
          if (outR !== outL) outR[i] += sR * w * g.gainR;

          g.phase++;
        }

        // If grain finished, free the slot
        if (g.phase >= g.dur) this.grains[gi] = null;
      }
    }

    // Advance the absolute sample clock
    this.nowSample += blockLen;

    // Send clock updates to main thread for sync
    if (this.clockEnabled) {
      this.clockTimer += blockLen;
      if (this.clockTimer >= this.clockIntervalSamples) {
        this.clockTimer = 0;
        this.port.postMessage({ type: "clock", nowSample: this.nowSample });
      }
    }

    return true;
  }
}

registerProcessor("granular-processor", GranularProcessor);
