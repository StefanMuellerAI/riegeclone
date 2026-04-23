"use client";
import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, FileUp, Loader2, Sparkles, Upload } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { createShipment } from "@/app/actions/shipments";

type ExtractedField = { key: string; value: string; confidence: number };
type Extraction = {
  documentType: string;
  confidence: number;
  fields: Record<string, string>;
  lineItems?: Array<Record<string, string>>;
  warnings?: string[];
  model: string;
  latencyMs: number;
};

export function ExtractClient() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Extraction | null>(null);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const [creating, startCreate] = useTransition();

  async function run(f: File) {
    setFile(f);
    setBusy(true);
    setResult(null);
    const fd = new FormData();
    fd.append("file", f);
    try {
      const r = await fetch("/api/extract", { method: "POST", body: fd });
      const data = await r.json();
      setResult(data);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <Card
        className={cn(
          "min-h-[320px] border-dashed transition-colors",
          dragging && "border-primary bg-primary/5"
        )}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          const f = e.dataTransfer.files?.[0];
          if (f) run(f);
        }}
      >
        <CardContent className="p-8 flex flex-col items-center justify-center text-center space-y-4 min-h-[320px]">
          <div className="h-16 w-16 rounded-2xl bg-primary/10 grid place-items-center text-primary">
            <FileUp className="h-8 w-8" />
          </div>
          <div>
            <div className="text-lg font-semibold">Dokument hier ablegen</div>
            <div className="text-sm text-muted-foreground">PDF, PNG oder JPG · bis 10 MB</div>
          </div>
          <input
            ref={inputRef}
            type="file"
            accept="application/pdf,image/png,image/jpeg"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) run(f);
            }}
          />
          <Button variant="gradient" onClick={() => inputRef.current?.click()}>
            <Upload className="h-4 w-4" /> Datei auswählen
          </Button>
          {file && (
            <div className="text-xs text-muted-foreground">
              Ausgewählt: <span className="font-medium text-foreground">{file.name}</span> ({(file.size / 1024).toFixed(0)} KB)
            </div>
          )}
          <div className="grid grid-cols-3 gap-2 mt-6 text-[10px]">
            {["Bill of Lading", "AWB", "Commercial Invoice", "Packing List", "Certificate of Origin", "ATA Carnet"].map((x) => (
              <Badge key={x} variant="outline" className="justify-center">{x}</Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="min-h-[320px]">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" /> Extraktion
              </CardTitle>
              <CardDescription>
                Strukturierte Felder · bereit zum Schreiben in die Shipment-DB
              </CardDescription>
            </div>
            {result && (
              <Badge variant="success" className="gap-1">
                <Check className="h-3 w-3" /> {Math.round(result.confidence * 100)}%
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {busy && (
            <div className="flex items-center gap-3 rounded-lg border border-primary/30 bg-primary/5 p-4 text-sm">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              <div>
                <div className="font-medium">Claude analysiert das Dokument…</div>
                <div className="text-xs text-muted-foreground">Vision-Model lädt Seiten und extrahiert Felder</div>
              </div>
            </div>
          )}
          {!busy && !result && (
            <div className="text-sm text-muted-foreground">
              Drop ein Dokument links. Das Ergebnis erscheint hier in wenigen Sekunden.
            </div>
          )}
          {result && (
            <>
              <div className="rounded-lg bg-muted/40 p-3 text-xs space-y-1">
                <div className="flex justify-between"><span className="text-muted-foreground">Typ erkannt</span><span className="font-medium">{result.documentType}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Model</span><span className="font-mono">{result.model}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Latenz</span><span className="font-mono">{result.latencyMs} ms</span></div>
              </div>

              <div className="space-y-1.5">
                {Object.entries(result.fields).map(([k, v]) => (
                  <div key={k} className="flex items-start justify-between gap-4 border-b pb-1.5 text-sm">
                    <div className="text-muted-foreground text-xs uppercase tracking-wider shrink-0 w-40">{k.replace(/_/g, " ")}</div>
                    <div className="font-medium text-right break-words">{v || "—"}</div>
                  </div>
                ))}
              </div>

              {result.lineItems && result.lineItems.length > 0 && (
                <div>
                  <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1.5">Line Items</div>
                  <div className="rounded-lg border overflow-hidden">
                    <table className="w-full text-xs">
                      <thead className="bg-muted/60">
                        <tr>
                          {Object.keys(result.lineItems[0]).map((h) => (
                            <th key={h} className="px-2 py-1.5 text-left uppercase tracking-wide text-muted-foreground">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {result.lineItems.map((row, i) => (
                          <tr key={i} className="border-t">
                            {Object.values(row).map((v, j) => (
                              <td key={j} className="px-2 py-1.5">{v}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {result.warnings && result.warnings.length > 0 && (
                <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs space-y-1">
                  <div className="font-semibold text-amber-700 dark:text-amber-300">Hinweise</div>
                  {result.warnings.map((w, i) => (
                    <div key={i}>• {w}</div>
                  ))}
                </div>
              )}

              <Button
                variant="gradient"
                className="w-full"
                disabled={creating}
                onClick={() => {
                  if (!result) return;
                  startCreate(async () => {
                    const fields = result.fields;
                    const mode: "AIR" | "OCEAN" = result.documentType === "AWB" ? "AIR" : "OCEAN";
                    // Parse origin/destination codes if present
                    const originCode = (fields.origin?.match(/\b([A-Z]{3,5})\b/)?.[1]) ?? (mode === "AIR" ? "PVG" : "CNSHA");
                    const destCode = (fields.destination?.match(/\b([A-Z]{3,5})\b/)?.[1]) ?? (mode === "AIR" ? "FRA" : "DEHAM");
                    const weightMatch = (fields.gross_weight ?? "").match(/(\d[\d\s.,]*)\s*kg/i);
                    const weightKg = weightMatch ? Number(weightMatch[1].replace(/[\s.,]/g, "")) : 5000;
                    const created = await createShipment({
                      mode,
                      direction: "IMPORT",
                      origin: originCode,
                      destination: destCode,
                      carrier: fields.carrier ?? "Maersk",
                      transitDays: mode === "AIR" ? 2 : 26,
                      pieces: Number(fields.pieces?.replace(/\D/g, "")) || 1,
                      weightKg,
                      volumeM3: 30,
                      commodity: fields.commodity_description ?? "General cargo",
                      incoterm: fields.incoterm ?? "FOB",
                    });
                    toast.success(`Sendung ${created.ref} aus Extraktion angelegt`, {
                      action: { label: "Öffnen", onClick: () => router.push(`/shipments/${created.id}`) },
                    });
                    router.push(`/shipments/${created.id}`);
                  });
                }}
              >
                {creating ? <><Loader2 className="h-4 w-4 animate-spin" /> Sendung anlegen…</> : <>Aus Extraktion Sendung anlegen</>}
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
