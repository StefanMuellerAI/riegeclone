export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function simulateLatency(min = 200, max = 1200) {
  await sleep(min + Math.random() * (max - min));
}

// Seeded "random" based on input string for determinism in mocks
export function hashSeed(str: string) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) h = (h ^ str.charCodeAt(i)) * 16777619;
  return () => {
    h += 0x6D2B79F5;
    let t = h;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
