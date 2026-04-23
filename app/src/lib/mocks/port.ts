import { hashSeed } from "./sleep";

export type PortCongestion = {
  code: string;
  index: number; // 0..1
  vesselsWaiting: number;
  medianBerthWaitH: number;
  updatedAt: string;
};

const HOTSPOTS: Record<string, number> = {
  CNSHA: 0.71,
  CNNGB: 0.65,
  DEHAM: 0.58,
  NLRTM: 0.44,
  USLAX: 0.62,
  USNYC: 0.38,
  SGSIN: 0.31,
  AEJEA: 0.28,
  BEANR: 0.41,
};

export function portCongestion(code: string): PortCongestion {
  const rng = hashSeed(`${code}-${Math.floor(Date.now() / 600000)}`); // stabil für 10 min
  const base = HOTSPOTS[code] ?? 0.25 + rng() * 0.4;
  const noise = (rng() - 0.5) * 0.08;
  const idx = Math.max(0, Math.min(1, base + noise));
  return {
    code,
    index: idx,
    vesselsWaiting: Math.round(idx * 28),
    medianBerthWaitH: Math.round(idx * 72),
    updatedAt: new Date().toISOString(),
  };
}
