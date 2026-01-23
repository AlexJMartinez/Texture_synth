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

  param.setTargetAtTime(Math.max(EPS, peak), t0, A / 5);

  const tA = t0 + A;
  param.setValueAtTime(Math.max(EPS, peak), tA);

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
  const anyParam = param as any;
  if (typeof anyParam.cancelAndHoldAtTime === "function") {
    anyParam.cancelAndHoldAtTime(t0);
  } else {
    param.cancelScheduledValues(t0);
    param.setValueAtTime(Math.max(EPS, param.value), t0);
  }
  
  param.setTargetAtTime(EPS, t0, fadeTime / 5);
  return t0 + fadeTime;
}

export { EPS };
