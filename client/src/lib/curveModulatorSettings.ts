export interface CurvePoint {
  x: number;
  y: number;
}

export interface CurveModulatorSettings {
  enabled: boolean;
  points: CurvePoint[];
  duration: number;
  loop: boolean;
  bipolar: boolean;
  smoothing: number;
}

export const defaultCurveModulatorSettings: CurveModulatorSettings = {
  enabled: false,
  points: [
    { x: 0, y: 0 },
    { x: 0.25, y: 1 },
    { x: 0.5, y: 0.5 },
    { x: 0.75, y: 0.8 },
    { x: 1, y: 0 },
  ],
  duration: 1.0,
  loop: false,
  bipolar: false,
  smoothing: 0.5,
};

const STORAGE_KEY = "oneshot-synth-curve-modulator";

export function loadCurveModulatorSettings(): CurveModulatorSettings {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return { ...defaultCurveModulatorSettings, ...JSON.parse(stored) };
    }
  } catch (e) {
    console.error("Failed to load curve modulator settings:", e);
  }
  return { ...defaultCurveModulatorSettings };
}

export function saveCurveModulatorSettings(settings: CurveModulatorSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch (e) {
    console.error("Failed to save curve modulator settings:", e);
  }
}

export function interpolateCurve(points: CurvePoint[], t: number, smoothing: number): number {
  if (points.length === 0) return 0;
  if (points.length === 1) return points[0].y;
  
  const sortedPoints = [...points].sort((a, b) => a.x - b.x);
  
  if (t <= sortedPoints[0].x) return sortedPoints[0].y;
  if (t >= sortedPoints[sortedPoints.length - 1].x) return sortedPoints[sortedPoints.length - 1].y;
  
  let i = 0;
  while (i < sortedPoints.length - 1 && sortedPoints[i + 1].x < t) {
    i++;
  }
  
  const p0 = sortedPoints[Math.max(0, i - 1)];
  const p1 = sortedPoints[i];
  const p2 = sortedPoints[i + 1];
  const p3 = sortedPoints[Math.min(sortedPoints.length - 1, i + 2)];
  
  const localT = (t - p1.x) / (p2.x - p1.x);
  
  if (smoothing < 0.1) {
    return p1.y + (p2.y - p1.y) * localT;
  }
  
  const tension = 1 - smoothing;
  const t2 = localT * localT;
  const t3 = t2 * localT;
  
  const m0 = (1 - tension) * (p2.y - p0.y) / 2;
  const m1 = (1 - tension) * (p3.y - p1.y) / 2;
  
  const a = 2 * t3 - 3 * t2 + 1;
  const b = t3 - 2 * t2 + localT;
  const c = -2 * t3 + 3 * t2;
  const d = t3 - t2;
  
  return a * p1.y + b * m0 + c * p2.y + d * m1;
}

export function randomizeCurveModulatorSettings(): CurveModulatorSettings {
  const pointCount = Math.floor(Math.random() * 4) + 3;
  const points: CurvePoint[] = [{ x: 0, y: Math.random() }];
  
  for (let i = 1; i < pointCount - 1; i++) {
    points.push({
      x: i / (pointCount - 1),
      y: Math.random(),
    });
  }
  
  points.push({ x: 1, y: Math.random() });
  
  return {
    enabled: true,
    points,
    duration: 0.1 + Math.random() * 1.9,
    loop: Math.random() > 0.7,
    bipolar: Math.random() > 0.5,
    smoothing: 0.3 + Math.random() * 0.5,
  };
}
