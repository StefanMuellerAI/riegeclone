import { simulateLatency, hashSeed } from "./sleep";

export type AtlasResponse = {
  ok: boolean;
  mrn?: string;
  acceptedAt?: string;
  rejectionReason?: string;
  responseTimeMs: number;
};

export async function submitAtlas(ref: string): Promise<AtlasResponse> {
  const t0 = Date.now();
  await simulateLatency(1200, 2600);
  const rng = hashSeed(`atlas-${ref}-${Date.now()}`);
  const rejected = rng() < 0.12;
  if (rejected) {
    return {
      ok: false,
      rejectionReason: "ATLAS Fehler C204: HS-Code 7208.39 — Beleg A.TR fehlt bei Importeur aus TR",
      responseTimeMs: Date.now() - t0,
    };
  }
  const year = new Date().getFullYear().toString().slice(-2);
  const rand = Math.floor(rng() * 900000000 + 100000000);
  return {
    ok: true,
    mrn: `${year}DE${rand}`,
    acceptedAt: new Date().toISOString(),
    responseTimeMs: Date.now() - t0,
  };
}

export async function submitAes(ref: string): Promise<AtlasResponse> {
  await simulateLatency(900, 2000);
  const rng = hashSeed(`aes-${ref}`);
  const itn = `ITN${Math.floor(rng() * 900000000 + 100000000)}`;
  return { ok: true, mrn: itn, acceptedAt: new Date().toISOString(), responseTimeMs: 1400 };
}

export async function submitEdec(ref: string): Promise<AtlasResponse> {
  await simulateLatency(900, 2100);
  const rng = hashSeed(`edec-${ref}`);
  const ref_nr = `CH${Math.floor(rng() * 9000000 + 1000000)}`;
  return { ok: true, mrn: ref_nr, acceptedAt: new Date().toISOString(), responseTimeMs: 1700 };
}

export async function submitCbam(period: string): Promise<AtlasResponse> {
  await simulateLatency(1800, 3200);
  const rng = hashSeed(`cbam-${period}`);
  const id = `CBAM-${period}-${Math.floor(rng() * 90000 + 10000)}`;
  return { ok: true, mrn: id, acceptedAt: new Date().toISOString(), responseTimeMs: 2400 };
}
