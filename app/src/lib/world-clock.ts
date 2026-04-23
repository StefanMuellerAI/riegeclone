import { db } from "@/lib/db";

// Virtual world clock: keeps running even when no user is online.
// On first boot, epochReal = epochVirtual = now.
// virtualNow = epochVirtual + (realNow - epochReal) * compression.

type ClockRow = {
  id: string;
  epochRealStart: Date;
  epochVirtualStart: Date;
  compression: number;
  ticks: number;
  lastTickAt: Date;
};

let cached: ClockRow | null = null;
let cachedAt = 0;

export async function getClock(): Promise<ClockRow> {
  const now = Date.now();
  if (cached && now - cachedAt < 3000) return cached;
  const row = await db.worldClock.upsert({
    where: { id: "singleton" },
    create: { id: "singleton", compression: 60 },
    update: {},
  });
  cached = row as ClockRow;
  cachedAt = now;
  return cached;
}

export async function setCompression(compression: number) {
  // Rebase so virtualNow stays continuous.
  const clock = await getClock();
  const vnow = virtualNow(clock);
  const updated = await db.worldClock.update({
    where: { id: "singleton" },
    data: {
      compression,
      epochRealStart: new Date(),
      epochVirtualStart: vnow,
    },
  });
  cached = updated as ClockRow;
  cachedAt = Date.now();
  return updated;
}

export function virtualNow(clock: ClockRow): Date {
  const realDelta = Date.now() - clock.epochRealStart.getTime();
  const virtualDelta = realDelta * clock.compression;
  return new Date(clock.epochVirtualStart.getTime() + virtualDelta);
}

export async function virtualNowAsync(): Promise<Date> {
  const c = await getClock();
  return virtualNow(c);
}

// Convert a real duration to the real wall clock time needed to cross a given virtual delta
export function realMsForVirtualMs(clock: ClockRow, virtualMs: number) {
  return virtualMs / clock.compression;
}
