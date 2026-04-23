import { Download, FileText, Leaf } from "lucide-react";
import { db } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { formatDate } from "@/lib/utils";
import { CbamActions } from "./client";

export const dynamic = "force-dynamic";

const CBAM_CN = {
  "7208": "Flachgewalzte Stahlerzeugnisse, warm",
  "7210": "Flachgewalzte Stahlerzeugnisse, plattiert",
  "7304": "Nahtlose Rohre aus Eisen oder Stahl",
  "7318": "Schrauben, Muttern, Bolzen",
  "2523": "Zement",
  "7601": "Rohaluminium",
  "3102": "Mineralische Stickstoffdünger",
  "2804.10": "Wasserstoff",
};

export default async function CbamPage() {
  const [reports, relevantShipments] = await Promise.all([
    db.cbamReport.findMany({ orderBy: { period: "desc" } }),
    db.shipment.findMany({
      where: {
        direction: "IMPORT",
        OR: [
          { hsCodes: { hasSome: ["7208.39", "7208.51"] } },
          { hsCodes: { hasSome: ["7304.19"] } },
          { hsCodes: { hasSome: ["7318.15"] } },
        ],
      },
      take: 20,
      include: { shipper: true },
    }),
  ]);

  const current = reports.find((r) => r.status === "READY_TO_SUBMIT");

  return (
    <div className="p-6 max-w-[1500px] mx-auto space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <Leaf className="h-6 w-6 text-emerald-600" /> CBAM — Carbon Border Adjustment
          </h1>
          <p className="text-sm text-muted-foreground max-w-2xl">
            Seit 1. Januar 2026 pflichtig. Quartalsbericht für relevante Importe aus Drittländern. Frachtwerk aggregiert automatisch.
          </p>
        </div>
        <CbamActions currentPeriod="2026-Q2" />
      </div>

      {current && (
        <Card className="relative overflow-hidden">
          <div className="pointer-events-none absolute -right-32 -top-32 h-64 w-64 rounded-full bg-emerald-500/20 blur-3xl" />
          <CardHeader className="relative">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <CardTitle className="text-xl">Aktueller Report: {current.period}</CardTitle>
                <CardDescription>Einreichfrist: 30 Tage nach Quartalsende · Zuständige Behörde: DEHSt</CardDescription>
              </div>
              <Badge variant="warning">Bereit zur Einreichung</Badge>
            </div>
          </CardHeader>
          <CardContent className="relative grid gap-5 md:grid-cols-4">
            <Metric label="Embedded Emissions" value={`${current.totalEmbeddedEmissionsT.toFixed(1)} t CO2e`} />
            <Metric label="Relevante Sendungen" value="14" />
            <Metric label="CN-Codes" value={current.cnCodes.length.toString()} />
            <Metric label="Vollständigkeit" value="92%" />

            <div className="md:col-span-4">
              <div className="flex justify-between text-xs mb-1.5">
                <span className="text-muted-foreground">Report-Vollständigkeit (produzenten-spezifisch vs. Standard-Werte)</span>
                <span className="font-semibold">92% · 8% Standardwerte</span>
              </div>
              <Progress value={92} />
            </div>

            <div className="md:col-span-4 flex flex-wrap gap-2">
              {current.cnCodes.map((c) => (
                <Badge key={c} variant="outline" className="font-mono">{c}</Badge>
              ))}
            </div>

            <div className="md:col-span-4">
              <CbamActions reportId={current.id} submittable />
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>CBAM-relevante Importe</CardTitle>
            <CardDescription>Automatisch gefiltert nach CN-Codes</CardDescription>
          </CardHeader>
          <CardContent>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-3 py-2 text-left">Sendung</th>
                  <th className="px-3 py-2 text-left">Shipper (Drittland)</th>
                  <th className="px-3 py-2 text-left">CN-Code</th>
                  <th className="px-3 py-2 text-right">Menge</th>
                  <th className="px-3 py-2 text-right">CO2e (t)</th>
                </tr>
              </thead>
              <tbody>
                {relevantShipments.map((s) => (
                  <tr key={s.id} className="border-b">
                    <td className="px-3 py-2 font-mono text-primary">{s.ref}</td>
                    <td className="px-3 py-2">
                      <div className="truncate max-w-[220px]">{s.shipper?.name ?? "—"}</div>
                      <div className="text-[10px] text-muted-foreground">{s.shipper?.country}</div>
                    </td>
                    <td className="px-3 py-2 font-mono text-xs">{s.hsCodes.join(", ")}</td>
                    <td className="px-3 py-2 text-right font-mono">{(s.weightKg / 1000).toFixed(1)} t</td>
                    <td className="px-3 py-2 text-right font-mono">{(s.co2eKg / 1000).toFixed(2)}</td>
                  </tr>
                ))}
                {relevantShipments.length === 0 && (
                  <tr><td colSpan={5} className="px-3 py-6 text-center text-muted-foreground text-sm">Keine CBAM-relevanten Importe im aktuellen Quartal.</td></tr>
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Vergangene Reports</CardTitle>
            <CardDescription>Einreichungen Q3 2025 — heute</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2.5">
            {reports.map((r) => (
              <div key={r.id} className="flex items-center gap-2 rounded-lg border p-2.5">
                <div className="h-8 w-8 rounded-lg bg-emerald-500/10 text-emerald-700 grid place-items-center">
                  <Leaf className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium">{r.period}</div>
                  <div className="text-[11px] text-muted-foreground">
                    {r.totalEmbeddedEmissionsT.toFixed(1)} t CO2e · {r.cnCodes.length} CN-Codes
                    {r.submittedAt && <> · eingereicht {formatDate(r.submittedAt)}</>}
                  </div>
                </div>
                <Badge variant={r.status === "SUBMITTED" ? "success" : "warning"}>{r.status}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>CBAM-Warenkorb</CardTitle>
          <CardDescription>CN-Codes im Anwendungsbereich (EU-Verordnung 2023/956)</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-2 md:grid-cols-2 lg:grid-cols-4 text-sm">
          {Object.entries(CBAM_CN).map(([cn, label]) => (
            <div key={cn} className="rounded-lg border p-3">
              <div className="font-mono text-xs text-primary">{cn}</div>
              <div className="text-xs">{label}</div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="text-xl font-semibold tabular-nums">{value}</div>
    </div>
  );
}
