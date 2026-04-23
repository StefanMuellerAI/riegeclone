import { db } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { WorldMap } from "@/components/world-map";
import { Badge } from "@/components/ui/badge";
import { ModeChip } from "@/components/mode-chip";
import { StatusChip } from "@/components/status-chip";
import { Radar as RadarIcon } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function RadarPage() {
  const active = await db.shipment.findMany({
    where: { status: { in: ["IN_TRANSIT", "AT_DESTINATION", "BOOKED", "EXCEPTION"] } },
    orderBy: { delayRiskScore: "desc" },
    take: 60,
  });

  const arcs = active.map((s) => ({
    from: s.originCode,
    to: s.destCode,
    mode: s.mode === "AIR" ? "AIR" : "OCEAN",
    etd: s.etd.toISOString(),
    eta: s.eta.toISOString(),
    ref: s.ref,
    risk: (s.delayRiskScore ?? 0) > 65 ? "high" : (s.delayRiskScore ?? 0) > 35 ? "mid" : "low",
  } as const));

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
          <RadarIcon className="h-6 w-6 text-primary" /> Live-Radar
        </h1>
        <p className="text-sm text-muted-foreground max-w-2xl">
          Vollbild-Sicht auf alle aktiven Sendungen. Daten: AIS (MarineTraffic), ADS-B (OpenSky), Carrier-EDI.
          Update alle 60 Sekunden.
        </p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-start justify-between">
          <div>
            <CardTitle>Aktive Lanes</CardTitle>
            <CardDescription>{arcs.length} Sendungen in Bewegung</CardDescription>
          </div>
          <div className="flex gap-1.5 flex-wrap">
            <Badge variant="info">Ocean {arcs.filter((a) => a.mode === "OCEAN").length}</Badge>
            <Badge variant="info">Air {arcs.filter((a) => a.mode === "AIR").length}</Badge>
            <Badge variant="warning">Risk {arcs.filter((a) => a.risk === "high").length}</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <WorldMap arcs={arcs as any} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Flotte</CardTitle>
          <CardDescription>Vessels und Flights derzeit im Tracking</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
            {active.slice(0, 18).map((s) => (
              <div key={s.id} className="rounded-lg border p-3 flex items-center gap-3 hover:bg-muted/30">
                <ModeChip mode={s.mode as any} />
                <div className="min-w-0 flex-1">
                  <div className="font-mono text-xs font-semibold text-primary">{s.ref}</div>
                  <div className="text-[11px] text-muted-foreground truncate">
                    {s.mode === "OCEAN" ? s.vessel : s.flightNumber} · {s.originCode}→{s.destCode}
                  </div>
                </div>
                <StatusChip status={s.status} />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
