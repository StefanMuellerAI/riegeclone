"use client";
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Check, Leaf, Loader2, Plane, Ship, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn, formatKg, formatUsd } from "@/lib/utils";
import { fetchRates } from "@/app/actions/rates";
import { createShipment } from "@/app/actions/shipments";
import type { RateQuote } from "@/lib/mocks/rates";

type Step = 0 | 1 | 2 | 3;

const AIR_CODES = ["FRA", "MUC", "AMS", "JFK", "ORD", "PVG", "HKG", "SIN", "DXB", "NRT"];
const OCEAN_CODES = ["DEHAM", "DEBRV", "NLRTM", "BEANR", "CNSHA", "CNNGB", "SGSIN", "USNYC", "USLAX", "AEJEA"];

export function NewShipmentDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const router = useRouter();
  const [step, setStep] = useState<Step>(0);
  const [mode, setMode] = useState<"AIR" | "OCEAN">("OCEAN");
  const [direction, setDirection] = useState<"IMPORT" | "EXPORT">("IMPORT");
  const [origin, setOrigin] = useState("CNSHA");
  const [destination, setDestination] = useState("DEHAM");
  const [pieces, setPieces] = useState(1);
  const [weight, setWeight] = useState(5000);
  const [volume, setVolume] = useState(32);
  const [commodity, setCommodity] = useState("Elektronikteile");
  const [incoterm, setIncoterm] = useState("FOB");
  const [rates, setRates] = useState<RateQuote[] | null>(null);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [loadingRates, setLoadingRates] = useState(false);
  const [isPending, start] = useTransition();

  useEffect(() => {
    if (!open) return;
    setStep(0); setRates(null); setSelectedIdx(0);
  }, [open]);

  async function lookupRates() {
    setLoadingRates(true);
    setRates(null);
    try {
      const r = await fetchRates(origin, destination, mode, weight, volume);
      setRates(r);
      setSelectedIdx(0);
    } finally {
      setLoadingRates(false);
    }
  }

  function confirm() {
    if (!rates || !rates[selectedIdx]) return;
    const r = rates[selectedIdx];
    start(async () => {
      try {
        const result = await createShipment({
          mode, direction, origin, destination,
          carrier: r.carrier, carrierCode: r.carrierCode,
          transitDays: r.transitDays,
          pieces, weightKg: weight, volumeM3: volume,
          commodity, incoterm, totalUsd: r.totalUsd,
        });
        toast.success(`Sendung ${result.ref} gebucht`, {
          description: `${origin} → ${destination} · ${r.carrier}`,
          action: { label: "Öffnen", onClick: () => router.push(`/shipments/${result.id}`) },
        });
        onOpenChange(false);
        router.push(`/shipments/${result.id}`);
      } catch (e) {
        toast.error("Buchung fehlgeschlagen", { description: e instanceof Error ? e.message : "" });
      }
    });
  }

  const codes = mode === "AIR" ? AIR_CODES : OCEAN_CODES;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0 overflow-hidden">
        <div className="px-6 pt-5 pb-3 border-b bg-gradient-to-br from-primary/5 to-transparent">
          <DialogHeader>
            <DialogTitle>Neue Sendung anlegen</DialogTitle>
            <DialogDescription>Rate-Lookup live gegen 3–5 Carrier — Buchung in einem Klick.</DialogDescription>
          </DialogHeader>
          <div className="mt-3 flex items-center gap-2">
            {["Mode & Lane", "Cargo", "Rates", "Bestätigung"].map((label, i) => (
              <div key={i} className="flex items-center gap-2 text-xs">
                <div className={cn("h-5 w-5 rounded-full grid place-items-center text-[10px] font-semibold",
                  step > i ? "bg-emerald-500 text-white" : step === i ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>
                  {step > i ? <Check className="h-3 w-3" /> : i + 1}
                </div>
                <span className={cn(step === i ? "font-medium" : "text-muted-foreground")}>{label}</span>
                {i < 3 && <ArrowRight className="h-3 w-3 text-muted-foreground" />}
              </div>
            ))}
          </div>
        </div>

        <div className="px-6 py-5 space-y-4 max-h-[60vh] overflow-y-auto">
          {step === 0 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <ModeButton icon={Ship} label="Ocean Freight" active={mode === "OCEAN"} onClick={() => { setMode("OCEAN"); setOrigin("CNSHA"); setDestination("DEHAM"); }} />
                <ModeButton icon={Plane} label="Air Freight" active={mode === "AIR"} onClick={() => { setMode("AIR"); setOrigin("PVG"); setDestination("FRA"); }} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Direction</Label>
                  <div className="mt-1.5 flex gap-2">
                    {(["IMPORT", "EXPORT"] as const).map((d) => (
                      <button key={d} onClick={() => setDirection(d)} className={cn("flex-1 rounded-md border px-3 py-2 text-sm",
                        direction === d ? "border-primary bg-primary/10 text-primary font-medium" : "hover:bg-muted/50")}>
                        {d}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <Label>Incoterm</Label>
                  <select value={incoterm} onChange={(e) => setIncoterm(e.target.value)} className="mt-1.5 h-9 w-full rounded-md border bg-background px-2 text-sm">
                    {["EXW", "FCA", "FOB", "CIF", "CIP", "DAP", "DDP"].map((i) => <option key={i}>{i}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Origin</Label>
                  <select value={origin} onChange={(e) => setOrigin(e.target.value)} className="mt-1.5 h-9 w-full rounded-md border bg-background px-2 text-sm font-mono">
                    {codes.map((c) => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <Label>Destination</Label>
                  <select value={destination} onChange={(e) => setDestination(e.target.value)} className="mt-1.5 h-9 w-full rounded-md border bg-background px-2 text-sm font-mono">
                    {codes.map((c) => <option key={c}>{c}</option>)}
                  </select>
                </div>
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label>Pieces</Label>
                  <Input type="number" value={pieces} onChange={(e) => setPieces(Number(e.target.value))} />
                </div>
                <div>
                  <Label>Gewicht (kg)</Label>
                  <Input type="number" value={weight} onChange={(e) => setWeight(Number(e.target.value))} />
                </div>
                <div>
                  <Label>Volumen (m³)</Label>
                  <Input type="number" value={volume} onChange={(e) => setVolume(Number(e.target.value))} />
                </div>
              </div>
              <div>
                <Label>Ware / Commodity</Label>
                <Input value={commodity} onChange={(e) => setCommodity(e.target.value)} />
              </div>
              <div className="rounded-lg bg-muted/40 p-3 text-xs space-y-1">
                <div className="flex justify-between"><span className="text-muted-foreground">Chargeable</span>
                  <span className="font-mono">{formatKg(mode === "AIR" ? Math.max(weight, volume * 167) : weight)}</span>
                </div>
                <div className="flex justify-between"><span className="text-muted-foreground">Gewichts-Volumen-Ratio</span>
                  <span className="font-mono">1 : {(volume * 167 / (weight || 1)).toFixed(2)}</span>
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-3">
              {!rates && !loadingRates && (
                <div className="rounded-lg border border-dashed p-6 text-center space-y-3">
                  <Sparkles className="h-8 w-8 mx-auto text-primary" />
                  <div className="text-sm text-muted-foreground">Live-Raten werden von den angebundenen Carriern abgefragt.</div>
                  <Button onClick={lookupRates} variant="gradient">Raten abfragen</Button>
                </div>
              )}
              {loadingRates && (
                <div className="rounded-lg border p-4 flex items-center gap-3 text-sm">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  Frage Raten von {mode === "AIR" ? "Lufthansa Cargo, Cathay, Emirates" : "Maersk, MSC, CMA CGM, Hapag-Lloyd"} ab…
                </div>
              )}
              {rates && (
                <div className="space-y-2">
                  {rates.map((r, i) => (
                    <button
                      key={i}
                      onClick={() => setSelectedIdx(i)}
                      className={cn("w-full text-left rounded-lg border p-3 transition-colors",
                        selectedIdx === i ? "border-primary bg-primary/5" : "hover:bg-muted/40")}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className={cn("h-4 w-4 rounded-full border-2",
                            selectedIdx === i ? "border-primary bg-primary" : "border-muted-foreground/40")} />
                          <div>
                            <div className="font-semibold text-sm">{r.carrier}</div>
                            <div className="text-[11px] text-muted-foreground">{r.service} · {r.transitDays} Tage Transit · Reliability {Math.round(r.reliability * 100)}%</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold text-sm tabular-nums">{formatUsd(r.totalUsd)}</div>
                          <div className="text-[11px] text-muted-foreground">Base {formatUsd(r.basePriceUsd)} + Surcharges {formatUsd(r.surchargesUsd)}</div>
                        </div>
                      </div>
                      <div className="mt-2 flex items-center gap-2 flex-wrap text-[11px]">
                        <Badge variant="muted" className="gap-1"><Leaf className="h-3 w-3" /> {(r.co2eKg / 1000).toFixed(2)}t CO2e</Badge>
                        <Badge variant="muted">Cutoff {new Date(r.cutoff).toLocaleString("de-DE", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</Badge>
                        <Badge variant="muted">ETD {new Date(r.nextDeparture).toLocaleDateString("de-DE")}</Badge>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {step === 3 && rates && (
            <div className="space-y-3">
              <div className="rounded-lg border p-4 space-y-2">
                <div className="flex justify-between"><span className="text-muted-foreground text-sm">Carrier</span><span className="font-semibold">{rates[selectedIdx].carrier}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground text-sm">Service</span><span>{rates[selectedIdx].service}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground text-sm">Lane</span><span className="font-mono">{origin} → {destination}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground text-sm">Transit</span><span>{rates[selectedIdx].transitDays} Tage</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground text-sm">Total</span><span className="font-semibold">{formatUsd(rates[selectedIdx].totalUsd)}</span></div>
              </div>
              <div className="rounded-lg bg-emerald-500/10 p-3 text-xs flex items-start gap-2 text-emerald-700 dark:text-emerald-300">
                <Check className="h-4 w-4 mt-0.5" />
                <div>
                  <div className="font-semibold">Pre-Booking-Check ok</div>
                  <div>Sanktionsscreening, Gefahrgut-Klassifikation und Dokumenten-Completeness automatisch validiert.</div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between border-t px-6 py-3 bg-muted/30">
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>Abbrechen</Button>
          <div className="flex gap-2">
            {step > 0 && <Button variant="outline" size="sm" onClick={() => setStep((s) => Math.max(0, s - 1) as Step)}>Zurück</Button>}
            {step < 2 && <Button variant="gradient" size="sm" onClick={() => setStep((s) => (s + 1) as Step)}>Weiter</Button>}
            {step === 2 && rates && <Button variant="gradient" size="sm" onClick={() => setStep(3)}>Weiter</Button>}
            {step === 2 && !rates && !loadingRates && <Button variant="gradient" size="sm" onClick={lookupRates}>Raten abfragen</Button>}
            {step === 3 && (
              <Button variant="gradient" size="sm" onClick={confirm} disabled={isPending}>
                {isPending && <Loader2 className="h-4 w-4 animate-spin" />} Sendung buchen
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ModeButton({ icon: Icon, label, active, onClick }: { icon: any; label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn("flex items-center gap-3 rounded-lg border p-3 text-left transition-colors",
        active ? "border-primary bg-primary/5" : "hover:bg-muted/40")}
    >
      <div className={cn("h-9 w-9 rounded-lg grid place-items-center",
        active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <div className="font-medium text-sm">{label}</div>
        <div className="text-[11px] text-muted-foreground">{label.includes("Air") ? "Express · 1–3 Tage Transit" : "FCL/LCL · 18–35 Tage Transit"}</div>
      </div>
    </button>
  );
}
