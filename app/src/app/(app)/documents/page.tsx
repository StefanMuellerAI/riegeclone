import Link from "next/link";
import { FileText, Sparkles, Upload } from "lucide-react";
import { db } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function DocumentsPage() {
  const docs = await db.document.findMany({
    orderBy: { createdAt: "desc" },
    take: 40,
    include: { shipment: { select: { ref: true } } },
  });

  const byType = await db.document.groupBy({ by: ["type"], _count: { _all: true } });

  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dokumente</h1>
          <p className="text-sm text-muted-foreground">
            Alle Sendungsdokumente — AI-extrahiert mit Claude Opus 4.7 Vision. Keine Templates, keine OCR-Regeln.
          </p>
        </div>
        <Button variant="gradient" size="sm" asChild>
          <Link href="/extract"><Upload className="h-4 w-4" /> Hochladen & extrahieren</Link>
        </Button>
      </div>

      <div className="grid gap-3 md:grid-cols-5">
        {byType.map((t) => (
          <Card key={t.type}>
            <CardContent className="p-4">
              <div className="text-xs uppercase tracking-wider text-muted-foreground">{t.type}</div>
              <div className="text-2xl font-semibold mt-1">{t._count._all}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Zuletzt verarbeitet</CardTitle>
          <CardDescription>{docs.length} von ~300 im Archiv</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {docs.map((d) => (
            <div key={d.id} className="flex items-center gap-3 rounded-lg border p-3 hover:bg-muted/30">
              <div className="h-9 w-9 rounded-md bg-muted grid place-items-center shrink-0">
                <FileText className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-medium truncate">{d.filename}</div>
                <div className="text-[11px] text-muted-foreground">
                  {d.type} · {(d.sizeBytes / 1024).toFixed(0)} KB · {formatDate(d.createdAt)} · Vertrauen{" "}
                  {d.extractionConfidence ? Math.round(d.extractionConfidence * 100) : 0}%
                </div>
              </div>
              {d.shipment && (
                <Link href={`/shipments/${d.shipmentId}`} className="text-xs font-mono text-primary hover:underline">
                  {d.shipment.ref}
                </Link>
              )}
              <Badge variant="success" className="gap-1"><Sparkles className="h-3 w-3" /> AI</Badge>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
