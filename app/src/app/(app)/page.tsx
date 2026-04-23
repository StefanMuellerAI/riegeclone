import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  Ban,
  Check,
  FileCheck2,
  Leaf,
  Package,
  Plane,
  Radar as RadarIcon,
  Ship,
  Sparkles,
  TimerReset,
  TrendingUp,
} from "lucide-react";
import { db } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { KpiCard } from "@/components/kpi-card";
import { WorldMap } from "@/components/world-map";
import { StatusChip } from "@/components/status-chip";
import { ModeChip } from "@/components/mode-chip";
import { CarbonChart } from "@/components/carbon-chart";
import { formatDate, formatKg, relativeFromNow } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [
    totalShipments,
    inTransit,
    delivered,
    exceptions,
    monthShipments,
    delayRiskList,
    alerts,
    customsOpen,
    cbamReady,
    activeArcs,
  ] = await Promise.all([
    db.shipment.count(),
    db.shipment.count({ where: { status: "IN_TRANSIT" } }),
    db.shipment.count({ where: { status: "DELIVERED" } }),
    db.shipment.count({ where: { status: "EXCEPTION" } }),
    db.shipment.findMany({
      where: { createdAt: { gte: monthStart } },
      select: { mode: true, chargeableKg: true, co2eKg: true, status: true },
    }),
    db.shipment.findMany({
      where: { status: { in: ["IN_TRANSIT", "BOOKED", "AT_DESTINATION", "EXCEPTION"] } },
      orderBy: { delayRiskScore: "desc" },
      take: 6,
      select: {
        id: true, ref: true, mode: true, originCode: true, destCode: true, status: true,
        carrier: true, eta: true, etaPredicted: true, delayRiskScore: true,
        customer: { select: { name: true } },
      },
    }),
    db.alert.findMany({ orderBy: { createdAt: "desc" }, take: 6 }),
    db.customsDeclaration.findMany({
      where: { status: { in: ["DRAFT", "SUBMITTED"] } },
      take: 5,
      orderBy: { createdAt: "desc" },
      include: { shipment: { select: { ref: true, destCode: true, originCode: true } } },
    }),
    db.cbamReport.findFirst({ where: { status: "READY_TO_SUBMIT" } }),
    db.shipment.findMany({
      where: { status: { in: ["IN_TRANSIT", "AT_DESTINATION", "BOOKED", "EXCEPTION"] } },
      select: { id: true, ref: true, originCode: true, destCode: true, mode: true, etd: true, eta: true, delayRiskScore: true },
      take: 24,
    }),
  ]);

  const onTimeRate = delivered + exceptions > 0 ? Math.round((delivered / (delivered + exceptions)) * 100) : 94;
  const monthKg = monthShipments.reduce((s, x) => s + x.chargeableKg, 0);
  const monthCo2 = monthShipments.reduce((s, x) => s + x.co2eKg, 0);

  const arcs = activeArcs.map((s) => ({
    from: s.originCode,
    to: s.destCode,
    mode: s.mode === "AIR" ? "AIR" : "OCEAN",
    etd: s.etd.toISOString(),
    eta: s.eta.toISOString(),
    ref: s.ref,
    risk: (s.delayRiskScore ?? 0) > 65 ? "high" : (s.delayRiskScore ?? 0) > 35 ? "mid" : "low",
  } as const));

  // Fake week buckets for carbon chart (if empty DB, still render)
  const weeks = ["KW 3", "KW 4", "KW 5", "KW 6", "KW 7", "KW 8", "KW 9", "KW 10", "KW 11", "KW 12", "KW 13", "KW 14", "KW 15", "KW 16"];
  const carbonSeries = weeks.map((w, i) => ({
    week: w,
    air: Math.round(12 + Math.sin(i / 2) * 4 + Math.random() * 3),
    ocean: Math.round(26 + Math.cos(i / 3) * 7 + Math.random() * 4),
  }));

  return (
    <div className="relative">
      {/* Hero band with radial fade */}
      <div className="bg-radial-fade border-b">
        <div className="px-6 py-6 max-w-[1600px] mx-auto">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                <Sparkles className="h-3.5 w-3.5" /> AI-native Forwarding OS
              </div>
              <h1 className="text-2xl font-semibold tracking-tight">Guten Morgen, Stefan.</h1>
              <p className="text-sm text-muted-foreground">
                Heute laufen {inTransit} Sendungen, {exceptions} Exceptions offen. {cbamReady && (
                  <>CBAM Q1 2026 ist zur Einreichung bereit. </>
                )}
                Copilot rechts unten.
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" asChild>
                <Link href="/extract">
                  <Sparkles className="h-4 w-4" /> Doc hochladen
                </Link>
              </Button>
              <Button variant="gradient" size="sm" asChild>
                <Link href="/shipments/new">
                  <Package className="h-4 w-4" /> Neue Sendung
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="p-6 max-w-[1600px] mx-auto space-y-6">
        {/* KPI ROW */}
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <KpiCard
            label="Aktive Sendungen"
            value={inTransit.toString()}
            delta={{ value: "+12.4%", direction: "up", positive: true }}
            icon={Activity}
            accent="blue"
            hint={`${totalShipments} gesamt im System`}
          />
          <KpiCard
            label="On-Time-Rate"
            value={`${onTimeRate}%`}
            delta={{ value: "+3.1 pp", direction: "up", positive: true }}
            icon={TimerReset}
            accent="emerald"
            hint="Ziel: 96%"
          />
          <KpiCard
            label="Chargeable (Monat)"
            value={formatKg(monthKg)}
            delta={{ value: "+8.2%", direction: "up", positive: true }}
            icon={Package}
            accent="violet"
            hint={`${monthShipments.length} Sendungen in KW 16`}
          />
          <KpiCard
            label="CO2e (Monat)"
            value={`${(monthCo2 / 1000).toFixed(1)} t`}
            delta={{ value: "-4.9%", direction: "down", positive: true }}
            icon={Leaf}
            accent="emerald"
            hint="Ziel SBTi: -25% bis 2030"
          />
          <KpiCard
            label="Exceptions"
            value={exceptions.toString()}
            delta={{ value: "-2", direction: "down", positive: true }}
            icon={AlertTriangle}
            accent="amber"
            hint="Alle < 72h gelöst"
          />
        </div>

        {/* RADAR + RISK QUEUE */}
        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader className="flex flex-row items-start justify-between space-y-0">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <RadarIcon className="h-4 w-4 text-primary" /> Live-Radar
                </CardTitle>
                <CardDescription>AIS & ADS-B — Sendungen aktuell auf dem Planeten</CardDescription>
              </div>
              <Badge variant="info">{arcs.length} aktive Lanes</Badge>
            </CardHeader>
            <CardContent>
              <WorldMap arcs={arcs as any} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-start justify-between space-y-0">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-500" /> Delay Risk Queue
                </CardTitle>
                <CardDescription>Predictive ETA Score · Top 6</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {delayRiskList.map((s) => {
                const risk = s.delayRiskScore ?? 0;
                const delayedH = s.etaPredicted && s.etaPredicted > s.eta
                  ? Math.round((s.etaPredicted.getTime() - s.eta.getTime()) / 3600000)
                  : 0;
                return (
                  <Link
                    key={s.id}
                    href={`/shipments/${s.id}`}
                    className="flex items-center gap-3 group rounded-lg -mx-2 px-2 py-1.5 hover:bg-muted/50 transition-colors"
                  >
                    <ModeChip mode={s.mode as any} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-xs font-semibold group-hover:text-primary">{s.ref}</span>
                        <StatusChip status={s.status} />
                      </div>
                      <div className="text-xs text-muted-foreground truncate">
                        {s.originCode} → {s.destCode} · {s.customer?.name ?? "—"}
                      </div>
                    </div>
                    <div className="text-right leading-tight">
                      <div
                        className={`text-xs font-semibold tabular-nums ${risk > 65 ? "text-rose-600" : risk > 35 ? "text-amber-600" : "text-emerald-600"}`}
                      >
                        {risk}/100
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        {delayedH > 0 ? `+${Math.round(delayedH / 24)}d Delay` : "on plan"}
                      </div>
                    </div>
                  </Link>
                );
              })}
              <Button variant="ghost" size="sm" asChild className="w-full">
                <Link href="/shipments?filter=risk">Alle ansehen →</Link>
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* SECONDARY ROW */}
        <div className="grid gap-4 lg:grid-cols-3">
          {/* Alerts */}
          <Card>
            <CardHeader>
              <CardTitle>Alerts</CardTitle>
              <CardDescription>Automation & Operations</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2.5">
              {alerts.map((a) => (
                <div key={a.id} className="flex gap-2.5">
                  <div
                    className={`mt-1 h-2 w-2 rounded-full shrink-0 ${a.level === "critical" ? "bg-rose-500" : a.level === "warning" ? "bg-amber-500" : "bg-blue-500"}`}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium leading-tight">{a.title}</div>
                    <div className="text-xs text-muted-foreground leading-snug line-clamp-2">{a.body}</div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">{relativeFromNow(a.createdAt)}</div>
                  </div>
                </div>
              ))}
              {alerts.length === 0 && <div className="text-xs text-muted-foreground">Keine Alerts — alles im grünen Bereich.</div>}
            </CardContent>
          </Card>

          {/* Customs */}
          <Card>
            <CardHeader className="flex flex-row items-start justify-between space-y-0">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <FileCheck2 className="h-4 w-4 text-primary" /> Zoll-Pipeline
                </CardTitle>
                <CardDescription>ATLAS · e-dec · NCTS · AES</CardDescription>
              </div>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/customs">Alle →</Link>
              </Button>
            </CardHeader>
            <CardContent className="space-y-2.5">
              {customsOpen.map((c) => (
                <div key={c.id} className="flex items-center gap-3">
                  <Badge variant="outline" className="font-mono text-[10px]">
                    {c.regime.replace("_", " ")}
                  </Badge>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium">{c.shipment.ref}</div>
                    <div className="text-[11px] text-muted-foreground">
                      MRN: {c.mrn ?? "—"} · {c.shipment.originCode} → {c.shipment.destCode}
                    </div>
                  </div>
                  <StatusChip status={c.status} />
                </div>
              ))}
              {customsOpen.length === 0 && <div className="text-xs text-muted-foreground">Keine offenen Zollanmeldungen.</div>}
              <Separator />
              <div className="flex items-center gap-2 rounded-lg bg-emerald-500/10 p-2.5 text-xs text-emerald-700 dark:text-emerald-300">
                <Check className="h-4 w-4 shrink-0" />
                <div>
                  <div className="font-semibold">Sanktions-Screening aktiv</div>
                  <div>EU · UN · US OFAC — täglich 06:00 synchronisiert</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* CBAM */}
          <Card className="relative overflow-hidden">
            <div className="pointer-events-none absolute -right-20 -top-20 h-40 w-40 rounded-full bg-emerald-500/20 blur-3xl" />
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Leaf className="h-4 w-4 text-emerald-600" /> CBAM Q1 2026
                </CardTitle>
                <Badge variant="warning">Pflicht ab 2026</Badge>
              </div>
              <CardDescription>Carbon Border Adjustment Reporting</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 relative">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Embedded Emissions</span>
                <span className="font-semibold tabular-nums">87.4 t CO2e</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Relevante Sendungen</span>
                <span className="font-semibold">14</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">CN-Codes</span>
                <span className="font-mono text-xs">7208, 7304, 7318</span>
              </div>
              <Separator />
              <div>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-muted-foreground">Report-Vollständigkeit</span>
                  <span className="font-semibold">92%</span>
                </div>
                <Progress value={92} />
              </div>
              <Button variant="gradient" size="sm" className="w-full" asChild>
                <Link href="/cbam">
                  <TrendingUp className="h-4 w-4" /> Report öffnen
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* CARBON & SPLIT */}
        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Carbon Intensity · letzte 14 Wochen</CardTitle>
              <CardDescription>CO2e in Tonnen pro Woche, aufgeschlüsselt nach Modus</CardDescription>
            </CardHeader>
            <CardContent>
              <CarbonChart data={carbonSeries} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Mode-Split (Monat)</CardTitle>
              <CardDescription>Luft- vs. Seefracht nach Chargeable</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {(() => {
                const air = monthShipments.filter((s) => s.mode === "AIR").reduce((a, b) => a + b.chargeableKg, 0);
                const ocean = monthShipments.filter((s) => s.mode === "OCEAN").reduce((a, b) => a + b.chargeableKg, 0);
                const total = air + ocean || 1;
                return (
                  <>
                    <div>
                      <div className="flex justify-between text-sm mb-1.5">
                        <span className="flex items-center gap-1.5 text-muted-foreground">
                          <Plane className="h-3.5 w-3.5 text-violet-500" /> Air
                        </span>
                        <span className="font-semibold tabular-nums">{formatKg(air)}</span>
                      </div>
                      <Progress value={Math.round((air / total) * 100)} />
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1.5">
                        <span className="flex items-center gap-1.5 text-muted-foreground">
                          <Ship className="h-3.5 w-3.5 text-blue-500" /> Ocean
                        </span>
                        <span className="font-semibold tabular-nums">{formatKg(ocean)}</span>
                      </div>
                      <Progress value={Math.round((ocean / total) * 100)} />
                    </div>
                    <Separator />
                    <div className="text-xs text-muted-foreground">
                      Ø Chargeable pro Sendung: <span className="font-semibold text-foreground">{formatKg(total / (monthShipments.length || 1))}</span>
                    </div>
                  </>
                );
              })()}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
