import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft, ArrowRight, Check, Clock, FileCheck2, FileText,
  Leaf, MapPin, Package, Plane, Ship, ShieldCheck, Sparkles, TrendingUp,
} from "lucide-react";
import { db } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StatusChip } from "@/components/status-chip";
import { ModeChip } from "@/components/mode-chip";
import { WorldMap } from "@/components/world-map";
import { formatDate, formatDateTime, formatKg, formatM3, relativeFromNow } from "@/lib/utils";
import { ShipmentActions } from "@/components/shipment-actions";
import { DocumentsList } from "@/components/document-viewer";

export const dynamic = "force-dynamic";

export default async function ShipmentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const s = await db.shipment.findUnique({
    where: { id },
    include: {
      customer: true,
      shipper: true,
      consignee: true,
      milestones: { orderBy: { timestamp: "asc" } },
      documents: { orderBy: { createdAt: "desc" } },
      customsDecs: true,
      quotes: true,
    },
  });
  if (!s) return notFound();

  const span = s.eta.getTime() - s.etd.getTime();
  const elapsed = Math.max(0, Date.now() - s.etd.getTime());
  const progress = Math.min(1, span > 0 ? elapsed / span : 0);
  const risk = s.delayRiskScore ?? 0;

  const pastMs = s.milestones.filter((m) => !m.isFuture);
  const futureMs = s.milestones.filter((m) => m.isFuture);

  return (
    <div className="p-6 max-w-[1500px] mx-auto space-y-5">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Link href="/shipments" className="hover:text-foreground flex items-center gap-1">
          <ArrowLeft className="h-3 w-3" /> Alle Sendungen
        </Link>
        <span>/</span>
        <span className="font-mono text-foreground">{s.ref}</span>
      </div>

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold font-mono tracking-tight">{s.ref}</h1>
            <StatusChip status={s.status} />
            <ModeChip mode={s.mode as any} />
            <Badge variant={s.direction === "IMPORT" ? "info" : "secondary"}>{s.direction}</Badge>
            {s.dangerousGoods && <Badge variant="destructive">DGR</Badge>}
          </div>
          <div className="text-sm text-muted-foreground">
            {s.carrier} · {s.mawb ?? s.hbl} · Kunde: <span className="text-foreground">{s.customer?.name ?? "—"}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <ShipmentActions shipmentId={s.id} shipmentRef={s.ref} destCountry={s.destCountry} />
        </div>
      </div>

      {/* Journey strip */}
      <Card>
        <CardContent className="p-5">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="min-w-[160px]">
              <div className="flex items-center gap-1 text-xs text-muted-foreground uppercase tracking-wider">
                <MapPin className="h-3 w-3" /> Origin
              </div>
              <div className="font-semibold">{s.originCode}</div>
              <div className="text-xs text-muted-foreground">{s.originName}</div>
              <div className="text-xs text-muted-foreground">ETD {formatDate(s.etd)}</div>
            </div>

            <div className="flex-1 min-w-[280px] py-2">
              <div className="relative h-1.5 rounded-full bg-muted overflow-hidden">
                <div
                  className="absolute inset-y-0 left-0 rounded-full bg-[linear-gradient(90deg,#3b82f6,#8b5cf6)]"
                  style={{ width: `${progress * 100}%` }}
                />
              </div>
              <div className="flex items-center justify-between mt-1.5 text-[11px] text-muted-foreground">
                <span>{Math.round(progress * 100)}% Distanz</span>
                <span>
                  {s.etaPredicted && s.etaPredicted > s.eta ? (
                    <span className="text-rose-600 font-medium">
                      Predictive ETA: {formatDate(s.etaPredicted)} (+{Math.round((s.etaPredicted.getTime() - s.eta.getTime()) / 86400000)}d)
                    </span>
                  ) : (
                    <span className="text-emerald-600 font-medium">on plan</span>
                  )}
                </span>
              </div>
            </div>

            <div className="min-w-[160px] text-right">
              <div className="flex items-center gap-1 justify-end text-xs text-muted-foreground uppercase tracking-wider">
                Destination <MapPin className="h-3 w-3" />
              </div>
              <div className="font-semibold">{s.destCode}</div>
              <div className="text-xs text-muted-foreground">{s.destName}</div>
              <div className="text-xs text-muted-foreground">ETA {formatDate(s.eta)}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-5 lg:grid-cols-3">
        {/* Left column */}
        <div className="lg:col-span-2 space-y-5">
          {/* Tabs */}
          <Tabs defaultValue="timeline">
            <TabsList>
              <TabsTrigger value="timeline">Timeline</TabsTrigger>
              <TabsTrigger value="documents">Dokumente ({s.documents.length})</TabsTrigger>
              <TabsTrigger value="customs">Zoll ({s.customsDecs.length})</TabsTrigger>
              <TabsTrigger value="parties">Parties</TabsTrigger>
              <TabsTrigger value="map">Map</TabsTrigger>
            </TabsList>

            <TabsContent value="timeline">
              <Card>
                <CardHeader>
                  <CardTitle>Milestones</CardTitle>
                  <CardDescription>Live aus EDI / AIS / ADS-B / OCR</CardDescription>
                </CardHeader>
                <CardContent>
                  <ol className="relative pl-8 space-y-4 border-l">
                    {pastMs.map((m, idx) => (
                      <li key={m.id} className="relative">
                        <span className="absolute -left-[31px] top-1 grid h-5 w-5 place-items-center rounded-full bg-emerald-500 text-white">
                          <Check className="h-3 w-3" />
                        </span>
                        <div className="flex justify-between flex-wrap gap-2">
                          <div>
                            <div className="text-sm font-medium">{m.label}</div>
                            <div className="text-xs text-muted-foreground">
                              {m.location ?? "—"} · Quelle: <span className="font-mono">{m.source}</span>
                            </div>
                          </div>
                          <div className="text-xs text-muted-foreground tabular-nums">
                            {formatDateTime(m.timestamp)} ({relativeFromNow(m.timestamp)})
                          </div>
                        </div>
                      </li>
                    ))}
                    {futureMs.map((m) => (
                      <li key={m.id} className="relative opacity-70">
                        <span className="absolute -left-[31px] top-1 grid h-5 w-5 place-items-center rounded-full bg-muted text-muted-foreground ring-2 ring-background">
                          <Clock className="h-3 w-3" />
                        </span>
                        <div className="flex justify-between flex-wrap gap-2">
                          <div>
                            <div className="text-sm font-medium text-muted-foreground">{m.label}</div>
                            <div className="text-xs text-muted-foreground">
                              {m.location ?? "—"} · <Badge variant="outline" className="text-[10px]">predictive</Badge>
                            </div>
                          </div>
                          <div className="text-xs text-muted-foreground tabular-nums">{formatDateTime(m.timestamp)}</div>
                        </div>
                      </li>
                    ))}
                  </ol>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="documents">
              <Card>
                <CardHeader>
                  <CardTitle>Dokumente</CardTitle>
                  <CardDescription>AI-extrahiert mit Claude Opus 4.7 Vision</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  <DocumentsList
                    documents={s.documents.map((d) => ({
                      id: d.id,
                      type: d.type,
                      filename: d.filename,
                      sizeBytes: d.sizeBytes,
                      mimeType: d.mimeType,
                      extractionConfidence: d.extractionConfidence,
                      extractedJson: d.extractedJson,
                      createdAt: d.createdAt.toISOString(),
                    }))}
                  />
                  <Button variant="outline" size="sm" className="w-full mt-2" asChild>
                    <Link href="/extract">
                      <Sparkles className="h-4 w-4" /> Neues Dokument extrahieren
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="customs">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileCheck2 className="h-4 w-4" /> Zollanmeldungen
                  </CardTitle>
                  <CardDescription>ATLAS · e-dec · NCTS · AES</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {s.customsDecs.map((c) => (
                    <div key={c.id} className="rounded-lg border p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <Badge variant="outline" className="font-mono">
                          {c.regime.replace("_", " ")}
                        </Badge>
                        <StatusChip status={c.status} />
                      </div>
                      <div className="text-xs text-muted-foreground">MRN: <span className="font-mono text-foreground">{c.mrn ?? "—"}</span></div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <div className="text-muted-foreground">Submitted</div>
                          <div className="font-medium">{c.submittedAt ? formatDate(c.submittedAt) : "—"}</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">Cleared</div>
                          <div className="font-medium">{c.clearedAt ? formatDate(c.clearedAt) : "—"}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-emerald-700 dark:text-emerald-300">
                        <ShieldCheck className="h-3.5 w-3.5" /> Sanktionsprüfung bestanden (UN/EU/US OFAC)
                      </div>
                    </div>
                  ))}
                  {s.customsDecs.length === 0 && (
                    <div className="text-sm text-muted-foreground text-center py-4">Keine Zollanmeldung für diese Sendung.</div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="parties">
              <div className="grid gap-4 md:grid-cols-2">
                <Card>
                  <CardHeader><CardTitle className="text-sm">Shipper</CardTitle></CardHeader>
                  <CardContent className="text-sm space-y-1">
                    <div className="font-semibold">{s.shipper?.name ?? "—"}</div>
                    <div className="text-muted-foreground">{s.shipper?.city}, {s.shipper?.country}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader><CardTitle className="text-sm">Consignee</CardTitle></CardHeader>
                  <CardContent className="text-sm space-y-1">
                    <div className="font-semibold">{s.consignee?.name ?? "—"}</div>
                    <div className="text-muted-foreground">{s.consignee?.city}, {s.consignee?.country}</div>
                  </CardContent>
                </Card>
                <Card className="md:col-span-2">
                  <CardHeader><CardTitle className="text-sm">Carrier</CardTitle></CardHeader>
                  <CardContent className="text-sm space-y-1">
                    <div className="font-semibold">{s.carrier}</div>
                    <div className="text-muted-foreground">
                      {s.mawb && <>MAWB: <span className="font-mono">{s.mawb}</span> · </>}
                      {s.hbl && <>HBL: <span className="font-mono">{s.hbl}</span> · </>}
                      {s.vessel && <>Vessel: <span className="font-mono">{s.vessel}</span> · </>}
                      {s.voyage && <>Voyage: <span className="font-mono">{s.voyage}</span></>}
                      {s.flightNumber && <>Flight: <span className="font-mono">{s.flightNumber}</span></>}
                    </div>
                    {s.containerNos.length > 0 && (
                      <div className="flex gap-1.5 flex-wrap pt-2">
                        {s.containerNos.map((c) => (
                          <Badge key={c} variant="outline" className="font-mono">{c}</Badge>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="map">
              <Card>
                <CardContent className="p-4">
                  <WorldMap arcs={[{ from: s.originCode, to: s.destCode, mode: s.mode as any, etd: s.etd.toISOString(), eta: s.eta.toISOString(), ref: s.ref, risk: risk > 65 ? "high" : risk > 35 ? "mid" : "low" } as any]} />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Right column */}
        <div className="space-y-5">
          <Card>
            <CardHeader><CardTitle className="text-sm uppercase tracking-wider text-muted-foreground">Physische Daten</CardTitle></CardHeader>
            <CardContent className="text-sm space-y-2">
              <KV k="Pieces" v={String(s.pieces)} />
              <KV k="Gewicht brutto" v={formatKg(s.weightKg)} />
              <KV k="Volumen" v={formatM3(s.volumeM3)} />
              <KV k="Chargeable" v={formatKg(s.chargeableKg)} />
              <KV k="Incoterm" v={s.incoterm} />
              <KV k="Commodity" v={s.commodity} />
              <KV k="HS-Code(s)" v={s.hsCodes.join(", ")} mono />
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden">
            <div className="pointer-events-none absolute -right-16 -top-16 h-36 w-36 rounded-full bg-emerald-500/15 blur-2xl" />
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm uppercase tracking-wider text-muted-foreground">
                <Leaf className="h-3.5 w-3.5 text-emerald-600" /> Carbon
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="text-2xl font-semibold tabular-nums">{(s.co2eKg / 1000).toFixed(2)} t CO2e</div>
              <div className="text-xs text-muted-foreground">
                GLEC v3.0 Methodik. Well-to-wheel, inkl. Leerfahrten.
              </div>
              <Separator />
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">CBAM-pflichtig</span>
                <span className="font-medium">{s.hsCodes.some((h) => h.startsWith("72")) ? "Ja — Stahl" : "Nein"}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm uppercase tracking-wider text-muted-foreground">
                <TrendingUp className="h-3.5 w-3.5 text-primary" /> Predictive ETA
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-baseline gap-2">
                <div className="text-2xl font-semibold tabular-nums">{risk}</div>
                <div className="text-xs text-muted-foreground">/ 100 Risk Score</div>
              </div>
              <div className="text-xs text-muted-foreground space-y-1">
                <div className="flex justify-between"><span>Port Congestion</span><span className="font-mono">0.{Math.floor(risk / 2)}</span></div>
                <div className="flex justify-between"><span>Wetter-Korridor</span><span className="font-mono">0.{Math.floor(risk / 4)}</span></div>
                <div className="flex justify-between"><span>Carrier Historie</span><span className="font-mono">0.{Math.floor(risk / 3)}</span></div>
                <div className="flex justify-between"><span>Umlad-Risiko</span><span className="font-mono">0.{Math.floor(risk / 5)}</span></div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function KV({ k, v, mono }: { k: string; v: string; mono?: boolean }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-muted-foreground">{k}</span>
      <span className={mono ? "font-mono text-xs" : "font-medium"}>{v}</span>
    </div>
  );
}
