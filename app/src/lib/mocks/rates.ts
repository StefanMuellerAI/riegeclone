import { simulateLatency, hashSeed } from "./sleep";
import { NODE_BY_CODE } from "@/lib/ports";

export type RateQuote = {
  carrier: string;
  carrierCode: string;
  service: string;
  transitDays: number;
  basePriceUsd: number;
  surchargesUsd: number;
  totalUsd: number;
  co2eKg: number;
  cutoff: string;
  nextDeparture: string;
  reliability: number; // 0..1
};

const OCEAN_CARRIERS = [
  { name: "Maersk", code: "MAEU", service: "AE7 Weekly" },
  { name: "MSC", code: "MSCU", service: "Lion Service" },
  { name: "CMA CGM", code: "CMAU", service: "FAL1" },
  { name: "Hapag-Lloyd", code: "HLCU", service: "FE2" },
  { name: "ONE", code: "ONEY", service: "NE6" },
];
const AIR_CARRIERS = [
  { name: "Lufthansa Cargo", code: "LH", service: "Direct Frachter" },
  { name: "Cathay Pacific", code: "CX", service: "Cargo" },
  { name: "Emirates SkyCargo", code: "EK", service: "Freighter" },
  { name: "Qatar Airways Cargo", code: "QR", service: "Freighter" },
  { name: "FedEx Express", code: "FX", service: "International Priority" },
];

export async function lookupRates(
  origin: string,
  destination: string,
  mode: "AIR" | "OCEAN",
  weightKg: number,
  volumeM3 = 0
): Promise<RateQuote[]> {
  await simulateLatency(350, 1100);

  const rng = hashSeed(`${origin}-${destination}-${mode}`);
  const a = NODE_BY_CODE[origin];
  const b = NODE_BY_CODE[destination];
  const distance = a && b
    ? Math.acos(
        Math.sin((a.lat * Math.PI) / 180) * Math.sin((b.lat * Math.PI) / 180) +
          Math.cos((a.lat * Math.PI) / 180) *
            Math.cos((b.lat * Math.PI) / 180) *
            Math.cos(((a.lon - b.lon) * Math.PI) / 180)
      ) * 6371
    : 9000;

  const carriers = mode === "AIR" ? AIR_CARRIERS : OCEAN_CARRIERS;
  const chosen = carriers.slice(0, 3 + Math.floor(rng() * 2));

  return chosen.map((c, i) => {
    const baseTransit = mode === "AIR" ? Math.max(1, Math.round(distance / 900)) : Math.round(distance / 780);
    const transitJitter = Math.floor(rng() * 4);
    const transitDays = baseTransit + transitJitter + i;
    const chargeable = mode === "AIR" ? Math.max(weightKg, volumeM3 * 167) : weightKg;
    const baseRate = mode === "AIR" ? 3.2 + rng() * 2.6 : 0.08 + rng() * 0.18; // USD per kg
    const basePrice = Math.round(baseRate * chargeable);
    const surcharges = Math.round(basePrice * (0.12 + rng() * 0.18));
    const total = basePrice + surcharges;
    const co2Factor = mode === "AIR" ? 0.602 : 0.015;
    const co2 = Math.round((chargeable / 1000) * distance * co2Factor);
    const reliability = 0.72 + rng() * 0.26;

    const nextDep = new Date();
    nextDep.setDate(nextDep.getDate() + 1 + Math.floor(rng() * 5));
    const cutoff = new Date(nextDep.getTime() - 36 * 3600 * 1000);

    return {
      carrier: c.name,
      carrierCode: c.code,
      service: c.service,
      transitDays,
      basePriceUsd: basePrice,
      surchargesUsd: surcharges,
      totalUsd: total,
      co2eKg: co2,
      cutoff: cutoff.toISOString(),
      nextDeparture: nextDep.toISOString(),
      reliability,
    };
  });
}
