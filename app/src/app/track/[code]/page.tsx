import { notFound } from "next/navigation";
import Link from "next/link";
import { Check, Clock, Globe, Package } from "lucide-react";
import { db } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatusChip } from "@/components/status-chip";
import { ModeChip } from "@/components/mode-chip";
import { WorldMap } from "@/components/world-map";
import { formatDate, formatDateTime, relativeFromNow } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function TrackPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const s = await db.shipment.findFirst({
    where: { OR: [{ ref: code }, { mawb: code }, { hbl: code }] },
    include: { milestones: { orderBy: { timestamp: "asc" } } },
  });
  if (!s) return notFound();

  const span = s.eta.getTime() - s.etd.getTime();
  const progress = Math.max(0, Math.min(1, span > 0 ? (Date.now() - s.etd.getTime()) / span : 0));
  const risk = s.delayRiskScore ?? 0;

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="border-b bg-card">
        <div className="mx-auto max-w-4xl px-6 py-4 flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[linear-gradient(135deg,#1e40af,#3b82f6)] text-white font-bold">F</div>
          <div>
            <div className="text-sm font-semibold">Frachtwerk · Track & Trace</div>
            <div className="text-xs text-muted-foreground">Öffentliche Sendungsverfolgung — keine Anmeldung nötig</div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-4xl p-6 space-y-5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <div className="text-xs text-muted-foreground">Tracking-Nummer</div>
            <h1 className="text-2xl font-semibold font-mono tracking-tight">{s.ref}</h1>
          </div>
          <div className="flex items-center gap-2">
            <ModeChip mode={s.mode as any} />
            <StatusChip status={s.status} />
            {s.mawb && <Badge variant="outline" className="font-mono">MAWB {s.mawb}</Badge>}
            {s.hbl && <Badge variant="outline" className="font-mono">B/L {s.hbl}</Badge>}
          </div>
        </div>

        <Card>
          <CardContent className="p-5">
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <div className="text-xs uppercase text-muted-foreground tracking-wider">Origin</div>
                <div className="font-semibold">{s.originCode}</div>
                <div className="text-xs text-muted-foreground">{s.originName}</div>
                <div className="text-xs tabular-nums">ETD {formatDate(s.etd)}</div>
              </div>
              <div className="flex items-center">
                <div className="w-full">
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <div className="h-full bg-[linear-gradient(90deg,#3b82f6,#8b5cf6)]" style={{ width: `${progress * 100}%` }} />
                  </div>
                  <div className="text-center text-xs text-muted-foreground mt-1.5">{Math.round(progress * 100)}% Distanz</div>
                </div>
              </div>
              <div className="md:text-right">
                <div className="text-xs uppercase text-muted-foreground tracking-wider">Destination</div>
                <div className="font-semibold">{s.destCode}</div>
                <div className="text-xs text-muted-foreground">{s.destName}</div>
                <div className="text-xs tabular-nums">
                  ETA {formatDate(s.eta)}
                  {s.etaPredicted && s.etaPredicted > s.eta && (
                    <span className="text-rose-600"> (+{Math.round((s.etaPredicted.getTime() - s.eta.getTime()) / 86400000)}d predictive)</span>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <WorldMap arcs={[{ from: s.originCode, to: s.destCode, mode: s.mode as any, etd: s.etd.toISOString(), eta: s.eta.toISOString(), ref: s.ref, risk: risk > 65 ? "high" : risk > 35 ? "mid" : "low" } as any]} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Status-Historie</CardTitle>
            <CardDescription>Alle Milestones in chronologischer Reihenfolge</CardDescription>
          </CardHeader>
          <CardContent>
            <ol className="relative pl-8 space-y-4 border-l">
              {s.milestones.map((m) => (
                <li key={m.id} className={m.isFuture ? "opacity-60" : ""}>
                  <span className={`absolute -left-[9px] top-1 grid h-4 w-4 place-items-center rounded-full ${m.isFuture ? "bg-muted ring-2 ring-background" : "bg-emerald-500 text-white"}`}>
                    {m.isFuture ? <Clock className="h-2.5 w-2.5 text-muted-foreground" /> : <Check className="h-2.5 w-2.5" />}
                  </span>
                  <div className="flex justify-between flex-wrap gap-2">
                    <div>
                      <div className="text-sm font-medium">{m.label}</div>
                      <div className="text-xs text-muted-foreground">{m.location ?? "—"}</div>
                    </div>
                    <div className="text-xs text-muted-foreground tabular-nums">
                      {formatDateTime(m.timestamp)}
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>

        <div className="text-center text-xs text-muted-foreground py-4">
          <Globe className="inline h-3 w-3 mr-1" /> Frachtwerk · openly shareable · no login required
        </div>
      </div>
    </div>
  );
}
