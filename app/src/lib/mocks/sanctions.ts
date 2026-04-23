import { simulateLatency, hashSeed } from "./sleep";

export type ScreeningHit = {
  score: number; // 0..1
  list: string;
  matchedName: string;
  reason: string;
};

export type ScreeningResult = {
  clean: boolean;
  hits: ScreeningHit[];
  screenedAt: string;
  lists: string[];
};

const HOT_PATTERNS = [
  { pattern: /iran|tehran|mellat|melli|bank markazi/i, list: "US OFAC SDN", reason: "Direkte Treffer — Iran-bezogene Entity" },
  { pattern: /cuba|havana/i, list: "US OFAC SDN", reason: "Kuba-Embargo" },
  { pattern: /north korea|dprk|pyongyang/i, list: "UN Security Council", reason: "DPRK-Sanktionen" },
  { pattern: /crimea|sevastopol|donetsk/i, list: "EU Consolidated", reason: "Ukraine-Territorial-Beschränkung" },
  { pattern: /huawei|shenzhen hikvision|sensetime/i, list: "US Entity List", reason: "Export Control (BIS Entity List)" },
  { pattern: /sputnik trading|sovcomflot/i, list: "EU Consolidated", reason: "Russia Sanctions — Schiffs-Operator" },
];

export async function screenParty(name: string, country?: string): Promise<ScreeningResult> {
  await simulateLatency(400, 1200);
  const rng = hashSeed(name + (country ?? ""));
  const hits: ScreeningHit[] = [];

  for (const p of HOT_PATTERNS) {
    if (p.pattern.test(name)) {
      hits.push({
        score: 0.88 + rng() * 0.12,
        list: p.list,
        matchedName: name,
        reason: p.reason,
      });
    }
  }
  // Mild fuzzy hit 8% der Fälle zur Auflockerung
  if (hits.length === 0 && rng() < 0.07) {
    hits.push({
      score: 0.62 + rng() * 0.18,
      list: "EU Consolidated",
      matchedName: name + " (Fuzzy-Kandidat)",
      reason: "Namens-Ähnlichkeit mit sanktionierter Entity — Review empfohlen",
    });
  }

  return {
    clean: hits.length === 0,
    hits,
    screenedAt: new Date().toISOString(),
    lists: ["EU Consolidated", "UN Security Council", "US OFAC SDN", "UK OFSI", "DE BAFA"],
  };
}
