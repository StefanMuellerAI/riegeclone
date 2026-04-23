import { simulateLatency, hashSeed } from "./sleep";

export type Sailing = {
  carrier: string;
  carrierCode: string;
  service: string;
  vessel: string;
  voyage: string;
  etd: string;
  eta: string;
  cutoff: string;
  transitDays: number;
};

const VESSELS = ["CMA CGM JACQUES SAADE", "EVER ALOT", "MAERSK EINDHOVEN", "MSC GÜLSÜN", "HMM ALGECIRAS", "ONE INNOVATION", "COSCO UNIVERSE", "MADRID MAERSK", "MSC ZOE"];

export async function nextSailings(origin: string, destination: string, count = 6): Promise<Sailing[]> {
  await simulateLatency(300, 900);
  const rng = hashSeed(`${origin}-${destination}-sail`);
  const result: Sailing[] = [];
  let base = new Date();
  base.setHours(base.getHours() + 6 + Math.floor(rng() * 20));

  for (let i = 0; i < count; i++) {
    const transit = 18 + Math.floor(rng() * 20);
    const etd = new Date(base.getTime() + i * (6 + rng() * 3) * 86400 * 1000);
    const eta = new Date(etd.getTime() + transit * 86400 * 1000);
    const cutoff = new Date(etd.getTime() - (36 + rng() * 20) * 3600 * 1000);
    const vi = Math.floor(rng() * VESSELS.length) + i;
    result.push({
      carrier: ["Maersk", "CMA CGM", "MSC", "Hapag-Lloyd"][i % 4],
      carrierCode: ["MAEU", "CMAU", "MSCU", "HLCU"][i % 4],
      service: ["AE7", "FAL1", "Lion", "FE2"][i % 4] + " Weekly",
      vessel: VESSELS[vi % VESSELS.length],
      voyage: `${Math.floor(rng() * 400 + 200)}W`,
      etd: etd.toISOString(),
      eta: eta.toISOString(),
      cutoff: cutoff.toISOString(),
      transitDays: transit,
    });
  }
  return result;
}
