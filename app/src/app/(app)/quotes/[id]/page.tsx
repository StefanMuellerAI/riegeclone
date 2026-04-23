import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Check, CircleDollarSign, FileText, Leaf, MapPin, Plane, Send, Ship, X } from "lucide-react";
import { db } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ModeChip } from "@/components/mode-chip";
import { formatDate, formatUsd } from "@/lib/utils";
import { QuoteActions } from "./client";

export const dynamic = "force-dynamic";

const STATUS_VARIANT: Record<string, any> = {
  OPEN: "warning", SENT: "info", ACCEPTED: "success", DECLINED: "destructive", EXPIRED: "muted",
};

export default async function QuoteDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const q = await db.quote.findUnique({
    where: { id },
    include: { customer: true, shipment: true },
  });
  if (!q) return notFound();
  const lines = (q.linesJson as any) ?? {};
  const lineItems: Array<{ label: string; usd: number }> = Array.isArray(lines.lines) ? lines.lines : [];

  return (
    <div className="p-6 max-w-[1200px] mx-auto space-y-5">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Link href="/quotes" className="hover:text-foreground flex items-center gap-1">
          <ArrowLeft className="h-3 w-3" /> Angebote
        </Link>
        <span>/</span>
        <span className="font-mono text-foreground">{q.ref}</span>
      </div>

      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold font-mono">{q.ref}</h1>
            <Badge variant={STATUS_VARIANT[q.status]}>{q.status}</Badge>
            <ModeChip mode={q.mode as any} />
          </div>
          <div className="text-sm text-muted-foreground">
            {q.customer?.name ?? "—"} · gültig bis {formatDate(q.validUntil)} · Incoterm {q.incoterm}
          </div>
        </div>
        <QuoteActions id={q.id} status={q.status} shipmentId={q.shipmentId} />
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-5">
          <Card>
            <CardHeader>
              <CardTitle>Preisaufschlüsselung</CardTitle>
              <CardDescription>Basis + Zuschläge + Nebenkosten · {lines.carrier ?? "—"} · {lines.transitDays ?? "—"} Tage Transit</CardDescription>
            </CardHeader>
            <CardContent>
              <table className="w-full text-sm">
                <tbody>
                  {lineItems.map((l, i) => (
                    <tr key={i} className="border-b last:border-0">
                      <td className="py-2 text-muted-foreground">{l.label}</td>
                      <td className="py-2 text-right font-mono tabular-nums">{formatUsd(l.usd)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td className="py-2 font-semibold">Total</td>
                    <td className="py-2 text-right font-mono font-semibold tabular-nums">{formatUsd(q.totalUsd)}</td>
                  </tr>
                </tfoot>
              </table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Bedingungen</CardTitle>
              <CardDescription>Für Kunden-Nachvollziehbarkeit — Teil des PDF-Angebots</CardDescription>
            </CardHeader>
            <CardContent className="text-sm space-y-2 text-muted-foreground">
              <p>· Preise gültig in USD bis {formatDate(q.validUntil)}. Danach bedarf es Revalidierung.</p>
              <p>· Treibstoffzuschläge (BAF/FAF) an Marktpreise gekoppelt, Anpassung monatlich möglich.</p>
              <p>· Zahlungsziel 14 Tage netto. Frachtwerk GTC gelten.</p>
              <p>· Angebot exklusive Zollabgaben und Einfuhrumsatzsteuer am Destination-Port.</p>
              <p>· Transit-Zeit {lines.transitDays} Tage als unverbindliche Erwartung. Predictive-ETA wird bei Buchung aktiviert.</p>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-5">
          <Card>
            <CardHeader><CardTitle className="text-sm uppercase tracking-wider text-muted-foreground">Lane</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="font-mono">{q.origin}</span>
                <span className="text-muted-foreground">→</span>
                <span className="font-mono">{q.destination}</span>
              </div>
              <Separator />
              <div className="flex justify-between"><span className="text-muted-foreground">Mode</span><span className="font-medium">{q.mode}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Carrier</span><span className="font-medium">{lines.carrier ?? "—"}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Transit</span><span className="font-medium">{lines.transitDays ?? "—"} Tage</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Incoterm</span><span className="font-medium">{q.incoterm}</span></div>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden">
            <div className="pointer-events-none absolute -right-12 -top-12 h-28 w-28 rounded-full bg-emerald-500/15 blur-2xl" />
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm uppercase tracking-wider text-muted-foreground">
                <Leaf className="h-3.5 w-3.5 text-emerald-600" /> Carbon
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-2">
              <div className="text-2xl font-semibold tabular-nums">
                {((((q.mode === "AIR" ? 0.602 : 0.015) * (lines.weightKg ?? 500)) * 8000) / 1000).toFixed(2)} t
              </div>
              <div className="text-xs text-muted-foreground">Geschätzte Emission bei Buchung · GLEC v3.0 kompatibel</div>
            </CardContent>
          </Card>

          {q.shipment && (
            <Card>
              <CardHeader><CardTitle className="text-sm uppercase tracking-wider text-muted-foreground">Verknüpfte Sendung</CardTitle></CardHeader>
              <CardContent>
                <Link href={`/shipments/${q.shipment.id}`} className="flex items-center gap-2 text-sm font-mono text-primary hover:underline">
                  <FileText className="h-4 w-4" /> {q.shipment.ref}
                </Link>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
