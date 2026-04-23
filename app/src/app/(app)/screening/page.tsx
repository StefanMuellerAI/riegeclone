import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Check, ShieldCheck } from "lucide-react";
import { ScreeningClient } from "./client";

export default function ScreeningPage() {
  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
          <ShieldCheck className="h-6 w-6 text-emerald-600" /> Sanktions-Screening
        </h1>
        <p className="text-sm text-muted-foreground max-w-2xl">
          Denied Party Screening & Dual-Use-Kontrolle — tägliche Synchronisation mit UN, EU, US OFAC und BAFA.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        <Card><CardContent className="p-4"><div className="text-xs uppercase text-muted-foreground">Heute gescreent</div><div className="text-2xl font-semibold mt-1 tabular-nums">1 847</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs uppercase text-muted-foreground">Hits (Review)</div><div className="text-2xl font-semibold mt-1 tabular-nums text-amber-600">3</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs uppercase text-muted-foreground">Blockiert</div><div className="text-2xl font-semibold mt-1 tabular-nums text-rose-600">0</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs uppercase text-muted-foreground">False Positives</div><div className="text-2xl font-semibold mt-1 tabular-nums">0.12%</div></CardContent></Card>
      </div>

      <ScreeningClient />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Listen-Status</CardTitle>
          <CardDescription>Letzte Synchronisation heute 06:00 UTC</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-2 md:grid-cols-3 text-sm">
          {[
            { name: "EU Consolidated Financial Sanctions", version: "v2026.04.17", entities: "12 847" },
            { name: "UN Security Council Sanctions", version: "v2026.04.15", entities: "1 432" },
            { name: "US OFAC SDN + Consolidated", version: "v2026.04.17", entities: "23 516" },
            { name: "UK OFSI Financial Sanctions", version: "v2026.04.16", entities: "4 812" },
            { name: "DE BAFA Embargo-Länder", version: "v2026.04.01", entities: "17 Länder" },
            { name: "EU Dual-Use Annex I", version: "v2026.04.01", entities: "~ 2 000 Kategorien" },
          ].map((l) => (
            <div key={l.name} className="rounded-lg border p-3 flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="font-medium truncate">{l.name}</div>
                <div className="text-[11px] text-muted-foreground">{l.version} · {l.entities}</div>
              </div>
              <Check className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
