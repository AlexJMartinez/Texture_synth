import type { PitchState, PitchModeType } from "@shared/schema";

export type { PitchState };
export type PitchMode = PitchModeType;

const LN2 = Math.log(2);

export function stToHz(baseHz: number, st: number): number {
  return baseHz * Math.pow(2, st / 12);
}

export function hzToSt(baseHz: number, hz: number): number {
  return 12 * (Math.log(hz / baseHz) / LN2);
}

export function clamp(x: number, a: number, b: number): number {
  return Math.max(a, Math.min(b, x));
}

export function pitchToHz(p: PitchState | number | undefined): number {
  if (typeof p === 'number') {
    return p;
  }
  if (!p || typeof p !== 'object') {
    return 440;
  }
  const totalSt = (p.st ?? 0) + (p.cents ?? 0) / 100;
  return stToHz(p.baseHz ?? 440, totalSt);
}

export function hzToPitchState(hz: number, baseHz: number = 440): PitchState {
  return {
    mode: "hz",
    baseHz,
    st: hzToSt(baseHz, hz),
    cents: 0,
  };
}

export function createDefaultPitchState(baseHz: number = 440): PitchState {
  return {
    mode: "hz",
    baseHz,
    st: 0,
    cents: 0,
  };
}

export const PITCH_RANGES = {
  coarse: { minSt: -48, maxSt: 48 },
  extended: { minSt: -96, maxSt: 96 },
  cents: { min: -100, max: 100 },
  hz: { min: 20, max: 20000 },
};

type QuantizeOpts = {
  mode: PitchMode;
  stepSt?: number;
  hysteresisSt?: number;
};

export function quantizeSt(rawSt: number, prevSt: number, opts: QuantizeOpts): number {
  const step =
    opts.stepSt ??
    (opts.mode === "oct" ? 12 : opts.mode === "st" ? 0.1 : 0);

  if (opts.mode === "hz" || step === 0) return rawSt;

  const hyst = opts.hysteresisSt ?? 0.15;

  const idx = Math.round(rawSt / step);
  const snapped = idx * step;

  const prevIdx = Math.round(prevSt / step);
  const prevSnap = prevIdx * step;

  if (snapped !== prevSnap) {
    const dNew = Math.abs(rawSt - snapped);
    const dPrev = Math.abs(rawSt - prevSnap);
    if (dNew + hyst >= dPrev) return prevSnap;
  }

  return snapped;
}

export function setCoarseSt(
  p: PitchState,
  rawSt: number,
  prevSt: number,
  range: { minSt: number; maxSt: number } = PITCH_RANGES.coarse,
): PitchState {
  let st = clamp(rawSt, range.minSt, range.maxSt);
  st = quantizeSt(st, prevSt, { mode: p.mode });
  return { ...p, st };
}

export function getDisplayValue(p: PitchState): { value: number; unit: string } {
  switch (p.mode) {
    case "hz":
      return { value: Math.round(pitchToHz(p)), unit: "Hz" };
    case "st":
      return { value: Math.round(((p.st ?? 0) * 10)) / 10, unit: "st" };
    case "oct":
      return { value: Math.round((((p.st ?? 0) / 12) * 100)) / 100, unit: "oct" };
  }
}

export function getKnobConfig(mode: PitchMode | undefined, range = PITCH_RANGES.coarse, baseHz: number = 440) {
  if (!mode) mode = "hz";
  switch (mode) {
    case "hz":
      return {
        min: stToHz(baseHz, range.minSt),
        max: stToHz(baseHz, range.maxSt),
        step: 1,
        logarithmic: true,
      };
    case "st":
      return {
        min: range.minSt,
        max: range.maxSt,
        step: 1,
        logarithmic: false,
      };
    case "oct":
      return {
        min: range.minSt / 12,
        max: range.maxSt / 12,
        step: 1,
        logarithmic: false,
      };
  }
}

export function handlePitchKnobChange(
  p: PitchState | number | undefined,
  value: number,
  prevSt: number,
  range = PITCH_RANGES.coarse,
): PitchState {
  const pitch = normalizePitch(p);
  let newSt: number;
  
  switch (pitch.mode) {
    case "hz":
      // Clamp Hz based on the current semitone range + baseHz, and also keep a global safety clamp.
      const hzMinFromRange = stToHz(pitch.baseHz, range.minSt);
      const hzMaxFromRange = stToHz(pitch.baseHz, range.maxSt);
      const hzMin = Math.max(PITCH_RANGES.hz.min, Math.min(hzMinFromRange, hzMaxFromRange));
      const hzMax = Math.min(PITCH_RANGES.hz.max, Math.max(hzMinFromRange, hzMaxFromRange));
      newSt = hzToSt(pitch.baseHz, clamp(value, hzMin, hzMax));
      break;
    case "st":
      newSt = value;
      break;
    case "oct":
      newSt = value * 12;
      break;
  }
  
  return setCoarseSt(pitch, newSt, prevSt, range);
}

export function normalizePitch(p: PitchState | number | undefined): PitchState {
  if (typeof p === 'number') {
    return hzToPitchState(p);
  }
  if (!p || typeof p !== 'object') {
    return createDefaultPitchState();
  }
  return {
    mode: p.mode ?? "hz",
    baseHz: p.baseHz ?? 440,
    st: p.st ?? 0,
    cents: p.cents ?? 0,
  };
}

export function getKnobValue(p: PitchState | number | undefined): number {
  if (typeof p === 'number') {
    return p;
  }
  if (!p || typeof p !== 'object') {
    return 440;
  }
  switch (p.mode) {
    case "hz":
      return pitchToHz(p);
    case "st":
      return p.st ?? 0;
    case "oct":
      return (p.st ?? 0) / 12;
    default:
      return pitchToHz(p);
  }
}
