import { NextResponse } from "next/server";
import { getClock, setCompression } from "@/lib/world-clock";
import { runTick } from "@/lib/tick";

export const runtime = "nodejs";

export async function GET() {
  const c = await getClock();
  return NextResponse.json({
    epochRealStart: c.epochRealStart.toISOString(),
    epochVirtualStart: c.epochVirtualStart.toISOString(),
    compression: c.compression,
    ticks: c.ticks,
    lastTickAt: c.lastTickAt.toISOString(),
  });
}

export async function POST(req: Request) {
  const body = await req.json();
  if (typeof body.compression === "number") {
    const updated = await setCompression(body.compression);
    // Run a tick immediately so user sees movement at new speed
    try { await runTick(); } catch {}
    return NextResponse.json(updated);
  }
  if (body.action === "tick") {
    const r = await runTick();
    return NextResponse.json(r);
  }
  return NextResponse.json({ ok: false }, { status: 400 });
}
