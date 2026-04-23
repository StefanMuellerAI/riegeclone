"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plane, Ship, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn, formatUsd } from "@/lib/utils";
import { fetchRates } from "@/app/actions/rates";
import { createQuote } from "@/app/actions/quotes";
import type { RateQuote } from "@/lib/mocks/rates";

type Customer = { id: string; name: string };

const AIR_CODES = ["FRA", "MUC", "AMS", "JFK", "ORD", "PVG", "HKG", "SIN", "DXB", "NRT"];
const OCEAN_CODES = ["DEHAM", "DEBRV", "NLRTM", "BEANR", "CNSHA", "CNNGB", "SGSIN", "USNYC", "USLAX", "AEJEA"];

export function QuoteCreateDialog({ open, onOpenChange, customers }: { open: boolean; onOpenChange: (v: boolean) => void; customers: Customer[] }) {
  const router = useRouter();
  const [mode, setMode] = useState<"AIR" | "OCEAN">("OCEAN");
  const [origin, setOrigin] = useState("CNSHA");
  const [destination, setDestination] = useState("DEHAM");
  const [customerId, setCustomerId] = useState(customers[0]?.id ?? "");
  const [weight, setWeight] = useState(5000);
  const [volume, setVolume] = useState(32);
  const [incoterm, setIncoterm] = useState("FOB");
  const [rates, setRates] = useState<RateQuote[] | null>(null);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [loading, setLoading] = useState(false);
  const [pending, start] = useTransition();

  async function lookup() {
    setLoading(true);
    setRates(null);
    try {
      const r = await fetchRates(origin, destination, mode, weight, volume);
      setRates(r);
    } finally {
      setLoading(false);
    }
  }

  function save() {
    if (!rates) return;
    const r = rates[selectedIdx];
    start(async () => {
      const result = await createQuote({
        mode, origin, destination, incoterm,
        customerId: customerId || undefined,
        totalUsd: r.totalUsd,
        transitDays: r.transitDays,
        carrier: r.carrier,
        carrierCode: r.carrierCode,
        weightKg: weight, volumeM3: volume,
      });
      toast.success(`Angebot ${result.ref} erstellt`, {
        action: { label: "Öffnen", onClick: () => router.push(`/quotes/${result.id}`) },
      });
      onOpenChange(false);
      router.push(`/quotes/${result.id}`);
    });
  }

  const codes = mode === "AIR" ? AIR_CODES : OCEAN_CODES;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Neues Angebot</DialogTitle>
          <DialogDescription>Live-Rate-Matrix gegen 3–5 Carrier. Wähle die passende, wir legen den Entwurf an.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 md:grid-cols-2">
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => { setMode("OCEAN"); setOrigin("CNSHA"); setDestination("DEHAM"); setRates(null); }}
              className={cn("rounded-md border p-2.5 text-sm flex items-center gap-2",
                mode === "OCEAN" ? "border-primary bg-primary/5" : "hover:bg-muted/40")}>
              <Ship className="h-4 w-4" /> Ocean
            </button>
            <button onClick={() => { setMode("AIR"); setOrigin("PVG"); setDestination("FRA"); setRates(null); }}
              className={cn("rounded-md border p-2.5 text-sm flex items-center gap-2",
                mode === "AIR" ? "border-primary bg-primary/5" : "hover:bg-muted/40")}>
              <Plane className="h-4 w-4" /> Air
            </button>
          </div>
          <div>
            <Label>Kunde</Label>
            <select value={customerId} onChange={(e) => setCustomerId(e.target.value)} className="mt-1 h-9 w-full rounded-md border bg-background px-2 text-sm">
              <option value="">—</option>
              {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <Label>Origin</Label>
            <select value={origin} onChange={(e) => { setOrigin(e.target.value); setRates(null); }} className="mt-1 h-9 w-full rounded-md border bg-background px-2 text-sm font-mono">
              {codes.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <Label>Destination</Label>
            <select value={destination} onChange={(e) => { setDestination(e.target.value); setRates(null); }} className="mt-1 h-9 w-full rounded-md border bg-background px-2 text-sm font-mono">
              {codes.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <Label>Gewicht (kg)</Label>
            <Input type="number" value={weight} onChange={(e) => setWeight(Number(e.target.value))} />
          </div>
          <div>
            <Label>Volumen (m³)</Label>
            <Input type="number" value={volume} onChange={(e) => setVolume(Number(e.target.value))} />
          </div>
          <div>
            <Label>Incoterm</Label>
            <select value={incoterm} onChange={(e) => setIncoterm(e.target.value)} className="mt-1 h-9 w-full rounded-md border bg-background px-2 text-sm">
              {["EXW", "FCA", "FOB", "CIF", "CIP", "DAP", "DDP"].map((i) => <option key={i}>{i}</option>)}
            </select>
          </div>
          <div className="flex items-end">
            <Button onClick={lookup} variant="outline" className="w-full" disabled={loading}>
              {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Raten laden…</> : <><Sparkles className="h-4 w-4" /> Raten abfragen</>}
            </Button>
          </div>
        </div>

        {rates && (
          <div className="mt-1 space-y-1.5 max-h-[35vh] overflow-y-auto">
            {rates.map((r, i) => (
              <button key={i} onClick={() => setSelectedIdx(i)}
                className={cn("w-full text-left rounded-lg border p-2.5 transition-colors",
                  selectedIdx === i ? "border-primary bg-primary/5" : "hover:bg-muted/40")}>
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div className={cn("h-3.5 w-3.5 rounded-full border-2",
                      selectedIdx === i ? "border-primary bg-primary" : "border-muted-foreground/40")} />
                    <span className="font-medium">{r.carrier}</span>
                    <span className="text-muted-foreground text-xs">· {r.transitDays}d</span>
                    <Badge variant="muted" className="text-[10px]">{r.service}</Badge>
                  </div>
                  <div className="font-mono font-semibold">{formatUsd(r.totalUsd)}</div>
                </div>
              </button>
            ))}
          </div>
        )}

        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Abbrechen</Button>
          <Button variant="gradient" onClick={save} disabled={!rates || pending}>
            {pending && <Loader2 className="h-4 w-4 animate-spin" />} Angebot anlegen
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
