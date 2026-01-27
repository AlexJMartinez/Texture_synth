const EPS = 1e-5;

export type AHD = {
  attack: number;
  hold: number;
  decay: number;
};

function clampMin(x: number, min: number) {
  return Math.max(min, x);
}

export function triggerAHD(
  param: AudioParam,
  t0: number,
  ahd: AHD,
  peak = 1.0,
  opts?: {
    startFromCurrent?: boolean;
    minTimeSec?: number;
  }
) {
  const minT = opts?.minTimeSec ?? 0.0005;
  const A = clampMin(ahd.attack, minT);
  const H = Math.max(0, ahd.hold);
  const D = clampMin(ahd.decay, minT);
  // Ensure peak is always positive to prevent "value should be positive" error
  const safePeak = Math.max(EPS, peak);

  const startFromCurrent = opts?.startFromCurrent ?? true;

  const anyParam = param as any;
  if (typeof anyParam.cancelAndHoldAtTime === "function") {
    anyParam.cancelAndHoldAtTime(t0);
  } else {
    param.cancelScheduledValues(t0);
    param.setValueAtTime(Math.max(EPS, param.value), t0);
  }

  const start = startFromCurrent ? Math.max(EPS, param.value) : EPS;
  param.setValueAtTime(start, t0);

  // Use safePeak which is already ensured to be positive
  param.setTargetAtTime(safePeak, t0, A / 5);

  const tA = t0 + A;
  param.setValueAtTime(safePeak, tA);

  const tH = tA + H;
  param.setTargetAtTime(EPS, tH, D / 5);

  const tEnd = tH + D;
  return tEnd;
}

export function stopWithFade(
  param: AudioParam,
  t0: number,
  fadeTime = 0.002
) {
  // Ensure fadeTime is always positive to prevent "value should be positive" error
  const safeFadeTime = Math.max(0.0005, fadeTime);
  const timeConstant = Math.max(0.0001, safeFadeTime / 5);
  
  const anyParam = param as any;
  if (typeof anyParam.cancelAndHoldAtTime === "function") {
    anyParam.cancelAndHoldAtTime(t0);
  } else {
    param.cancelScheduledValues(t0);
    param.setValueAtTime(Math.max(EPS, param.value), t0);
  }
  
  param.setTargetAtTime(EPS, t0, timeConstant);
  return t0 + safeFadeTime;
}

export { EPS };
